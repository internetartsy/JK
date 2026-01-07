# Architectural Design and Method Document (ADMD)

**Version**: 2.0 (Motia-Unified Alignment)
**Date**: December 22, 2025
**Status**: Active Alignment

## 1. System Philosophy: The "Thinkable" Architecture
The platform is designed using **Motia Principles**, treating every backend concern as a unified **Step**. This approach ensures the system remains **logical, functional, and thinkable** across a multi-language (Polyglot) runtime.

### 1.1 The "Step" Primitive
A **Step** is the fundamental building block of our architecture. Each step encapsulates a specific configuration and a functional handler.
*   **Logical**: Decouples domain rules from infrastructure.
*   **Functional**: Clear Input (Events/Requests) -> Deterministic Processing -> Output (State/Events).
*   **Multi-Dev**: Allows Rust, Python, and Frappe logic to interact seamlessly within a single "Thinkable" flow.

## 0. System Context (Meridian Architecture)
```mermaid
flowchart TD
    %% -- User Layer --
    User(["User and Device"])
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
        PSQL["PostgreSQL and PostGIS"]
        Redis["Redis Cache"]
        MinIO["MinIO Object Storage"]
        MariaDB["MariaDB - Frappe"]
    end

    %% -- Flows --
    User -->|"HTTPS"| Nginx
    Mobile -->|"HTTPS"| Nginx

    Nginx -->|"Root"| Frontend
    Nginx -->|"api"| Gateway
    Nginx -->|"app"| Frappe

    Gateway -->|"Auth and Rate Limit"| Backend
    Gateway -->|"Proxy Legacy"| Frappe
    
    Backend -->|"Read and Write"| PSQL
    Backend -->|"Cache"| Redis
    Backend -->|"Store Files"| MinIO
    
    Frappe -->|"System Records"| MariaDB
    
    %% -- Logic Flows --
    Backend -.->|"Async Task"| OCR_Worker
    OCR_Worker -->|"Extract Text"| Backend
    Backend -->|"Sync Result"| Frappe
    
    Frappe -.->|"Trigger"| Dedupe
    Dedupe -->|"Find Clusters"| Frappe
    
    Mobile -->|"Sync Offline Data"| Backend
```

## 1. Motia Logical Flow
The master flow revolves around the lifecycle of a **Document 1D**, orchestrated through sequential Step transitions across the layers defined above.

```mermaid
flowchart TD
    subgraph Edge_Stage [Edge_Step]
        RS["Rust Security Step"]
    end

    subgraph Registry_Stage [Registry_Step]
        FR["Frappe Registry SOR"]
    end

    subgraph Orchestration_Stage [Core_Step]
        MO["MotiaOrchestrator"]
    end

    subgraph Execution_Stage [Service_Step]
        OS["OCRStep"]
        ES["ExtractionStep"]
        SS["SpatialGeoStep"]
    end

    %% -- Logical Flow --
    RS -->|"Secured Request"| FR
    FR -->|"Domain Event - Doc1D"| MO
    MO -->|"Execute Step"| OS
    MO -->|"Execute Step"| ES
    OS -->|"Reconcile"| FR
    ES -->|"Reconcile"| FR
```

## 4. Logical Workflow Specifications

### 4.1 Step: Synchronous Ingress (Edge_Step)
*   **Implementation**: `rust-shield` as `Edge_Step`.
*   **Input**: External HTTPS Request.
*   **Logic**: JWT validation + `X-Motia-Step` injection.

### 4.2 Step: Asynchronous Orchestration (Core_Step)
*   **Implementation**: `MotiaOrchestrator` in `tasks.py`.
*   **Steps**: `StorageStep`, `OCRStep`, `ExtractionStep`, `RegistrySyncStep`.
*   **Functional Goal**: Convert raw inputs into structured Registry records.


### 4.3 Step: State Reconciliation
*   **Input**: `Service_Step` Result.
*   **Logic**: Results are bound back to the `Document 1D` in the `Registry_Step`.
*   **Thinkable Outcome**: The legal record transitions from "Processing" to "Verified".

---

## 5. Maintenance & Observability
By adhering to **Motia** patterns, every Step execution corresponds to a traceable point in the "Thinkable" map, simplifying multi-dev debugging and scaling.

**Note**: All implementation must prioritize **Document 1D** consistency to maintain cross-runtime functional integrity.

