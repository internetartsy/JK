import uuid
from sqlalchemy import Column, String, Float, JSON, DateTime
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Person(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_urdu = Column(String, nullable=True)
    name_english = Column(String, nullable=True)
    confidence = Column(Float, default=0.0)
    consent_flags = Column(JSON, default={})
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
