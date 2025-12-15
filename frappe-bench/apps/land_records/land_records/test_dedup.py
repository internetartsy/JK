import frappe
from land_records.lr_core.utils.data_cleaning import run_deduplication_pipeline
import json

def run_test():
    print("Initializing Test...")
    
    # 0. Create Dummy Village
    village_doc_name = "Test Village"
    if not frappe.db.exists("Village", village_doc_name):
        try:
            v = frappe.get_doc({
                "doctype": "Village",
                "village_code": "TEST_VILLAGE",
                "village_name": village_doc_name
            })
            v.insert()
        # frappe.db.commit() # Avoid commit
            village_doc_name = v.name
            print(f"Created Dummy Village: {v.name}")
        except frappe.DuplicateEntryError:
            print("Village already exists (race condition or previous run)")
    else:
        print(f"Using Existing Village: {village_doc_name}")

    # 1. Create Dummy Farmer (ROR)
    # Check if exists first to avoid duplicates
    existing = frappe.get_all("Farmer", filters={"farmer_id": "JK_F_TEST_001"})
    if existing:
        frappe.delete_doc("Farmer", existing[0].name)
    
    farmer = frappe.get_doc({
        "doctype": "Farmer",
        "farmer_id": "JK_F_TEST_001",
        "name_english": "MR. ABDUL RAHIM", 
        "father_name": "S/O MOHD SADIQ",   
        "contact": "9906000000",
        "village": village_doc_name, # Use the actual PK
        "confidence": 100
    })
    farmer.insert()
    # frappe.db.commit() # Commit farmer too
    print(f"Created Dummy Farmer: {farmer.name}")
    
    # 2. Run Pipeline
    # The pipeline has hardcoded PM Kisan data: "Abdul Rahim" (clean)
    print("Running Deduplication Pipeline...")
    result = run_deduplication_pipeline(village_code=village_doc_name)
    
    print("\n---------------- RESULT ----------------")
    print(json.dumps(result, indent=2))
    print("----------------------------------------")
    
    # 3. Persist Data for Demo
    print("Committing test data for Frontend Demo...")
    frappe.db.commit()

if __name__ == "__main__":
    run_test()
