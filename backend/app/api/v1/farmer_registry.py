from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.api.deps import get_db, check_api_version
from app.services.matching_service import matching_service
from app.models.person import Person
from pydantic import BaseModel

router = APIRouter(prefix="/registry", tags=["registry"])

class PMKisanRecord(BaseModel):
    registrationNo: str
    farmerName: str
    fatherName: str
    mobileNo: str
    village: str = None
    district: str = None

class PMFBYRecord(BaseModel):
    applicationNo: str
    farmerName: str
    relationName: str = None # Father/Husband
    mobileNo: str
    vertex: str = None

class MatchResponse(BaseModel):
    matches: List[Dict[str, Any]]
    stats: Dict[str, int]

@router.post("/match/pmkisan", response_model=MatchResponse, dependencies=[Depends(check_api_version)])
def match_pmkisan(
    records: List[PMKisanRecord],
    db: Session = Depends(get_db)
):
    """
    Match provided PMKISAN records against DB ROR (Persons).
    """
    # 1. Fetch ROR Records (Persons)
    # Ideally filtering by district if provided in records to optimize
    # For now fetching all (Performance warning)
    ror_persons = db.query(Person).all()
    
    ror_data = []
    for p in ror_persons:
        ror_data.append({
            "id": str(p.id),
            "name": p.name_english or p.name_urdu,
            "father_name": p.father_name,
            "mobile": p.contact_mobile,
            "village": p.village
        })

    # 2. Convert Pydantic to Dict
    pmkisan_data = [r.dict() for r in records]
    
    # 3. Process Matching
    matches = matching_service.match_pmkisan(ror_data, pmkisan_data)
    
    return {
        "matches": matches,
        "stats": {
            "total_input": len(records),
            "matched_ror": len(matches)
        }
    }

@router.post("/match/pmfby", response_model=MatchResponse, dependencies=[Depends(check_api_version)])
def match_pmfby(
    records: List[PMFBYRecord],
    db: Session = Depends(get_db)
):
    """
    Match provided PMFBY records against DB ROR (Persons).
    """
    ror_persons = db.query(Person).limit(5000).all() # Safety limit
    ror_data = [{
        "id": str(p.id),
        "name": p.name_english or p.name_urdu,
        "father_name": p.father_name,
        "mobile": p.contact_mobile
    } for p in ror_persons]

    pmfby_data = [r.dict() for r in records]
    
    matches = matching_service.match_pmfby(ror_data, pmfby_data)
    
    return {
        "matches": matches,
        "stats": {"total_input": len(records), "matches": len(matches)}
    }

@router.post("/consolidate", dependencies=[Depends(check_api_version)])
def consolidate_registry(
    matches: List[Dict[str, Any]],
    db: Session = Depends(get_db)
):
    """
    Consolidate matches into a preliminary unique farmer list.
    """
    unique_list = matching_service.consolidate_and_deduplicate(matches)
    return unique_list
