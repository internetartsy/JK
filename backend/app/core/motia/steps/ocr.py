from app.core.motia.step import Step
from app.core.motia.context import StepContext
from app.services.ocr.ocr_service import OCRService

class OCRStep(Step):
    """Processes document through OCR engine"""
    
    async def _handle(self, context: StepContext) -> StepContext:
        binary_data = context.payload.get("binary_data")
        if not binary_data:
            raise ValueError("No binary data available for OCR")
            
        langs = self.config.get("langs", "ur+en")
        doc_type = context.doc_type
        
        ocr_service = OCRService()
        result = ocr_service.process_document(binary_data, doc_type=doc_type, langs=langs)
        
        context.payload["ocr_result"] = result
        context.results["ocr"] = {
            "confidence": result.get("confidence", 0.0),
            "engine": "tesseract/ai"
        }
        return context
