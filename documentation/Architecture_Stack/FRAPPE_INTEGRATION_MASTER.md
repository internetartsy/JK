# 📄 Frappe Integration & Doctype Specifications

**Status**: ✅ Active Development  
**Sync Layer**: Bi-directional synced (FastAPI ↔ Frappe)  
**Doctype Status**: Initial Development (Needs Normalization)  
**App**: `land_records`  
**Module**: `lr_core`

---

## PART 1: DOCTYPE SPECIFICATIONS

This section details the custom doctypes implemented in the `land_records` app.

### 1. Village
- **Path:** `lr_core/doctype/village`
- **Primary Key:** `village_name`
- **Fields:**
  - `village_name` (Data)
- **Issues:**
  - `Halqa` field added to `Land Parcel` Doctype (Resolved).
  - Geo-boundaries are stored in `geojson` field (Partial).

### 2. Land Parcel
- **Path:** `lr_core/doctype/land_parcel`
- **Primary Key:** `parcel_id`
- **Fields:**
  - `village_id` (Data) - **Should be Link**
  - `khasra_number` (Data)
  - `area_text` (Data) & `area_geom` (Float)
  - `status`, `ownership_status`, `cultivation_status` (Selects)
  - `geojson` (Long Text)
  - `tehsil`, `district` (Data) - **Denormalized**
- **Permissions:**
  - `System Manager/Admin`: Full Access
  - `Validator`: Read Only
  - `Enumerator`: Read/Write (Create allowed)

### 3. Farmer
- **Path:** `lr_core/doctype/farmer`
- **Primary Key:** `farmer_id`
- **Fields:**
  - `name_urdu`, `name_english`, `father_name` (Data)
  - `village` (Link: Village)
  - `aadhaar_hash` (Hidden Data)
  - `demographics`, `consent_flags`, `role_flags` (JSON)
  - `linked_parcels` (Table Link: `Farmer Parcel Link`)

### 4. Claim
- **Path:** `lr_core/doctype/claim`
- **Primary Key:** `claim_id`
- **Purpose:** Dispute resolution tracking
- **Fields:**
  - `parcel_id` (Link: Land Parcel)
  - `claim_type` (Select: Ownership, Inheritance, etc.)
  - `status` (Select: Draft, Pending, Approved)
  - `evidence_docs` (Attach)
  - `assigned_to` (Link: User)

### 5. Review Task
- **Path:** `lr_core/doctype/review_task`
- **Primary Key:** Hash
- **Fields:**
  - `document_id` (Data)
  - `document_type` (Select: Girdawari, Khasra)
  - `confidence_score` (Float)
  - `extracted_fields` (JSON)
  - `status` (Pending/Approved/Rejected)

---

## PART 2: SYNC ARCHITECTURE

The sync layer enables bi-directional data flow between Frappe (admin/workflow system) and PostgreSQL/PostGIS (canonical data store), with FastAPI as the bridge.

### Architecture

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

### Data Flow

#### Frappe → PostgreSQL (Webhook)
1. User creates/updates Farmer in Frappe
2. Frappe Server Script `After Save` triggers
3. Webhook POST to FastAPI `/api/v1/frappe/webhook`
4. FastAPI syncs to Person table in PostgreSQL

#### PostgreSQL → Frappe (API Call)
1. OCR processes document → creates Person in PostgreSQL
2. FastAPI calls `FrappeSyncService.sync_person_to_frappe()`
3. Creates/updates Farmer doctype via Frappe API
4. If low confidence (< 0.7) → calls `create_review_task_for_low_confidence()`

### Integration Components

#### 1. FastAPI Webhook
- **Files**: `backend/app/api/v1/frappe_sync.py`
- **Endpoint**: `POST /api/v1/frappe/webhook`
- **Payload**:
  ```json
  { "doctype": "Farmer", "name": "ID", "action": "insert", "data": {...} }
  ```

#### 2. Sync Service
- **Files**: `backend/app/services/frappe_sync/sync_service.py`
- **Methods**: `sync_person_to_frappe`, `sync_parcel_to_frappe`

#### 3. Frappe Server Script
- **Triggers**: `After Insert`, `After Save`, `Before Delete` on `Farmer` Doctype.
- **Action**: Pushes data to FastAPI Webhook.

---

## 🛠 Recommendations & Improvements

1.  **Normalization Gap:** `Land Parcel` uses flat text for geography (`tehsil`, `district`, `village_id`) while `Farmer` correctly uses a Link to `Village`.
2.  **Missing Hierarchy:** No doctypes exist for `Halqa` or `Tehsil`.
3.  **Conflict Resolution**: Current strategy is Last-Write-Wins. Future should include admin UI for resolution.
4.  **Security**: Use `X-Frappe-Signature` for webhook validation.
