from fastapi import APIRouter, Depends, Response
from typing import Optional

import logging

from backend.dependencies import require_env
from backend.models import (
    NamespaceResourcesCpuMem,
    NamespaceResourcesQuotaLimits,
    NamespaceResourcesYamlRequest,
    NamespaceResourceQuotaUpdate,
)
from backend.routers import pull_requests
from backend.services.namespace_details_service import NamespaceDetailsService
from backend.auth.rbac import require_rbac

router = APIRouter(tags=["resourcequota"])

logger = logging.getLogger("uvicorn.error")


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


@router.get("/apps/{appname}/namespaces/{namespace}/resources/resourcequota")
def get_namespace_resourcequota(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="GET",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Get namespace resource quota. Requires viewer or manager role."""
    env = require_env(env)
    return service.get_resourcequota(env, appname, namespace)


@router.post("/apps/{appname}/namespaces/{namespace}/resources/resourcequota_yaml")
def get_resourcequota_yaml(
    appname: str,
    namespace: str,
    payload: NamespaceResourcesYamlRequest,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="GET",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Generate ResourceQuota YAML. Requires viewer or manager role."""
    env = require_env(env)

    req = payload.resources.requests if payload and payload.resources is not None else None
    quota_limits = payload.resources.quota_limits if payload and payload.resources is not None else None

    yaml_text = service.generate_resourcequota_yaml(namespace, req, quota_limits)
    return Response(content=yaml_text, media_type="text/yaml")


@router.put("/apps/{appname}/namespaces/{namespace}/resources/resourcequota")
def put_namespace_resourcequota(
    appname: str,
    namespace: str,
    payload: NamespaceResourceQuotaUpdate,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="POST",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Update namespace resource quota. Requires manager role."""
    env = require_env(env)

    result = service.update_resourcequota(
        env, appname, namespace,
        payload.requests,
        payload.quota_limits
    )

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return result
