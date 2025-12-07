# 🗺️ Geo-Spatial & Extraction Architecture

**Status**: ✅ Active Development  
**Date**: December 7, 2025

---

##  PART 1: FIELD EXTRACTION (Regex & OCR)

This section describes the patterns used for extracting fields from Urdu land record documents.

### 1. Document Types

#### Girdawari (Crop Inspection Records)
- **Extracted Fields**: `khasra_number`, `village`, `owner_name`, `area`, `crop`, `season`, `irrigation`, `date`
- **Logic**: Scanning for keywords like "خسرہ نمبر" (Khasra Number) and "رقبہ" (Area).

#### Khasra (Land Record)
- **Extracted Fields**: `khasra_number`, `village`, `halqa`, `owner_names`, `total_area`, `khata_number`

### 2. Regex Patterns (Urdu/English)

| Field | Pattern Example (Python Re) |
|-------|-----------------------------|
| **Khasra** | `r'(?:خسرہ|khasra|plot)[\s:]+(\d+(?:[/-]\d+)*)'` |
| **Village** | `r'(?:گاؤں|village|mouza|مؤضع)[\s:]+([^\d\n]+?)(?:\s|$|،)'` |
| **Area** | `r'(?:رقبہ|area|رقبه)[\s:]+(\d+\.?\d*)'` |
| **Name** | `r'(?:مالک|owner|malik)[\s:]+([^\d\n]+?)(?:ولد|s/o|w/o|d/o|\n|$)'` |

### 3. Confidence Logic
```python
final_confidence = (field_confidence * 0.6) + (ocr_confidence * 0.4)
```

### 4. Expansion
To add new documents, inherit from `BaseFieldExtractor` and implement `extract_field()` methods.

---

## PART 2: REAL OFFLINE MAP TILE SERVER

The backend now fully supports offline map serving via `.mbtiles` without external dependencies.

### 1. Implementation Status: ✅ COMPLETED

| Feature | Details |
|---------|---------|
| **Source** | Filesystem Scan (`backend/tiles/*.mbtiles`) |
| **Format** | SQLite Database (Vector PBF or Raster JPG/PNG) |
| **Serving** | `/tiles/{id}/{z}/{x}/{y}.{ext}` (TMS Support) |
| **Styling** | Auto-generated MapLibre Style JSON |
| **Download** | Direct file download for offline caching |

### 2. Core Endpoints

- **Manifest**: `GET /api/v1/geo/tiles/manifest/{district}`
  - Scans folder, reads metadata, returns download URLs.
  
- **Tile Server**: `GET /api/v1/geo/tiles/{tileset_id}/{z}/{x}/{y}.{ext}`
  - Serves binary tile data from SQLite.
  - Handles TMS Y-flip automatically.

- **Style Gen**: `GET /api/v1/geo/tiles/{tileset_id}/style.json`
  - Creates style on the fly for MapLibre clients.

### 3. How to Add Maps
1. Drop `.mbtiles` file into `backend/tiles/`.
2. That's it. (Backend auto-discovers).

---

## 🏁 Combined Summary
- **Extraction**: Robust Urdu regex support for key land records.
- **Mapping**: Production-ready offline tile server integration.
