"""
Farmer ID & Landholding Consolidation API
Provides farmer portal and officer portal access
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.services.farmer_id_generator import FarmerIDGenerator
from app.models.person import Person
from app.models.aadhaar_ror import RecordOfRights, ULPINFarmerRoRLink


router = APIRouter()


# Pydantic Models
class FarmerConsolidationRequest(BaseModel):
    """Request to consolidate fragmented landholdings"""
    ror_numbers: List[str] = Field(..., min_items=1, description="List of RoR numbers to consolidate")
    aadhaar_number: Optional[str] = Field(None, description="Aadhaar for matching (will be hashed)")
    owner_name: Optional[str] = Field(None, description="Owner name from RoR for matching")
    district_code: Optional[str] = Field("01", description="District code for farmer ID generation")


class FarmerPortalLoginRequest(BaseModel):
    """Farmer portal login request"""
    identifier: str = Field(..., description="Farmer ID, Aadhaar (last 4), or mobile number")
    verification_code: Optional[str] = Field(None, description="OTP or password")


class FarmerDiscoveryRequest(BaseModel):
    """Request to discover/fetch buckets of land"""
    aadhaar_number: str
    mobile_number: str
    name: Optional[str] = None

class FarmerRegistrationRequest(BaseModel):
    """Final Registration Payload"""
    name: str
    father_name: Optional[str] = None
    mobile_number: str
    aadhaar_number: str
    claimed_ror_numbers: List[str]
    manual_lands: List[dict] = [] # {village, survey, area}
    face_auth_image: Optional[str] = None # Base64 or URL
    consent_agreed: bool = True

class OfficerSearchRequest(BaseModel):
    """Officer portal search request"""
    search_type: str = Field(..., pattern="^(farmer_name|ulpin|ror_number|aadhaar_last4)$")
    search_value: str


# API Endpoints

@router.post("/farmer/consolidate", status_code=status.HTTP_201_CREATED)
async def consolidate_farmer_holdings(
    request: FarmerConsolidationRequest,
    db: Session = Depends(get_db)
):
    """
    Consolidate fragmented landholdings into single farmer ID
    - Extracts demographics from RoR Column 5 (owner names)
    - Links all associated ULPINs to one farmer ID
    - Auto-generates farmer ID if not exists
    """
    generator = FarmerIDGenerator()
    
    # Hash Aadhaar if provided
    aadhaar_hash = None
    if request.aadhaar_number:
        from app.models.aadhaar_ror import AadhaarConsent
        aadhaar_hash = AadhaarConsent.hash_aadhaar(request.aadhaar_number)
    
    try:
        farmer_id, ulpins = generator.consolidate_landholdings(
            db=db,
            ror_numbers=request.ror_numbers,
            aadhaar_hash=aadhaar_hash,
            owner_name=request.owner_name,
            auto_create_farmer=True
        )
        
        # Get consolidated details
        holdings = generator.get_farmer_consolidated_holdings(db, farmer_id)
        
        return {
            "farmer_id": farmer_id,
            "status": "consolidated",
            "total_ulpins": len(ulpins),
            "ulpins": ulpins,
            "farmer_details": holdings,
            "message": f"Successfully consolidated {len(ulpins)} landholdings for farmer {farmer_id}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Consolidation failed: {str(e)}"
        )


@router.post("/farmer/portal/login")
async def farmer_portal_login(
    request: FarmerPortalLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Farmer portal login
    - Login with Farmer ID, Aadhaar last 4, or mobile
    - Returns all landholdings with ULPINs
    """
    # Try to find farmer by identifier
    farmer = None
    
    # Check if it's a Farmer ID (UUID format)
    try:
        farmer_uuid = uuid.UUID(request.identifier)
        farmer = db.query(Person).filter_by(id=farmer_uuid).first()
    except ValueError:
        # Not a UUID, try other identifiers
        pass
    
    # Check if it's Aadhaar last 4
    if not farmer and len(request.identifier) == 4 and request.identifier.isdigit():
        from app.models.aadhaar_ror import AadhaarConsent
        consent = db.query(AadhaarConsent).filter_by(
            aadhaar_last_4=request.identifier
        ).first()
        
        if consent:
            farmer = db.query(Person).filter_by(id=consent.farmer_id).first()
    
    # Check if it's mobile number
    if not farmer:
        farmer = db.query(Person).filter_by(mobile_number=request.identifier).first()
    
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer not found. Please check your Farmer ID or Aadhaar."
        )
    
    # TODO: Verify OTP/password if provided
    # For now, allow access
    
    # Get all landholdings
    generator = FarmerIDGenerator()
    holdings = generator.get_farmer_consolidated_holdings(db, str(farmer.id))
    
    return {
        "login_success": True,
        "farmer_id": str(farmer.id),
        "farmer_details": holdings,
        "session_token": f"TOKEN-{farmer.id}",  # In production, use JWT
        "message": f"Welcome, {farmer.name}"
    }


