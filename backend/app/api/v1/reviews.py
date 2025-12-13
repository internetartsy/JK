from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.models.review_task import ReviewTask, ReviewStatus
from pydantic import BaseModel

router = APIRouter()

class ReviewTaskSchema(BaseModel):
    id: str
    document_id: str
    document_type: str
    confidence_score: float
    extracted_fields: dict
    status: str
    assigned_to: str | None = None

    class Config:
        from_attributes = True

@router.get("/pending", response_model=List[ReviewTaskSchema])
def get_pending_reviews(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    return db.query(ReviewTask).filter(ReviewTask.status == ReviewStatus.PENDING).offset(skip).limit(limit).all()

class ReviewAction(BaseModel):
    corrected_data: dict | None = None

@router.post("/{id}/approve")
def approve_review(
    id: str,
    action: ReviewAction,
    db: Session = Depends(deps.get_db),
):
    task = db.query(ReviewTask).filter(ReviewTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Review task not found")
    
    # 1. Update the task with corrected data
    if action.corrected_data:
        task.extracted_fields = action.corrected_data
    
    task.status = ReviewStatus.APPROVED
    
    # 2. Apply changes to the Target Record (e.g., LandParcel)
    from app.models.land_parcel import LandParcel
    from app.models.person import Person
    
    fields = task.extracted_fields
    
    # Handle Person/Farmer Creation
    owner_name = fields.get("owner_name")
    person_id = None
    
    if owner_name:
        # Check if person exists (Exact match on Urdu name for now)
        # In production, use Entity Resolution service
        person = db.query(Person).filter(Person.name_urdu == owner_name).first()
        if not person:
            person = Person(
                name_urdu=owner_name,
                confidence=task.confidence_score,
                dispute_status="clear"
            )
            db.add(person)
            db.flush() # Get ID
            
            # Sync to Frappe immediately
            # from app.services.frappe_sync.sync_service import FrappeSyncService
            # sync_svc = FrappeSyncService()
            # sync_svc.sync_person_to_frappe(person)
        
        person_id = str(person.id)

    if task.document_type in ["girdawari", "khasra"]:
        # Simple Upsert Logic based on Khasra Number + Village
        khasra = fields.get("khasra_number")
        village = fields.get("village_id") or fields.get("village")
        
        if khasra and village:
            existing_parcel = db.query(LandParcel).filter(
                LandParcel.khasra_number == khasra,
                LandParcel.village_id == village
            ).first()
            
            if existing_parcel:
                # Update
                if person_id:
                    existing_parcel.owner_id = person_id
                existing_parcel.area_text = fields.get("area") or existing_parcel.area_text
                # existing_parcel.image_url = ...
            else:
                # Create New
                new_parcel = LandParcel(
                    khasra_number=khasra,
                    village_id=village,
                    owner_id=person_id or fields.get("owner_name"), # Fallback to string if logic fails
                    area_text=fields.get("area"),
                    status="verified"
                )
                db.add(new_parcel)
    
    db.commit()
    db.refresh(task)
    return task

@router.post("/{id}/reject")
def reject_review(
    id: str,
    db: Session = Depends(deps.get_db),
):
    task = db.query(ReviewTask).filter(ReviewTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Review task not found")
    task.status = ReviewStatus.REJECTED
    db.commit()
    db.refresh(task)
    return task
