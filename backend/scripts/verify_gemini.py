from app.services.ai.gemini_service import GeminiService
import logging
import json
import os

# Setup Logger
logging.basicConfig(level=logging.INFO)

def test_gemini_parsing():
    print("--- Testing Gemini Parsing ---")
    
    # Check for Key (It should be in env now, or we pass it directly for this test script if locally run)
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("⚠️ GOOGLE_API_KEY not found in env. Please ensure it is set.")
        # For the sake of the test script running in an unknown env, we might want to allow passing it?
        # But for now, we assume docker-compose injected it.
    
    service = GeminiService()
    
    # Test Input: A tricky raw OCR string
    raw_text = "kasht sahid v singh pisar attar singh kaum sukh sakindeh gair morosi village test_village khasra 101, 102 area 5 kanal"
    print(f"\nInput: {raw_text}")
    
    if not service.model:
        print("❌ Gemini Service not initialized (Missing Key or Lib).")
        return

    result = service.translate_and_parse(raw_text)
    print("\nGemini Output:")
    print(json.dumps(result, indent=2))
    
    # Basic Assertions
    if "error" not in result:
        print("✅ Parsed JSON successfully")
        # Check structure
        if "khasra_numbers" in result and isinstance(result["khasra_numbers"], list):
             print(f"✅ Extracted Khasra Numbers: {result['khasra_numbers']}")
        if "cultivator" in result:
             print(f"✅ Extracted Cultivator: {result['cultivator'].get('name')}")
    else:
        print(f"❌ Error: {result['error']}")

if __name__ == "__main__":
    test_gemini_parsing()
