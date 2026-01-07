from typing import Dict, Any, Optional
import os
import json
import logging
try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

class GeminiService:
    """
    Service to handle intelligent parsing and transliteration of Land Records using Google Gemini.
    Replaces regex-based extraction with LLM structural understanding.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not found. Gemini Service disabled.")
            self.model = None
            return

        if not genai:
             logger.error("google-generativeai library not installed.")
             self.model = None
             return

        try:
            genai.configure(api_key=self.api_key)
            # Use Gemini 1.5 Flash for speed and cost efficiency
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("Gemini Service Initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            self.model = None

    def translate_and_parse(self, ocr_text: str) -> Dict[str, Any]:
        """
        Parses raw Urdu OCR text into structured Jamabandi JSON.
        """
        if not self.model:
            return {"error": "Gemini not initialized"}

        prompt = f"""
        You are an expert in Indian Land Records (Jamabandi/Girdawari) and Urdu-to-English translation.
        
        Task: Parse the following Urdu OCR text snippet from a Jamabandi document into structured JSON.
        
        OCR Text:
        Running Text: "{ocr_text}"
        
        Requirements:
        1. Extract the 'Owner' (Malik) and 'Cultivator' (Kashtakar) details.
        2. Strictly split the person strings into:
           - Name (English)
           - Relation (S/o, D/o, W/o)
           - Parent Name (English)
           - Caste (English)
           - Residence (English)
           - Remarks (e.g. Gair Morosi, Hissadar)
        3. Extract 'Khasra Number' and 'Area'.
        4. If Khasra has multiple numbers (e.g. "155, 156"), return them as a list.
        5. Output strictly JSON format. No markdown, no commentary.
        
        Output JSON Schema:
        {{
            "khasra_numbers": ["123", "124"],
            "owner": {{
                "name": "...",
                "relation": "S/o",
                "parent": "...",
                "caste": "...",
                "residence": "..."
            }},
            "cultivator": {{
                "name": "...",
                "relation": "...", 
                "parent": "...",
                "caste": "...",
                "residence": "...",
                "status": "..." 
            }},
            "area": "...",
            "village": "..." 
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            # Sanitize response
            raw_json = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(raw_json)
        except Exception as e:
            logger.error(f"Gemini Parsing Failed: {e}")
            return {"error": str(e)}

# Global Instance
gemini_service = GeminiService()
