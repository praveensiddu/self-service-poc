from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, List, Optional
from pathlib import Path
import logging

from backend.dependencies import require_env, get_control_clusters_root, get_requests_root
from backend.models import (
    ClusterUpsert,
    ClusterResponse,
    ClusterDeleteCheckResponse,
    ClusterDeleteResponse,
    ClusterCreateResponse,
    ClusterDependency,
)
from backend.utils.helpers import as_string_list
from backend.services.cluster_service import ClusterService

router = APIRouter(tags=["clusters"])

logger = logging.getLogger("uvicorn.error")


# ============================================
# Dependency Injection
# ============================================

def get_cluster_service() -> ClusterService:
    """Dependency injection for ClusterService."""
    return ClusterService()


# ============================================
# Helper Functions (kept in router for backward compatibility)
# ============================================

def get_allocated_clusters_for_app(
    *,
    env: str,
    app: str,
    clusters_root: Optional[Path] = None,
) -> List[str]:
    """Get allocated clusters for an app. Helper function for backward compatibility."""
    cluster_service = ClusterService()
    return cluster_service.get_allocated_clusters_for_app(env, app)


# ============================================
# API Endpoints
# ============================================

@router.get("/clusters")
def get_clusters(
    env: Optional[str] = None,
    app: Optional[str] = None,
    service: ClusterService = Depends(get_cluster_service)
):
    """Get clusters, optionally filtered by environment and/or application.

    Args:
        env: Environment name (dev, qa, prd)
        app: Application name (if provided, returns clusters allocated to this app)

    Returns:
        Dictionary of clusters by environment, or list of cluster names for an app
    """
    clusters_root = get_control_clusters_root()
    if clusters_root is None:
        return {}

    try:
        requests_root = get_requests_root()
    except HTTPException:
        requests_root = None

    # If app is specified, return allocated clusters for that app
    if app is not None:
        return service.get_allocated_clusters_for_app(str(env or ""), str(app or ""))

    if env is not None and not str(env or "").strip():
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    # Determine which environments to query
    envs = service.get_environments_to_query(env, requests_root, clusters_root)

    # Build output for each environment
    out: Dict[str, List[Dict[str, Any]]] = {}
    for e in envs:
        rows = service.get_clusters_for_env(e, clusters_root, requests_root)
        out[str(e).strip().upper()] = rows

    return out


@router.post("/clusters", response_model=ClusterCreateResponse)
def add_cluster(
    payload: ClusterUpsert,
    env: Optional[str] = None,
    service: ClusterService = Depends(get_cluster_service)
):
    """Create or update a cluster.

    Args:
        payload: Cluster data
        env: Environment name (dev, qa, prd)

    Returns:
        Created/updated cluster data
    """
    env_key = str(env or "").strip().lower()
    if not env_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    clustername = str(payload.clustername or "").strip()
    if not clustername:
        raise HTTPException(status_code=400, detail="clustername is required")

    # Validate IP ranges
    l4_ranges, l4_error = service.validate_and_parse_ip_ranges(payload.l4_ingress_ip_ranges)
    if l4_error:
        raise HTTPException(status_code=400, detail=l4_error)

    egress_ranges, egress_error = service.validate_and_parse_ip_ranges(payload.egress_ip_ranges)
    if egress_error:
        raise HTTPException(status_code=400, detail=egress_error)

    # Create or update cluster
    try:
        normalized = service.create_or_update_cluster(
            env=env_key,
            clustername=clustername,
            purpose=str(payload.purpose or ""),
            datacenter=str(payload.datacenter or ""),
            applications=as_string_list(payload.applications),
            l4_ingress_ip_ranges=l4_ranges,
            egress_ip_ranges=egress_ranges,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ClusterCreateResponse(env=env_key.upper(), cluster=ClusterResponse(**normalized))


@router.get("/clusters/{clustername}/can-delete", response_model=ClusterDeleteCheckResponse)
def check_cluster_can_delete(
    clustername: str,
    env: Optional[str] = None,
    service: ClusterService = Depends(get_cluster_service)
):
    """Check if a cluster can be safely deleted.

    Args:
        clustername: Cluster name to check
        env: Environment name (dev, qa, prd)

    Returns:
        Information about dependencies that would prevent deletion
    """
    env_key = str(env or "").strip().lower()
    if not env_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    name = str(clustername or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="clustername is required")

    # Find dependencies
    namespaces_using_cluster = service.find_namespaces_using_cluster(env_key, name)
    l4_ingress_allocations = service.find_l4_ingress_allocations(env_key, name)
    egress_allocations = service.find_egress_allocations(env_key, name)

    # Convert to model objects
    namespace_deps = [ClusterDependency(**ns) for ns in namespaces_using_cluster]
    l4_deps = [ClusterDependency(**alloc) for alloc in l4_ingress_allocations]
    egress_deps = [ClusterDependency(**alloc) for alloc in egress_allocations]

    can_delete = (
        len(namespace_deps) == 0 and len(l4_deps) == 0 and len(egress_deps) == 0
    )

    return ClusterDeleteCheckResponse(
        can_delete=can_delete,
        namespaces=namespace_deps,
        l4_ingress_allocations=l4_deps,
        egress_allocations=egress_deps,
    )


@router.delete("/clusters/{clustername}", response_model=ClusterDeleteResponse)
def delete_cluster(
    clustername: str,
    env: Optional[str] = None,
    service: ClusterService = Depends(get_cluster_service)
):
    """Delete a cluster.

    Args:
        clustername: Cluster name to delete
        env: Environment name (dev, qa, prd)

    Returns:
        Deletion result
    """
    env_key = str(env or "").strip().lower()
    if not env_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    name = str(clustername or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="clustername is required")

    # Check if cluster can be deleted
    check_result = check_cluster_can_delete(clustername=name, env=env_key, service=service)
    if not check_result.can_delete:
        error_details = {
            "message": "Cannot delete cluster - it is currently in use",
            "namespaces": [ns.model_dump() for ns in check_result.namespaces],
            "l4_ingress_allocations": [
                alloc.model_dump() for alloc in check_result.l4_ingress_allocations
            ],
            "egress_allocations": [
                alloc.model_dump() for alloc in check_result.egress_allocations
            ],
        }
        raise HTTPException(status_code=409, detail=error_details)

    # Delete cluster
    try:
        deleted = service.delete_cluster(env_key, name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Clean up cluster references
    if deleted:
        service.cleanup_cluster_references(env_key, name)

    return ClusterDeleteResponse(deleted=deleted)

