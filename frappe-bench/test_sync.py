import frappe
from frappe import local
import os

frappe.init(site="land-records.local")
local.sites_path = "/home/frappe/frappe-bench/sites"
local.site_path = os.path.join(local.sites_path, "land-records.local")
frappe.connect()

try:
    if not frappe.db.exists("Village", "Test Village"):
        v = frappe.get_doc({"doctype": "Village", "village_name": "Test Village"})
        v.insert()
        frappe.db.commit()
        print("Village created")

    if not frappe.db.exists("Farmer", {"farmer_id": "TEST_001"}):
        doc = frappe.get_doc({
            "doctype": "Farmer",
            "farmer_id": "TEST_001",
            "name_urdu": "Test",
            "name_english": "Test",
            "father_name": "Test Father",
            "village": "Test Village",
            "confidence": 0.9
        })
        doc.insert()
        frappe.db.commit()
        print("Farmer created")
    else:
        print("Farmer already exists")
except Exception as e:
    print(f"Error: {e}")
