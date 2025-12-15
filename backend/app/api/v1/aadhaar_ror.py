"""
Aadhaar Consent & ULPIN-Farmer-RoR Linkage API
Implements privacy-preserving Aadhaar linking with consent management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.db.session import get_db
from app.models.aadhaar_ror import AadhaarConsent, RecordOfRights, ULPINFarmerRoRLink
from app.models.person import Person
from app.models.land_parcel import LandParcel


router = APIRouter()


# Pydantic Models
class AadhaarConsentRequest(BaseModel):
    """Request to link Aadhaar with farmer ID (consent-based)"""
    farmer_id: str
    aadhaar_number: str  # Will be hashed immediately, never stored plain
    consent_purpose: str = "Land RoR validation"
    consent_duration_days: int = Field(default=365, ge=1, le=730)  # Max 2 years
    
    @validator('aadhaar_number')
    def validate_aadhaar(cls, v):
        """Validate Aadhaar format (12 digits)"""
        clean = ''.join(filter(str.isdigit, v))
        if len(clean) != 12:
            raise ValueError('Aadhaar must be 12 digits')
        return clean


class AadhaarVerificationRequest(BaseModel):
    """Request to verify Aadhaar via OTP/eKYC"""
    consent_id: str
    verification_method: str = Field(..., pattern="^(OTP|Biometric|eKYC)$")
    verification_code: Optional[str] = None  # OTP code if method=OTP


class RoRCreateRequest(BaseModel):
    """Create Record of Rights"""
    ulpin: str = Field(..., min_length=14, max_length=14)
    ror_number: str
    khewat_number: Optional[str]
    khatoni_number: Optional[str]
    khasra_numbers: List[str]
    owner_names: List[str]
    total_area: float
    revenue_village: str
    tehsil: str
    district: str


class LinkageCreateRequest(BaseModel):
    """Create ULPIN-Farmer-RoR linkage"""
    ulpin: str
    farmer_id: str
    ror_number: str
    ownership_type: str = Field(..., pattern="^(Owner|Co-owner|Tenant|Lessee)$")
    ownership_share: Optional[float] = Field(None, ge=0, le=100)


class LinkageValidationRequest(BaseModel):
    """Request to validate a linkage"""
    linkage_id: str
    validation_method: str = "Aadhaar+RoR"
    validated_by: str
    remarks: Optional[str]


# API Endpoints

@router.post("/consent/aadhaar", status_code=status.HTTP_201_CREATED)
async def create_aadhaar_consent(
    request: Request,
    data: AadhaarConsentRequest,
    db: Session = Depends(get_db)
):
    """
    Create Aadhaar consent record (privacy-preserving)
    - Hashes Aadhaar number (never stores plain text)
    - Tracks consent timestamp and purpose
    - Sets expiration date
    """
    # Check if farmer exists
    farmer = db.query(Person).filter_by(id=uuid.UUID(data.farmer_id)).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    # Check for existing consent
    existing = db.query(AadhaarConsent).filter_by(farmer_id=farmer.id).first()
    if existing and existing.is_consent_valid():
        raise HTTPException(
            status_code=400, 
            detail="Valid Aadhaar consent already exists for this farmer"
        )
    
    # Create consent record
    consent = AadhaarConsent(
        farmer_id=farmer.id,
        aadhaar_hash=AadhaarConsent.hash_aadhaar(data.aadhaar_number),
        aadhaar_last_4=AadhaarConsent.get_last_4_digits(data.aadhaar_number),
        consent_given=True,
        consent_timestamp=datetime.utcnow(),
        consent_ip_address=request.client.host,
        consent_purpose=data.consent_purpose,
        consent_expires_at=datetime.utcnow() + timedelta(days=data.consent_duration_days)
    )
    
    db.add(consent)
    db.commit()
    db.refresh(consent)
    
    return {
        "consent_id": str(consent.id),
        "farmer_id": str(consent.farmer_id),
        "aadhaar_masked": f"XXXX XXXX {consent.aadhaar_last_4}",
        "consent_given": consent.consent_given,
        "consent_timestamp": consent.consent_timestamp,
        "consent_expires_at": consent.consent_expires_at,
        "aadhaar_verified": consent.aadhaar_verified,
        "message": "Consent recorded. Please verify Aadhaar via OTP/eKYC."
    }


@router.post("/consent/verify")
async def verify_aadhaar(
    data: AadhaarVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Verify Aadhaar number via OTP/Biometric/eKYC
    (In production, integrate with UIDAI API)
    """
    consent = db.query(AadhaarConsent).filter_by(id=uuid.UUID(data.consent_id)).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")
    
    if not consent.is_consent_valid():
        raise HTTPException(status_code=400, detail="Consent is not valid or has expired")
    
    # TODO: Integrate with UIDAI API for actual verification
    # For now, simulate verification
    if data.verification_method == "OTP":
        # In production: Validate OTP with UIDAI
        if not data.verification_code:
            raise HTTPException(status_code=400, detail="OTP code required")
        # Simulate OTP validation
        if data.verification_code == "123456":  # Mock OTP
            consent.aadhaar_verified = True
    elif data.verification_method in ["Biometric", "eKYC"]:
        # In production: Call UIDAI biometric/eKYC API
        consent.aadhaar_verified = True
    
    consent.aadhaar_verified_at = datetime.utcnow()
    consent.aadhaar_verification_method = data.verification_method
    
    db.commit()
    db.refresh(consent)
    
    return {
        "consent_id": str(consent.id),
        "aadhaar_verified": consent.aadhaar_verified,
        "verification_method": consent.aadhaar_verification_method,
        "verified_at": consent.aadhaar_verified_at,
        "message": "Aadhaar verification successful"
    }


