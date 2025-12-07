# Frappe-FastAPI Sync Layer Documentation

## Overview

The sync layer enables bi-directional data flow between Frappe (admin/workflow system) and PostgreSQL/PostGIS (canonical data store), with FastAPI as the bridge.

## Architecture

```
┌──────────────┐         Webhook          ┌──────────────┐
│   Frappe     │  ───────────────────────▶ │   FastAPI    │
│  (Doctypes)  │                           │   (Bridge)   │
│              │  ◀───────────────────────  │              │
└──────────────┘    Frappe Client API      └──────┬───────┘
                                                   │
                                                   ▼
                                           ┌──────────────┐
                                           │ PostgreSQL + │
                                           │   PostGIS    │
                                           └──────────────┘
```

## Data Flow

### Frappe → PostgreSQL (Webhook)

1. User creates/updates Farmer in Frappe
2. Frappe Server Script triggers on save
3. Webhook POST to FastAPI `/api/v1/frappe/webhook`
4. FastAPI syncs to Person table in PostgreSQL
5. Returns success/error response

### PostgreSQL → Frappe (API Call)

1. OCR processes document → creates Person in PostgreSQL
2. FastAPI calls `FrappeSyncService.sync_person_to_frappe()`
3. Creates/updates Farmer doctype via Frappe API
4. If low confidence → creates ReviewTask in Frappe

## FastAPI Components

### 1. Webhook Endpoint
**File:** `backend/app/api/v1/frappe_sync.py`

```python
POST /api/v1/frappe/webhook
```

**Payload:**
```json
{
  "doctype": "Farmer",
  "name": "farmer-001",
  "action": "insert",
  "data": {
    "farmer_id": "uuid",
    "name_urdu": "محمد احمد",
    "name_english": "Muhammad Ahmad"
  }
}
```

### 2. Frappe Client
**File:** `backend/app/services/frappe_sync/frappe_client.py`

**Methods:**
- `get_doc(doctype, name)` - Fetch single document
- `get_list(doctype, filters)` - Fetch multiple documents
- `create_doc(doctype, data)` - Create new document
- `update_doc(doctype, name, data)` - Update document
- `delete_doc(doctype, name)` - Delete document

### 3. Sync Service
**File:** `backend/app/services/frappe_sync/sync_service.py`

**Methods:**
- `sync_person_to_frappe(person, action)` - Push Person → Farmer
- `sync_parcel_to_frappe(parcel, action)` - Push LandParcel → Land Parcel
- `create_review_task_for_low_confidence()` - Create ReviewTask if confidence < 0.7

## Frappe Components

### 1. Server Script
**Location:** Frappe → Setup → Server Script

**Configuration:**
- Script Type: `DocType Event`
- DocType: `Farmer`
- Events: `After Insert`, `After Save`, `Before Delete`

**Code:** See `frappe_docker/scripts/frappe_server_script.py`

### 2. Doctypes to Create

**Farmer:**
```
Fields:
- farmer_id (Data, Unique)
- name_urdu (Data)
- name_english (Data)
- father_name (Data)
- village (Link to Village)
- confidence (Float)
- consent_flags (JSON)
```

**Land Parcel:**
```
Fields:
- parcel_id (Data, Unique)
- village_id (Data)
- khasra_number (Data)
- area_text (Data)
- area_geom (Float)
- status (Select: Active/Disputed/Inactive)
- version (Int)
```

**Review Task:**
```
Fields:
- document_id (Data)
- document_type (Select: Girdawari/Khasra)
- confidence_score (Float)
- extracted_fields (JSON)
- status (Select: Pending/Approved/Rejected)
- assigned_to (Link to User)
```

## Environment Variables

Add to `.env` or docker-compose:

```bash
# Frappe Configuration
FRAPPE_URL=http://frappe:8000
FRAPPE_API_KEY=your-api-key
FRAPPE_API_SECRET=your-api-secret
```

## Usage Examples

### From FastAPI: Create ReviewTask in Frappe

```python
from app.services.frappe_sync.sync_service import FrappeSyncService

sync_service = FrappeSyncService()

# After OCR with low confidence
sync_service.create_review_task_for_low_confidence(
    doc_id="123",
    doc_type="girdawari",
    confidence=0.65,
    fields=extracted_fields
)
```

### From Frappe: Trigger Sync

When a user saves a Farmer record in Frappe, the server script automatically:
1. Calls FastAPI webhook
2. Updates Person table in PostgreSQL
3. Logs the sync operation

### Test Webhook Manually

```bash
curl -X POST "http://localhost:8000/api/v1/frappe/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "doctype": "Farmer",
    "name": "test-001",
    "action": "insert",
    "data": {
      "farmer_id": "uuid-123",
      "name_urdu": "محمد احمد",
      "name_english": "Muhammad Ahmad",
      "confidence": 0.9
    }
  }'
```

## Conflict Resolution

**Strategy:** Last-write-wins with timestamp tracking

- Each sync includes `modified` timestamp
- More recent changes override older ones
- Conflicts logged in Provenance table

## Error Handling

**Frappe → FastAPI:**
- Server script catches exceptions, logs errors
- Doesn't block Frappe save operation
- Failed syncs queued for retry (future)

**FastAPI → Frappe:**
- HTTP errors logged
- Returns error response to caller
- Retries with exponential backoff (future)

## Security

**Webhook Authentication:**
- Use `X-Frappe-Signature` header (HMAC)
- Validate signature in FastAPI webhook

**API Access:**
- Use Frappe API Key + Secret
- Store in environment variables
- Rotate credentials regularly

## Monitoring

**Health Checks:**
```bash
# FastAPI sync health
curl http://localhost:8000/api/v1/frappe/health

# Frappe API health
curl http://localhost:8001/api/method/ping
```

**Logging:**
- All sync operations logged to console
- Track sync success/failure rates
- Alert on repeated failures

## Future Enhancements

1. **Message Queue:** Use RabbitMQ/Kafka for async reliable sync
2. **Retry Mechanism:** Auto-retry failed syncs
3. **Bulk Sync:** Batch operations for efficiency
4. **Conflict UI:** Admin interface to resolve conflicts
5. **Audit Trail:** Complete sync history in Provenance table

## Troubleshooting

**Webhook not triggering:**
- Check Frappe Server Script is enabled
- Verify webhook URL is correct
- Check network connectivity between containers

**Sync fails silently:**
- Check FastAPI logs: `docker-compose logs backend`
- Check Frappe logs: `bench --site land-records.local logs`
- Verify database permissions

**Authentication errors:**
- Verify API key/secret are set
- Check environment variables loaded
- Test Frappe API manually with curl
