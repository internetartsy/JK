#!/usr/bin/env python3
"""
Test script for normalization service
Run: python -m app.services.normalization.test_normalization
"""

from app.services.normalization.transliterator import UrduTransliterator
from app.services.normalization.unit_converter import UnitConverter
from app.services.normalization.crop_taxonomy import CropTaxonomy
from app.services.normalization.normalization_service import NormalizationService
import json

def test_transliteration():
    print("=" * 60)
    print("Testing Urdu Transliteration")
    print("=" * 60)
    
    transliterator = UrduTransliterator()
    
    test_cases = [
        'محمد احمد',
        ' عبدالرحمن',
        'احمد علی',
        'فاطمہ بیگم',
        'گندم',
        'چاول',
        'کنال',
    ]
    
    for urdu_text in test_cases:
        english = transliterator.transliterate(urdu_text)
        print(f"{urdu_text:20s} → {english}")
    print()

def test_unit_conversion():
    print("=" * 60)
    print("Testing Unit Conversion")
    print("=" * 60)
    
    converter = UnitConverter()
    
    test_cases = [
        (25, 'kanal', 'sqm'),
        (100, 'marla', 'kanal'),
        (1, 'acre', 'sqm'),
        (5000, 'sqm', 'kanal'),
    ]
    
    for value, from_unit, to_unit in test_cases:
        converted = converter.convert(value, from_unit, to_unit)
        print(f"{value} {from_unit:10s} = {converted:.2f} {to_unit}")
    print()

def test_crop_taxonomy():
    print("=" * 60)
    print("Testing Crop Taxonomy")
    print("=" * 60)
    
    taxonomy = CropTaxonomy()
    
    test_crops = ['گندم', 'چاول', 'کپاس', 'گنا', 'آلو', 'wheat', 'rice']
    
    for crop in test_crops:
        info = taxonomy.get_crop_info(crop)
        print(f"{crop:15s} → {json.dumps(info, ensure_ascii=False)}")
    print()

def test_full_normalization():
    print("=" * 60)
    print("Testing Full Normalization")
    print("=" * 60)
    
    service = NormalizationService()
    
    # Sample extracted fields
    sample_fields = {
        'khasra_number': '123/2',
        'owner_name': 'محمد احمد',
        'father_name': 'عبدالرحمن',
        'area': 25.0,
        'area_unit': 'kanal',
        'crop': 'گندم',
        'village': 'چک نمبر 45',
    }
    
    normalized = service.normalize_fields(sample_fields)
    
    print(json.dumps(normalized, indent=2, ensure_ascii=False))
    print()

if __name__ == "__main__":
    test_transliteration()
    test_unit_conversion()
    test_crop_taxonomy()
    test_full_normalization()
