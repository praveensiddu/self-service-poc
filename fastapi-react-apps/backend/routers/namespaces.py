from fastapi import APIRouter, HTTPException, Response
from typing import List, Optional
import shutil
import re
import logging
from pathlib import Path

import yaml

from backend.routers.ns_models import NamespaceCopyRequest, NamespaceCreate

from backend.routers.apps import _require_env, _require_initialized_workspace
from backend.routers.general import load_enforcement_settings
from backend.routers import pull_requests

router = APIRouter(tags=["namespaces"])

logger = logging.getLogger("uvicorn.error")


def _require_namespace_dir(env: str, appname: str, namespace: str) -> Path:
    requests_root = _require_initialized_workspace()
    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")
    return ns_dir


def _rewrite_default_namespace_in_yaml_files(root: Path, to_namespace: str) -> None:
    to_ns = str(to_namespace or "").strip()
    if not to_ns:
        return

    patterns = ("*.yaml", "*.yml")
    for pattern in patterns:
        for path in root.rglob(pattern):
            if not path.is_file():
                continue
            try:
                raw = path.read_text()
            except Exception:
                continue

            try:
                docs = list(yaml.safe_load_all(raw))
            except Exception:
                continue

            changed = False
            next_docs = []
            for doc in docs:
                if isinstance(doc, dict):
                    md = doc.get("metadata")
                    if isinstance(md, dict) and "namespace" in md:
                        if md.get("namespace") != to_ns:
                            md["namespace"] = to_ns
                            changed = True
                next_docs.append(doc)

            if not changed:
                continue

            try:
                out = yaml.safe_dump_all(next_docs, sort_keys=False)
                path.write_text(out)
            except Exception as e:
                logger.error("Failed to rewrite metadata.namespace in %s: %s", str(path), str(e))


def _parse_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    return s in {"true", "1", "yes", "y", "on"}


def _read_yaml_dict(path) -> dict:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _read_yaml_list(path) -> list:
    if not path.exists() or not path.is_file():
        return []
    try:
        raw = yaml.safe_load(path.read_text())
        return raw if isinstance(raw, list) else []
    except Exception:
        return []


def _as_trimmed_str(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _is_set(v: Optional[str]) -> bool:
    s = str(v or "").strip()
    return bool(s) and s != "0"


@router.get("/apps/{appname}/namespaces")
def get_namespaces(appname: str, env: Optional[str] = None):
    env = _require_env(env)

    enforcement = load_enforcement_settings()
    egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"

    requests_root = _require_initialized_workspace()
    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    argocd_exists = False
    try:
        argocd_path = app_dir / "argocd.yaml"
        argocd_exists = argocd_path.exists() and argocd_path.is_file()
    except Exception:
        argocd_exists = False

    out = {}
    for child in app_dir.iterdir():
        if not child.is_dir():
            continue

        ns_name = child.name
        ns_info_path = child / "namespace_info.yaml"

        ns_info = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            try:
                parsed = yaml.safe_load(ns_info_path.read_text()) or {}
                if isinstance(parsed, dict):
                    ns_info = parsed
            except Exception:
                ns_info = {}

        nsargocd_path = child / "nsargocd.yaml"
        nsargocd = _read_yaml_dict(nsargocd_path)

        clusters = ns_info.get("clusters")
        if not isinstance(clusters, list):
            clusters = []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

        need_argo = _parse_bool(nsargocd.get("need_argo"))
        if not argocd_exists:
            need_argo = False

        out[ns_name] = {
            "name": ns_name,
            "description": str(ns_info.get("description", "") or ""),
            "clusters": clusters,
            "enable_pod_based_egress_ip": _parse_bool(ns_info.get("enable_pod_based_egress_ip")),
            "allow_all_egress": (not egress_firewall_enforced) or _parse_bool(ns_info.get("allow_all_egress")),
            "need_argo": need_argo,
        }

    return out


@router.post("/apps/{appname}/namespaces")
def create_namespace(appname: str, payload: NamespaceCreate, env: Optional[str] = None):
    """Create a new namespace for an application

    Args:
        appname: The application name
        payload: Namespace creation data
        env: The environment (dev/qa/prd)
    """
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    namespace = str(payload.namespace or "").strip()
    if not namespace:
        raise HTTPException(status_code=400, detail="namespace is required")
    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", namespace):
        raise HTTPException(
            status_code=400,
            detail="Invalid namespace name. Must be lowercase alphanumeric with hyphens."
        )

    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    ns_dir = app_dir / namespace
    if ns_dir.exists():
        raise HTTPException(status_code=409, detail=f"Namespace already exists: {namespace}")

    try:
        ns_dir.mkdir(parents=True, exist_ok=False)

        clusters = payload.clusters or []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]
        egress_nameid = str(payload.egress_nameid or "").strip()

        ns_info = {
            "clusters": clusters,
        }

        if egress_nameid:
            ns_info["egress_nameid"] = egress_nameid

        ns_info_path = ns_dir / "namespace_info.yaml"
        ns_info_path.write_text(yaml.safe_dump(ns_info, sort_keys=False))

    except HTTPException:
        raise
    except Exception as e:
        # Clean up if something went wrong
        if ns_dir.exists():
            shutil.rmtree(ns_dir)
        raise HTTPException(status_code=500, detail=f"Failed to create namespace: {e}")

    need_argo = False
    status = "Argo used" if need_argo else "Argo not used"

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return {
        "name": namespace,
        "description": "",
        "clusters": clusters,
        "egress_nameid": egress_nameid if egress_nameid else None,
        "enable_pod_based_egress_ip": False,
        "allow_all_egress": False,
        "need_argo": need_argo,
        "generate_argo_app": False,
        "status": status
    }


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


