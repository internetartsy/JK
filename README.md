# JK Land Records System (AgriStack)

**Modern, Offline-First Land Records Management Platform**

![Status](https://img.shields.io/badge/Status-Active_Development-green)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-purple)

This repository contains the complete source code for the JK Land Records System, featuring a robust microservices architecture designed for high security, offline capability, and seamless integration with legacy systems.

---

## 🏗️ Architecture Overview

The system allows **Field Operators** to collect land data offline (Mobile), **Verifiers** to review submissions (Web), and **Administrators** to manage the legal registry (ERPNext).

1.  **Mobile App (Native)**: Offline-first React Native app for field surveys and OCR.
2.  **Frontend (Web)**: React + Vite dashboard for verification and GIS analysis.
3.  **Security Gateway (Rust)**: High-performance edge gateway for Auth, Rate-Limiting, and ISO-Audit logging.
4.  **Backend (FastAPI)**: Core business logic, Geospatial analysis (PostGIS), and Sync orchestration.
5.  **ERP (Frappe/ERPNext)**: The legal System of Record (RoR, JAMABANDI).


---

## ⚡ Recent Updates (Dec 14, 2025)

The `jk_sub` branch has been consolidated with major fixes and production-ready configurations:

*   **Production Deployment**: Added `docker-compose.prod.yml`, Nginx production configs, and optimized Dockerfiles.
*   **Security Gateway**: Fixed rate-limiting middleware (`ratelimit.rs`) and updated main entry points.
*   **Mobile App**: Enhanced `farmerService.ts` for robust offline sync and error handling.
*   **Backend**: Corrected API endpoints in `main.py` for smoother integration.
*   **Documentation**: Completely overhauled Architecture Stack docs to **V2 Standards** with detailed schemas and logic flows.

---


## 🚀 Quick Start (Docker)

### Prerequisites
*   Docker & Docker Compose
*   Node.js 18+ (for local mobile dev)
*   Rust (Optional, for gateway dev)

### 1. clone & Build
```bash
git clone https://github.com/internetartsy/JK.git
cd JK
git checkout jk_sub
```

### 2. Start Services
```bash
# Start the entire stack
docker-compose up --build -d
```

### 3. Verify Health
Check if all containers are running:
```bash
docker ps
```
*   **Security Gateway**: `http://localhost:8090/health`
*   **Backend API**: `http://localhost:8000/health`
*   **Frontend**: `http://localhost:3000`

---

## 🔑 Access Credentials (Dev)

> **⚠️ WARNING:** These are default development credentials. CHANGE THEM IN PRODUCTION.

### 🛡️ Core Services

| Service | Access URL | Username | Password |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | `http://localhost:3000` | N/A (Keycloak) | Use Keycloak credentials |
| **Backend API** | `http://localhost:8000/docs` | N/A | N/A |
| **Security Gateway** | `http://localhost:8090` | N/A | Bearer Token Required |
| **ERPNext (Admin)** | `http://localhost:8080` | `Administrator` | `admin` |
| **Keycloak (Auth)** | `http://localhost:8180` | `admin` | `admin` |

### 📱 Mobile App (Mock Users)

| Role | Username | Password | PIN |
| :--- | :--- | :--- | :--- |
| **Field Operator** | `operator` | `operator123` | `1234` |
| **Verifier** | `officer` | `admin` | N/A |

### 🗄️ Infrastructure & Database

| Service | Host/Port | Username | Password | Database |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `localhost:5432` | `jk_user` | `password` | `jk_land_records` |
| **MinIO (S3)** | `http://localhost:9001` | `minioadmin` | `minioadmin` | `documents` |
| **Grafana** | `http://localhost:3001` | `admin` | `admin` | N/A |
| **Redis** | `localhost:6379` | N/A | N/A | N/A |

---

## 📂 Project Structure

```bash
JK/
├── mobile/                 # React Native App (Expo)
├── frontend-landing/       # React Web Dashboard
├── backend/                # FastAPI (Python) Application
├── rust-shield/            # Rust Security Gateway
├── frappe-bench/           # ERPNext & Custom Apps
├── docker-compose.yml      # Orchestration
└── documentation/          # Detailed Architecture Docs
    ├── Architecture_Stack/ # Core System Designs (V2)
    └── System_Status/      # Operational Reports
```

## 📚 Documentation (V2 Standards)

We have updated all architecture documentation to detailed **Version 2 Standards**.

*   [**Frontend Architecture**](./documentation/frontend.md) - Components & State Logic
*   [**Native Mobile Architecture**](./documentation/native.md) - Offline Sync & OCR
*   [**Rust Gateway**](./documentation/rust_gateway.md) - Security & Audit Specs
*   [**Frappe Integration**](./documentation/frappe_integration.md) - Doctype Schema & Webhooks
*   [**Spatial & Geo**](./documentation/spatial_geo.md) - PostGIS & Maps
*   [**OCR Intelligence**](./documentation/ocr_geo.md) - AI/ML Extraction Pipeline

---

## 🛠️ Development Workflow

### 1. Mobile Development
```bash
cd mobile
npm install
npm start
# Press 'a' for Android emulator or scan QR with Expo Go
```

### 2. Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Rust Gateway
```bash
cd rust-shield
cargo run
```

---

## 🤝 Contribution

1.  Create a feature branch (`git checkout -b feature/amazing-feature`).
2.  Commit your changes following **Conventional Commits**.
3.  Push to the branch.
4.  Open a Pull Request.

---

**© 2025 JK Land Records Authority**
