# OCR & Field Extraction Pipeline Architecture

**Version**: 2.1 (Consolidated & Verified)  
**Last Updated**: December 7, 2025

This document outlines the architecture for the Optical Character Recognition (OCR) and Field Extraction pipeline used in the Land Records application. The system is designed to digitize Urdu land records (Girdawari, Khasra) via a hybrid mobile-cloud approach.

## 📊 Development Status: Phase 3 Active

- ✅ **Phase 1 (Foundation)**: Completed (Nov 2024)
- ✅ **Phase 2 (Core Engine)**: Completed (Dec 2024)
- 🚧 **Phase 3 (Review Loop)**: **IN PROGRESS**
    - ✅ UI Dashboard & Editor (Implemented Dec 7)
    - ✅ DB Correction Logic (Approved/Rejected endpoints wired to DB)
- ⚪ **Phase 4 (Optimization)**: Scheduled (Jan 2025)

---

## 🏗️ System Concept Map

```mermaid
mindmap
  root((Land Records OCR))
    Mobile App
      React Native
      Camera Capture
      Offline OCR
        MLKit
      Sync Service
    Backend Infrastructure
      Frappe Framework
      FastAPI Integration
      MariaDB Database
      Redis Queue
    OCR Engine
      Text Recognition
        Tesseract
        Google Vision API
      Field Extraction
        Regex Patterns
        Urdu Segmentation
      Validation
        Confidence Scoring
        Data Type Check
    Workflows
      Auto-Approval
        High Confidence
      Manual Review
        Low Confidence
        Correction UI
    Data Entities
      Doctypes
        Document Scan
        OCR Result
        Land Parcel
        Farmer
```

## 🔍 Architecture Alignment Analysis

This section confirms the implementation status of key architecture components in the codebase, cross-checked against the development branch.

### 1. Mobile App Architecture
| Component | Documentation Claim | Status | Implementation Details |
|-----------|---------------------|--------|------------------------|
| **Camera Capture** | "React Native Camera Capture" | ✅ **Verified** | `CameraScreen.tsx` uses `react-native-vision-camera`. Mocked for Expo Go, real for Native. |
| **Offline OCR** | "MLKit on-device" | ⚠️ **Partial** | Code exists in `OCRService.ts` (`react-native-mlkit-ocr`), but safety wrapper defaults to mock in dev environment. |
| **Connectivity** | "Sync Service" | ✅ **Verified** | `OfflineQueue` logic implementation confirmed. |

### 2. Backend Infrastructure
| Component | Documentation Claim | Status | Implementation Details |
|-----------|---------------------|--------|------------------------|
| **API Entry** | `run_ocr` API endpoint | ✅ **Verified** | `backend/app/api/ocr.py` has `process_document` (`/process`) and `run-async` endpoints. |
| **OCR Service** | "Tesseract / Google Vision" | ✅ **Verified** | `backend/app/services/ocr/ocr_service.py` implements Hybrid pipeline (DataLab -> Tesseract -> Mock). |
| **Extraction** | "Regex Pattern Matching" | ✅ **Verified** | `FieldExtractionService` routes to `GirdawariExtractor` which uses Regex for `khasra`, `village`, etc. |
| **Validation** | "Confidence Scoring" | ✅ **Verified** | Review routing logic and `processed_confidence` calculation logic exist. |

### 3. Frontend (Review Loop)
| Component | Documentation Claim | Status | Implementation Details |
|-----------|---------------------|--------|------------------------|
| **Dashboard** | "Review Task Dashboard" | ✅ **Verified** | `frontend/src/features/review/ReviewDashboard.tsx` implemented. |
| **Editor** | "Side-by-side Correction" | ✅ **Verified** | `frontend/src/features/review/ReviewEditor.tsx` implemented with Zoom & Form. |
| **API Client** | "Review Service" | ✅ **Verified** | `frontend/src/features/review/reviewService.ts` connects to `/api/v1/reviews`. |

### 4. Database Layer (Frappe)
| Component | Documentation Claim | Status | Implementation Details |
|-----------|---------------------|--------|------------------------|
| **Document Scan** | Doctype defined | ✅ **Verified** | `frappe-bench/.../document_scan.json` exists. |
| **OCR Result** | Doctype defined | ✅ **Verified** | `frappe-bench/.../ocr_result.json` exists. |
| **Review Task** | Doctype defined | ✅ **Verified** | `frappe-bench/.../review_task.json` exists. |

---

## 🔄 Process Walkthrough

This sequence illustrates the end-to-end flow of a document being processed from the field to the database.

```mermaid
sequenceDiagram
    autonumber
    actor P as Patwari (User)
    participant M as Mobile App
    participant B as Backend (Frappe)
    participant O as OCR Engine
    participant DB as MariaDB
    actor R as Reviewer

    Note over P, M: Field Operations
    P->>M: Captures Photo of Record (Girdawari)
    M->>M: (Optional) Pre-process / Crop
    M->>B: Upload Image via API (run_ocr)
    activate B
    
    Note over B, O: Processing Phase
    B->>DB: Create 'Document Scan' [Status: Processing]
    B->>O: Send Image for Text Recognition
    O-->>B: Return Raw Text & Blocks
    
    B->>B: Run Field Extraction (Regex)
    B->>B: Calculate Confidence Score
    
    alt High Confidence (> 80%)
        B->>DB: Auto-Create/Update 'Land Parcel'
        B-->>M: Return Success & Data
    else Low Confidence
        B->>DB: Create 'Review Task' [Status: Pending]
        B-->>M: Return "Sent for Review" status
        
        Note over R, DB: Verification Phase
        R->>B: Open Review Dashboard
        B->>R: Show Image vs Extracted Data
        R->>R: Correct Misread Fields
        R->>B: Submit Corrections
        B->>DB: Update Records with Human Verified Data
    end
    deactivate B
```

## 🛣️ Implementation Roadmap

```mermaid
gantt
    title OCR Integration Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Foundation
    Define Doctypes (Scan, Result)       :done, p1, 2024-11-01, 7d
    Create Basic API Endpoints           :done, p2, 2024-11-08, 5d
    Mobile Camera Integration            :done, p3, 2024-11-15, 7d

    section Phase 2: Core Engine
    Integrate Google Vision/Tesseract    :done, crit, p4, 2024-12-01, 5d
    Implement Regex Extraction Logic     :done, crit, p5, 2024-12-04, 7d
    Tests for Confidence Scoring         :done, p6, 2024-12-10, 4d

    section Phase 3: Review Loop
    Build Review Task Dashboard (UI)     :done, p7, 2024-12-15, 7d
    Connect Manual Corrections to DB     :done, p8, 2024-12-07, 3d

    section Phase 4: Optimization
    Offline Queueing & Sync              :done, p9, 2024-12-07, 7d
    Model Fine-tuning (Custom Data)      :p10, 2025-01-15, 14d
```

### Next Steps (Immediate)
1.  **Optimization**: Improve OCR confidence thresholds based on real-world data.
2.  **Testing**: Comprehensive E2E testing of the Review flow with various document types.
