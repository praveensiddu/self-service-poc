from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Optional
from pathlib import Path
import logging

from backend.models import (
    NamespaceCopyRequest,
    NamespaceCreate,
    NamespaceResponse,
    NamespaceCreateResponse,
    NamespaceDeleteResponse,
    NamespaceCopyResponse,
)
from backend.dependencies import require_env, require_initialized_workspace
from backend.routers import pull_requests
from backend.services.namespace_service import NamespaceService
from backend.repositories.namespace_repository import NamespaceRepository

router = APIRouter(tags=["namespaces"])

logger = logging.getLogger("uvicorn.error")


# ============================================
# Dependency Injection
# ============================================

def get_namespace_service() -> NamespaceService:
    """Dependency injection for NamespaceService."""
    return NamespaceService()


def get_namespace_repo() -> NamespaceRepository:
    """Dependency injection for NamespaceRepository."""
    return NamespaceRepository()



# ============================================
# API Endpoints
# ============================================

@router.get("/apps/{appname}/namespaces", response_model=Dict[str, NamespaceResponse])
def get_namespaces(
    appname: str,
    env: Optional[str] = None,
    service: NamespaceService = Depends(get_namespace_service)
):
    """Get all namespaces for an application.

    Args:
        appname: The application name
        env: The environment (dev/qa/prd)

    Returns:
        Dictionary of namespaces keyed by namespace name
    """
    env = require_env(env)
    return service.get_namespaces_for_app(env, appname)


@router.post("/apps/{appname}/namespaces", response_model=NamespaceCreateResponse)
def create_namespace(
    appname: str,
    payload: NamespaceCreate,
    env: Optional[str] = None,
    service: NamespaceService = Depends(get_namespace_service)
):
    """Create a new namespace for an application.

    Args:
        appname: The application name
        payload: Namespace creation data
        env: The environment (dev/qa/prd)

    Returns:
        Created namespace data
    """
    env = require_env(env)

    result = service.create_namespace(
        env=env,
        appname=appname,
        namespace=payload.namespace,
        clusters=payload.clusters,
        egress_nameid=payload.egress_nameid
    )

    _try_ensure_pull_request(env, appname)

    return result


@router.delete("/apps/{appname}/namespaces", response_model=NamespaceDeleteResponse)
def delete_namespaces(
    appname: str,
    env: Optional[str] = None,
    namespaces: Optional[str] = None,
    service: NamespaceService = Depends(get_namespace_service)
):
    """Delete specific namespaces from an application.

    Args:
        appname: The application name
        env: The environment (dev/qa/prd)
        namespaces: Comma-separated list of namespace names to delete

    Returns:
        Deletion result data
    """
    env = require_env(env)

    if not namespaces:
        raise HTTPException(
            status_code=400,
            detail="namespaces parameter is required (comma-separated list)"
        )

    namespace_list = [ns.strip() for ns in namespaces.split(",") if ns.strip()]

    if not namespace_list:
        raise HTTPException(status_code=400, detail="No valid namespaces provided")

    return service.delete_namespaces(env, appname, namespace_list)


@router.post("/apps/{appname}/namespaces/{namespace}/copy", response_model=NamespaceCopyResponse)
def copy_namespace(
    appname: str,
    namespace: str,
    payload: NamespaceCopyRequest,
    env: Optional[str] = None,
    service: NamespaceService = Depends(get_namespace_service)
):
    """Copy a namespace to another environment or with a new name.

    Args:
        appname: The application name
        namespace: The source namespace name
        payload: Copy request with destination details
        env: The source environment (must match payload.from_env)

    Returns:
        Copy result data
    """
    env = require_env(env)
    from_env = require_env(payload.from_env)
    to_env = require_env(payload.to_env)
    to_namespace = str(payload.to_namespace or "").strip()

    if not to_namespace:
        raise HTTPException(status_code=400, detail="to_namespace is required")

    if from_env != env:
        raise HTTPException(
            status_code=400,
            detail="from_env must match query parameter env"
        )

    result = service.copy_namespace(
        appname=appname,
        namespace=namespace,
        from_env=from_env,
        to_env=to_env,
        to_namespace=to_namespace
    )

    _try_ensure_pull_request(to_env, appname)

    return result


# ============================================
# Helper Functions
# ============================================

def _try_ensure_pull_request(env: str, appname: str) -> None:
    """Try to ensure a pull request exists. Logs errors but doesn't fail."""
    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", env, appname, str(e))
