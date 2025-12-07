import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base
from datetime import datetime

class Provenance(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), index=True)
    entity_type = Column(String)
    source_doc_id = Column(String)
    action = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
