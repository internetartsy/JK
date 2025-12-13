from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import json
import uuid

from app.db.session import SessionLocal
from app.models.land_parcel import LandParcel
from app.api.deps import RoleChecker

router = APIRouter(prefix="/process_debt", tags=["process-debt"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class BlackPointCheckResponse(BaseModel):
    plot_id: str
    status: str # "BLACK" or "CLEAR"
    color_code: str # "⚫" or "✅"
    issues: List[str]
    can_approve_benefit: bool
    message: str

class ResolveDebtRequest(BaseModel):
    plot_id: str
    official_id: str
    resolution_notes: str
    action: str = "resolve" # resolve, escalate

@router.get("/check/{plot_id}", response_model=BlackPointCheckResponse)
def check_process_debt(plot_id: str, db: Session = Depends(get_db)):
    """
    Check for Process Debt / Black Points on a land parcel.
    This MUST be called before any loan or benefit approval.
    """
    try:
        p_uuid = uuid.UUID(plot_id)
    except ValueError:
        # Fallback for mock IDs or partial implementation
        return BlackPointCheckResponse(
            plot_id=plot_id,
            status="BLACK",
            color_code="⚫",
            issues=["Invalid Plot ID format"],
            can_approve_benefit=False,
            message="Cannot verify plot. Black point raised due to data error."
        )

    parcel = db.query(LandParcel).filter(LandParcel.id == p_uuid).first()
    if not parcel:
         raise HTTPException(status_code=404, detail="Land Parcel not found")

    # Dynamic check logic (Mocked based on 'issues' triggers)
    # in real system, we would query related models (CourtCases, Disputes, etc.)
    
    issues = []
    
    # 1. Existing stored black points
    if parcel.black_points:
        try:
            stored_issues = json.loads(parcel.black_points)
            if isinstance(stored_issues, list):
                issues.extend(stored_issues)
        except:
            issues.append("Data corruption in black_points record")
            
    # 2. Check ownership status (Trigger 1: Multiple claimants)
    if parcel.ownership_status == "joint" and parcel.claim_status == "contested":
        issues.append("Multiple conflicting claimants detected")
        
    # 3. Check claim status (Trigger 6: Court case, Trigger 2: Dispute age)
    if parcel.claim_status == "contested":
        issues.append("Active dispute registered on plot")
    
    # Verify Aadhaar (Trigger 4) - Mock check
    if not parcel.owner_id:
        issues.append("Owner Aadhaar/ID not linked")

    status = "BLACK" if issues else "CLEAR"
    
    return BlackPointCheckResponse(
        plot_id=str(parcel.id),
        status=status,
        color_code="⚫" if status == "BLACK" else "✅",
        issues=issues,
        can_approve_benefit=(status == "CLEAR"),
        message="Process Debt Detected. Hold Approval." if status == "BLACK" else "Title Clear. Eligible for Benefit."
    )

@router.post("/resolve", dependencies=[Depends(RoleChecker(["tahsildar", "dt_admin"]))])
def resolve_process_debt(request: ResolveDebtRequest, db: Session = Depends(get_db)):
    """
    Resolve a specific black point case after mediation/correction.
    """
    try:
        p_uuid = uuid.UUID(request.plot_id)
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid Plot ID")
         
    parcel = db.query(LandParcel).filter(LandParcel.id == p_uuid).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Land Parcel not found")
        
    # Logic to clear 
    if request.action == "resolve":
        parcel.process_debt_status = "clear"
        parcel.black_points = json.dumps([]) # Clear issues
        parcel.claim_status = "resolved" # Assume resolved
        db.commit()
        return {"message": "Black Points cleared. Status updated to CLEAR.", "status": "resolved"}
        
    elif request.action == "escalate":
         # Log escalation
         return {"message": "Case escalated to District Revenue Officer", "status": "escalated"}
         
    return {"message": "No action taken"}
