# Development Summary & Guide

**Last Updated:** December 7, 2025
**Status:** ✅ Project Structured & Documented

---

## 📂 Project Structure

The project has been reorganized for clarity. All documentation files are now centralized in `documentation/`.

```
/
├── backend/                # FastAPI Application
│   ├── app/                # Application Source
│   ├── tests/              # Pytest Suite
│   └── Dockerfile          # Python Service Build
│
├── frontend/               # React + Vite Application
│   ├── src/                # Frontend Source
│   └── vite.config.ts      # Build Configuration
│
├── mobile/                 # React Native (Expo) Application
│   ├── src/                # Mobile Source
│   ├── ios/                # Native iOS Bridge
│   └── app.json            # Expo Configuration
│
├── documentation/          # 📘 CENTRALIZED DOCS
│   ├── Executive_Summary/  # High-level System Health
│   ├── Architecture_Stack/ # Deep Technical Specs (OCR, Sync, Maps)
│   ├── System_Status/      # Build Guides & Quickstarts
│   └── Testing_Reports/    # Test Results & Logs
│
├── frappe_docker/          # Frappe Service Configuration
├── config/                 # Service Configurations (Keycloak, etc.)
├── monitoring/             # Prometheus/Grafana Configs
└── docker-compose.yml      # Orchestration
```

---

## 🛠️ Quality Assurance: Pre-commit Hooks

To ensure code quality and prevent "unable to order file" issues or formatting messiness, we have installed **pre-commit hooks**.

### 1. Installation

```bash
# Install pre-commit (if not already installed)
pip install pre-commit

# Install the git hooks for this repo
pre-commit install
```

### 2. Configuration (`.pre-commit-config.yaml`)

The following checks run automatically on every `git commit`:

| Hook ID | Description |
|---------|-------------|
| `trailing-whitespace` | Removes trailing spaces. |
| `end-of-file-fixer` | Ensures files end with a newline. |
| `check-yaml` | Validates YAML syntax. |
| `check-json` | Validates JSON syntax. |
| `check-added-large-files` | Prevents committing files > 1000KB (avoids bloating repo). |
| `black` | Python code formatter (Backend). |
| `prettier` | JS/TS code formatter (Frontend/Mobile). |

### 3. Usage

Run against all files manually to normalize the codebase:
```bash
pre-commit run --all-files
```

---

## ⚡ Quick Links

- **[System Health Check](documentation/Executive_Summary/SYSTEM_HEALTH.md)**
- **[Architecture Deep Dive](documentation/Architecture_Stack/OCR_ARCHITECTURE.md)**
- **[Mobile Build Guide](documentation/System_Status/EAS_BUILD_GUIDE.md)**
- **[Test Results](documentation/Testing_Reports/TEST_RESULTS.md)**

---

## 📝 Recent Development Updates

1.  **Farmer Stats Endpoint**: Implemented in Backend (`/api/v1/parcels/stats/farmers`) and connected to Frontend.
2.  **Mobile Auth**: Fixed OAuth redirect loop for Expo Go.
3.  **Documentation Cleanup**: Consolidated 15+ scattered files into `documentation/` structure.
4.  **Security**: Added `fix-react2shell-next` scan (Result: Clean).

---

**Next Steps:**
- Run `pre-commit run --all-files` to format the entire codebase.
- Push changes to GitHub.
