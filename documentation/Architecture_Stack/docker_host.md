# Docker & Host Architecture

## 1. Scope & Responsibility
Orchestration of the entire microservice ecosystem using Docker Compose.
*   **Role**: Service Orchestration, Networking, and Resource Management.
*   **Environment**: Production (Linux/Alpine) & Development (Mac/Linux).

## 2. Architecture: Container Map
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

## 3. Configuration & Networking
### 3.1 Network Topology
All services run on the `jk-network` bridge network.
*   **Gateway**: `172.x.0.1`
*   **DNS Resolution**: Internal Docker DNS (e.g., `ping backend`, `ping redis`).

### 3.2 Volume Management
*   `postgres_data`: Persistent storage for PostGIS.
*   `minio_data`: Object storage for OCR images.
*   `redis_data`: Queue persistence.
*   `frappe_sites`: Shared volume for ERPNext logic.

## 4. Logical Functions & Scripts
### 4.1 Host Gateway (`host.docker.internal`)
Configured to allow containers to access services running on the host machine (e.g., local LLMs, specialized debuggers).
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### 4.2 Production Toggles
*   **Dev**: `docker-compose.yml` (Hot reload enabled, exposed ports).
*   **Prod**: `docker-compose.prod.yml` (Optimized images, internal routing only).

## 5. Endpoints & Ports (Exposed)
*   **Public Edge**: `8090` (Rust Shield)
*   **Direct API**: `8000` (FastAPI - Dev Only)
*   **Direct ERP**: `8080` (Frappe - Dev Only)
*   **Monitoring**: `9090` (Prometheus), `3001` (Grafana)

## 6. Code Locations
*   **Orchestration**: `docker-compose.yml`, `docker-compose.prod.yml`
*   **Config**: `config/`, `.env`
*   **Gateway**: `nginx/`, `rust-shield/`

## 7. Docker API Endpoints & Backend Details
To interact with the containerized backend from the host or external networks:

| Service | Port (Container) | Port (Host) | Internal DNS | Endpoint Description |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | `8000` | `8000` | `backend` | Core FastAPI Logic & OCR Processing |
| **Frappe** | `8000` | `8080` | `erp-web` | ERPNext Web Interface & Admin Desk |
| **Rust Shield** | `8090` | `8090` | `shield` | Security Gateway (Auth, Rate Limit) |
| **Database** | `5432` | `5432` | `postgres` | PostGIS (Spatial Data & Records) |

### 7.1 Backend Data Flow
1.  **Ingress**: Requests hit `Rust Shield (:8090)`.
2.  **Auth**: Shield validates valid JWT (Keycloak).
3.  **Proxy**: Traffic is routed to `backend:8000` (Business Logic) or `erp-web:8000` (Admin).
4.  **Storage**: Backend writes to `postgres:5432` (Relational) and `minio:9000` (Files).

## 8. Hosting & Self-Hosting Guide

### 8.1 Self-Hosting (On-Premise / Local Server)
Ideal for District Servers or Offline-First remote hubs.
1.  **Prerequisites**: Docker Engine, Docker Compose, 16GB RAM.
2.  **Clone Repository**:
    ```bash
    git clone https://github.com/internetartsy/JK.git
    cd jk
    git checkout jk_sub
    ```
3.  **Configure Environment**:
    ```bash
    cp .env.example .env
    # Edit .env with secure passwords for DB and Keycloak
    ```
4.  **Start Production Stack**:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```
5.  **Access**:
    *   Dashboard: `http://<SERVER_IP>:80`
    *   Admin: `http://<SERVER_IP>:8080`

### 8.2 Hosting (Cloud / VPS)
Ideal for Central State deployment (AWS/Azure/DigitalOcean).
1.  **Provision VPS**: Ubuntu 22.04 LTS (4 vCPU, 16GB RAM).
2.  **DNS Setup**: Point `api.jk-land.gov.in` to VPS IP.
3.  **SSL/TLS**: Use Let's Encrypt with Nginx sidecar (included in prod compose).
4.  **CI/CD**: Auto-deploy from `jk_sub` branch via GitHub Actions.

## 9. Data Transfer Strategy (Migration & Backup)
Instructions for moving the entire backend data state between environments.

### 9.1 Backup (Export)
Run these commands on the **Source** server:
```bash
# 1. SQL Dump (PostGIS Data)
docker exec -t jk-postgres pg_dumpall -c -U jk_user > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql

# 2. File Store Backup (MinIO)
docker run --rm --link jk-minio:minio -v $(pwd)/backup:/backup minio/mc mirror --overwrite minio/agristack /backup/files

# 3. Redis dump (Optional - Queue State)
docker cp jk-redis:/data/dump.rdb ./backup/redis_dump.rdb
```


### 9.2 Restore (Import)
Run these commands on the **Target** server:
```bash
# 1. SQL Restore
cat dump_*.sql | docker exec -i jk-postgres psql -U jk_user

# 2. File Store Restore
docker run --rm --link jk-minio:minio -v $(pwd)/backup:/backup minio/mc mirror --overwrite /backup/files minio/agristack
```

## 10. Configuration Reference (Snippet)
*Excerpt from `docker-compose.yml` defining the core stack:*

```yaml
services:
  # Rust Security Gateway
  security-gateway:
    build: ./rust-shield
    ports:
      - "8090:8090"
    environment:
      DATABASE_URL: postgresql://jk_user:${DB_PASSWORD}@postgres:5432/jk_land_records
      BACKEND_URL: ${BACKEND_URL:-http://host.docker.internal:8000}
      FRAPPE_URL: ${FRAPPE_URL:-http://erp-web:8000}
    depends_on:
      - postgres
      - redis

  # FastAPI Backend
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]

  # ERPNext Instance
  erp-web:
    image: frappe/erpnext:latest
    ports:
      - "8080:8000"
    volumes:
      - erp_sites:/home/frappe/frappe-bench/sites
```


