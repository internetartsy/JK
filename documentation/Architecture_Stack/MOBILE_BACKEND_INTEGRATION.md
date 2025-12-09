# 🔌 NATIVE EXPO TO BACKEND INTEGRATION GUIDE

This document lists the exact connection points, ports, and APIs linking the **React Native (Expo)** frontend to the **FastAPI Backend**.

---

## 🚀 Connection Overview

| Component | Technology | Port (Host) | Port (Internal) | Base URL |
|-----------|------------|-------------|-----------------|----------|
| **Frontend** | React Native (Expo) | 8081 | 8081 | `exp://localhost` |
| **Gateway** | Nginx Proxy | **80** | 80 | `http://localhost:80` |
| **Auth** | Keycloak | **8080** | 8080 | `http://localhost:8080` |
| **Backend** | Python FastAPI | 8000 | 8000 | `http://backend:8000` |

---

## 🔗 1. API GATEWAY (THE PRIMARY BRIDGE)
All Application data requests flow through **Port 80** (Nginx), which proxies to the internal Backend service.

### **Connection Config**
**File**: `mobile/src/api/client.ts`
```typescript
const BASE_URL = Platform.select({
    ios: 'http://localhost:80/api/v1',
    android: 'http://10.0.2.2:80/api/v1',
});
```

### **API Mappings**
| Endpoint Route | Expo Usage | Backend Service | Function |
|----------------|------------|-----------------|----------|
| `/api/v1/parcels/` | `GET` | FastAPI (8000) | Pull data sync |
| `/api/v1/sync/push` | `POST` | FastAPI (8000) | Upload offline changes |
| `/api/v1/geo/tiles/{z}/{x}/{y}` | `GET` | FastAPI (8000) | Map Vector Tiles |

---

## 🔐 2. AUTHENTICATION BRIDGE (OAUTH2)
Authentication flow bypasses Nginx for direct interaction with the Identity Provider during login, then validates via API.

### **Connection Config**
**File**: `mobile/src/services/AuthService.ts`
```typescript
const KEYCLOAK_URL = Platform.select({
    ios: 'http://localhost:8080',
    android: 'http://10.0.2.2:8080',
});
```

### **Auth Flow Ports**
1.  **Login Request**: Mobile → `localhost:8080` (Browser opens)
2.  **Redirect**: Keycloak → `exp://localhost:8081` (Deep Link back to App)
3.  **Token Exchange**: Mobile → `localhost:8080` (POST request)
4.  **API Verification**: Mobile → `localhost:80` (Authorization Header) → Backend validates with Keycloak

---

## 🔄 3. DATA FLOW DIAGRAM

```mermaid
sequenceDiagram
    participant Mobile as Expo App (8081)
    participant Nginx as Nginx Proxy (80)
    participant Keycloak as Keycloak (8080)
    participant Backend as FastAPI (8000)

    Note over Mobile: USER ACTION (Login)
    Mobile->>Keycloak: 1. Auth Request (Port 8080)
    Keycloak->>Mobile: 2. Redirect with Code
    Mobile->>Keycloak: 3. Exchange Code for Token
    
    Note over Mobile: USER ACTION (Sync Data)
    Mobile->>Nginx: 4. GET /api/v1/parcels/ (Port 80)
    Nginx->>Backend: 5. Proxy Request (Internal:8000)
    Backend->>Backend: 6. Validate Token
    Backend->>Nginx: 7. JSON Response
    Nginx->>Mobile: 8. Data Packet
```

---

## 🛠️ CRITICAL PORTS FOR DEBUGGING

-   **Backend API Check**: `curl -I http://localhost:80/api/v1/`
    -   *Success*: HTTP 200/401/404 (Gateway Reached)
    -   *Fail*: Connection Refused (Nginx Down)
-   **Auth Check**: `curl -I http://localhost:8080/`
    -   *Success*: HTTP 200 (Keycloak Up)
    -   *Fail*: Connection Refused (Keycloak Down)
