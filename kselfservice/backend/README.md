# 🚀 Backend API Documentation

## Overview

This is the **FastAPI backend** for the OpenShift Self-Service Platform. It provides a RESTful API for managing Kubernetes/OpenShift resources through a GitOps-driven workflow.

The backend implements a **layered architecture** with clear separation of concerns:
- **Routers**: Handle HTTP requests and responses
- **Services**: Implement business logic and orchestration
- **Repositories**: Manage data access and file I/O operations
- **Models**: Define data structures and validation schemas
- **Utilities**: Provide helper functions and common operations

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🏗️ Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────────┐
│           Routers (HTTP Layer)              │
│  ├─ apps.py                                 │
│  ├─ clusters.py                             │
│  ├─ namespaces.py                           │
│  └─ ... (other routers)                     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│       Services (Business Logic)             │
│  ├─ application_service.py                  │
│  ├─ cluster_service.py                      │
│  ├─ namespace_service.py                    │
│  ├─ namespace_details_service.py            │
│  └─ config_service.py                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      Repositories (Data Access)             │
│  ├─ application_repository.py               │
│  ├─ cluster_repository.py                   │
│  └─ namespace_repository.py                 │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│     File System / YAML Storage              │
│  ├─ Requests Repository                     │
│  ├─ Control Repository                      │
│  └─ Templates Repository                    │
└─────────────────────────────────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Dependency Injection**: Services depend on repositories, routers depend on services
3. **Repository Pattern**: All file I/O operations are abstracted in repositories
4. **Service Pattern**: Complex business logic is encapsulated in services
5. **Single Responsibility**: Each module handles one domain concept

---

## 📁 Project Structure

```
backend/
├── main.py                      # FastAPI application entry point
├── dependencies.py              # Dependency injection functions
├── requirements.txt             # Python dependencies
│
├── auth/                        # Authentication & authorization
│   └── providers/               # Auth provider implementations
│
├── config/                      # Application configuration
│   ├── settings.py              # Environment settings
│   ├── logging_config.py        # Logging configuration
│   └── uvicorn_logging.py       # Uvicorn logging setup
│
├── exceptions/                  # Exception handling
│   ├── custom.py                # Custom exception classes
│   └── handlers.py              # Exception handlers
│
├── middleware/                  # FastAPI middleware
│   ├── logging.py               # Request/response logging
│   └── readonly.py              # Read-only mode enforcement
│
├── models/                      # Pydantic data models
│   ├── application.py           # Application models
│   ├── cluster.py               # Cluster models
│   ├── namespace.py             # Namespace models
│   ├── config.py                # Configuration models
│   └── common.py                # Shared models
│
├── routers/                     # API route handlers
│   ├── system.py                # System & configuration endpoints
│   ├── clusters.py              # Cluster management
│   ├── apps.py                  # Application management
│   ├── namespaces.py            # Namespace management
│   ├── app_argocd.py            # App-level ArgoCD config
│   ├── app_l4_ingress.py        # App L4 ingress requests
│   ├── app_egress_ip.py         # App egress IP allocation
│   ├── ns_argocd.py             # Namespace ArgoCD config
│   ├── ns_basicInfo.py          # Namespace basic info
│   ├── ns_resourcequota.py      # Resource quota management
│   ├── ns_limitrange.py         # Limit range management
│   ├── ns_rolebindings.py       # Role bindings management
│   ├── ns_egressfirewall.py     # Egress firewall rules
│   ├── ns_egress_ip.py          # Egress IP allocation
│   ├── allocate_l4_ingress.py   # L4 ingress IP allocation
│   └── pull_requests.py         # Git PR operations
│
├── services/                    # Business logic layer
│   ├── application_service.py   # Application business logic
│   ├── cluster_service.py       # Cluster business logic
│   ├── namespace_service.py     # Namespace business logic
│   ├── namespace_details_service.py  # Namespace details logic
│   └── config_service.py        # Configuration logic
│
├── repositories/                # Data access layer
│   ├── application_repository.py # Application data access
│   ├── cluster_repository.py    # Cluster data access
│   └── namespace_repository.py  # Namespace data access
│
├── utils/                       # Utility functions
│   ├── workspace.py             # Workspace path utilities
│   ├── yaml_utils.py            # YAML reading/writing helpers
│   ├── helpers.py               # General helper functions
│   ├── validators.py            # Validation utilities
│   └── enforcement.py           # Policy enforcement utilities
│
└── tests/                       # Test suite
    ├── conftest.py              # Pytest configuration
    ├── requirements-test.txt    # Test dependencies
    └── e2e/                     # End-to-end tests
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.9+**
- **Git** (for repository operations)
- **Virtual environment** (recommended)

### Installation

1. **Clone the repository**
   ```bash
   cd kselfservice/backend
   ```

2. **Create and activate virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment** (optional)
   ```bash
   # Create .env.local in the project root
   cat > ../../.env.local <<EOF
   READONLY=false
   GITHUB_TOKEN=your_github_token_here
   EOF
   ```

### Running the Application

#### Development Mode

```bash
# From the backend directory
uvicorn main:app --reload --host 0.0.0.0 --port 8888
```

#### Production Mode

```bash
# Using the start script from kselfservice directory
cd ..
./start.sh
```

The API will be available at:
- **API Base**: http://localhost:8888/api/v1
- **Swagger UI**: http://localhost:8888/api/docs
- **ReDoc**: http://localhost:8888/api/redoc

---

## 📡 API Endpoints

### System & Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/system/health` | Health check endpoint |
| GET | `/api/v1/system/config` | Get workspace configuration |
| POST | `/api/v1/system/config` | Save workspace configuration |
| GET | `/api/v1/system/envlist` | Get list of environments |
| GET | `/api/v1/system/enforcement` | Get enforcement settings |
| PUT | `/api/v1/system/enforcement` | Update enforcement settings |

