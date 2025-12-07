import os
import requests
from typing import Optional, Dict, Any

class OCRDataLabClient:
    """Client for OCR DataLab API integration"""
    
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.base_url = base_url or os.getenv("OCR_DATALAB_URL", "http://localhost:8001")
        self.api_key = api_key or os.getenv("OCR_DATALAB_API_KEY", "")
        self.headers = {
            "X-API-Key": self.api_key
        } if self.api_key else {}
    
    def ocr(self, image_data: bytes, langs: str = "ur+en", **kwargs) -> Dict[str, Any]:
        """
        Perform OCR on image data
        
        Args:
            image_data: Image bytes
            langs: Languages for OCR (e.g., 'ur+en' for Urdu and English)
            **kwargs: Additional parameters
        
        Returns:
            OCR result with text, confidence, bounding boxes
        """
        url = f"{self.base_url}/api/v1/ocr"
        
        files = {"file": ("image.jpg", image_data, "image/jpeg")}
        data = {"langs": langs, **kwargs}
        
        try:
            response = requests.post(url, files=files, data=data, headers=self.headers, timeout=120)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
    
    def marker(self, document_data: bytes, use_llm: bool = False, **kwargs) -> Dict[str, Any]:
        """
        Convert document (PDF/image) to markdown using Marker
        
        Args:
            document_data: Document bytes
            use_llm: Whether to use LLM post-processing
            **kwargs: Additional parameters
        
        Returns:
            Markdown conversion result
        """
        url = f"{self.base_url}/api/v1/marker"
        
        files = {"file": ("document.pdf", document_data, "application/pdf")}
        data = {"use_llm": use_llm, **kwargs}
        
        try:
            response = requests.post(url, files=files, data=data, headers=self.headers, timeout=180)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
    
    def table_rec(self, image_data: bytes, **kwargs) -> Dict[str, Any]:
        """
        Perform table recognition on image data
        
        Args:
            image_data: Image bytes
            **kwargs: Additional parameters
        
        Returns:
            Table recognition result
        """
        url = f"{self.base_url}/api/v1/table_rec"
        
        files = {"file": ("image.jpg", image_data, "image/jpeg")}
        
        try:
            response = requests.post(url, files=files, data=kwargs, headers=self.headers, timeout=120)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
    
    def layout(self, image_data: bytes, **kwargs) -> Dict[str, Any]:
        """
        Perform layout analysis on image data
        
        Args:
            image_data: Image bytes
            **kwargs: Additional parameters
        
        Returns:
            Layout analysis result with regions, types, bounding boxes
        """
        url = f"{self.base_url}/api/v1/layout"
        
        files = {"file": ("image.jpg", image_data, "image/jpeg")}
        
        try:
            response = requests.post(url, files=files, data=kwargs, headers=self.headers, timeout=120)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
