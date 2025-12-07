from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
import re

class BaseFieldExtractor(ABC):
    """Base class for field extractors"""
    
    @abstractmethod
    def extract(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract fields from OCR result"""
        pass
    
    def _extract_text_blocks(self, ocr_result: Dict[str, Any]) -> List[str]:
        """Extract text blocks from OCR result"""
        # Handle different OCR result formats
        if "text" in ocr_result:
            return [ocr_result["text"]]
        elif "blocks" in ocr_result:
            return [block.get("text", "") for block in ocr_result["blocks"]]
        elif "pages" in ocr_result:
            texts = []
            for page in ocr_result["pages"]:
                if "text" in page:
                    texts.append(page["text"])
                elif "blocks" in page:
                    texts.extend([block.get("text", "") for block in page["blocks"]])
            return texts
        return []
    
    def _extract_with_pattern(self, text: str, pattern: str, group: int = 1) -> Optional[str]:
        """Extract text using regex pattern"""
        match = re.search(pattern, text, re.IGNORECASE | re.UNICODE)
        if match:
            return match.group(group).strip()
        return None
    
    def _extract_number(self, text: str) -> Optional[float]:
        """Extract numeric value from text"""
        # Remove common Urdu/English number separators
        text = text.replace(",", "").replace("٫", "")
        
        # Try to find decimal or integer number
        match = re.search(r'(\d+\.?\d*)', text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return None
    
    def _calculate_confidence(self, extracted_fields: Dict[str, Any], ocr_confidence: float) -> float:
        """Calculate overall confidence based on extracted fields and OCR confidence"""
        # Count non-null fields
        non_null_fields = sum(1 for v in extracted_fields.values() if v is not None)
        total_fields = len(extracted_fields)
        
        if total_fields == 0:
            return 0.0
        
        # Combine field extraction success rate with OCR confidence
        field_confidence = non_null_fields / total_fields
        return (field_confidence * 0.6) + (ocr_confidence * 0.4)
