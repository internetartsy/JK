# Copyright (c) 2024, Me and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Farmer(Document):
    pass

@frappe.whitelist()
def transliterate_name(name_english):
    # TODO: Integrate with a real transliteration API (e.g., Google, Microsoft, or a specialized library)
    # For now, we simulate this by just appending a marker, or ideally if we had a mapping.
    
    # Placeholder logic
    return f"[Urdu: {name_english}]" 
