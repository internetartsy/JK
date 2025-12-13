# Native Architecture (Mobile)

## 1. Scope & Responsibility
Offline Data Collection and Field Verification.

## 2. Architecture: Rust Security Aligned
```mermaid
graph TD
    Device[Mobile App] -->|HTTPS/Auth| RustGW[Rust Gateway :8090]
    RustGW -->|Audit/RateLimit| API[FastAPI :8000]
    Device -->|Offline| SQL[SQLite]
```

## 3. Endpoints & Ports
*   **Port**: N/A (Client), Connects to `8090` (Security Gateway).
*   **Endpoints**:
    *   `GET /sync/changes`
    *   `POST /sync/batch`

## 4. Credentials (Dev)
*   **User**: `operator` / `operator123`
*   **Pin**: `1234` (If configured)

## 5. Code & Scripts
*   **Code**: `mobile/src/`
*   **Script**: `npm start` (Expo)
