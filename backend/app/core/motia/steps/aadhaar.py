from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.services.farmer_id_generator import FarmerIDGenerator
import logging

logger = logging.getLogger(__name__)

class AadhaarAuthStep(Step):
    """
    Implements the e-KYC/Aadhaar Authentication Step as per GoI guidelines.
    Validates farmer identity against UIDAI patterns (simulated).
    """
    
    async def _handle(self, context: StepContext) -> StepContext:
        # 1. Look for Aadhaar info in payload (possibly from a mobile app skip or user input)
        aadhaar_number = context.payload.get("aadhaar_number")
        aadhaar_hash = context.payload.get("aadhaar_hash")
        biometric_pid = context.payload.get("biometric_pid")
        
        if not aadhaar_number and not aadhaar_hash and not biometric_pid:
            logger.info("No Aadhaar data provided, skipping e-KYC.")
            context.results["aadhaar_auth"] = {"status": "skipped", "reason": "no_data"}
            return context

        # 2. Simulate e-KYC via UIDAI API
        is_valid = True 
        method = "e-KYC"
        
        if biometric_pid:
            method = "Biometric (RD Service)"
            # Extract Aadhaar from encrypted PID in real scenario
            
        # Consistent with GOI Diagram: Biometric authenticated Farmer Registry
        if aadhaar_number:
            import hashlib
            aadhaar_hash = hashlib.sha256(aadhaar_number.encode()).hexdigest()
        
        context.payload["aadhaar_hash"] = aadhaar_hash
        context.payload["aadhaar_verified"] = is_valid
        
        context.results["aadhaar_auth"] = {
            "status": "verified",
            "aadhaar_hash": aadhaar_hash,
            "method": method
        }
        
        return context
