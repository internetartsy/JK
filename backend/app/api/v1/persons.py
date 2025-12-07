from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.session import SessionLocal
from app.models.person import Person
from app.api.deps import check_api_version, RoleChecker
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/persons", tags=["persons"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class PersonCreate(BaseModel):
    name_urdu: Optional[str] = None
    name_english: Optional[str] = None
    confidence: float = 0.8
    consent_flags: dict = {}

class PersonResponse(BaseModel):
    id: str
    name_urdu: Optional[str]
    name_english: Optional[str]
    confidence: float
    consent_flags: dict
    updated_at: Optional[datetime]
    etag: Optional[str] = None
    
    model_config = {"from_attributes": True}
    
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, '__dict__'):
            instance = cls(
                id=str(obj.id),
                name_urdu=obj.name_urdu,
                name_english=obj.name_english,
                confidence=obj.confidence,
                consent_flags=obj.consent_flags,
                updated_at=obj.updated_at
            )
            if obj.updated_at:
                instance.etag = f'"{obj.updated_at.timestamp()}"'
            return instance
        return super().model_validate(obj, *args, **kwargs)

@router.get("/", response_model=List[PersonResponse], dependencies=[Depends(check_api_version)])
def list_persons(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    modified_since: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """List all persons with pagination and delta sync"""
    query = db.query(Person)
    
    if modified_since:
        query = query.filter(Person.updated_at > modified_since)
        
    persons = query.offset(skip).limit(limit).all()
    return [PersonResponse.model_validate(p) for p in persons]

@router.get("/{person_id}", response_model=PersonResponse, dependencies=[Depends(check_api_version)])
def get_person(person_id: str, db: Session = Depends(get_db)):
    """Get a specific person by ID"""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return PersonResponse.model_validate(person)

@router.post("/", response_model=PersonResponse, dependencies=[Depends(RoleChecker(["admin", "enumerator", "validator"]))])
def create_person(person: PersonCreate, db: Session = Depends(get_db)):
    """Create a new person"""
    db_person = Person(
        id=str(uuid.uuid4()),
        name_urdu=person.name_urdu,
        name_english=person.name_english,
        confidence=person.confidence,
        consent_flags=person.consent_flags
    )
    db.add(db_person)
    db.commit()
    db.refresh(db_person)

    # Sync to Frappe
    try:
        from app.services.frappe_sync.sync_service import FrappeSyncService
        sync_service = FrappeSyncService()
        sync_service.sync_person_to_frappe(db_person, action="create")
    except Exception as e:
        print(f"Failed to sync person to Frappe: {e}")

    return db_person

@router.delete("/{person_id}", dependencies=[Depends(RoleChecker(["admin"]))])
def delete_person(person_id: str, db: Session = Depends(get_db)):
    """Delete a person"""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    db.delete(person)
    db.commit()
    return {"message": "Person deleted successfully"}
