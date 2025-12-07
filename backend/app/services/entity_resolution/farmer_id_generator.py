import uuid
import hashlib
from typing import Optional, Dict, Any

class FarmerIDGenerator:
    """Generate deterministic Farmer IDs using UUID v5"""
    
    # Namespace for Farmer IDs (UUID v5 requires a namespace)
    NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # Standard DNS namespace
    
    def __init__(self, namespace: Optional[uuid.UUID] = None):
        """
        Initialize ID generator
        
        Args:
            namespace: UUID namespace (default: DNS namespace)
        """
        self.namespace = namespace or self.NAMESPACE
    
    def generate_farmer_id(
        self,
        name: str,
        father_name: Optional[str] = None,
        village: Optional[str] = None,
        consent: bool = True
    ) -> Optional[str]:
        """
        Generate deterministic Farmer ID from consented identity attributes
        
        Args:
            name: Farmer name
            father_name: Father's name
            village: Village name
            consent: Whether farmer has consented to ID generation
        
        Returns:
            UUID v5 string or None if consent not given
        """
        if not consent:
            return None
        
        if not name:
            return None
        
        # Normalize inputs
        name = self._normalize(name)
        father_name = self._normalize(father_name) if father_name else ""
        village = self._normalize(village) if village else ""
        
        # Create deterministic string from attributes
        identity_string = f"{name}|{father_name}|{village}"
        
        # Generate UUID v5
        farmer_id = uuid.uuid5(self.namespace, identity_string)
        
        return str(farmer_id)
    
    def generate_salted_hash(
        self,
        farmer_id: str,
        salt: Optional[str] = None
    ) -> str:
        """
        Generate salted hash of Farmer ID for storage
        
        This provides additional privacy protection by not storing raw IDs.
        
        Args:
            farmer_id: UUID string
            salt: Optional salt (default: use system salt)
        
        Returns:
            Hex-encoded hash
        """
        if not salt:
            salt = "land_records_system_salt_2024"  # Should be configurable
        
        salted = f"{farmer_id}{salt}"
        hash_obj = hashlib.sha256(salted.encode('utf-8'))
        return hash_obj.hexdigest()
    
    def _normalize(self, text: str) -> str:
        """Normalize text for ID generation"""
        if not text:
            return ""
        
        # Convert to lowercase and strip whitespace
        text = text.lower().strip()
        
        # Remove diacritics and extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def validate_farmer_id(self, farmer_id: str) -> bool:
        """Validate Farmer ID format"""
        try:
            uuid.UUID(farmer_id)
            return True
        except ValueError:
            return False
    
    def generate_batch(
        self,
        persons: list,
        name_field: str = 'name',
        father_field: str = 'father_name',
        village_field: str = 'village',
        consent_field: str = 'consent'
    ) -> Dict[int, str]:
        """
        Generate Farmer IDs for a batch of persons
        
        Returns:
            Dictionary mapping person index to Farmer ID
        """
        farmer_ids = {}
        
        for i, person in enumerate(persons):
            farmer_id = self.generate_farmer_id(
                name=person.get(name_field),
                father_name=person.get(father_field),
                village=person.get(village_field),
                consent=person.get(consent_field, True)
            )
            
            if farmer_id:
                farmer_ids[i] = farmer_id
        
        return farmer_ids
