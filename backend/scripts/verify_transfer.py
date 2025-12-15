from app.services.frappe_sync.sync_service import FrappeSyncService
import logging
import os

# Setup Logger
logging.basicConfig(level=logging.INFO)

# Hardcode credentials for local test (matching docker-compose)
# FRAPPE_URL = "http://localhost:8080" # From Host
os.environ["FRAPPE_URL"] = "http://erp-web:8000"     # From Docker Network
os.environ["FRAPPE_API_KEY"] = "84eeac4d6d0cdff"
os.environ["FRAPPE_API_SECRET"] = "95f136e022e217d"

def test_transfer_sync():
    print("--- Testing sync_transfer_to_frappe ---")
    
    sync = FrappeSyncService()
    
    # Mock Data typically extracted from a Mutation Deed
    mock_fields = {
        "doc_type": "Mutation",
        "doc_id": "TEST_MUT_001",
        "seller_name": "Rahim Khan",
        "seller_name_ur": "رحیم خان",
        "seller_father": "Karim Khan",
        "buyer_name": "Suresh Kumar",
        "buyer_name_ur": "سیرش کمار", # Transliterated/Translated
        "buyer_father": "Rakesh Kumar",
        "village": "TestVillage",
        "khasra_number": "999",
        "area_text": "5 Kanal",
        "date": "2024-12-15",
        "transfer_type": "Sale",
        "geojson": {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[75.0, 32.0], [75.1, 32.0], [75.1, 32.1], [75.0, 32.1], [75.0, 32.0]]]
            }
        }
    }
    
    print(f"Input Fields: {mock_fields}")
    
    # Run Sync
    result = sync.sync_transfer_to_frappe(
        doc_id=mock_fields["doc_id"],
        fields=mock_fields
    )
    
    print(f"\n--- Result ---")
    print(result)
    
    if result.get("transfer_created"):
        print("\nSUCCESS: Ownership Transfer created!")
        
        # Verify ULPIN if possible
        # Since we mocks don't return the full doc object easily here without querying back,
        # we rely on logs. However, we can query the created parcel if we had the ID.
        # Ideally, sync_service should return linked IDs.
        
        # Let's inspect the logs for "Generated ULPIN"
    else:
        print("\nFAILED: See logs above.")

if __name__ == "__main__":
    test_transfer_sync()
