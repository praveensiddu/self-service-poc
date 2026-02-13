from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

import logging
from pathlib import Path
import yaml

from backend.dependencies import require_env
from backend.routers import pull_requests
from backend.models import NamespaceInfoBasicUpdate
from backend.repositories.namespace_repository import NamespaceRepository
from backend.utils.helpers import parse_bool
from backend.utils.yaml_utils import read_yaml_dict
from backend.auth.rbac import require_rbac
from backend.auth.rbac import require_rbac

router = APIRouter(tags=["ns_basic"])

logger = logging.getLogger("uvicorn.error")


def get_namespace_repository() -> NamespaceRepository:
    """Dependency injection for NamespaceRepository."""
    return NamespaceRepository()



def _nsargocd_summary(
    *,
    env: str,
    appname: str,
    ns_dir: Path,
    repo: NamespaceRepository
) -> dict:
    """Get ArgoCD summary for a namespace.

    Args:
        env: Environment name
        appname: Application name
        ns_dir: Namespace directory path
        repo: NamespaceRepository instance

    Returns:
        Dictionary with ArgoCD information
    """
    try:
        nsargocd_path = ns_dir / "nsargocd.yaml"
        nsargocd = read_yaml_dict(nsargocd_path)

        need_argo = parse_bool(nsargocd.get("need_argo"))
        argocd_sync_strategy = str(nsargocd.get("argocd_sync_strategy", "") or "")
        gitrepourl = str(nsargocd.get("gitrepourl", "") or "")

        argocd_exists = repo.argocd_exists(env, appname)
        if not argocd_exists:
            need_argo = False

        status = "Argo used" if need_argo else "Argo not used"

        return {
            "need_argo": need_argo,
            "argocd_sync_strategy": argocd_sync_strategy,
            "gitrepourl": gitrepourl,
            "status": status,
        }
    except Exception:
        return {
            "need_argo": False,
            "argocd_sync_strategy": "",
            "gitrepourl": "",
            "status": "Argo not used",
        }


@router.put("/apps/{appname}/namespaces/{namespace}/namespace_info/basic")
def put_namespace_info_basic(
    appname: str,
    namespace: str,
    payload: NamespaceInfoBasicUpdate,
    env: Optional[str] = None,
    repo: NamespaceRepository = Depends(get_namespace_repository),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="POST",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Update basic namespace information (clusters and egress_nameid).

    Requires manager role for the application.

    Args:
        appname: Application name
        namespace: Namespace name
        payload: Namespace info update payload
        env: Environment name
        repo: NamespaceRepository instance (injected)

    Returns:
        Updated namespace basic information

    Raises:
        HTTPException: 403 if user lacks permission to modify namespace
    """
    env = require_env(env)

    ns_dir = repo.get_namespace_dir(env, appname, namespace)
    ns_info_path = ns_dir / "namespace_info.yaml"

    try:
        existing = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            parsed = yaml.safe_load(ns_info_path.read_text()) or {}
            if isinstance(parsed, dict):
                existing = parsed

        ni = payload.namespace_info
        if ni.clusters is not None:
            # Flatten any nested lists and convert to strings
            flattened = []
            for item in ni.clusters:
                if isinstance(item, list):
                    # Handle nested lists by flattening them
                    for sub_item in item:
                        if sub_item is not None and str(sub_item).strip():
                            flattened.append(str(sub_item).strip())
                elif item is not None and str(item).strip():
                    flattened.append(str(item).strip())
            existing["clusters"] = flattened
        if ni.egress_nameid is not None:
            existing["egress_nameid"] = str(ni.egress_nameid)

        ns_info_path.write_text(yaml.safe_dump(existing, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update namespace_info.yaml: {e}")

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    clusters = existing.get("clusters")
    if not isinstance(clusters, list):
        clusters = []
    clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

    argo = _nsargocd_summary(env=env, appname=appname, ns_dir=ns_dir, repo=repo)
    return {
        "clusters": clusters,
        "gitrepourl": str(argo.get("gitrepourl", "") or ""),
        "argocd_sync_strategy": str(argo.get("argocd_sync_strategy", "") or ""),
        "need_argo": bool(argo.get("need_argo")),
    }


@router.get("/apps/{appname}/namespaces/{namespace}/namespace_info/basic")
def get_namespace_info_basic(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    repo: NamespaceRepository = Depends(get_namespace_repository),
    _: None = Depends(require_rbac(
        obj=lambda r: f"/apps/{r.path_params.get('appname', '')}/namespaces",
        act="GET",
        app_id=lambda r: r.path_params.get("appname", "")
    ))
):
    """Get basic namespace information.

    Requires viewer or manager role for the application.

    Args:
        appname: Application name
        namespace: Namespace name
        env: Environment name
        repo: NamespaceRepository instance (injected)

    Returns:
        Namespace basic information including ArgoCD details

    Raises:
        HTTPException: 403 if user lacks permission to view namespace
    """
    env = require_env(env)
    ns_dir = repo.get_namespace_dir(env, appname, namespace)

    ns_info_path = ns_dir / "namespace_info.yaml"
    ns_info = {}
    if ns_info_path.exists() and ns_info_path.is_file():
        try:
            parsed = yaml.safe_load(ns_info_path.read_text()) or {}
            if isinstance(parsed, dict):
                ns_info = parsed
        except Exception:
            ns_info = {}

    clusters = ns_info.get("clusters")
    if not isinstance(clusters, list):
        clusters = []
    clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

    out = {
        "clusters": clusters,
        "generate_argo_app": parse_bool(ns_info.get("generate_argo_app")),
    }
    out.update(_nsargocd_summary(env=env, appname=appname, ns_dir=ns_dir, repo=repo))
    return out
