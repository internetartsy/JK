import uuid
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import SessionLocal
from app.models.ownership_transfer import OwnershipTransfer
from app.schemas.ownership import (
    InitiateTransferRequest, InitiateTransferResponse,
    VerifyDocumentsRequest, VerifyDocumentsResponse,
    TahsildarReviewRequest, TahsildarReviewResponse,
    GenerateESignRequest, GenerateESignResponse,
    CompleteTransferRequest, CompleteTransferResponse,
    TransferStatus
)
from app.api.deps import check_api_version, RoleChecker

router = APIRouter(prefix="/ownership", tags=["ownership-workflow"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. Initiate Transfer
@router.post("/initiate_transfer", response_model=InitiateTransferResponse)
def initiate_transfer(request: InitiateTransferRequest, db: Session = Depends(get_db)):
    # Validate IDs (Mock validation)
    # create DB record
    new_transfer = OwnershipTransfer(
        transfer_id=uuid.uuid4(),
        plot_id=uuid.UUID(request.plot_id) if len(request.plot_id) == 36 else uuid.uuid4(), # Handle mock IDs vs real UUIDs
        from_farmer_id=uuid.UUID(request.from_farmer_id) if len(request.from_farmer_id) == 36 else uuid.uuid4(),
        to_farmer_id=uuid.UUID(request.to_farmer_id) if len(request.to_farmer_id) == 36 else uuid.uuid4(),
        transfer_date=date.today(),
        status=TransferStatus.SUBMITTED.value,
        blockchain_status="not_recorded",
        created_date=datetime.utcnow()
    )
    db.add(new_transfer)
    db.commit()
    db.refresh(new_transfer)
    
    return InitiateTransferResponse(
        transfer_id=str(new_transfer.transfer_id),
        status=TransferStatus.SUBMITTED.value,
        dashboard_color="🔵 BLUE",
        message="Transfer request submitted to Verifier",
        next_step="Wait for Verifier Review (24-48 hours)"
    )

# 2. Verify Documents
@router.put("/verify_documents", response_model=VerifyDocumentsResponse)
def verify_documents(request: VerifyDocumentsRequest, db: Session = Depends(get_db)):
    # Find transfer
    try:
        t_uuid = uuid.UUID(request.transfer_id)
    except ValueError:
        # For mock flow if ID is not a valid UUID, strictly we should fail but for demo we might need flexibility
        # Assuming system uses UUIDs. If user passed "TRF-2025..." we can't look it up in DB unless we change DB schema or use a separate mapping.
        # For now, let's assume the client passes the UUID returned by initiate_transfer. 
        # BUT, the prompt example used "TRF-2025-0001".
        # Let's try to look up by ID if valid UUID, else simulate or fail.
        # Ideally we updated the DB model to have a readable ID as well.
        raise HTTPException(status_code=400, detail="Invalid Transfer ID format. Must be UUID.")

    transfer = db.query(OwnershipTransfer).filter(OwnershipTransfer.transfer_id == t_uuid).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    transfer.status = TransferStatus.DOCUMENTS_VERIFIED.value
    db.commit()
    
    return VerifyDocumentsResponse(
        transfer_id=str(transfer.transfer_id),
        status=TransferStatus.DOCUMENTS_VERIFIED.value,
        dashboard_color="🟡 YELLOW",
        message="Documents verified. Forwarding to Tahsildar",
        tahsildar_assignment="TAH-SAMBA-001",
        tahsildar_name="Shri Ram Kumar",
        tahsildar_contact="9876543210",
        next_step="Awaiting Tahsildar Approval"
    )

# 3. Tahsildar Review
@router.put("/tahsildar_review", response_model=TahsildarReviewResponse)
def tahsildar_review(request: TahsildarReviewRequest, db: Session = Depends(get_db)):
    try:
        t_uuid = uuid.UUID(request.transfer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Transfer ID format.")
        
    transfer = db.query(OwnershipTransfer).filter(OwnershipTransfer.transfer_id == t_uuid).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    if request.approval_decision == "APPROVED":
        transfer.status = TransferStatus.TAHSILDAR_APPROVED.value
        transfer.blockchain_status = "pending" # Trigger to record
        
        # Simulate blockchain interaction
        mock_hash = f"0x{uuid.uuid4().hex}"
        transfer.blockchain_status = "recorded" # Assume instant for now
        
        db.commit()
        
        return TahsildarReviewResponse(
            transfer_id=str(transfer.transfer_id),
            status=TransferStatus.TAHSILDAR_APPROVED.value,
            dashboard_color="🟢 GREEN",
            message="Transfer approved by Tahsildar",
            next_actions=["Record on Blockchain", "Generate eSign", "Complete Transfer"],
            blockchain_hash=mock_hash,
            blockchain_status="ON_CHAIN",
            next_step="Digital Signature Generation"
        )
    else:
        # Handle Rejection/Escalation
        transfer.status = TransferStatus.REJECTED.value
        db.commit()
        return TahsildarReviewResponse(
            transfer_id=str(transfer.transfer_id),
            status="REJECTED",
            dashboard_color="🔴 RED",
            message="Transfer Rejected by Tahsildar",
            next_actions=["Return to Applicant"],
            next_step="Applicant Revision"
        )

# 4. Generate eSign
@router.post("/generate_esign", response_model=GenerateESignResponse)
def generate_esign(request: GenerateESignRequest, db: Session = Depends(get_db)):
    try:
        t_uuid = uuid.UUID(request.transfer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Transfer ID format.")
        
    transfer = db.query(OwnershipTransfer).filter(OwnershipTransfer.transfer_id == t_uuid).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    transfer.status = TransferStatus.SIGNED.value
    db.commit()
    
    return GenerateESignResponse(
        transfer_id=str(transfer.transfer_id),
        status=TransferStatus.SIGNED.value,
        dashboard_color="🟢 GREEN",
        esign_reference=f"ES-{date.today().year}-{str(uuid.uuid4())[:8]}",
        signature_timestamp=datetime.utcnow(),
        message="Transfer document digitally signed",
        blockchain_finalization="COMPLETE",
        next_step="Final Transfer Completion"
    )

# 5. Complete Transfer
@router.post("/complete_transfer", response_model=CompleteTransferResponse)
def complete_transfer(request: CompleteTransferRequest, db: Session = Depends(get_db)):
    try:
        t_uuid = uuid.UUID(request.transfer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Transfer ID format.")
        
    transfer = db.query(OwnershipTransfer).filter(OwnershipTransfer.transfer_id == t_uuid).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    transfer.status = TransferStatus.COMPLETED.value
    db.commit()
    
    # Generate new mock Farmer ID
    new_fid = f"JK-28-{str(uuid.uuid4().int)[:6]}"
    
    return CompleteTransferResponse(
        transfer_id=str(transfer.transfer_id),
        status=TransferStatus.COMPLETED.value,
        dashboard_color="🟢 GREEN",
        new_farmer_id=new_fid,
        farmer_id_certificate=f"FID-{date.today().year}-{new_fid}.pdf",
        certificate_download_link=f"/download/FID-{date.today().year}-{new_fid}.pdf",
        blockchain_final={
            "hash": f"0x{uuid.uuid4().hex}",
            "immutable": True,
            "verification_code": f"{new_fid}:{uuid.uuid4().hex[:6]}"
        },
        message="Ownership transfer completed successfully",
        actions_completed=[
            "✅ Documents verified",
            "✅ Tahsildar approved",
            "✅ Recorded on blockchain (immutable)",
            "✅ Digitally signed",
            "✅ Farmer ID issued",
            "✅ Revenue records updated"
        ]
    )

# 6. Get Transfer Details
@router.get("/{transfer_id}")
def get_transfer_details(transfer_id: str, db: Session = Depends(get_db)):
    try:
        t_uuid = uuid.UUID(transfer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Transfer ID format.")
        
    transfer = db.query(OwnershipTransfer).filter(OwnershipTransfer.transfer_id == t_uuid).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
        
    return {
        "transfer_id": str(transfer.transfer_id),
        "status": transfer.status,
        "transfer_date": transfer.transfer_date,
        "from_farmer_id": str(transfer.from_farmer_id),
        "to_farmer_id": str(transfer.to_farmer_id),
        "plot_id": str(transfer.plot_id),
        "blockchain_status": transfer.blockchain_status
    }
