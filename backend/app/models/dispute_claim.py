import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.db.base_class import Base

class DisputeClaim(Base):
    """
    Model for DISPUTE_CLAIMS
    Tracks legal or civil disputes over land parcels
    """
    __tablename__ = "dispute_claims"
    
    claim_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey('landparcel.id'), index=True)
    
    farmer_id_primary = Column(UUID(as_uuid=True), ForeignKey('person.id'), index=True)
    farmer_id_secondary = Column(UUID(as_uuid=True), ForeignKey('person.id'), index=True, nullable=True)
    
    claim_category = Column(String) # inheritance, encroachment, title_defect
    claim_status = Column(String, default="open") # open, hearing_scheduled, resolved, dismissed
    claim_priority = Column(String, default="medium") # low, medium, high, critical
    claim_description = Column(Text, nullable=True)
    
    created_date = Column(DateTime, default=datetime.utcnow)
