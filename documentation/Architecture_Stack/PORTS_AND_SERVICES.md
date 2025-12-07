# 🔌 PORT CONFIGURATION & SERVICE INTEGRATION

## Complete Port Mapping

This document shows all ports used in the system and how services connect to each other.

---

## 📊 PORT SUMMARY TABLE

| Service | Port | Protocol | Purpose | Access From Mobile |
|---------|------|----------|---------|-------------------|
| **Nginx (Proxy)** | **80** | HTTP | **Main entry point** | ✅ **Use this** |
| Backend API | 8000 | HTTP | Direct backend (internal) | ⚠️ Use via Nginx |
| **Keycloak** | **8080** | HTTP | **Authentication** | ✅ **Direct access** |
| PostgreSQL | 5432 | TCP | Database | ❌ Internal only |
| Redis | 6379 | TCP | Cache | ❌ Internal only |
| MinIO | 9000 | HTTP | Object storage | ⚠️ Optional |
| MinIO Console | 9001 | HTTP | Admin UI | ⚠️ Admin only |
| Frappe | 8001 | HTTP | ERP system | ⚠️ Optional |
| Prometheus | 9090 | HTTP | Metrics | ⚠️ Monitoring |
| Grafana | 3000 | HTTP | Dashboards | ⚠️ Monitoring |
| Alertmanager | 9093 | HTTP | Alerts | ⚠️ Monitoring |
| **Metro (Expo)** | **8081** | HTTP | **Dev server** | ✅ **Development** |

---

## 🎯 RECOMMENDED CONFIGURATION

### For Mobile App (iOS/Android)

**Use these 2 ports ONLY**:

#### 1. **Nginx Proxy (Port 80)** - For ALL API Calls
```typescript
// mobile/src/api/client.ts
const BASE_URL = Platform.select({
    ios: 'http://localhost:80/api/v1',        // iOS Simulator
    android: 'http://10.0.2.2:80/api/v1',     // Android Emulator
});
```

**Why?**
- ✅ Single entry point for all backend APIs
- ✅ Handles routing internally
- ✅ Can add SSL later without changing mobile code
- ✅ Load balancing and caching

#### 2. **Keycloak (Port 8080)** - For Authentication
```typescript
// mobile/src/services/AuthService.ts
const KEYCLOAK_URL = Platform.select({
    ios: 'http://localhost:8080',             // iOS Simulator
    android: 'http://10.0.2.2:8080',          // Android Emulator
});
```

**Why?**
- ✅ OAuth flow requires direct access
- ✅ Browser redirects handle auth
- ✅ Token validation happens here

---

## 🔄 SERVICE COMMUNICATION FLOW

### Mobile App → Backend Flow

```
Mobile App (iOS Simulator)
    │
    ├─► Port 8080 (Keycloak)
    │   • Login request
    │   • Token exchange
    │   • Token refresh
    │   • Logout
    │
    └─► Port 80 (Nginx)
        │
        ├─► /api/v1/* → Backend (8000)
        │   • GET /api/v1/parcels/
        │   • POST /api/v1/sync/push
        │   • GET /api/v1/sync/pull
        │
        ├─► /geo/* → Backend (8000)
        │   • GET /geo/tiles/...
        │   • GET /geo/manifest/...
        │
        └─► /frappe/* → Frappe (8001)
            • Webhook endpoints
            • ERP integration
```

### Backend Internal Communication

```
Nginx (80)
    ├─► Backend API (8000)
    │       ├─► PostgreSQL (5432) - Data storage
    │       ├─► Redis (6379) - Caching
    │       ├─► MinIO (9000) - File storage
    │       └─► Keycloak (8080) - JWT validation
    │
    ├─► Frappe (8001)
    │       └─► PostgreSQL (5432) - Frappe data
    │
    └─► Prometheus (9090) - Metrics collection
```

---

## 📱 MOBILE APP CONFIGURATION

### Current Working Setup

