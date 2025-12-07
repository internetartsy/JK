"""
Sample test data for field extraction testing
"""

# Sample Girdawari OCR result (simulated)
GIRDAWARI_SAMPLE = {
    "ocr": {
        "text": """
خسرہ نمبر: 123/2
گاؤں: چک نمبر 45
مالک: محمد احمد ولد: عبدالرحمن
کاشتکار: احمد علی ولد: محمد حسین
رقبہ: 25 کنال
فصل: گندم
خریف
نہری
تاریخ: 15/03/2024
        """
    },
    "confidence": 0.85
}

# Sample Khasra OCR result (simulated)
KHASRA_SAMPLE = {
    "ocr": {
        "text": """
خسرہ نمبر: 456
گاؤں: موضع رحیم پور
حلقہ: 12-A
مالکان: محمد یوسف، احمد حسین، فاطمہ بیگم
کل رقبہ: 50 کنال
کھاتہ نمبر: 789
حدباست: 2015
        """
    },
    "confidence": 0.82
}
