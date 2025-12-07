import uuid
from sqlalchemy import Column, String, Date, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Mutation(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String)
    parties = Column(JSON)
    order_date = Column(Date, nullable=True)
    effect = Column(String, nullable=True)
    document_ref = Column(String, nullable=True)
