from typing import List, Dict, Any, Optional
from enum import Enum

class ValidationSeverity(str, Enum):
    """Severity levels for validation issues"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

class ValidationRule:
    """Base class for validation rules"""
    
    def __init__(self, rule_id: str, description: str, severity: ValidationSeverity):
        self.rule_id = rule_id
        self.description = description
        self.severity = severity
    
    def validate(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validate data against this rule
        
        Returns:
            Validation issue if rule fails, None if passes
        """
        raise NotImplementedError

class ValidationEngine:
    """Engine to run validation rules on extracted data"""
    
    def __init__(self):
        self.rules: List[ValidationRule] = []
        self._register_default_rules()
    
    def _register_default_rules(self):
        """Register default validation rules"""
        self.rules = [
            # Completeness rules
            RequiredFieldRule("khasra_number", "Khasra number is required"),
            RequiredFieldRule("owner_name", "Owner name is required"),
            
            # Consistency rules
            AreaConsistencyRule(),
            CropSeasonRule(),
            DateFormatRule(),
            
            # Data quality rules
            ConfidenceThresholdRule(0.7),
            NameLengthRule(),
        ]
    
    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run all validation rules on data
        
        Returns:
            Validation report with issues grouped by severity
        """
        issues = {
            "errors": [],
            "warnings": [],
            "info": []
        }
        
        for rule in self.rules:
            issue = rule.validate(data)
            if issue:
                if rule.severity == ValidationSeverity.ERROR:
                    issues["errors"].append(issue)
                elif rule.severity == ValidationSeverity.WARNING:
                    issues["warnings"].append(issue)
                else:
                    issues["info"].append(issue)
        
        return {
            "is_valid": len(issues["errors"]) == 0,
            "issues": issues,
            "total_issues": sum(len(v) for v in issues.values())
        }

# Specific validation rules

class RequiredFieldRule(ValidationRule):
    """Rule to check if required field is present"""
    
    def __init__(self, field: str, description: str):
        super().__init__(f"required_{field}", description, ValidationSeverity.ERROR)
        self.field = field
    
    def validate(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not data.get(self.field):
            return {
                "rule_id": self.rule_id,
                "field": self.field,
                "message": self.description,
                "severity": self.severity.value
            }
        return None

class AreaConsistencyRule(ValidationRule):
    """Rule to check area consistency (text vs computed)"""
    
    def __init__(self):
        super().__init__(
            "area_consistency",
            "Area from text vs computed geometry should match within 10%",
            ValidationSeverity.WARNING
        )
    
    def validate(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        area_text = data.get('area_sqm')
        area_geom = data.get('area_geom')
        
        if area_text and area_geom:
            diff_pct = abs(area_text - area_geom) / area_text * 100
            if diff_pct > 10:
                return {
                    "rule_id": self.rule_id,
                    "field": "area",
                    "message": f"Area mismatch: {diff_pct:.1f}% difference",
                    "severity": self.severity.value,
                    "details": {
                        "text_area": area_text,
                        "geom_area": area_geom
                    }
                }
        return None

class CropSeasonRule(ValidationRule):
    """Rule to check crop-season coherence"""
    
    KHARIF_CROPS = ['cotton', 'rice', 'maize', 'sugarcane', 'millet']
    RABI_CROPS = ['wheat', 'chickpea', 'mustard', 'lentil']
    
    def __init__(self):
        super().__init__(
            "crop_season_coherence",
            "Crop should match appropriate season",
            ValidationSeverity.WARNING
        )
    
    def validate(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        crop = data.get('crop_standard', '').lower()
        season = data.get('season', '').lower()
        
        if not crop or not season:
            return None
        
        if season == 'kharif' and crop in self.RABI_CROPS:
            return {
                "rule_id": self.rule_id,
                "field": "crop",
                "message": f"{crop} is typically a Rabi crop, not Kharif",
                "severity": self.severity.value
            }
        
        if season == 'rabi' and crop in self.KHARIF_CROPS:
            return {
                "rule_id": self.rule_id,
                "field": "crop",
                "message": f"{crop} is typically a Kharif crop, not Rabi",
                "severity": self.severity.value
            }
        
        return None

class DateFormatRule(ValidationRule):
    """Rule to check date format"""
    
    def __init__(self):
        super().__init__(
            "date_format",
            "Date should be in valid format",
            ValidationSeverity.INFO
        )
    
    def validate(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        date = data.get('date')
        if date:
            # Check if date matches DD/MM/YYYY format
            import re
            if not re.match(r'\d{1,2}/\d{1,2}/\d{2,4}', date):
                return {
                    "rule_id": self.rule_id,
                    "field": "date",
                    "message": "Date format should be DD/MM/YYYY",
                    "severity": self.severity.value
                }
        return None

class ConfidenceThresholdRule(ValidationRule):
    """Rule to check confidence threshold"""
    
    def __init__(self, threshold: float = 0.7):
        super().__init__(
            "confidence_threshold",
            f"Confidence should be above {threshold}",
            ValidationSeverity.WARNING
        )
        self.threshold = threshold
    
    def validate(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        confidence = data.get('confidence', 0)
        if confidence < self.threshold:
            return {
                "rule_id": self.rule_id,
                "field": "confidence",
                "message": f"Low confidence: {confidence:.2f} < {self.threshold}",
                "severity": self.severity.value
            }
        return None

class NameLengthRule(ValidationRule):
    """Rule to check name length"""
    
    def __init__(self):
        super().__init__(
            "name_length",
            "Name should be between 2 and 100 characters",
            ValidationSeverity.INFO
        )
    
    def validate(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        name = data.get('owner_name') or data.get('name', '')
        if name:
            if len(name) < 2 or len(name) > 100:
                return {
                    "rule_id": self.rule_id,
                    "field": "owner_name",
                    "message": f"Name length {len(name)} outside normal range",
                    "severity": self.severity.value
                }
        return None
