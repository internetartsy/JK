# Debug & Resolution Log

**Date:** 2025-12-13
**Scope:** Frontend (React), Native (Expo), Backend Connectivity

## Resolved Issues

### 1. Mobile App Connectivity (Duplicate & Hardcoded IP)
*   **Problem:** Two conflicting API client configurations existed (`mobile/src/api/client.ts` vs `mobile/src/services/api.ts`). One used hardcoded `192.168.1.11`, which breaks on other networks/emulators.
*   **Resolution:**
    *   Merged `SecureStore` authentication logic into the platform-aware `mobile/src/api/client.ts`.
    *   Deleted `mobile/src/services/api.ts`.
    *   Updated all 5 services (`ocr.ts`, `sync.ts`, etc.) to import the unified client.
*   **Status:** ✅ Fixed (Android uses `10.0.2.2`, iOS/Web uses `localhost`).

### 2. Frontend Web Proxy
*   **Problem:** `vite.config.ts` was proxying API requests to port `8443` (Gateway), but the active backend is Frappe on port `8000`.
*   **Resolution:** Updated proxy target to `http://localhost:8000`.
*   **Status:** ✅ Fixed.

### 3. OCR Endpoint Verification
*   **Check:** Verified `backend/app/api/ocr.py` implements `/run-async`.
*   **Path Logic:**
    *   Router Prefix: `/ocr`
    *   App Prefix: `/api/v1`
    *   Client Base: `/api/v1`
    *   Call: `/ocr/run-async`
    *   **Result:** URL `.../api/v1/ocr/run-async` is CORRECT.

## Screen Check Artifact
*   **Frontend-Landing:** Builds successfully (`npm run build`). PWA generation active.
*   **Mobile App:** `expo-doctor` passed. Code updated to point to correct backend.

## Next Steps
*   Restart Mobile Bundler (`npx expo start -c`) to load new client config.
*   Restart Vite Dev Server (`npm run dev`) to load new proxy config.
