# AI Coding Guide - Kubernetes Self-Service Tool

> **Pre-Prompt for AI Tools**: Use this document to understand the codebase structure and coding standards before implementing any changes.

## ⚠️ Important Instructions for AI Tools

1. **DO NOT generate markdown summary files** after completing tasks
2. **DO NOT run tests or verify functionality** - the user will test manually and ask if needed
3. **DO NOT ask for confirmation** before making changes - just implement them
4. **Focus on code changes only** - no documentation generation unless explicitly requested

---

## Project Overview

A FastAPI backend + vanilla JS frontend for Kubernetes self-service provisioning. The backend manages applications, namespaces, and cluster configurations through YAML files.

## Architecture Pattern

```
Routers (API Layer) → Services (Business Logic) → Repositories (Data Access) → YAML Files
```

**Key Principle**: Separation of concerns. Each layer has a single responsibility.

---

## Directory Structure

```
backend/
├── main.py              # FastAPI app initialization, middleware, router registration
├── dependencies.py      # Shared FastAPI dependencies (require_env, get_current_user)
├── routers/             # API endpoints - thin, delegates to services
├── services/            # Business logic - orchestrates repositories
├── repositories/        # Data access - YAML file operations
├── models/              # Pydantic models for request/response validation
├── exceptions/          # Custom exceptions + handlers
├── middleware/          # Request logging, read-only mode
├── auth/                # RBAC with Casbin
├── config/              # Settings, logging configuration
└── utils/               # Validators, YAML utilities, workspace helpers
```

---

## Coding Standards

### 1. Router Endpoints (`routers/*.py`)

```python
from fastapi import APIRouter, HTTPException, Depends, Request
from backend.dependencies import require_env
from backend.models import YourRequestModel, YourResponseModel
from backend.services.your_service import YourService
from backend.auth.rbac import require_rbac, get_current_user_context

router = APIRouter(tags=["your-tag"])

# Dependency injection factory
def get_service() -> YourService:
    """Dependency injection for YourService."""
    return YourService()

@router.get("/resource", response_model=YourResponseModel)
def get_resource(
    request: Request,
    env: Optional[str] = None,
    service: YourService = Depends(get_service),
    user_context: Dict[str, Any] = Depends(get_current_user_context)
):
    """Docstring describing the endpoint.
    
    Args:
        env: Environment name (dev, qa, prd)
    
    Returns:
        Description of return value
    """
    env = require_env(env)  # Always validate env parameter
    return service.do_something(env)
```

**Rules**:
- Use `require_env(env)` for environment validation
- Use `Depends()` for dependency injection
- Use `require_rbac()` for protected endpoints
- Keep routers thin - delegate logic to services
- Always use type hints and response_model

### 2. Services (`services/*.py`)

```python
"""Service description - what business domain it handles."""

from typing import Dict, Any, List
from pathlib import Path
import logging

from backend.repositories.your_repository import YourRepository
from backend.exceptions.custom import (
    NotFoundError,
    AlreadyExistsError,
    ValidationError,
    AppError,
)

logger = logging.getLogger("uvicorn.error")

class YourService:
    """Service for business logic description."""
    
    def __init__(self):
        self.repo = YourRepository()
    
    def your_method(self, env: str, param: str) -> Dict[str, Any]:
        """Method description.
        
        Args:
            env: Environment name
            param: Parameter description
            
        Returns:
            Description of return value
            
        Raises:
            NotFoundError: If resource not found
            ValidationError: If input validation fails
        """
        # Validate input
        if not param:
            raise ValidationError("param", "is required")
        
        # Business logic here
        data = self.repo.read_data(env, param)
        # Apply business rules
        return processed_data
```

**Rules**:
- Services contain business logic only
- Use repositories for data access
- **Raise custom domain exceptions** (NOT HTTPException)
- Log errors with `logger.error()` and `exc_info=True` before raising exceptions
- Let exception handlers convert to HTTP responses

### 3. Repositories (`repositories/*.py`)

```python
"""Repository description - what data it manages."""

from pathlib import Path
from typing import Dict, Any, Optional
import logging

from backend.dependencies import get_requests_root
from backend.utils.yaml_utils import read_yaml_dict, write_yaml_dict
from backend.exceptions.custom import NotFoundError, AlreadyExistsError

logger = logging.getLogger("uvicorn.error")

class YourRepository:
    """Repository for data access operations."""
    
    @staticmethod
    def get_path(env: str, name: str) -> Path:
        """Get path to resource.
        
        Args:
            env: Environment name
            name: Resource name
            
        Returns:
            Path to resource
            
        Raises:
            NotFoundError: If resource doesn't exist
        """
        requests_root = get_requests_root()
        path = requests_root / env / name
        if not path.exists():
            logger.warning("Resource not found: %s/%s", env, name)
            raise NotFoundError("Resource", f"{env}/{name}")
        return path
```