**File**: `/mobile/src/api/client.ts`
```typescript
import axios from 'axios';
import { Platform } from 'react-native';
import { AuthService } from '../services/AuthService';

// ✅ RECOMMENDED: Use Nginx as single entry point
const BASE_URL = Platform.select({
    android: 'http://10.0.2.2:80/api/v1',
    ios: 'http://localhost:80/api/v1',
    default: 'http://localhost:80/api/v1',
});

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Accept': 'application/vnd.agristack.v1+json',
        'Content-Type': 'application/json',
    },
});

// Auto-inject Bearer token
client.interceptors.request.use(async (config) => {
    const token = await AuthService.getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;
```

**File**: `/mobile/src/services/AuthService.ts`
```typescript
const KEYCLOAK_URL = Platform.select({
    ios: 'http://localhost:8080',
    android: 'http://10.0.2.2:8080',
});

const DISCOVERY = {
    authorizationEndpoint: `${KEYCLOAK_URL}/realms/agristack/protocol/openid-connect/auth`,
    tokenEndpoint: `${KEYCLOAK_URL}/realms/agristack/protocol/openid-connect/token`,
    revocationEndpoint: `${KEYCLOAK_URL}/realms/agristack/protocol/openid-connect/logout`,
};
```

---

## 🔧 NGINX ROUTING CONFIGURATION

### How Nginx Routes Requests

**File**: `/nginx/nginx.conf` (current setup)

```nginx
server {
    listen 80;
    
    # API requests → Backend
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Geo/tiles → Backend
    location /geo/ {
        proxy_pass http://backend:8000;
    }
    
    # Frappe → Frappe service
    location /frappe/ {
        proxy_pass http://frappe:8000;
    }
}
```

**Key Points**:
- Mobile calls `http://localhost:80/api/v1/parcels/`
- Nginx forwards to `http://backend:8000/api/v1/parcels/`
- Backend validates JWT with Keycloak
- Response sent back through Nginx to mobile

---

## 🌐 NETWORK ADDRESSING

### iOS Simulator
```
localhost = Host machine (your Mac)
127.0.0.1 = Host machine
192.168.x.x = Local network (for physical devices)
```

**Use**: `localhost` or `127.0.0.1`

### Android Emulator
```
localhost = Emulator itself (NOT your Mac!)
10.0.2.2 = Special alias for host machine
127.0.0.1 = Emulator itself
```

**Use**: `10.0.2.2` (this points to your Mac)

### Physical Devices
```
192.168.1.x = Your Mac's local IP
localhost = The phone itself (WRONG!)
```

**Use**: Your Mac's IP address on local network

---

## 🎯 TESTING ENDPOINTS

### Quick Test Commands

**1. Test Nginx (Port 80)**
```bash
# Should return 5 parcels
curl http://localhost:80/api/v1/parcels/
```

**2. Test Backend Direct (Port 8000)**
```bash
# Should return welcome message
curl http://localhost:8000/
```

**3. Test Keycloak (Port 8080)**
```bash
# Should redirect to login page
curl -L http://localhost:8080/realms/agristack
```

**4. Test from Android Emulator perspective**
```bash
# If you're testing from emulator, use:
curl http://10.0.2.2:80/api/v1/parcels/
curl http://10.0.2.2:8080/realms/agristack
```

---

## 🔐 AUTHENTICATION TOKEN FLOW

### Complete OAuth Flow with Ports

```
1. Mobile App
   ↓ Opens browser to http://localhost:8080/realms/agristack/.../auth
   
2. Keycloak (8080)
   ↓ User logs in
   ↓ Redirects browser to exp://...?code=ABC123
   
3. Mobile App
   ↓ Receives auth code
   ↓ POST http://localhost:8080/realms/agristack/.../token
   ↓ Exchanges code for tokens
   
4. Keycloak (8080)
   ↓ Returns access_token, refresh_token, id_token
   
5. Mobile App
   ↓ Stores tokens in Keychain
   ↓ Makes API call to http://localhost:80/api/v1/parcels/
   ↓ Includes: Authorization: Bearer <token>
   
6. Nginx (80)
   ↓ Forwards to http://backend:8000/api/v1/parcels/
   
7. Backend API (8000)
   ↓ Validates JWT with Keycloak (8080)
   ↓ Fetches data from PostgreSQL (5432)
   ↓ Returns JSON
   
8. Nginx (80)
   ↓ Returns to mobile app
   
9. Mobile App
   ✓ Displays data
```

