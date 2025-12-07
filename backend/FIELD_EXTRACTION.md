# Field Extraction Patterns

This document describes the regex patterns used for extracting fields from Urdu land record documents.

## Document Types

### 1. Girdawari (Crop Inspection Records)

**Extracted Fields:**
- `khasra_number`: Plot number
- `village`: Village name
- `owner_name`: Owner name
- `father_name`: Father's name
- `cultivator_name`: Cultivator name
- `area`: Cultivated area
- `area_unit`: Unit (kanal, marla, acre)
- `crop`: Crop name
- `season`: Kharif/Rabi
- `irrigation`: Irrigation type (canal, tubewell, rainfed)
- `date`: Inspection date

**Pattern Examples:**
```
خسرہ نمبر: 123/2        → khasra_number: "123/2"
گاؤں: چک نمبر 45       → village: "چک نمبر 45"
مالک: محمد احمد         → owner_name: "محمد احمد"
ولد: عبدالرحمن         → father_name: "عبدالرحمن"
رقبہ: 25 کنال          → area: 25.0, area_unit: "kanal"
فصل: گندم               → crop: "گندم"
```

### 2. Khasra (Land Record)

**Extracted Fields:**
- `khasra_number`: Plot number
- `village`: Village name
- `halqa`: Halqa identifier
- `owner_names`: List of owner names
- `total_area`: Total plot area
- `area_unit`: Unit
- `khata_number`: Account number
- `hadbast_number`: Revenue survey number

**Pattern Examples:**
```
خسرہ نمبر: 456         → khasra_number: "456"
مالکان: احمد، حسین      → owner_names: ["احمد", "حسین"]
کل رقبہ: 50 کنال       → total_area: 50.0, area_unit: "kanal"
```

## Regex Patterns

### Common Patterns

**Khasra Number:**
```python
r'(?:خسرہ|khasra|plot)[\s:]+(\d+(?:[/-]\d+)*)'
```

**Village:**
```python
r'(?:گاؤں|village|mouza|مؤضع)[\s:]+([^\d\n]+?)(?:\s|$|،)'
```

**Area:**
```python
r'(?:رقبہ|area|رقبه)[\s:]+(\d+\.?\d*)'
r'(\d+\.?\d*)\s*(?:کنال|marla|kanal)'
```

**Names:**
```python
r'(?:مالک|owner|malik)[\s:]+([^\d\n]+?)(?:ولد|s/o|w/o|d/o|\n|$)'
r'(?:ولد|والد|s/o|son of)[\s:]+([^\d\n]+?)(?:\n|$|،|,)'
```

## Confidence Calculation

Confidence is calculated based on:
1. OCR confidence (40% weight)
2. Field extraction success rate (60% weight)

```python
field_confidence = non_null_fields / total_fields
final_confidence = (field_confidence * 0.6) + (ocr_confidence * 0.4)
```

## Adding New Document Types

To add a new document type extractor:

1. Create a new extractor class inheriting from `BaseFieldExtractor`
2. Implement the `extract()` method
3. Add field-specific extraction methods (e.g., `_extract_field_name()`)
4. Register the extractor in `FieldExtractionService`

Example:
```python
from app.services.extraction.base_extractor import BaseFieldExtractor

class MutationExtractor(BaseFieldExtractor):
    def extract(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        # Implementation
        pass
```

## Known Limitations

1. **Urdu Text Segmentation**: Names containing special characters may be incorrectly split
2. **Mixed Scripts**: Documents with mixed Urdu/English may have inconsistent extraction
3. **Handwriting Variation**: Handwritten documents have lower accuracy
4. **Table Extraction**: Complex multi-column tables need specialized handling

## Improvements

Future improvements:
- [ ] LLM-based extraction for low-confidence fields
- [ ] Named Entity Recognition (NER) for Urdu
- [ ] Contextual validation (e.g., crop-season coherence)
- [ ] Learning from human corrections
