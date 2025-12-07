from typing import Dict, Any, Optional
from app.services.extraction.base_extractor import BaseFieldExtractor
import re

class KhasraExtractor(BaseFieldExtractor):
    """Extract fields from Khasra Girdawari (land record) documents"""
    
    def extract(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract structured fields from Khasra document
        
        Expected fields:
        - khasra_number: Plot number
        - village: Village name
        - halqa: Halqa (circle) identifier
        - owner_names: List of owner names
        - total_area: Total plot area
        - area_unit: Unit
        - khata_number: Account number
        - hadbast_number: Revenue survey number
        """
        text_blocks = self._extract_text_blocks(ocr_result.get("ocr", {}))
        full_text = " ".join(text_blocks)
        
        fields = {
            "khasra_number": self._extract_khasra_number(full_text),
            "village": self._extract_village(full_text),
            "halqa": self._extract_halqa(full_text),
            "owner_names": self._extract_owner_names(full_text),
            "total_area": self._extract_area(full_text),
            "area_unit": self._extract_area_unit(full_text),
            "khata_number": self._extract_khata_number(full_text),
            "hadbast_number": self._extract_hadbast_number(full_text),
        }
        
        ocr_confidence = ocr_result.get("confidence", 0.8)
        
        return {
            "fields": fields,
            "confidence": self._calculate_confidence(fields, ocr_confidence),
            "source": "khasra_extractor"
        }
    
    def _extract_khasra_number(self, text: str) -> Optional[str]:
        """Extract khasra number"""
        patterns = [
            r'(?:خسرہ|khasra|plot)[\s:]+(\d+(?:[/-]\d+)*)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_village(self, text: str) -> Optional[str]:
        """Extract village name"""
        patterns = [
            r'(?:گاؤں|village|mouza|مؤضع)[\s:]+([^\d\n]+?)(?:\s|$|،)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_halqa(self, text: str) -> Optional[str]:
        """Extract halqa identifier"""
        patterns = [
            r'(?:حلقہ|halqa|circle)[\s:]+([^\d\n]+?)(?:\s|$|،)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_owner_names(self, text: str) -> list:
        """Extract owner names (multiple possible)"""
        # Look for ownership section
        patterns = [
            r'(?:مالک|مالکان|owners?|malik)[\s:]+([^۰-۹0-9]+?)(?:رقبہ|area|$)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                names_text = match.group(1)
                # Split by common separators
                names = re.split(r'،|,|\n|و|and', names_text)
                return [name.strip() for name in names if name.strip()]
        return []
    
    def _extract_area(self, text: str) -> Optional[float]:
        """Extract total area"""
        patterns = [
            r'(?:کل رقبہ|total area|رقبہ)[\s:]+(\d+\.?\d*)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
            if match:
                return self._extract_number(match.group(1))
        return None
    
    def _extract_area_unit(self, text: str) -> Optional[str]:
        """Extract area unit"""
        if re.search(r'کنال|kanal', text, re.IGNORECASE | re.UNICODE):
            return "kanal"
        elif re.search(r'marla|مرلہ', text, re.IGNORECASE | re.UNICODE):
            return "marla"
        elif re.search(r'acre|ایکڑ', text, re.IGNORECASE | re.UNICODE):
            return "acre"
        return None
    
    def _extract_khata_number(self, text: str) -> Optional[str]:
        """Extract khata (account) number"""
        patterns = [
            r'(?:کھاتہ|khata|account)[\s:]+(\d+)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
    
    def _extract_hadbast_number(self, text: str) -> Optional[str]:
        """Extract hadbast (revenue survey) number"""
        patterns = [
            r'(?:حدباست|hadbast|settlement)[\s:]+(\d+)',
        ]
        for pattern in patterns:
            result = self._extract_with_pattern(text, pattern)
            if result:
                return result
        return None
