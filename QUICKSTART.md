# Quick Start Guide - Land Records OCR System

## Prerequisites
- Docker Desktop or OrbStack
- Git
- (Optional) OCR DataLab instance for full OCR functionality

## Start the System

```bash
# Clone repository (if applicable)
cd /Users/mic/docode/jk

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

## Access Services

- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/health
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)
- **PostgreSQL**: localhost:5432 (postgres/password)

## Database

### View Tables
```bash
docker-compose exec db psql -U postgres -d land_records -c "\dt"
```

### Run Migrations
```bash
docker-compose exec -e PYTHONPATH=. backend alembic upgrade head
```

### Create New Migration
```bash
docker-compose exec -e PYTHONPATH=. backend alembic revision --autogenerate -m "Description"
```

## Test the System

### 1. Test Transliteration
```bash
docker-compose exec backend python -m app.services.normalization.test_normalization
```

Expected output:
```
محمد احمد  → Muhammad Ahmad
25 kanal   = 12,646.42 sqm
گندم       → Wheat (W, cereals)
```

### 2. Test Field Extraction
```bash
docker-compose exec backend python -m app.services.extraction.test_extraction
```

### 3. Test Entity Resolution
```bash
docker-compose exec backend python -m app.services.entity_resolution.test_entity_resolution
```

### 4. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:8000/health
```

**List Persons:**
```bash
curl http://localhost:8000/api/v1/persons/
```

**Process Document (with OCR DataLab):**
```bash
curl -X POST "http://localhost:8000/api/v1/ocr/process" \
  -F "file=@document.jpg" \
  -F "doc_type=girdawari" \
  -F "langs=ur+en"
```

## Common Tasks

### Add a Person
```bash
curl -X POST "http://localhost:8000/api/v1/persons/" \
  -H "Content-Type: application/json" \
  -d '{
    "name_urdu": "محمد احمد",
    "name_english": "Muhammad Ahmad",
    "confidence": 0.9
  }'
```

### Query Parcels by Village
```bash
curl "http://localhost:8000/api/v1/parcels/?village_id=VILLAGE_001"
```

### Stop Services
```bash
docker-compose down
```

### Reset Database
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec -e PYTHONPATH=. backend alembic upgrade head
```

## Environment Variables

Create `.env` file (optional):
```env
# OCR DataLab
OCR_DATALAB_URL=http://your-datalab-instance:8001
OCR_DATALAB_API_KEY=your-api-key

# Database
DATABASE_URL=postgresql://postgres:password@db:5432/land_records

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## Troubleshooting

### Backend won't start
```bash
# Rebuild backend
docker-compose up -d --build backend

# Check logs
docker-compose logs backend
```

### Database connection issues
```bash
# Ensure DB is running
docker-compose ps db

# Test connection
docker-compose exec db psql -U postgres -c "SELECT version();"
```

### MinIO access issues
```bash
# Ensure MinIO is running
docker-compose ps minio

# Buckets are auto-created on first use
```

## Development Workflow

1. **Make code changes** in `backend/` directory
2. **Rebuild container**: `docker-compose up -d --build backend`
3. **Run tests**: See test commands above
4. **Check API docs**: Visit http://localhost:8000/docs
5. **Create migration** if schema changed
6. **Commit changes** to Git

## Next Steps

See [implementation_plan.md](file:///Users/mic/.gemini/antigravity/brain/2df019b4-162f-46d0-a77a-6e193fb94d26/implementation_plan.md) for:
- Frappe integration guide
- React frontend setup
- Keycloak SSO configuration
- Production deployment
