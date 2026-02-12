"""Main FastAPI application module.

This module initializes and configures the FastAPI application,
including routers, middleware, exception handlers, and static file serving.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

# Load environment variables from .env.local
try:
    from dotenv import load_dotenv
    from pathlib import Path

    # Load .env.local from the project root
    env_file = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_file)
except Exception:
    pass

# Configure logging before any other imports
from backend.config.logging_config import setup_logging, get_logger
setup_logging()

logger = get_logger(__name__)

from backend.routers import (
    # Core routers
    system,
    clusters,
    apps,
    namespaces,
    pull_requests,

    access_request_api,

    role_mgmt_api,

    # Application-level routers
    app_argocd,
    app_l4_ingress,
    app_egress_ip,
    allocate_l4_ingress,

    # Namespace-level routers
    ns_argocd,
    ns_basicInfo,
    ns_egress_ip,
    ns_resourcequota,
    ns_limitrange,
    ns_rolebindings,
    ns_egressfirewall,
)
from backend.middleware.readonly import ReadOnlyMiddleware
from backend.middleware.logging import RequestLoggingMiddleware
from backend.exceptions import register_exception_handlers
from backend.auth.rbac import enforce_request, get_current_user_context

# Constants
API_PREFIX = "/api/v1"
API_TITLE = "Application Management API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
Kubernetes Self-Service Provisioning Tool API

This API provides endpoints for managing:
* **Applications**: Create and manage applications
* **Clusters**: Manage Kubernetes clusters
* **Namespaces**: Create and configure namespaces
* **Resources**: Configure resource quotas, limit ranges, and role bindings
* **Networking**: Manage egress IPs, egress firewalls, and L4 ingress
* **ArgoCD**: Configure ArgoCD integration
"""



# ============================================
# Lifespan Context Manager
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events.

    This replaces the deprecated @app.on_event("startup") and
    @app.on_event("shutdown") decorators.
    """
    # Startup
    logger.info("=" * 80)
    logger.info(f"🚀 {API_TITLE} v{API_VERSION}")
    logger.info(f"📝 API Documentation: http://localhost:8888/api/docs")
    logger.info(f"🔗 Alternative Docs: http://localhost:8888/api/redoc")
    logger.info("=" * 80)

    # Validate env-based configuration (all-or-nothing)
    repo_env_keys = [
        "REQUESTS_REPO",
        "TEMPLATES_REPO",
        "RENDERED_MANIFESTS_REPO",
        "CONTROL_REPO",
    ]
    present = [k for k in repo_env_keys if str(os.getenv(k, "")).strip()]
    if present and len(present) != len(repo_env_keys):
        missing = [k for k in repo_env_keys if k not in present]
        raise RuntimeError(
            "Invalid environment configuration: either set all of "
            f"{', '.join(repo_env_keys)} or set none. Missing: {', '.join(missing)}"
        )
    if present and not str(os.getenv("WORKSPACE", "")).strip():
        raise RuntimeError(
            "Invalid environment configuration: WORKSPACE must be set when using env-based repo configuration."
        )
    yield
    # Shutdown
    logger.info("=" * 80)
    logger.info(f"👋 Shutting down {API_TITLE}")
    logger.info("=" * 80)


# Initialize FastAPI app
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


# ============================================
# Middleware Configuration
# ============================================

# Request logging middleware (should be first to capture all requests)
app.add_middleware(RequestLoggingMiddleware)

# CORS middleware (configure based on your needs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your security requirements
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Read-only middleware
app.add_middleware(ReadOnlyMiddleware)


# ============================================
# Exception Handlers
# ============================================

register_exception_handlers(app)

# ============================================
# Router Registration
# ============================================

# Core system routers
app.include_router(system.router, prefix=API_PREFIX, tags=["System"])
app.include_router(clusters.router, prefix=API_PREFIX, tags=["Clusters"])
app.include_router(pull_requests.router, prefix=API_PREFIX, tags=["Pull Requests"])

# Access request routers
app.include_router(access_request_api.router, prefix=API_PREFIX, tags=["Access Requests"])

# Role management router
app.include_router(
    role_mgmt_api.create_rolemgmt_router(enforce=enforce_request, get_current_user_context=get_current_user_context),
    prefix=API_PREFIX,
    tags=["RoleManagement"],
)

# Application routers
app.include_router(apps.router, prefix=API_PREFIX, tags=["Applications"])
app.include_router(app_argocd.router, prefix=API_PREFIX, tags=["Applications"])
app.include_router(app_l4_ingress.router, prefix=API_PREFIX, tags=["Applications"])
app.include_router(app_egress_ip.router, prefix=API_PREFIX, tags=["Applications"])
app.include_router(allocate_l4_ingress.router, prefix=API_PREFIX, tags=["Applications"])

# Namespace routers
app.include_router(namespaces.router, prefix=API_PREFIX, tags=["Namespaces"])
app.include_router(ns_argocd.router, prefix=API_PREFIX, tags=["Namespaces"])
app.include_router(ns_basicInfo.router, prefix=API_PREFIX, tags=["Namespaces"])
app.include_router(ns_egress_ip.router, prefix=API_PREFIX, tags=["Namespaces"])
app.include_router(ns_resourcequota.router, prefix=API_PREFIX, tags=["Namespaces"])
app.include_router(ns_limitrange.router, prefix=API_PREFIX, tags=["Namespaces"])
app.include_router(ns_rolebindings.router, prefix=API_PREFIX, tags=["Namespaces"])
app.include_router(ns_egressfirewall.router, prefix=API_PREFIX, tags=["Namespaces"])



# ============================================
# Static Files & UI Routes
# ============================================

_BACKEND_DIR = Path(__file__).resolve().parent
_FRONTEND_DIR = _BACKEND_DIR.parent / "frontend"

# Mount static files
app.mount("/static", StaticFiles(directory=str(_FRONTEND_DIR)), name="static")


@app.get("/", include_in_schema=False)
def serve_ui():
    """Serve the main UI page."""
    return FileResponse(str(_FRONTEND_DIR / "index.html"))


@app.get("/{full_path:path}", include_in_schema=False)
def serve_ui_routes(full_path: str):
    """Serve UI for client-side routing.

    This catch-all route handles client-side routing for the SPA.
    It excludes API and static paths and serves the main HTML for all other routes.
    """
    # Exclude API routes
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    # Exclude static files
    if full_path.startswith("static"):
        raise HTTPException(status_code=404, detail="Static file not found")

    # Serve the main HTML for client-side routing
    return FileResponse(str(_FRONTEND_DIR / "index.html"))


