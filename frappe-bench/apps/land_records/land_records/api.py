import frappe
import requests
import json

WEBHOOK_URL = "http://backend:8000/api/v1/frappe/webhook"

# ============== FARMER SYNC ==============

def sync_farmer(doc, method):
    payload = {
        "doctype": "Farmer",
        "name": doc.name,
        "action": "insert" if method == "after_insert" else "update",
        "data": {
            "farmer_id": doc.farmer_id,
            "name_urdu": doc.name_urdu,
            "name_english": doc.name_english,
            "father_name": doc.father_name,
            "village": doc.village,
            "confidence": doc.confidence,
            "consent_flags": doc.consent_flags
        }
    }
    send_webhook(payload)

def sync_farmer_delete(doc, method):
    payload = {
        "doctype": "Farmer",
        "name": doc.name,
        "action": "delete",
        "data": {"farmer_id": doc.farmer_id}
    }
    send_webhook(payload)

# ============== LAND PARCEL SYNC ==============

def sync_land_parcel(doc, method):
    payload = {
        "doctype": "Land Parcel",
        "name": doc.name,
        "action": "insert" if method == "after_insert" else "update",
        "data": {
            "parcel_id": doc.parcel_id,
            "village_id": doc.village_id,
            "khasra_number": doc.khasra_number,
            "area_text": doc.area_text,
            "area_geom": doc.area_geom,
            "status": doc.status,
            "version": doc.version
        }
    }
    send_webhook(payload)

def sync_land_parcel_delete(doc, method):
    payload = {
        "doctype": "Land Parcel",
        "name": doc.name,
        "action": "delete",
        "data": {"parcel_id": doc.parcel_id}
    }
    send_webhook(payload)

# ============== REVIEW TASK SYNC ==============

def sync_review_task(doc, method):
    payload = {
        "doctype": "Review Task",
        "name": doc.name,
        "action": "insert" if method == "after_insert" else "update",
        "data": {
            "document_id": doc.document_id,
            "document_type": doc.document_type,
            "confidence_score": doc.confidence_score,
            "extracted_fields": doc.extracted_fields,
            "status": doc.status,
            "assigned_to": doc.assigned_to
        }
    }
    send_webhook(payload)

# ============== WEBHOOK SENDER ==============

def send_webhook(payload):
    try:
        headers = {"Content-Type": "application/json"}
        response = requests.post(WEBHOOK_URL, json=payload, headers=headers, timeout=5)
        response.raise_for_status()
        frappe.logger().info(f"Synced {payload['doctype']} {payload['name']} to backend: {response.status_code}")
        return True
    except Exception as e:
        frappe.logger().error(f"Failed to sync {payload['doctype']} {payload['name']}: {str(e)}")
        return False

# ============== API ENDPOINTS (for receiving from FastAPI) ==============

@frappe.whitelist(allow_guest=False)
def create_review_task(document_id, document_type, confidence_score, extracted_fields, status="Pending"):
    """API to create Review Task from FastAPI"""
    doc = frappe.get_doc({
        "doctype": "Review Task",
        "document_id": document_id,
        "document_type": document_type,
        "confidence_score": float(confidence_score),
        "extracted_fields": extracted_fields,
        "status": status
    })
    doc.insert()
    frappe.db.commit()
    return {"name": doc.name, "status": "created"}

@frappe.whitelist(allow_guest=False)
def update_farmer(farmer_id, **kwargs):
    """API to update Farmer from FastAPI"""
    if frappe.db.exists("Farmer", farmer_id):
        doc = frappe.get_doc("Farmer", farmer_id)
        doc.update(kwargs)
        doc.save()
        frappe.db.commit()
        return {"name": doc.name, "status": "updated"}
    else:
        doc = frappe.get_doc({
            "doctype": "Farmer",
            "farmer_id": farmer_id,
            **kwargs
        })
        doc.insert()
        frappe.db.commit()
        return {"name": doc.name, "status": "created"}

@frappe.whitelist(allow_guest=False)
def update_land_parcel(parcel_id, **kwargs):
    """API to update Land Parcel from FastAPI"""
    if frappe.db.exists("Land Parcel", parcel_id):
        doc = frappe.get_doc("Land Parcel", parcel_id)
        doc.update(kwargs)
        doc.save()
        frappe.db.commit()
        return {"name": doc.name, "status": "updated"}
    else:
        doc = frappe.get_doc({
            "doctype": "Land Parcel",
            "parcel_id": parcel_id,
            **kwargs
        })
        doc.insert()
        frappe.db.commit()
        return {"name": doc.name, "status": "created"}

