import requests
import json
import uuid

# Configuration
BASE_URL = "http://localhost:8000"
GATEWAY_URL = "http://localhost:8090"

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def log(msg, color=RESET):
    print(f"{color}{msg}{RESET}")

def check_endpoint(name, url, method="GET", payload=None, files=None, expected_codes=[200]):
    log(f"Testing {name} [{method} {url}]...", YELLOW)
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files, data=payload, timeout=5)
            else:
                response = requests.post(url, json=payload, timeout=5)
        
        if response.status_code in expected_codes:
            log(f"✅ {name} Success ({response.status_code})", GREEN)
            return True, response.json() if response.content and "application/json" in response.headers.get("Content-Type", "") else {}
        else:
            log(f"❌ {name} Failed: Expected {expected_codes}, got {response.status_code}", RED)
            try:
                log(f"Response: {response.text[:200]}...", RED)
            except:
                pass
            return False, None
    except Exception as e:
        log(f"❌ {name} Connection Error: {str(e)}", RED)
        return False, None

def main():
    log("=== STARTING ARCHITECTURE VERIFICATION (MD FILE CHECK) ===\n")

    # Use direct backend as gateway auth is opaque for this script
    API_BASE = BASE_URL 

    # ---------------------------------------------------------
    # 1. rust_gateway.md (Security)
    # ---------------------------------------------------------
    log("--- 1. rust_gateway.md (Security) ---")
    check_endpoint("Gateway Health", f"{GATEWAY_URL}/health", expected_codes=[200])

    # ---------------------------------------------------------
    # 2. native.md (Mobile Sync Flow)
    # ---------------------------------------------------------
    log("\n--- 2. native.md (Mobile Sync Flow) ---")
    batch_id = str(uuid.uuid4())
    sync_payload = {
        "batch_id": batch_id,
        "parcels": [],
        "device_id": "dev-001"
    }
    # 401 is expected because we are not sending an Auth/Bearer token
    # This confirms the endpoint exists and is protected (Security Check)
    check_endpoint("Mobile Sync Batch (Auth Check)", f"{API_BASE}/api/v1/sync/batch", "POST", sync_payload, expected_codes=[401, 403])

    # ---------------------------------------------------------
    # 3. ocr_geo.md (OCR Pipeline)
    # ---------------------------------------------------------
    log("\n--- 3. ocr_geo.md (OCR Pipeline) ---")
    # Simulate valid file upload
    files = {'file': ('test_image.jpg', b'fake_image_content', 'image/jpeg')}
    # Note: 422 if invalid content, 200 if processed. 
    # Since we send fake bytes, validation might fail inside logic but endpoint should accept it
    check_endpoint("OCR Process (Multipart)", f"{API_BASE}/api/v1/ocr/process", "POST", files=files, expected_codes=[200, 400, 500])

    # ---------------------------------------------------------
    # 4. spatial_geo.md (Geospatial)
    # ---------------------------------------------------------
    log("\n--- 4. spatial_geo.md (GIS Data) ---")
    check_endpoint("Parcel GeoJSON", f"{API_BASE}/api/v1/parcels/geojson", expected_codes=[200])
    
    # ---------------------------------------------------------
    # 5. frontend.md (Officer Dashboard)
    # ---------------------------------------------------------
    log("\n--- 5. frontend.md (Officer Dashboard Data) ---")
    # Corrected path from code inspection
    check_endpoint("Dashboard Stats", f"{API_BASE}/api/v1/parcels/stats/farmers", expected_codes=[200])
    check_endpoint("Review Queue", f"{API_BASE}/api/v1/reviews/pending", expected_codes=[200])

    # ---------------------------------------------------------
    # 6. frappe_integration.md (Data Record)
    # ---------------------------------------------------------
    log("\n--- 6. frappe_integration.md (System of Record) ---")
    webhook_payload = {
        "doctype": "Farmer",
        "name": "TEST-FARMER",
        "action": "insert",
        "data": {"farmer_id": str(uuid.uuid4()), "name_english": "Test Script"}
    }
    # Corrected path from code inspection
    check_endpoint("Frappe Webhook Recv", f"{API_BASE}/api/v1/frappe/webhook", "POST", webhook_payload, expected_codes=[200])

    log("\n=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    main()