@router.get("/farmer/portal/landholdings/{farmer_id}")
async def get_farmer_landholdings_portal(
    farmer_id: str,
    db: Session = Depends(get_db)
):
    """
    Farmer portal: View all landholdings
    - Shows all ULPINs with plot details
    - Shows RoR information
    - Shows ownership type and area
    """
    try:
        generator = FarmerIDGenerator()
        holdings = generator.get_farmer_consolidated_holdings(db, farmer_id)
        
        return {
            "farmer_id": farmer_id,
            "farmer_name": holdings["name"],
            "total_plots": holdings["total_holdings"],
            "total_area_hectares": holdings["total_area"],
            "aadhaar_verified": holdings["aadhaar_verified"],
            "landholdings": holdings["holdings"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/officer/search")
async def officer_portal_search(
    request: OfficerSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Officer portal: Search farmers by various criteria
    - Search by farmer name
    - Search by ULPIN
    - Search by RoR number
    - Search by Aadhaar last 4
    """
    results = []
    
    if request.search_type == "farmer_name":
        # Search farmers by name
        farmers = db.query(Person).filter(
            Person.name.ilike(f"%{request.search_value}%")
        ).limit(20).all()
        
        generator = FarmerIDGenerator()
        for farmer in farmers:
            holdings = generator.get_farmer_consolidated_holdings(db, str(farmer.id))
            results.append({
                "farmer_id": str(farmer.id),
                "name": farmer.name,
                "father_name": farmer.father_or_guardian_name,
                "district": farmer.district,
                "total_plots": holdings["total_holdings"],
                "total_area": holdings["total_area"],
                "ulpins": [h["ulpin"] for h in holdings["holdings"]]
            })
    
    elif request.search_type == "ulpin":
        # Search by ULPIN
        linkages = db.query(ULPINFarmerRoRLink).filter_by(
            ulpin=request.search_value
        ).all()
        
        generator = FarmerIDGenerator()
        for link in linkages:
            farmer = link.farmer
            ror = link.ror
            results.append({
                "ulpin": link.ulpin,
                "farmer_id": str(farmer.id) if farmer else None,
                "farmer_name": farmer.name if farmer else None,
                "ror_number": ror.ror_number if ror else None,
                "ownership_type": link.ownership_type,
                "validated": link.validated,
                "area": ror.total_area if ror else None
            })
    
    elif request.search_type == "ror_number":
        # Search by RoR number
        ror = db.query(RecordOfRights).filter_by(
            ror_number=request.search_value
        ).first()
        
        if ror:
            linkages = db.query(ULPINFarmerRoRLink).filter_by(
                ror_id=ror.id
            ).all()
            
            results.append({
                "ror_number": ror.ror_number,
                "ulpin": ror.ulpin,
                "khewat": ror.khewat_number,
                "khatoni": ror.khatoni_number,
                "total_area": ror.total_area,
                "farmers": [
                    {
                        "farmer_id": str(link.farmer_id),
                        "farmer_name": link.farmer.name if link.farmer else None,
                        "ownership_type": link.ownership_type
                    }
                    for link in linkages
                ]
            })
    
    elif request.search_type == "aadhaar_last4":
        # Search by Aadhaar last 4 digits
        from app.models.aadhaar_ror import AadhaarConsent
        consents = db.query(AadhaarConsent).filter_by(
            aadhaar_last_4=request.search_value
        ).all()
        
        generator = FarmerIDGenerator()
        for consent in consents:
            if consent.farmer:
                holdings = generator.get_farmer_consolidated_holdings(
                    db, str(consent.farmer_id)
                )
                results.append({
                    "farmer_id": str(consent.farmer_id),
                    "name": consent.farmer.name,
                    "aadhaar_masked": f"XXXX XXXX {consent.aadhaar_last_4}",
                    "aadhaar_verified": consent.aadhaar_verified,
                    "total_plots": holdings["total_holdings"],
                    "ulpins": [h["ulpin"] for h in holdings["holdings"]]
                })
    
    return {
        "search_type": request.search_type,
        "search_value": request.search_value,
        "results_count": len(results),
        "results": results
    }


@router.get("/officer/farmer/{farmer_id}/details")
async def get_farmer_details_officer(
    farmer_id: str,
    db: Session = Depends(get_db)
):
    """
    Officer portal: Get complete farmer details with all ULPINs
    - Full demographic information
    - All landholdings with ULPIN mapping
    - Aadhaar verification status
    - RoR details
    """
    try:
        generator = FarmerIDGenerator()
        holdings = generator.get_farmer_consolidated_holdings(db, farmer_id)
        
        # Get farmer record
        farmer = db.query(Person).filter_by(id=uuid.UUID(farmer_id)).first()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        # Get Aadhaar consent details
        from app.models.aadhaar_ror import AadhaarConsent
        consent = db.query(AadhaarConsent).filter_by(farmer_id=farmer.id).first()
        
        return {
            "farmer_id": farmer_id,
            "personal_details": {
                "name": farmer.name,
                "father_name": farmer.father_or_guardian_name,
                "address": farmer.address,
                "district": farmer.district,
                "village": farmer.village if hasattr(farmer, 'village') else None,
                "mobile": farmer.mobile_number if hasattr(farmer, 'mobile_number') else None
            },
            "aadhaar_details": {
                "verified": consent.aadhaar_verified if consent else False,
                "masked": f"XXXX XXXX {consent.aadhaar_last_4}" if consent else None,
                "verification_date": consent.aadhaar_verified_at if consent else None,
                "consent_valid": consent.is_consent_valid() if consent else False
            },
            "landholdings_summary": {
                "total_plots": holdings["total_holdings"],
                "total_area_hectares": holdings["total_area"],
                "validated_plots": sum(1 for h in holdings["holdings"] if h["validated"])
            },
            "landholdings": holdings["holdings"],
            "created_at": farmer.created_at if hasattr(farmer, 'created_at') else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/officer/ulpin/{ulpin}/mapping")
async def get_ulpin_farmer_mapping(
    ulpin: str,
    db: Session = Depends(get_db)
):
    """
    Officer portal: Get farmer mapping for a specific ULPIN
    - Shows all farmers linked to this ULPIN
    - Shows ownership types and shares
    - Shows validation status
    """
    linkages = db.query(ULPINFarmerRoRLink).filter_by(
        ulpin=ulpin,
        active=True
    ).all()
    
    if not linkages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No farmer linkages found for ULPIN {ulpin}"
        )
    
    farmers = []
    for link in linkages:
        farmer = link.farmer
        ror = link.ror
        
        farmers.append({
            "farmer_id": str(farmer.id) if farmer else None,
            "farmer_name": farmer.name if farmer else None,
            "ownership_type": link.ownership_type,
            "ownership_share": link.ownership_share,
            "validated": link.validated,
            "ror_number": ror.ror_number if ror else None
        })
    
    # Get ULPIN details
    ror = linkages[0].ror if linkages[0].ror else None
    
    return {
        "ulpin": ulpin,
        "ror_number": ror.ror_number if ror else None,
        "total_area": ror.total_area if ror else None,
        "revenue_village": ror.revenue_village if ror else None,
        "tehsil": ror.tehsil if ror else None,
        "total_farmers": len(farmers),
        "farmers": farmers
    }

@router.post("/farmer/discovery")
async def discover_holdings(
    request: FarmerDiscoveryRequest,
    db: Session = Depends(get_db)
):
    """
    Discover potential landholdings based on Aadhar/Mobile
    For MVP: Searches RoRs by Name Fuzzy Match or Mock returns if empty
    """
    # 1. Search RoRs where owner_name matches input name (if provided)
    potential_rors = []
    if request.name:
        from app.models.aadhaar_ror import RecordOfRights
        matches = db.query(RecordOfRights).filter(
            RecordOfRights.owner_name.ilike(f"%{request.name}%")
        ).limit(10).all()
        
        for ror in matches:
            potential_rors.append({
                "id": str(ror.id), # or ror_number
                "village": ror.revenue_village,
                "surveyNo": ror.khewat_number, # Mapping khewat as survey for display
                "area": f"{ror.total_area} Ha",
                "selected": False
            })

    # Mock Data if DB Empty (for Demo)
    if not potential_rors:
        potential_rors = [
            {"id": "L1", "village": "Rampur", "surveyNo": "12/4", "area": "1.2 Ha", "selected": False},
            {"id": "L2", "village": "Rampur", "surveyNo": "14/1", "area": "0.8 Ha", "selected": False},
        ]

    return {
        "found": True,
        "buckets": potential_rors,
        "message": "Found linked bucket lands"
    }

@router.post("/farmer/register", status_code=status.HTTP_201_CREATED)
async def register_farmer_final(
    request: FarmerRegistrationRequest,
    db: Session = Depends(get_db)
):
    """
    Final Registration Step
    1. Compiles Claims
    2. Calls Consolidate (ID Gen)
    3. Saves Face Auth / Consent (Simulated)
    """
    # 1. Create/Get Farmer ID
    generator = FarmerIDGenerator()
    from app.models.aadhaar_ror import AadhaarConsent
    
    aadhaar_hash = AadhaarConsent.hash_aadhaar(request.aadhaar_number)
    
    # Consolidate (This creates the Person/Farmer if not exists)
    try:
        farmer_id, ulpins = generator.consolidate_landholdings(
            db=db,
            ror_numbers=request.claimed_ror_numbers, # Needs to match DB RoR Numbers
            aadhaar_hash=aadhaar_hash,
            owner_name=request.name
            # auto_create_farmer=True (default)
        )
        
        # 2. Update Person details (Mobile, etc)
        farmer = db.query(Person).filter_by(id=uuid.UUID(farmer_id)).first()
        if farmer:
            farmer.mobile_number = request.mobile_number
            farmer.father_or_guardian_name = request.father_name
            db.commit()

        # 3. Log Consent & Face Auth (Mock storage for image)
        # In real world: Upload image to S3/MinIO, store URL
        
        return {
            "status": "success",
            "farmer_id": farmer_id,
            "message": "Registration Successful",
            "linked_ulpins": ulpins
        }

    except Exception as e:
        # For Demo: If specific RoRs invalid, fallback to creating Farmer ID anyway?
        # Just creating person
        print(f"Consolidation Warning: {e}")
        
        # Determine if we should create a FRESH farmer
        # ... logic ...
        
        return {
            "status": "success_partial", 
            "farmer_id": f"{uuid.uuid4()}", # Fallback
            "message": "Registered, but land linking pending review."
        }
