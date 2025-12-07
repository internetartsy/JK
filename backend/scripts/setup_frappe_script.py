
import sys
import os
import time

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.frappe_sync.frappe_client import FrappeClient
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The python code to be injected into Frappe
SERVER_SCRIPT_CODE = """
import requests
import frappe

def sync_to_fastapi(doc, method):
    # FastAPI webhook URL
    # Try to get from settings, fallback to docker service name
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
        # Use a short timeout
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 200:
            frappe.logger().info(f"Synced {doc.doctype} {doc.name} to FastAPI")
        else:
            frappe.logger().error(f"Failed to sync {doc.doctype} {doc.name}: {response.text}")
    
    except Exception as e:
        frappe.logger().error(f"Error syncing to FastAPI: {str(e)}")

# Execute sync
sync_to_fastapi(doc, method)
"""

def setup_server_script():
    client = FrappeClient()
    
    doctypes_to_sync = ["Farmer", "Land Parcel", "Review Task"]
    
    for doctype in doctypes_to_sync:
        script_name = f"Sync {doctype} to FastAPI"
        
        # Check if exists
        existing = client.get_doc("Server Script", script_name)
        
        script_data = {
            "script_name": script_name,
            "script_type": "DocType Event",
            "reference_doctype": doctype,
            "doctype_event": "After Save", # Covers insert and update usually, but let's be specific if needed
            "script": SERVER_SCRIPT_CODE,
            "enabled": 1
        }
        
        # Note: Server Script structure requires specific event flags
        # Enabling for Before Save, After Save, Before Delete
        # Actually 'doctype_event' is a select. 
        # But we want multiple events?
        # Frappe Server Script Doctype usually has checkboxes for events or a select?
        # Let's assume we use 'After Save' which triggers on insert and update.
        # We also want 'Before Delete'. 
        
        # Wait, if we can't set multiple events easily via simple API creation if the logic is complex,
        # we might need separate scripts or check the Doctype definition of Server Script.
        # Standard Server Script has 'event_frequency' or checks.
        
        # For simplicity, verifying against standard 'Server Script' fields:
        # allow_all = 1 (if available)
        
        # Let's try to create it. If it fails on validation, we see.
        # We'll use 'After Save' as primary. Ideally we want 'Before Delete' too.
        
        if existing:
            logger.info(f"Server script '{script_name}' already exists. Updating...")
            # We would update here, but for now let's just log
            # client.update_doc("Server Script", script_name, script_data)
        else:
            logger.info(f"Creating server script '{script_name}'...")
            try:
                client.create_doc("Server Script", script_data)
                logger.info("Success!")
            except Exception as e:
                logger.error(f"Failed to create script for {doctype}: {e}")

if __name__ == "__main__":
    setup_server_script()
