---
trigger: always_on
---

# agent.me

## Project Overview
This repository defines the architecture, documentation flow, and development alignment for a modular platform built on **Frappe**, with OCR, geospatial intelligence, frontend clients, and a high-performance Rust gateway.

The goal is to ensure all development follows a documented, traceable, and composable structure before implementation.

---

## Documentation Structure (Pre-Commit Requirement)

All features must be documented before code is merged.  
Each module has a dedicated markdown file.

### Core Documentation Files
- `frappe_integration.md`
- `ocr_geo.md`
- `frontend.md`
- `native.md`
- `spatial_geo.md`
- `rust_gateway.md`
- `consolidated_summary.md`

No feature implementation should proceed without updating the relevant document.

---

## Module Responsibilities

### 1. frappe_integration.md
Defines how Frappe acts as the **system of record**.

Scope:
- Doctypes and data models
- Workflows and permissions
- Whitelisted APIs
- Event hooks and realtime triggers
- Integration boundaries with external services

Responsibilities:
- Owns business logic and data integrity
- Emits events for OCR, Geo, and Frontend layers
- Enforces RBAC and audit logging

---

### 2. ocr_geo.md
Defines OCR and document intelligence workflows.

Scope:
- OCR ingestion pipeline
- Image/PDF upload handling
- Text extraction lifecycle
- Optional Geo-tag binding to extracted content

Responsibilities:
- Convert unstructured input into structured data
- Validate and normalize OCR output
- Pass extracted entities back to Frappe

---

### 3. frontend.md
Defines the web client architecture.

Scope:
- React / Web UI
- Authentication via Frappe SDK
- Role-based UI rendering
- Realtime updates and dashboards

Responsibilities:
- Consume APIs only (no business logic)
- Reflect permissions and workflow state
- Provide UX for OCR review, Geo views, and reports

---

### 4. native.md
Defines mobile or native client behavior.

Scope:
- Mobile-first UI patterns
- Offline-first support
- Sync and conflict resolution
- Secure credential storage

Responsibilities:
- Work with limited connectivity
- Queue actions offline
- Sync safely with backend gateways

---

### 5. spatial_geo.md
Defines geospatial intelligence layer.

Scope:
- Geo-coordinates and spatial indexing
- Location-based queries
- Mapping and spatial analytics
- Geo-fencing or proximity logic

Responsibilities:
- Handle spatial computations
- Enrich OCR or domain data with location context
- Expose geo APIs to frontend and native apps

---

### 6. rust_gateway.md
Defines the high-performance middleware layer.

Scope:
- Rust-based API gateway
- Request validation and rate limiting
- Aggregation across services
- Secure inter-service communication

Responsibilities:
- Offload heavy computation from Frappe
- Aggregate OCR, Geo, and domain data
- Act as a scalable boundary for frontend clients

---

### 7. docker_host.md
Defines the container orchestration and host environment.

Scope:
- Docker Compose configurations (Dev/Prod)
- Network topology and service discovery
- Volume management and persistence logic
- Host machine integration (gateways, ports)

Responsibilities:
- Managed runtime environment
- Ensure service connectivity
- Handle environment-specific toggles

---

## Development Rules

- No direct frontend → database access
- All writes go through Frappe or Rust Gateway
- OCR and Geo are stateless services
- Rust Gateway is optional but recommended for scale
- Every feature must update documentation before merge

---

## Consolidated System Flow

### High-Level Architecture

```mermaid
flowchart TD
    User -->|Web / Mobile| Frontend
    Frontend -->|Auth & API Calls| RustGateway
    RustGateway -->|Validated Requests| Frappe
    Frappe -->|Events| OCR
    OCR -->|Extracted Data| Frappe
    Frappe -->|Geo Requests| SpatialGeo
    SpatialGeo -->|Geo Data| Frappe
    Frappe -->|Realtime Updates| Frontend