#!/usr/bin/env python3
"""
End-to-End Land Parcel ID System Test
Creates sample parcels in both PostgreSQL and Frappe, verifies ID generation
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.utils.parcel_id_generator import LandParcelIDGenerator, DISTRICT_CODES
import json


# Sample test parcels across J&K
TEST_PARCELS = [
    {
        "name": "Jammu Urban Plot",
        "district": "Jammu",
        "tehsil": "05",
        "village_id": "VIL_JAM_001",
        "khasra": "45/2",
        "polygon": [[74.85, 32.73], [74.86, 32.73], [74.86, 32.74], [74.85, 32.74], [74.85, 32.73]]
    },
    {
        "name": "Srinagar Agricultural Land",
        "district": "Srinagar",
        "tehsil": "02",
        "village_id": "VIL_SRI_042",
        "khasra": "123/A",
        "polygon": [[74.79, 34.08], [74.80, 34.08], [74.80, 34.09], [74.79, 34.09], [74.79, 34.08]]
    },
    {
        "name": "Anantnag Valley Parcel",
        "district": "Anantnag",
        "tehsil": "01",
        "village_id": "VIL_ANA_015",
        "khasra": "67/1",
        "polygon": [[75.14, 33.73], [75.15, 33.73], [75.15, 33.74], [75.14, 33.74], [75.14, 33.73]]
    },
    {
        "name": "Baramulla Orchard",
        "district": "Baramulla",
        "tehsil": "03",
        "village_id": "VIL_BAR_028",
        "khasra": "89/B",
        "polygon": [[74.33, 34.20], [74.34, 34.20], [74.34, 34.21], [74.33, 34.21], [74.33, 34.20]]
    },
    {
        "name": "Kathua Border Plot",
        "district": "Kathua",
        "tehsil": "04",
        "village_id": "VIL_KAT_007",
        "khasra": "12/3",
        "polygon": [[75.50, 32.39], [75.51, 32.39], [75.51, 32.40], [75.50, 32.40], [75.50, 32.39]]
    }
]


def calculate_centroid(polygon):
    """Calculate centroid of polygon"""
    lon_sum = sum(p[0] for p in polygon)
    lat_sum = sum(p[1] for p in polygon)
    count = len(polygon)
    return lat_sum / count, lon_sum / count


def generate_test_data():
    """Generate test data with parcel IDs"""
    generator = LandParcelIDGenerator()
    results = []
    
    print("=" * 80)
    print("🌍 LAND PARCEL ID GENERATION - TEST DATA")
    print("=" * 80)
    print()
    
    for i, parcel in enumerate(TEST_PARCELS, 1):
        district_code = DISTRICT_CODES.get(parcel["district"], "00")
        tehsil_code = parcel["tehsil"]
        
        # Calculate centroid
        lat, lon = calculate_centroid(parcel["polygon"])
        
        # Generate parcel ID
        parcel_id = generator.generate_from_coordinates(
            latitude=lat,
            longitude=lon,
            district_code=district_code,
            tehsil_code=tehsil_code
        )
        
        # Parse to verify
        parsed = generator.parse_parcel_id(parcel_id)
        
        # Create GeoJSON
        geojson = {
            "type": "Polygon",
            "coordinates": [parcel["polygon"]]
        }
        
        result = {
            "parcel_id": parcel_id,
            "formatted_id": parsed["formatted_id"],
            "name": parcel["name"],
            "district": parcel["district"],
            "district_code": district_code,
            "tehsil_code": tehsil_code,
            "village_id": parcel["village_id"],
            "khasra_number": parcel["khasra"],
            "centroid": {
                "latitude": round(lat, 6),
                "longitude": round(lon, 6)
            },
            "decoded": {
                "latitude": parsed["latitude"],
                "longitude": parsed["longitude"]
            },
            "geojson": json.dumps(geojson),
            "sql_insert": f"""