**Rules**:
- Repositories handle YAML file I/O only
- Use `read_yaml_dict()` and `write_yaml_dict()` from utils
- Use `@staticmethod` for stateless methods
- **Raise custom domain exceptions** (NOT HTTPException)
- Log warnings before raising exceptions
- Always validate paths exist before operations

### 4. Pydantic Models (`models/*.py`)

```python
"""Model domain description."""

from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict

class YourCreateRequest(BaseModel):
    """Request model for creating resource."""
    name: str
    description: Optional[str] = ""
    items: List[str] = []

class YourResponse(BaseModel):
    """Response model for resource."""
    name: str
    description: str = ""
    created: bool = False
```

**Rules**:
- Use `Optional[type] = default` for optional fields
- Separate Request/Response models
- Export all models in `models/__init__.py`

### 5. Custom Exceptions (`exceptions/custom.py`)

**Available Exceptions:**
```python
from backend.exceptions.custom import (
    AppError,             # 500 - Generic application error (base class)
    NotFoundError,        # 404 - Resource not found
    AlreadyExistsError,   # 409 - Resource already exists
    ValidationError,      # 400 - Invalid input
    NotInitializedError,  # 400 - Workspace/component not initialized
    ResourceInUseError,   # 409 - Resource is in use, cannot delete
    ConfigurationError,   # 500 - Configuration issues
    ExternalServiceError, # 502 - External service (GitHub, etc.) error
    IpAllocationError,    # 400 - IP allocation failed
    ReadOnlyModeError,    # 403 - Operation blocked in read-only mode
)
```

**Usage in Services/Repositories:**
```python
# Always log before raising exceptions for developer tracking
logger.warning("Namespace not found: %s/%s", env, namespace_name)
raise NotFoundError("Namespace", namespace_name)

logger.warning("Application already exists: %s", app_name)
raise AlreadyExistsError("Application", app_name)

logger.warning("Invalid field value for 'name': %s", value)
raise ValidationError("name", "must be lowercase alphanumeric")

logger.error("Failed to create resource: %s", error, exc_info=True)
raise AppError(f"Failed to create resource: {error}")
```

**Exception Handling Flow:**
```
Service/Repository raises custom exception
         ↓
Exception bubbles up to FastAPI
         ↓
Exception handler (handlers.py) catches it
         ↓
Handler logs with context (path, details)
         ↓
Handler returns JSONResponse with proper HTTP status
```

**Key Principle**: Services and repositories should NOT use HTTPException. 
Use domain-specific custom exceptions - the exception handlers convert them to HTTP responses.

---

## Common Patterns

### Environment Parameter
```python
env = require_env(env)  # Validates and normalizes to lowercase
```

### Workspace Paths
```python
from backend.dependencies import get_requests_root
requests_root = get_requests_root()  # Raises NotInitializedError if not initialized
app_dir = requests_root / env / appname
```

### YAML Operations
```python
from backend.utils.yaml_utils import read_yaml_dict, write_yaml_dict

data = read_yaml_dict(path)  # Returns {} if file doesn't exist
write_yaml_dict(path, data)  # Creates/overwrites file
```

### RBAC Protection
```python
# Simple protection
_: None = Depends(require_rbac(obj="/apps", act="POST"))

# Dynamic path protection
_: None = Depends(require_rbac(
    obj=lambda r: r.url.path,
    act=lambda r: r.method,
    app_id=lambda r: r.path_params.get("appname", "")
))
```

### Logging
```python
import logging
logger = logging.getLogger("uvicorn.error")

logger.info("Action completed: %s", variable)
logger.error("Failed operation: %s", error, exc_info=True)
```

---

## DO's and DON'Ts

### ✅ DO
- Use type hints everywhere
- Write docstrings with Args/Returns/Raises
- Use dependency injection via `Depends()`
- Validate input with Pydantic models
- Use existing utilities from `utils/`
- Follow the Router → Service → Repository pattern
- Export new models/services in `__init__.py`
- **Use custom exceptions** from `exceptions/custom.py`
- **Log before raising exceptions** for developer tracking

### ❌ DON'T
- Put business logic in routers
- Access files directly in services (use repositories)
- Use `print()` - use `logger` instead
- Catch generic `Exception` without re-raising or logging
- **Use HTTPException in services or repositories** - use custom exceptions instead
- Skip type hints or docstrings

---

## Adding New Features Checklist

