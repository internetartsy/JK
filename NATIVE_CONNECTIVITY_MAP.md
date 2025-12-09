# 🔌 NATIVE CONNECTIVITY & PORT MAPPING MASTER

This document details every connection point between the Mobile Native App, Backend, Frontend, and Frappe ERP.

---

## 1. 🌐 CORE PORT ARCHITECTURE

The system uses **Nginx (Port 80)** as the central gateway.

| Service | Port | Internal Docker Port | Access URL | Purpose |
|---------|------|----------------------|------------|---------|
| **Nginx (Gateway)** | **80** | 80 | `http://localhost:80` | **Main Entry Point** for all clients |
| **Backend API** | 8000 | 8000 | `http://localhost:8000` | Core Logic, Geo, OCR |
| **Frappe (ERP)** | 8001 | 8000 | `http://localhost:8001` | Admin, Users, Workflows |
| **Keycloak (Auth)** | 8080 | 8080 | `http://localhost:8080` | SSO Authentication |
| **MinIO (Storage)** | 9000 | 9000 | `http://localhost:9000` | Object Storage (Files) |

---

## 2. 📱 MOBILE NATIVE → BACKEND (Python)

**Protocol**: HTTP/REST over Nginx Proxy
**Library**: `axios` (in `src/api/client.ts`)

| Direction | Endpoint | Method | Data Transferred | Port Used |
|-----------|----------|--------|------------------|-----------|
| **Mobile → Backend** | `/api/v1/parcels/` | GET | Fetch Sync Queue (Pull) | **80** |
| **Mobile → Backend** | `/api/v1/sync/push` | POST | Push Offline Changes | **80** |
| **Mobile → Backend** | `/geo/tiles/{z}/{x}/{y}` | GET | Download Map Tiles (MapLibre) | **80** |
| **Backend → Mobile** | (Response) | JSON | `parcels: [...]`, Status 200 | **80** |

**Crucial Connection Detail**:
*   **iOS Simulator**: Connects to `http://localhost:80`
*   **Android Emulator**: Connects to `http://10.0.2.2:80` (Special bridge IP)
*   **Physical Device**: Connects to `http://YOUR_MAC_IP:80` (e.g. 192.168.1.5)

---

## 3. 📱 MOBILE NATIVE → FRAPPE (ERPNext)

Direct communication is avoided. Data flows via the Backend Proxy to manage security and formatting.

**Flow A: Data Sync (Recommended)**
1.  **Mobile** sends data to **Backend** (`/api/v1/webhooks`).
2.  **Backend** processes/validates geo-data.
3.  **Backend** pushes to **Frappe** via REST API (Server-to-Server).

**Flow B: Direct Web View (Authentication)**
*   **Mobile** opens `http://localhost:8080` (Keycloak) for Login.
*   Keycloak syncs users with **Frappe** (via Federation).

| Component | Connection | Port | Notes |
|-----------|------------|------|-------|
| **Auth** | Mobile → Keycloak | 8080 | OAuth2 PKCE Flow |
| **Admin UI** | Browser → Frappe | 80 | Via Nginx `/app` location |

---

## 4. 🖥️ FRONTEND (In-Progress) ↔ BACKEND

The Web Dashboard (`localhost:80/`) connects to the same APIs as mobile but uses browser credentials.

| feature | Endpoint | Connection |
|---------|----------|------------|
| **Map Visualization** | `/geo/tiles` | WebGL Vector Tiles |
| **Review Queue** | `/api/v1/reviews` | JSON Data Grid |

---

## 🚀 SUMMARY OF DATA FLOWS

### A. Mobile → Backend (Write)
> **Mobile** (Port 8081 JS Bundle)
>  ⬇️ *POST /api/v1/sync* (via Port 80)
> **Nginx**
>  ⬇️ *Proxy Pass* (Port 8000)
> **Backend Service**
>  ⬇️ *INSERT* (Port 5432)
> **PostgreSQL DB**

### B. Frappe → Mobile (Read)
> **Frappe** (Admin approves record)
>  ⬇️ *Webhook Trigger*
> **Backend Service**
>  ⬇️ *Update Sync Queue Table*
> **Mobile** (Next Sync Poll)
>  ⬇️ *GET /api/v1/sync*
> **Mobile Local DB** (SQLite)

---

## 🛠️ CONFIGURATION FILES
1.  **Mobile Config**: `mobile/src/api/client.ts`
2.  **Routing Config**: `nginx/nginx.conf`
3.  **Backend Routes**: `backend/app/api/v1/`