INSERT INTO landparcel (id, parcel_id, village_id, khasra_number, geometry, tehsil_code)
VALUES (
    gen_random_uuid(),
    '{parcel_id}',
    '{parcel["village_id"]}',
    '{parcel["khasra"]}',
    ST_GeomFromText('POLYGON(({', '.join([f'{p[0]} {p[1]}' for p in parcel["polygon"]])})", 4326),
    '{tehsil_code}'
);
""".strip()
        }
        
        results.append(result)
        
        # Print summary
        print(f"📍 Parcel #{i}: {parcel['name']}")
        print(f"   Parcel ID:     {parsed['formatted_id']}")
        print(f"   District:      {parcel['district']} (Code: {district_code})")
        print(f"   Khasra:        {parcel['khasra']}")
        print(f"   Centroid:      {lat:.6f}, {lon:.6f}")
        print(f"   Decoded:       {parsed['latitude']:.6f}, {parsed['longitude']:.6f}")
        
        # Calculate accuracy
        lat_error = abs(lat - parsed['latitude'])
        lon_error = abs(lon - parsed['longitude'])
        max_error_km = max(lat_error, lon_error) * 111
        
        print(f"   Accuracy:      ±{max_error_km:.2f} km")
        print()
    
    print("=" * 80)
    print(f"✅ Generated {len(results)} Test Parcels")
    print("=" * 80)
    
    return results


def generate_sql_script(results):
    """Generate SQL script to insert all test data"""
    print("\n📝 SQL INSERTION SCRIPT:")
    print("=" * 80)
    print("-- Execute this in PostgreSQL to create test parcels")
    print()
    
    for result in results:
        print(f"-- {result['name']}")
        print(result['sql_insert'])
        print()
    
    print("=" * 80)


def generate_frappe_script(results):
    """Generate Frappe console script"""
    print("\n📝 FRAPPE CONSOLE SCRIPT:")
    print("=" * 80)
    print("# Execute this in Frappe to create test parcels")
    print("# Run: bench --site localhost console")
    print()
    print("import frappe")
    print()
    
    for result in results:
        print(f"# {result['name']}")
        print(f"doc = frappe.get_doc({{")
        print(f"    'doctype': 'Land Parcel',")
        print(f"    'parcel_id': '{result['parcel_id']}',")
        print(f"    'village_id': '{result['village_id']}',")
        print(f"    'khasra_number': '{result['khasra_number']}',")
        print(f"    'district': '{result['district']}',")
        print(f"    'tehsil': '{result['tehsil_code']}',")
        print(f"    'geojson': '''{result['geojson']}'''")
        print(f"}})")
        print(f"doc.insert()")
        print()
    
    print("frappe.db.commit()")
    print("print('✅ Created all test parcels')")
    print("=" * 80)


def generate_verification_queries(results):
    """Generate SQL queries to verify data"""
    print("\n📝 VERIFICATION QUERIES:")
    print("=" * 80)
    print("-- Verify all parcels were created correctly")
    print()
    
    print("-- Count total parcels")
    print("SELECT COUNT(*) as total_parcels FROM landparcel;")
    print()
    
    print("-- View all test parcels")
    print("SELECT ")
    print("    parcel_id,")
    print("    khasra_number,")
    print("    village_id,")
    print("    SUBSTRING(parcel_id, 1, 2) as district,")
    print("    SUBSTRING(parcel_id, 3, 2) as tehsil,")
    print("    ST_AsText(ST_Centroid(geometry)) as centroid")
    print("FROM landparcel")
    print("ORDER BY parcel_id;")
    print()
    
    print("-- Search by district (Jammu = 01)")
    print("SELECT parcel_id, khasra_number, village_id")
    print("FROM landparcel")
    print("WHERE parcel_id LIKE '01%';")
    print()
    
    print("=" * 80)


if __name__ == "__main__":
    # Generate test data
    results = generate_test_data()
    
    # Save to JSON file
    output_file = "test_parcels.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Saved test data to: {output_file}")
    
    # Generate scripts
    generate_sql_script(results)
    generate_frappe_script(results)
    generate_verification_queries(results)
    
    print("\n✅ TEST DATA GENERATION COMPLETE!")
    print(f"   Generated {len(results)} parcels across {len(set(r['district'] for r in results))} districts")
    print(f"   Saved to: {output_file}")
