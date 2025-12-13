"""
Models for Record of Rights (RoR) and Aadhaar Consent Management
Implements privacy-preserving Aadhaar linking with ULPIN-Farmer validation
"""

import uuid
import hashlib
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Boolean, DateTime, Float, Date, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class RecordOfRights(Base):
    """
    RoR (Record of Rights) - Official land ownership record from Revenue Department
    Linked to ULPIN for digital validation
    """
    __tablename__ = "record_of_rights"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ulpin = Column(String(14), ForeignKey('landparcel.parcel_id'), nullable=False, index=True)
    ror_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Revenue records
    khewat_number = Column(String(50))  # Owner's serial number
    khatoni_number = Column(String(50))  # Cultivator's serial number
    khasra_numbers = Column(ARRAY(String))  # Survey numbers
    
    # Ownership details
    owner_names = Column(JSONB)  # List of owner names (from revenue records)
    total_area = Column(Float)
    cultivable_area = Column(Float)
    irrigation_status = Column(String(50))
    land_type = Column(String(50))  # Agricultural, Residential, etc.
    
    # Administrative
    revenue_village = Column(String(100))
    tehsil = Column(String(100))
    district = Column(String(100))
    
    # Mutation tracking
    mutation_number = Column(String(50))
    mutation_date = Column(Date)
    
    # Verification status
    verified = Column(Boolean, default=False)
    verified_by = Column(String)
    verified_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    land_parcel = relationship("LandParcel", foreign_keys=[ulpin])
    linkages = relationship("ULPINFarmerRoRLink", back_populates="ror")


class AadhaarConsent(Base):
    """
    Aadhaar Consent Management - Privacy-preserving consent tracking
    Stores only hashed Aadhaar, never plain text
    """
    __tablename__ = "aadhaar_consent"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey('person.id'), nullable=False, index=True)
    
    # Privacy-preserving Aadhaar storage
    aadhaar_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    aadhaar_last_4 = Column(String(4))  # For display purposes only
    
    # Consent tracking
    consent_given = Column(Boolean, default=False)
    consent_timestamp = Column(DateTime)
    consent_ip_address = Column(String(45))
    consent_device_info = Column(String)
    consent_purpose = Column(String)  # e.g., "PM-KISAN enrollment", "Land RoR validation"
    consent_expires_at = Column(DateTime)
    consent_revoked = Column(Boolean, default=False)
    consent_revoked_at = Column(DateTime)
    
    # Aadhaar verification
    aadhaar_verified = Column(Boolean, default=False)
    aadhaar_verified_at = Column(DateTime)
    aadhaar_verification_method = Column(String)  # OTP, Biometric, eKYC
    
    # Linked records
    linked_rors = Column(ARRAY(String))  # Array of RoR numbers
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    farmer = relationship("Person", foreign_keys=[farmer_id])
    
    @staticmethod
    def hash_aadhaar(aadhaar_number: str) -> str:
        """
        Hash Aadhaar number using SHA-256 (one-way, irreversible)
        Never store plain Aadhaar
        """
        # Remove spaces and validate format
        clean_aadhaar = ''.join(filter(str.isdigit, aadhaar_number))
        if len(clean_aadhaar) != 12:
            raise ValueError("Invalid Aadhaar number format")
        
        # SHA-256 hash
        return hashlib.sha256(clean_aadhaar.encode()).hexdigest()
    
    @staticmethod
    def get_last_4_digits(aadhaar_number: str) -> str:
        """Extract last 4 digits for display (XXXX XXXX 1234)"""
        clean_aadhaar = ''.join(filter(str.isdigit, aadhaar_number))
        return clean_aadhaar[-4:] if len(clean_aadhaar) == 12 else None
    
    def verify_aadhaar(self, aadhaar_number: str) -> bool:
        """Verify if provided Aadhaar matches stored hash"""
        provided_hash = self.hash_aadhaar(aadhaar_number)
        return provided_hash == self.aadhaar_hash
    
    def is_consent_valid(self) -> bool:
        """Check if consent is still valid"""
        if self.consent_revoked:
            return False
        if self.consent_expires_at and datetime.utcnow() > self.consent_expires_at:
            return False
        return self.consent_given


class ULPINFarmerRoRLink(Base):
    """
    ULPIN-Farmer-RoR Linkage - Validated connections between land parcels and farmers
    Requires both Aadhaar consent and RoR validation
    """
    __tablename__ = "ulpin_farmer_ror_link"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core linkage
    ulpin = Column(String(14), ForeignKey('landparcel.parcel_id'), nullable=False, index=True)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey('person.id'), nullable=False, index=True)
    ror_id = Column(UUID(as_uuid=True), ForeignKey('record_of_rights.id'), nullable=False, index=True)
    
    # Ownership details
    ownership_type = Column(String(50))  # Owner, Co-owner, Tenant, Lessee
    ownership_share = Column(Float)  # Percentage or area in hectares
    
    # Validation status
    validated = Column(Boolean, default=False, index=True)
    validated_by = Column(String)  # Officer ID or system
    validated_at = Column(DateTime)
    validation_method = Column(String)  # "Aadhaar+RoR", "Manual", "Document"
    
    # Status
    active = Column(Boolean, default=True)
    remarks = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    land_parcel = relationship("LandParcel", foreign_keys=[ulpin])
    farmer = relationship("Person", foreign_keys=[farmer_id])
    ror = relationship("RecordOfRights", foreign_keys=[ror_id], back_populates="linkages")
    
    def can_validate(self, session) -> tuple[bool, str]:
        """
        Check if this linkage can be validated
        Returns: (can_validate, reason)
        """
        # Check if farmer has valid Aadhaar consent
        consent = session.query(AadhaarConsent).filter_by(
            farmer_id=self.farmer_id
        ).first()
        
        if not consent:
            return False, "No Aadhaar consent record found"
        
        if not consent.is_consent_valid():
            return False, "Aadhaar consent not valid or expired"
        
        if not consent.aadhaar_verified:
            return False, "Aadhaar not verified"
        
        # Check if RoR is verified
        if not self.ror.verified:
            return False, "RoR not verified by revenue department"
        
        # Check if ULPIN exists
        if not self.land_parcel or not self.land_parcel.parcel_id:
            return False, "ULPIN not generated for land parcel"
        
        return True, "All requirements met for validation"
