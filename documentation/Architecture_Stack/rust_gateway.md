# Rust Gateway Architecture (GeoShield)

## 1. Scope & Responsibility
The Rust Gateway acts as the secure ingress for the AgriStack platform, enforcing strict security controls before requests reach internal services (FastAPI, Frappe). It implements a **Zero Trust** architecture at the edge.

## 2. Architecture & Flow
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
    User -->|HTTPS| Nginx
    Mobile -->|HTTPS| Nginx

    Nginx -->|/ (Root)| Frontend
    Nginx -->|/api| Gateway
    Nginx -->|/app| Frappe

    Gateway -->|Auth & Rate Limit| Backend
    Gateway -->|Proxy Legacy| Frappe
    
    Backend -->|Read/Write| PSQL
    Backend -->|Cache| Redis
    Backend -->|Store Files| MinIO
    
    Frappe -->|System Records| MariaDB
    
    %% -- Logic Flows --
    Backend -.->|Async Task| OCR_Worker
    OCR_Worker -->|Extract Text| Backend
    Backend -->|Sync Result| Frappe
    
    Frappe -.->|Trigger| Dedupe
    Dedupe -->|Find Clusters| Frappe
    
    Mobile -->|Sync Offline Data| Backend
```

## 3. Security Implementation (ISO 27001 Compliant)
This service ensures compliance with **ISO/IEC 27001:2013** and **ISO/IEC 27002:2022**.

### 3.1 Access Control & Authentication
*   **Mechanism**: Bearer Token Validation using `middleware/auth.rs`.
*   **Enforcement**: Strict checks on all API routes.
*   **Identity Tracing**: Extracts `sub` (User ID) from JWTs for Audit Logs.
*   **2FA**: Keycloak configured to enforce TOTP for privileged roles (`officer`, `admin`).

### 3.2 Resilience & Availability
*   **Rate Limiting**:
    *   **Module**: `middleware/ratelimit.rs` (governor crate).
    *   **Policy**: 20 requests/second per worker (Burst: 50).
    *   **Defense**: Mitigates DoS/Brute-force attacks.

### 3.3 Security Headers (Hardening)
Implemented in `middleware/headers.rs` to meet OWASP recommendations:
*   `Strict-Transport-Security`: Forces HTTPS (HSTS).
*   `Content-Security-Policy`: Restricts scripts/styles to 'self'.
*   `X-Frame-Options: DENY`: Prevents Clickjacking.
*   `X-Content-Type-Options: nosniff`: Prevents MIME sniffing.

### 3.4 Audit & Monitoring
*   **Module**: `middleware/audit.rs`.
*   **Format**: Structured JSON.
*   **Events**: Logs Method, Path, Status, Duration, Client IP, and **User ID**.
*   **Goal**: Full traceability of actions to specific users.

#### Log Schema Example
```json
{
  "timestamp": "2024-12-14T12:00:00Z",
  "level": "INFO",
  "target": "audit",
  "method": "POST",
  "path": "/api/v1/parcels",
  "status": 201,
  "duration_ms": 45,
  "client_ip": "192.168.1.50",
  "user_id": "user-uuid-123",
  "user_agent": "JK-Mobile-App/1.0"
}
```

## 4. Endpoints & Configuration
*   **Port**: `8090` (Exposed as Edge)
*   **Internal Routing** (Environment Configured):
    *   Backend: `${BACKEND_URL}` (Default: `http://backend:8000`)
    *   Frappe: `${FRAPPE_URL}` (Default: `http://erp-web:8000`)
    *   Frontend: `${FRONTEND_URL}` (Default: `http://frontend:5173`)
*   **Local Dev Support**: Supports `host.docker.internal` for hybrid debugging.

## 5. Deployment
*   **Docker Service**: `jk-security-gateway`
*   **Base Image**: `rust:1-slim-bookworm` (Hardened, minimal footprint).
*   **Build**: Multi-stage build with `cargo release`.

## 6. Future Roadmap
1.  **Encryption**: Client-side AES-256 GCM encryption/decryption middleware.
2.  **RBAC Enforcement**: Deep inspection of JWT roles at the gateway level.
