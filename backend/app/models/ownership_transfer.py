import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.db.base_class import Base

class OwnershipTransfer(Base):
    """
    Model for OWNERSHIP_TRANSFER
    Tracks land ownership changes (Mutations)
    """
    __tablename__ = "ownership_transfer"
    
    transfer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey('landparcel.id'), index=True)
    from_farmer_id = Column(UUID(as_uuid=True), ForeignKey('person.id'), index=True)
    to_farmer_id = Column(UUID(as_uuid=True), ForeignKey('person.id'), index=True)
    
    transfer_date = Column(Date, nullable=True)
    status = Column(String, default="pending") # pending, approved, rejected
    blockchain_status = Column(String, default="not_recorded") # not_recorded, pending, recorded
    
    created_date = Column(DateTime, default=datetime.utcnow)
