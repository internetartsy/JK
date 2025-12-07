from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.person import Person
from app.models.land_parcel import LandParcel
from app.models.tenure import Tenure
from app.services.entity_resolution.person_deduplicator import PersonDeduplicator
from app.services.entity_resolution.farmer_id_generator import FarmerIDGenerator

class RegistryBuilder:
    """Build farmer and land parcel registry from processed data"""
    
    def __init__(self, db: Session):
        self.db = db
        self.deduplicator = PersonDeduplicator()
        self.id_generator = FarmerIDGenerator()
    
    def build_person_registry(
        self,
        extracted_persons: List[Dict[str, Any]],
        deduplicate: bool = True
    ) -> List[Person]:
        """
        Build person registry from extracted data
        
        Args:
            extracted_persons: List of person records from OCR
            deduplicate: Whether to deduplicate persons
        
        Returns:
            List of Person model instances
        """
        persons = []
        
        if deduplicate:
            # Find duplicates
            duplicate_groups = self.deduplicator.find_duplicates(extracted_persons)
            
            # Track which records have been merged
            merged_indices = set()
            for group in duplicate_groups:
                merged_indices.update(group)
            
            # Merge duplicate groups
            for group in duplicate_groups:
                group_records = [extracted_persons[i] for i in group]
                merged = self.deduplicator.merge_persons(group_records)
                persons.append(self._create_person(merged))
            
            # Add non-duplicate records
            for i, record in enumerate(extracted_persons):
                if i not in merged_indices:
                    persons.append(self._create_person(record))
        else:
            # No deduplication
            for record in extracted_persons:
                persons.append(self._create_person(record))
        
        return persons
    
    def _create_person(self, record: Dict[str, Any]) -> Person:
        """Create Person model instance from record"""
        # Generate Farmer ID if consented
        farmer_id = None
        consent = record.get('consent', True)
        
        if consent:
            farmer_id = self.id_generator.generate_farmer_id(
                name=record.get('name') or record.get('owner_name'),
                father_name=record.get('father_name'),
                village=record.get('village'),
                consent=True
            )
        
        person = Person(
            id=farmer_id,
            name_urdu=record.get('name') or record.get('owner_name'),
            name_english=record.get('name_english') or record.get('owner_name_english'),
            confidence=record.get('confidence', 0.8),
            consent_flags={'consented': consent}
        )
        
        return person
    
    def link_parcels_to_owners(
        self,
        parcels: List[LandParcel],
        persons: List[Person],
        tenure_data: List[Dict[str, Any]]
    ) -> List[Tenure]:
        """
        Create tenure records linking parcels to owners
        
        Args:
            parcels: List of LandParcel instances
            persons: List of Person instances
            tenure_data: List of tenure relationships
        
        Returns:
            List of Tenure instances
        """
        tenures = []
        
        for tenure_info in tenure_data:
            tenure = Tenure(
                parcel_id=tenure_info['parcel_id'],
                person_id=tenure_info['person_id'],
                rights_type=tenure_info.get('rights_type', 'ownership'),
                share=tenure_info.get('share', '1')
            )
            tenures.append(tenure)
        
        return tenures
    
    def save_to_database(
        self,
        persons: List[Person],
        commit: bool = True
    ) -> None:
        """Save person records to database"""
        for person in persons:
            # Check if person already exists
            existing = self.db.query(Person).filter(Person.id == person.id).first()
            if not existing:
                self.db.add(person)
        
        if commit:
            self.db.commit()
