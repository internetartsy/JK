
import frappe
import sys

def debug():
    site = "land-records.local"
    frappe.init(site=site, sites_path='sites')
    frappe.connect()
    print(f"Server script enabled in conf: {frappe.conf.get('server_script_enabled')}")
    
    try:
        doc = frappe.get_doc({
            "doctype": "Farmer",
            "farmer_id": "debug-12345", 
            "name_english": "Debug Farmer"
        })
        doc.insert()
        frappe.db.commit()
        print("SUCCESS: Farmer created!")
    except Exception as e:
        print(f"FAILURE: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug()
