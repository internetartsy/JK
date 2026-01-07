from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.services.frappe_sync.sync_service import FrappeSyncService

class RegistrySyncStep(Step):
    """Syncs extracted data to the legal System of Record (Frappe)"""
    
    async def _handle(self, context: StepContext) -> StepContext:
        fields = context.payload.get("extracted_fields")
        binary_data = context.payload.get("binary_data")
        
        frappe_sync = FrappeSyncService()
        
        # Determine sync workflow based on doc_type
        farmer_id = context.payload.get("farmer_id")
        
        if context.doc_type.lower() in ["mutation", "registry", "transfer", "sale"]:
            result = frappe_sync.sync_transfer_to_frappe(
                doc_id=context.document_1d,
                fields=fields,
                file_content=binary_data,
                provided_farmer_id=farmer_id
            )
        else:
            # Standard Review Routing for Girdawari/Jamabandi
            ocr_result = context.payload.get("ocr_result", {})
            result = frappe_sync.analyze_and_route_review(
                doc_id=context.document_1d,
                doc_type=context.doc_type,
                fields=fields,
                field_confidences=ocr_result.get("field_confidences", {}),
                overall_confidence=ocr_result.get("confidence", 0.0),
                file_content=binary_data,
                provided_farmer_id=farmer_id
            )
            
        context.results["registry_sync"] = result
        return context
