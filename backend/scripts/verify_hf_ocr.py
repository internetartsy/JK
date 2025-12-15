import logging
import os
import io
from PIL import Image

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fake Image for Test (Since we don't have a real one handy, create a blank one)
def create_dummy_image():
    img = Image.new('RGB', (300, 100), color = (255, 255, 255))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

def verify_hf_model():
    print("--- Verifying Hugging Face Model Integration ---")
    
    # 1. Check Imports
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        print("✓ Transformers library found.")
    except ImportError:
        print("❌ Transformers library NOT found. Please install requirements.")
        return

    # 2. Check Service Integration
    try:
        from app.services.ocr.ocr_service import OCRService
        service = OCRService()
        
        # Check if client exists
        if hasattr(service, 'hf_client'):
            print("✓ OCRService has 'hf_client'.")
        else:
            print("❌ OCRService missing 'hf_client'.")
            return
            
        print("✓ Service Integration Verified.")

        # 3. Simulate Model Load (Light Check)
        # We won't actually run inference because downloading 1GB might hang this script.
        # But we can verify the class structure.
        
        print("\n--- Dry Run Complete ---")
        print("To fully verify, restart the backend and upload a document.")
        print("Note: The FIRST request will take time to download 'cxfajar197/urdu-ocr'.")
        
    except Exception as e:
        print(f"❌ Verification Failed: {e}")

if __name__ == "__main__":
    verify_hf_model()
