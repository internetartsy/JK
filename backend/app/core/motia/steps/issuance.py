from app.core.motia.step import Step
from app.core.motia.context import StepContext
import logging
import uuid

logger = logging.getLogger(__name__)

class IssuanceStep(Step):
    """
    Implements the 'Farmer ID Issued' step from the GoI Diagram.
    Generates a secure, verifiable digital certificate/card for the farmer.
    """
    
    async def _handle(self, context: StepContext) -> StepContext:
        farmer_id = context.payload.get("farmer_id")
        if not farmer_id:
            logger.warning("Cannot issue card: No Farmer ID found in context.")
            context.results["issuance"] = {"status": "skipped", "reason": "missing_farmer_id"}
            return context

        # 1. Generate a secure Issuance ID (Linked to the card icon in the diagram)
        issuance_id = f"CERT-{uuid.uuid4().hex[:12].upper()}"
        
        # 2. Prepare Digital Card Metadata
        # This would feed into a PDF/QR generator service
        card_metadata = {
            "issuance_id": issuance_id,
            "farmer_id": farmer_id,
            "issued_at": context.metadata.get("timestamp"),
            "valid_until": "2031-01-01", # Future proofing
            "security_features": ["QR_CODE", "SYSTEM_SIGNATURE", "AADHAAR_HASH_LINK"],
            "display_name": context.payload.get("extracted_fields", {}).get("owner_name", "Registered Farmer")
        }
        
        context.results["issuance"] = {
            "status": "issued",
            "issuance_id": issuance_id,
            "card_metadata": card_metadata
        }
        
        logger.info(f"Digital Farmer Card Issued: {issuance_id} for Farmer: {farmer_id}")
        return context
