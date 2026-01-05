# Architectural Design and Method Document (ADMD)

**Version**: 2.0 (Motia-Unified Alignment)
**Date**: December 22, 2025
**Status**: Active Alignment

## 1. System Philosophy: The "Thinkable" Architecture
The platform is designed using **Motia Principles**, treating every backend concern as a unified **Step**. This approach ensures the system remains **logical, functional, and thinkable** across a multi-language (Polyglot) runtime.

### 1.1 The "Step" Primitive
A **Step** is the fundamental building block of our architecture. Each step encapsulates a specific configuration and a functional handler.
*   **Logical**: Decouples domain rules from infrastructure.
*   **Functional**: Clear Input (Events/Requests) -> Deterministic Processing -> Output (State/Events).
*   **Multi-Dev**: Allows Rust, Python, and Frappe logic to interact seamlessly within a single "Thinkable" flow.

## 2. Multi-Dev Polyglot Runtime
The system leverages a distributed polyglot model, synchronized via **Document 1D**.

| Runtime Layer | Language | Motia Step Role | Responsibility |
| :--- | :--- | :--- | :--- |
| **Rust Shield** | Rust | `Edge_Step` | JWT Validation, Rate Limiting, Request Interception |
| **Orchestrator** | Python | `Core_Step` | Event Routing, State Flow, Domain Logic Execution |
| **Frappe/ERP** | Python/JS | `Registry_Step` | System of Record, Persistence, UI Management |
| **OCR/GIS** | Python | `Service_Step` | Heavy Computation, Data Extraction, Spatial Analytics |

## 3. Core Structural Flow
The master flow revolves around the lifecycle of a **Document 1D**, orchestrated through sequential and concurrent Steps.

```mermaid
flowchart TD
    subgraph Edge_Infrastructure [Edge Layer: Rust]
        RS["Rust Security Step (Auth/Sign)"]
    end

    subgraph Registry_Layer [Registry: Frappe]
        FR["Frappe Registry Step (SOR)"]
    end

    subgraph Orchestration_Layer [Orchestration: Motia]
        MO["Motia Core Step (Domain Rules)"]
    end

    subgraph Execution_Layer [Service Runners]
        OS["OCRStep"]
        ES["ExtractionStep"]
        SS["SpatialGeoStep"]
    end

    %% -- Logical Flow --
    RS -->|"Validated Call"| FR
    FR -->|"Domain Event - Doc1D"| MO
    MO -->|"StorageStep"| OS
    MO -->|"OCRStep"| OS
    MO -->|"ExtractionStep"| ES
    OS -->|"Result Update"| FR
    ES -->|"Result Update"| FR
```

## 4. Logical Workflow Specifications

### 4.1 Step: Synchronous Ingress (Edge_Step)
*   **Implementation**: `rust-shield` as `Edge_Step`.
*   **Input**: External HTTPS Request.
*   **Logic**: JWT validation + `X-Motia-Step` injection.

### 4.2 Step: Asynchronous Orchestration (Core_Step)
*   **Implementation**: `MotiaOrchestrator` in `tasks.py`.
*   **Steps**: `StorageStep`, `OCRStep`, `ExtractionStep`, `RegistrySyncStep`.
*   **Functional Goal**: Convert raw inputs into structured Registry records.


### 4.3 Step: State Reconciliation
*   **Input**: `Service_Step` Result.
*   **Logic**: Results are bound back to the `Document 1D` in the `Registry_Step`.
*   **Thinkable Outcome**: The legal record transitions from "Processing" to "Verified".

---

## 5. Maintenance & Observability
By adhering to **Motia** patterns, every Step execution corresponds to a traceable point in the "Thinkable" map, simplifying multi-dev debugging and scaling.

**Note**: All implementation must prioritize **Document 1D** consistency to maintain cross-runtime functional integrity.

