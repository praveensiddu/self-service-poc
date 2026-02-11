from fastapi import APIRouter, Depends
from typing import Optional

from backend.dependencies import require_env
from backend.models import NsArgoCdDetails
from backend.services.namespace_details_service import NamespaceDetailsService

router = APIRouter(tags=["nsargocd"])


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


@router.get("/apps/{appname}/namespaces/{namespace}/nsargocd")
def get_ns_argocd(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Get ArgoCD configuration for a namespace."""
    env = require_env(env)
    return service.get_nsargocd(env, appname, namespace)


@router.put("/apps/{appname}/namespaces/{namespace}/nsargocd")
def put_ns_argocd(
    appname: str,
    namespace: str,
    payload: NsArgoCdDetails,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Update ArgoCD configuration for a namespace."""
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
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Delete ArgoCD configuration for a namespace."""
    env = require_env(env)
    return service.delete_nsargocd(env, appname, namespace)
