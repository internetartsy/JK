from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.services.ocr.ocr_service import OCRService

class ExtractionStep(Step):
    """Extracts structured fields from OCR result using Hybrid (Regex/AI) logic"""
    
    async def _handle(self, context: StepContext) -> StepContext:
        ocr_result = context.payload.get("ocr_result")
        if not ocr_result:
            raise ValueError("No OCR result available for extraction")
            
        ocr_service = OCRService()
        fields = ocr_service.extract_fields(ocr_result, context.doc_type)
        
        context.payload["extracted_fields"] = fields
        context.results["extraction"] = {
            "source": ocr_result.get("source", "legacy_regex"),
            "field_count": len(fields)
        }
        return context
