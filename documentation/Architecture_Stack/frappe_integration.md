# Frappe Integration Architecture

## 1. Scope & Responsibility
Defines Frappe (ERPNext) as the **System of Record** for Land Records.
*   **Role**: Primary Data Source & Admin Backend.
*   **Version**: Frappe Framework v15 / ERPNext v15.

## 2. Architecture: Logical Flow
```mermaid
graph LR
    subgraph "External"
        API[FastAPI Backend :8000]
    end
    subgraph "Frappe Ecosystem"
        WEB[ERPNext Web :8080]
        DB[(MariaDB :3306)]
        REDIS[Redis :6379]
    end
    API -->|REST API (Client)| WEB
    WEB -->|Webhooks| API
    WEB -->|ORM| DB
```

### 3.1 Core Doctypes (Reference List)
The integration manages **7 Primary Doctypes**. Each maps to a specific API Resource endpoint (`/api/resource/{API Resource ID}`).

| Doctype Name | API Resource ID | Purpose |
| :--- | :--- | :--- |
| **Land Parcel** | `Land Parcel` | Official record of a plot (Khasra) |
| **ULPIN Record** | `ULPIN` | Unique Land Parcel Identification Number (14-digit) |
| **ROR Document** | `ROR Report` | Record of Rights (Jamabandi/Girdawari) |
| **Farmer Registry** | `Farmer` | Identity records (Aadhaar linked) |
| **Village Map** | `Village` | Administrative boundaries |
| **Dispute Claim** | `Dispute Claim` | Legal issues linked to parcels |
| **Crop Survey** | `Crop Survey` | Seasonal usage data (Girdawari) |

### 3.2 Example Schema: ULPIN Integration (Spatial Link)
Describes how the `ULPIN` doctype links geospatial unique IDs to the `Land Parcel`.

```json
{
  "doctype": "ULPIN",
  "fields": [
    { "fieldname": "ulpin_code", "fieldtype": "Data", "label": "ULPIN (14-digit)", "unique": 1 },
    { "fieldname": "linked_parcel", "fieldtype": "Link", "options": "Land Parcel", "label": "Related Khasra" },
    { "fieldname": "centroid_lat", "fieldtype": "Float", "precision": 6 },
    { "fieldname": "centroid_lng", "fieldtype": "Float", "precision": 6 },
    { "fieldname": "verification_status", "fieldtype": "Select", "options": ["Generated", "Verified", "Obsolete"] }
  ]
}
```

### 3.3 Example Schema: ROR Integration (Legal Link)
The Record of Rights (`ROR Report`) aggregates ownership history and legal status.

```json
{
  "doctype": "ROR Report",
  "fields": [
    { "fieldname": "report_id", "fieldtype": "Data", "unique": 1 },
    { "fieldname": "parcel_id", "fieldtype": "Link", "options": "Land Parcel" },
    { "fieldname": "mutation_number", "fieldtype": "Data", "label": "Intiqal No" },
    { "fieldname": "owner_history", "fieldtype": "Table", "options": "Ownership History" },
    { "fieldname": "is_active_jamabandi", "fieldtype": "Check", "default": 1 }
  ]
}
```

### 3.4 Example Schema: Land Parcel
Core registry record.
```json
{
  "doctype": "Land Parcel",
  "fields": [
    { "fieldname": "khasra_number", "fieldtype": "Data", "reqd": 1, "unique": 1 },
    { "fieldname": "village_code", "fieldtype": "Link", "options": "Village" },
    { "fieldname": "owner_id", "fieldtype": "Link", "options": "Farmer" },
    { "fieldname": "area_acres", "fieldtype": "Float" },
    { "fieldname": "ulpin_link", "fieldtype": "Link", "options": "ULPIN" },
    { "fieldname": "ror_link", "fieldtype": "Link", "options": "ROR Report" },
    { "fieldname": "status", "fieldtype": "Select", "options": ["Active", "Disputed", "Process Debt"] }
  ]
}
```

### 3.2 Key Sync Events
*   `on_update`: Triggers Webhook -> FastAPI (`/webhooks/frappe/update`).
*   `on_submit`: Triggers Blockchain Commit (via Rust Gateway).

## 4. Endpoints & Ports
*   **Port**: `8080` (Standard)
*   **API Path**: `/api/resource/{doctype}`
*   **Custom Methods**: `/api/method/land_records.api.sync_parcel`

## 5. Implementation Status
*   **Sync Service**: `backend/app/services/frappe_sync/frappe_client.py`
*   **Auth**: Token-based (API Key / Secret).

