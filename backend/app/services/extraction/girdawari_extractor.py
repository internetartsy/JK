from typing import Dict, Any, Optional
from app.services.extraction.base_extractor import BaseFieldExtractor
import re

class GirdawariExtractor(BaseFieldExtractor):
    """Extract fields from Girdawari (crop inspection) documents"""
    
    def extract(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract fields from OCR data"""
        # 1. Try Table Extraction (Preferred for Jamabandi/Girdawari)
        if ocr_result.get("tables") and len(ocr_result["tables"]) > 0:
            try:
                table_fields = self._extract_from_table(ocr_result["tables"][0])
                if table_fields:
                    return {
                        "fields": table_fields,
                        "confidence": ocr_result.get("confidence", 0.9),
                        "source": "girdawari_table_extractor"
                    }
            except Exception as e:
                # Log and fallback
                print(f"Table extraction failed: {e}")

        # 2. Fallback to Text Pattern Matching
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
            "source": "girdawari_text_extractor"
        }

    def _extract_from_table(self, table: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract fields from structural table data
        Assumes standard 12-column Jamabandi format
        """
        # Simple heuristic: Look for the row with data (skip header)
        # We take the first data row for now (Multi-row support logic needed for scale)
        if not table.get("cells"):
            return None
            
        cells = table["cells"]
        # Find row indices
        rows = sorted(list(set(c["row_index"] for c in cells)))
        if len(rows) < 2: return None # Header only?
        
        # Take 2nd row (index 1) assuming row 0 is header
        data_row_index = rows[1] 
        row_cells = [c for c in cells if c["row_index"] == data_row_index]
        row_cells.sort(key=lambda x: x["col_index"])
        
        # Map columns (0-based)
        # Col 0: Khevat, Col 4: Owner, Col 5: Cultivator, Col 7: Khasra, Col 8: Area
        fields = {}
        
        for cell in row_cells:
            text = cell["text"].strip()
            idx = cell["col_index"]
            
            if idx == 7: # Khasra
                 fields["khasra_number"] = self._extract_number(text)
            elif idx == 8: # Area
                 fields["area_text"] = text
                 fields["area"] = self._extract_number(text)
            elif idx == 4: # Owner (Malik)
                 fields["owner_name"] = text
                 # Parse Parentage logic here if needed
            elif idx == 5: # Cultivator (Kashtakar)
                 # "Split column 5 based on urdu words"
                 # Pattern: Name (pisar/sfo) Parent (kaum) Caste (sakin) Residence
                 parts = self._parse_person_details(text)
                 fields["cultivator_name"] = parts.get("name")
                 fields["cultivator_father"] = parts.get("father")
                 fields["caste"] = parts.get("caste")
                 fields["residence"] = parts.get("residence")
        
        return fields

    def _parse_person_details(self, text: str) -> Dict[str, str]:
        """
        Parse: "Names... Pisar/Wo ... Parent ... Kaum ... Caste ... Sakin ... Village"
        """
        details = {}
        # Simple splitting logic based on keywords
        # 1. Split by 'Sakin' (Resident)
        if 'sakin' in text.lower() or 'سکن' in text:
            parts = re.split(r'sakin|سکن', text, flags=re.IGNORECASE)
            details["residence"] = parts[1].strip() if len(parts) > 1 else ""
            remaining = parts[0]
        else:
            remaining = text
            
        # 2. Split by 'Kaum' (Caste)
        if 'kaum' in text.lower() or 'قوم' in text:
            parts = re.split(r'kaum|قوم', text, flags=re.IGNORECASE)
            details["caste"] = parts[1].strip() if len(parts) > 1 else ""
            remaining = parts[0]
            
        # 3. Split by Pisar/Walad (Father)
        if 'pisar' in text.lower() or 'walad' in text.lower() or 'ولد' in text:
            parts = re.split(r'pisar|walad|ولد', remaining, flags=re.IGNORECASE)
            details["father"] = parts[1].strip() if len(parts) > 1 else ""
            details["name"] = parts[0].strip()
        else:
            details["name"] = remaining.strip()
            
        return details
    
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