### Clusters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/clusters` | List all clusters |
| POST | `/api/v1/clusters` | Create or update a cluster |
| DELETE | `/api/v1/clusters/{clustername}` | Delete a cluster |

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/apps` | List all applications |
| POST | `/api/v1/apps` | Create a new application |
| PUT | `/api/v1/apps/{appname}` | Update application |
| DELETE | `/api/v1/apps/{appname}` | Delete application |
| GET | `/api/v1/apps/{appname}/argocd` | Get app ArgoCD config |
| PUT | `/api/v1/apps/{appname}/argocd` | Update app ArgoCD config |

### Namespaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/apps/{appname}/namespaces` | List namespaces for app |
| POST | `/api/v1/apps/{appname}/namespaces` | Create namespace |
| DELETE | `/api/v1/apps/{appname}/namespaces/{namespace}` | Delete namespace |
| POST | `/api/v1/apps/{appname}/namespaces/copy` | Copy namespace |

### Namespace Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/apps/{appname}/namespaces/{namespace}/info` | Get namespace info |
| PUT | `/api/v1/apps/{appname}/namespaces/{namespace}/info` | Update namespace info |
| GET | `/api/v1/apps/{appname}/namespaces/{namespace}/resourcequota` | Get resource quota |
| PUT | `/api/v1/apps/{appname}/namespaces/{namespace}/resourcequota` | Update resource quota |
| GET | `/api/v1/apps/{appname}/namespaces/{namespace}/limitrange` | Get limit range |
| PUT | `/api/v1/apps/{appname}/namespaces/{namespace}/limitrange` | Update limit range |
| GET | `/api/v1/apps/{appname}/namespaces/{namespace}/rolebindings` | Get role bindings |
| PUT | `/api/v1/apps/{appname}/namespaces/{namespace}/rolebindings` | Update role bindings |
| GET | `/api/v1/apps/{appname}/namespaces/{namespace}/egressfirewall` | Get egress firewall |
| PUT | `/api/v1/apps/{appname}/namespaces/{namespace}/egressfirewall` | Update egress firewall |

### IP Allocation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/apps/{appname}/egress_ip` | Get egress IP allocation |
| PUT | `/api/v1/apps/{appname}/egress_ip` | Request egress IP |
| GET | `/api/v1/apps/{appname}/l4_ingress` | Get L4 ingress requests |
| PUT | `/api/v1/apps/{appname}/l4_ingress` | Request L4 ingress IP |
| POST | `/api/v1/allocate/l4_ingress` | Allocate L4 ingress IP |

### Pull Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/pullrequests` | Create a pull request |
| GET | `/api/v1/pullrequests/status` | Get PR status |

### Access Requests

| Method | Endpoint | Description | Response Codes |
|--------|----------|-------------|----------------|
| GET | `/api/v1/access_requests` | List all access requests | 200, 403 |
| POST | `/api/v1/app_access` | Create app access request | 200, 400, 409 |
| POST | `/api/v1/global_access` | Create global access request | 200, 400 |

**Notes:**
- `POST /api/v1/app_access` returns `409 Conflict` if a duplicate request already exists (same application, role, and userid/group)
- Requires exactly one of `userid` or `group` in the request payload
- `GET /api/v1/access_requests` requires `platform_admin` or `role_mgmt_admin` role

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `READONLY` | Enable read-only mode | `false` |
| `GITHUB_TOKEN` | GitHub personal access token for PR operations | - |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | `INFO` |

### Workspace Configuration

The application manages three Git repositories:

1. **Requests Repository**: Stores application and namespace requests
2. **Control Repository**: Contains cluster definitions and settings
3. **Templates Repository**: Stores YAML templates for resources

Configuration is stored in `~/.kselfserve/kselfserveconfig.yaml`:

```yaml
workspace: /path/to/workspace
requestsRepo: git@github.com:org/requests.git
controlRepo: git@github.com:org/control.git
templatesRepo: git@github.com:org/templates.git
renderedManifestsRepo: git@github.com:org/rendered.git
```

### File Structure in Repositories

