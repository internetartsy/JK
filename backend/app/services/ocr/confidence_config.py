"""
OCR Confidence Thresholds Configuration

This module defines tiered confidence thresholds for automatic Review Task routing.
Handwritten Urdu/Arabic text typically has lower OCR accuracy, so we use 
field-specific and context-aware thresholds.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


class ReviewPriority(str, Enum):
    """Priority levels for review tasks"""
    CRITICAL = "critical"    # Must review before any processing
    HIGH = "high"            # Review within 1 hour
    MEDIUM = "medium"        # Review within 24 hours
    LOW = "low"              # Review when convenient
    SKIP = "skip"            # No review needed


class DocumentType(str, Enum):
    """Document types with different confidence profiles"""
    GIRDAWARI = "girdawari"
    KHASRA = "khasra"
    MUTATION = "mutation"
    REGISTRY = "registry"
    FARD = "fard"


@dataclass
class FieldThreshold:
    """Threshold configuration for a specific field"""
    field_name: str
    min_confidence: float           # Below this → automatic review
    warning_confidence: float       # Below this → flag for review
    is_critical: bool = False       # Critical fields require higher accuracy
    requires_transliteration: bool = False  # Urdu fields need transliteration check


# Field-specific thresholds
FIELD_THRESHOLDS: Dict[str, FieldThreshold] = {
    # Critical identification fields - require high accuracy
    "khasra_number": FieldThreshold("khasra_number", 0.85, 0.95, is_critical=True),
    "village_id": FieldThreshold("village_id", 0.80, 0.90, is_critical=True),
    "owner_name": FieldThreshold("owner_name", 0.75, 0.85, is_critical=True, requires_transliteration=True),
    
    # Important area/measurement fields
    "area_kanal": FieldThreshold("area_kanal", 0.80, 0.90),
    "area_marla": FieldThreshold("area_marla", 0.80, 0.90),
    "area_text": FieldThreshold("area_text", 0.70, 0.85, requires_transliteration=True),
    
    # Cultivation/crop fields - moderate accuracy acceptable
    "crop_name": FieldThreshold("crop_name", 0.65, 0.80, requires_transliteration=True),
    "crop_season": FieldThreshold("crop_season", 0.70, 0.85),
    "cultivation_type": FieldThreshold("cultivation_type", 0.65, 0.80),
    
    # Ownership/tenure fields
    "tenure_type": FieldThreshold("tenure_type", 0.70, 0.85),
    "share_fraction": FieldThreshold("share_fraction", 0.75, 0.90),
    
    # Secondary fields - lower accuracy acceptable
    "remarks": FieldThreshold("remarks", 0.50, 0.65, requires_transliteration=True),
    "previous_owner": FieldThreshold("previous_owner", 0.60, 0.75, requires_transliteration=True),
}


# Document-level thresholds
DOCUMENT_THRESHOLDS: Dict[DocumentType, Dict[str, float]] = {
    DocumentType.GIRDAWARI: {
        "overall_min": 0.60,      # Girdawari has complex tables
        "overall_warning": 0.75,
        "table_accuracy_min": 0.55,
    },
    DocumentType.KHASRA: {
        "overall_min": 0.70,      # Khasra is simpler
        "overall_warning": 0.85,
        "table_accuracy_min": 0.65,
    },
    DocumentType.MUTATION: {
        "overall_min": 0.75,      # Mutations are legally critical
        "overall_warning": 0.90,
        "table_accuracy_min": 0.70,
    },
    DocumentType.REGISTRY: {
        "overall_min": 0.80,      # Registry is formal
        "overall_warning": 0.92,
        "table_accuracy_min": 0.75,
    },
    DocumentType.FARD: {
        "overall_min": 0.65,
        "overall_warning": 0.80,
        "table_accuracy_min": 0.60,
    },
}


# Handwritten text adjustment factors
HANDWRITTEN_ADJUSTMENTS = {
    "confidence_reduction": 0.15,   # Reduce threshold by 15% for handwritten
    "priority_boost": 1,            # Increase priority level by 1
    "require_dual_review": True,    # Require 2 reviewers for handwritten critical fields
}


class ConfidenceAnalyzer:
    """
    Analyzes OCR confidence and determines review routing
    """
    
    def __init__(self):
        self.field_thresholds = FIELD_THRESHOLDS
        self.doc_thresholds = DOCUMENT_THRESHOLDS
    
    def analyze_extraction(
        self,
        doc_type: str,
        fields: Dict[str, Any],
        field_confidences: Dict[str, float],
        overall_confidence: float,
        is_handwritten: bool = False,
        has_tables: bool = False,
        table_confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Analyze extraction results and determine review requirements
        
        Returns:
            {
                "needs_review": bool,
                "priority": ReviewPriority,
                "fields_to_review": List[str],
                "critical_failures": List[str],
                "warnings": List[str],
                "suggested_assignee": Optional[str],
                "review_notes": str
            }
        """
        result = {
            "needs_review": False,
            "priority": ReviewPriority.SKIP,
            "fields_to_review": [],
            "critical_failures": [],
            "warnings": [],
            "suggested_assignee": None,
            "review_notes": ""
        }
        
        # Get document thresholds
        doc_threshold = self.doc_thresholds.get(
            DocumentType(doc_type), 
            {"overall_min": 0.7, "overall_warning": 0.85}
        )
        
        # Adjust thresholds for handwritten text
        if is_handwritten:
            adjustment = HANDWRITTEN_ADJUSTMENTS["confidence_reduction"]
            doc_threshold = {
                k: max(0.3, v - adjustment) for k, v in doc_threshold.items()
            }
        
        # Check overall document confidence
        if overall_confidence < doc_threshold["overall_min"]:
            result["needs_review"] = True
            result["priority"] = ReviewPriority.HIGH
            result["warnings"].append(
                f"Overall confidence {overall_confidence:.2f} below minimum {doc_threshold['overall_min']:.2f}"
            )
        elif overall_confidence < doc_threshold["overall_warning"]:
            result["warnings"].append(
                f"Overall confidence {overall_confidence:.2f} below warning threshold"
            )
        
        # Check table confidence if applicable
        if has_tables and table_confidence is not None:
            table_min = doc_threshold.get("table_accuracy_min", 0.6)
            if table_confidence < table_min:
                result["needs_review"] = True
                if result["priority"] != ReviewPriority.CRITICAL:
                    result["priority"] = ReviewPriority.MEDIUM
                result["warnings"].append(
                    f"Table extraction confidence {table_confidence:.2f} below minimum"
                )
        
        # Check individual field confidences
        for field_name, confidence in field_confidences.items():
            threshold = self.field_thresholds.get(field_name)
            if not threshold:
                continue
            
            # Adjust for handwritten
            min_conf = threshold.min_confidence
            warn_conf = threshold.warning_confidence
            if is_handwritten:
                min_conf = max(0.3, min_conf - HANDWRITTEN_ADJUSTMENTS["confidence_reduction"])
                warn_conf = max(0.4, warn_conf - HANDWRITTEN_ADJUSTMENTS["confidence_reduction"])
            
            if confidence < min_conf:
                result["fields_to_review"].append(field_name)
                result["needs_review"] = True
                
                if threshold.is_critical:
                    result["critical_failures"].append(field_name)
                    result["priority"] = ReviewPriority.CRITICAL
            elif confidence < warn_conf:
                result["warnings"].append(f"Field '{field_name}' has low confidence: {confidence:.2f}")
        
        # Set priority based on critical failures
        if result["critical_failures"]:
            result["priority"] = ReviewPriority.CRITICAL
            result["suggested_assignee"] = "senior_validator"  # Assign to senior for critical
        elif len(result["fields_to_review"]) > 3:
            result["priority"] = ReviewPriority.HIGH
        elif result["fields_to_review"]:
            result["priority"] = ReviewPriority.MEDIUM
        
        # Boost priority for handwritten
        if is_handwritten and result["needs_review"]:
            priority_order = [ReviewPriority.SKIP, ReviewPriority.LOW, ReviewPriority.MEDIUM, ReviewPriority.HIGH, ReviewPriority.CRITICAL]
            current_idx = priority_order.index(result["priority"])
            boosted_idx = min(current_idx + HANDWRITTEN_ADJUSTMENTS["priority_boost"], len(priority_order) - 1)
            result["priority"] = priority_order[boosted_idx]
        
        # Generate review notes
        notes = []
        if is_handwritten:
            notes.append("⚠️ Handwritten document - requires careful review")
        if result["critical_failures"]:
            notes.append(f"🚨 Critical fields failed: {', '.join(result['critical_failures'])}")
        if result["fields_to_review"]:
            notes.append(f"📝 Fields needing review: {', '.join(result['fields_to_review'])}")
        
        result["review_notes"] = "\n".join(notes)
        
        return result
    
    def get_field_threshold(self, field_name: str, is_handwritten: bool = False) -> float:
        """Get the minimum confidence threshold for a specific field"""
        threshold = self.field_thresholds.get(field_name)
        if not threshold:
            return 0.7  # Default
        
        min_conf = threshold.min_confidence
        if is_handwritten:
            min_conf = max(0.3, min_conf - HANDWRITTEN_ADJUSTMENTS["confidence_reduction"])
        
        return min_conf


# Singleton instance
confidence_analyzer = ConfidenceAnalyzer()
