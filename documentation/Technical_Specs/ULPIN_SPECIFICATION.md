# ULPIN - Unique Land Parcel Identification Number

## Official Specification

**ULPIN (Unique Land Parcel Identification Number)** is a 14-digit geocoordinate-based identifier system aligned with India's national land identification standards. Each ULPIN uniquely identifies a land parcel based on its geographic location and administrative jurisdiction.

## System Overview

### Purpose
- Provide unique, permanent identification for every land parcel
- Enable location-based queries and spatial analysis
- Integrate with national land record systems
- Support digital land administration and e-governance

### Compliance
- Follows India's Digital India Land Records Modernization Programme (DILRMP)
- Compatible with national ULPIN framework
- Implements geocoding standards for Jammu & Kashmir region

## ULPIN Format

```
XXYY-ZZZZ-SSSS-CC
│││  │    │    └─ Checksum (2 digits, MD5-based validation)
│││  │    └────── Encoded Longitude (4 digits, 0000-9999)
│││  └─────────── Encoded Latitude (4 digits, 0000-9999)
││└───────────── Tehsil/Sub-District Code (2 digits, 01-99)
└└────────────── District Code (2 digits, 01-20)
```

### Example ULPIN
```
0105-1424-2156-72
│ │  │    │    └─ Checksum: 72 (validity verification)
│ │  │    └────── Longitude: 74.725° (encoded as 2156)
│ │  └─────────── Latitude: 32.855° (encoded as 1424)
│ └───────────── Tehsil: 05 (Akhnoor)
└─────────────── District: 01 (Jammu)
```

## Technical Specifications

### Coordinate Encoding
- **Latitude Range**: 32.0°N to 38.0°N (J&K region)
- **Longitude Range**: 73.0°E to 81.0°E (J&K region)
- **Precision**: 4 digits (10,000 levels) per coordinate
- **Accuracy**: ±50-70 meters at centroid
- **Resolution**: ~600m per unit (latitude), ~800m (longitude)

### Checksum Algorithm
- **Method**: MD5 hash truncated to 2 digits
- **Input**: District + Tehsil + Latitude + Longitude codes
- **Output**: 2-digit verification code (00-99)
- **Purpose**: Detect data entry errors and prevent fraud

### Database Schema
```sql
CREATE TABLE landparcel (
    id UUID PRIMARY KEY,
    parcel_id VARCHAR(14) UNIQUE NOT NULL,  -- ULPIN
    geometry GEOMETRY(POLYGON, 4326),
    village_id VARCHAR,
    khasra_number VARCHAR,
    tehsil_code VARCHAR(2),
    -- ... other fields
);

CREATE UNIQUE INDEX ix_landparcel_ulpin ON landparcel(parcel_id);
```

## Administrative Codes

### District Codes (Jammu & Kashmir)

| Code | District   | Code | District   |
|------|-----------|------|-----------|
| 01   | Jammu     | 11   | Srinagar  |
| 02   | Samba     | 12   | Ganderbal |
| 03   | Kathua    | 13   | Budgam    |
| 04   | Udhampur  | 14   | Anantnag  |
| 05   | Reasi     | 15   | Kulgam    |
| 06   | Rajouri   | 16   | Pulwama   |
| 07   | Poonch    | 17   | Shopian   |
| 08   | Doda      | 18   | Baramulla |
| 09   | Ramban    | 19   | Bandipora |
| 10   | Kishtwar  | 20   | Kupwara   |

### Tehsil Codes
- Format: 2-digit codes (01-99)
- Assigned sequentially within each district
- Maintained in district master data

## Implementation

### Auto-Generation (PostgreSQL)
```python
from app.utils.parcel_id_generator import ULPINGenerator

# Automatically generated on INSERT
INSERT INTO landparcel (geometry, village_id, khasra_number, tehsil_code)
VALUES (
    ST_GeomFromText('POLYGON((...))'), 
    'VIL001', 
    '123/A', 
    '05'
);
# → ULPIN auto-generated from geometry centroid
```

### Auto-Generation (Frappe)
```python
import frappe

doc = frappe.get_doc({
    "doctype": "Land Parcel",
    "village_id": "VIL001",
    "khasra_number": "123/A",
    "district": "Jammu",
    "tehsil": "05",
    "geojson": '{"type":"Polygon","coordinates":[...]}'
})
doc.insert()  # ULPIN auto-generated before insert
frappe.db.commit()
```

### Manual Generation (Python API)
```python
from app.utils.parcel_id_generator import ULPINGenerator

gen = ULPINGenerator()

# From coordinates
ulpin = gen.generate_ulpin(
    latitude=32.8594,
    longitude=74.7238,
    district_code="01",
    tehsil_code="05"
)
print(ulpin)  # "01051432215477"

# Parse ULPIN
parsed = gen.parse_ulpin("01051432215477")
print(f"Location: {parsed['latitude']}, {parsed['longitude']}")
print(f"District: {parsed['district_code']}")
```

## Data Validation