1. **Model**: Define Pydantic request/response models in `models/`
2. **Repository**: Add data access methods if new file operations needed
3. **Service**: Implement business logic
4. **Router**: Create thin endpoint that delegates to service
5. **Register**: Add router to `main.py` with appropriate prefix/tags
6. **Export**: Update `__init__.py` files for new classes

---

## File Naming Convention

### Backend
- Routers: `{domain}.py` or `{domain}_{feature}.py` (e.g., `apps.py`, `ns_resourcequota.py`)
- Services: `{domain}_service.py`
- Repositories: `{domain}_repository.py`
- Models: `{domain}.py`

### Frontend
- Features: `{Feature}.container.js` + `{Feature}.view.js`
- Services: `{domain}Service.js`
- Hooks: `use{Feature}.js`
- Shared components: `{ComponentName}.js`

---

## Frontend Architecture (Vanilla JS + React via CDN)

### Directory Structure

```
frontend/
├── index.html           # Single-page app entry point
├── css/
│   └── styles.css       # CSS variables, components, utilities
└── js/
    ├── app/
    │   ├── services/    # API calls - fetch wrappers
    │   ├── hooks/       # React hooks for state management
    │   ├── utils/       # Helper functions
    │   └── containers/  # Smart components (if any)
    ├── features/        # Feature-specific components
    │   ├── apps/        # Apps feature (container + view)
    │   ├── namespaces/  # Namespaces feature
    │   └── clusters/    # Clusters feature
    └── shared/
        ├── components/  # Reusable UI components
        └── hooks/       # Shared hooks (useTableFilter, useSelection)
```

### Pattern: Container + View Separation

```
Container (Logic)  →  View (Presentation)
```

**Container** (`*.container.js`): Manages state, API calls, event handlers
**View** (`*.view.js`): Pure rendering, receives all data via props

---

### 1. Service Files (`app/services/*.js`)

```javascript
/**
 * Service description - what API domain it handles.
 */

/**
 * Load resources from API.
 * @param {string} env - Environment name
 * @returns {Promise<Object>} - Response data
 */
async function loadResources(env) {
  if (!env) throw new Error("Environment is required.");
  return await fetchJson(`/api/v1/resources?env=${encodeURIComponent(env)}`);
}

/**
 * Create a resource.
 * @param {string} env - Environment name
 * @param {{name: string, description?: string}} payload
 * @returns {Promise<Object>} - Created resource
 */
async function createResource(env, payload) {
  const name = safeTrim(payload?.name);
  if (!name) throw new Error("Name is required.");
  if (!env) throw new Error("Environment is required.");

  return await postJson(`/api/v1/resources?env=${encodeURIComponent(env)}`, {
    name,
    description: safeTrim(payload?.description),
  });
}
```

**Rules**:
- Validate inputs before API call
- Use `safeTrim()` for string parameters
- Use `encodeURIComponent()` for URL parameters
- Use global helpers: `fetchJson`, `postJson`, `putJson`, `deleteJson`
- Return plain data; let hooks handle state updates

### 2. Hooks (`app/hooks/use*.js`)

```javascript
/**
 * useResources Hook - Manages resources state and operations.
 *
 * This hook provides:
 * - Resources list state
 * - CRUD operations
 * - Loading/error handling
 */

function useResources({ activeEnv, setLoading, setError, setShowErrorModal }) {
  const { handlePermissionError } = useAuthorization();
  
  const [resources, setResources] = React.useState({});
  const [selectedResources, setSelectedResources] = React.useState(() => new Set());

  /**
   * Load resources for environment.
   * @returns {Promise<Object>} - Resources data
   */
  const loadResourcesData = React.useCallback(async () => {
    if (!activeEnv) return {};
    
    const resp = await loadResources(activeEnv);
    setResources(resp || {});
    setSelectedResources(new Set());
    return resp || {};
  }, [activeEnv]);

  /**
   * Create a resource.
   * @param {{name: string}} payload
   */
  const createResource = React.useCallback(async (payload) => {
    try {
      setLoading(true);
      setError("");
      await createResourceApi(activeEnv, payload);
      
      // Refresh list
      await loadResourcesData();
    } catch (e) {
      handlePermissionError(e, "create", "resources", null, setError, setShowErrorModal);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [activeEnv, setLoading, setError, setShowErrorModal, loadResourcesData]);

  return {
    resources,
    selectedResources,
    setSelectedResources,
    loadResourcesData,
    createResource,
  };
}
```

**Rules**:
- Use `React.useState` for state
- Use `React.useCallback` for functions passed to children
- Use `React.useMemo` for expensive computations
- Handle errors with `handlePermissionError` from `useAuthorization`
- Always set loading state in try/finally

