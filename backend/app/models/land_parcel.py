import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from app.db.base_class import Base

class LandParcel(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    geometry = Column(Geometry('POLYGON'), nullable=True)
    village_id = Column(String, index=True) # village_code
    tehsil_code = Column(String, index=True, nullable=True)
    khasra_number = Column(String, index=True)
    
    area_text = Column(String, nullable=True)
    area_geom = Column(Float, nullable=True)
    parcel_size_hectares = Column(Float, nullable=True)
    
    crop_primary = Column(String, nullable=True)
    land_use_category = Column(String, nullable=True)
    ownership_status = Column(String, default="single") # single, joint, government
    
    image_url = Column(String, nullable=True)
    status = Column(String, default="active")
    claim_status = Column(String, default="none") # none, contested, resolved
    
    version = Column(Integer, default=1)
    ocr_confidence = Column(Integer, default=0)
    
    owner_id = Column(String, index=True, nullable=True) # FK to Person (farmer_id)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_date = Column(DateTime, default=datetime.utcnow)
