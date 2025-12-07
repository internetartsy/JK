from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Optional
from datetime import datetime
from app.db.session import SessionLocal
from app.models.land_parcel import LandParcel
from app.api.deps import check_api_version, RoleChecker
from pydantic import BaseModel
import uuid

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
    area_text: Optional[str] = None
    area_geom: Optional[float] = None
    status: str = "active"

class ParcelResponse(BaseModel):
    id: str
    village_id: str
    khasra_number: str
    area_text: Optional[str]
    area_geom: Optional[float]
    status: str
    owner_id: Optional[str] = None
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
                village_id=obj.village_id,
                khasra_number=obj.khasra_number,
                area_text=obj.area_text,
                area_geom=obj.area_geom,
                status=obj.status,
                owner_id=obj.owner_id,
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
    
    parcels = query.offset(skip).limit(limit).all()
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
