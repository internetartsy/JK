from typing import Optional, Dict
from enum import Enum

class AreaUnit(str, Enum):
    """Supported area units"""
    KANAL = "kanal"
    MARLA = "marla"
    ACRE = "acre"
    SQUARE_METER = "sqm"
    SQUARE_FEET = "sqft"
    HECTARE = "hectare"

class UnitConverter:
    """Convert between different area units used in land records"""
    
    # Conversion factors to square meters
    TO_SQUARE_METERS = {
        AreaUnit.KANAL: 505.857,      # 1 kanal = 505.857 sqm
        AreaUnit.MARLA: 25.2929,      # 1 marla = 25.2929 sqm (1/20 kanal)
        AreaUnit.ACRE: 4046.86,       # 1 acre = 4046.86 sqm
        AreaUnit.SQUARE_METER: 1.0,   # 1 sqm = 1 sqm
        AreaUnit.SQUARE_FEET: 0.092903, # 1 sqft = 0.092903 sqm
        AreaUnit.HECTARE: 10000,      # 1 hectare = 10000 sqm
    }
    
    # Common unit aliases
    UNIT_ALIASES = {
        'kanal': AreaUnit.KANAL,
        'kanaal': AreaUnit.KANAL,
        'کنال': AreaUnit.KANAL,
        
        'marla': AreaUnit.MARLA,
        'marlas': AreaUnit.MARLA,
        'مرلہ': AreaUnit.MARLA,
        
        'acre': AreaUnit.ACRE,
        'acres': AreaUnit.ACRE,
        'ایکڑ': AreaUnit.ACRE,
        
        'sqm': AreaUnit.SQUARE_METER,
        'sq.m': AreaUnit.SQUARE_METER,
        'square meter': AreaUnit.SQUARE_METER,
        'square meters': AreaUnit.SQUARE_METER,
        
        'sqft': AreaUnit.SQUARE_FEET,
        'sq.ft': AreaUnit.SQUARE_FEET,
        'square feet': AreaUnit.SQUARE_FEET,
        
        'hectare': AreaUnit.HECTARE,
        'hectares': AreaUnit.HECTARE,
        'ha': AreaUnit.HECTARE,
    }
    
    def normalize_unit(self, unit_str: Optional[str]) -> Optional[AreaUnit]:
        """Normalize unit string to standard AreaUnit"""
        if not unit_str:
            return None
        
        unit_lower = unit_str.lower().strip()
        return self.UNIT_ALIASES.get(unit_lower)
    
    def convert(self, value: float, from_unit: str, to_unit: str = "sqm") -> Optional[float]:
        """
        Convert area value from one unit to another
        
        Args:
            value: Area value
            from_unit: Source unit (kanal, marla, acre, etc.)
            to_unit: Target unit (default: sqm)
        
        Returns:
            Converted value or None if conversion fails
        """
        source_unit = self.normalize_unit(from_unit)
        target_unit = self.normalize_unit(to_unit)
        
        if not source_unit or not target_unit:
            return None
        
        # Convert to square meters first, then to target unit
        value_in_sqm = value * self.TO_SQUARE_METERS[source_unit]
        converted_value = value_in_sqm / self.TO_SQUARE_METERS[target_unit]
        
        return round(converted_value, 4)
    
    def convert_to_sqm(self, value: float, from_unit: str) -> Optional[float]:
        """Convert to square meters (canonical unit)"""
        return self.convert(value, from_unit, "sqm")
    
    def format_area(self, value: float, unit: str) -> str:
        """Format area with unit"""
        return f"{value:.2f} {unit}"
    
    def get_conversion_info(self, from_unit: str) -> Dict[str, float]:
        """Get conversion factors for a unit to all other units"""
        source_unit = self.normalize_unit(from_unit)
        if not source_unit:
            return {}
        
        conversions = {}
        for target_unit in AreaUnit:
            conversions[target_unit.value] = self.convert(1.0, from_unit, target_unit.value)
        
        return conversions
