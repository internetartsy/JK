from sqlalchemy import Column, String, Float, JSON, Enum
from app.db.base_class import Base
import enum

class ReviewStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class ReviewTask(Base):
    __tablename__ = "review_tasks"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, index=True)
    document_type = Column(String)
    confidence_score = Column(Float)
    extracted_fields = Column(JSON)
    status = Column(String, default=ReviewStatus.PENDING)
    assigned_to = Column(String, nullable=True)
