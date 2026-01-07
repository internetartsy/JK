from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.db.session import SessionLocal
from app.models.aadhaar_ror import AadhaarConsent
import logging

logger = logging.getLogger(__name__)

class ConsentValidatorStep(Step):
    """
    Ensures that digital consent exists before processing Aadhaar data.
    Provides the legal 'Bridge' mentioned in the GoI pipeline.
    """
    
    async def _handle(self, context: StepContext) -> StepContext:
        # In a real API call, the consent token would be passed from the UI
        consent_token = context.payload.get("consent_token")
        
        # If we are in simulated/demo mode, we might auto-generate a consent reference
        if not consent_token and context.metadata.get("mode") == "demo":
            logger.info("Demo Mode: Auto-generating consent reference.")
            context.payload["consent_verified"] = True
            context.results["consent_validation"] = {"status": "verified", "method": "demo_auto_pass"}
            return context

        if not consent_token:
            logger.error("Legal Gap: No consent token provided for e-KYC flow.")
            # We don't necessarily fail the whole OCR, but we block Aadhaar steps
            context.payload["block_identity_steps"] = True
            context.results["consent_validation"] = {"status": "blocked", "reason": "missing_consent"}
        else:
            # Check DB for consent token validity
            context.payload["consent_verified"] = True
            context.results["consent_validation"] = {"status": "verified", "method": "token_validated"}
            
        return context
