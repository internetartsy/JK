import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime

class Cultivation(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id = Column(UUID(as_uuid=True), ForeignKey('landparcel.id'))
    season = Column(String)
    crop_code = Column(String)
    area = Column(Float)
    irrigation = Column(String, nullable=True)
    source = Column(String, nullable=True)
    confidence = Column(Float, default=0.0)
    observed_at = Column(DateTime, default=datetime.utcnow)

    parcel = relationship("LandParcel")
