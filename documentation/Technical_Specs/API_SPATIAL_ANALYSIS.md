# Spatial Analysis API - Usage Guide

## Overview
The Spatial Analysis API provides endpoints for comparing Record of Rights (ROR) data with cadastral maps and satellite imagery to detect discrepancies and prioritize ground surveys.

## Base URL
```
http://localhost:8000/api/v1/spatial
```

## Authentication
All endpoints require `X-API-Version: v1` header (enforced by `check_api_version` dependency where applicable).

---

## Endpoints

### 1. Analyze Single Parcel Discrepancy

**POST** `/analyze-discrepancy`

Compares ROR, cadastral, and satellite data for a specific parcel.

**Request Body:**
```json
{
  "ulpin": "01051432215477",
  "include_satellite": true
}
```

**Response:**
```json
{
  "ulpin": "01051432215477",
  "khasra_number": "123/4",
  "data_sources": {
    "ror": true,
    "cadastral": true,
    "satellite": false
  },
  "discrepancies": {
    "area_diff_pct": 12.5,
    "shape_similarity": 78.3
  },
  "recommendation": {
    "needs_survey": true,
    "priority": 3,
    "priority_label": "MEDIUM",
    "estimated_cost": 425.50,
    "reason": ["High area discrepancy: 12.5%"]
  },
  "geometric_quality": {
    "is_valid": true,
    "area_sqm": 5250.75,
    "centroid": "POINT(74.7238 32.8594)"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/v1/spatial/analyze-discrepancy \
  -H "Content-Type: application/json" \
  -d '{"ulpin": "01051432215477"}'
```

---

### 2. Batch Analysis

**POST** `/batch-analyze`

Analyze multiple parcels in one request (max 100 ULPINs).

**Request Body:**
```json
{
  "ulpins": ["01051432215477", "01051433215478", "01051434215479"],
  "priority_filter": "HIGH"
}
```

**Response:** Array of `DiscrepancyReport` objects

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/v1/spatial/batch-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ulpins": ["01051432215477", "01051433215478"],
    "priority_filter": "HIGH"
  }'
```

---

### 3. Get Survey Queue

**GET** `/survey-queue`

Retrieve prioritized list of parcels requiring ground survey.

**Query Parameters:**
- `priority` (int, optional): Filter by priority (1=URGENT, 5=LOW)
- `village_id` (string, optional): Filter by village
- `limit` (int, default=50, max=200): Number of results

**Response:**
```json
[
  {
    "ulpin": "01051432215477",
    "khasra_number": "123/4",
    "village_id": "VIL001",
    "priority": 1,
    "area_discrepancy_pct": 25.3,
    "estimated_cost": 637.50,
    "assigned_surveyor": null,
    "status": "PENDING"
  }
]
```

**cURL Example:**
```bash
curl "http://localhost:8000/api/v1/spatial/survey-queue?priority=1&village_id=VIL001&limit=20"
```

---

### 4. Register Geometry Source

**POST** `/register-geometry`

Upload new geometry from cadastral vectorization, satellite detection, or field survey.

**Query Parameters:**
- `ulpin` (string, required): Parcel identifier

**Request Body:**
```json
{
  "source_type": "survey",
  "geometry_wkt": "POLYGON((74.7238 32.8594, 74.7248 32.8594, 74.7248 32.8604, 74.7238 32.8604, 74.7238 32.8594))",
  "confidence": 1.0,
  "metadata": {
    "survey_date": "2025-12-12",
    "surveyor_id": "EMP001",
    "equipment": "Trimble R12 DGPS"
  }
}
```

**Response:**
```json
{
  "ulpin": "01051432215477",
  "source_type": "survey",
  "status": "registered",
  "confidence": 1.0
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/spatial/register-geometry?ulpin=01051432215477" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "survey",
    "geometry_wkt": "POLYGON((...)",
    "confidence": 1.0
  }'
```

---

### 5. Village Statistics

**GET** `/village-statistics/{village_id}`

Get aggregated spatial data quality metrics for a village.

**Response:**
```json
{
  "village_id": "VIL001",
  "total_parcels": 523,
  "data_availability": {
    "cadastral_coverage": 87.2,
    "satellite_coverage": 45.8,
    "ror_coverage": 100.0
  },
  "quality_metrics": {
    "high_confidence": 412,
    "needs_review": 89,
    "needs_survey": 22
  },
  "cost_estimates": {
    "total_survey_cost": 145000,
    "priority_survey_cost": 87500
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:8000/api/v1/spatial/village-statistics/VIL001"
```

---

### 6. Fuse Geometries

**POST** `/fuse-geometries`

Create weighted composite geometry from multiple sources.

**Query Parameters:**
- `ulpin` (string, required)

**Request Body:**
```json
{
  "cadastral": 0.4,
  "satellite": 0.6
}
```

**Response:**
```json
{
  "ulpin": "01051432215477",
  "fused_geometry": "POLYGON(...)",
  "weights_applied": {
    "cadastral": 0.4,
    "satellite": 0.6
  },
  "dominant_source": "satellite",
  "confidence": 0.6
}
```

---

## Error Responses

**404 Not Found:**
```json
{
  "detail": "Parcel 01051432215477 not found"
}
```

**400 Bad Request:**
```json
{
  "detail": "Invalid WKT geometry"
}
```

---

## Integration Examples

### Python Client
```python
import requests

API_BASE = "http://localhost:8000/api/v1/spatial"

def analyze_parcel(ulpin: str):
    response = requests.post(
        f"{API_BASE}/analyze-discrepancy",
        json={"ulpin": ulpin, "include_satellite": True}
    )
    return response.json()

report = analyze_parcel("01051432215477")
if report["recommendation"]["needs_survey"]:
    print(f"Survey required: {report['recommendation']['reason']}")
```

### JavaScript/TypeScript
```typescript
const analyzeParcel = async (ulpin: string) => {
  const response = await fetch(
    'http://localhost:8000/api/v1/spatial/analyze-discrepancy',
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ulpin, include_satellite: true})
    }
  );
  return response.json();
};
```

---

## OpenAPI Documentation

Interactive API docs available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
