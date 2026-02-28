from fastapi import APIRouter, Depends
from typing import Optional

from backend.dependencies import require_env
from backend.models.namespace import NsArgoCdDetails
from backend.services.namespace_details_service import NamespaceDetailsService
from backend.auth.rbac import require_rbac

router = APIRouter(tags=["nsargocd"])


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


@router.get("/apps/{appname}/namespaces/{namespace}/nsargocd")
def get_namespace_argocd(
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
    """Get ArgoCD configuration for a namespace. Requires viewer or manager role."""
    env = require_env(env)
    return service.get_nsargocd(env, appname, namespace)


@router.put("/apps/{appname}/namespaces/{namespace}/nsargocd")
def put_namespace_argocd(
    appname: str,
    namespace: str,
    payload: NsArgoCdDetails,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="POST",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Update ArgoCD configuration for a namespace. Requires manager role."""
    env = require_env(env)
    return service.update_nsargocd(
        env,
        appname,
        namespace,
        need_argo=payload.need_argo,
        argocd_sync_strategy=payload.argocd_sync_strategy,
        gitrepourl=payload.gitrepourl,
    )


@router.delete("/apps/{appname}/namespaces/{namespace}/nsargocd")
def delete_ns_argocd(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="DELETE",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Delete ArgoCD configuration for a namespace. Requires manager role."""
    env = require_env(env)
    return service.delete_nsargocd(env, appname, namespace)
