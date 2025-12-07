import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Claim(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String)  # refugee, muhajireen, redistribution
    stage = Column(String)
    authority = Column(String)
    status = Column(String)