### 3. Container Components (`features/*/*.container.js`)

```javascript
function ResourcesTable({
  rows,
  env,
  selectedResources,
  onToggleRow,
  onSelectAll,
  onDeleteResource,
  onCreateResource,
  readonly,
}) {
  const { extractPermissions } = useAuthorization();

  // Add permissions to rows
  const rowsWithPermissions = React.useMemo(() => {
    return rows.map(row => ({
      ...row,
      permissions: extractPermissions(row),
    }));
  }, [rows, extractPermissions]);

  // Table filtering
  const { sortedRows, filters, setFilters } = useTableFilter({
    rows: rowsWithPermissions,
    initialFilters: { name: "", status: "" },
    fieldMapping: (row) => ({
      name: safeTrim(row?.name),
      status: safeTrim(row?.status),
    }),
    sortBy: (a, b) => safeTrim(a?.name).localeCompare(safeTrim(b?.name)),
  });

  // Modal state
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const canSubmitCreate = React.useMemo(() => {
    return isNonEmptyString(newName);
  }, [newName]);

  // Pass everything to View
  return (
    <ResourcesTableView
      filteredRows={sortedRows}
      filters={filters}
      setFilters={setFilters}
      // ... all other props
    />
  );
}
```

**Rules**:
- Container handles: state, filtering, validation, API callbacks
- Use `useTableFilter` for table filtering/sorting
- Use `useAuthorization` for permission extraction
- Pass all data and handlers to View component

### 4. View Components (`features/*/*.view.js`)

```javascript
function ResourcesTableView({
  filteredRows,
  filters,
  setFilters,
  onCreateResource,
  onDeleteResource,
  readonly,
  // ... all other props
}) {
  return (
    <div className="card">
      {/* Filter inputs */}
      <div className="filters">
        <input
          value={filters.name}
          onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Filter by name..."
          data-testid="filter-name"
        />
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>
                {row.permissions?.canManage && !readonly && (
                  <button onClick={() => onDeleteResource(row.name)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Rules**:
- View is pure rendering - no state management
- Check `permissions.canManage` and `readonly` before showing actions
- Use `data-testid` for testable elements
- Use CSS classes from `styles.css` (`.card`, `.btn`, etc.)

### 5. Shared Components (`shared/components/*.js`)

```javascript
/**
 * ConfirmationModal Component
 *
 * Reusable confirmation dialog.
 */