@frappe.whitelist(allow_guest=False)
def create_parcel(parcel_id, village_id, khasra_number, geojson=None, **kwargs):
    """
    API to create Land Parcel (mapped to agristack.parcels.create)
    Accepts GeoJSON for future spatial storage
    """
    if frappe.db.exists("Land Parcel", parcel_id):
        return {"name": parcel_id, "status": "exists"}
    
    doc = frappe.get_doc({
        "doctype": "Land Parcel",
        "parcel_id": parcel_id,
        "village_id": village_id,
        "khasra_number": khasra_number,
        # Store geojson if we had a field for it, or process it
        **kwargs
    })
    doc.insert()
    frappe.db.commit()
    return {"name": doc.name, "status": "created"}

@frappe.whitelist(allow_guest=False)
def create_farmer(farmer_id, name_english, name_urdu=None, **kwargs):
    """
    API to create Farmer (mapped to agristack.farmers.create)
    """
    if frappe.db.exists("Farmer", farmer_id):
        return {"name": farmer_id, "status": "exists"}

    doc = frappe.get_doc({
        "doctype": "Farmer",
        "farmer_id": farmer_id,
        "name_english": name_english,
        "name_urdu": name_urdu,
        **kwargs
    })
    doc.insert()
    frappe.db.commit()
    return {"name": doc.name, "status": "created"}
@frappe.whitelist(allow_guest=False)
def run_ocr(scan_id, file_url, doc_type="Girdawari"):
    """
    Mapped to agristack.ocr.run
    Creates OCR Result linked to Document Scan
    """
    # Create Document Scan if not exists
    if not frappe.db.exists("Document Scan", scan_id):
        scan = frappe.get_doc({
            "doctype": "Document Scan",
            "scan_id": scan_id,
            "document_type": doc_type,
            "file_url": file_url,
            "status": "Processing"
        })
        scan.insert()
    
    # Simulate OCR processing (in real world, this might trigger a background job or call FastAPI)
    # For now, we create a placeholder OCR Result
    result_id = f"OCR-{scan_id}"
    if not frappe.db.exists("OCR Result", result_id):
        result = frappe.get_doc({
            "doctype": "OCR Result",
            "result_id": result_id,
            "scan_id": scan_id,
            "raw_text": "Simulated OCR Text...",
            "confidence_score": 0.95,
            "extracted_data": {"field": "value"}
        })
        result.insert()
        
    return {"status": "success", "result_id": result_id}

@frappe.whitelist(allow_guest=False)
def sync_queue(items):
    """
    Mapped to agristack.queue.sync
    Background job enqueues items
    """
    if isinstance(items, str):
        items = json.loads(items)
        
    # Enqueue background job (simulated)
    frappe.enqueue("land_records.api.process_queue", queue="default", items=items)
    return {"status": "queued", "count": len(items)}

def process_queue(items):
    """Background job to process synced items"""
    for item in items:
        # Process each item (e.g., create records)
        frappe.logger().info(f"Processing queue item: {item}")

@frappe.whitelist(allow_guest=False)
def resolve_claim(claim_id, action, resolution_notes=None):
    """
    Mapped to agristack.claims.resolve
    Workflow action with status change
    """
    if not frappe.db.exists("Claim", claim_id):
        frappe.throw("Claim not found")
        
    doc = frappe.get_doc("Claim", claim_id)
    
    # Apply workflow action
    if action == "Approve":
        frappe.workflow.apply_workflow(doc, "Approve")
    elif action == "Reject":
        frappe.workflow.apply_workflow(doc, "Reject")
    
    if resolution_notes:
        doc.description = f"{doc.description}\nResolution: {resolution_notes}"
        
    doc.save()
    frappe.db.commit()
    return {"status": "resolved", "new_state": doc.status}

@frappe.whitelist(allow_guest=False)
def run_transliteration(text, source_lang="ur", target_lang="en"):
    """
    Mapped to agristack.transliterate.run
    """
    # Simulated transliteration
    transliterated = f"Transliterated: {text}"
    return {"original": text, "transliterated": transliterated}

# ============== TEST FUNCTIONS ==============

def test_sync():
    if not frappe.db.exists("Village", "Test Village"):
        v = frappe.get_doc({"doctype": "Village", "village_name": "Test Village"})
        v.insert()
    
    if not frappe.db.exists("Farmer", "TEST_EXECUTE"):
        doc = frappe.get_doc({
            "doctype": "Farmer",
            "farmer_id": "TEST_EXECUTE",
            "name_urdu": "U",
            "name_english": "E",
            "village": "Test Village",
            "confidence": 0.9
        })
        doc.insert()
        frappe.db.commit()
        print("Farmer created")
    else:
        print("Farmer already exists")


