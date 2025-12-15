# Rust Gateway V2 Implementation Details

## Overview
The Rust "GeoShield" Gateway (V2) has been upgraded with the following security middlewares:

### 1. Authentication (`middleware/auth.rs`)
- Intercepts all requests (except `/health`, `/db-check`, and assets).
- Checks for `Authorization: Bearer <token>` header.
- Enforces valid JWT signature (HS256) using `JWT_SECRET` (or RS256 if configured).
- Returns `401 Unauthorized` if connection is invalid.

### 2. Rate Limiting (`middleware/ratelimit.rs`)
- Uses `governor` crate.
- Global Quota: 20 requests per second, burst up to 50.
- Returns `429 Too Many Requests` if exceeded.
- Protects downstream services (FastAPI, Frappe) from DOS.

### 3. Audit Logging (`middleware/audit.rs`)
- Asynchronous logging using standard `log` crate (target: `audit`).
- Logs in structured JSON format:
  ```json
  { "method": "GET", "path": "/api/v1/geo/...", "status": 200, "duration_ms": 45, "ip": "127.0.0.1" }
  ```
- Captures Request Method, Path, Response Status, Duration, and Client IP.

### 4. Routing Logic (`proxy_handler` in `main.rs`)
- Proxies requests based on path prefix:
  - `/api/v1/*` -> Backend Core (FastAPI)
    - **OCR Traffic**: `/api/v1/ocr/*` (Protected & Rate Limited)
    - **Geo Intelligence**: `/api/v1/spatial/*`, `/api/v1/geo/*` (ISO Compliant)
  - `/app/*`, `/assets/*` -> Frappe (ERPNext)
  - Default -> Frontend (Vite PWA)
- Forwards Headers and Body securely.

## ISO 27001 Alignment
This gateway enforces the following controls:
- **A.13.1 (Network Security Management)**: Segregation of frontend and backend services via reverse proxy.
- **A.14.2 (Development Security)**: Input validation and rate limiting on OCR endpoints to prevent resource exhaustion attacks.

## Topology Validation (Backend)
The backend `geo` service has been updated (`api/v1/geo.py`) to provide robust topology checking:
- **Validations**: `ST_IsValid` (PostGIS) and `ST_Intersects` + `NOT ST_Touches` (Overlap detection).
- **Safety**: Queries filter for valid geometries only to prevent GEOS `TopologyException` crashes on self-intersecting polygons.
- **Seeding**: Test data added for Valid, Invalid (Bowtie), and Overlapping parcels.

## Future Steps
1. **Keycloak Integration**: Replace stub auth with `jsonwebtoken` validation using Keycloak's public key (JWKS).
2. **Encryption**: Implement AES-256 middleware for sensitive payload encryption on specific routes.
