import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class VGHMap(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    village_code = Column(String, index=True)
    halqa_code = Column(String, index=True)
    girdawari_code = Column(String, index=True)
    parcel_id = Column(UUID(as_uuid=True), ForeignKey('landparcel.id'))

    parcel = relationship("LandParcel")
