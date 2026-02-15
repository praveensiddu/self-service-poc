# Testing Guide

This project includes end-to-end (E2E) tests for both backend API and frontend UI.

## Quick Start

### 1. Setup (First Time)
```bash
./setup-e2e-tests.sh
```

### 2. Start Server
```bash
./start.sh
```

### 3. Run Tests
```bash
./run-e2e-tests.sh          # All tests
./run-e2e-tests.sh backend  # Backend only
./run-e2e-tests.sh frontend # Frontend only
```

## Test Structure

```
backend/tests/              # Backend E2E and unit tests (pytest)
  ├── README.md             # Backend test documentation
  ├── pytest.ini            # Pytest configuration
  ├── conftest.py           # Shared fixtures and helpers
  ├── requirements-test.txt # Test dependencies
  ├── e2e/                  # End-to-end tests (requires running server)
  │   ├── test_api_system.py           # System endpoints
  │   ├── test_api_users.py            # User endpoints
  │   ├── test_api_clusters.py         # Cluster management
  │   ├── test_api_apps.py             # Application management
  │   ├── test_api_namespaces.py       # Namespace management
  │   ├── test_api_pull_requests.py    # Pull request endpoints
  │   ├── test_api_access_requests.py  # Access request endpoints
  │   ├── test_api_role_management.py  # Role management endpoints
  │   └── test_rbac_permissions.py     # RBAC permission tests
  └── unit/                 # Unit tests (no server required)
      └── test_rbac.py      # RBAC logic unit tests

frontend/e2e/           # Frontend E2E tests (Playwright)
  ├── README.md         # Frontend test documentation
  └── tests/
      ├── clusters.spec.js
      ├── clusters-enhanced.spec.js
      ├── apps.spec.js
      └── navigation.spec.js
```

## RBAC Test Coverage

The RBAC tests verify permissions for different user roles:

| Role | Scope | Permissions |
|------|-------|-------------|
| `platform_admin` | Global | Full CRUD on all resources |
| `role_mgmt_admin` | Global | Manage roles, view access requests |
| `viewall` | Global | Read-only on all resources |
| `manager` | Per-App | Full CRUD on assigned apps |
| `viewer` | Per-App | Read-only on assigned apps |

Run RBAC tests:
```bash
# E2E RBAC tests (requires running server)
pytest tests/e2e/test_rbac_permissions.py -v

# Unit RBAC tests (no server required)
pytest tests/unit/test_rbac.py -v
```

## Detailed Documentation

- **Backend Tests**: See [backend/tests/README.md](../backend/tests/README.md)
- **Frontend Tests**: See [frontend/e2e/README.md](../frontend/e2e/README.md)

## Prerequisites

- **Server running**: http://localhost:8888
- **Backend**: Python 3.8+, pytest, pytest-asyncio, httpx
- **Frontend**: Node.js 16+, Playwright

## Common Commands

### Backend
```bash
cd backend
source venv/bin/activate
pip install -r tests/requirements-test.txt

# Run all tests
pytest tests/ -v

# Run E2E tests only
pytest tests/e2e/ -v

# Run unit tests only
pytest tests/unit/ -v

# Run specific test module
pytest tests/e2e/test_api_apps.py -v

# Run with coverage
pytest tests/ --cov=backend --cov-report=html
```

### Frontend
```bash
cd frontend/e2e
npm run test:e2e              # Run tests
npm run test:e2e:ui           # Interactive mode
npm run test:e2e:headed       # Watch browser
npx playwright show-report    # View report
```

## Troubleshooting

**Server not running:**
```bash
./start.sh
```

**Dependencies missing:**
```bash
./setup-e2e-tests.sh
```

**Port in use:**
```bash
lsof -ti:8888 | xargs kill -9
```

## CI/CD

GitHub Actions workflow included: `.github/workflows/e2e-tests.yml`

## Adding New Tests

1. Write test in appropriate directory following naming convention `test_*.py`
2. Use async/await patterns with httpx for HTTP requests
3. Add `data-testid` to UI elements (frontend)
4. Run `./run-e2e-tests.sh` to verify
5. Update local README.md in test directory

---

**Total Coverage**: 130+ test cases (98 backend, 30+ frontend)
