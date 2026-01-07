
import requests
import time
import os
import sys

# Configuration
API_BASE = "http://localhost:8000/api/v1"
IMAGE_PATH = "frontend-landing/public/logo.png"

def test_ocr_flow():
    print("🚀 Starting End-to-End OCR Flow Test")
    print("-------------------------------------")

    # 1. Verify Image Exists
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Error: Image not found at {IMAGE_PATH}")
        sys.exit(1)

    # 2. Upload Image
    print(f"Uploading {IMAGE_PATH} to {API_BASE}/ocr/run-async ...")
    try:
        files = {'file': open(IMAGE_PATH, 'rb')}
        resp = requests.post(f"{API_BASE}/ocr/run-async", files=files)
        resp.raise_for_status()
        data = resp.json()
        job_id = data.get("job_id")
        print(f"✅ Upload Successful. Job ID: {job_id}")
    except Exception as e:
        print(f"❌ Upload Failed: {e}")
        if 'resp' in locals():
            print(resp.text)
        sys.exit(1)

    # 3. Poll Status
    print("Polling for completion...")
    status = "queued"
    max_retries = 20
    
    while status in ["queued", "processing"] and max_retries > 0:
        time.sleep(2)
        try:
            resp = requests.get(f"{API_BASE}/ocr/status/{job_id}")
            resp.raise_for_status()
            data = resp.json()
            # Redis stores it as a JSON string, so we might need to double decode if the API doesn't
            # But the API endpoint `get_job_status` just returns `redis_client.get()`. 
            # In `tasks.py` we `json.dumps`. 
            # If `get_job_status` returns the raw string, requests.json() might just return that string if content-type is json?
            # Actually, FastAPI might return the string as the body. Let's handle it.
            
            if isinstance(data, str):
                import json
                data = json.loads(data)
                
            status = data.get("status")
            progress = data.get("progress", 0)
            message = data.get("message", "")
            print(f"   Status: {status} ({progress}%) - {message}")
            max_retries -= 1
        except Exception as e:
            print(f"   Polling Error: {e}")
            max_retries -= 1

    if status != "completed":
        print(f"❌ Job failed or timed out. Final Status: {status}")
        sys.exit(1)

    print("✅ OCR Processing Completed.")
    print(f"   Result Confidence: {data.get('result', {}).get('confidence')}")

    # 4. Verify Review Queue
    print("\nVerifying Review Queue...")
    try:
        resp = requests.get(f"{API_BASE}/reviews/pending")
        resp.raise_for_status()
        reviews = resp.json()
        
        # Check if our doc_id is in the list
        found = False
        for task in reviews:
            if task.get("document_id") == job_id:
                found = True
                print(f"✅ SUCCESS: Found Review Task for Document {job_id}")
                print(f"   Confidence: {task.get('confidence_score')}")
                print(f"   Status: {task.get('status')}")
                break
        
        if not found:
            print(f"❌ FAILURE: Review Task for {job_id} NOT found in pending list.")
            print("   Current List IDs:", [r.get("document_id") for r in reviews])
            
    except Exception as e:
        print(f"❌ Failed to fetch reviews: {e}")

if __name__ == "__main__":
    test_ocr_flow()
