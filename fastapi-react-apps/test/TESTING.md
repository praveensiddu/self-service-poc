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
backend/tests/          # Backend E2E tests (pytest)
  ├── README.md         # Backend test documentation
  ├── pytest.ini        # Pytest configuration
  ├── conftest.py
  └── e2e/
      ├── test_api_clusters.py
      └── test_api_apps.py

frontend/e2e/           # Frontend E2E tests (Playwright)
  ├── README.md         # Frontend test documentation
  └── tests/
      ├── clusters.spec.js
      ├── clusters-enhanced.spec.js
      ├── apps.spec.js
      └── navigation.spec.js
```

## Detailed Documentation

- **Backend Tests**: See [backend/tests/README.md](../backend/tests/README.md)
- **Frontend Tests**: See [frontend/e2e/README.md](../frontend/e2e/README.md)

## Prerequisites

- **Server running**: http://localhost:8888
- **Backend**: Python 3.8+, pytest, httpx
- **Frontend**: Node.js 16+, Playwright

## Common Commands

### Backend
```bash
cd backend
source venv/bin/activate
pytest tests/e2e/ -v
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
lsof -ti:8000 | xargs kill -9
```

## CI/CD

GitHub Actions workflow included: `.github/workflows/e2e-tests.yml`

## Adding New Tests

1. Write test in appropriate directory
2. Add `data-testid` to UI elements (frontend)
3. Run `./run-e2e-tests.sh` to verify
4. Update local README.md in test directory

---

**Total Coverage**: 45+ test cases (15+ backend, 30+ frontend)