function ConfirmationModal({
  show,
  onClose,
  onConfirm,
  title,
  message,
  items = [],
  confirmText = "Yes, Continue",
  cancelText = "Cancel",
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="card modal-content">
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        {items.length > 0 && (
          <ul>
            {items.map((item, idx) => <li key={idx}><strong>{item}</strong></li>)}
          </ul>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>{cancelText}</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
```

---

## Frontend Common Patterns

### API Calls (Global Helpers)
```javascript
// Available globally from index.html
await fetchJson(url);              // GET request
await postJson(url, data);         // POST request
await putJson(url, data);          // PUT request
await deleteJson(url);             // DELETE request
```

### String Utilities
```javascript
safeTrim(value);                   // Safe trim, returns "" for null/undefined
isNonEmptyString(value);           // Check if string is non-empty after trim
formatError(error);                // Format error for display
```

### Permission Checking
```javascript
const { extractPermissions, canView, canManage, handlePermissionError } = useAuthorization();

// In container
const permissions = extractPermissions(row);

// In view
{row.permissions?.canManage && !readonly && <button>Edit</button>}
```

### Table Filtering
```javascript
const { sortedRows, filters, setFilters } = useTableFilter({
  rows,
  initialFilters: { field1: "", field2: "" },
  fieldMapping: (row) => ({ field1: row.field1, field2: row.field2 }),
  sortBy: (a, b) => a.field1.localeCompare(b.field1),
});
```

---

## Frontend DO's and DON'Ts

### ✅ DO
- Separate Container (logic) from View (rendering)
- Use `React.useCallback` for handlers passed to children
- Use `React.useMemo` for computed values
- Check `readonly` and `permissions` before showing actions
- Use `data-testid` attributes for testable elements
- Use CSS variables from `:root` in styles.css
- Validate inputs in service functions before API calls

### ❌ DON'T
- Put API calls directly in View components
- Use `useState` in View components (use Container)
- Hardcode colors - use CSS variables
- Skip permission checks on action buttons
- Use `console.log` - use proper error handling
- Create inline styles for reusable patterns - add to CSS

---

## Quick Reference

### Backend

| Need | Import From |
|------|-------------|
| Environment validation | `backend.dependencies.require_env` |
| Workspace paths | `backend.dependencies.get_requests_root` |
| Current user | `backend.dependencies.get_current_user` |
| YAML read/write | `backend.utils.yaml_utils` |
| Validators | `backend.utils.validators` |
| Custom exceptions | `backend.exceptions.custom` |
| RBAC decorators | `backend.auth.rbac` |
| Logger | `logging.getLogger("uvicorn.error")` |

### Frontend

| Need | Location/Usage |
|------|----------------|
| API calls | Global: `fetchJson`, `postJson`, `putJson`, `deleteJson` |
| String utils | Global: `safeTrim`, `isNonEmptyString`, `formatError` |
| Table filtering | `useTableFilter` hook in `shared/hooks/` |
| Permissions | `useAuthorization` hook in `app/hooks/` |
| Modal dialogs | `ConfirmationModal`, `YamlPreviewModal` in `shared/components/` |
| CSS classes | `.card`, `.btn`, `.btn-danger`, `.topbar` in `css/styles.css` |

---

## API Endpoints Structure

All API endpoints use prefix `/api/v1`. Common patterns:

| Resource | Endpoint Pattern | Methods |
|----------|------------------|---------|
| Apps | `/api/v1/apps?env={env}` | GET, POST |
| App | `/api/v1/apps/{appname}?env={env}` | GET, PUT, DELETE |
| Namespaces | `/api/v1/apps/{appname}/namespaces?env={env}` | GET, POST |
| Namespace | `/api/v1/apps/{appname}/namespaces/{nsname}?env={env}` | GET, PUT, DELETE |
| Clusters | `/api/v1/clusters` | GET, POST |
| Cluster | `/api/v1/clusters/{clustername}` | GET, DELETE |

**Query Parameter**: `env` is required for most endpoints (dev/qa/prd)

---

## Error Handling Patterns

### Backend - Throw Custom Exceptions
```python
# In services - use custom exceptions
from backend.exceptions.custom import NotFoundError, ValidationError

raise NotFoundError("Namespace", namespace_name)  # → 404
raise ValidationError("name", "must be lowercase")  # → 400
```

### Frontend - Catch and Display
```javascript
try {
  await someApiCall();
} catch (e) {
  // e.status, e.body, e.message are available from apiClient.js
  if (e.status === 403) {
    handlePermissionError(e, "action", "resource", id, setError, setShowErrorModal);
  } else {
    setError(formatError(e));
    setShowErrorModal(true);
  }
}
```

---

## Frontend Script Loading Order

Scripts in `index.html` must load in this order (dependencies first):

1. **Services** (`apiClient.js` first) - API layer
2. **Utils** - Pure helper functions  
3. **Shared hooks** - `useFilters`, `useSelection`, `useTableFilter`
4. **App hooks** - `useAuthorization`, `useApps`, `useNamespaces`, etc.
5. **Shared components** - `ConfirmationModal`, `YamlPreviewModal`
6. **Feature hooks** - Feature-specific hooks
7. **Feature views** - Presentational components
8. **Feature containers** - Logic components
9. **App view** - Main app view
10. **App container** - Entry point (must be last)

**When adding new files**: Add script tag in correct section of `index.html`

---

## RBAC Roles Reference

| Role | Scope | Capabilities |
|------|-------|--------------|
| `platform_admin` | Global | Full access to all resources |
| `role_mgmt_admin` | Global | Manage roles and access requests |
| `viewall` | Global | Read-only access to all resources |
| `manager` | Per-app | Full access to specific app |
| `viewer` | Per-app | Read-only access to specific app |

---

## Common Pitfalls to Avoid

### Backend
1. **Forgetting to register router** in `main.py`
2. **Not exporting** new models in `models/__init__.py`
3. **Using HTTPException directly** instead of custom exceptions
4. **Missing `env` validation** - always use `require_env(env)`

### Frontend
1. **Adding script in wrong order** in `index.html`
2. **Forgetting permission checks** on action buttons
3. **Using `useState` in View components** - use Container
4. **Not using `React.useCallback`** for functions passed as props
5. **Missing `readonly` check** before showing edit/delete buttons

---

## Data Flow Summary

### Backend Request Flow
```
Request → Middleware (logging, readonly) → Router → RBAC Check → Service → Repository → YAML Files
```

### Frontend Data Flow
```
User Action → Container (handler) → Service (API call) → Hook (state update) → View (re-render)
```

### Permission Flow
```
Backend: get_current_user_context() → enforce_request() → Casbin Policy Check
Frontend: extractPermissions(row) → row.permissions.canManage → Show/Hide UI
```
