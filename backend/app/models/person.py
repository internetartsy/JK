import uuid
from sqlalchemy import Column, String, Float, JSON, DateTime, Boolean
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Person(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_urdu = Column(String, nullable=True)
    name_english = Column(String, nullable=True) # farmer_name_transliterated
    
    # New fields matching FARMER_MASTER
    contact_mobile = Column(String, index=True, nullable=True)
    aadhaar_number = Column(String, unique=True, index=True, nullable=True)
    
    total_landholding_hectares = Column(Float, default=0.0)
    dispute_status = Column(String, default="clear") # clear, disputed, etc.
    aadhaar_verified = Column(Boolean, default=False)
    
    # Original fields
    confidence = Column(Float, default=0.0)
    consent_flags = Column(JSON, default={})
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_date = Column(DateTime, default=datetime.utcnow)
