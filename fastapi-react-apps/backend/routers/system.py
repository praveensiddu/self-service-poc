from fastapi import APIRouter, Depends
from typing import Optional
from pathlib import Path
import logging

from backend.config.settings import is_readonly
from backend.models import KSelfServeConfig
from backend.services.config_service import ConfigService
from backend.utils.enforcement import EnforcementSettings
from backend.dependencies import get_workspace_path

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
        "deployment_env": "test",
        "title": {
            "test": "Kubernetes Self Server Provisioning Tool (Test)",
            "staging": "Kubernetes Self Server Provisioning Tool (Staging)",
            "live": "Kubernetes Self Server Provisioning Tool",
        },
        "headerColor": {
            "test": "red",
            "staging": "orange",
            "live": "#384454",
        },
    }


@router.get("/current-user")
def get_current_user():
    """Get current user information."""
    return {"user": "user1"}


@router.get("/portal-mode")
def get_portal_mode():
    """Return the portal mode (readonly or not)."""
    return {
        "readonly": is_readonly()
    }


@router.get("/settings/enforcement", response_model=EnforcementSettings)
def get_enforcement_settings(service: ConfigService = Depends(get_config_service)):
    """Get enforcement settings for egress firewall and egress IP."""
    return service.get_enforcement_settings()


@router.put("/settings/enforcement", response_model=EnforcementSettings)
def put_enforcement_settings(
    payload: EnforcementSettings,
    service: ConfigService = Depends(get_config_service)
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

