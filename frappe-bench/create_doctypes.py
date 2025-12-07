import os
import json

base_path = "/home/frappe/frappe-bench/apps/land_records/land_records"
doctype_path = os.path.join(base_path, "doctype")

doctypes = {
    "Village": {
        "fields": [
            {"fieldname": "village_name", "fieldtype": "Data", "label": "Village Name", "reqd": 1}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    },
    "Farmer": {
        "fields": [
            {"fieldname": "farmer_id", "fieldtype": "Data", "label": "Farmer ID", "unique": 1, "reqd": 1},
            {"fieldname": "name_urdu", "fieldtype": "Data", "label": "Name (Urdu)"},
            {"fieldname": "name_english", "fieldtype": "Data", "label": "Name (English)"},
            {"fieldname": "father_name", "fieldtype": "Data", "label": "Father Name"},
            {"fieldname": "village", "fieldtype": "Link", "label": "Village", "options": "Village"},
            {"fieldname": "confidence", "fieldtype": "Float", "label": "Confidence"},
            {"fieldname": "consent_flags", "fieldtype": "JSON", "label": "Consent Flags"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    },
    "Land Parcel": {
        "fields": [
            {"fieldname": "parcel_id", "fieldtype": "Data", "label": "Parcel ID", "unique": 1, "reqd": 1},
            {"fieldname": "village_id", "fieldtype": "Data", "label": "Village ID"},
            {"fieldname": "khasra_number", "fieldtype": "Data", "label": "Khasra Number"},
            {"fieldname": "area_text", "fieldtype": "Data", "label": "Area Text"},
            {"fieldname": "area_geom", "fieldtype": "Float", "label": "Area Geom"},
            {"fieldname": "status", "fieldtype": "Select", "label": "Status", "options": "Active\nDisputed\nInactive"},
            {"fieldname": "version", "fieldtype": "Int", "label": "Version"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    },
    "Review Task": {
        "fields": [
            {"fieldname": "document_id", "fieldtype": "Data", "label": "Document ID"},
            {"fieldname": "document_type", "fieldtype": "Select", "label": "Document Type", "options": "Girdawari\nKhasra"},
            {"fieldname": "confidence_score", "fieldtype": "Float", "label": "Confidence Score"},
            {"fieldname": "extracted_fields", "fieldtype": "JSON", "label": "Extracted Fields"},
            {"fieldname": "status", "fieldtype": "Select", "label": "Status", "options": "Pending\nApproved\nRejected"},
            {"fieldname": "assigned_to", "fieldtype": "Link", "label": "Assigned To", "options": "User"}
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    }
}

for name, data in doctypes.items():
    slug = name.lower().replace(" ", "_")
    folder = os.path.join(doctype_path, slug)
    os.makedirs(folder, exist_ok=True)
    
    # JSON
    doc_json = {
        "doctype": "DocType",
        "name": name,
        "module": "Land Records",
        "custom": 0,
        "beta": 0,
        "fields": data["fields"],
        "permissions": data["permissions"],
        "sort_field": "modified",
        "sort_order": "DESC",
        "engine": "InnoDB",
        "owner": "Administrator"
    }
    with open(os.path.join(folder, f"{slug}.json"), "w") as f:
        json.dump(doc_json, f, indent=1)
        
    # Python
    py_content = f"""# Copyright (c) 2024, Me and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class {name.replace(" ", "")}(Document):
	pass
"""
    with open(os.path.join(folder, f"{slug}.py"), "w") as f:
        f.write(py_content)

    # Init
    with open(os.path.join(folder, "__init__.py"), "w") as f:
        f.write("")

    # JS
    with open(os.path.join(folder, f"{slug}.js"), "w") as f:
        f.write(f"// frappe.ui.form.on('{name}', {{ refresh: function(frm) {{ }} }});")

print("Doctypes created successfully.")
