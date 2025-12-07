import os
import sys
import time
import uuid
import logging
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to allow importing 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
FRAPPE_URL = os.getenv("FRAPPE_URL", "http://frappe:8000")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/land_records")

if not FRAPPE_API_KEY or not FRAPPE_API_SECRET:
    logger.error("FRAPPE_API_KEY and FRAPPE_API_SECRET must be set")
    exit(1)

class FrappeClient:
    def __init__(self):
        self.base_url = FRAPPE_URL
        self.headers = {
            "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def create_doc(self, doctype, data):
        url = f"{self.base_url}/api/resource/{doctype}"
        try:
            resp = requests.post(url, json=data, headers=self.headers)
            resp.raise_for_status()
            return resp.json().get("data")
        except Exception as e:
            logger.error(f"Error creating {doctype}: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            return None

    def get_doc(self, doctype, name):
        url = f"{self.base_url}/api/resource/{doctype}/{name}"
        try:
            resp = requests.get(url, headers=self.headers)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json().get("data")
        except Exception as e:
            logger.error(f"Error getting {doctype} {name}: {e}")
            return None

def verify_sync():
    logger.info("Starting Sync Verification...")
    
    # DB Setup
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    frappe = FrappeClient()
    
    # 1. Test Frappe -> DB (Webhook)
    logger.info("--- Testing Frappe -> DB (Webhook) ---")
    test_id = str(uuid.uuid4())
    data = {
        "farmer_id": test_id,
        "name_english": f"Test Farmer {test_id[:8]}",
        "name_urdu": "ٹیسٹ کسان",
        "confidence": 0.9,
    }
    
    logger.info(f"Creating Farmer in Frappe: {data['name_english']}")
    doc = frappe.create_doc("Farmer", data)
    
    if not doc:
        logger.error("Failed to create Farmer in Frappe")
    else:
        logger.info("Farmer created. Waiting for webhook sync...")
        time.sleep(2) # Wait for webhook
        
        # Check DB
        result = session.execute(text("SELECT * FROM person WHERE id = :id"), {"id": test_id}).fetchone()
        if result:
            logger.info(f"✅ SUCCESS: Found verified person in DB: {result.name_english}")
        else:
            logger.error("❌ FAILED: Person not found in DB")

    # 2. Test DB -> Frappe (Sync Service)
    logger.info("------------------------------")
    logger.info("--- Testing DB -> Frappe (Sync Service) ---")
    
    db_test_id = str(uuid.uuid4())
    db_name = f"DB Farmer {test_id}"
    
    # Simulate extraction/DB entry
    # Note: In the real app, this is triggered by the 'sync' service, 
    # but here we can just invoke the sync service method or simulate the DB entry if the sync service watches DB.
    # Actually, the sync service is typically triggered by an API call or a background job.
    # Looking at the code, `sync.py` likely has a trigger or we can use the `SyncService`.
    
    # Let's try to convert a Person to Frappe by calling the sync endpoint or simulating the logic.
    # For now, let's just insert into DB and assume there's a poller OR call the sync API if it exists.
    # Based on previous context, there is a `sync` router.
    
    # Let's insert into DB first
    session.execute(text("""
        INSERT INTO person (id, name_english, name_urdu, confidence) 
        VALUES (:id, :name, :urdu, :conf)
    """), {"id": db_test_id, "name": db_name, "urdu": "ٹیسٹ", "conf": 0.8})
    session.commit()
    logger.info(f"Created Person object (simulated): {db_name}")
    
    # Trigger Sync manually (since we don't have a DB watcher running for this demo, or maybe we do?)
    # If the system has a 'Sync Service' that pulls from DB, we might need to invoke it.
    # Let's try to call the backend's internal sync method or just restart the sync service?
    # Or maybe the `frappe_sync` module has a `sync_all`?
    
    # For verification, we can explicitly call the Sync logic if we can import it, 
    # OR we can assume the user means "Test the Frappe -> Backend sync" mainly.
    # But let's try to call the `sync_person_to_frappe` if we can import it.
    
    try:
        from app.services.frappe_sync.sync_service import FrappeSyncService
        from app.models.person import Person
        
        svc = FrappeSyncService()
        person_obj = session.query(Person).get(db_test_id)
        if person_obj:
            svc.sync_person_to_frappe(person_obj, action="create")
            logger.info("Sync service returned success.")
            
            # Check Frappe
            time.sleep(2)
            f_doc = frappe.get_doc("Farmer", db_test_id)
            if f_doc:
                logger.info(f"✅ SUCCESS: Found verified Farmer in Frappe: {f_doc.get('name_english')}")
            else:
                logger.error("❌ FAILED: Farmer not found in Frappe")
                
    except Exception as e:
        logger.error(f"Sync service failed: {e}")

    session.close()

if __name__ == "__main__":
    verify_sync()
