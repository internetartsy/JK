# 📚 AgriStack Verified System (Consolidated Documentation)
**Date**: January 6, 2026  
**Version**: 6.0 (Motia-KYC Convergence)

---

## 0. System Context (Meridian Architecture)
```mermaid
flowchart TD
    %% -- User Layer --
    User(["User / Device"])
    Mobile(["Mobile App - Scanning / e-KYC"])
    
    %% -- Edge Layer --
    subgraph Edge_Infrastructure [Edge Infrastructure]
        Nginx["Nginx Reverse Proxy"]
        Gateway["Rust Security Gateway"]
    end

    %% -- Application Layer --
    subgraph App_Layer [Application Systems]
        Frontend["React Frontend"]
        Backend["FastAPI Backend"]
        Frappe["Frappe ERPNext"]
    end

    %% -- Data Intelligence Layer --
    subgraph Intelligence [Data Intelligence and Processing]
        OCR_Worker["OCR Engine"]
        KYC_Engine["Identity Resolution"]
        Geo_Engine["Spatial Analysis"]
    end

    %% -- Persistence Layer --
    subgraph Data_Layer [Persistence]
        PSQL[("PostgreSQL and PostGIS")]
        Redis[("Redis Cache")]
        MinIO[("MinIO Object Storage")]
        MariaDB[("MariaDB - Frappe")]
    end

    %% -- Flows --
    User -->|"HTTPS"| Nginx
    Mobile -->|"HTTPS"| Nginx

    Nginx -->|"/"| Frontend
    Nginx -->|"/api"| Gateway
    Nginx -->|"/app"| Frappe

    Gateway -->|"Auth and Rate Limit"| Backend
    Backend -->|"Job Queue"| Redis
    Backend -->|"Object Store"| MinIO
    Backend -->|"Spatial Queries"| PSQL
    Backend -->|"Registry Sync"| Frappe
```

---

## 🏗️ 1. Motia-Unified Architecture
The system follows the **Motia Design Philosophy**: every action is a "Step," every process is an "Orchestration," and every document has a unique "1D" (Document 1D).

### 1.1 The Lifecycle of a "Document 1D"
The **Document 1D** is the central "Thinkable" object. Its journey defines the platform's execution:
1.  **Ingress**: Created in the `Registry_Step` (Frappe).
2.  **Activation**: Emitted as a `Domain Event`.
3.  **Refinement**: Processed by one or more `Service_Steps` (OCR/KYC/GIS) via `Logic_Step` orchestration.
4.  **Finalization**: Async results are merged back into the legal registry, closing the loop.

---

## 🧩 2. Consolidated "Step" Modules

### A. Core Polyglot Layers
| Step Category | Primitive | Technology | Functional Role |
| :--- | :--- | :--- | :--- |
| **Edge** | `Edge_Step` | Rust Shield | Intercepts all ingress for security validation. |
| **Logic** | `Core_Step` | Motia / Python | Orchestrates OCR, KYC, and GIS workers. |
| **Registry** | `SOR_Step` | Frappe | Maintains the authoritative state of land parcels and farmer IDs. |
| **Worker** | `Service_Step` | FastAPI / AI | Performs stateless, CPU-intensive data transformations. |

### B. Functional Specifications
1.  **Automated KYC**: Replaces manual entry by linking OCR-extracted owner names with Aadhaar-authenticated identities.
2.  **Spatial Intelligence**: Generates 14-digit ULPINs automatically from geocoordinates, replacing manual parcel numbering.

---

## ☁️ 3. Deployment Topology (Thinkable View)

| Service | Motia Role | Port | Connection Logic |
| :--- | :--- | :--- | :--- |
| **Rust Gateway** | `Edge_Proxy` | 8090 | Upstream to erp-web |
| **Frappe (erp-web)** | `SOR_Registry` | 8000 | Downstream to Motia |
| **Motia Backend** | `Flow_Manager` | 8000 | Orchestrates Workers |
| **PostgreSQL** | `Spatial_Store` | 5432 | Shared Context |

---

## 🛡️ 4. Security & Git Ignore Policy
The following sensitive data is strictly excluded from version control for security compliance:

| Category | Ignored Patterns | Purpose |
| :--- | :--- | :--- |
| **Secrets** | `.env` | Infrastructure passwords and API tokens. |
| **Certificates** | `certs/` | SSL/TLS certificates and private keys. |
| **Local Config** | `site_config.json` | Instance-specific Frappe configurations. |
| **Data Dumps** | `*.sql`, `*.csv` | Databases and record exports. |
| **Snapshots** | `*.png`, `*.webp` | UI debug snapshots and traces. |

---

## 📚 5. Detailed Module Documentation
For deep dives into specific system components, refer to the following specialized documents:

*   [**Frontend Architecture**](./frontend.md) - React Web Dashboard & State Logic.
*   [**Native Mobile Architecture**](./native.md) - Offline-First Sync, Biometrics & OCR.
*   [**Rust Gateway**](./rust_gateway.md) - Security Edge Step, JWT & Audit Specs.
*   [**Frappe Integration**](./frappe_integration.md) - System of Record, Doctype Schemas & Webhooks.
*   [**Spatial & Geo Intelligence**](./spatial_geo.md) - PostGIS, ULPIN Generation & Map Visualization.
*   [**OCR AI Pipeline**](./ocr_geo.md) - Motia-based ML Extraction Workflow.
*   [**KYC Workflow**](./kyc_workflow.md) - Identity Resolution & Verification Flow.

---

**© 2026 JK Land Records Authority**
