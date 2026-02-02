from fastapi import APIRouter, HTTPException
from typing import Any, Dict, Optional

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace

router = APIRouter(tags=["nsargocd"])


class NsArgoCdDetails(BaseModel):
    need_argo: Optional[bool] = None


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
        out["need_argo"] = bool(payload.need_argo)

    cfg_path = _nsargocd_yaml_path(ns_dir)
    try:
        cfg_path.write_text(yaml.safe_dump(out, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write nsargocd.yaml: {e}")

    return {"need_argo": bool(out.get("need_argo", False))}
