# 📊 Key Metrics to Monitor

This document outlines the Critical Performance Indicators (CPIs) and Key Performance Indicators (KPIs) defining the health and success of the Land Records System.

## 🏥 System Health (Infrastructure)

| Metric | Target | Description |
| :--- | :--- | :--- |
| **API Gateway Uptime** | `> 99.5%` | Availability of the Nginx/FastAPI entry points. |
| **Database Response** | `< 100ms` | 95th percentile query latency for PostgreSQL. |
| **Redis Hit Rate** | `> 95%` | Effectiveness of caching tiers. |
| **Search Latency** | `< 50ms` | Elasticsearch/Postgres Full-text search performance. |

## 🚀 Application Metrics (Performance)

| Metric | Target | Description |
| :--- | :--- | :--- |
| **Records Processed** | `50K+ / day` | Throughput of digitizing land records. |
| **OCR Accuracy** | `> 95%` | Character-level accuracy vs Ground Truth. |
| **Manual Review Rate** | `< 10%` | Percentage of docs requiring human intervention. |
| **Transfer Time** | `< 5 days` | End-to-end time for Property Transfer (Mutation). |
| **Dispute Resolution** | `< 30 days` | Avg time to close a dispute case. |

## 💼 Business Metrics (Impact)

| Metric | Type | Description |
| :--- | :--- | :--- |
| **Farmer IDs Issued** | `Counter` | Total unique farmers registered in the system. |
| **PM-KISAN Enrolled** | `Gauge` | Active beneficiaries synced with central scheme. |
| **Benefits Disbursed** | `Sum` | Total financial value distributed via system data. |
| **Process Debt** | `Count` | Backlog of legacy files waiting for digitization. |
| **Litigation Drop** | `Percentage` | Reduction in court cases related to land disputes. |

## 🛡️ Security Metrics (Audit)

| Metric | Threshold | Alert Condition |
| :--- | :--- | :--- |
| **Failed Logins** | `Anomaly` | Spike > 10 failures / minute triggers warning. |
| **Rate Limit Hits** | `< 1%` | High 429 errors indicate scraping/DDoS attempt. |
| **Encryption Failures**| `0` | Any decryption error is a CRITICAL incident. |
| **Audit Log Volume** | `Daily Scan` | Sudden drops/spikes indicate logging failure. |
