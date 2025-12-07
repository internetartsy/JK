from typing import Optional, Dict
from enum import Enum

class CropCategory(str, Enum):
    """Major crop categories"""
    CEREALS = "cereals"
    PULSES = "pulses"
    OILSEEDS = "oilseeds"
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    CASH_CROPS = "cash_crops"
    FODDER = "fodder"

class CropTaxonomy:
    """Map local crop names to standardized codes"""
    
    # Crop mapping: local name -> (standard name, FAO code, category)
    CROP_MAPPING = {
        # Cereals
        'گندم': ('Wheat', 'W', CropCategory.CEREALS),
        'wheat': ('Wheat', 'W', CropCategory.CEREALS),
        'گہوں': ('Wheat', 'W', CropCategory.CEREALS),
        
        'چاول': ('Rice', 'R', CropCategory.CEREALS),
        'rice': ('Rice', 'R', CropCategory.CEREALS),
        'دھان': ('Rice', 'R', CropCategory.CEREALS),
        
        'مکئی': ('Maize', 'M', CropCategory.CEREALS),
        'maize': ('Maize', 'M', CropCategory.CEREALS),
        'corn': ('Maize', 'M', CropCategory.CEREALS),
        
        'باجرہ': ('Millet', 'ML', CropCategory.CEREALS),
        'millet': ('Millet', 'ML', CropCategory.CEREALS),
        'bajra': ('Millet', 'ML', CropCategory.CEREALS),
        
        'جوار': ('Sorghum', 'SG', CropCategory.CEREALS),
        'sorghum': ('Sorghum', 'SG', CropCategory.CEREALS),
        'jowar': ('Sorghum', 'SG', CropCategory.CEREALS),
        
        # Pulses
        'چنا': ('Chickpea', 'CP', CropCategory.PULSES),
        'chickpea': ('Chickpea', 'CP', CropCategory.PULSES),
        'gram': ('Chickpea', 'CP', CropCategory.PULSES),
        
        'مسور': ('Lentil', 'LT', CropCategory.PULSES),
        'lentil': ('Lentil', 'LT', CropCategory.PULSES),
        'masoor': ('Lentil', 'LT', CropCategory.PULSES),
        
        'ماش': ('Mung Bean', 'MB', CropCategory.PULSES),
        'mung': ('Mung Bean', 'MB', CropCategory.PULSES),
        'moong': ('Mung Bean', 'MB', CropCategory.PULSES),
        
        # Oilseeds
        'سرسوں': ('Mustard', 'MS', CropCategory.OILSEEDS),
        'mustard': ('Mustard', 'MS', CropCategory.OILSEEDS),
        'sarson': ('Mustard', 'MS', CropCategory.OILSEEDS),
        
        'سورج مکھی': ('Sunflower', 'SF', CropCategory.OILSEEDS),
        'sunflower': ('Sunflower', 'SF', CropCategory.OILSEEDS),
        
        # Cash Crops
        'گنا': ('Sugarcane', 'SC', CropCategory.CASH_CROPS),
        'sugarcane': ('Sugarcane', 'SC', CropCategory.CASH_CROPS),
        'ganna': ('Sugarcane', 'SC', CropCategory.CASH_CROPS),
        
        'کپاس': ('Cotton', 'CT', CropCategory.CASH_CROPS),
        'cotton': ('Cotton', 'CT', CropCategory.CASH_CROPS),
        'kapas': ('Cotton', 'CT', CropCategory.CASH_CROPS),
        
        'تمباکو': ('Tobacco', 'TB', CropCategory.CASH_CROPS),
        'tobacco': ('Tobacco', 'TB', CropCategory.CASH_CROPS),
        
        # Vegetables
        'آلو': ('Potato', 'PT', CropCategory.VEGETABLES),
        'potato': ('Potato', 'PT', CropCategory.VEGETABLES),
        'aloo': ('Potato', 'PT', CropCategory.VEGETABLES),
        
        'پیاز': ('Onion', 'ON', CropCategory.VEGETABLES),
        'onion': ('Onion', 'ON', CropCategory.VEGETABLES),
        'pyaz': ('Onion', 'ON', CropCategory.VEGETABLES),
        
        'ٹماٹر': ('Tomato', 'TM', CropCategory.VEGETABLES),
        'tomato': ('Tomato', 'TM', CropCategory.VEGETABLES),
        
        # Fodder
        'برسیم': ('Berseem', 'BS', CropCategory.FODDER),
        'berseem': ('Berseem', 'BS', CropCategory.FODDER),
        
        'جوار': ('Fodder Sorghum', 'FS', CropCategory.FODDER),
        'fodder': ('Fodder', 'FD', CropCategory.FODDER),
    }
    
    def normalize_crop_name(self, crop_name: Optional[str]) -> Optional[str]:
        """Normalize local crop name to standard name"""
        if not crop_name:
            return None
        
        crop_lower = crop_name.lower().strip()
        if crop_lower in self.CROP_MAPPING:
            return self.CROP_MAPPING[crop_lower][0]
        
        # Return original if not found (with capitalization)
        return crop_name.title()
    
    def get_crop_code(self, crop_name: Optional[str]) -> Optional[str]:
        """Get standardized crop code"""
        if not crop_name:
            return None
        
        crop_lower = crop_name.lower().strip()
        if crop_lower in self.CROP_MAPPING:
            return self.CROP_MAPPING[crop_lower][1]
        
        return None
    
    def get_crop_category(self, crop_name: Optional[str]) -> Optional[CropCategory]:
        """Get crop category"""
        if not crop_name:
            return None
        
        crop_lower = crop_name.lower().strip()
        if crop_lower in self.CROP_MAPPING:
            return self.CROP_MAPPING[crop_lower][2]
        
        return None
    
    def get_crop_info(self, crop_name: Optional[str]) -> Optional[Dict]:
        """Get all crop information"""
        if not crop_name:
            return None
        
        crop_lower = crop_name.lower().strip()
        if crop_lower in self.CROP_MAPPING:
            standard_name, code, category = self.CROP_MAPPING[crop_lower]
            return {
                "original": crop_name,
                "standard_name": standard_name,
                "code": code,
                "category": category.value
            }
        
        return {
            "original": crop_name,
            "standard_name": crop_name.title(),
            "code": None,
            "category": None
        }
    
    def get_all_crops(self) -> Dict[str, Dict]:
        """Get all mapped crops"""
        crops = {}
        for local_name, (std_name, code, category) in self.CROP_MAPPING.items():
            crops[std_name] = {
                "code": code,
                "category": category.value,
                "aliases": [k for k, v in self.CROP_MAPPING.items() if v[0] == std_name]
            }
        return crops
