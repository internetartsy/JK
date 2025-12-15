from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, or_
from typing import List, Optional
from datetime import datetime
from app.db.session import SessionLocal
from app.models.land_parcel import LandParcel
from app.models.person import Person
from app.api.deps import check_api_version, RoleChecker
from pydantic import BaseModel
import uuid
import json

router = APIRouter(prefix="/parcels", tags=["parcels"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ParcelCreate(BaseModel):
    village_id: str
    khasra_number: str
    landmark: Optional[str] = None
    area_text: Optional[str] = None
    area_geom: Optional[float] = None
    status: str = "active"

class ParcelResponse(BaseModel):
    id: str
    ulpin: str # Alias for parcel_id
    village_id: str
    khasra_number: str
    landmark: Optional[str] = None
    area_text: Optional[str]
    area_geom: Optional[float]
    status: str
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    version: int
    updated_at: Optional[datetime]
    etag: Optional[str] = None
    
    model_config = {"from_attributes": True}
    
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, '__dict__'):
            # Convert from ORM object
            instance = cls(
                id=str(obj.id),
                ulpin=obj.parcel_id,
                village_id=obj.village_id,
                khasra_number=obj.khasra_number,
                landmark=obj.landmark,
                area_text=obj.area_text,
                area_geom=obj.area_geom,
                status=obj.status,
                owner_id=obj.owner_id,
                owner_name=getattr(obj, 'owner_name', None), # Dynamic attribute support
                version=obj.version,
                updated_at=obj.updated_at
            )
            if obj.updated_at:
                instance.etag = f'"{obj.version}-{obj.updated_at.timestamp()}"'
            return instance
        return super().model_validate(obj, *args, **kwargs)

@router.get("/", response_model=List[ParcelResponse], dependencies=[Depends(check_api_version)])
def list_parcels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    village_id: Optional[str] = None,
    khasra_number: Optional[str] = None,
    modified_since: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """List land parcels with optional filters and delta sync"""
    query = db.query(LandParcel)
    
    if village_id:
        query = query.filter(LandParcel.village_id == village_id)
    if khasra_number:
        query = query.filter(LandParcel.khasra_number == khasra_number)
    if modified_since:
        query = query.filter(LandParcel.updated_at > modified_since)
    
    # Sort by most recently updated for activity feeds
    parcels = query.order_by(LandParcel.updated_at.desc()).offset(skip).limit(limit).all()
    return [ParcelResponse.model_validate(p) for p in parcels]

@router.get("/stats/farmers", response_model=dict, dependencies=[Depends(check_api_version)])
def get_farmer_stats(db: Session = Depends(get_db)):
    """Get statistics about farmers and land ownership"""
    # Count unique owners (farmers) with non-null owner_id
    total_farmers = db.query(func.count(distinct(LandParcel.owner_id))).filter(
        LandParcel.owner_id != None,
        LandParcel.owner_id != ""
    ).scalar() or 0
    
    # Count total parcels
    total_parcels = db.query(func.count(LandParcel.id)).scalar() or 0
    
    # Count parcels per farmer (for distribution)
    avg_parcels_per_farmer = 0
    if total_farmers > 0:
        avg_parcels_per_farmer = total_parcels / total_farmers
    
    return {
        "total_farmers": total_farmers,
        "total_parcels": total_parcels,
        "avg_parcels_per_farmer": round(avg_parcels_per_farmer, 2)
    }

@router.get("/geojson", response_model=dict, dependencies=[Depends(check_api_version)])
def get_parcels_geojson(
    village_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get parcels as standard GeoJSON FeatureCollection.
    Useful for MapLibre GL JS integration.
    """
    query = db.query(
        LandParcel.id, 
        LandParcel.khasra_number, 
        LandParcel.village_id,
        LandParcel.status,
        LandParcel.owner_id,
        func.ST_AsGeoJSON(LandParcel.geometry).label("geometry")
    )
    
    if village_id:
        query = query.filter(LandParcel.village_id == village_id)
    
    # Only return parcels with valid geometry
    results = query.filter(LandParcel.geometry != None).limit(5000).all()
    
    features = []
    for row in results:
        features.append({
            "type": "Feature",
            "properties": {
                "id": str(row.id),
                "khasra_number": row.khasra_number,
                "village_id": row.village_id,
                "status": row.status,
                "owner_id": row.owner_id
            },
            "geometry": json.loads(row.geometry) if row.geometry else None
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/search", response_model=List[ParcelResponse], dependencies=[Depends(check_api_version)])
def search_parcels(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    """
    Search parcels by ULPIN (parcel_id), Owner ID, Landmark, Khasra Number, or Village ID.
    Includes Owner Name search via Join.
    """
    search_term = f"%{q}%"
    
    # Left Join with Person to get owner name
    # We select LandParcel columns and add owner_name
    results = db.query(LandParcel, Person.name_english.label('owner_name')).outerjoin(
        Person, func.cast(LandParcel.owner_id, String) == func.cast(Person.id, String) # Cast if needed, assuming owner_id matches Person.id format
    ).filter(
        or_(
            LandParcel.parcel_id.ilike(search_term),       # ULPIN
            func.cast(LandParcel.owner_id, String).ilike(search_term),  # Owner ID
            LandParcel.khasra_number.ilike(search_term),   # Khasra
            LandParcel.village_id.ilike(search_term),      # Village
            LandParcel.landmark.ilike(search_term),        # Landmark
            Person.name_english.ilike(search_term),        # Owner Name (English)
            Person.name_urdu.ilike(search_term)            # Owner Name (Urdu)
        )
    ).limit(limit).all()
    
    # Process results - results is a list of tuples (LandParcel, owner_name)
    response = []
    for parcel, owner_name in results:
        # Attach owner_name to parcel object for validation
        parcel.owner_name = owner_name
        response.append(ParcelResponse.model_validate(parcel))

    return response

@router.get("/{parcel_id}", response_model=ParcelResponse, dependencies=[Depends(check_api_version)])
def get_parcel(parcel_id: str, db: Session = Depends(get_db)):
    """Get a specific parcel by ID"""
    parcel = db.query(LandParcel).filter(LandParcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return ParcelResponse.model_validate(parcel)

@router.post("/", response_model=ParcelResponse, dependencies=[Depends(RoleChecker(["admin", "enumerator", "validator"]))])
def create_parcel(parcel: ParcelCreate, db: Session = Depends(get_db)):
    """Create a new land parcel"""
    db_parcel = LandParcel(
        id=str(uuid.uuid4()),
        village_id=parcel.village_id,
        khasra_number=parcel.khasra_number,
        landmark=parcel.landmark,
        area_text=parcel.area_text,
        area_geom=parcel.area_geom,
        status=parcel.status,
        version=1
    )
    db.add(db_parcel)
    db.commit()
    db.refresh(db_parcel)
    
    # Sync to Frappe
    try:
        from app.services.frappe_sync.sync_service import FrappeSyncService
        sync_service = FrappeSyncService()
        sync_service.sync_parcel_to_frappe(db_parcel, action="create")
    except Exception as e:
        print(f"Failed to sync parcel to Frappe: {e}")
        
    return db_parcel

@router.delete("/{parcel_id}", dependencies=[Depends(RoleChecker(["admin"]))])
def delete_parcel(parcel_id: str, db: Session = Depends(get_db)):
    """Delete a parcel"""
    parcel = db.query(LandParcel).filter(LandParcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    db.delete(parcel)
    db.commit()
    return {"message": "Parcel deleted successfully"}
