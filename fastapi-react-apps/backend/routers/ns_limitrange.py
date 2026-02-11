from fastapi import APIRouter, Depends, Response
from typing import Optional

import logging

from backend.dependencies import require_env
from backend.models import (
    NamespaceLimitRangeUpdate,
    NamespaceResourcesLimits,
    NamespaceResourcesYamlRequest,
)
from backend.routers import pull_requests
from backend.services.namespace_details_service import NamespaceDetailsService

router = APIRouter(tags=["limitrange"])

logger = logging.getLogger("uvicorn.error")


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


@router.post("/apps/{appname}/namespaces/{namespace}/resources/limitrange_yaml")
def get_limitrange_yaml(
    appname: str,
    namespace: str,
    payload: NamespaceResourcesYamlRequest,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Generate LimitRange YAML."""
    env = require_env(env)

    limits = payload.resources.limits if payload and payload.resources is not None else None
    yaml_text = service.generate_limitrange_yaml(namespace, limits)
    return Response(content=yaml_text, media_type="text/yaml")


@router.put("/apps/{appname}/namespaces/{namespace}/resources/limitrange")
def put_namespace_limitrange(
    appname: str,
    namespace: str,
    payload: NamespaceLimitRangeUpdate,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Update namespace limit range."""
    env = require_env(env)

    result = service.update_limitrange(env, appname, namespace, payload.limits)

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return result


@router.get("/apps/{appname}/namespaces/{namespace}/resources/limitrange")
def get_namespace_limitrange(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Get namespace limit range."""
    env = require_env(env)
    return service.get_limitrange(env, appname, namespace)
