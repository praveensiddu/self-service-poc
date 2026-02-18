# Backend E2E Tests

## Overview
End-to-end tests for the FastAPI backend API endpoints using pytest and httpx.

**Total Tests: 171** (102 E2E + 69 Unit)

## Requirements
- Python 3.8+
- Dependencies in `requirements-test.txt`

## Installation
```bash
cd backend
source venv/bin/activate
pip install -r tests/requirements-test.txt
```

## Running Tests
```bash
# From backend directory
pytest tests/ -v                    # All tests (167 tests)
pytest tests/e2e/ -v                # E2E tests only (98 tests)
pytest tests/unit/ -v               # Unit tests only (69 tests)

# From tests directory (uses pytest.ini in this folder)
cd tests
pytest e2e/ -v

# Run specific test file
pytest tests/e2e/test_api_clusters.py -v

# Run specific test class
pytest tests/e2e/test_api_apps.py::TestAppsE2E -v

# Run RBAC tests only
pytest tests/e2e/test_rbac_permissions.py -v
pytest tests/unit/test_rbac.py -v

# Run with coverage
pytest tests/ --cov=backend --cov-report=html

# Run with verbose output and print statements
pytest tests/ -v -s
```

## Test Files
- `pytest.ini` - Pytest configuration (co-located with tests)
- `conftest.py` - Shared fixtures, test helpers, and configuration
- `requirements-test.txt` - Test dependencies
- `cleanup_test_data.py` - Script to clean up test data after tests

### E2E Test Modules
| File | Description |
|------|-------------|
| `e2e/test_api_system.py` | System endpoints (config, envlist, deployment_type, portal-mode) |
| `e2e/test_api_users.py` | User endpoints (current-user, demo-users) |
| `e2e/test_api_clusters.py` | Cluster management endpoints |
| `e2e/test_api_apps.py` | Application management endpoints |
| `e2e/test_api_namespaces.py` | Namespace management and details endpoints |
| `e2e/test_api_pull_requests.py` | Pull request endpoints |
| `e2e/test_api_access_requests.py` | Access request endpoints |
| `e2e/test_api_role_management.py` | Role management endpoints |
| `e2e/test_rbac_permissions.py` | **RBAC permission tests for different user roles** |

### Unit Test Modules
| File | Description |
|------|-------------|
| `unit/test_rbac.py` | **Unit tests for RBAC permission logic (Casbin enforcer)** |

## RBAC Test Coverage

The RBAC tests verify permissions for different user roles:

### Global Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| `platform_admin` | Full platform access | All resources: CRUD |
| `role_mgmt_admin` | Role management | Manage roles, view access requests |
| `viewall` | Read-only global access | All resources: Read-only |

### Per-App Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| `manager` | App management | Assigned apps only: CRUD namespaces, L4 ingress |
| `viewer` | App viewer | Assigned apps only: Read-only |

> **Note:** Per-app roles (`manager`, `viewer`) only grant access to resources within the specific app they are assigned to. They do NOT grant access to global endpoints like `/clusters` or `/apps` listing without the app context. Users need a global role (`platform_admin`, `viewall`) for unrestricted access.

### Tests Cover
- ✅ Platform admin can create/update/delete apps, clusters, namespaces
- ✅ Role mgmt admin can manage roles but not create resources
- ✅ Viewall can read all resources but not modify
- ✅ App manager can manage their assigned apps only
- ✅ App viewer can only read their assigned apps
- ✅ Per-app roles don't grant access to global resources
- ✅ Users without roles are denied access
- ✅ Permission flags in API responses match user roles
- ✅ Protected endpoints require authorization
- ✅ Duplicate app access requests return 409 Conflict
- ✅ Different role/app combinations are not considered duplicates

## Test Coverage

### System Endpoints
- ✅ GET /api/v1/config
- ✅ GET /api/v1/envlist
- ✅ GET /api/v1/deployment_type
- ✅ GET /api/v1/portal-mode
- ✅ GET /api/v1/settings/enforcement
- ✅ GET /api/v1/catalog/role_refs
- ✅ GET /api/v1/requests/changes

### User Endpoints
- ✅ GET /api/v1/current-user
- ✅ PUT /api/v1/current-user
- ✅ GET /api/v1/demo-users

### Cluster Endpoints
- ✅ GET /api/v1/clusters
- ✅ GET /api/v1/clusters?env=...&app=...
- ✅ GET /api/v1/clusters/datacenters
- ✅ POST /api/v1/clusters
- ✅ GET /api/v1/clusters/{clustername}/can-delete
- ✅ DELETE /api/v1/clusters/{clustername}

