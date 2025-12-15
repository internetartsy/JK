import uuid
from sqlalchemy import Column, String, Date, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.db.base_class import Base

class PMKisanEnrollment(Base):
    """
    Model for PM_KISAN_ENROLLMENT
    Tracks subsidy enrollments for farmers
    """
    __tablename__ = "pm_kisan_enrollment"
    
    enrollment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id = Column(UUID(as_uuid=True), ForeignKey('person.id'), index=True)
    
    benefit_amount = Column(Float, default=6000.0)
    benefit_frequency = Column(String, default="annual")
    enrollment_date = Column(Date, default=datetime.utcnow)
    
    status = Column(String, default="active") # active, suspended, pending_kyc
    last_disbursed_date = Column(DateTime, nullable=True)
