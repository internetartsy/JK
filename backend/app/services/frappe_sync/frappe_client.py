import os
import requests
import urllib.parse
import json
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class FrappeClient:
    """Client for communicating with Frappe API"""
    
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        self.base_url = base_url or os.getenv("FRAPPE_URL", "http://frappe:8000")
        self.api_key = api_key or os.getenv("FRAPPE_API_KEY")
        self.api_secret = api_secret or os.getenv("FRAPPE_API_SECRET")
        
        self.session = requests.Session()
        if self.api_key and self.api_secret:
            self.session.headers.update({
                "Authorization": f"token {self.api_key}:{self.api_secret}"
            })
    
    def get_doc(self, doctype: str, name: str) -> Dict[str, Any]:
        """Get a single document from Frappe"""
        url = f"{self.base_url}/api/resource/{doctype}/{name}"
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.json().get("data", {})
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {doctype} {name}: {e}")
            return {}
    
    def get_list(self, doctype: str, fields: Optional[List[str]] = None, filters: Optional[Dict] = None, limit: int = 100) -> List[Dict]:
        """Get list of documents from Frappe"""
        url = f"{self.base_url}/api/resource/{doctype}"
        params = {"limit_page_length": limit}
        
        if fields:
            params["fields"] = json.dumps(fields)
        if filters:
            params["filters"] = json.dumps(filters)
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {doctype} list: {e}")
            return []
    
    
    
    def create_doc(self, doctype: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document in Frappe"""
        safe_doctype = urllib.parse.quote(doctype)
        url = f"{self.base_url}/api/resource/{safe_doctype}"
        try:
            # Force headers to avoid Expect: 100-continue issues
            headers = {
                "Content-Type": "application/json",
                "Expect": "" # Disable Expect header
            }
            # Use data=json.dumps to be 100% sure of serialization
            response = self.session.post(url, data=json.dumps(data), headers=headers)
            
            try:
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                # Capture body for 417/400 errors
                logger.error(f"Frappe Create Error: {e} | Url: {url} | Body: {response.text}")
                raise e

            return response.json().get("data") or {}
        except Exception as e:
             # Fallback logger if re-raised
             logger.error(f"Error creating {doctype}: {e}")
             return {"error": str(e)}
    
    def update_doc(self, doctype: str, name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing document in Frappe"""
        url = f"{self.base_url}/api/resource/{doctype}/{name}"
        try:
            response = self.session.put(url, json=data)
            response.raise_for_status()
            return response.json().get("data", {})
        except requests.exceptions.RequestException as e:
            logger.error(f"Error updating {doctype} {name}: {e}")
            return {"error": str(e)}
    
    def delete_doc(self, doctype: str, name: str) -> bool:
        """Delete a document from Frappe"""
        url = f"{self.base_url}/api/resource/{doctype}/{name}"
        try:
            response = self.session.delete(url)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error deleting {doctype} {name}: {e}")
            return False
    
    def create_review_task(self, doc_id: str, doc_type: str, confidence: float, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Create a ReviewTask in Frappe for low-confidence records"""
        data = {
            "source_document_id": doc_id,
            "document_type": doc_type,
            "ocr_confidence": confidence,
            "extracted_data": fields,
            "status": "Pending"
        }
        return self.create_doc("Review Task", data)

    def attach_file(self, doctype: str, docname: str, file_content: bytes, filename: str, is_private: int = 1) -> Dict[str, Any]:
        """Attach a file to a Frappe Document"""
        url = f"{self.base_url}/api/method/upload_file"
        try:
            # Prepare multipart upload
            files = {'file': (filename, file_content)}
            data = {
                'doctype': doctype,
                'docname': docname,
                'is_private': is_private
            }
            
            response = self.session.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json().get("message", {})
        except requests.exceptions.RequestException as e:
            logger.error(f"Error attaching file to {doctype} {docname}: {e}")
            return {"error": str(e)}