### Application Endpoints
- ✅ GET /api/v1/apps
- ✅ POST /api/v1/apps
- ✅ PUT /api/v1/apps/{appname}
- ✅ DELETE /api/v1/apps/{appname}
- ✅ GET /api/v1/apps/{appname}/argocd
- ✅ GET /api/v1/apps/{appname}/l4_ingress
- ✅ GET /api/v1/apps/{appname}/egress_ips
- ✅ GET /api/v1/apps/{appname}/pull_requests

### Namespace Endpoints
- ✅ GET /api/v1/apps/{appname}/namespaces
- ✅ POST /api/v1/apps/{appname}/namespaces
- ✅ DELETE /api/v1/apps/{appname}/namespaces
- ✅ GET /api/v1/apps/{appname}/namespaces/{namespace}/nsargocd
- ✅ GET /api/v1/apps/{appname}/namespaces/{namespace}/resources/resourcequota
- ✅ GET /api/v1/apps/{appname}/namespaces/{namespace}/resources/limitrange
- ✅ GET /api/v1/apps/{appname}/namespaces/{namespace}/rolebinding_requests
- ✅ GET /api/v1/apps/{appname}/namespaces/{namespace}/egressfirewall

### Access Request Endpoints
- ✅ GET /api/v1/access_requests
- ✅ POST /api/v1/app_access
- ✅ POST /api/v1/app_access (duplicate detection - returns 409)
- ✅ POST /api/v1/global_access

### Role Management Endpoints
- ✅ GET /api/v1/role-management/rbac/refresh
- ✅ GET /api/v1/role-management/app
- ✅ POST /api/v1/role-management/app/assign
- ✅ POST /api/v1/role-management/app/unassign
- ✅ GET /api/v1/role-management/groupglobal
- ✅ POST /api/v1/role-management/groupglobal/assign
- ✅ GET /api/v1/role-management/userglobal
- ✅ POST /api/v1/role-management/userglobal/assign

## Prerequisites

### E2E Tests
- Backend server must be running on http://localhost:8888
- Start server: `./start.sh` or `uvicorn backend.main:app --reload --port 8888`

### Unit Tests
- No running server required
- Tests the RBAC logic directly using Casbin

## Test Patterns

### Async/Await
All E2E tests use async/await patterns with httpx for non-blocking HTTP requests:
```python
async def test_example(self, async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/endpoint")
    assert response.status_code == 200
```

### Status Code Handling
Tests handle multiple valid status codes to account for different server states:
```python
# Accept multiple valid responses
assert response.status_code in [200, 400, 403]
```

### Conditional Validation
Tests validate response structure only when request succeeds:
```python
if response.status_code == 200:
    data = response.json()
    assert "expected_field" in data
```

### Test Data Helpers
Use `test_data_helper` fixture for managing test data with automatic cleanup:
```python
async def test_with_data(self, test_data_helper):
    await test_data_helper.create_test_app("my-test-app")
    # Test logic here
    # Cleanup happens automatically
```

### Session-Scoped Test Data
The test suite automatically creates a test app and namespace at the start of the session:
- **test_app_setup**: Creates `e2e-test-app` in `dev` environment
- **test_namespace_setup**: Creates `e2e-test-ns` namespace in the test app
- **test_env**: Returns `"dev"` environment string

These fixtures ensure all tests have data to work with and no tests are skipped:
```python
async def test_with_app(
    self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
):
    appname = test_app_setup  # "e2e-test-app"
    response = await async_client.get(
        f"/api/v1/apps/{appname}/namespaces",
        params={"env": test_env}
    )
    assert response.status_code == 200
```

### RBAC Unit Testing
Unit tests use predefined user contexts to test permission logic:
```python
PLATFORM_ADMIN = make_user_context(
    username="admin",
    roles=["platform_admin"],
)

def test_admin_can_create_apps(self, enforcer):
    result = enforcer.enforce(PLATFORM_ADMIN, "/apps", "POST", {"id": ""})
    assert result is True
```

## Notes
- Tests use async/await patterns with httpx
- Tests handle cases where backend is not initialized
- Test data (`e2e-test-app`) is automatically cleaned up after tests
- Tests use `usr_platform_admin` user for creating test data
- Tests respect RBAC permissions (some tests may return 403)
- Unit tests can run without a server (test RBAC logic directly)

## Cleanup

Test data is automatically cleaned up via:
1. **pytest_sessionfinish hook** - Runs after all tests complete
2. **atexit handler** - Runs when Python exits
3. **run-e2e-tests.sh script** - Runs `cleanup_test_data.py` after tests

To manually clean up test data:
```bash
python tests/cleanup_test_data.py
```

