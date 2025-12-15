# 🌍 Land Parcel ID System - Complete Guide

## Overview

The Land Parcel ID System generates unique 14-digit identifiers for land parcels based on their geocoordinates. Each ID encodes the district, tehsil, and precise location, enabling instant geographic lookup and verification.

## ID Format

```
XXYY-ZZZZ-SSSS-CC
│││  │    │    └─ Checksum (2 digits, MD5-based)
│││  │    └────── Encoded Longitude (4 digits)
│││  └─────────── Encoded Latitude (4 digits)
││└───────────── Tehsil Code (2 digits)
└└────────────── District Code (2 digits)
```

### Example
```
0105-1424-2156-72
│ │  │    │    └─ Checksum: 72
│ │  │    └────── Lon: 74.725° (encoded as 2156)
│ │  └─────────── Lat: 32.855° (encoded as 1424)
│ └───────────── Tehsil: 05
└─────────────── District: 01 (Jammu)
```

## Features

✅ **Unique** - Each coordinate generates a distinct ID
✅ **Geocoded** - Location embedded in the ID itself
✅ **Validated** - Checksum prevents typos and fraud
✅ **Human-Readable** - Structured format with hyphens
✅ **Reversible** - Decode ID to get approximate coordinates
✅ **Database-Optimized** - Indexed for fast lookups

## Installation

### Backend (PostgreSQL + Python)

1. **Database Migration**
```bash
docker exec jk-fastapi alembic upgrade head
```

2. **Verify Schema**
```bash
docker exec jk-postgres psql -U jk_user -d jk_land_records -c "\d landparcel"
```

3. **Restart Services**
```bash
docker restart jk-fastapi jk-erp-web
```

### Frappe ERPNext

The system auto-installs with the `land_records` app. Parcel IDs are generated automatically when creating Land Parcel records.

## Usage

### Python (Backend)

```python
from app.utils.parcel_id_generator import LandParcelIDGenerator

# Initialize generator
gen = LandParcelIDGenerator()

# Generate ID from coordinates
parcel_id = gen.generate_from_coordinates(
    latitude=32.8594,
    longitude=74.7238,
    district_code="01",  # Jammu
    tehsil_code="05"     # Akhnoor
)
# Result: "01051432215477"

# Parse ID back to components
parsed = gen.parse_parcel_id(parcel_id)
print(parsed)
# {
#   "district_code": "01",
#   "tehsil_code": "05",
#   "latitude": 32.859286,
#   "longitude": 74.723372,
#   "checksum": "77",
#   "formatted_id": "0105-1432-2154-77"
# }

# Generate from GeoJSON
geojson = {
    "type": "Polygon",
    "coordinates": [[[74.72, 32.85], [74.73, 32.85], 
                     [74.73, 32.86], [74.72, 32.86], [74.72, 32.85]]]
}
parcel_id = gen.generate_from_centroid(
    geojson=geojson,
    district_code="01",
    tehsil_code="05"
)
```

### SQL (PostgreSQL)

```sql
-- Parcel IDs are auto-generated on insert
INSERT INTO landparcel (village_id, khasra_number, geometry, tehsil_code)
VALUES (
    'VIL001',
    '123/A',
    ST_GeomFromText('POLYGON((74.72 32.85, 74.73 32.85, 74.73 32.86, 74.72 32.86, 74.72 32.85))', 4326),
    '05'
);

-- Query by district
SELECT * FROM landparcel WHERE parcel_id LIKE '01%';  -- All Jammu parcels

-- Decode parcel_id components
SELECT 
    parcel_id,
    SUBSTRING(parcel_id, 1, 2) as district_code,
    SUBSTRING(parcel_id, 3, 2) as tehsil_code,
    SUBSTRING(parcel_id, 5, 4) as lat_encoded,
    SUBSTRING(parcel_id, 9, 4) as lon_encoded,
    SUBSTRING(parcel_id, 13, 2) as checksum
FROM landparcel;
```

### Frappe (Server Script)

```python
import frappe

# Create Land Parcel (ID auto-generates)
doc = frappe.get_doc({
    "doctype": "Land Parcel",
    "village_id": "VIL001",
    "khasra_number": "123/A",
    "district": "Jammu",
    "tehsil": "05",
    "geojson": '{"type":"Polygon","coordinates":[[[74.72,32.85],[74.73,32.85],[74.73,32.86],[74.72,32.86],[74.72,32.85]]]}'
})
doc.insert()
frappe.db.commit()

print(f"Generated Parcel ID: {doc.parcel_id}")
```

