from enum import Enum
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime, date
import uuid

class TransferStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    DOCUMENTS_VERIFIED = "DOCUMENTS_VERIFIED"
    UNDER_REVIEW = "UNDER_REVIEW" # Keeping for backward compatibility if needed, but mapped to verified in new flow
    REJECTED = "REJECTED"
    TAHSILDAR_APPROVED = "TAHSILDAR_APPROVED"
    PENDING_TAHSILDAR = "PENDING_TAHSILDAR"
    COURT_REFERRED = "COURT_REFERRED"
    ON_BLOCKCHAIN = "ON_BLOCKCHAIN" # Used as detail status
    SIGNING = "SIGNING"
    SIGNED = "SIGNED"
    COMPLETED = "COMPLETED"

class BankDetails(BaseModel):
    bank_name: str
    account_number: str
    ifsc_code: str

# 1. Initiate Transfer
class InitiateTransferRequest(BaseModel):
    plot_id: str
    from_farmer_id: str
    to_farmer_id: str
    transfer_reason: str
    supporting_documents: List[str]
    bank_details: Optional[BankDetails] = None

class InitiateTransferResponse(BaseModel):
    transfer_id: str
    status: str
    dashboard_color: str
    message: str
    next_step: str

# 2. Verify Documents
class VerifyDocumentsRequest(BaseModel):
    transfer_id: str
    verifier_id: str
    document_status: str
    comments: Optional[str] = None

class VerifyDocumentsResponse(BaseModel):
    transfer_id: str
    status: str
    dashboard_color: str
    message: str
    tahsildar_assignment: Optional[str] = None
    tahsildar_name: Optional[str] = None
    tahsildar_contact: Optional[str] = None
    next_step: str

# 3. Tahsildar Review
class TahsildarReviewRequest(BaseModel):
    transfer_id: str
    tahsildar_id: str
    approval_decision: str # APPROVED, REJECTED, ESCALATED
    revenue_notes: Optional[str] = None
    court_reference: Optional[str] = "NA"

class TahsildarReviewResponse(BaseModel):
    transfer_id: str
    status: str
    dashboard_color: str
    message: str
    next_actions: List[str]
    blockchain_hash: Optional[str] = None
    blockchain_status: Optional[str] = None
    next_step: str

# 4. Generate eSign
class GenerateESignRequest(BaseModel):
    transfer_id: str
    ca_authority: str
    signatories: List[str]

class GenerateESignResponse(BaseModel):
    transfer_id: str
    status: str
    dashboard_color: str
    esign_reference: str
    signature_timestamp: datetime
    message: str
    blockchain_finalization: str
    next_step: str

# 5. Complete Transfer
class CompleteTransferRequest(BaseModel):
    transfer_id: str
    completion_notes: Optional[str] = None

class CompleteTransferResponse(BaseModel):
    transfer_id: str
    status: str
    dashboard_color: str
    new_farmer_id: str
    farmer_id_certificate: str
    certificate_download_link: str
    blockchain_final: Dict[str, Any]
    message: str
    actions_completed: List[str]

# General DB Model Response (Internal Use)
class OwnershipTransferDBResponse(BaseModel):
    transfer_id: uuid.UUID
    plot_id: uuid.UUID
    from_farmer_id: uuid.UUID
    to_farmer_id: uuid.UUID
    status: str
    blockchain_status: str
    created_date: datetime
    
    class Config:
        from_attributes = True
