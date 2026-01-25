from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path

import yaml

router = APIRouter(tags=["general"])


class KSelfServeConfig(BaseModel):
    workspace: str = ""
    requestsRepo: str = ""
    renderedManifestsRepo: str = ""


def _config_path() -> Path:
    return Path.home() / ".kselfserve" / "kselfservecofig.yaml"


@router.get("/config", response_model=KSelfServeConfig)
def get_config():
    cfg_path = _config_path()
    if not cfg_path.exists():
        return KSelfServeConfig()

    try:
        raw = yaml.safe_load(cfg_path.read_text()) or {}
        if not isinstance(raw, dict):
            raise ValueError("config is not a mapping")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")

    return KSelfServeConfig(
        workspace=str(raw.get("workspace", "") or ""),
        requestsRepo=str(raw.get("requestsRepo", "") or ""),
        renderedManifestsRepo=str(
            raw.get("renderedManifestsRepo", raw.get("RenderedManifestsRepo", "")) or ""
        ),
    )


@router.post("/config", response_model=KSelfServeConfig)
def save_config(cfg: KSelfServeConfig):
    cfg_path = _config_path()
    try:
        cfg_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "workspace": cfg.workspace or "",
            "requestsRepo": cfg.requestsRepo or "",
            "renderedManifestsRepo": cfg.renderedManifestsRepo or "",
        }
        cfg_path.write_text(yaml.safe_dump(data, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e}")

    return cfg


@router.get("/envlist")
def get_envlist():
    return {"DEV": "", "QA": "", "PRD": ""}


@router.get("/deployment_type")
def get_deployment_type():
    return {
        "deployment_env": "test",
        "title": {
            "test": "OCP Provisioning Portal (Test)",
            "staging": "OCP Provisioning Portal (Staging)",
            "live": "OCP Provisioning Portal",
        },
        "headerColor": {
            "test": "red",
            "staging": "orange",
            "live": "#384454",
        },
    }


@router.get("/current-user")
def get_current_user():
    return {"user": "user1"}
