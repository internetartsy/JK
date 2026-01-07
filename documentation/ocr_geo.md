# OCR & Document Intelligence (Service Step)

## 0. System Context (Meridian Architecture)
```mermaid
flowchart TD
    %% -- User Layer --
    User(["User / Device"])
    Mobile(["Mobile App - Offline First"])
    
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
        Dedupe["Data Cleaning Service"]
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
    Gateway -->|"Proxy Legacy"| Frappe
    
    Backend -->|"Read and Write"| PSQL
    Backend -->|"Cache"| Redis
    Backend -->|"Store Files"| MinIO
    
    Frappe -->|"System Records"| MariaDB
```

## 1. Role: The data-extractive "Service_Step"
OCR is a specialized **Service_Step** invoked by the `MotiaOrchestrator`.

## 3. Logical Architecture: Motia Integration
```mermaid
flowchart LR
    MO(["Core_Step Orchestrator"])
    subgraph Service_Stage [Service_Step]
        AI(["AI Logic"])
        Map(["Field Mapping"])
    end
    Frappe[("Registry_Step")]

    MO -->|"Binary Payload"| AI
    AI --> Map
    Map -->|"Structured JSON"| Frappe
```

## 4. Multi-Dev Consistency
By isolating the OCR logic as a stateless `Service_Step`, we allow the AI team to iterate on models (Python/PyTorch) without affecting the API security (Rust) or the Legal Registry (Frappe).

### 5. Implementation Reference
*   **API**: `backend/app/api/ocr.py`
*   **Extraction Logic**: `backend/app/services/extraction/`
*   **Status**: Supporting hybrid Urdu-English extraction for Girdawari and Jamabandi reports.

---

## 6. Functional Compliance
All results emitted from the **OCR_Step** must be asynchronous and must carry the **Document 1D** to allow the `Registry_Step` to perform precise reconciliation.
