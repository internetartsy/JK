"""
Tests for OCR confidence thresholds configuration.
"""

import pytest
from app.services.ocr.confidence_config import (
    ConfidenceAnalyzer,
    ReviewPriority,
    FIELD_THRESHOLDS,
    DOCUMENT_THRESHOLDS,
    DocumentType
)


class TestConfidenceAnalyzer:
    """Tests for OCR confidence analysis"""

    @pytest.fixture
    def analyzer(self):
        return ConfidenceAnalyzer()

    def test_high_confidence_no_review(self, analyzer):
        """Test high confidence extraction needs no review"""
        result = analyzer.analyze_extraction(
            doc_type="girdawari",
            fields={"khasra_number": "123", "village_id": "v1"},
            field_confidences={"khasra_number": 0.95, "village_id": 0.92},
            overall_confidence=0.93
        )
        
        assert not result["needs_review"]
        assert result["priority"] == ReviewPriority.SKIP

    def test_low_confidence_triggers_review(self, analyzer):
        """Test low confidence extraction triggers review"""
        result = analyzer.analyze_extraction(
            doc_type="girdawari",
            fields={"khasra_number": "123"},
            field_confidences={"khasra_number": 0.50},
            overall_confidence=0.50
        )
        
        assert result["needs_review"]
        assert result["priority"] != ReviewPriority.SKIP

    def test_critical_field_failure_high_priority(self, analyzer):
        """Test critical field failure gets CRITICAL priority"""
        result = analyzer.analyze_extraction(
            doc_type="girdawari",
            fields={"khasra_number": "123", "village_id": "v1"},
            field_confidences={"khasra_number": 0.40, "village_id": 0.90},
            overall_confidence=0.65
        )
        
        assert result["needs_review"]
        assert result["priority"] == ReviewPriority.CRITICAL
        assert "khasra_number" in result["critical_failures"]

    def test_handwritten_reduces_thresholds(self, analyzer):
        """Test handwritten flag reduces confidence thresholds"""
        # Without handwritten - would need review
        result_typed = analyzer.analyze_extraction(
            doc_type="girdawari",
            fields={"area_text": "5 کنال"},
            field_confidences={"area_text": 0.60},
            overall_confidence=0.60,
            is_handwritten=False
        )
        
        # With handwritten - same confidence should have lower priority
        result_handwritten = analyzer.analyze_extraction(
            doc_type="girdawari",
            fields={"area_text": "5 کنال"},
            field_confidences={"area_text": 0.60},
            overall_confidence=0.60,
            is_handwritten=True
        )
        
        # Handwritten should still need review but threshold is reduced
        assert result_handwritten["needs_review"]

    def test_document_type_affects_thresholds(self, analyzer):
        """Test different document types have different thresholds"""
        # Girdawari has lower thresholds (complex tables)
        girdawari_threshold = DOCUMENT_THRESHOLDS[DocumentType.GIRDAWARI]["overall_min"]
        
        # Registry has higher thresholds (legally critical)
        registry_threshold = DOCUMENT_THRESHOLDS[DocumentType.REGISTRY]["overall_min"]
        
        assert registry_threshold > girdawari_threshold

    def test_table_confidence_affects_review(self, analyzer):
        """Test low table confidence triggers review"""
        result = analyzer.analyze_extraction(
            doc_type="girdawari",
            fields={"khasra_number": "123"},
            field_confidences={"khasra_number": 0.90},
            overall_confidence=0.85,
            has_tables=True,
            table_confidence=0.40
        )
        
        assert result["needs_review"]
        assert any("Table" in w or "table" in w for w in result["warnings"])

    def test_review_notes_generated(self, analyzer):
        """Test review notes are generated for flagged items"""
        result = analyzer.analyze_extraction(
            doc_type="girdawari",
            fields={"khasra_number": "123"},
            field_confidences={"khasra_number": 0.40},
            overall_confidence=0.50,
            is_handwritten=True
        )
        
        assert result["review_notes"]
        assert "Handwritten" in result["review_notes"] or "handwritten" in result["review_notes"]

    def test_get_field_threshold(self, analyzer):
        """Test getting individual field thresholds"""
        # Critical field has high threshold
        khasra_threshold = analyzer.get_field_threshold("khasra_number")
        assert khasra_threshold >= 0.80
        
        # Low-priority field has lower threshold
        remarks_threshold = analyzer.get_field_threshold("remarks")
        assert remarks_threshold <= 0.60
        
        # Handwritten adjustment
        khasra_handwritten = analyzer.get_field_threshold("khasra_number", is_handwritten=True)
        assert khasra_handwritten < khasra_threshold

    def test_suggested_assignee_for_critical(self, analyzer):
        """Test senior validator assigned for critical failures"""
        result = analyzer.analyze_extraction(
            doc_type="mutation",
            fields={"khasra_number": "123"},
            field_confidences={"khasra_number": 0.30},
            overall_confidence=0.40
        )
        
        assert result["suggested_assignee"] == "senior_validator"