@router.post("/consent/revoke/{consent_id}")
async def revoke_aadhaar_consent(
    consent_id: str,
    db: Session = Depends(get_db)
):
    """Revoke Aadhaar consent (user right to withdraw)"""
    consent = db.query(AadhaarConsent).filter_by(id=uuid.UUID(consent_id)).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    
    consent.consent_revoked = True
    consent.consent_revoked_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "consent_id": str(consent.id),
        "revoked": True,
        "revoked_at": consent.consent_revoked_at,
        "message": "Consent revoked successfully"
    }


@router.post("/ror", status_code=status.HTTP_201_CREATED)
async def create_ror(
    data: RoRCreateRequest,
    db: Session = Depends(get_db)
):
    """Create Record of Rights (RoR) linked to ULPIN"""
    # Check if ULPIN exists
    parcel = db.query(LandParcel).filter_by(parcel_id=data.ulpin).first()
    if not parcel:
        raise HTTPException(status_code=404, detail=f"ULPIN {data.ulpin} not found")
    
    # Check for duplicate RoR number
    existing = db.query(RecordOfRights).filter_by(ror_number=data.ror_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="RoR number already exists")
    
    # Create RoR
    ror = RecordOfRights(
        ulpin=data.ulpin,
        ror_number=data.ror_number,
        khewat_number=data.khewat_number,
        khatoni_number=data.khatoni_number,
        khasra_numbers=data.khasra_numbers,
        owner_names={"names": data.owner_names},
        total_area=data.total_area,
        revenue_village=data.revenue_village,
        tehsil=data.tehsil,
        district=data.district,
        verified=False  # Requires revenue officer verification
    )
    
    db.add(ror)
    db.commit()
    db.refresh(ror)
    
    return {
        "ror_id": str(ror.id),
        "ror_number": ror.ror_number,
        "ulpin": ror.ulpin,
        "verified": ror.verified,
        "message": "RoR created. Pending revenue department verification."
    }


