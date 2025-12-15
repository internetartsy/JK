from typing import Dict, Any, Optional
from app.services.extraction.base_extractor import BaseFieldExtractor
import re

from app.services.translation.translation_service import translation_service

class GirdawariExtractor(BaseFieldExtractor):
    """Extract fields from Girdawari (crop inspection) documents"""
    
    def extract(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract fields from OCR data"""
        # 1. Try Table Extraction (Preferred for Jamabandi/Girdawari)
        if ocr_result.get("tables") and len(ocr_result["tables"]) > 0:
            try:
                table_fields = self._extract_from_table(ocr_result["tables"][0])
                if table_fields:
                    # Apply row expansion if multiple Ks or similar logic needed
                    # Currently _expand_rows takes a list of field dicts
                    expanded_rows = self._expand_rows([table_fields])
                    
                    return {
                        "fields": table_fields,
                        "data_rows": expanded_rows, # List of dicts for multi-row logic
                        "confidence": ocr_result.get("confidence", 0.9),
                        "source": "girdawari_table_extractor"
                    }
            except Exception as e:
                # Log and fallback
                print(f"Table extraction failed: {e}")

        # 2. Fallback to Text Pattern Matching
        text_blocks = self._extract_text_blocks(ocr_result.get("ocr", {}))
        full_text = " ".join(text_blocks)
        
        # Translate main fields for fallback text extraction
        owner_urdu = self._extract_owner_name(full_text)
        cultivator_urdu = self._extract_cultivator_name(full_text)
        
        fields = {
            "khasra_number": self._extract_khasra_number(full_text),
            "village": self._extract_village(full_text),
            "owner_name": translation_service.translate_name(owner_urdu) if owner_urdu else None,
            "owner_name_urdu": owner_urdu,
            "father_name": self._extract_father_name(full_text), # Add translation if needed
            "cultivator_name": translation_service.translate_name(cultivator_urdu) if cultivator_urdu else None,
            "cultivator_name_urdu": cultivator_urdu,
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
                 fields["owner_name_urdu"] = text
                 fields["owner_name"] = translation_service.translate_name(text)
            elif idx == 5: # Cultivator (Kashtakar)
                 # "Split column 5 based on urdu words"
                 # Pattern: Name (pisar/sfo) Parent (kaum) Caste (sakin) Residence
                 parts = self._parse_person_details(text)
                 
                 # Translate the parsed parts
                 fields["cultivator_name"] = translation_service.translate_name(parts.get("name"))
                 fields["cultivator_father"] = translation_service.translate_name(parts.get("father"))
                 
                 fields["cultivator_name_urdu"] = parts.get("name")
                 fields["caste"] = translation_service.map_land_term(parts.get("caste", ""))
                 fields["residence"] = translation_service.translate_text(parts.get("residence", ""))
        
        return fields

    def _expand_rows(self, fields_list: list) -> list:
        """
        Rule 3: Split rows based on Khasra number.
        If a field dict has multiple Khasra numbers (e.g. "156, 157"), 
        create separate entries for each.
        """
        expanded = []
        for field in fields_list:
            khasra_raw = field.get("khasra_number", "")
            if not khasra_raw:
                expanded.append(field)
                continue
                
            # Split by comma or newline
            k_parts = [k.strip() for k in re.split(r'[,\n]+', str(khasra_raw)) if k.strip()]
            
            if len(k_parts) > 1:
                # Duplicate for each khasra
                for k_num in k_parts:
                    new_field = field.copy()
                    new_field["khasra_number"] = k_num
                    # You might optionally append a sub-id or index
                    expanded.append(new_field)
            else:
                expanded.append(field)
        return expanded

    def _parse_person_details(self, text: str) -> Dict[str, str]:
        """
        Parse Column 5 (Owner/Cultivator) with complex relations.
        Format: "Name [Relation] Parent [Kaum] Caste [Sakin] Residence [Remarks]"
        
        Matches User Rule: "kasht sahid v singh pisar attar singh kaum sukh sakindeh gair morosi"
        -> Name: sahid v singh, Relation: pisar, Parent: attar singh, Caste: sukh, Residence: ..., Remarks: gair morosi
        """
        details = {
            "name": "", "relation": "", "parent": "", "caste": "", 
            "residence": "", "remarks": ""
        }
        
        # normalized lower for pattern matching
        t_lower = text.lower()
        
        # 4. Remarks/Legal Status (Trailing)
        # Look for keywords like "gair morosi", "hissadar", "bila lagan"
        remarks_keywords = ["gair morosi", "legal non heirs", "hissadar", "bila lagan"]
        for kw in remarks_keywords:
            if kw in t_lower:
                # remove from text to avoid confusion? or just extract
                details["remarks"] = kw # simplified
                # text = text.replace(kw, "") # optional: strip valid terms?

        # 3. Residence (Sakindeh / Sakin / Alati)
        # Regex to find 'sakin' ... until end or next keyword
        res_match = re.search(r'(?:sakin|sakindeh|alati|ساکن)([\s\S]+?)(?:$)', text, re.IGNORECASE)
        if res_match:
            details["residence"] = res_match.group(1).strip()
            # truncate text at start of residence to limit scope for previous fields
            text = text[:res_match.start()]
            
        # 2. Caste (Kaum / Caste)
        caste_match = re.search(r'(?:kaum|caste|قوم)([\s\S]+?)(?:$)', text, re.IGNORECASE)
        if caste_match:
            details["caste"] = caste_match.group(1).strip()
            text = text[:caste_match.start()]
            
        # 1. Parent/Relation (Pisar/Dukhtar/W/o/S/o)
        # Regex for Relation + Parent Name
        # matches: "pisar <parent>" or "s/o <parent>"
        rel_pattern = r'(?:pisar|walad|dukhtar|zoja|w/o|s/o|d/o|sons of|son of|daughter of|wife of|پسر|ولد)([\s\S]+?)(?:$)'
        rel_match = re.search(rel_pattern, text, re.IGNORECASE)
        
        if rel_match:
            details["parent"] = rel_match.group(1).strip()
            # The part BEFORE the relation is the Name
            details["name"] = text[:rel_match.start()].strip()
            
            # Extract the relation keyword itself if needed?
            # details["relation"] = text[rel_match.start():rel_match.end()] 
        else:
            # Fallback: whole text is name
            details["name"] = text.strip()
            
        # Clean up leading/trailing headers like "Kasht" or "Malik" if they exist in name
        clean_name = re.sub(r'^(?:kasht|kashtkar|malik|owner|cultivator)\s+', '', details["name"], flags=re.IGNORECASE)
        details["name"] = clean_name.strip()
            
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
