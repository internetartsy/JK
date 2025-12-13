import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, event
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from geoalchemy2.functions import ST_AsGeoJSON, ST_Centroid
from app.db.base_class import Base


class LandParcel(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id = Column(String(14), unique=True, index=True, nullable=False)  # ULPIN (14-digit)
    geometry = Column(Geometry('POLYGON'), nullable=True)
    village_id = Column(String, index=True) # village_code
    tehsil_code = Column(String, index=True, nullable=True)
    khasra_number = Column(String, index=True)
    landmark = Column(String, nullable=True)
    
    area_text = Column(String, nullable=True)
    area_geom = Column(Float, nullable=True)
    parcel_size_hectares = Column(Float, nullable=True)
    
    crop_primary = Column(String, nullable=True)
    land_use_category = Column(String, nullable=True)
    ownership_status = Column(String, default="single") # single, joint, government
    
    image_url = Column(String, nullable=True)
    status = Column(String, default="active")
    claim_status = Column(String, default="none") # none, contested, resolved
    
    # Process Debt / Black Point Detection
    process_debt_status = Column(String, default="clear") # clear, black_point
    black_points = Column(String, nullable=True) # JSON string storing list of issues
    
    version = Column(Integer, default=1)
    ocr_confidence = Column(Integer, default=0)
    
    owner_id = Column(String, index=True, nullable=True) # FK to Person (farmer_id)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_date = Column(DateTime, default=datetime.utcnow)
    
    def generate_ulpin(self, session, district_code="01", tehsil_code="01"):
        """Generate 14-digit ULPIN from geometry centroid"""
        from app.utils.parcel_id_generator import ULPINGenerator
        
        if self.geometry:
            # Get centroid using PostGIS
            centroid = session.scalar(
                ST_AsGeoJSON(ST_Centroid(self.geometry))
            )
            
            if centroid:
                import json
                coords = json.loads(centroid)['coordinates']
                longitude, latitude = coords
                
                self.parcel_id = ULPINGenerator.generate_ulpin(
                    latitude=latitude,
                    longitude=longitude,
                    district_code=district_code,
                    tehsil_code=tehsil_code or "01"
                )


# Auto-generate ULPIN before insert if not set
@event.listens_for(LandParcel, 'before_insert')
def receive_before_insert(mapper, connection, target):
    """Auto-generate ULPIN if not already set"""
    if not target.parcel_id and target.geometry:
        from sqlalchemy.orm import Session
        session = Session.object_session(target) or Session(bind=connection)
        target.generate_ulpin(session)
