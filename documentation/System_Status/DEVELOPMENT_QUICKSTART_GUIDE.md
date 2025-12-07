# 🚀 Development Quickstart Guide

**Status**: ✅ Active Development  
**Last Updated**: December 7, 2025

---

## 📂 1. Project Overview & Structure

The JK Land Records System has been reorganized for clarity. All documentation files are now centralized in `documentation/`.

```
/
├── backend/                # FastAPI Application (Python 3.9+)
│   ├── app/                # Application Source
│   ├── tests/              # Pytest Suite
│   └── Dockerfile          # Python Service Build
│
├── frontend/               # React + Vite Application
│   ├── src/                # Frontend Source (TypeScript)
│   └── vite.config.ts      # Build Configuration
│
├── mobile/                 # React Native (Expo) Application
│   ├── src/                # Mobile Source (TypeScript)
│   ├── ios/                # Native iOS Bridge
│   └── app.json            # Expo Configuration
│
├── documentation/          # 📘 CENTRALIZED DOCS
│   ├── Executive_Summary/  # High-level System Health
│   ├── Architecture_Stack/ # Deep Technical Specs (OCR, Sync, Maps)
│   ├── System_Status/      # Build Guides & Quickstarts
│   └── Testing_Reports/    # Test Results & Logs
│
├── frappe_docker/          # Frappe Service Configuration
└── docker-compose.yml      # Orchestration
```

---

## ⚙️ 2. Prerequisites

- **Docker Desktop** or OrbStack
- **Node.js 18+** & NPM
- **Python 3.9+**
- **Git**
- (Optional) OCR DataLab instance for full OCR functionality

---

## 🚦 3. Start the System

1.  **Start Services**:
    ```bash
    # Start PostgreSQL, Redis, MinIO, Keycloak, Backend
    docker-compose up -d
    ```

2.  **Verify Status**:
    ```bash
    docker-compose ps
    ```
    *All containers (`backend`, `db`, `redis`, `minio`, `keycloak`) should be `Up`.*

3.  **Access Services**:
    - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
    - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
    - **Keycloak**: [http://localhost:8080](http://localhost:8080) (admin/admin)
    - **MinIO**: [http://localhost:9001](http://localhost:9001) (minioadmin/minioadmin)

---

## 🛠️ 4. Development Workflow

### Backend Development
1.  **Make code changes** in `backend/` directory.
2.  **Rebuild container**:
    ```bash
    docker-compose up -d --build backend
    ```
3.  **Run Tests**:
    ```bash
    docker-compose exec backend pytest
    ```

### Database Management
-   **View Tables**:
    ```bash
    docker-compose exec db psql -U postgres -d land_records -c "\dt"
    ```
-   **Run Migrations**:
    ```bash
    docker-compose exec -e PYTHONPATH=. backend alembic upgrade head
    ```
-   **Create Migration**:
    ```bash
    docker-compose exec -e PYTHONPATH=. backend alembic revision --autogenerate -m "Description"
    ```

### Quality Assurance (Pre-commit)
We use pre-commit hooks to enforce formatting (Black, Prettier).
```bash
# Install
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

---

## 🧪 5. Testing & Validation

### Service Tests
```bash
# Test Field Extraction logic
docker-compose exec backend python -m app.services.extraction.test_extraction

# Test Entity Resolution
docker-compose exec backend python -m app.services.entity_resolution.test_entity_resolution
```

### API Tests (cURL)
```bash
# Add a Person
curl -X POST "http://localhost:8000/api/v1/persons/" \
  -H "Content-Type: application/json" \
  -d '{ "name_urdu": "محمد احمد", "name_english": "Muhammad Ahmad", "confidence": 0.9 }'

# Query Parcels
curl "http://localhost:8000/api/v1/parcels/?village_id=VILLAGE_001"
```

---

## 📝 6. Recent Development Updates

1.  **Farmer Stats Endpoint**: Implemented `/api/v1/parcels/stats/farmers`.
2.  **Mobile Auth**: Fixed OAuth redirect loop for Expo Go.
3.  **Documentation**: Consolidated 15+ files into `documentation/`.
4.  **Security**: Completed `fix-react2shell-next` scan (Result: Clean).
5.  **Integration**: Created `FRAPPE_INTEGRATION_MASTER.md`.

---

## 🔧 Troubleshooting

-   **Backend won't start**: Check logs `docker-compose logs backend`.
-   **DB Connection**: Ensure `db` container is healthy.
-   **MinIO**: Bucket creation is automatic on first upload.

For native mobile build issues, see [Native Build Guide](../Architecture_Stack/NATIVE_BUILD_MASTER_GUIDE.md).
