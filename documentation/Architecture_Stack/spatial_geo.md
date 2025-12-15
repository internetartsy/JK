# Spatial & Geo Architecture

## 0. System Context (Meridian Architecture)
```mermaid
flowchart TD
    %% -- User Layer --
    User(["User / Device"])
    Mobile(["Mobile App (Offline First)"])
    
    %% -- Edge Layer --
    subgraph Edge_Infrastructure [Edge Infrastructure]
        Nginx["Nginx Reverse Proxy\n(Port 80/443)"]
        Gateway["Rust Security Gateway\n(Port 8090)"]
    end

    %% -- Application Layer --
    subgraph App_Layer [Application Systems]
        Frontend["React Frontend\n(Static Serve)"]
        Backend["FastAPI Backend\n(OCR / Spatial / Dedupe)"]
        Frappe["Frappe / ERPNext\n(System of Record)"]
    end

    %% -- Data Intelligence Layer --
    subgraph Intelligence [Data Intelligence & Processing]
        OCR_Worker["OCR Engine\n(Tesseract/EasyOCR)"]
        Dedupe["Data Cleaning Service\n(Python Algorithm)"]
        Geo_Engine["Spatial Analysis\n(PostGIS/Shapely)"]
    end

    %% -- Persistence Layer --
    subgraph Data_Layer [Persistence]
        PSQL[("PostgreSQL + PostGIS")]
        Redis[("Redis Cache")]
        MinIO[("MinIO Object Storage")]
        MariaDB[("MariaDB - Frappe")]
    end

    %% -- Flows --
    User -->|"HTTPS"| Nginx
    Mobile -->|"HTTPS"| Nginx

    Nginx -->|"/ (Root)"| Frontend
    Nginx -->|"/api"| Gateway
    Nginx -->|"/app"| Frappe

    Gateway -->|"Auth & Rate Limit"| Backend
    Gateway -->|"Proxy Legacy"| Frappe
    
    Backend -->|"Read/Write"| PSQL
    Backend -->|"Cache"| Redis
    Backend -->|"Store Files"| MinIO
    
    Frappe -->|"System Records"| MariaDB
    
    %% -- Logic Flows --
    Backend -.->|"Async Task"| OCR_Worker
    OCR_Worker -->|"Extract Text"| Backend
    Backend -->|"Sync Result"| Frappe
    
    Frappe -.->|"Trigger"| Dedupe
    Dedupe -->|"Find Clusters"| Frappe
    
    Mobile -->|"Sync Offline Data"| Backend
```

## 1. Scope & Responsibility
Geospatial Queries, Tile Serving, and Geometry Validation using PostGIS.
*   **Role**: Manage Parcel Boundaries (Vector) and Maps.
*   **Coordinate System**: WGS84 (EPSG:4326).

## 2. Architecture: Geo-Stack
```mermaid
graph LR
    API[FastAPI] -->|SQL/GeoAlchemy| DB[(PostGIS :5432)]
    DB -->|MVT Tiles| CLIENT[MapLibre GL JS]
    API -->|Validation| ULPIN[ULPIN Service]
```

## 3. Logical Functions & Data
### 3.1 Land Parcel Geometry (Table Schema)
Table `land_parcels`:
- `id` (UUID): Primary Key
- `khasra_number` (String): Indexed
- `geom` (Geometry): `MULTIPOLYGON`, SRID 4326, Spatial Index (GIST)
- `owner_id` (UUID): FK to Farmers

### 3.2 GeoJSON Response
Output from `/api/v1/parcels/geojson`:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[75.1, 32.2], [75.2, 32.2], [75.2, 32.3], [75.1, 32.2]]]
      },
      "properties": {
        "id": "uuid",
        "khasra": "101",
        "area_acres": 2.5,
        "status": "Active"
      }
    }
  ]
}
```

### 3.3 Spatial Operations
*   **Containment**: Check if Point in Parcel (`ST_Contains`).
*   **Overlap**: Detect disputed boundaries (`ST_Overlaps`).
*   **Validation**: Ensure closed rings and valid topology (`ST_IsValid`).

## 4. Endpoints & Ports
*   **Port**: `5432` (DB), `8000` (API)
*   **Endpoints**:
    *   `GET /api/v1/parcels/search?lat=...&lng=...`
    *   `POST /api/v1/spatial/validate`

## 5. Code Locations
*   **Model**: `backend/app/models/land_parcel.py`
*   **Logic**: `backend/app/api/v1/spatial_analysis.py`
