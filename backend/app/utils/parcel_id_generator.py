"""
ULPIN Generator - Unique Land Parcel Identification Number
14-Digit Geocoordinate Based System (India Standard)

FORMAT: XXYY-ZZZZ-SSSS-CC
- XX: District Code (2 digits)
- YY: Tehsil/Sub-District Code (2 digits)
- ZZZZ: Encoded Latitude (4 digits, compressed)
- SSSS: Encoded Longitude (4 digits, compressed)
- CC: Checksum (2 digits)

Example ULPIN: 0105-7345-2891-47
- District: 01 (Jammu)
- Tehsil: 05 (Akhnoor)
- Lat: 32.8594 → 7345
- Lon: 74.7238 → 2891
- Checksum: 47
"""

import hashlib
from typing import Tuple, Optional


class ULPINGenerator:
    # J&K Latitude bounds: 32.17 to 37.05
    LAT_MIN = 32.0
    LAT_MAX = 38.0
    LAT_RANGE = LAT_MAX - LAT_MIN
    
    # J&K Longitude bounds: 73.26 to 80.30
    LON_MIN = 73.0
    LON_MAX = 81.0
    LON_RANGE = LON_MAX - LON_MIN
    
    @staticmethod
    def encode_coordinate(value: float, min_val: float, range_val: float) -> int:
        """Encode a coordinate to 4 digits (0000-9999)"""
        normalized = (value - min_val) / range_val
        encoded = int(normalized * 9999)
        return max(0, min(9999, encoded))
    
    @staticmethod
    def decode_coordinate(encoded: int, min_val: float, range_val: float) -> float:
        """Decode 4 digits back to coordinate"""
        normalized = encoded / 9999.0
        return min_val + (normalized * range_val)
    
    @staticmethod
    def calculate_checksum(district: str, tehsil: str, lat_code: int, lon_code: int) -> str:
        """Calculate 2-digit checksum"""
        combined = f"{district}{tehsil}{lat_code:04d}{lon_code:04d}"
        hash_obj = hashlib.md5(combined.encode())
        hash_int = int(hash_obj.hexdigest(), 16)
        return f"{hash_int % 100:02d}"
    
    @classmethod
    def generate_ulpin(
        cls,
        latitude: float,
        longitude: float,
        district_code: str,
        tehsil_code: str
    ) -> str:
        """
        Generate 14-digit ULPIN (Unique Land Parcel Identification Number)
        
        Args:
            latitude: Decimal latitude (e.g., 32.8594)
            longitude: Decimal longitude (e.g., 74.7238)
            district_code: 2-digit district code (e.g., "01")
            tehsil_code: 2-digit tehsil code (e.g., "05")
            
        Returns:
            14-digit ULPIN in format: XXYY-ZZZZ-SSSS-CC
        """
        # Validate inputs
        if not (cls.LAT_MIN <= latitude <= cls.LAT_MAX):
            raise ValueError(f"Latitude {latitude} out of J&K bounds ({cls.LAT_MIN}-{cls.LAT_MAX})")
        
        if not (cls.LON_MIN <= longitude <= cls.LON_MAX):
            raise ValueError(f"Longitude {longitude} out of J&K bounds ({cls.LON_MIN}-{cls.LON_MAX})")
        
        # Encode coordinates
        lat_code = cls.encode_coordinate(latitude, cls.LAT_MIN, cls.LAT_RANGE)
        lon_code = cls.encode_coordinate(longitude, cls.LON_MIN, cls.LON_RANGE)
        
        # Calculate checksum
        checksum = cls.calculate_checksum(district_code, tehsil_code, lat_code, lon_code)
        
        # Format ID
        ulpin = f"{district_code}{tehsil_code}{lat_code:04d}{lon_code:04d}{checksum}"
        
        return ulpin
    
    @classmethod
    def parse_ulpin(cls, ulpin: str) -> dict:
        """
        Parse a ULPIN and extract components
        
        Args:
            ulpin: 14-digit ULPIN (with or without hyphens)
            
        Returns:
            Dictionary with district, tehsil, lat, lon, checksum
        """
        # Remove hyphens
        clean_id = ulpin.replace("-", "")
        
        if len(clean_id) != 14:
            raise ValueError(f"Invalid ULPIN length: {len(clean_id)} (expected 14)")
        
        district = clean_id[0:2]
        tehsil = clean_id[2:4]
        lat_code = int(clean_id[4:8])
        lon_code = int(clean_id[8:12])
        checksum = clean_id[12:14]
        
        # Verify checksum
        calculated_checksum = cls.calculate_checksum(district, tehsil, lat_code, lon_code)
        if checksum != calculated_checksum:
            raise ValueError(f"Invalid checksum: {checksum} (expected {calculated_checksum})")
        
        # Decode coordinates
        latitude = cls.decode_coordinate(lat_code, cls.LAT_MIN, cls.LAT_RANGE)
        longitude = cls.decode_coordinate(lon_code, cls.LON_MIN, cls.LON_RANGE)
        
        return {
            "district_code": district,
            "tehsil_code": tehsil,
            "latitude": round(latitude, 6),
            "longitude": round(longitude, 6),
            "lat_encoded": lat_code,
            "lon_encoded": lon_code,
            "checksum": checksum,
            "formatted_id": f"{district}{tehsil}-{lat_code:04d}-{lon_code:04d}-{checksum}"
        }
    
    @classmethod
    def generate_from_centroid(cls, geojson: dict, district_code: str, tehsil_code: str) -> str:
        """
        Generate ULPIN from GeoJSON centroid
        
        Args:
            geojson: GeoJSON geometry object
            district_code: 2-digit district code
            tehsil_code: 2-digit tehsil code
            
        Returns:
            14-digit ULPIN
        """
        # Calculate centroid manually (no shapely required)
        coords = geojson.get("coordinates", [])
        
        if geojson.get("type") == "Polygon":
            # Get first ring (exterior)
            ring = coords[0] if coords else []
            if not ring:
                raise ValueError("Invalid polygon: no coordinates")
            
            # Calculate centroid
            lon_sum = sum(point[0] for point in ring)
            lat_sum = sum(point[1] for point in ring)
            count = len(ring)
            
            longitude = lon_sum / count
            latitude = lat_sum / count
            
        elif geojson.get("type") == "Point":
            longitude, latitude = coords[0], coords[1]
        else:
            raise ValueError(f"Unsupported geometry type: {geojson.get('type')}")
        
        return cls.generate_ulpin(
            latitude=latitude,
            longitude=longitude,
            district_code=district_code,
            tehsil_code=tehsil_code
        )


