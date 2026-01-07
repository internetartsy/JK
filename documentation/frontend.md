# Frontend Architecture (Web)

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
    
    %% -- Logic Flows --
    Backend -.->|"Async Task"| OCR_Worker
    OCR_Worker -->|"Extract Text"| Backend
    Backend -->|"Sync Result"| Frappe
    
    Frappe -.->|"Trigger"| Dedupe
    Dedupe -->|"Find Clusters"| Frappe
    
    Mobile -->|"Sync Offline Data"| Backend
```

## 1. Scope & Responsibility
React-based Dashboard for Verifiers and Operators.
*   **Role**: UI for Review, Geo-Visualization, and Analytics.
*   **Tech Stack**: Vite + React + Tailwind + Recharts + MapLibre.

## 2. Architecture: Component Tree
```mermaid
graph TD
    App["App"] -->|"Route"| Dashboard["Dashboard"]
    App -->|"Route"| ReviewQueue["ReviewQueue"]
    App -->|"Route"| MapViewer["MapViewer"]
    
    Dashboard --> StatGrid["StatGrid"]
    Dashboard --> SyncChart["Recharts Graph"]
    Dashboard --> RecentActivity["RecentActivity"]
    
    ReviewQueue --> SplitView["SplitView"]
    SplitView --> OCRImage["Canvas Overlay"]
    SplitView --> FormEditor["FormEditor"]
```

## 3. Logical Functions & State
### 3.1 Dashboard (`Dashboard.tsx`)
*   **Stats Fetching**: Aggregates data from `parcelApi.getStats()` and `reviewApi.getPending()`.
*   **Visualization**: Renders real-time sync activity using SVG paths (Waveform).
*   **Recent Updates**: Polling list of recent Parcel modifications.

### 3.2 Review Logic (`ReviewDashboard.tsx`)
*   **Input**: JSON List of `ReviewTask` (Pending).
*   **Action**: User approves/edits -> `PATCH /api/v1/reviews/{id}`.
*   **Output**: Updates Status -> 'Approved' -> Triggers DB Sync.

## 4. Endpoints & Ports
*   **Port**: `5173` (Development)
*   **Target API**: `http://localhost:8090` (Security Gateway) or `8000` (Direct).

### 4.1 Developer API Reference (Key Integrations)
These endpoints are actively consumed by the frontend client. Use these to debug network tabs.

| Feature | Method | Endpoint | Purpose |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `GET` | `/api/v1/parcels/stats` | Fetches aggregate counters (Total, Pending, disputes) |
| **Registry Master** | `LINK` | `8090/app/land-parcel`| Unified Secure Link to Frappe SOR Registry |
| **Review** | `GET` | `/api/v1/reviews/pending` | Loads the live OCR verification queue |
| **Review** | `POST` | `/api/v1/reviews/{id}/approve`| Live Approve & Transmit to AgriStack |
| **Map** | `SURGICAL` | `MapView.tsx` | Context outlines + status-based target fill |

## 5. Directory Structure
```
frontend-landing/src/
├── components/
│   ├── Dashboard.tsx       # Main Stats View
│   ├── ReviewQueue.tsx     # Review UI
│   ├── MapView.tsx         # GIS Layer
├── api/
│   ├── client.ts           # Axios Instance
└── constants/
    └── translations.ts     # Localization
```
