import re

class RoRParser:
    """
    Standard Parser for J&K Land Records (Jamabandi/Girdawari)
    Handles column-specific logic, Urdu term mapping, and row splitting.
    """

    # Urdu Term Mappings for Relationship/Status
    TERMS = {
        "RELATIONSHIPS": {
            "Pisaran": "Sons of",
            "Pisar": "Son of",
            "Dukhtaran": "Daughters of",
            "Dukhtar": "Daughter of",
            "Hamshira": "Sister of",
            "Zoja": "Wife of",
            "Bewah": "Widow of",
            "Walad": "Son of"
        },
        "CULTIVATION_STATUS": {
            "Kasht": "Self-Cultivated",
            "Maqboza": "Possessed by",
            "Hissadar": "Shareholder",
            "Muzaka": "Tenant",
            "Gair Marusi": "Non-occupancy Tenant"
        },
        "IDENTIFIERS": {
            "Kaum": "Caste/Tribe",
            "Sakin": "Resident of",
            "Patti": "Sub-division"
        }
    }

    @staticmethod
    def parse_column_5(text):
        """
        Parses Column 5 (Owner/Cultivator Details) into structured fields.
        Input: Unstructured Urdu/Transliterated text
        Output: Dict {Name, Parentage, Caste, Residence, Remarks, Share}
        """
        if not text:
            return {}

        # Normalize spaces
        text = " ".join(text.split())

        result = {
            "raw_text": text,
            "name": None,
            "parentage": None,
            "relationship": None,
            "caste": None,
            "residence": None,
            "remarks": None
        }

        # 1. Extract Residence (Sakina/Sakin)
        # Matches "Sakin <Place>" or "Sakina <Place>" stopping before "Kaum" or EOL
        res_match = re.search(r'\b(Sakin|Sakina)\s+([\w\s]+?)(?=\s+Kaum|$)', text, re.IGNORECASE)
        if res_match:
            result['residence'] = res_match.group(2).strip()
            # Remove residence part for further processing
            text = text.replace(res_match.group(0), "")

        # 2. Extract Caste (Kaum)
        caste_match = re.search(r'\bKaum\s+([\w\s]+?)(?=\s+(Sakin|Sakina)|$)', text, re.IGNORECASE)
        if caste_match:
            result['caste'] = caste_match.group(1).strip()
            text = text.replace(caste_match.group(0), "")
        
        # 3. Extract Parentage (Walad/Pisaran/etc)
        for urdu_term, english_rel in RoRParser.TERMS["RELATIONSHIPS"].items():
            # Regex to find "Name TERM Parent"
            pattern = re.compile(rf'([\w\s]+?)\s+\b{urdu_term}\b\s+([\w\s]+)', re.IGNORECASE)
            match = pattern.search(text)
            if match:
                result['name'] = match.group(1).strip()
                result['relationship'] = english_rel
                result['parentage'] = match.group(2).strip()
                break # Stop at first specific match

        # If simple "S/O" or "W/O" is used (transliterated already)
        if not result['name']:
             # Attempt English pattern
             eng_match = re.search(r'([\w\s]+?)\s+(S/O|W/O|D/O)\s+([\w\s]+)', text, re.IGNORECASE)
             if eng_match:
                 result['name'] = eng_match.group(1).strip()
                 result['relationship'] = eng_match.group(2).upper()
                 result['parentage'] = eng_match.group(3).strip()
        
        # Fallback: Whole text is name if structure unclear
        if not result['name']:
            result['name'] = text.strip()

        return result

    @staticmethod
    def explode_khasra_rows(ror_data_row):
        """
        Crucial Normalization: Splits a grouped row into multiple rows based on Khasra (Col 7).
        Input: Dict representing a single line from OCR/Table with potentially grouped columns.
               Expected keys: col_2 (Khata), col_5 (Owner), col_7 (Khasra No), col_8 (Area)
        Output: List of Dicts (one per Khasra)
        """
        khasra_col = ror_data_row.get('col_7') or ror_data_row.get('khasra_number')
        area_col = ror_data_row.get('col_8') or ror_data_row.get('area')
        
        if not khasra_col:
            return [ror_data_row]

        # Split Khasra numbers
        # Handles: "123, 124, 125" or "123-125" (ranges need special logic, simplest split for now)
        khasra_list = [k.strip() for k in re.split(r'[,\n]+', str(khasra_col)) if k.strip()]
        
        # If Area is also list (matching count), map 1-to-1. Else replicate ownership.
        # Often Area is total or per line.
        # Refinement: Usually if multiple Khasras are listed, standard Jamabandi lists respective areas next to them
        # or a total area. We assume for now we duplicate the 'Owner' info for each Khasra/Plot.
        
        exploded_rows = []
        for khasra in khasra_list:
            new_row = ror_data_row.copy()
            new_row['khasra_number'] = khasra
            # Set explicit single khasra for this row
            new_row['col_7'] = khasra 
            
            # NOTE: Area logic would need specific rules (divide total? or is it per plot?)
            # Assuming grouped metadata applies to ALL plots listed
            exploded_rows.append(new_row)
            
        return exploded_rows

    @staticmethod
    def process_jamabandi_batch(rows):
        """
        Process a batch of raw table rows (e.g. from OCR).
        1. Fill down Khata numbers (if merged cells/missing).
        2. Explode Khasra numbers.
        3. Parse Owner details.
        """
        processed_rows = []
        last_khata = None

        for row in rows:
            # 1. Fill down Khata (Column 2)
            current_khata = row.get('col_2') or row.get('khata_number')
            if current_khata:
                last_khata = current_khata
            else:
                row['khata_number'] = last_khata
                row['col_2'] = last_khata

            # 2. Explode (Split) based on Khasra (Column 7)
            expanded_list = RoRParser.explode_khasra_rows(row)

            # 3. Parse Owner Details (Column 5) for each exploded row
            for expanded_row in expanded_list:
                col_5_text = expanded_row.get('col_5') or expanded_row.get('owner_details')
                if col_5_text:
                    parsed_details = RoRParser.parse_column_5(str(col_5_text))
                    expanded_row.update(parsed_details) # Add name, parentage, etc to row
                
                processed_rows.append(expanded_row)

        return processed_rows
