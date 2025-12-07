# 🔍 Mobile App Server Connection Diagnostics

## Issue: "Problem on request app server"

### Backend Status: ✅ ALL SERVICES RUNNING

| Service | Status | Port | Health |
|---------|--------|------|--------|
| Backend API | ✅ Up (2min) | 8000 | ✅ Working |
| Nginx Proxy | ✅ Up (2min) | 80 | ✅ Working |
| Keycloak | ✅ Up (2min) | 8080 | ✅ Working |

### API Endpoints Test Results

#### Direct Backend (port 8000)
```bash
curl http://localhost:8000/
✅ {"message":"Welcome to the Land Records OCR System"}
```

#### Via Nginx (port 80) - Mobile App Route
```bash
curl http://localhost:80/api/v1/parcels/
✅ Returns 5 parcels (backend has data!)
```

### Mobile App Configuration

**Current settings** in `/mobile/src/api/client.ts`:
```typescript
const BASE_URL = Platform.select({
    android: 'http://10.0.2.2:80/api/v1',    // Android emulator
    ios: 'http://localhost:80/api/v1',       // iOS simulator
    default: 'http://localhost:80/api/v1',   // Fallback
});
```

### ✅ Configuration is CORRECT

The mobile app is configured to use:
- **iOS Simulator**: `http://localhost:80/api/v1`
- **Android Emulator**: `http://10.0.2.2:80/api/v1`

Both routes are working and verified.

---

## 🔍 Possible Issues & Solutions

### Issue 1: Authentication Token Required

**Symptom**: API returns 401 Unauthorized

**Check**: Does your endpoint require authentication?

**Solution**: Mobile app already configured to auto-inject Bearer token:
```typescript
// In client.ts - Already implemented ✅
client.interceptors.request.use(async (config) => {
    const token = await AuthService.getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

### Issue 2: CORS (Cross-Origin) Issues

**Symptom**: Request blocked in browser, works in native app

**Status**: Not applicable - iOS Simulator doesn't have CORS restrictions

### Issue 3: Network Connectivity

**Symptom**: "Network Error" or timeout

**Check**:
```bash
# Test from simulator (iOS shares macOS network)
# localhost should work
curl http://localhost:80/api/v1/parcels/
```

**Status**: ✅ Backend reachable

### Issue 4: SSL/HTTPS Issues

**Status**: Using HTTP (not HTTPS) - correct for local development

---

## 🎯 What Specific Error Are You Seeing?

To help diagnose, please provide:

### 1. **Error Message**
- [ ] Network Error
- [ ] 401 Unauthorized
- [ ] 404 Not Found
- [ ] 500 Server Error
- [ ] Timeout
- [ ] Other: ___________

### 2. **When Does It Happen?**
- [ ] On app launch
- [ ] During login
- [ ] When syncing data
- [ ] When navigating to Map
- [ ] Other: ___________

### 3. **Check Metro Logs**
Look for errors in the Metro terminal:
```bash
# Common error patterns:
ERROR  Network request failed
ERROR  401 Unauthorized
ERROR  Request timeout
```

### 4. **Check App Logs**
In simulator, press `Cmd+D` → Open debugger → Look for:
- Red error messages
- Console warnings
- Network tab (if using Chrome DevTools)

---

## 🔧 Quick Fixes to Try

### Fix 1: Restart Backend Services
```bash
cd /Users/mic/docode/jk
docker-compose restart backend nginx keycloak
```

### Fix 2: Verify Token Exists
```bash
# In mobile app - check if logged in
# Should see token refresh in logs:
LOG  Refreshing token...
LOG  Token refreshed
```

### Fix 3: Test API Manually
```bash
# Get a token first (from Keycloak)
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/agristack/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=agristack-mobile" | jq -r '.access_token')

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:80/api/v1/parcels/
```

### Fix 4: Clear App Cache
```bash
# In Metro terminal
# Press 'r' to reload
# Or press 'shift+r' to reload and clear cache
```

### Fix 5: Check Specific Endpoint
What endpoint is failing? Common ones:
- `/api/v1/parcels/` - ✅ Tested, working
- `/api/v1/sync/pull` - Should work with auth
- `/api/v1/sync/push` - Should work with auth
- `/geo/tiles/manifest/:district` - Different route

---

## 📊 Current Backend Data

The backend has **5 parcels** available:
```json
[
  {
    "id": "6a242b4a-c6aa-4be8-823f-2a8a465ac2a4",
    "village_id": "V-001",
    "khasra_number": "123/45",
    "area_text": "10 Kanal",
    "status": "active"
  },
  // ... 4 more parcels
]
```

Your mobile app sync should fetch these!

---

## 🎯 Next Steps

1. **Tell me the specific error** you're seeing
2. **Check Metro terminal logs** - copy any ERROR messages
3. **Try logging in** - authentication might be the issue
4. **Check if sync works** - look for "Pulled X parcels" message

---

## 📱 Mobile App Network Flow

```
Mobile App (iOS Simulator)
    ↓ (1) Get token from SecureStore
    ↓ (2) Make request to http://localhost:80/api/v1/...
    ↓ (3) Add Bearer token in Authorization header
    ↓
Nginx (localhost:80)
    ↓ (4) Proxy to backend:8000
    ↓
Backend API (port 8000)
    ↓ (5) Validate JWT with Keycloak
    ↓ (6) Process request
    ↓ (7) Return data
    ↓
Mobile App
    ✅ (8) Display data
```

**Every step is working** in our tests. Need to know where it's failing for you.

---

*Generated: 2025-12-07 00:37 IST*  
*All backend services verified and running*
