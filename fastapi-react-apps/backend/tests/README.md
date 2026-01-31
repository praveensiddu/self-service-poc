# Backend E2E Tests

## Overview
End-to-end tests for the FastAPI backend API endpoints using pytest and httpx.

## Requirements
- Python 3.8+
- Dependencies in `requirements-test.txt`

## Installation
```bash
cd backend
source venv/bin/activate
pip install -r requirements-test.txt
```
```

## Running Tests
```bash
# From backend directory
pytest tests/e2e/ -v

# From tests directory (uses pytest.ini in this folder)
cd tests
pytest e2e/ -v

# Run specific test file
pytest tests/e2e/test_api_clusters.py -v

# Run with coverage
pytest tests/e2e/ --cov=backend --cov-report=html
```

## Test Files
- `pytest.ini` - Pytest configuration (co-located with tests)
- `conftest.py` - Shared fixtures and configuration
- `requirements-test.txt` - Test dependencies (in this tests directory)
- `e2e/test_api_clusters.py` - Tests for clusters API endpoints
- `e2e/test_api_apps.py` - Tests for apps API endpoints

## Test Coverage
- ✅ GET /api/clusters
- ✅ POST /api/clusters
- ✅ DELETE /api/clusters/{clustername}
- ✅ GET /api/apps
- ✅ POST /api/apps
- ✅ DELETE /api/apps/{appname}
- ✅ GET /api/apps/{appname}/namespaces
- ✅ GET /api/apps/{appname}/pull_requests
- ✅ GET /api/apps/{appname}/egress_ips
- ✅ GET /api/apps/{appname}/l4_ingress
- ✅ GET /api/config
- ✅ GET /api/envlist
- ✅ GET /api/deployment_type
- ✅ GET /api/current-user

## Prerequisites
- Backend server must be running on http://localhost:8888
- Start server: `uvicorn backend.main:app --reload`

## Notes
- Tests use async/await patterns with httpx
- Tests handle cases where backend is not initialized
- Clean up test data after test runs

```
pytest tests/e2e/ --cov=backend --cov-report=html
# Run with coverage

pytest tests/e2e/test_api_clusters.py -v
# Run specific test file

pytest tests/e2e/ -v
# From backend directory
```bash
## Running Tests

```
pip install -r requirements-dev.txt
source venv/bin/activate
cd backend
```bash
## Installation

- Dependencies in `requirements-dev.txt`
- Python 3.8+
## Requirements

End-to-end tests for the FastAPI backend API endpoints using pytest and httpx.
## Overview

