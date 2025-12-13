#!/usr/bin/env python3
"""
ULPIN System Cross-Check and Validation Script
Tests all components to ensure proper integration
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.utils.parcel_id_generator import ULPINGenerator, DISTRICT_CODES
import traceback


def test_1_ulpin_generation():
    """Test ULPIN generation from coordinates"""
    print("="*80)
    print("TEST 1: ULPIN Generation")
    print("="*80)
    
    try:
        gen = ULPINGenerator()
        
        # Test case 1: Jammu
        ulpin1 = gen.generate_ulpin(
            latitude=32.8594,
            longitude=74.7238,
            district_code="01",
            tehsil_code="05"
        )
        print(f"✅ Generated ULPIN (Jammu): {ulpin1}")
        assert len(ulpin1) == 14, f"Invalid length: {len(ulpin1)}"
        assert ulpin1.startswith("0105"), f"Invalid prefix: {ulpin1[:4]}"
        
        # Test case 2: Srinagar
        ulpin2 = gen.generate_ulpin(
            latitude=34.0836,
            longitude=74.7973,
            district_code="11",
            tehsil_code="02"
        )
        print(f"✅ Generated ULPIN (Srinagar): {ulpin2}")
        assert ulpin2.startswith("1102"), "Invalid Srinagar ULPIN"
        
        print("✅ PASS: ULPIN generation working correctly\n")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        traceback.print_exc()
        return False


def test_2_ulpin_parsing():
    """Test ULPIN parsing and validation"""
    print("="*80)
    print("TEST 2: ULPIN Parsing & Validation")
    print("="*80)
    
    try:
        gen = ULPINGenerator()
        
        # Generate and parse
        ulpin = gen.generate_ulpin(32.8594, 74.7238, "01", "05")
        parsed = gen.parse_ulpin(ulpin)
        
        print(f"Original ULPIN: {ulpin}")
        print(f"Parsed Components:")
        print(f"  District: {parsed['district_code']}")
        print(f"  Tehsil: {parsed['tehsil_code']}")
        print(f"  Latitude: {parsed['latitude']:.6f}°")
        print(f"  Longitude: {parsed['longitude']:.6f}°")
        print(f"  Checksum: {parsed['checksum']}")
        print(f"  Formatted: {parsed['formatted_id']}")
        
        # Verify accuracy
        lat_error = abs(32.8594 - parsed['latitude'])
        lon_error = abs(74.7238 - parsed['longitude'])
        
        assert lat_error < 0.001, f"Latitude error too high: {lat_error}"
        assert lon_error < 0.001, f"Longitude error too high: {lon_error}"
        
        print(f"✅ Coordinate accuracy: ±{max(lat_error, lon_error)*111:.1f}m")
        print("✅ PASS: ULPIN parsing working correctly\n")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        traceback.print_exc()
        return False


def test_3_checksum_validation():
    """Test checksum validation prevents tampering"""
    print("="*80)
    print("TEST 3: Checksum Validation")
    print("="*80)
    
    try:
        gen = ULPINGenerator()
        
        # Valid ULPIN
        valid_ulpin = gen.generate_ulpin(32.8594, 74.7238, "01", "05")
        print(f"Valid ULPIN: {valid_ulpin}")
        
        # Try to parse valid ULPIN
        try:
            parsed = gen.parse_ulpin(valid_ulpin)
            print("✅ Valid ULPIN accepted")
        except:
            raise AssertionError("Valid ULPIN rejected!")
        
        # Corrupt checksum
        invalid_ulpin = valid_ulpin[:-2] + "99"
        print(f"Invalid ULPIN (bad checksum): {invalid_ulpin}")
        
        # Try to parse invalid ULPIN
        try:
            parsed = gen.parse_ulpin(invalid_ulpin)
            raise AssertionError("Invalid ULPIN was accepted!")
        except ValueError as e:
            print(f"✅ Invalid ULPIN correctly rejected: {str(e)}")
        
        print("✅ PASS: Checksum validation working\n")
        return True
        
    except AssertionError as e:
        print(f"❌ FAIL: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error: {str(e)}")
        traceback.print_exc()
        return False


def test_4_district_coverage():
    """Test all district codes"""
    print("="*80)
    print("TEST 4: District Code Coverage")
    print("="*80)
    
    try:
        gen = ULPINGenerator()
        
        # Test a few key districts
        test_districts = [
            ("01", "Jammu", 32.73, 74.86),
            ("11", "Srinagar", 34.08, 74.80),
            ("14", "Anantnag", 33.73, 75.15),
            ("18", "Baramulla", 34.20, 74.34),
            ("03", "Kathua", 32.39, 75.50)
        ]
        
        for code, name, lat, lon in test_districts:
            ulpin = gen.generate_ulpin(lat, lon, code, "01")
            assert ulpin.startswith(code), f"ULPIN doesn't start with {code}"
            print(f"✅ {name:12} (Code {code}): {ulpin}")
        
        print(f"\n✅ Total districts supported: {len(DISTRICT_CODES)}")
        print("✅ PASS: District coverage working\n")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        traceback.print_exc()
        return False


def test_5_uniqueness():
    """Test that parcels get different ULPINs (within resolution limits)"""
    print("="*80)
    print("TEST 5: ULPIN Uniqueness")
    print("="*80)
    
    try:
        gen = ULPINGenerator()
        
        # Note: Resolution is ~600m lat, ~800m lon
        # Parcels closer than this may get same ULPIN
        
        # Test 1: Same coordinates -> Same ULPIN (expected)
        ulpin1a = gen.generate_ulpin(32.8594, 74.7238, "01", "05")
        ulpin1b = gen.generate_ulpin(32.8594, 74.7238, "01", "05")
        assert ulpin1a == ulpin1b, "Same coordinates should produce same ULPIN"
        print(f"✅ Same coordinates → Same ULPIN: {ulpin1a}")
        
        # Test 2: Far apart (>1km) -> Different ULPINs
        ulpin2 = gen.generate_ulpin(32.8594, 74.7238, "01", "05")
        ulpin3 = gen.generate_ulpin(32.8700, 74.7350, "01", "05")  # ~1.5km away
        assert ulpin2 != ulpin3, "Parcels >1km apart should have different ULPINs"
        print(f"✅ Parcel 1 (32.8594, 74.7238): {ulpin2}")
        print(f"✅ Parcel 2 (32.8700, 74.7350): {ulpin3} (different)")
        
        # Test 3: Different tehsil -> Different ULPIN
        ulpin4 = gen.generate_ulpin(32.8594, 74.7238, "01", "05")
        ulpin5 = gen.generate_ulpin(32.8594, 74.7238, "01", "06")  # Different tehsil
        assert ulpin4 != ulpin5, "Different tehsils should have different ULPINs"
        print(f"✅ Same location, different tehsil: {ulpin4} vs {ulpin5}")
        
        # Test 4: Resolution note
        ulpin_close1 = gen.generate_ulpin(32.8594, 74.7238, "01", "05")
        ulpin_close2 = gen.generate_ulpin(32.8595, 74.7239, "01", "05")  # 157m apart
        if ulpin_close1 == ulpin_close2:
            print(f"ℹ️  Note: Parcels 157m apart have same ULPIN (within resolution)")
        else:
            print(f"✅ Parcels 157m apart: {ulpin_close1} vs {ulpin_close2}")
        
        print("✅ PASS: ULPIN uniqueness working as designed\n")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        traceback.print_exc()
        return False


def test_6_geojson_support():
    """Test ULPIN generation from GeoJSON"""
    print("="*80)
    print("TEST 6: GeoJSON Support")
    print("="*80)
    
    try:
        gen = ULPINGenerator()
        
        # Test polygon
        geojson_polygon = {
            "type": "Polygon",
            "coordinates": [[[74.72, 32.85], [74.73, 32.85], 
                           [74.73, 32.86], [74.72, 32.86], [74.72, 32.85]]]
        }
        
        ulpin = gen.generate_from_centroid(
            geojson=geojson_polygon,
            district_code="01",
            tehsil_code="05"
        )
        
        print(f"GeoJSON Polygon → ULPIN: {ulpin}")
        parsed = gen.parse_ulpin(ulpin)
        
        # Expected centroid: (32.855, 74.725)
        assert 32.85 <= parsed['latitude'] <= 32.86, "Centroid latitude out of range"
        assert 74.72 <= parsed['longitude'] <= 74.73, "Centroid longitude out of range"
        
        print(f"✅ Centroid: {parsed['latitude']:.6f}, {parsed['longitude']:.6f}")
        print("✅ PASS: GeoJSON support working\n")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        traceback.print_exc()
        return False


def test_7_boundary_conditions():
    """Test edge cases and boundary conditions"""
    print("="*80)
    print("TEST 7: Boundary Conditions")
    print("="*80)
    
    try:
        gen = ULPINGenerator()
        
        # Test coordinates at J&K boundaries
        test_cases = [
            ("Min Lat, Min Lon", 32.0, 73.0),
            ("Max Lat, Max Lon", 37.99, 80.99),
            ("Mid range", 34.5, 76.5)
        ]
        
        for desc, lat, lon in test_cases:
            ulpin = gen.generate_ulpin(lat, lon, "01", "05")
            parsed = gen.parse_ulpin(ulpin)
            lat_err = abs(lat - parsed['latitude'])
            lon_err = abs(lon - parsed['longitude'])
            print(f"✅ {desc:20} → ULPIN: {ulpin[:8]}... (err: ±{max(lat_err, lon_err):.4f}°)")
        
        # Test invalid coordinates
        try:
            invalid_ulpin = gen.generate_ulpin(10.0, 50.0, "01", "05")  # Outside J&K
            print("❌ Should have rejected out-of-bounds coordinates")
            return False
        except ValueError:
            print("✅ Out-of-bounds coordinates correctly rejected")
        
        print("✅ PASS: Boundary conditions handled correctly\n")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*20 + "ULPIN SYSTEM CROSS-CHECK" + " "*35 + "║")
    print("║" + " "*15 + "Unique Land Parcel Identification Number" + " "*22 + "║")
    print("╚" + "="*78 + "╝")
    print("\n")
    
    tests = [
        ("ULPIN Generation", test_1_ulpin_generation),
        ("ULPIN Parsing", test_2_ulpin_parsing),
        ("Checksum Validation", test_3_checksum_validation),
        ("District Coverage", test_4_district_coverage),
        ("ULPIN Uniqueness", test_5_uniqueness),
        ("GeoJSON Support", test_6_geojson_support),
        ("Boundary Conditions", test_7_boundary_conditions)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR in {name}: {str(e)}\n")
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    print("="*80)
    print(f"RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - ULPIN SYSTEM FULLY OPERATIONAL!\n")
        return 0
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED - REVIEW REQUIRED\n")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
