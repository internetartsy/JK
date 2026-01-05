from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid

class StepContext(BaseModel):
    """
    The 'Thinkable' context for a Motia execution flow.
    Centered around the universal Document 1D.
    """
    document_1d: str = Field(..., description="The universal identifier for the system of record.")
    doc_type: str = Field("unknown", description="Type of document (e.g., girdawari, mutation)")
    payload: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=lambda: {
        "runtime": "python",
        "orchestration": "motia-unified"
    })
    results: Dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def create(cls, document_1d: Optional[str] = None, doc_type: str = "unknown"):
        return cls(
            document_1d=document_1d or str(uuid.uuid4()),
            doc_type=doc_type
        )
