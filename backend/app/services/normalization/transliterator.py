from typing import Optional
import re

class UrduTransliterator:
    """Transliterate Urdu text to English using phonetic mapping"""
    
    # Urdu to English phonetic mapping
    URDU_TO_ENGLISH = {
        # Vowels
        'ا': 'a', 'آ': 'aa', 'ع': 'a',
        'ی': 'i', 'ے': 'e',
        'و': 'o', 'ؤ': 'o',
        'ئ': 'i',
        
        # Consonants
        'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't',
        'ث': 's', 'ج': 'j', 'چ': 'ch',
        'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ڈ': 'd', 'ذ': 'z',
        'ر': 'r', 'ڑ': 'r', 'ز': 'z',
        'ژ': 'zh', 'س': 's', 'ش': 'sh',
        'ص': 's', 'ض': 'z',
        'ط': 't', 'ظ': 'z',
        'غ': 'gh', 'ف': 'f',
        'ق': 'q', 'ک': 'k', 'گ': 'g',
        'ل': 'l', 'م': 'm', 'ن': 'n',
        'ں': 'n', 'ه': 'h', 'ھ': 'h',
        'ء': '',
        
        # Diacritics (mostly ignored in simple transliteration)
        'َ': '', 'ُ': '', 'ِ': '', 'ّ': '', 'ً': '', 'ٌ': '', 'ٍ': '',
        
        # Special characters
        '۔': '.', '،': ',', '؛': ';', '؟': '?',
        
        # Numbers
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    }
    
    # Common name patterns for better transliteration
    COMMON_NAMES = {
        'محمد': 'Muhammad',
        'احمد': 'Ahmad',
        'علی': 'Ali',
        'حسین': 'Hussain',
        'حسن': 'Hassan',
        'فاطمہ': 'Fatima',
        'عائشہ': 'Ayesha',
        'خدیجہ': 'Khadija',
        'عمر': 'Umar',
        'عثمان': 'Usman',
        'ابوبکر': 'Abu Bakr',
        'یوسف': 'Yusuf',
        'ابراہیم': 'Ibrahim',
        'اسماعیل': 'Ismail',
        'عبدالرحمن': 'Abdul Rahman',
        'عبداللہ': 'Abdullah',
    }
    
    def transliterate(self, urdu_text: str, use_common_names: bool = True) -> str:
        """
        Transliterate Urdu text to English
        
        Args:
            urdu_text: Urdu text to transliterate
            use_common_names: Use predefined mappings for common names
        
        Returns:
            Transliterated English text
        """
        if not urdu_text:
            return ""
        
        # Check for common names first
        if use_common_names:
            urdu_text_clean = urdu_text.strip()
            if urdu_text_clean in self.COMMON_NAMES:
                return self.COMMON_NAMES[urdu_text_clean]
        
        # Character-by-character transliteration
        result = []
        for char in urdu_text:
            if char in self.URDU_TO_ENGLISH:
                result.append(self.URDU_TO_ENGLISH[char])
            elif char.isspace():
                result.append(' ')
            elif char.isdigit() or char.isascii():
                result.append(char)
            # Skip unknown Urdu characters
        
        # Join and clean up
        transliterated = ''.join(result)
        
        # Clean up multiple spaces and capitalize words
        transliterated = re.sub(r'\s+', ' ', transliterated).strip()
        transliterated = self._capitalize_names(transliterated)
        
        return transliterated
    
    def _capitalize_names(self, text: str) -> str:
        """Capitalize each word in the name"""
        return ' '.join(word.capitalize() for word in text.split())
    
    def transliterate_batch(self, texts: list) -> list:
        """Transliterate a batch of texts"""
        return [self.transliterate(text) for text in texts]
