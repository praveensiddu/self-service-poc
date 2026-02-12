from fastapi import APIRouter, Depends, Response
from typing import Optional, List

import logging

from backend.dependencies import require_env
from backend.models import (
    NamespaceRoleBindingsUpdate,
    RBRoleRef,
    RBSubject,
    RoleBindingYamlRequest,
)
from backend.routers import pull_requests
from backend.services.namespace_details_service import NamespaceDetailsService
from backend.auth.rbac import require_rbac

router = APIRouter(tags=["rolebindings"])

logger = logging.getLogger("uvicorn.error")


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


@router.post("/apps/{appname}/namespaces/{namespace}/rolebindings/rolebinding_yaml")
def get_rolebinding_yaml(
    appname: str,
    namespace: str,
    payload: RoleBindingYamlRequest,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="GET",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Generate RoleBinding YAML. Requires viewer or manager role."""
    env = require_env(env)

    yaml_text = service.generate_rolebinding_yaml(
        namespace=namespace,
        subjects=payload.subjects,
        role_ref=payload.roleRef,
        binding_index=payload.binding_index,
        binding_name=payload.binding_name
    )

    return Response(content=yaml_text, media_type="text/yaml")


@router.put("/apps/{appname}/namespaces/{namespace}/rolebinding_requests")
def put_namespace_rolebinding_requests(
    appname: str,
    namespace: str,
    payload: NamespaceRoleBindingsUpdate,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="POST",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Update namespace role bindings. Requires manager role."""
    env = require_env(env)

    bindings_in = payload.bindings or []
    bindings_data = [
        {
            "subjects": [{"kind": s.kind, "name": s.name} for s in b.subjects],
            "roleRef": {"kind": b.roleRef.kind, "name": b.roleRef.name}
        }
        for b in bindings_in
    ]

    result = service.update_rolebindings(env, appname, namespace, bindings_data)

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return result


@router.get("/apps/{appname}/namespaces/{namespace}/rolebinding_requests")
def get_namespace_rolebinding_requests(
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
    """Get namespace role bindings. Requires viewer or manager role."""
    env = require_env(env)
    return service.get_rolebindings(env, appname, namespace)
