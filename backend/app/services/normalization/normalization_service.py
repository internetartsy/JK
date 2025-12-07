from typing import Dict, Any, Optional
from app.services.normalization.transliterator import UrduTransliterator
from app.services.normalization.unit_converter import UnitConverter
from app.services.normalization.crop_taxonomy import CropTaxonomy

class NormalizationService:
    """Service to normalize and standardize extracted fields"""
    
    def __init__(self):
        self.transliterator = UrduTransliterator()
        self.unit_converter = UnitConverter()
        self.crop_taxonomy = CropTaxonomy()
    
    def normalize_fields(self, extracted_fields: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize all fields in the extracted data
        
        Args:
            extracted_fields: Raw extracted fields from OCR
        
        Returns:
            Normalized fields with standardized values
        """
        normalized = extracted_fields.copy()
        
        # Normalize names - transliterate Urdu to English
        if 'owner_name' in normalized and normalized['owner_name']:
            normalized['owner_name_english'] = self.transliterator.transliterate(normalized['owner_name'])
        
        if 'father_name' in normalized and normalized['father_name']:
            normalized['father_name_english'] = self.transliterator.transliterate(normalized['father_name'])
        
        if 'cultivator_name' in normalized and normalized['cultivator_name']:
            normalized['cultivator_name_english'] = self.transliterator.transliterate(normalized['cultivator_name'])
        
        if 'owner_names' in normalized and normalized['owner_names']:
            normalized['owner_names_english'] = [
                self.transliterator.transliterate(name) for name in normalized['owner_names']
            ]
        
        # Normalize area - convert to square meters
        if 'area' in normalized and 'area_unit' in normalized:
            if normalized['area'] and normalized['area_unit']:
                area_sqm = self.unit_converter.convert_to_sqm(
                    normalized['area'],
                    normalized['area_unit']
                )
                normalized['area_sqm'] = area_sqm
        
        if 'total_area' in normalized and 'area_unit' in normalized:
            if normalized['total_area'] and normalized['area_unit']:
                area_sqm = self.unit_converter.convert_to_sqm(
                    normalized['total_area'],
                    normalized['area_unit']
                )
                normalized['total_area_sqm'] = area_sqm
        
        # Normalize crop - map to standard taxonomy
        if 'crop' in normalized and normalized['crop']:
            crop_info = self.crop_taxonomy.get_crop_info(normalized['crop'])
            if crop_info:
                normalized['crop_standard'] = crop_info['standard_name']
                normalized['crop_code'] = crop_info['code']
                normalized['crop_category'] = crop_info['category']
        
        # Normalize village name
        if 'village' in normalized and normalized['village']:
            normalized['village_english'] = self.transliterator.transliterate(normalized['village'])
        
        return normalized
    
    def normalize_name(self, urdu_name: Optional[str]) -> Optional[str]:
        """Normalize a single name"""
        if not urdu_name:
            return None
        return self.transliterator.transliterate(urdu_name)
    
    def normalize_area(self, value: float, unit: str) -> Optional[float]:
        """Normalize area to square meters"""
        return self.unit_converter.convert_to_sqm(value, unit)
    
    def normalize_crop(self, crop_name: Optional[str]) -> Optional[Dict]:
        """Normalize crop name"""
        return self.crop_taxonomy.get_crop_info(crop_name)
