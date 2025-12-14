import logging
from typing import Dict, Optional
import os
from deep_translator import GoogleTranslator, LibreTranslator

# Configure logger
logger = logging.getLogger(__name__)

class TranslationService:
    """
    Service to handle translation of Urdu text to English.
    Uses LibreTranslate (if configured) or GoogleTranslator (fallback),
    with a dictionary for common Land Record terms.
    """
    
    def __init__(self):
        self._translator = None
        self._translator_type = None # 'libre' or 'google'
        
        # Env Configuration
        self.libre_url = os.getenv("LIBRETRANSLATE_URL")
        self.libre_key = os.getenv("LIBRETRANSLATE_API_KEY")

        # Urdu to Roman Character Map (Transliteration Fallback)
        self.urdu_char_map = {
            'ا': 'a', 'آ': 'aa', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's',
            'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ڈ': 'd', 'ذ': 'z',
            'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
            'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
            'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'و': 'w',
            'ہ': 'h', 'ھ': 'h', 'ء': "'", 'ی': 'y', 'ے': 'e', ' ': ' ',
            '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
        }
        
        # Static Dictionary for high-confidence term mapping
        self.term_mapping = {
            "کاشت": "Cultivator",
            "کاشتکار": "Cultivator",
            "مالک": "Owner",
            "ولد": "S/o",
            "پسر": "S/o",
            "pisar": "S/o",
            "dukhtar": "D/o",
            "دخت": "D/o",
            "دختر": "D/o",
            "زوجہ": "W/o",
            "zoja": "W/o",
            "بيوہ": "Widow",
            "widow": "Widow",
            "ساکن": "Resident of",
            "sakin": "Resident of",
            "sakindeh": "Resident of",
            "alati": "Allottee",
            "قوم": "Caste",
            "kaum": "Caste",
            "حصہ": "Share",
            "خسرہ": "Khasra",
            "نمبر": "Number",
            "رقبہ": "Area",
            "کنال": "Kanal",
            "مرلہ": "Marla",
            "خریف": "Kharif",
            "ربیع": "Rabi",
            "چاہی": "Irrigated",
            "بارانی": "Rainfed",
            "غیر ممکن": "Uncultivable",
            "بنجر": "Barren",
            "آبادی": "Population/Abadi",
            "سرکار": "Government",
            "شاملات": "Common Land",
            "gair morosi": "Non-Occupancy Tenant",
            "hibba": "Gift",
            "bayaan": "Seller",
            "mushtari": "Buyer",
            "wahib": "Gifter",
            "mohoob allya": "Receiver of Gift",
        }

    @property
    def translator(self):
        if not self._translator:
            try:
                if self.libre_url:
                    logger.info(f"Initializing LibreTranslate at {self.libre_url}")
                    self._translator = LibreTranslator(
                        source='ur', 
                        target='en', 
                        base_url=self.libre_url,
                        api_key=self.libre_key
                    )
                    self._translator_type = 'libre'
                else:
                    logger.info("Initializing GoogleTranslator (Fallback)")
                    self._translator = GoogleTranslator(source='ur', target='en')
                    self._translator_type = 'google'
            except Exception as e:
                logger.error(f"Failed to init translator: {e}")
                return None
        return self._translator
    
    def transliterate_text(self, text: str) -> str:
        """
        Convert Urdu characters to Roman English characters (Phonetic Fallback).
        Ensures output is 100% in English script.
        """
        if not text:
            return ""
        
        result = []
        for char in text.strip():
            # Use map or keep original if it's already english/number/symbol
            # Check if char is ASCII/English
            if char.isascii():
                result.append(char)
            else:
                result.append(self.urdu_char_map.get(char, char)) # default to char if no map (risky but better than swallowing)
                
        return "".join(result).title() # Title Case for names

    def translate_text(self, text: str) -> str:
        """
        Translate generic text from Urdu to English.
        First checks the dictionary, then uses Google Translate.
        """
        if not text:
            return ""
            
        clean_text = text.strip()
        
        # 1. Exact Dictionary Match
        if clean_text in self.term_mapping:
            return self.term_mapping[clean_text]
            
        # 2. Partial Dictionary Match (for simple terms mixed in text)
        # Note: This is risky for full sentences, so we do it carefully or skip.
        # Let's try online translation first for names/sentences.
        
        try:
            # Online Translation
            if self.translator:
                # deep_translator unified API usually returns str
                translated = self.translator.translate(clean_text)
                return translated if translated else clean_text
            else:
                 return self.transliterate_text(clean_text)
        except Exception as e:
            logger.warning(f"{self._translator_type} Translation failed for '{clean_text}': {e}")
            # Fallback: Transliterate to ensure English script output
            return self.transliterate_text(clean_text)

    def translate_name(self, name_urdu: str) -> str:
        """
        Specialized method for translating/transliterating names.
        """
        # Names are best handled by the generic translator for now
        # unless we have a specific name database.
        return self.translate_text(name_urdu)

    def map_land_term(self, term: str) -> str:
        """
        Map a specific land term (e.g., tenure type, soil type).
        """
        # Strip and check map
        for urdu, eng in self.term_mapping.items():
            if urdu in term:
                return eng
        return self.translate_text(term)

# Global Instance
translation_service = TranslationService()
