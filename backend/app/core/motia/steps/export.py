from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.services.transmission_service import transmission_service
import logging
import json
import hashlib
from datetime import datetime

logger = logging.getLogger(__name__)

class NationalExportStep(Step):
    """
    Implements the 'Create Data Buckets (JSON)' step from the GoI Diagram.
    Maps internal system state to the National AgriStack Interoperability Schema.
    """
    
    async def _handle(self, context: StepContext) -> StepContext:
        farmer_id = context.payload.get("farmer_id")
        ulpins = context.payload.get("ulpins", [])
        fields = context.payload.get("extracted_fields", {})
        
        # 1. Generate National Schema Snapshot
        national_schema = {
            "version": "1.0-AgriStack",
            "timestamp": datetime.utcnow().isoformat(),
            "farmer_record": {
                "farmer_registry_id": farmer_id,
                "name": fields.get("owner_name"),
                "father_name": fields.get("father_name"),
                "aadhaar_verified": context.results.get("aadhaar_auth", {}).get("status") == "verified",
                "land_holdings": [
                    {
                        "ulpin": ulpin,
                        "village_code": fields.get("village_id"),
                        "khasra_number": fields.get("khasra_number"),
                        "status": "digitized_ocr"
                    } for ulpin in ulpins
                ]
            },
            "provenance": {
                "source_doc_1d": context.document_1d,
                "ocr_confidence": context.results.get("ocr", {}).get("confidence"),
                "digital_signature": hashlib.sha256(str(context.document_1d).encode()).hexdigest()
            }
        }
        
        # 2. Transmit to Government Funnel
        transmission_result = await transmission_service.transmit_bucket(
            document_1d=context.document_1d,
            payload=national_schema
        )
        
        # 3. Store Results
        context.results["national_export"] = {
            "status": transmission_result.get("status"),
            "transmission_id": transmission_result.get("transmission_id"),
            "schema": "AgriStack_v1",
            "payload": national_schema
        }
        
        logger.info(f"AgriStack Transmission {transmission_result.get('status')} for Doc1D: {context.document_1d}")
        return context
