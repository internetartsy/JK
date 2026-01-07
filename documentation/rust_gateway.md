# Rust Security Gateway (Edge Step)

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

## 1. Role: The performance-critical "Edge_Step"
Following **Motia Principles**, the gateway acts as a stateless **Edge_Step**.

## 3. Logical Architecture: Proxy Flow
```mermaid
flowchart LR
    User(["Client / Device"])
    subgraph Edge_Stage [Edge_Step]
        Check(["JWT Verification"])
    end
    Frappe[("Registry_Step")]

    User -->|"External Request"| Check
    Check -->|"Secured Proxy"| Frappe
```

## 4. Maintenance & Multi-Dev Alignment
As a polyglot component, the **Edge_Step** ensures that even if downstream services (Python/JS) have varied security footprints, the "Edge" remains consistently hardened.

### 5. Implementation Status
*   **Core**: `rust-shield/src/main.rs`
*   **Middleware**: `rust-shield/src/middleware/`
*   **Status**: Operational with JWT and Session handling.

---

## 6. Development Rule
Any new API exposed via the `Registry_Step` or `Core_Step` must be mirrored in the **Edge_Step** whitelist to ensure the "Security Step" remains the unified gatekeeper.
