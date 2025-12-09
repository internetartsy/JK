# 🚨 Code vs Documentation Mismatch Analysis

**Date:** December 9, 2025
**Scope:** Full Codebase Scan (Backend, Frontend, Mobile, Frappe)

## 🛑 Critical Discrepancies Found

### 1. Frontend Review UI Missing (Phase 3 Mismatch)
*   **Documentation Claim:** `OCR_ARCHITECTURE.md` states "Phase 3: Review Loop (UI Dashboard Implemented) - ✅".
*   **Code Reality:** The directory `frontend/src/features/review` **DOES NOT EXIST**.
*   **Impact:** The web application lacks the interface for users to verify and correct OCR data, despite the backend supporting it.
*   **Action Required:** Immediate restoration or redevelopment of `ReviewDashboard.tsx`, `ReviewEditor.tsx`, and `reviewService.ts`.

### 2. Mobile Service Backup File
*   **Observation:** Found `mobile/src/services/AuthService.ts.backup`.
*   **Status:** Clutter / Technical Debt.
*   **Action Required:** Delete the backup file to maintain repo cleanliness.

---

## ✅ Verified Alignments (Good News)

### 1. Backend Async Queue (Phase 4)
*   **Docs:** "Offline Queueing & Sync" marked as Done.
*   **Code:** `backend/app/services/task_queue/tasks.py` contains the full implementation of `process_ocr_document_task` with Redis progress updates and extraction logic.
*   **Verdict:** ALIGNED.

### 2. Backend Review Logic (Phase 3)
*   **Docs:** "Connect Manual Corrections to DB" marked as Done.
*   **Code:** `backend/app/api/v1/reviews.py` contains the `approve_review` endpoint with logic to upsert `LandParcel` records.
*   **Verdict:** ALIGNED.

### 3. Mobile Camera & OCR
*   **Docs:** "Camera Capture" Verified, "Offline OCR" Partial.
*   **Code:** `CameraScreen.tsx` uses `vision-camera`. `OCRService.ts` has `react-native-mlkit-ocr` commented out (wrapped for Expo Go).
*   **Verdict:** ALIGNED (Matches the known limitations).

---

## 📂 File Structure Audit

### Backend Service Structure
`backend/app/services` structure is robust but has potential overlap:
- `sync/` (Conflict Resolution) vs `frappe_sync/` (Frappe Client).
- **Recommendation:** Merge `sync` into `frappe_sync` or rename `sync` to `conflict_engine` for clarity.

### Frontend Feature Structure
`frontend/src/features` lists:
- `capture`, `extraction`, `ocr`, `queue`, `transliteration`.
- **MISSING:** `review`.

---

## 🛠️ Remediation Plan

1.  **High Priority:** Re-create the missing Frontend Review features.
    - `src/features/review/reviewService.ts`
    - `src/features/review/ReviewDashboard.tsx`
    - `src/features/review/ReviewEditor.tsx`
2.  **Cleanup:** `mobile/src/services/AuthService.ts.backup` removed.
3.  **Update Report:** Once fixed, update `GITHUB_STATUS_REPORT.md` to confirm the discrepancy is resolved.
