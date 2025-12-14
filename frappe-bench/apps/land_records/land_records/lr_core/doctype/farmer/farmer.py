# Copyright (c) 2024, Me and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Farmer(Document):
    def validate(self):
        self.set_verification_status()

    def set_verification_status(self):
        """
        Applies Name Match Score (NMS) logic for efficient and fair verification.
        
        Logic:
        - Excellent (80-100): Auto-Approved for fast-tracking high accuracy applications.
        - Average (31-79): Manual Verification required by officer to ensure fairness for potential discrepancies.
        - Poor (0-30): Rejected/Correction Required to maintain registry accuracy.
        """
        # NMS Score mapped to 'confidence'
        score = self.confidence or 0
        
        if score >= 80:
             self.verification_status = "Auto Approved"
             if not self.farmer_id:
                 self.farmer_id = self.generate_farmer_id()
             frappe.msgprint("Excellent Match Score (NMS > 80): Application Auto-Approved.")
             
        elif 31 <= score <= 79:
             self.verification_status = "Manual Verification Required"
             if not self.farmer_id:
                 self.farmer_id = self.generate_farmer_id()
             frappe.msgprint("Average Match Score (31-79): Pending Manual Verification by Officer.")
             
        else:
             self.verification_status = "Rejected"
             # We allow saving so the record exists and can be tracked/corrected
             if not self.farmer_id:
                 self.farmer_id = self.generate_farmer_id()
             frappe.msgprint("Poor Match Score (< 31): Discrepancy Detected. Please correct official records.")

    def generate_farmer_id(self):
        import random
        return f"JK-F-{random.randint(100000, 999999)}"

@frappe.whitelist()
def transliterate_name(name_english):
    # TODO: Integrate with a real transliteration API (e.g., Google, Microsoft, or a specialized library)
    # For now, we simulate this by just appending a marker, or ideally if we had a mapping.
    
    # Placeholder logic
    return f"[Urdu: {name_english}]" 
