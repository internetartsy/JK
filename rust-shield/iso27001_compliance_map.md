# ISO/IEC 27001 & 27002 Compliance Map for Rust GeoShield Gateway

## Overview
This document maps implemented security controls in the Rust Gateway to ISO/IEC 27001:2013 and ISO/IEC 27002:2022 standards.

## 1. Access Control (ISO 27002: 5.15, 9.1)
**Requirements**: Limit access to information and information processing facilities; ensure user access is authorized.

**Implementation**:
- **Authentication Middleware** (`middleware/auth.rs`): Enforces Bearer token presence on all API routes (`/api/v1/*`, `/app/*`).
- **Two-Factor Authentication (2FA)**:
    - **Control**: 2FA/OTP enforced for privileged roles (`officer`, `admin`) via Keycloak.
    - **Configuration**: Keycloak realm (`realm-export.json`) updated with `requiredActions: ["CONFIGURE_TOTP"]`.

## 2. Information Security Aspects of Business Continuity (ISO 27002: 5.30) / Availability
**Requirements**: Ensure availability of information processing facilities.

**Implementation**:
- **Rate Limiting** (`middleware/ratelimit.rs`):
    - Protects against Denial of Service (DoS) attacks.
    - Quota: 20 req/sec (burst 50).
    - Ensures service availability for legitimate users.

## 3. Logging and Monitoring (ISO 27002: 8.15 - Logging)
**Requirements**: Produce, store, and protect logs recording user activities, exceptions, faults, and information security events.

**Implementation**:
- **Audit Logging** (`middleware/audit.rs`):
    - Logs every request.
    - **Fields**: Method, Path, Status Code, Duration, Client IP, **User ID (sub)**.
    - **Format**: Structured JSON for easy ingestion by SIEM/Log Aggregation tools (e.g., Loki/ELK).
    - **Traceability**: User identity is extracted from JWT token claims to link actions to specific users.

## 4. Cryptography (ISO 27002: 8.24)
**Requirements**: Use of cryptography to protect the confidentiality, authenticity, and integrity of information.

**Implementation**:
- **Transport Security**:
    - **HSTS Header**: `Strict-Transport-Security` header enforced in `middleware/headers.rs` (max-age=31536000; includeSubDomains).
    - Forces clients to use HTTPS.
- **Payload Encryption** (Planned): AES-256 GCM logic placeholder.

## 5. Web Application Security (ISO 27002: 8.28 - Secure Coding)
**Requirements**: Secure coding principles applied.

**Implementation**:
- **Security Headers** (`middleware/headers.rs`):
    - `X-Content-Type-Options: nosniff` (Prevent MIME sniffing).
    - `X-Frame-Options: DENY` (Prevent Clickjacking).
    - `Content-Security-Policy`: Restricts script/style sources (XSS mitigation).
    - `Referrer-Policy: strict-origin-when-cross-origin` (Privacy).
- **Type Safety**: Rust implementation prevents Memory Safety vulnerabilities (Buffer Overflows, etc.).

## 6. Network Security (ISO 27002: 8.20)
**Requirements**: Security of network services.

**Implementation**:
- **Gateway Pattern**: All traffic routed through single ingress (Port 8090).
- **Filtering**: Invalid paths or unauthenticated requests rejected at edge.

---
**Verification Date**: 2025-12-12
**Status**: Compliant with designated controls.
