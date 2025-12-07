# Frappe Server Script for Syncing to FastAPI
# To be created in Frappe: Setup > Server Script

# Script Type: DocType Event
# DocType: Farmer (or Land Parcel, etc.)
# Event: After Insert, After Save, Before Delete

import requests
import frappe

def sync_to_fastapi(doc, method):
    """
    Send doctype changes to FastAPI webhook
    
    Usage:
    - Create this as a Server Script in Frappe
    - Set DocType to "Farmer" or "Land Parcel"
    - Set Event to "After Insert", "After Save", or "Before Delete"
    """
    
    # FastAPI webhook URL
    webhook_url = frappe.db.get_single_value("Land Records Settings", "fastapi_webhook_url")
    if not webhook_url:
        webhook_url = "http://backend:8000/api/v1/frappe/webhook"
    
    # Determine action
    action = "insert" if method == "after_insert" else "update"
    if method == "before_delete":
        action = "delete"
    
    # Prepare payload
    payload = {
        "doctype": doc.doctype,
        "name": doc.name,
        "action": action,
        "data": doc.as_dict()
    }
    
    try:
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            frappe.logger().info(f"Synced {doc.doctype} {doc.name} to FastAPI")
        else:
            frappe.logger().error(f"Failed to sync {doc.doctype} {doc.name}: {response.text}")
    
    except Exception as e:
        frappe.logger().error(f"Error syncing to FastAPI: {str(e)}")
        # Don't raise exception to avoid blocking Frappe operations

# For Farmer doctype
if doc.doctype == "Farmer":
    sync_to_fastapi(doc, method)

# For Land Parcel doctype  
if doc.doctype == "Land Parcel":
    sync_to_fastapi(doc, method)
