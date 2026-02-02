from fastapi import APIRouter, HTTPException
from typing import Any, Dict, Optional

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace

router = APIRouter(tags=["app_argocd"])


class AppArgoCdDetails(BaseModel):
    argocd_admin_groups: Optional[str] = ""
    argocd_operator_groups: Optional[str] = ""
    argocd_readonly_groups: Optional[str] = ""
    argocd_sync_strategy: Optional[str] = "auto"
    gitrepourl: Optional[str] = ""


def _argocd_yaml_path(app_dir) -> Any:
    return app_dir / "argocd.yaml"


def _read_argocd_yaml(path) -> Dict[str, Any]:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


@router.get("/apps/{appname}/argocd")
def get_app_argocd(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    cfg_path = _argocd_yaml_path(app_dir)
    data = _read_argocd_yaml(cfg_path)

    exists = False
    try:
        exists = cfg_path.exists() and cfg_path.is_file()
    except Exception:
        exists = False

    return {
        "exists": exists,
        "argocd_admin_groups": str(data.get("argocd_admin_groups", "") or ""),
        "argocd_operator_groups": str(data.get("argocd_operator_groups", "") or ""),
        "argocd_readonly_groups": str(data.get("argocd_readonly_groups", "") or ""),
        "argocd_sync_strategy": str(data.get("argocd_sync_strategy", "auto") or "auto"),
        "gitrepourl": str(data.get("gitrepourl", "") or ""),
    }


@router.delete("/apps/{appname}/argocd")
def delete_app_argocd(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    cfg_path = _argocd_yaml_path(app_dir)
    existed = False
    try:
        existed = cfg_path.exists() and cfg_path.is_file()
    except Exception:
        existed = False

    if existed:
        try:
            cfg_path.unlink()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete argocd.yaml: {e}")

    return {"deleted": existed}


@router.put("/apps/{appname}/argocd")
def put_app_argocd(appname: str, payload: AppArgoCdDetails, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    out: Dict[str, Any] = {
        "argocd_admin_groups": str(payload.argocd_admin_groups or "").strip(),
        "argocd_operator_groups": str(payload.argocd_operator_groups or "").strip(),
        "argocd_readonly_groups": str(payload.argocd_readonly_groups or "").strip(),
        "argocd_sync_strategy": str(payload.argocd_sync_strategy or "auto").strip() or "auto",
        "gitrepourl": str(payload.gitrepourl or "").strip(),
    }

    cfg_path = _argocd_yaml_path(app_dir)
    try:
        cfg_path.write_text(yaml.safe_dump(out, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write argocd.yaml: {e}")

    return out
