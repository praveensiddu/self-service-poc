from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from pathlib import Path
import logging

from backend.routers import pull_requests
from backend.dependencies import require_env, require_initialized_workspace
from backend.models import AppCreate, AppResponse, AppDeleteResponse
from backend.services.application_service import ApplicationService
from backend.services.cluster_service import ClusterService
from backend.auth.rbac import require_rbac

router = APIRouter(tags=["apps"])

logger = logging.getLogger("uvicorn.error")


# ============================================
# Dependency Injection
# ============================================

def get_app_service() -> ApplicationService:
    """Dependency injection for ApplicationService."""
    return ApplicationService()


def get_cluster_service() -> ClusterService:
    """Dependency injection for ClusterService."""
    return ClusterService()



# ============================================
# API Endpoints
# ============================================

@router.get("/apps", response_model=Dict[str, AppResponse])
def list_apps(
    env: Optional[str] = None,
    service: ApplicationService = Depends(get_app_service)
):
    """List all applications for an environment.

    Args:
        env: Environment name (dev, qa, prd)

    Returns:
        Dictionary of applications keyed by app name
    """
    env = require_env(env)
    return service.get_apps_for_env(env)


@router.post("/apps", response_model=AppResponse)
def create_app(
    payload: AppCreate,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj="/apps", act="POST")),
    service: ApplicationService = Depends(get_app_service)
):
    """Create a new application.

    Args:
        payload: Application creation data
        env: Environment name (dev, qa, prd)

    Returns:
        Created application data
    """
    env = require_env(env)

    result = service.create_app(
        env=env,
        appname=payload.appname,
        description=payload.description or "",
        managedby=payload.managedby or ""
    )

    _try_ensure_pull_request(env, payload.appname)

    return result


@router.put("/apps/{appname}", response_model=AppResponse)
def update_app(
    appname: str,
    payload: AppCreate,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method, app_id=lambda r: r.path_params.get("appname", ""))),
    service: ApplicationService = Depends(get_app_service)
):
    """Update an existing application.

    Args:
        appname: Application name to update
        payload: Updated application data
        env: Environment name (dev, qa, prd)

    Returns:
        Updated application data
    """
    env = require_env(env)

    # Validate that appname in URL matches payload (if provided)
    payload_name = str(payload.appname or "").strip()
    if payload_name and payload_name != appname:
        raise HTTPException(status_code=400, detail="Renaming appname is not supported")

    result = service.update_app(
        env=env,
        appname=appname,
        description=payload.description or "",
        managedby=payload.managedby or ""
    )

    _try_ensure_pull_request(env, appname)

    return result


@router.delete("/apps/{appname}", response_model=AppDeleteResponse)
def delete_app(
    appname: str,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method, app_id=lambda r: r.path_params.get("appname", ""))),
    service: ApplicationService = Depends(get_app_service)
):
    """Delete an application and all its associated data.

    Args:
        appname: Application name to delete
        env: Environment name (dev, qa, prd)

    Returns:
        Deletion result data
    """
    env = require_env(env)
    return service.delete_app(env, appname)


# ============================================
# Helper Functions
# ============================================

def _try_ensure_pull_request(env: str, appname: str) -> None:
    """Try to ensure a pull request exists. Logs errors but doesn't fail."""
    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", env, appname, str(e))