### ULPIN Validation Rules
1. **Length**: Exactly 14 digits
2. **District Code**: 01-20 (valid J&K district)
3. **Tehsil Code**: 01-99 (must exist in district)
4. **Latitude Code**: 0000-9999 (within J&K bounds)
5. **Longitude Code**: 0000-9999 (within J&K bounds)
6. **Checksum**: Must match calculated value

### Validation Example
```python
def validate_ulpin(ulpin: str) -> bool:
    gen = ULPINGenerator()
    try:
        parsed = gen.parse_ulpin(ulpin)
        # Successful parsing = valid ULPIN
        return True
    except ValueError as e:
        # Invalid checksum or format
        return False
```

## Query Patterns

### Search by District
```sql
-- All parcels in Jammu district
SELECT * FROM landparcel WHERE parcel_id LIKE '01%';
```

### Search by Tehsil
```sql
-- All parcels in Akhnoor tehsil (District 01, Tehsil 05)
SELECT * FROM landparcel WHERE parcel_id LIKE '0105%';
```

### Decode Location
```sql
SELECT 
    parcel_id as ulpin,
    SUBSTRING(parcel_id, 1, 2) as district,
    SUBSTRING(parcel_id, 3, 2) as tehsil,
    SUBSTRING(parcel_id, 5, 4) as lat_code,
    SUBSTRING(parcel_id, 9, 4) as lon_code,
    SUBSTRING(parcel_id, 13, 2) as checksum,
    ST_AsText(ST_Centroid(geometry)) as actual_coords
FROM landparcel
WHERE khasra_number = '123/A';
```

### Proximity Search
```python
# Find parcels near a decoded ULPIN location
parsed = gen.parse_ulpin("01051432215477")
nearby_lat = parsed['latitude']
nearby_lon = parsed['longitude']

# Query parcels within ~1km
query = f"""
SELECT parcel_id, khasra_number,
       ST_Distance(
           ST_Centroid(geometry),
           ST_MakePoint({nearby_lon}, {nearby_lat})
       ) * 111 as distance_km
FROM landparcel
WHERE ST_DWithin(
    ST_Centroid(geometry),
    ST_MakePoint({nearby_lon}, {nearby_lat}),
    0.01  -- ~1km in degrees
)
ORDER BY distance_km;
"""
```

## Integration Points

### 1. Land Registration System
- ULPINs assigned during new survey or settlement
- Linked to mutation records and ownership transfers
- Permanent identifier across transactions

### 2. Revenue Department
- Used for property tax assessment
- Linked to khasra/khewat numbers
- Integrated with cadastral maps

### 3. E-Governance Services
- Online land record queries by ULPIN
- Digital signatures and e-stamping
- Blockchain-based property verification

### 4. GIS & Mapping
- ULPIN serves as unique feature ID
- Enables geocoding without full coordinates
- Supports offline/low-bandwidth queries

## Benefits

### For Government
✓ **Standardization**: Uniform identification across state
✓ **Deduplication**: Prevents duplicate land records
✓ **Integration**: Compatible with national systems
✓ **Efficiency**: Faster record retrieval and verification

### For Citizens
✓ **Transparency**: Clear, verifiable land identification
✓ **Accessibility**: Easy to remember and communicate
✓ **Permanence**: ULPIN never changes (unlike khasra)
✓ **Digitalization**: Enables online services

### For Developers
✓ **API-Friendly**: Simple string identifier
✓ **Database-Optimized**: Indexed for performance
✓ **Self-Validating**: Checksum prevents errors
✓ **Geocoded**: Location embedded in ID

## Migration from Legacy Systems

### Existing Parcels
```sql
-- Generate ULPINs for parcels without them
UPDATE landparcel
SET parcel_id = (
    SELECT generate_ulpin_from_geometry(
        geometry,
        district_code,
        tehsil_code
    )
)
WHERE parcel_id IS NULL AND geometry IS NOT NULL;
```

### Khasra Number Mapping
- ULPIN complements (not replaces) khasra numbers
- Khasra remains primary administrative reference
- ULPIN adds geographic & digital layer
- Both stored in database for cross-reference

## Future Enhancements

### Planned Features
1. **QR Code Integration**: Embed ULPIN in QR codes on documents
2. **Mobile App**: ULPIN-based parcel lookup
3. **IoT Integration**: Link with soil sensors, smart meters
4. **Blockchain**: Immutable ULPIN-based land registry
5. **AI/ML**: Fraud detection using ULPIN patterns

### National Integration
- Sync with central ULPIN registry
- Cross-state parcel verification
- National land market analytics

## Support & Documentation

- **System Files**: `/backend/app/utils/parcel_id_generator.py`
- **Test Suite**: `/backend/tests/test_parcel_id.py`
- **API Docs**: `/backend/docs/PARCEL_ID_SYSTEM.md`
- **Frappe Module**: `land_records/lr_core/doctype/land_parcel/`

## References

- Digital India Land Records Modernization Programme (DILRMP)
- National ULPIN Framework (Department of Land Resources)
- Survey of India Geocoding Standards
- J&K Revenue Department Land Records Manual

---

**Version**: 1.0  
**Last Updated**: Dec 2024  
**Implementation**: Jammu & Kashmir Land Records System
