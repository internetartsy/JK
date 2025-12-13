from enum import Enum
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class DisputeStatus(str, Enum):
    REGISTERED = "REGISTERED"
    UNDER_REVIEW = "UNDER_REVIEW"
    REJECTED = "REJECTED"
    PENDING_PROCESSING = "PENDING_PROCESSING" # Black Point
    TAHSILDAR_REVIEW = "TAHSILDAR_REVIEW"
    COURT_REFERRED = "COURT_REFERRED"
    RESOLVED = "RESOLVED"
    COURT_DECISION = "COURT_DECISION"
    AWARDED = "AWARDED"
    JOINT_AWARD = "JOINT_AWARD"
    COMPLETED = "COMPLETED"
    CLOSED = "CLOSED"

class DisputeCategory(str, Enum):
    INHERITANCE = "inheritance"
    ENCROACHMENT = "encroachment"
    TITLE_DEFECT = "title_defect"
    BOUNDARY = "boundary"
    OTHER = "other"

class DisputeCreate(BaseModel):
    plot_id: str
    claimant_id: str  # Primary Farmer
    respondent_id: Optional[str] = None # Secondary Farmer/Opposing party
    category: DisputeCategory
    description: str

class DisputeResponse(BaseModel):
    claim_id: str
    plot_id: str
    status: DisputeStatus
    category: DisputeCategory
    dashboard_color: str
    description: Optional[str]
    created_date: datetime
    
    class Config:
        from_attributes = True

class DisputeTransitionRequest(BaseModel):
    action: str # verify, reject, escalate, resolve, court_referral, final_verdict
    notes: Optional[str] = None
    verdict_type: Optional[str] = None # claimant_1, claimant_2, joint (Only for final_verdict)
