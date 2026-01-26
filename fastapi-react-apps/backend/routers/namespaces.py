from fastapi import APIRouter, HTTPException
from typing import Optional
import shutil

import yaml

from routers.apps import _require_env, _require_initialized_workspace

router = APIRouter(tags=["namespaces"])


def _parse_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    return s in {"true", "1", "yes", "y", "on"}


@router.get("/apps/{appname}/namespaces")
def get_namespaces(appname: str, env: Optional[str] = None):
    env = _require_env(env)

    requests_root = _require_initialized_workspace()
    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    out = {}
    for child in app_dir.iterdir():
        if not child.is_dir():
            continue

        ns_name = child.name
        ns_info_path = child / "namespace_info.yaml"
        limits_path = child / "limits.yaml"
        requests_path = child / "requests.yaml"

        ns_info = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            try:
                parsed = yaml.safe_load(ns_info_path.read_text()) or {}
                if isinstance(parsed, dict):
                    ns_info = parsed
            except Exception:
                ns_info = {}

        limits = {}
        if limits_path.exists() and limits_path.is_file():
            try:
                parsed = yaml.safe_load(limits_path.read_text()) or {}
                if isinstance(parsed, dict):
                    limits = parsed
            except Exception:
                limits = {}

        reqs = {}
        if requests_path.exists() and requests_path.is_file():
            try:
                parsed = yaml.safe_load(requests_path.read_text()) or {}
                if isinstance(parsed, dict):
                    reqs = parsed
            except Exception:
                reqs = {}

        clusters = ns_info.get("clusters")
        if not isinstance(clusters, list):
            clusters = []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

        need_argo = _parse_bool(ns_info.get("need_argo"))
        status = "Argo used" if need_argo else "Argo not used"

        out[ns_name] = {
            "name": ns_name,
            "description": str(ns_info.get("description", "") or ""),
            "clusters": clusters,
            "egress_nameid": (None if ns_info.get("egress_nameid") in (None, "") else str(ns_info.get("egress_nameid"))),
            "enable_pod_based_egress_ip": _parse_bool(ns_info.get("enable_pod_based_egress_ip")),
            "allow_all_egress": _parse_bool(ns_info.get("allow_all_egress")),
            "need_argo": need_argo,
            "generate_argo_app": _parse_bool(ns_info.get("generate_argo_app")),
            "status": status,
            "resources": {
                "requests": {
                    "cpu": (None if reqs.get("cpu") in (None, "") else str(reqs.get("cpu"))),
                    "memory": (None if reqs.get("memory") in (None, "") else str(reqs.get("memory"))),
                },
                "limits": {
                    "cpu": (None if limits.get("cpu") in (None, "") else str(limits.get("cpu"))),
                    "memory": (None if limits.get("memory") in (None, "") else str(limits.get("memory"))),
                },
            },
            "rbac": {"roles": []},
        }

    return out


@router.delete("/apps/{appname}/namespaces")
def delete_namespaces(appname: str, env: Optional[str] = None, namespaces: Optional[str] = None):
    """Delete specific namespaces from an application

    Args:
        appname: The application name
        env: The environment (dev/qa/prd)
        namespaces: Comma-separated list of namespace names to delete
    """
    env = _require_env(env)

    if not namespaces:
        raise HTTPException(status_code=400, detail="namespaces parameter is required (comma-separated list)")

    namespace_list = [ns.strip() for ns in namespaces.split(",") if ns.strip()]

    if not namespace_list:
        raise HTTPException(status_code=400, detail="No valid namespaces provided")

    deleted_data = {
        "appname": appname,
        "env": env,
        "requested_deletions": namespace_list,
        "deleted_namespaces": [],
        "not_found": [],
    }

    requests_root = _require_initialized_workspace()
    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    for ns_name in namespace_list:
        ns_dir = app_dir / ns_name
        if not ns_dir.exists() or not ns_dir.is_dir():
            deleted_data["not_found"].append(ns_name)
            continue

        try:
            shutil.rmtree(ns_dir)
            deleted_data["deleted_namespaces"].append(ns_name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete namespace folder {ns_dir}: {e}")

    if deleted_data["deleted_namespaces"] and not any(p.is_dir() for p in app_dir.iterdir()):
        deleted_data["app_entry_removed"] = True

    return deleted_data