#### Requests Repository
```
apprequests/
├── env_info.yaml
├── dev/
│   └── myapp/
│       ├── appinfo.yaml
│       ├── argocd.yaml (optional)
│       └── mynamespace/
│           ├── namespace_info.yaml
│           ├── resourcequota.yaml
│           ├── limitrange.yaml
│           ├── rolebinding_requests.yaml
│           ├── egress_firewall_requests.yaml
│           └── nsargocd.yaml
└── prod/
    └── ...
```

#### Control Repository
```
clusters/
├── dev_clusters.yaml
├── prod_clusters.yaml
└── ...
settings/
└── enforcement.yaml
```

---

## 🛠️ Development

### Code Style

- Follow **PEP 8** style guide
- Use **type hints** for all function parameters and return values
- Write **docstrings** for all public functions and classes
- Keep functions **focused** and **single-purpose**

### Adding New Features

1. **Define models** in `models/` if needed
2. **Create repository methods** in `repositories/` for data access
3. **Implement business logic** in `services/`
4. **Create router endpoints** in `routers/`
5. **Register router** in `main.py`

### Example: Adding a New Resource Type

```python
# 1. Define model (models/myresource.py)
from pydantic import BaseModel

class MyResource(BaseModel):
    name: str
    value: str

# 2. Create repository (repositories/myresource_repository.py)
class MyResourceRepository:
    def read_resource(self, path: Path) -> Dict[str, Any]:
        return read_yaml_dict(path)
    
    def write_resource(self, path: Path, data: Dict[str, Any]) -> None:
        write_yaml_dict(path, data)

# 3. Implement service (services/myresource_service.py)
class MyResourceService:
    def __init__(self):
        self.repo = MyResourceRepository()
    
    def get_resource(self, name: str) -> MyResource:
        data = self.repo.read_resource(path)
        return MyResource(**data)

# 4. Create router (routers/myresource.py)
from fastapi import APIRouter

router = APIRouter(tags=["myresource"])

@router.get("/myresource/{name}")
def get_myresource(name: str):
    service = MyResourceService()
    return service.get_resource(name)

# 5. Register in main.py
from backend.routers import myresource
app.include_router(myresource.router, prefix=API_PREFIX)
```

### Logging

The application uses Python's built-in `logging` module with structured logging:

```python
from backend.config.logging_config import get_logger

logger = get_logger(__name__)

logger.info("Processing request", extra={"app": "myapp", "env": "dev"})
logger.error("Failed to process", exc_info=True)
```

Logs are written to:
- **Console**: Formatted output for development
- **File**: `../logs/application.log` (if configured)

---

## 🧪 Testing

### Running Tests

```bash
# Install test dependencies
pip install -r tests/requirements-test.txt

# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/e2e/test_apps.py

# Run with verbose output
pytest -v
```

### Test Structure

```
tests/
├── conftest.py              # Pytest fixtures
├── e2e/                     # End-to-end tests
│   ├── test_apps.py
│   ├── test_clusters.py
│   └── test_namespaces.py
└── unit/                    # Unit tests (future)
```

### Writing Tests

```python
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_get_apps():
    response = client.get("/api/v1/apps?env=dev")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
```

---

## 🚢 Deployment

### Using the Start Script

```bash
# From kselfservice directory
./start.sh
```

This script:
1. Starts the backend on port 8888
2. Runs in background
3. Logs to `server.log`
4. Creates PID file at `server.pid`

### Stopping the Server

```bash
./stop.sh
```

### Production Deployment

For production deployments, consider:

1. **Use a process manager** (systemd, supervisor)
2. **Run behind a reverse proxy** (nginx, traefik)
3. **Enable HTTPS** with valid certificates
4. **Configure proper logging** and log rotation
5. **Set up monitoring** and health checks
6. **Use environment variables** for secrets

#### Example systemd Service

```ini
[Unit]
Description=Self-Service API
After=network.target

[Service]
Type=simple
User=apiuser
WorkingDirectory=/opt/self-service/backend
Environment="PATH=/opt/self-service/backend/venv/bin"
ExecStart=/opt/self-service/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8888
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Example nginx Configuration

```nginx
server {
    listen 80;
    server_name api.example.com;
    
    location /api {
        proxy_pass http://localhost:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 🔒 Security Considerations

1. **Read-Only Mode**: Enable `READONLY=true` for production demos
2. **Authentication**: Implement authentication middleware (OAuth2, JWT)
3. **Authorization**: Add role-based access control
4. **Input Validation**: All inputs are validated using Pydantic models
5. **YAML Safety**: Use `yaml.safe_load()` to prevent code injection
6. **Path Traversal**: Validate and sanitize all file paths
7. **Git Credentials**: Store GitHub tokens securely in environment variables

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [uvicorn Documentation](https://www.uvicorn.org/)
- [Python Logging HOWTO](https://docs.python.org/3/howto/logging.html)

---

## 🤝 Contributing

1. Follow the established architecture patterns
2. Add tests for new features
3. Update documentation
4. Use type hints and docstrings
5. Keep services and repositories separate

---

## 📝 License

See the [LICENSE](../../LICENSE) file in the project root.

---

## 💬 Support

For questions or issues, please refer to the main project [README](../../README.md).