---

## 🚨 COMMON PORT ISSUES & FIXES

### Issue 1: "Network request failed"

**Cause**: Wrong port or localhost vs 10.0.2.2

**Fix**:
```typescript
// iOS: Use localhost
const API_URL = 'http://localhost:80/api/v1';

// Android: Use 10.0.2.2
const API_URL = 'http://10.0.2.2:80/api/v1';
```

### Issue 2: "Connection refused" on iOS

**Cause**: iOS blocking HTTP (requires HTTPS)

**Fix**: Add to `app.json`
```json
"ios": {
    "infoPlist": {
        "NSAppTransportSecurity": {
            "NSAllowsArbitraryLoads": true,
            "NSAllowsLocalNetworking": true
        }
    }
}
```

### Issue 3: "Can't reach backend from Android emulator"

**Cause**: Using `localhost` instead of `10.0.2.2`

**Fix**:
```typescript
Platform.select({
    android: 'http://10.0.2.2:80/api/v1',  // ✅ Correct
    // NOT: 'http://localhost:80/api/v1'   // ❌ Wrong
});
```

### Issue 4: "JWT validation failed"

**Cause**: Backend can't reach Keycloak, or issuer mismatch

**Fix**: Check docker-compose networking
```yaml
backend:
    environment:
        KEYCLOAK_URL: http://keycloak:8080  # Use service name
```

---

## 📊 PORT USAGE BY ENVIRONMENT

### Development (Current Setup)

| Environment | Nginx | Keycloak | Backend | Metro |
|-------------|-------|----------|---------|-------|
| iOS Simulator | :80 | :8080 | - | :8081 |
| Android Emulator | 10.0.2.2:80 | 10.0.2.2:8080 | - | :8081 |
| Physical Device | 192.168.x.x:80 | 192.168.x.x:8080 | - | :8081 |
| Backend Internal | - | :8080 | :8000 | - |

### Production (Recommended)

| Service | Port | SSL | Public |
|---------|------|-----|--------|
| Nginx | 443 | ✅ | Yes |
| Keycloak | 443 | ✅ | Yes |
| Backend | 8000 | ❌ | No (internal) |
| PostgreSQL | 5432 | ❌ | No (internal) |

---

## ✅ BEST PRACTICES

### 1. Use Environment Variables
```typescript
// config.ts
export const API_CONFIG = {
    baseURL: __DEV__ 
        ? Platform.select({
            ios: 'http://localhost:80/api/v1',
            android: 'http://10.0.2.2:80/api/v1',
          })
        : 'https://api.production.com/api/v1',
    
    keycloakURL: __DEV__
        ? Platform.select({
            ios: 'http://localhost:8080',
            android: 'http://10.0.2.2:8080',
          })
        : 'https://auth.production.com',
};
```

### 2. Single Entry Point
- ✅ Mobile → Nginx (80) → Backend services
- ❌ Mobile → Multiple ports directly

### 3. Use Service Names in Docker
```yaml
backend:
    environment:
        DATABASE_URL: postgresql://user:pass@db:5432/database
        KEYCLOAK_URL: http://keycloak:8080
        REDIS_URL: redis://redis:6379
```

### 4. Production SSL
```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api/ {
        proxy_pass http://backend:8000;
    }
}
```

---

## 🎯 SUMMARY: MOBILE APP PORT USAGE

**Development (what you're using now)**:

```
Mobile App connects to:
1. Port 80  (Nginx) → All API calls
2. Port 8080 (Keycloak) → Authentication
3. Port 8081 (Metro) → Hot reload (dev only)

✅ This is the correct setup!
```

**All services are working together correctly through these ports.**

---

*Last updated: 2025-12-07*  
*Configuration verified and tested*
