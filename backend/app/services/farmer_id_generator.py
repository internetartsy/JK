"""
Unique Farmer ID Generation Service
Consolidates fragmented landholdings and generates unified farmer IDs
"""

import uuid
import hashlib
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime

from app.models.aadhaar_ror import RecordOfRights, AadhaarConsent, ULPINFarmerRoRLink
from app.models.person import Person


class FarmerIDGenerator:
    """
    Generates unique farmer IDs by consolidating fragmented landholdings
    Uses RoR owner names and Aadhaar for entity resolution
    """
    
    @staticmethod
    def normalize_name(name: str) -> str:
        """Normalize name for comparison (remove spaces, lowercase, etc.)"""
        if not name:
            return ""
        # Remove extra spaces, convert to lowercase
        normalized = " ".join(name.lower().split())
        # Remove common titles
        titles = ["sri", "smt", "shri", "mr", "ms", "mrs", "s/o", "w/o", "d/o"]
        for title in titles:
            normalized = normalized.replace(f"{title} ", "").replace(f" {title}", "")
        return normalized.strip()
    
    @staticmethod
    def extract_demographics_from_ror(ror: RecordOfRights) -> Dict:
        """
        Extract demographic details from RoR Column 5 (owner names)
        Column 5 typically contains: Owner name, Father's name, Address
        """
        demographics = {
            "owner_name": None,
            "father_name": None,
            "guardian_name": None,
            "address": None,
            "extracted_from": f"RoR {ror.ror_number}"
        }
        
        if not ror.owner_names:
            return demographics
        
        # Parse owner_names JSON structure
        # Expected format: {"names": ["Name S/O Father", "Name2 W/O Husband"], "addresses": [...]}
        owner_data = ror.owner_names
        
        if isinstance(owner_data, dict):
            names_list = owner_data.get("names", [])
            if names_list and len(names_list) > 0:
                # Parse first owner name (primary owner)
                primary_owner = names_list[0]
                
                # Extract father/guardian name
                if "s/o" in primary_owner.lower():
                    parts = primary_owner.lower().split("s/o")
                    demographics["owner_name"] = parts[0].strip().title()
                    demographics["father_name"] = parts[1].strip().title() if len(parts) > 1 else None
                elif "w/o" in primary_owner.lower():
                    parts = primary_owner.lower().split("w/o")
                    demographics["owner_name"] = parts[0].strip().title()
                    demographics["guardian_name"] = parts[1].strip().title() if len(parts) > 1 else None
                elif "d/o" in primary_owner.lower():
                    parts = primary_owner.lower().split("d/o")
                    demographics["owner_name"] = parts[0].strip().title()
                    demographics["father_name"] = parts[1].strip().title() if len(parts) > 1 else None
                else:
                    demographics["owner_name"] = primary_owner.strip().title()
                
                # Extract address if available
                if "addresses" in owner_data and owner_data["addresses"]:
                    demographics["address"] = owner_data["addresses"][0]
        
        return demographics
    
    @staticmethod
    def generate_farmer_id_from_aadhaar(aadhaar_hash: str, district_code: str = "01") -> str:
        """
        Generate unique farmer ID from Aadhaar hash
        Format: FID-DD-XXXXXXXXXX
        - FID: Farmer ID prefix
        - DD: District code
        - XXXXXXXXXX: First 10 chars of Aadhaar hash
        """
        return f"FID-{district_code}-{aadhaar_hash[:10].upper()}"
    
    @staticmethod
    def generate_farmer_id_from_demographics(
        owner_name: str,
        father_name: Optional[str],
        district_code: str = "01"
    ) -> str:
        """
        Generate farmer ID from name when Aadhaar not available
        Format: FID-DD-XXXXXXXXXX (hash of name+father)
        """
        # Create unique string from demographics
        unique_str = f"{owner_name.lower()}|{(father_name or '').lower()}"
        name_hash = hashlib.sha256(unique_str.encode()).hexdigest()
        return f"FID-{district_code}-{name_hash[:10].upper()}"
    
    def consolidate_landholdings(
        self,
        db: Session,
        ror_numbers: Optional[List[str]] = None,
        aadhaar_hash: Optional[str] = None,
        owner_name: Optional[str] = None,
        auto_create_farmer: bool = True
    ) -> Tuple[str, List[str]]:
        """
        Consolidate fragmented landholdings across multiple ULPINs
        
        Args:
            db: Database session
            ror_numbers: List of RoR numbers to consolidate
            aadhaar_hash: Aadhaar hash for matching
            owner_name: Owner name for fuzzy matching
            auto_create_farmer: Auto-create Person record if not exists
            
        Returns:
            (farmer_id, list_of_ulpins)
        """
        ulpins = []
        consolidated_demographics = {}
        
        # Step 1: Find all RoRs matching criteria
        query = db.query(RecordOfRights)
        
        if ror_numbers:
            query = query.filter(RecordOfRights.ror_number.in_(ror_numbers))
        
        rors = query.all()
        
        if not rors:
            raise ValueError("No RoR records found matching criteria")
        
        # Step 2: Extract demographics from all RoRs
        for ror in rors:
            demographics = self.extract_demographics_from_ror(ror)
            
            # Merge demographics (prioritize non-null values)
            for key, value in demographics.items():
                if value and not consolidated_demographics.get(key):
                    consolidated_demographics[key] = value
            
            # Collect all ULPINs
            if ror.ulpin:
                ulpins.append(ror.ulpin)
        
        # Step 3: Generate or find farmer ID
        farmer_id = None
        farmer_record = None
        
        # Priority 1: Check if Aadhaar consent exists
        if aadhaar_hash:
            consent = db.query(AadhaarConsent).filter_by(
                aadhaar_hash=aadhaar_hash
            ).first()
            
            if consent and consent.farmer_id:
                farmer_record = db.query(Person).filter_by(id=consent.farmer_id).first()
                if farmer_record:
                    farmer_id = str(farmer_record.id)
        
        # Priority 2: Search by normalized name
        if not farmer_id and consolidated_demographics.get("owner_name"):
            normalized_name = self.normalize_name(consolidated_demographics["owner_name"])
            
            # Search existing farmers with similar names
            existing_farmers = db.query(Person).filter(
                func.lower(Person.name).contains(normalized_name[:10])
            ).all()
            
            if existing_farmers:
                # Use first match (in production, use fuzzy matching)
                farmer_record = existing_farmers[0]
                farmer_id = str(farmer_record.id)
        
        # Priority 3: Create new farmer record
        if not farmer_id and auto_create_farmer:
            district_code = rors[0].district[:2] if rors[0].district else "01"
            
            # Generate farmer ID
            if aadhaar_hash:
                generated_id = self.generate_farmer_id_from_aadhaar(
                    aadhaar_hash, district_code
                )
            else:
                generated_id = self.generate_farmer_id_from_demographics(
                    consolidated_demographics.get("owner_name", "Unknown"),
                    consolidated_demographics.get("father_name"),
                    district_code
                )
            
            # Create Person record
            farmer_record = Person(
                id=uuid.uuid4(),
                name=consolidated_demographics.get("owner_name", "Unknown"),
                father_or_guardian_name=consolidated_demographics.get(
                    "father_name") or consolidated_demographics.get("guardian_name"
                ),
                address=consolidated_demographics.get("address"),
                district=rors[0].district,
                created_at=datetime.utcnow()
            )
            
            db.add(farmer_record)
            db.flush()
            
            farmer_id = str(farmer_record.id)
        
        # Step 4: Create ULPIN-Farmer-RoR linkages
        for ror in rors:
            if ror.ulpin and farmer_record:
                # Check if linkage already exists
                existing_link = db.query(ULPINFarmerRoRLink).filter_by(
                    ulpin=ror.ulpin,
                    farmer_id=farmer_record.id,
                    ror_id=ror.id
                ).first()
                
                if not existing_link:
                    linkage = ULPINFarmerRoRLink(
                        ulpin=ror.ulpin,
                        farmer_id=farmer_record.id,
                        ror_id=ror.id,
                        ownership_type="Owner",  # Default, can be updated
                        validated=False,  # Requires validation
                        created_at=datetime.utcnow()
                    )
                    db.add(linkage)
        
        db.commit()
        
        return farmer_id, ulpins
    
    def get_farmer_consolidated_holdings(
        self,
        db: Session,
        farmer_id: str
    ) -> Dict:
        """
        Get all consolidated landholdings for a farmer
        Returns farmer details + all associated ULPINs with RoR info
        """
        farmer = db.query(Person).filter_by(id=uuid.UUID(farmer_id)).first()
        if not farmer:
            raise ValueError("Farmer not found")
        
        # Get all linkages
        linkages = db.query(ULPINFarmerRoRLink).filter_by(
            farmer_id=farmer.id,
            active=True
        ).all()
        
        # Consolidate holdings
        total_area = 0.0
        holdings = []
        
        for link in linkages:
            ror = link.ror
            holding_info = {
                "ulpin": link.ulpin,
                "ror_number": ror.ror_number if ror else None,
                "khewat": ror.khewat_number if ror else None,
                "khatoni": ror.khatoni_number if ror else None,
                "khasra_numbers": ror.khasra_numbers if ror else [],
                "area": ror.total_area if ror else 0.0,
                "revenue_village": ror.revenue_village if ror else None,
                "tehsil": ror.tehsil if ror else None,
                "ownership_type": link.ownership_type,
                "validated": link.validated
            }
            holdings.append(holding_info)
            
            if ror and ror.total_area:
                total_area += ror.total_area
        
        # Get Aadhaar consent status
        consent = db.query(AadhaarConsent).filter_by(
            farmer_id=farmer.id
        ).first()
        
        # Check for Active Mutations (Benefit Provisioning Check)
        # Unified Land API Flag: Indicates if mutation is in progress
        from app.models.ownership_transfer import OwnershipTransfer
        
        active_mutations = db.query(OwnershipTransfer).filter(
            or_(
                OwnershipTransfer.from_farmer_id == farmer.id,
                OwnershipTransfer.to_farmer_id == farmer.id
            ),
            OwnershipTransfer.status.notin_(["COMPLETED", "REJECTED"])
        ).count()
        
        mutation_pending = active_mutations > 0

        return {
            "farmer_id": str(farmer.id),
            "name": farmer.name,
            "father_name": farmer.father_or_guardian_name,
            "address": farmer.address,
            "district": farmer.district,
            "aadhaar_verified": consent.aadhaar_verified if consent else False,
            "aadhaar_masked": f"XXXX XXXX {consent.aadhaar_last_4}" if consent else None,
            "total_holdings": len(holdings),
            "total_area": round(total_area, 2),
            "holdings": holdings,
            "mutation_pending": mutation_pending, # Unified API Flag
            "active_mutations_count": active_mutations
        }
