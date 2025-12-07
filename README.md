# JK Land Records System (Development Server)

**Modern, scalable, and offline-first land records management system developed for JK.**

This repository contains the complete source code for the JK Land Records System, featuring a robust backend, modern web frontend, and a native mobile application for field enumerators.

---

## 🚀 Project Overview

The JK Land Records System is designed to digitize and manage land records with high efficiency and accuracy. It solves key challenges such as offline data collection, Urdu OCR for legacy documents, and spatial data management.

### Key Features

*   **Offline-First Mobile App**: React Native (Expo) app for field enumerators to collect data and map parcels without internet. Background sync ensures data integrity once online.
*   **Intelligent OCR Pipeline**: Hybrid OCR engine combining Tesseract (Local) and Google Cloud Vision (Cloud) with specific fine-tuning for Urdu/English revenue documents (Girdawari, Khasra).
*   **Spatial Management**: PostGIS-powered backend for storing and querying complex land parcel geometries.
*   **Enterprise Integration**: Bidirectional sync with Frappe/ERPNext for administrative workflows.
*   **Scalable Architecture**: Dockerized microservices architecture with Redis caching, Celery task queues, and Prometheus/Grafana monitoring.

---

## 🛠 Technology Stack

### Backend
*   **Framework**: FastAPI (Python 3.9+)
*   **Database**: PostgreSQL 15 + PostGIS 3.3
*   **Task Queue**: Celery + Redis
*   **Storage**: MinIO (S3 Compatible)
*   **OCR**: Tesseract 5, PyTesseract, Google Vision API (Optional)
*   **Monitoring**: Prometheus, Grafana, Flower
*   **Auth**: Keycloak (OIDC/OAuth2)

### Mobile App
*   **Framework**: React Native (Expo SDK 50)
*   **Local DB**: SQLite (expo-sqlite)
*   **Maps**: MapLibre GL Native
*   **State**: React Context + Async Storage
*   **Sync**: Custom background sync service with conflict resolution

### Frontend (Web)
*   **Framework**: React (Vite) + TypeScript
*   **UI Library**: TailwindCSS + Headless UI
*   **Maps**: MapLibre GL JS

---

## 📦 Project Structure

```
jk-land-records/
├── backend/                # Python FastAPI Backend
│   ├── app/
│   │   ├── api/            # REST API Endpoints
│   │   ├── core/           # Config, Security, Celery
│   │   ├── models/         # SQLAlchemy Models (PostGIS)
│   │   └── services/       # Business Logic (OCR, Sync, Geo)
│   ├── alembic/            # Database Migrations
│   └── tests/              # Pytest Suite
├── frontend/               # React Admin Dashboard
├── mobile/                 # React Native Field App
│   ├── src/                # Mobile Source Code
│   └── app.json            # Expo Config
├── docker-compose.yml      # Container Orchestration
└── config/                 # Service Configurations (Keycloak, Prometheus)
```

---

## 🚦 Getting Started (Development)

This repository is configured as a **Development Server**. Follow these steps to spin up the entire stack locally.

### Prerequisites
*   Docker & Docker Compose
*   Node.js 18+ & NPM
*   Python 3.9+
*   Git

### 1. Start Support Services & Backend
Run the following command to start PostgreSQL, Redis, MinIO, Keycloak, and the Backend API.

```bash
docker-compose up -d --build
```

### 2. Verify Services
Check the status of the development server:

```bash
./documentation/System_Status/dev-status.sh
```

You should see:
*   **Backend API**: `http://localhost:8000/docs`
*   **Flower (Tasks)**: `http://localhost:5555`
*   **Keycloak**: `http://localhost:8080`
*   **MinIO**: `http://localhost:9001`

### 3. Run Mobile App
Open a new terminal for the mobile app:

```bash
cd mobile
npm install
npx expo start
```
*   Scan the QR code with **Expo Go** (Android) or use an iOS Simulator.
*   **Note**: For full native modules (MapLibre/Camera), use a Development Build or the provided mocks in Expo Go.

### 4. Run Frontend Dashboard
Open a new terminal for the web dashboard:

```bash
cd frontend
npm install
npm run dev
```
Access at `http://localhost:5173`.

---

## 🔑 Default Credentials

| Service | Username | Password |
| :--- | :--- | :--- |
| **Keycloak** | `admin` | `admin` |
| **MinIO** | `minioadmin` | `minioadmin` |
| **Grafana** | `admin` | `admin123` |
| **App Login** | `admin` | `admin` |

---

## 🔄 Deployment & CI/CD

### Backend
The backend is containerized. For production:
1.  Update `.env` with production secrets.
2.  Deploy using Kubernetes (Charts provided in `/k8s` - *coming soon*) or Docker Swarm.

### Mobile
Build native binaries using EAS (Expo Application Services):
```bash
cd mobile
eas build --profile production --platform android
```

---

## 📝 License
Proprietary & Confidential.
Copyright © 2025 JK Land Records Dept.
