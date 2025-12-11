# 🛡️ Rust Security Gateway: "GeoShield"

**Date:** December 12, 2025  
**Status:** Implementation Phase  
**Technology:** Rust (Actix-Web, Tokio, Ring)

---

## 1. Overview

The **Rust Security Gateway** serves as the primary ingress point for all API traffic destined for the backend services. It enforces strict security policies regarding Authentication, Authorization, Encryption, and Usage Limits *before* requests reach the business logic layer.

## 2. Core Responsibilities

### 🔐 1. Authentication & Authorization (JWT + RBAC)
*   **JWT Verification**: Validates `RS256` signed tokens from Keycloak.
*   **Role-Based Access Control (RBAC)**: Enforces role constraints (e.g., `validator`, `admin`) at the gateway level.
*   **Zero-Copy Logic**: Efficiently inspects headers without unnecessary memory allocation.

### 🛡️ 2. Payload Encryption (AES-256)
*   **Algorithm**: AES-256-GCM (Galois/Counter Mode).
*   **Traffic**: Sensitive coordinate payloads are encrypted by clients (Wasm) and decrypted by the Gateway.
*   **Key Management**: Rotated keys stored in HashiCorp Vault (simulated via env vars for now).

### 🚦 3. Rate Limiting
*   **Algorithm**: Token Bucket (Governor).
*   **Policy**:
    *   **Public IP**: 100 req/min.
    *   **Authenticated User**: 1000 req/min.
    *   **Scraper Protection**: Blocks excessive sequential reads of Map Tiles.

### 📝 4. Audit Logging
*   **Asynchronous Logging**: Writes access logs to a separate queue/file without blocking request processing.
*   **Details**: Logs `User-ID`, `Resource`, `Action`, `Timestamp`, and `IP`.

---

## 3. Architecture

```mermaid
graph LR
    Client[Client (Web/Mobile)] -->|Encrypted HTTP| Gateway[Rust Gateway :8080]
    
    subgraph "GeoShield Internal"
        Auth[Auth Middleware]
        Rate[Rate Limiter]
        Crypto[AES Decryption]
        Audit[Audit Logger]
    end
    
    Gateway --> Rate
    Rate --> Auth
    Auth --> Crypto
    Crypto --> Audit
    
    Audit -->|Sanitized Request| Backend[FastAPI Backend :8000]
    Audit -.->|Log| DB[(Audit DB)]
```

## 4. Implementation Stack

*   **Framework**: `Actix-Web` (High performance, actor-based).
*   **Runtime**: `Tokio` (Async runtime).
*   **Crypto**: `Aes-Gcm` (Pure Rust implementation).
*   **JWT**: `Jsonwebtoken` crate.
*   **Rate Limiting**: `Governor` crate.

---

## 5. Development Setup

### Prerequisites
*   Rust 1.75+
*   Cargo

### Running the Gateway
```bash
cd rust-shield
cargo run
```
The gateway will listen on port **8090** (proxies to backend on 8000).
