# Consolidated Architecture & Analysis Report

**Date**: 2025-12-14
**Version**: 2.0 (Production Ready)

## 1. Core "Meridian" System Architecture

This diagram consolidates the entire traffic flow from the external user to the internal systems, highlighting the Role of the Rust Gateway, the Split-Stack backend (FastAPI + Frappe), and the new Data Intelligence layer (Deduplication/OCR).

```mermaid
graph TD
    %% -- User Layer --
    User([User / Device])
    Mobile([Mobile App (Offline First)])
    
    %% -- Edge Layer --
    subgraph Edge_Infrastructure [Edge Infrastructure]
        Nginx[Nginx Reverse Proxy\n(Port 80/443)]
        Gateway[Rust Security Gateway\n(Port 8090)]
    end

    %% -- Application Layer --
    subgraph App_Layer [Application Systems]
        Frontend[React Frontend\n(Static Serve)]
        Backend[FastAPI Backend\n(OCR / Spatial / Dedupe)]
        Frappe[Frappe / ERPNext\n(System of Record)]
    end

    %% -- Data Intelligence Layer --
    subgraph Intelligence [Data Intelligence & Processing]
        OCR_Worker[OCR Engine\n(Tesseract/EasyOCR)]
        Dedupe[Data Cleaning Service\n(Python Algorithm)]
        Geo_Engine[Spatial Analysis\n(PostGIS/Shapely)]
    end

    %% -- Persistence Layer --
    subgraph Data_Layer [Persistence]
        PSQL[(PostgreSQL + PostGIS)]
        Redis[(Redis Cache)]
        MinIO[(MinIO Object Storage)]
        MariaDB[(MariaDB - Frappe)]
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

---

## 2. Context & Development Analysis

This section analyzes the current state of critical files and components following the reset to Production/Cloud-Ready Architecture.

### A. Production Orchestration
**File**: `docker-compose.prod.yml`
*   **Role**: Defines the immutable production environment.
*   **Key Logic**:
    *   **Nginx Edge**: Acts as the single entry point, terminating SSL (optional) and routing traffic based on path (`/`, `/api`, `/app`).
    *   **Multi-Stage Frontend**: The frontend is now built into a static Nginx container, eliminating the need for a Node.js runtime in production.
    *   **No-Reload Backend**: Runs `uvicorn` directly, optimized for stability over developer experience.
    *   **State**: **COMPLETE**. Ready for deployment.

### B. Security & Routing
**File**: `rust-shield/src/main.rs`
*   **Role**: High-performance API Gateway.
*   **Key Logic**:
    *   **Path-Based Routing**:
        *   `/api/v1` -> Forwarded to **FastAPI Backend**.
        *   `/app`, `/assets`, `/files` -> Forwarded to **Frappe**.
        *   Default -> Forwarded to **Frontend**.
    *   **Health Checks**: Explicit handling of `/health` and `/api/health` to ensure load balancers receive correct status codes without hitting downstream services.
    *   **Middleware**: Enforces Rate Limiting (per IP) and Audit Logging before requests reach the application layer.
    *   **State**: **COMPLETE**. updated to support host-agnostic backends.

### C. Data Intelligence (Deduplication)
**File**: `frappe-bench/.../lr_core/utils/data_cleaning.py`
*   **Role**: The brain of the "One Person, One Record" initiative.
*   **Key Logic**:
    *   **Normalization**: Cleanses names (removes prefixes like "Mr", "Late", "Shri") to ensure apples-to-apples comparison.
    *   **Fuzzy Matching**: Uses `SequenceMatcher` to calculate a similarity score (0-100) between RoR records and PM-Kisan/SASDB data.
    *   **Clustering (BFS)**: Uses a graph-based Breadth-First Search to find connected components of records, grouping them into unique "Farmer" entities.
    *   **State**: **ACTIVE DEV**. Logic is implemented but needs testing against large datasets.

### D. System of Record (Farmer)
**File**: `frappe-bench/.../lr_core/doctype/farmer/farmer.py`
*   **Role**: The central entity for land ownership.
*   **Key Logic**:
    *   **Name Match Score (NMS)**: Now integrates a verification status logic:
        *   **80-100**: Auto-Approved (Excellent Match).
        *   **31-79**: Manual Verification (Average Match).
        *   **0-30**: Rejected (Poor Match).
    *   **State**: **UPDATED**. Now includes the NMS logic hook.

---

## 3. Hosting Architecture Options

The system supports three deployment models via `.env` configuration:

| Feature | **Option A (Hybrid)** | **Option B (Docker)** | **Option C (Cloud)** |
| :--- | :--- | :--- | :--- |
| **Backend Code** | Runs on Host (Mac/Linux) | Runs in Container | Runs on Remote Server |
| **Databases** | Docker | Docker | AWS RDS / Managed |
| **Gateway** | Docker | Docker | Docker / K8s |
| **Ideal For** | Active Development | Local Testing | Production |
| **Config** | `BACKEND_URL=http://host.docker.internal:8000` | `COMPOSE_PROFILES=backend` | `BACKEND_URL=https://api.cloud.com` |

---

## 4. Next Steps

1.  **Verify Deduplication**: Run `run_deduplication_pipeline` with real village data to tune the fuzzy matching threshold.
2.  **Frontend Integration**: Connect the React Frontend to the new `/api/health` and verify the full auth flow through the Gateway.
3.  **Cloud Deployment**: Push the `jk_sub` branch to the staging environment and apply `docker-compose.prod.yml`.