@router.post("/apps/{appname}/namespaces/{namespace}/copy")
def copy_namespace(appname: str, namespace: str, payload: NamespaceCopyRequest, env: Optional[str] = None):
    env = _require_env(env)

    from_env = _require_env(payload.from_env)
    to_env = _require_env(payload.to_env)
    to_namespace = str(payload.to_namespace or "").strip()
    if not to_namespace:
        raise HTTPException(status_code=400, detail="to_namespace is required")

    if from_env != env:
        raise HTTPException(status_code=400, detail="from_env must match query parameter env")

    if from_env == to_env and to_namespace == namespace:
        raise HTTPException(status_code=400, detail="When copying within the same env, to_namespace must be different")

    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", to_namespace):
        raise HTTPException(
            status_code=400,
            detail="Invalid namespace name. Must be lowercase alphanumeric with hyphens."
        )

    requests_root = _require_initialized_workspace()
    src_dir = requests_root / from_env / appname / namespace
    if not src_dir.exists() or not src_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Source namespace folder not found: {src_dir}")

    dst_dir = requests_root / to_env / appname / to_namespace
    if dst_dir.exists():
        raise HTTPException(status_code=409, detail=f"Destination namespace already exists: {dst_dir}")

    # Ensure app folder exists in destination env
    dst_app_dir = requests_root / to_env / appname
    if not dst_app_dir.exists() or not dst_app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Destination app folder not found: {dst_app_dir}")

    try:
        shutil.copytree(src_dir, dst_dir)
    except Exception as e:
        # best effort cleanup if partially copied
        try:
            if dst_dir.exists():
                shutil.rmtree(dst_dir)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to copy namespace: {e}")

    try:
        _rewrite_default_namespace_in_yaml_files(dst_dir, to_namespace)
    except Exception as e:
        logger.error(
            "Failed to rewrite copied YAML metadata namespaces for %s/%s -> %s/%s: %s",
            str(from_env),
            str(namespace),
            str(to_env),
            str(to_namespace),
            str(e),
        )

    try:
        pull_requests.ensure_pull_request(appname=appname, env=to_env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(to_env), str(appname), str(e))

    return {
        "from_env": from_env,
        "from_namespace": namespace,
        "to_env": to_env,
        "to_namespace": to_namespace,
        "copied": True,
    }


