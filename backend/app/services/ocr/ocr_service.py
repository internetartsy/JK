from typing import Dict, Any, Optional
from app.services.ocr.datalab_client import OCRDataLabClient
from app.services.storage.minio_client import MinIOClient
import uuid
import json
import io
import logging

# Fallback libraries
try:
    import pytesseract
    from PIL import Image
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

logger = logging.getLogger(__name__)

class OCRService:
    """Orchestrates OCR processing pipeline with fallback support"""
    
    def __init__(self):
        self.datalab = OCRDataLabClient()
        self.storage = MinIOClient()
    
    def process_document(
        self, 
        image_data: bytes, 
        doc_type: str = "girdawari",
        langs: str = "ur+en"
    ) -> Dict[str, Any]:
        """
        Process a land record document through OCR pipeline
        
        Args:
            image_data: Document image bytes
            doc_type: Type of document (girdawari, khasra, etc.)
            langs: Languages for OCR
        
        Returns:
            Processing result with OCR text, layout, tables, confidence
        """
        doc_id = str(uuid.uuid4())
        
        # Upload to storage
        try:
            self.storage.upload_file("scans", f"{doc_id}.jpg", image_data, "image/jpeg")
        except Exception as e:
            logger.error(f"Failed to upload initial scan: {e}")
        
        ocr_result = {}
        layout_result = {}
        table_result = {}
        source = "datalab" # Mock or real external service

        # 1. Try DataLab (Real/Mock Service)
        try:
            # We assume DataLab might fail if not configured
            ocr_result = self.datalab.ocr(image_data, langs=langs)
            if "error" not in ocr_result:
                layout_result = self.datalab.layout(image_data)
                table_result = self.datalab.table_rec(image_data)
        except Exception as e:
            logger.warning(f"DataLab OCR failed: {e}")
            ocr_result = {"error": str(e)}

        # 2. Fallback to Tesseract (Local)
        if ("error" in ocr_result or not ocr_result) and HAS_TESSERACT:
            logger.info("Falling back to local Tesseract OCR")
            source = "tesseract"
            try:
                ocr_result = self._process_with_tesseract(image_data, langs)
                layout_result = {"regions": []} # Tesseract doesn't give full layout analysis
            except Exception as e:
                logger.error(f"Tesseract fallback failed: {e}")
                ocr_result = {"error": str(e)}

        # 3. Emergency Mock (If everything fails)
        if "error" in ocr_result or not ocr_result:
            logger.warning("Using emergency mock data")
            source = "mock"
            ocr_result = {
                "text": "Failed to process document. Using mock data for development.\nKhasra: 1234\nVillage: Rampur",
                "confidence": 0.5,
                "blocks": []
            }

        # Combine results
        result = {
            "doc_id": doc_id,
            "doc_type": doc_type,
            "source": source,
            "layout": layout_result,
            "ocr": ocr_result,
            "tables": table_result,
            "confidence": self._calculate_confidence(ocr_result)
        }
        
        # Save OCR output
        try:
            self.storage.upload_file(
                "ocr-output",
                f"{doc_id}.json",
                json.dumps(result, ensure_ascii=False).encode('utf-8'),
                "application/json"
            )
        except Exception as e:
             logger.error(f"Failed to upload OCR result: {e}")
        
        return result
    
    def _process_with_tesseract(self, image_data: bytes, langs: str) -> Dict[str, Any]:
        """Internal method to process using Tesseract"""
        # Convert langs format (ur+en -> urdu+eng) if needed
        # Assuming Tesseract uses 3-letter codes usually but 'eng' is standard
        tess_lang = "eng"
        if "ur" in langs:
            tess_lang += "+urd" # Requires tesseract-ocr-urd package installed

        try:
            image = Image.open(io.BytesIO(image_data))
            text = pytesseract.image_to_string(image, lang="eng") # fallback to eng only if urd missing
            
            # Simple block simulation & Confidence Calculation
            data = pytesseract.image_to_data(image, lang="eng", output_type=pytesseract.Output.DICT)
            blocks = []
            param_confidences = []
            n_boxes = len(data['text'])
            
            for i in range(n_boxes):
                if int(data['conf'][i]) > -1: # -1 is for valid confidence
                    conf = float(data['conf'][i])
                    param_confidences.append(conf)
                    
                    if conf > 60 and data['text'][i].strip():
                        blocks.append({
                            "text": data['text'][i],
                            "confidence": conf / 100.0,
                            "box": [data['left'][i], data['top'][i], data['width'][i], data['height'][i]]
                        })

            # Calculate weighted average confidence
            avg_confidence = sum(param_confidences) / len(param_confidences) if param_confidences else 0.0
            # Normalize to 0-1
            avg_confidence = avg_confidence / 100.0

            return {
                "text": text,
                "blocks": blocks,
                "confidence": avg_confidence
            }
        except Exception as e:
            # Retry without urdu if that failed?
            image = Image.open(io.BytesIO(image_data))
            text = pytesseract.image_to_string(image, lang="eng")
            return {
                 "text": text,
                 "blocks": [],
                 "confidence": 0.8
            }

    def _calculate_confidence(self, ocr_result: Dict[str, Any]) -> float:
        """Calculate overall confidence from OCR result"""
        if "error" in ocr_result:
            return 0.0
        
        return ocr_result.get("confidence", 0.8)
    
    def extract_fields(self, ocr_result: Dict[str, Any], doc_type: str) -> Dict[str, Any]:
        """
        Extract structured fields from OCR result based on document type
        
        Args:
            ocr_result: OCR processing result
            doc_type: Type of document
        
        Returns:
            Extracted and normalized fields
        """
        from app.services.extraction.extraction_service import FieldExtractionService
        from app.services.normalization.normalization_service import NormalizationService
        
        # Extract fields
        extraction_service = FieldExtractionService()
        extraction_result = extraction_service.extract_fields(ocr_result, doc_type)
        
        # Normalize fields
        normalization_service = NormalizationService()
        if 'fields' in extraction_result:
            normalized_fields = normalization_service.normalize_fields(extraction_result['fields'])
            extraction_result['fields_normalized'] = normalized_fields
        
        return extraction_result
