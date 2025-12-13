"""
Test script for Land Parcel ID Generator
Run: python -m pytest backend/tests/test_parcel_id.py -v
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.parcel_id_generator import LandParcelIDGenerator, DISTRICT_CODES


def test_parcel_id_generation():
    """Test basic ID generation"""
    generator = LandParcelIDGenerator()
    
    # Test case: Jammu district, Akhnoor tehsil
    parcel_id = generator.generate_from_coordinates(
        latitude=32.8594,
        longitude=74.7238,
        district_code="01",
        tehsil_code="05"
    )
    
    print(f"✅ Generated Parcel ID: {parcel_id}")
    assert len(parcel_id) == 14, f"ID length should be 14, got {len(parcel_id)}"
    assert parcel_id.startswith("0105"), "ID should start with district=01, tehsil=05"
    
    return parcel_id


def test_parcel_id_parsing():
    """Test ID parsing and coordinate recovery"""
    generator = LandParcelIDGenerator()
    
    # Generate
    original_lat = 32.8594
    original_lon = 74.7238
    
    parcel_id = generator.generate_from_coordinates(
        latitude=original_lat,
        longitude=original_lon,
        district_code="01",
        tehsil_code="05"
    )
    
    # Parse
    parsed = generator.parse_parcel_id(parcel_id)
    
    print(f"\n✅ Parsed Components:")
    print(f"   District: {parsed['district_code']}")
    print(f"   Tehsil: {parsed['tehsil_code']}")
    print(f"   Latitude: {parsed['latitude']} (original: {original_lat})")
    print(f"   Longitude: {parsed['longitude']} (original: {original_lon})")
    print(f"   Checksum: {parsed['checksum']}")
    
    # Verify accuracy
    lat_error = abs(original_lat - parsed['latitude'])
    lon_error = abs(original_lon - parsed['longitude'])
    
    print(f"\n✅ Coordinate Accuracy:")
    print(f"   Latitude error: {lat_error:.6f}°")
    print(f"   Longitude error: {lon_error:.6f}°")
    
    # Should be accurate to ~0.001° (~100m)
    assert lat_error < 0.001, f"Latitude error too high: {lat_error}"
    assert lon_error < 0.001, f"Longitude error too high: {lon_error}"


def test_geojson_centroid():
    """Test ID generation from GeoJSON"""
    generator = LandParcelIDGenerator()
    
    # Sample GeoJSON polygon (rectangular plot)
    geojson = {
        "type": "Polygon",
        "coordinates": [[
            [74.72, 32.85],
            [74.73, 32.85],
            [74.73, 32.86],
            [74.72, 32.86],
            [74.72, 32.85]
        ]]
    }
    
    parcel_id = generator.generate_from_centroid(
        geojson=geojson,
        district_code="01",
        tehsil_code="05"
    )
    
    print(f"\n✅ Generated from GeoJSON: {parcel_id}")
    
    # Verify it's near the center
    parsed = generator.parse_parcel_id(parcel_id)
    assert 32.85 <= parsed['latitude'] <= 32.86
    assert 74.72 <= parsed['longitude'] <= 74.73


def test_uniqueness():
    """Test that nearby parcels get different IDs"""
    generator = LandParcelIDGenerator()
    
    # Generate IDs for adjacent plots
    id1 = generator.generate_from_coordinates(32.8594, 74.7238, "01", "05")
    id2 = generator.generate_from_coordinates(32.8595, 74.7239, "01", "05")  # ~11m apart
    id3 = generator.generate_from_coordinates(32.8594, 74.7238, "01", "06")  # Different tehsil
    
    print(f"\n✅ Uniqueness Test:")
    print(f"   Plot 1: {id1}")
    print(f"   Plot 2: {id2} (11m away)")
    print(f"   Plot 3: {id3} (different tehsil)")
    
    assert id1 != id2, "Adjacent plots should have different IDs"
    assert id1 != id3, "Different tehsils should have different IDs"


def test_all_districts():
    """Test ID generation for all J&K districts"""
    generator = LandParcelIDGenerator()
    
    print(f"\n✅ Testing All Districts:")
    print(f"   {'District':<15} {'Code':<6} {'Sample Parcel ID'}")
    print(f"   {'-'*50}")
    
    # Sample coordinates for each district (approximate district centers)
    district_coords = {
        "Jammu": (32.73, 74.86),
        "Srinagar": (34.08, 74.80),
        "Anantnag": (33.73, 75.15),
        "Baramulla": (34.20, 74.34),
        "Budgam": (33.93, 74.63),
    }
    
    for district_name, (lat, lon) in district_coords.items():
        code = DISTRICT_CODES.get(district_name)
        if code:
            pid = generator.generate_from_coordinates(lat, lon, code, "01")
            print(f"   {district_name:<15} {code:<6} {pid}")


def test_checksum_validation():
    """Test that invalid checksums are rejected"""
    generator = LandParcelIDGenerator()
    
    # Generate valid ID
    valid_id = generator.generate_from_coordinates(32.8594, 74.7238, "01", "05")
    
    # Corrupt the checksum
    invalid_id = valid_id[:-2] + "99"
    
    print(f"\n✅ Checksum Validation:")
    print(f"   Valid ID:   {valid_id}")
    print(f"   Invalid ID: {invalid_id}")
    
    try:
        generator.parse_parcel_id(invalid_id)
        assert False, "Should have raised ValueError for invalid checksum"
    except ValueError as e:
        print(f"   ✅ Correctly rejected: {str(e)}")


if __name__ == "__main__":
    print("="*60)
    print("LAND PARCEL ID GENERATOR - TEST SUITE")
    print("="*60)
    
    try:
        test_parcel_id_generation()
        test_parcel_id_parsing()
        test_geojson_centroid()
        test_uniqueness()
        test_all_districts()
        test_checksum_validation()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
