import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.db.base_class import Base

class BlockchainEntry(Base):
    """
    Model for BLOCKCHAIN_ENTRY
    Tracks immutable citations of land records on ledger
    """
    __tablename__ = "blockchain_entry"
    
    entry_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    record_hash = Column(String, index=True)
    did = Column(String, index=True) # Decentralized Identifier
    ledger_id = Column(String) # e.g. "hyperledger-fabric-1", "polygon-mumbai"
    
    status = Column(String, default="confirmed")
    timestamp = Column(DateTime, default=datetime.utcnow)
