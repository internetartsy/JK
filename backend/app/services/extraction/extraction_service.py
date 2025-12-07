from typing import Dict, Any
from app.services.extraction.base_extractor import BaseFieldExtractor
from app.services.extraction.girdawari_extractor import GirdawariExtractor
from app.services.extraction.khasra_extractor import KhasraExtractor
from app.services.extraction.ai_extractor import AIFieldExtractor

class FieldExtractionService:
    """Service to extract structured fields from OCR results based on document type"""
    
    def __init__(self):
        self.extractors: Dict[str, BaseFieldExtractor] = {
            "girdawari": GirdawariExtractor(),
            "khasra": KhasraExtractor(),
            "ai": AIFieldExtractor(),
            # Add more extractors as needed
        }
    
    def extract_fields(self, ocr_result: Dict[str, Any], doc_type: str) -> Dict[str, Any]:
        """
        Extract fields from OCR result based on document type
        
        Args:
            ocr_result: OCR processing result
            doc_type: Type of document (girdawari, khasra, mutation, etc.)
        
        Returns:
            Extracted fields with confidence scores
        """
        extractor = self.extractors.get(doc_type.lower())
        
        if not extractor:
            # Return empty fields if no extractor found
            return {
                "fields": {},
                "confidence": 0.0,
                "source": "no_extractor",
                "error": f"No extractor available for document type: {doc_type}"
            }
        
        try:
            return extractor.extract(ocr_result)
        except Exception as e:
            return {
                "fields": {},
                "confidence": 0.0,
                "source": f"{doc_type}_extractor",
                "error": str(e)
            }
    
    def get_supported_doc_types(self) -> list:
        """Get list of supported document types"""
        return list(self.extractors.keys())
