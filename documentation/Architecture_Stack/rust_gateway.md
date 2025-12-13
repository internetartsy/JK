# Rust Gateway Architecture (GeoShield)

## 1. Scope & Responsibility
The Rust Gateway acts as the secure ingress for the AgriStack platform, enforcing strict security controls before requests reach internal services (FastAPI, Frappe). It implements a **Zero Trust** architecture at the edge.

## 2. Architecture & Flow
```mermaid
flowchart TD
    Client -->|HTTPS| Gateway[Rust Security Gateway :8090]
    subgraph Gateway Security Layers
        Auth[Authentication Middleware]
        Headers[Security Headers (ISO 27001)]
        Rate[Rate Limiting (DoS Protection)]
        Audit[Audit Logging (Traceability)]
    end
    Gateway --> Auth --> Headers --> Rate --> Audit
    Audit -->|Valid| Router{Router}
    
    Router -->|/api/v1/*| Backend[FastAPI Backend :8000]
    Router -->|/app/*| ERP[Frappe ERPNext :8000]
    Router -->|/*| Frontend[React PWA :5173]
    
    Audit -.->|Log Stream| Stdout[JSON Logs]
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
*   **Internal Routing**:
    *   Backend: `http://backend:8000`
    *   Frappe: `http://frappe:8000`
    *   Frontend: `http://frontend:5173`

## 5. Deployment
*   **Docker Service**: `jk-security-gateway`
*   **Base Image**: `rust:1-slim-bookworm` (Hardened, minimal footprint).
*   **Build**: Multi-stage build with `cargo release`.

## 6. Future Roadmap
1.  **Encryption**: Client-side AES-256 GCM encryption/decryption middleware.
2.  **RBAC Enforcement**: Deep inspection of JWT roles at the gateway level.
