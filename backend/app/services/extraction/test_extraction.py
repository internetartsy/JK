#!/usr/bin/env python3
"""
Simple test script for field extraction
Run: python -m app.services.extraction.test_extraction
"""

from app.services.extraction.extraction_service import FieldExtractionService
from app.services.extraction.test_data import GIRDAWARI_SAMPLE, KHASRA_SAMPLE
import json

def test_girdawari():
    print("=" * 60)
    print("Testing Girdawari Extraction")
    print("=" * 60)
    
    service = FieldExtractionService()
    result = service.extract_fields(GIRDAWARI_SAMPLE, "girdawari")
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()

def test_khasra():
    print("=" * 60)
    print("Testing Khasra Extraction")
    print("=" * 60)
    
    service = FieldExtractionService()
    result = service.extract_fields(KHASRA_SAMPLE, "khasra")
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()

def test_supported_types():
    print("=" * 60)
    print("Supported Document Types")
    print("=" * 60)
    
    service = FieldExtractionService()
    print(service.get_supported_doc_types())
    print()

if __name__ == "__main__":
    test_supported_types()
    test_girdawari()
    test_khasra()
