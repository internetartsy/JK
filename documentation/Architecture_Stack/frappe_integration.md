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

## 3. Data Schema (Doctypes)
### 3.1 Land Parcel (`land_parcel`)
Core registry record.
```json
{
  "doctype": "Land Parcel",
  "fields": [
    { "fieldname": "khasra_number", "fieldtype": "Data", "reqd": 1, "unique": 1 },
    { "fieldname": "village_code", "fieldtype": "Link", "options": "Village" },
    { "fieldname": "owner_id", "fieldtype": "Link", "options": "Farmer" },
    { "fieldname": "area_acres", "fieldtype": "Float" },
    { "fieldname": "geometry_geojson", "fieldtype": "Code", "options": "JSON" },
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

