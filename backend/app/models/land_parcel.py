import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from app.db.base_class import Base

class LandParcel(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    geometry = Column(Geometry('POLYGON'), nullable=True)
    village_id = Column(String, index=True)
    khasra_number = Column(String, index=True)
    area_text = Column(String, nullable=True)
    area_geom = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(String, default="active")
    version = Column(Integer, default=1)
    owner_id = Column(String, index=True, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