## District Codes

| District   | Code | District   | Code |
|-----------|------|-----------|------|
| Jammu     | 01   | Srinagar  | 11   |
| Samba     | 02   | Ganderbal | 12   |
| Kathua    | 03   | Budgam    | 13   |
| Udhampur  | 04   | Anantnag  | 14   |
| Reasi     | 05   | Kulgam    | 15   |
| Rajouri   | 06   | Pulwama   | 16   |
| Poonch    | 07   | Shopian   | 17   |
| Doda      | 08   | Baramulla | 18   |
| Ramban    | 09   | Bandipora | 19   |
| Kishtwar  | 10   | Kupwara   | 20   |

## API Examples

### Create Parcel (FastAPI)

```bash
curl -X POST http://localhost:8000/api/v1/parcels \
  -H "Content-Type: application/json" \
  -d '{
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[74.72, 32.85], [74.73, 32.85], 
                       [74.73, 32.86], [74.72, 32.86], [74.72, 32.85]]]
    },
    "village_id": "VIL001",
    "khasra_number": "123/A",
    "tehsil_code": "05"
  }'
```

### Query Parcels

```bash
# Get all parcels in Jammu district
curl http://localhost:8000/api/v1/parcels?district_code=01

# Get specific parcel by ID
curl http://localhost:8000/api/v1/parcels/01051432215477
```

## Accuracy

- **Coordinate Precision**: ±50-70 meters (average)
- **Bit Depth**: 4 digits per coordinate = 10,000 levels
- **Coverage**: Entire J&K region (32°-38°N, 73°-81°E)
- **Resolution**: ~600m per encoded unit (latitude), ~800m (longitude)

## Testing

### Run Test Suite

```bash
python backend/tests/test_parcel_id.py
```

### Generate Test Data

```bash
python backend/tests/generate_test_parcels.py
```

This creates 5 sample parcels across different districts with SQL and Frappe scripts.

## Troubleshooting

### ID Not Generating

**Problem**: `parcel_id` is NULL after insert

**Solution**: Ensure geometry is valid and not NULL
```sql
SELECT ST_IsValid(geometry) FROM landparcel WHERE parcel_id IS NULL;
```

### Checksum Validation Failed

**Problem**: `parse_parcel_id()` raises ValueError

**Solution**: ID may be corrupted. Regenerate from coordinates:
```python
# Get record
parcel = session.query(LandParcel).filter_by(id=uuid).first()

# Regenerate ID
parcel.generate_parcel_id(session, district_code="01", tehsil_code="05")
session.commit()
```

### Duplicate IDs

**Problem**: Two parcels with same ID

**Solution**: Check if centroids are identical. If geometries overlap, IDs will match. This is by design - use khasra_number as secondary identifier.

## Advanced Features

### Spatial Queries

```sql
-- Find parcels near a decoded location
WITH target AS (
    SELECT ST_MakePoint(74.725, 32.855) as point
)
SELECT p.parcel_id, p.khasra_number,
       ST_Distance(ST_Centroid(p.geometry), target.point) as distance_degrees
FROM landparcel p, target
ORDER BY distance_degrees
LIMIT 10;
```

### Bulk ID Generation

```python
from sqlalchemy import select
from app.models import LandParcel

# Get all parcels without IDs
parcels = session.execute(
    select(LandParcel).where(LandParcel.parcel_id == None)
).scalars().all()

for parcel in parcels:
    parcel.generate_parcel_id(session, district_code="01", tehsil_code="05")

session.commit()
print(f"Generated {len(parcels)} IDs")
```

## Files

| File | Purpose |
|------|---------|
| `backend/app/utils/parcel_id_generator.py` | Core ID generation logic |
| `backend/app/models/land_parcel.py` | SQLAlchemy model with auto-generation |
| `backend/alembic/versions/add_parcel_id_001.py` | Database migration |
| `backend/tests/test_parcel_id.py` | Comprehensive test suite |
| `backend/tests/generate_test_parcels.py` | Test data generator |
| `frappe-bench/.../land_parcel_auto_id.py` | Frappe auto-ID script |
| `frappe-bench/.../land_parcel.py` | Frappe controller |

## Support

For issues or questions:
1. Check logs: `docker logs jk-fastapi`
2. Verify database: `docker exec jk-postgres psql -U jk_user -d jk_land_records`
3. Test generator: `python backend/tests/test_parcel_id.py`

## License

Part of the JK Land Records System.
