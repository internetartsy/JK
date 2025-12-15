import logging
from app.services.translation.translation_service import TranslationService

# Setup
logging.basicConfig(level=logging.WARN)
service = TranslationService()

# 1. Test basic transliteration directly
urdu_text = "محمد اسلم"
roman = service.transliterate_text(urdu_text)
print(f"Direct Transliteration: '{urdu_text}' -> '{roman}'")

# 2. Test Fallback (by forcing failure or assuming offline)
# We can simulate offline by just calling transliterate if API key missing, 
# but let's test the 'translate_text' method behavior when it hits the 'else' block
# or exception. 
# Since we haven't set API key, it might default to Google.
# Let's trust 'transliterate_text' logic first.

expected = "Mhmd Aslm" # Based on our simple map
if roman.replace(" ", "").lower() == expected.replace(" ", "").lower():
    print("SUCCESS: Transliteration Verified.")
else:
    print(f"WARNING: Output '{roman}' differs from expected '{expected}'")

# 3. Test Revenue Term
term = "کاشت"
translated = service.translate_text(term)
print(f"Dictionary Term: '{term}' -> '{translated}' (Should be 'Cultivator')")
