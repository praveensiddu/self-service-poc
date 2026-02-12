from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Optional
from pathlib import Path
import logging
import os
import yaml

from backend.config.settings import is_readonly
from backend.models import KSelfServeConfig
from backend.services.config_service import ConfigService
from backend.utils.enforcement import EnforcementSettings
from backend.dependencies import get_workspace_path

from backend.core.deps import get_current_user
from backend.auth.role_mgmt_impl import RoleMgmtImpl
from backend.auth.rbac import get_current_user_context, require_rbac
router = APIRouter(tags=["system"])

logger = logging.getLogger("uvicorn.error")


def _require_workspace_path() -> Path:
    """Helper function for backward compatibility with pull_requests.py."""
    return get_workspace_path()


def get_config_service() -> ConfigService:
    """Dependency injection for ConfigService."""
    return ConfigService()


@router.get("/config", response_model=KSelfServeConfig)
def get_config(service: ConfigService = Depends(get_config_service)):
    """Get workspace configuration."""
    config = service.get_config()
    return KSelfServeConfig(**config)


@router.post("/config", response_model=KSelfServeConfig)
def save_config(cfg: KSelfServeConfig, service: ConfigService = Depends(get_config_service)):
    """Save workspace configuration and setup repositories."""
    config = service.save_config(
        workspace=cfg.workspace or "",
        requests_repo=cfg.requestsRepo or "",
        templates_repo=cfg.templatesRepo or "",
        rendered_manifests_repo=cfg.renderedManifestsRepo or "",
        control_repo=cfg.controlRepo or "",
    )
    return KSelfServeConfig(**config)


@router.get("/envlist")
def get_envlist(service: ConfigService = Depends(get_config_service)):
    """Get list of available environments."""
    return service.get_env_list()


@router.get("/deployment_type")
def get_deployment_type():
    """Get deployment type and environment information."""
    return {
        "deployment_env": "live",
        "demo_mode": os.getenv("DEMO_MODE", "").lower() == "true",
        "title": {
            "test": "Kubernetes Self Server Provisioning Tool (Test)",
            "live": "Kubernetes Self Server Provisioning Tool",
        },
        "headerColor": {
            "test": "red",
            "live": "#2563EB",
        },
    }


@router.get("/current-user")
def get_user_api(request: Request):
    """Get current user information."""
    ctx = get_current_user_context(request)
    return {
        "user": ctx.get("username") or "",
        "roles": ctx.get("roles") or [],
        "groups": ctx.get("groups") or [],
        "app_roles": ctx.get("app_roles") or {},
    }


@router.put("/current-user")
def put_user_api(payload: dict):
    if os.getenv("DEMO_MODE", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Not supported")

    user = str((payload or {}).get("user") or "").strip()
    if not user:
        raise HTTPException(status_code=400, detail="user is required")

    os.environ["CURRENT_USER"] = user
    RoleMgmtImpl.get_instance().update_roles(force=True)
    return {"status": "success", "user": user}


@router.get("/demo-users")
def get_demo_users():
    if os.getenv("DEMO_MODE", "").lower() != "true":
        return {"rows": []}

    p = Path.home() / "workspace" / "kselfserv" / "cloned-repositories" / "control" / "rbac" / "demo_mode" / "demo_users.yaml"
    if not p.exists() or not p.is_file():
        return {"rows": []}
    raw = yaml.safe_load(p.read_text())
    if not isinstance(raw, dict):
        return {"rows": []}
    rows = []
    for user, meta in raw.items():
        if not isinstance(user, str) or not isinstance(meta, dict):
            continue
        rows.append({
            "user": user,
            "name": str(meta.get("name") or user),
            "description": str(meta.get("description") or ""),
        })
    return {"rows": rows}


@router.get("/portal-mode")
def get_portal_mode():
    """Return the portal mode (readonly or not)."""
    return {
        "readonly": is_readonly()
    }


@router.get("/settings/enforcement", response_model=EnforcementSettings)
def get_enforcement_settings(
    service: ConfigService = Depends(get_config_service),
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method)),
):
    """Get enforcement settings for egress firewall and egress IP."""
    return service.get_enforcement_settings()


@router.put("/settings/enforcement", response_model=EnforcementSettings)
def put_enforcement_settings(
    payload: EnforcementSettings,
    service: ConfigService = Depends(get_config_service),
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method)),
):
    """Update enforcement settings for egress firewall and egress IP."""
    return service.update_enforcement_settings(
        enforce_egress_firewall=payload.enforce_egress_firewall,
        enforce_egress_ip=payload.enforce_egress_ip,
    )


@router.get("/catalog/role_refs")
def get_role_refs(
    kind: str,
    env: Optional[str] = None,
    service: ConfigService = Depends(get_config_service)
):
    """Get role catalog for a specific kind (Role or ClusterRole)."""
    return service.get_role_catalog(kind, env)


@router.get("/requests/changes")
def get_requests_changes(
    env: Optional[str] = None,
    service: ConfigService = Depends(get_config_service)
):
    """Get changes in requests repository."""
    return service.get_requests_changes(env)

