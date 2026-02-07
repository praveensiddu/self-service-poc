from fastapi import APIRouter, HTTPException
from typing import Optional

import logging
from pathlib import Path
import yaml

from backend.routers.apps import _require_env, _require_initialized_workspace
from backend.routers import pull_requests
from backend.routers.ns_models import NamespaceInfoBasicUpdate
from backend.routers.namespaces import _parse_bool, _require_namespace_dir

router = APIRouter(tags=["ns_basic"])

logger = logging.getLogger("uvicorn.error")


def _nsargocd_summary(*, env: str, appname: str, ns_dir: Path) -> dict:
    try:
        requests_root = _require_initialized_workspace()

        nsargocd_path = ns_dir / "nsargocd.yaml"
        nsargocd = {}
        if nsargocd_path.exists() and nsargocd_path.is_file():
            try:
                parsed = yaml.safe_load(nsargocd_path.read_text()) or {}
                if isinstance(parsed, dict):
                    nsargocd = parsed
            except Exception:
                nsargocd = {}

        need_argo = _parse_bool(nsargocd.get("need_argo"))
        argocd_sync_strategy = str(nsargocd.get("argocd_sync_strategy", "") or "")
        gitrepourl = str(nsargocd.get("gitrepourl", "") or "")

        argocd_exists = False
        try:
            argocd_path = (requests_root / env / appname) / "argocd.yaml"
            argocd_exists = argocd_path.exists() and argocd_path.is_file()
        except Exception:
            argocd_exists = False
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
def put_namespace_info_basic(appname: str, namespace: str, payload: NamespaceInfoBasicUpdate, env: Optional[str] = None):
    env = _require_env(env)

    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)
    ns_info_path = ns_dir / "namespace_info.yaml"

    try:
        existing = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            parsed = yaml.safe_load(ns_info_path.read_text()) or {}
            if isinstance(parsed, dict):
                existing = parsed

        ni = payload.namespace_info
        if ni.clusters is not None:
            existing["clusters"] = [str(c) for c in ni.clusters if c is not None and str(c).strip()]
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

    argo = _nsargocd_summary(env=env, appname=appname, ns_dir=ns_dir)
    return {
        "clusters": clusters,
        "gitrepourl": str(argo.get("gitrepourl", "") or ""),
        "argocd_sync_strategy": str(argo.get("argocd_sync_strategy", "") or ""),
        "need_argo": bool(argo.get("need_argo")),
    }


@router.get("/apps/{appname}/namespaces/{namespace}/namespace_info/basic")
def get_namespace_info_basic(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)

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
        "generate_argo_app": _parse_bool(ns_info.get("generate_argo_app")),
    }
    out.update(_nsargocd_summary(env=env, appname=appname, ns_dir=ns_dir))
    return out
