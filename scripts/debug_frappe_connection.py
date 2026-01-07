
import requests
import json
import os
import time

# Host Config (External Port)
BASE_URL = "http://localhost:8080"
API_KEY = "84eeac4d6d0cdff"
API_SECRET = "95f136e022e217d"

headers = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json"
}

def log(msg):
    print(f"[DEBUG] {msg}")

def check_connection():
    log(f"Testing connectivity to {BASE_URL}...")
    try:
        # Just check version or ping
        resp = requests.get(f"{BASE_URL}/api/method/frappe.utils.print_format.download_pdf", headers=headers)
        # 403/401/200 are fine, creates connection. 
        # Better: check a standard resource
        resp = requests.get(f"{BASE_URL}/api/resource/User", params={"limit_page_length": 1}, headers=headers)
        log(f"User check response: {resp.status_code}")
        if resp.status_code == 200:
            log("✅ Connection Successful!")
        else:
            log(f"❌ Connection Failed: {resp.text}")
    except Exception as e:
        log(f"❌ Exception: {e}")

def check_review_task_doctype():
    log("Checking 'Review Task' Doctype...")
    try:
        url = f"{BASE_URL}/api/resource/DocType/Review Task"
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
             log("✅ 'Review Task' Doctype exists.")
        else:
             log(f"❌ 'Review Task' Doctype NOT FOUND (Status {resp.status_code}). Response: {resp.text}")
             # Try without space?
             url2 = f"{BASE_URL}/api/resource/DocType/ReviewTask"
             resp2 = requests.get(url2, headers=headers)
             if resp2.status_code == 200:
                 log("⚠️ Found 'ReviewTask' (No Space) instead.")
    except Exception as e:
        log(f"❌ Error checking doctype: {e}")

def list_data():
    log("Listing 'Review Task' records...")
    try:
        url = f"{BASE_URL}/api/resource/Review Task"
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            log(f"✅ Found {len(data)} review tasks.")
            for d in data:
                log(f" - {d.get('name')}")
        else:
            log(f"❌ Failed to list: {resp.status_code} {resp.text}")
    except Exception as e:
         log(f"❌ Error listing: {e}")

def create_dummy():
    log("Creating Dummy Review Task...")
    data = {
        "document_id": "TEST-DEBUG-001",
        "document_type": "Girdawari",
        "confidence_score": 0.1,
        "extracted_fields": json.dumps({"test": "data"}),
        "status": "Pending"
    }
    try:
        url = f"{BASE_URL}/api/resource/Review Task"
        resp = requests.post(url, json=data, headers=headers)
        if resp.status_code == 200:
             log(f"✅ Created: {resp.json().get('data', {}).get('name')}")
        else:
             log(f"❌ Create Failed: {resp.status_code}") 
             log(f"   Response: {resp.text}")
    except Exception as e:
        log(f"❌ Create Error: {e}")

if __name__ == "__main__":
    check_connection()
    check_review_task_doctype()
    list_data()
    create_dummy()
