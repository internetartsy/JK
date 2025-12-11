import uuid
from sqlalchemy import Column, String, Date, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.db.base_class import Base

class LeaseAgreement(Base):
    """
    Model for LEASE_AGREEMENT
    Tracks active leases between Landlords and Tenants
    """
    __tablename__ = "lease_agreement"
    
    lease_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    landlord_id = Column(UUID(as_uuid=True), ForeignKey('person.id'), index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey('person.id'), index=True)
    plot_id = Column(UUID(as_uuid=True), ForeignKey('landparcel.id'), index=True)
    
    lease_start_date = Column(Date)
    lease_end_date = Column(Date, nullable=True)
    monthly_rent_amount = Column(Float, default=0.0)
    
    dispute_status = Column(String, default="clear") # clear, active_dispute
    
    created_date = Column(DateTime, default=datetime.utcnow)