@router.post("/linkage", status_code=status.HTTP_201_CREATED)
async def create_ulpin_farmer_linkage(
    data: LinkageCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Create ULPIN-Farmer-RoR linkage
    Requires:
    - Valid ULPIN
    - Verified farmer with Aadhaar consent
    - Valid RoR
    """
    # Validate ULPIN
    parcel = db.query(LandParcel).filter_by(parcel_id=data.ulpin).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="ULPIN not found")
    
    # Validate farmer
    farmer = db.query(Person).filter_by(id=uuid.UUID(data.farmer_id)).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    # Validate RoR
    ror = db.query(RecordOfRights).filter_by(ror_number=data.ror_number).first()
    if not ror:
        raise HTTPException(status_code=404, detail="RoR not found")
    
    # Check for valid Aadhaar consent
    consent = db.query(AadhaarConsent).filter_by(farmer_id=farmer.id).first()
    if not consent or not consent.is_consent_valid():
        raise HTTPException(
            status_code=400, 
            detail="Farmer must have valid Aadhaar consent before linking"
        )
    
    # Create linkage
    linkage = ULPINFarmerRoRLink(
        ulpin=data.ulpin,
        farmer_id=farmer.id,
        ror_id=ror.id,
        ownership_type=data.ownership_type,
        ownership_share=data.ownership_share,
        validated=False  # Requires validation
    )
    
    db.add(linkage)
    db.commit()
    db.refresh(linkage)
    
    # Check if can be validated
    can_validate, reason = linkage.can_validate(db)
    
    return {
        "linkage_id": str(linkage.id),
        "ulpin": linkage.ulpin,
        "farmer_id": str(linkage.farmer_id),
        "ror_number": ror.ror_number,
        "can_validate": can_validate,
        "validation_status": reason,
        "validated": linkage.validated,
        "message": "Linkage created successfully"
    }


@router.post("/linkage/validate")
async def validate_linkage(
    data: LinkageValidationRequest,
    db: Session = Depends(get_db)
):
    """
    Validate ULPIN-Farmer-RoR linkage
    Requires all prerequisites (Aadhaar consent, RoR verification, ULPIN)
    """
    linkage = db.query(ULPINFarmerRoRLink).filter_by(id=uuid.UUID(data.linkage_id)).first()
    if not linkage:
        raise HTTPException(status_code=404, detail="Linkage not found")
    
    # Check if can be validated
    can_validate, reason = linkage.can_validate(db)
    if not can_validate:
        raise HTTPException(status_code=400, detail=f"Cannot validate: {reason}")
    
    # Perform validation
    linkage.validated = True
    linkage.validated_by = data.validated_by
    linkage.validated_at = datetime.utcnow()
    linkage.validation_method = data.validation_method
    linkage.remarks = data.remarks
    
    db.commit()
    db.refresh(linkage)
    
    return {
        "linkage_id": str(linkage.id),
        "validated": linkage.validated,
        "validated_by": linkage.validated_by,
        "validated_at": linkage.validated_at,
        "message": "Linkage validated successfully. Farmer ID now linked to ULPIN via RoR."
    }


@router.get("/farmer/{farmer_id}/landholdings")
async def get_farmer_landholdings(
    farmer_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all validated land holdings for a farmer
    Returns ULPINs, RoRs, and ownership details
    """
    linkages = db.query(ULPINFarmerRoRLink).filter_by(
        farmer_id=uuid.UUID(farmer_id),
        validated=True,
        active=True
    ).all()
    
    holdings = []
    for link in linkages:
        holdings.append({
            "ulpin": link.ulpin,
            "ror_number": link.ror.ror_number,
            "ownership_type": link.ownership_type,
            "ownership_share": link.ownership_share,
            "total_area": link.ror.total_area,
            "revenue_village": link.ror.revenue_village,
            "tehsil": link.ror.tehsil,
            "validated_at": link.validated_at
        })
    
    return {
        "farmer_id": farmer_id,
        "total_holdings": len(holdings),
        "holdings": holdings
    }
