from fastapi import APIRouter, HTTPException
from typing import Any, Dict, Optional

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace

router = APIRouter(tags=["nsargocd"])


class NsArgoCdDetails(BaseModel):
    need_argo: Optional[bool] = None
    argocd_sync_strategy: Optional[str] = None
    gitrepourl: Optional[str] = None


def _nsargocd_yaml_path(ns_dir) -> Any:
    return ns_dir / "nsargocd.yaml"


def _read_yaml_dict(path) -> Dict[str, Any]:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _parse_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    return s in {"true", "1", "yes", "y", "on"}


@router.get("/apps/{appname}/namespaces/{namespace}/nsargocd")
def get_ns_argocd(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    cfg_path = _nsargocd_yaml_path(ns_dir)
    data = _read_yaml_dict(cfg_path)

    exists = False
    try:
        exists = cfg_path.exists() and cfg_path.is_file()
    except Exception:
        exists = False

    return {
        "exists": exists,
        "need_argo": _parse_bool(data.get("need_argo")),
        "argocd_sync_strategy": str(data.get("argocd_sync_strategy", "") or ""),
        "gitrepourl": str(data.get("gitrepourl", "") or ""),
    }


@router.put("/apps/{appname}/namespaces/{namespace}/nsargocd")
def put_ns_argocd(appname: str, namespace: str, payload: NsArgoCdDetails, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    out: Dict[str, Any] = {}
    if payload.need_argo is not None:
        out["need_argo"] = "true" if bool(payload.need_argo) else "false"

    sync_strategy = str(payload.argocd_sync_strategy or "").strip()
    if sync_strategy:
        out["argocd_sync_strategy"] = sync_strategy

    gitrepourl = str(payload.gitrepourl or "").strip()
    if gitrepourl:
        out["gitrepourl"] = gitrepourl

    cfg_path = _nsargocd_yaml_path(ns_dir)
    try:
        cfg_path.write_text(yaml.safe_dump(out, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write nsargocd.yaml: {e}")

    return {
        "need_argo": _parse_bool(out.get("need_argo")),
        "argocd_sync_strategy": str(out.get("argocd_sync_strategy", "") or ""),
        "gitrepourl": str(out.get("gitrepourl", "") or ""),
    }


@router.delete("/apps/{appname}/namespaces/{namespace}/nsargocd")
def delete_ns_argocd(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    cfg_path = _nsargocd_yaml_path(ns_dir)
    existed = False
    try:
        existed = cfg_path.exists() and cfg_path.is_file()
    except Exception:
        existed = False

    if existed:
        try:
            cfg_path.unlink()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete nsargocd.yaml: {e}")

    return {"deleted": existed}
