from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.db.session import SessionLocal
from app.models.land_parcel import LandParcel
from app.models.person import Person
from app.api.deps import get_db, check_api_version, RoleChecker
from app.services.sync.conflict_resolution import conflict_service, ConflictReport
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/sync", tags=["sync"])

class BatchUpsertRequest(BaseModel):
    parcels: List[Dict[str, Any]] = []
    persons: List[Dict[str, Any]] = []

class BatchUpsertResponse(BaseModel):
    synced_parcels: List[str]
    synced_persons: List[str]
    errors: List[Dict[str, Any]]

class ConflictCheckRequest(BaseModel):
    """Request to check for conflicts before syncing"""
    entity_type: str  # "parcel" or "person"
    entity_id: str
    base_version: Dict[str, Any]  # Last synced version (common ancestor)
    local_version: Dict[str, Any]  # Current local version

class ConflictResolutionRequest(BaseModel):
    """Request to resolve a conflict"""
    entity_type: str
    entity_id: str
    conflict_report: Dict[str, Any]
    resolutions: Dict[str, Any]  # field_name -> chosen value or "USE_LOCAL"/"USE_SERVER"


@router.post("/batch", response_model=BatchUpsertResponse, dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
def batch_upsert(
    payload: BatchUpsertRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk upsert records.
    Server-authoritative: Client changes overwrite server if conflict (for now), 
    or implement smarter merge logic here.
    """
    synced_parcels = []
    synced_persons = []
    errors = []

    # Process Parcels
    for p_data in payload.parcels:
        try:
            parcel_id = p_data.get("id")
            if not parcel_id:
                errors.append({"type": "parcel", "error": "Missing ID", "data": p_data})
                continue

            parcel = db.query(LandParcel).filter(LandParcel.id == parcel_id).first()
            if not parcel:
                # Create
                parcel = LandParcel(
                    id=parcel_id,
                    village_id=p_data.get("village_id"),
                    khasra_number=p_data.get("khasra_number"),
                    area_text=p_data.get("area_text"),
                    area_geom=p_data.get("area_geom"),
                    status=p_data.get("status", "active"),
                    version=p_data.get("version", 1),
                    updated_at=datetime.utcnow()
                )
                db.add(parcel)
            else:
                # Update (Server wins if server version > client version? Or Client wins?)
                # For this implementation: Client wins (Last Write Wins) but we bump version
                parcel.village_id = p_data.get("village_id", parcel.village_id)
                parcel.khasra_number = p_data.get("khasra_number", parcel.khasra_number)
                parcel.area_text = p_data.get("area_text", parcel.area_text)
                parcel.area_geom = p_data.get("area_geom", parcel.area_geom)
                parcel.status = p_data.get("status", parcel.status)
                parcel.version = parcel.version + 1
                parcel.updated_at = datetime.utcnow()
            
            synced_parcels.append(parcel_id)
        except Exception as e:
            errors.append({"type": "parcel", "id": p_data.get("id"), "error": str(e)})

    # Process Persons
    for p_data in payload.persons:
        try:
            person_id = p_data.get("id")
            if not person_id:
                errors.append({"type": "person", "error": "Missing ID", "data": p_data})
                continue

            person = db.query(Person).filter(Person.id == person_id).first()
            if not person:
                # Create
                person = Person(
                    id=person_id,
                    name_urdu=p_data.get("name_urdu"),
                    name_english=p_data.get("name_english"),
                    confidence=p_data.get("confidence", 0.0),
                    consent_flags=p_data.get("consent_flags", {}),
                    updated_at=datetime.utcnow()
                )
                db.add(person)
            else:
                # Update
                person.name_urdu = p_data.get("name_urdu", person.name_urdu)
                person.name_english = p_data.get("name_english", person.name_english)
                person.confidence = p_data.get("confidence", person.confidence)
                person.consent_flags = p_data.get("consent_flags", person.consent_flags)
                person.updated_at = datetime.utcnow()
            
            synced_persons.append(person_id)
        except Exception as e:
            errors.append({"type": "person", "id": p_data.get("id"), "error": str(e)})

    db.commit()
    return BatchUpsertResponse(
        synced_parcels=synced_parcels,
        synced_persons=synced_persons,
        errors=errors
    )

@router.get("/changes", dependencies=[Depends(check_api_version)])
def get_changes(
    since: datetime,
    db: Session = Depends(get_db)
):
    """
    Get all changes since a timestamp.
    Useful for polling-based sync.
    """
    parcels = db.query(LandParcel).filter(LandParcel.updated_at > since).all()
    persons = db.query(Person).filter(Person.updated_at > since).all()
    
    return {
        "parcels": [
            {
                "id": str(p.id),
                "village_id": p.village_id,
                "khasra_number": p.khasra_number,
                "area_text": p.area_text,
                "area_geom": p.area_geom,
                "status": p.status,
                "version": p.version,
                "updated_at": p.updated_at,
                "sync_status": "synced"
            } for p in parcels
        ],
        "persons": [
            {
                "id": str(p.id),
                "name_urdu": p.name_urdu,
                "name_english": p.name_english,
                "confidence": p.confidence,
                "consent_flags": p.consent_flags,
                "updated_at": p.updated_at,
                "sync_status": "synced"
            } for p in persons
        ]
    }


# ==================== 3-Way Merge Conflict Resolution APIs ====================

@router.post("/conflict/check", dependencies=[Depends(check_api_version)])
def check_conflict(
    request: ConflictCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Check for conflicts between local version and server version.
    Returns a detailed diff report with field-level conflicts and merge suggestions.
    
    Args:
        entity_type: "parcel" or "person"
        entity_id: ID of the entity
        base_version: The last synced version (common ancestor)
        local_version: Current local version with pending changes
    
    Returns:
        ConflictReport with field diffs and merge suggestions
    """
    # Get current server version
    if request.entity_type == "parcel":
        entity = db.query(LandParcel).filter(LandParcel.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Parcel not found on server")
        server_version = {
            "id": str(entity.id),
            "village_id": entity.village_id,
            "khasra_number": entity.khasra_number,
            "area_text": entity.area_text,
            "area_geom": entity.area_geom,
            "status": entity.status,
            "version": entity.version
        }
    elif request.entity_type == "person":
        entity = db.query(Person).filter(Person.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Person not found on server")
        server_version = {
            "id": str(entity.id),
            "name_urdu": entity.name_urdu,
            "name_english": entity.name_english,
            "confidence": entity.confidence,
            "consent_flags": entity.consent_flags,
            "version": entity.version
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid entity_type")
    
    # Compute 3-way diff
    conflict_report = conflict_service.compute_diff(
        entity_type=request.entity_type,
        base=request.base_version,
        local=request.local_version,
        server=server_version
    )
    
    return conflict_report.to_dict()


@router.post("/conflict/resolve", dependencies=[Depends(check_api_version), Depends(RoleChecker(["admin", "enumerator", "validator"]))])
def resolve_conflict(
    request: ConflictResolutionRequest,
    db: Session = Depends(get_db)
):
    """
    Apply conflict resolution and save the merged entity.
    
    Args:
        entity_type: "parcel" or "person"  
        entity_id: ID of the entity
        conflict_report: The conflict report from /conflict/check
        resolutions: Dict mapping field_name to chosen value or strategy
                    e.g., {"khasra_number": "123", "area_text": "USE_LOCAL"}
    
    Returns:
        The saved merged entity
    """
    # Reconstruct conflict report
    from dataclasses import asdict
    from app.services.sync.conflict_resolution import ConflictReport, FieldDiff, ResolutionStrategy
    
    # Build merged entity from resolutions
    merged = dict(request.conflict_report.get("suggested_merged_entity", {}))
    
    for field_diff in request.conflict_report.get("field_diffs", []):
        field_name = field_diff["field_name"]
        if field_name in request.resolutions:
            choice = request.resolutions[field_name]
            if choice == "USE_LOCAL":
                merged[field_name] = field_diff["local_value"]
            elif choice == "USE_SERVER":
                merged[field_name] = field_diff["server_value"]
            elif choice == "USE_BASE":
                merged[field_name] = field_diff["base_value"]
            else:
                # Manual value
                merged[field_name] = choice
    
    # Save merged entity
    if request.entity_type == "parcel":
        entity = db.query(LandParcel).filter(LandParcel.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Parcel not found")
        
        entity.village_id = merged.get("village_id", entity.village_id)
        entity.khasra_number = merged.get("khasra_number", entity.khasra_number)
        entity.area_text = merged.get("area_text", entity.area_text)
        entity.area_geom = merged.get("area_geom", entity.area_geom)
        entity.status = merged.get("status", entity.status)
        entity.version = merged.get("version", entity.version + 1)
        entity.updated_at = datetime.utcnow()
        
    elif request.entity_type == "person":
        entity = db.query(Person).filter(Person.id == request.entity_id).first()
        if not entity:
            raise HTTPException(status_code=404, detail="Person not found")
        
        entity.name_urdu = merged.get("name_urdu", entity.name_urdu)
        entity.name_english = merged.get("name_english", entity.name_english)
        entity.confidence = merged.get("confidence", entity.confidence)
        entity.consent_flags = merged.get("consent_flags", entity.consent_flags)
        entity.updated_at = datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="Invalid entity_type")
    
    db.commit()
    
    return {
        "status": "resolved",
        "entity_type": request.entity_type,
        "entity_id": request.entity_id,
        "merged_version": merged.get("version"),
        "resolved_at": datetime.utcnow().isoformat()
    }


@router.get("/conflicts", dependencies=[Depends(check_api_version)])
def list_conflicts(
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all entities with potential conflicts (different versions).
    This is useful for showing a conflict inbox in the UI.
    """
    # For now, return entities where version might indicate conflicts
    # In a real implementation, you'd track conflict state explicitly
    conflicts = []
    
    if entity_type in [None, "parcel"]:
        # This would be enhanced with actual conflict tracking
        parcels = db.query(LandParcel).filter(LandParcel.version > 1).limit(50).all()
        for p in parcels:
            conflicts.append({
                "entity_type": "parcel",
                "entity_id": str(p.id),
                "version": p.version,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "display_name": f"Parcel {p.khasra_number} ({p.village_id})"
            })
    
    if entity_type in [None, "person"]:
        persons = db.query(Person).filter(Person.confidence < 0.8).limit(50).all()
        for p in persons:
            conflicts.append({
                "entity_type": "person",
                "entity_id": str(p.id),
                "confidence": p.confidence,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "display_name": f"{p.name_english or p.name_urdu}"
            })
    
    return {"conflicts": conflicts, "total": len(conflicts)}

