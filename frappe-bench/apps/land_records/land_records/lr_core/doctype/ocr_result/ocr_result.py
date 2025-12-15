import frappe
from frappe.model.document import Document
import json
import hashlib

class OCRResult(Document):
    def on_submit(self):
        """
        On submit of OCR Result, process the extracted data to create/update Farmer records.
        """
        self.process_farmer_details()

    def process_farmer_details(self):
        """
        Extracts farmer details from extracted_data and creates Farmer records.
        Using logic similar to backend's FarmerIDGenerator.
        """
        if not self.extracted_data:
            return

        data = self.extracted_data
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                frappe.log_error("Invalid JSON in Extracted Data", "OCR Processing")
                return

        # Integrate specialized RoR Parsing Utility
        from land_records.lr_core.utils.ror_parser import RoRParser

        # If data is tabular (list of rows), process batch
        if isinstance(data, list):
            frappe.log_error("Processing Batch RoR Data", "OCR Debug")
            processed_rows = RoRParser.process_jamabandi_batch(data)
            for row in processed_rows:
                 # Process each exploded row as an individual farmer/parcel entry
                 self.create_farmer_from_row(row)
            return

        # If single object (legacy/simple structure), try parsing Column 5 specifically
        owner_text = data.get("owner_details") or data.get("column_5")
        if owner_text:
            parsed_details = RoRParser.parse_column_5(str(owner_text))
            data.update(parsed_details) # Merge parsed fields like name, parentage, caste

        owner_name = data.get("name") or data.get("owner_name")
        father_name = data.get("parentage") or data.get("father_name")
        address = data.get("residence") or data.get("address")
        
        if not owner_name:
            return

        self.create_farmer_from_row(data)

    def create_farmer_from_row(self, data):
        """
        Creates or updates a Farmer record from a single processed row data.
        """
        owner_name = data.get("name") or data.get("owner_name")
        father_name = data.get("parentage") or data.get("father_name")
        address = data.get("residence") or data.get("address")
        
        if not owner_name:
            return

        farmer_id = self.generate_fragmented_farmer_id(owner_name, father_name)

        # Check if Farmer exists
        if not frappe.db.exists("Farmer", farmer_id):
            farmer = frappe.new_doc("Farmer")
            farmer.farmer_id = farmer_id
            farmer.name_english = owner_name
            farmer.father_name = father_name
            
            # Additional demographics
            demographics = {
                "address": address,
                "caste": data.get("caste"),
                "relationship": data.get("relationship"),
                "remarks": data.get("remarks"),
                "source": "OCR",
                "ocr_result_id": self.name
            }
            farmer.demographics = json.dumps(demographics)
            
            # Map ULPIN/Plot info
            # Use 'col_7' (Khasra) or explicit 'ulpin' if mapped
            ulpin = data.get("ulpin")
            khasra = data.get("khasra_number") or data.get("col_7")
            
            # Note: Ideally we find ULPIN by Khasra if not provided directly
            
            if ulpin and frappe.db.exists("Land Parcel", {"parcel_id": ulpin}):
                farmer.append("linked_parcels", {
                    "parcel_id": ulpin,
                    "relationship": "Owner"
                })
            
            farmer.insert(ignore_permissions=True)
            # frappe.msgprint(f"Created new Farmer record: {farmer_id}")
        else:
            # Update existing
            farmer = frappe.get_doc("Farmer", farmer_id)
            ulpin = data.get("ulpin")
            
            if ulpin and not any(d.parcel_id == ulpin for d in farmer.linked_parcels):
                 if frappe.db.exists("Land Parcel", {"parcel_id": ulpin}):
                    farmer.append("linked_parcels", {
                        "parcel_id": ulpin,
                        "relationship": "Owner"
                    })
                    farmer.save(ignore_permissions=True)
                    # frappe.msgprint(f"Updated Farmer {farmer_id} with new ULPIN {ulpin}")

    def generate_fragmented_farmer_id(self, name, father_name):
        """
        Generate a unique ID based on demographics.
        Format: FID-01-HASH (matching backend logic)
        """
        unique_str = f"{name.lower()}|{(father_name or '').lower()}"
        name_hash = hashlib.sha256(unique_str.encode()).hexdigest()
        return f"FID-01-{name_hash[:10].upper()}"
