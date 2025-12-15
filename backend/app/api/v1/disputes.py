import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import SessionLocal
from app.models.dispute_claim import DisputeClaim
from app.models.land_parcel import LandParcel
from app.schemas.dispute import (
    DisputeCreate, DisputeResponse, DisputeTransitionRequest, 
    DisputeStatus, DisputeCategory
)
from app.api.deps import check_api_version, RoleChecker

router = APIRouter(prefix="/disputes", tags=["dispute-resolution"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_color_for_status(status: str) -> str:
    mapping = {
        "REGISTERED": "🔵 BLUE",
        "UNDER_REVIEW": "🟡 YELLOW",
        "REJECTED": "🔴 RED",
        "PENDING_PROCESSING": "⚫ BLACK",
        "TAHSILDAR_REVIEW": "🟨 YELLOW",
        "COURT_REFERRED": "🟠 ORANGE",
        "COURT_DECISION": "🟠 ORANGE",
        "RESOLVED": "🟢 GREEN",
        "AWARDED": "🟢 GREEN",
        "JOINT_AWARD": "🟢 GREEN",
        "COMPLETED": "🟢 GREEN",
        "CLOSED": "🟢 GREEN"
    }
    return mapping.get(status, "⚪ GREY")

@router.post("/", response_model=DisputeResponse, dependencies=[Depends(RoleChecker(["operator", "admin", "verified_user"]))])
def register_dispute(claim: DisputeCreate, db: Session = Depends(get_db)):
    """
    Register a new Dispute Claim.
    Initial Status: REGISTERED (Blue)
    """
    try:
        plot_uuid = uuid.UUID(claim.plot_id)
        claimant_uuid = uuid.UUID(claim.claimant_id)
        respondent_uuid = uuid.UUID(claim.respondent_id) if claim.respondent_id else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    db_claim = DisputeClaim(
        claim_id=uuid.uuid4(),
        plot_id=plot_uuid,
        farmer_id_primary=claimant_uuid,
        farmer_id_secondary=respondent_uuid,
        claim_category=claim.category.value,
        claim_status=DisputeStatus.REGISTERED.value,
        claim_description=claim.description,
        created_date=datetime.utcnow()
    )
    db.add(db_claim)
    
    # Update Land Parcel status to indicate contested
    parcel = db.query(LandParcel).filter(LandParcel.id == plot_uuid).first()
    if parcel:
        parcel.claim_status = "contested"
        
    db.commit()
    db.refresh(db_claim)
    
    return DisputeResponse(
        claim_id=str(db_claim.claim_id),
        plot_id=str(db_claim.plot_id),
        status=DisputeStatus.REGISTERED,
        category=DisputeCategory(db_claim.claim_category),
        dashboard_color=get_color_for_status(DisputeStatus.REGISTERED.value),
        description=db_claim.claim_description,
        created_date=db_claim.created_date
    )

@router.post("/{claim_id}/transition", response_model=DisputeResponse)
def transition_dispute(
    claim_id: str, 
    request: DisputeTransitionRequest, 
    db: Session = Depends(get_db)
):
    try:
        c_uuid = uuid.UUID(claim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Claim ID")
        
    claim = db.query(DisputeClaim).filter(DisputeClaim.claim_id == c_uuid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Dispute Claim not found")
        
    current_status = claim.claim_status
    action = request.action
    new_status = None
    
    # Workflow Logic
    if current_status == DisputeStatus.REGISTERED.value:
        if action == "verify":
            new_status = DisputeStatus.UNDER_REVIEW.value
            
    elif current_status == DisputeStatus.UNDER_REVIEW.value:
        if action == "reject":
            new_status = DisputeStatus.REJECTED.value
            # Release land parcel lock
            parcel = db.query(LandParcel).filter(LandParcel.id == claim.plot_id).first()
            if parcel: parcel.claim_status = "resolved" # or none
            
        elif action == "escalate_complex":
            # Black Point / Process Debt
            new_status = DisputeStatus.PENDING_PROCESSING.value
            # Mark black point on parcel
            parcel = db.query(LandParcel).filter(LandParcel.id == claim.plot_id).first()
            if parcel:
                 parcel.process_debt_status = "black_point"
                 parcel.black_points = '["Complex Dispute - Process Debt"]'
                 
        elif action == "verify_simple":
             # Skip black point, go to tahsildar
             new_status = DisputeStatus.TAHSILDAR_REVIEW.value
             
    elif current_status == DisputeStatus.PENDING_PROCESSING.value:
        if action == "assign_specialist":
            # Manual triage needed
            pass # Status remains until resolved or court referred
        elif action == "refer_court":
            new_status = DisputeStatus.COURT_REFERRED.value
        elif action == "refer_tahsildar":
            # De-escalate
            new_status = DisputeStatus.TAHSILDAR_REVIEW.value
            
    elif current_status == DisputeStatus.TAHSILDAR_REVIEW.value:
        if action == "resolve_mediation":
            new_status = DisputeStatus.RESOLVED.value
        elif action == "refer_court":
            new_status = DisputeStatus.COURT_REFERRED.value
            
    elif current_status == DisputeStatus.RESOLVED.value:
        if action == "close":
             new_status = DisputeStatus.CLOSED.value
             # Update parcel
             parcel = db.query(LandParcel).filter(LandParcel.id == claim.plot_id).first()
             if parcel: 
                 parcel.claim_status = "resolved"
                 parcel.process_debt_status = "clear"

    elif current_status in [DisputeStatus.COURT_REFERRED.value, DisputeStatus.COURT_DECISION.value]:
        if action == "final_verdict":
            verdict = request.verdict_type
            if verdict == "joint":
                new_status = DisputeStatus.JOINT_AWARD.value
                # Update parcel ownership type
                parcel = db.query(LandParcel).filter(LandParcel.id == claim.plot_id).first()
                if parcel: parcel.ownership_status = "joint"
            else:
                new_status = DisputeStatus.AWARDED.value
    
    elif current_status in [DisputeStatus.AWARDED.value, DisputeStatus.JOINT_AWARD.value]:
        if action == "complete":
            new_status = DisputeStatus.COMPLETED.value
            new_status = DisputeStatus.CLOSED.value
            # Update parcel
            parcel = db.query(LandParcel).filter(LandParcel.id == claim.plot_id).first()
            if parcel: 
                parcel.claim_status = "resolved"
                parcel.process_debt_status = "clear"

    if not new_status and action != "assign_specialist":
         raise HTTPException(status_code=400, detail="Invalid transition action")
         
    if new_status:
        claim.claim_status = new_status
        
    db.commit()
    db.refresh(claim)
    
    return DisputeResponse(
        claim_id=str(claim.claim_id),
        plot_id=str(claim.plot_id),
        status=DisputeStatus(claim.claim_status),
        category=DisputeCategory(claim.claim_category),
        dashboard_color=get_color_for_status(claim.claim_status),
        description=claim.claim_description,
        created_date=claim.created_date
    )

@router.get("/", response_model=List[DisputeResponse])
def list_disputes(db: Session = Depends(get_db)):
    claims = db.query(DisputeClaim).all()
    return [
        DisputeResponse(
            claim_id=str(c.claim_id),
            plot_id=str(c.plot_id),
            status=DisputeStatus(c.claim_status) if c.claim_status in DisputeStatus.__members__ else DisputeStatus.REGISTERED,
            category=DisputeCategory(c.claim_category) if c.claim_category in DisputeCategory.__members__ else DisputeCategory.OTHER,
            dashboard_color=get_color_for_status(c.claim_status),
            description=c.claim_description,
            created_date=c.created_date
        )
        for c in claims
    ]
