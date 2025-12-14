"""
ULPIN Auto-Generator for Frappe Land Parcel DocType
Generates Unique Land Parcel Identification Number (ULPIN) from geocoordinates
"""

import frappe
import json
import hashlib


def encode_coordinate(value, min_val, range_val):
    """Encode a coordinate to 4 digits (0000-9999)"""
    normalized = (value - min_val) / range_val
    encoded = int(normalized * 9999)
    return max(0, min(9999, encoded))


def calculate_checksum(district, tehsil, lat_code, lon_code):
    """Calculate 2-digit checksum"""
    combined = f"{district}{tehsil}{lat_code:04d}{lon_code:04d}"
    hash_obj = hashlib.md5(combined.encode())
    hash_int = int(hash_obj.hexdigest(), 16)
    return f"{hash_int % 100:02d}"


def get_centroid_from_geojson(geojson_str):
    """Extract centroid from GeoJSON string"""
    try:
        geojson = json.loads(geojson_str)
        
        # Handle different geometry types
        coords = geojson.get("coordinates", [])
        
        if geojson.get("type") == "Polygon":
            # Get first ring (exterior)
            ring = coords[0] if coords else []
            if not ring:
                return None, None
            
            # Calculate centroid
            lon_sum = sum(point[0] for point in ring)
            lat_sum = sum(point[1] for point in ring)
            count = len(ring)
            
            return lat_sum / count, lon_sum / count
        
        elif geojson.get("type") == "Point":
            return coords[1], coords[0]  # lat, lon
        
    except Exception as e:
        frappe.log_error(f"Error parsing GeoJSON: {str(e)}", "Parcel ID Generation")
    
    return None, None


def generate_parcel_id(doc, method=None):
    """
    Auto-generate Land Parcel ID from geocoordinates
    Frappe Server Script: Before Insert/Save
    """
    
    # Skip if parcel_id already exists
    if doc.parcel_id and not doc.is_new():
        return
    
    # Get district and tehsil codes
    district_map = {
        "Jammu": "01", "Samba": "02", "Kathua": "03", "Udhampur": "04",
        "Reasi": "05", "Rajouri": "06", "Poonch": "07", "Doda": "08",
        "Ramban": "09", "Kishtwar": "10", "Srinagar": "11", "Ganderbal": "12",
        "Budgam": "13", "Anantnag": "14", "Kulgam": "15", "Pulwama": "16",
        "Shopian": "17", "Baramulla": "18", "Bandipora": "19", "Kupwara": "20"
    }
    
    district_code = district_map.get(doc.district, "00")
    tehsil_code = doc.tehsil[:2].zfill(2) if doc.tehsil else "00"
    
    # Extract coordinates from GeoJSON
    latitude, longitude = None, None
    
    if doc.geojson:
        latitude, longitude = get_centroid_from_geojson(doc.geojson)
    
    # Fallback: use approximate coordinates if GeoJSON not available
    if not latitude or not longitude:
        # Default coordinates for district (fallback)
        district_defaults = {
            "Jammu": (32.7266, 74.8570),
            "Srinagar": (34.0836, 74.7973),
            # Add more as needed
        }
        latitude, longitude = district_defaults.get(doc.district, (32.0, 74.0))
    
    # J&K coordinate bounds
    LAT_MIN, LAT_MAX = 32.0, 38.0
    LON_MIN, LON_MAX = 73.0, 81.0
    
    # Encode coordinates
    lat_code = encode_coordinate(latitude, LAT_MIN, LAT_MAX - LAT_MIN)
    lon_code = encode_coordinate(longitude, LON_MIN, LON_MAX - LON_MIN)
    
    # Calculate checksum
    checksum = calculate_checksum(district_code, tehsil_code, lat_code, lon_code)
    
    # Generate Parcel ID
    parcel_id = f"{district_code}{tehsil_code}{lat_code:04d}{lon_code:04d}{checksum}"
    
    # Set the generated ID
    doc.parcel_id = parcel_id
    
    frappe.msgprint(f"Generated Parcel ID: {parcel_id}", alert=True)
