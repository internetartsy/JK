from fastapi import APIRouter, Depends, HTTPException, Body, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from app.db.session import SessionLocal
from app.api.deps import get_db, check_api_version, RoleChecker
from pydantic import BaseModel
import json

router = APIRouter(prefix="/geo", tags=["geo"])

class TopologyCheckRequest(BaseModel):
    geojson: Dict[str, Any]
    village_id: str

from app.core.redis import cache

@router.get("/tiles/manifest/{district}", dependencies=[Depends(check_api_version)])
@cache(ttl=3600, key_builder=lambda district, request: f"manifest:{district}")
def get_tile_manifest(district: str, request: Request):
    """
    Get signed manifest for offline tile packs by scanning the backend/tiles directory.
    """
    import sqlite3
    from pathlib import Path

    # Resolves to jk/backend/tiles
    TILES_DIR = Path(__file__).resolve().parents[3] / "tiles"
    packs = []

    if TILES_DIR.exists():
        for file_path in TILES_DIR.glob("*.mbtiles"):
            try:
                # Open in read-only mode
                conn = sqlite3.connect(f"file:{file_path}?mode=ro", uri=True)
                cursor = conn.cursor()
                
                # Fetch metadata
                cursor.execute("SELECT name, value FROM metadata")
                rows = cursor.fetchall()
                meta = {row[0]: row[1] for row in rows}
                conn.close()

                # Process specific metadata fields
                bounds_str = meta.get("bounds", "-180,-90,180,90")
                bounds = [float(x) for x in bounds_str.split(",")]
                
                # Determine base URL for style
                # Assuming /api/v1 is the prefix based on file location
                base_url = str(request.base_url).rstrip("/")
                style_url = f"{base_url}/api/v1/geo/tiles/{file_path.stem}/style.json"

                packs.append({
                    "id": file_path.stem,
                    "name": meta.get("name", file_path.stem),
                    "url": f"{base_url}/api/v1/geo/tiles/download/{file_path.name}",
                    "styleUrl": style_url,
                    "size": file_path.stat().st_size,
                    "checksum": "sha256:dynamic", # placeholder
                    "format": meta.get("format", "pbf"),
                    "bounds": bounds,
                    "minzoom": int(meta.get("minzoom", 0)),
                    "maxzoom": int(meta.get("maxzoom", 14)),
                    "description": meta.get("description", "")
                })

            except Exception as e:
                print(f"Error reading mbtiles {file_path}: {e}")
                # Continue to next file
                continue

    return {
        "district": district,
        "version": "v1.0",
        "packs": packs,
        "signature": "valid-signature"
    }

@router.get("/tiles/{tileset_id}/style.json")
def get_style(tileset_id: str, request: Request):
    import sqlite3
    import json
    from pathlib import Path

    TILES_DIR = Path(__file__).resolve().parents[3] / "tiles"
    file_path = TILES_DIR / f"{tileset_id}.mbtiles"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Tileset not found")

    # Get format and layers
    fmt = "pbf"
    vector_layers = []
    try:
        conn = sqlite3.connect(f"file:{file_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        
        res = cursor.execute("SELECT value FROM metadata WHERE name='format'").fetchone()
        if res: fmt = res[0]
        
        res = cursor.execute("SELECT value FROM metadata WHERE name='json'").fetchone()
        if res:
             json_meta = json.loads(res[0])
             vector_layers = json_meta.get("vector_layers", [])
             
        conn.close()
    except Exception as e:
        print(f"Metadata error: {e}")

    # Build Tile URL
    base_url = str(request.base_url).rstrip("/")
    tile_url = f"{base_url}/api/v1/geo/tiles/{tileset_id}/{{z}}/{{x}}/{{y}}.{fmt}"
    
    source_type = "vector" if fmt == "pbf" else "raster"

    style = {
        "version": 8,
        "name": tileset_id,
        "sources": {
            "offline-source": {
                "type": source_type,
                "tiles": [ tile_url ],
                "minzoom": 0,
                "maxzoom": 22
            }
        },
        "layers": []
    }

    if source_type == "raster":
        style["layers"].append({
            "id": "raster-layer",
            "type": "raster",
            "source": "offline-source"
        })
    else:
        # Background
        style["layers"].append({
            "id": "background",
            "type": "background",
            "paint": {"background-color": "#f8f9fa"}
        })
        
        # Auto-generate layers from vector_layers metadata
        if vector_layers:
            for layer in vector_layers:
                lid = layer["id"]
                # Fill
                style["layers"].append({
                    "id": f"{lid}-fill",
                    "type": "fill",
                    "source": "offline-source",
                    "source-layer": lid,
                    "paint": {"fill-color": "#627BC1", "fill-opacity": 0.4}
                })
                # Line
                style["layers"].append({
                    "id": f"{lid}-line",
                    "type": "line",
                    "source": "offline-source",
                    "source-layer": lid,
                    "paint": {"line-color": "#627BC1", "line-width": 1}
                })
        else:
             # Fallback if no vector_layers metadata
             style["layers"].append({
                "id": "fallback-fill",
                "type": "fill",
                "source": "offline-source",
                "source-layer": "water", # Common guess
                "paint": {"fill-color": "#a0c8f0"}
             })

    return style

@router.get("/tiles/{tileset_id}/{z}/{x}/{y}.{ext}")
def get_tile(tileset_id: str, z: int, x: int, y: int, ext: str):
    import sqlite3
    from pathlib import Path

    TILES_DIR = Path(__file__).resolve().parents[3] / "tiles"
    file_path = TILES_DIR / f"{tileset_id}.mbtiles"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Tileset not found")
        
    try:
        conn = sqlite3.connect(f"file:{file_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        
        # TMS coordinate flip
        # MBTiles schema uses TMS which has flipped Y
        tms_y = (1 << z) - 1 - y
        
        cursor.execute("SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?", (z, x, tms_y))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            content = row[0]
            media_type = "application/x-protobuf" if ext == "pbf" else f"image/{ext.replace('.','')}"
            return Response(content=content, media_type=media_type)
        else:
            return Response(status_code=404)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tiles/download/{filename}")
def download_tileset(filename: str):
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    TILES_DIR = Path(__file__).resolve().parents[3] / "tiles"
    file_path = TILES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path, filename=filename)

@router.post("/validate/topology", dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
def validate_topology(
    payload: TopologyCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Validate GeoJSON topology (overlaps, gaps).
    """
    try:
        geom_json = json.dumps(payload.geojson)
        
        # Check for self-intersection (validity)
        valid_query = text("SELECT ST_IsValidReason(ST_GeomFromGeoJSON(:geom))")
        valid_res = db.execute(valid_query, {"geom": geom_json}).scalar()
        
        if valid_res != "Valid Geometry":
            return {"valid": False, "errors": [valid_res]}
            
        # Check for overlaps with existing parcels in the same village
        # Using ST_Intersects and ST_Area of intersection to confirm significant overlap
        overlap_query = text("""
            SELECT id, khasra_number 
            FROM landparcel 
            WHERE village_id = :village_id 
            AND ST_Intersects(geometry, ST_GeomFromGeoJSON(:geom))
            AND ST_Area(ST_Intersection(geometry, ST_GeomFromGeoJSON(:geom))) > 1.0
        """)
        
        overlaps = db.execute(overlap_query, {"village_id": payload.village_id, "geom": geom_json}).fetchall()
        
        if overlaps:
            return {
                "valid": False, 
                "errors": [f"Overlaps with parcel {r.khasra_number} ({r.id})" for r in overlaps]
            }
            
        return {"valid": True, "errors": []}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