# District Code Mapping (Example for J&K)
DISTRICT_CODES = {
    "Jammu": "01",
    "Samba": "02",
    "Kathua": "03",
    "Udhampur": "04",
    "Reasi": "05",
    "Rajouri": "06",
    "Poonch": "07",
    "Doda": "08",
    "Ramban": "09",
    "Kishtwar": "10",
    "Srinagar": "11",
    "Ganderbal": "12",
    "Budgam": "13",
    "Anantnag": "14",
    "Kulgam": "15",
    "Pulwama": "16",
    "Shopian": "17",
    "Baramulla": "18",
    "Bandipora": "19",
    "Kupwara": "20"
}

# Reverse mapping
DISTRICT_NAMES = {v: k for k, v in DISTRICT_CODES.items()}


if __name__ == "__main__":
    # Example usage
    generator = LandParcelIDGenerator()
    
    # Generate ID from coordinates
    parcel_id = generator.generate_from_coordinates(
        latitude=32.8594,
        longitude=74.7238,
        district_code="01",  # Jammu
        tehsil_code="05"     # Akhnoor
    )
    
    print(f"Generated Parcel ID: {parcel_id}")
    
    # Parse the ID
    parsed = generator.parse_parcel_id(parcel_id)
    print(f"\nParsed Data:")
    for key, value in parsed.items():
        print(f"  {key}: {value}")
    
    # Verify coordinates
    print(f"\nOriginal: Lat=32.8594, Lon=74.7238")
    print(f"Decoded:  Lat={parsed['latitude']}, Lon={parsed['longitude']}")
    print(f"Error:    Lat={abs(32.8594 - parsed['latitude']):.6f}, Lon={abs(74.7238 - parsed['longitude']):.6f}")
