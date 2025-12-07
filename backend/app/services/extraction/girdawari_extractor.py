from typing import Dict, Any, Optional
from app.services.extraction.base_extractor import BaseFieldExtractor
import re

class GirdawariExtractor(BaseFieldExtractor):
    """Extract fields from Girdawari (crop inspection) documents"""
    
    def extract(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract structured fields from Girdawari document
        
        Expected fields:
        - khasra_number: Plot number
        - village: Village name
        - owner_name: Owner name (Urdu/English)
        - father_name: Father's name
        - cultivator_name: Cultivator name (if different from owner)
        - area: Cultivated area
        - area_unit: Unit (kanal, marla, etc.)
        - crop: Crop name
        - crop_code: Standardized crop code
        - season: Kharif/Rabi
        - irrigation: Irrigation type
        - date: Inspection date
        """
        text_blocks = self._extract_text_blocks(ocr_result.get("ocr", {}))
        full_text = " ".join(text_blocks)
        
        fields = {
            "khasra_number": self._extract_khasra_number(full_text),
            "village": self._extract_village(full_text),
            "owner_name": self._extract_owner_name(full_text),
            "father_name": self._extract_father_name(full_text),
            "cultivator_name": self._extract_cultivator_name(full_text),
            "area": self._extract_area(full_text),
            "area_unit": self._extract_area_unit(full_text),
            "crop": self._extract_crop(full_text),
            "crop_code": None,  # Will be mapped later
            "season": self._extract_season(full_text),
            "irrigation": self._extract_irrigation(full_text),
            "date": self._extract_date(full_text),
        }
        
        ocr_confidence = ocr_result.get("confidence", 0.8)
        
        return {
            "fields": fields,
            "confidence": self._calculate_confidence(fields, ocr_confidence),
            "source": "girdawari_extractor"
        }
    
    def _extract_khasra_number(self, text: str) -> Optional[str]:
        """Extract khasra number"""
        # Common patterns: "خسرہ نمبر: 123" or "Khasra No: 123" or just numbers
        patterns = [
            r'(?:خسرہ|khasra|plot)[\s:]+(\d+(?:/\d+)?)',
            r'(?:نمبر|no|number)[\s:]+(\d+(?:/\d+)?)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_village(self, text: str) -> Optional[str]:
        """Extract village name"""
        # Pattern: "گاؤں: نام" or "Village: Name"
        patterns = [
            r'(?:گاؤں|village)[\s:]+([^\d\n]+?)(?:\s|$)',
            r'(?:مؤضع|mouza)[\s:]+([^\d\n]+?)(?:\s|$)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_owner_name(self, text: str) -> Optional[str]:
        """Extract owner name"""
        # Pattern: "مالک: نام" or "Owner: Name"
        patterns = [
            r'(?:مالک|owner|malik)[\s:]+([^\d\n]+?)(?:ولد|s/o|w/o|d/o|\n|$)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_father_name(self, text: str) -> Optional[str]:
        """Extract father's name"""
        # Pattern: "ولد: نام" or "S/O: Name"
        patterns = [
            r'(?:ولد|والد|s/o|son of)[\s:]+([^\d\n]+?)(?:\n|$|،|,)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_cultivator_name(self, text: str) -> Optional[str]:
        """Extract cultivator name (if different from owner)"""
        # Pattern: "کاشتکار: نام" or "Cultivator: Name"
        patterns = [
            r'(?:کاشتکار|cultivator|kashtkaar)[\s:]+([^\d\n]+?)(?:ولد|s/o|\n|$)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_area(self, text: str) -> Optional[float]:
        """Extract area value"""
        # Pattern: numbers followed by unit
        patterns = [
            r'(?:رقبہ|area|رقبه)[\s:]+(\d+\.?\d*)',
            r'(\d+\.?\d*)\s*(?:کنال|marla|kanal)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                return self._extract_number(match.group(1))
        return None
    
    def _extract_area_unit(self, text: str) -> Optional[str]:
        """Extract area unit"""
        # Look for common units
        if re.search(r'کنال|kanal', text, re.IGNORECASE | re.UNICODE):
            return "kanal"
        elif re.search(r'marla|مرلہ', text, re.IGNORECASE | re.UNICODE):
            return "marla"
        elif re.search(r'acre|ایکڑ', text, re.IGNORECASE | re.UNICODE):
            return "acre"
        return None
    
    def _extract_crop(self, text: str) -> Optional[str]:
        """Extract crop name"""
        # Pattern: "فصل: نام" or "Crop: Name"
        patterns = [
            r'(?:فصل|crop|fasal)[\s:]+([^\d\n]+?)(?:\n|$|،|,)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_season(self, text: str) -> Optional[str]:
        """Extract season (Kharif/Rabi)"""
        if re.search(r'خریف|kharif', text, re.IGNORECASE | re.UNICODE):
            return "kharif"
        elif re.search(r'ربیع|rabi', text, re.IGNORECASE | re.UNICODE):
            return "rabi"
        return None
    
    def _extract_irrigation(self, text: str) -> Optional[str]:
        """Extract irrigation type"""
        if re.search(r'نہری|canal|nehari', text, re.IGNORECASE | re.UNICODE):
            return "canal"
        elif re.search(r'بارانی|barani|rainfed', text, re.IGNORECASE | re.UNICODE):
            return "rainfed"
        elif re.search(r'ٹیوب|tube|well', text, re.IGNORECASE | re.UNICODE):
            return "tubewell"
        return None
    
    def _extract_date(self, text: str) -> Optional[str]:
        """Extract date"""
        # Pattern: DD/MM/YYYY or similar
        patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(?:تاریخ|date)[\s:]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
