import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Tenure(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_id = Column(UUID(as_uuid=True), ForeignKey('landparcel.id'))
    person_id = Column(UUID(as_uuid=True), ForeignKey('person.id'))
    rights_type = Column(String)
    share = Column(String)  # e.g., "1/2" or "0.5"

    parcel = relationship("LandParcel")
    person = relationship("Person")
