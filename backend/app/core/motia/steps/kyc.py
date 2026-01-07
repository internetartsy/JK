from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.services.farmer_id_generator import FarmerIDGenerator
from app.db.session import SessionLocal
import logging

logger = logging.getLogger(__name__)

class KYCVerificationStep(Step):
    """
    Convergence Step: Links RoR Extracted Data with Aadhaar/KYC identity.
    Triggers the generation of the Unique Farmer ID.
    """
    
    async def _handle(self, context: StepContext) -> StepContext:
        fields = context.payload.get("extracted_fields", {})
        aadhaar_hash = context.payload.get("aadhaar_hash")
        aadhaar_verified = context.payload.get("aadhaar_verified", False)
        
        # 1. Use FarmerIDGenerator to consolidate and generate IDs
        generator = FarmerIDGenerator()
        
        with SessionLocal() as db:
            # We use the document_1d to find/create the link
            # In the diagram, this is "Create Data Buckets" -> "Farmer ID Issued"
            
            try:
                # If we have extracted owner info and optionally Aadhaar
                owner_name = fields.get("owner_name")
                father_name = fields.get("father_name")
                
                # Consolidate holdings (mirrors the 'Data Buckets' logic)
                farmer_id, ulpins = generator.consolidate_landholdings(
                    db=db,
                    ror_numbers=[context.document_1d], # Using doc_id as RoR ref for now
                    aadhaar_hash=aadhaar_hash if aadhaar_verified else None,
                    owner_name=owner_name,
                    auto_create_farmer=True
                )
                
                context.payload["farmer_id"] = farmer_id
                context.payload["ulpins"] = ulpins
                
                context.results["kyc_verification"] = {
                    "status": "success",
                    "farmer_id": farmer_id,
                    "ulpins_linked": ulpins,
                    "method": "automated_linkage"
                }
            except Exception as e:
                logger.error(f"KYC Verification failed: {e}")
                context.results["kyc_verification"] = {"status": "failed", "error": str(e)}
                
        return context
