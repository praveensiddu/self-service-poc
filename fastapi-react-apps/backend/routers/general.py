from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import os
import subprocess

import yaml

router = APIRouter(tags=["general"])


class KSelfServeConfig(BaseModel):
    workspace: str = ""
    requestsRepo: str = ""
    renderedManifestsRepo: str = ""
    controlRepo: str = ""


def _config_path() -> Path:
    return Path.home() / ".kselfserve" / "kselfserveconfig.yaml"


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
        controlRepo=str(raw.get("controlRepo", raw.get("ControlRepo", "")) or ""),
    )


@router.post("/config", response_model=KSelfServeConfig)
def save_config(cfg: KSelfServeConfig):
    cfg_path = _config_path()
    try:
        workspace_path = Path(cfg.workspace or "").expanduser()
        if not workspace_path.exists() or not workspace_path.is_dir():
            raise HTTPException(
                status_code=400,
                detail=f"Workspace directory does not exist or is not a directory: {workspace_path}",
            )
        if not os.access(workspace_path, os.R_OK | os.W_OK | os.X_OK):
            raise HTTPException(
                status_code=400,
                detail=f"Workspace directory is not accessible (need read/write/execute): {workspace_path}",
            )

        cloned_repos_dir = workspace_path / "kselfserv" / "cloned-repositories"
        requests_clone_dir = cloned_repos_dir / "requests"
        control_clone_dir = cloned_repos_dir / "control"
        if requests_clone_dir.exists() and not requests_clone_dir.is_dir():
            raise HTTPException(
                status_code=400,
                detail=f"Expected requests clone path to be a directory: {requests_clone_dir}",
            )

        if control_clone_dir.exists() and not control_clone_dir.is_dir():
            raise HTTPException(
                status_code=400,
                detail=f"Expected control clone path to be a directory: {control_clone_dir}",
            )

        if not requests_clone_dir.exists():
            cloned_repos_dir.mkdir(parents=True, exist_ok=True)
            try:
                subprocess.run(
                    ["git", "clone", str(cfg.requestsRepo or ""), str(requests_clone_dir)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            except subprocess.CalledProcessError as e:
                stderr = (e.stderr or "").strip()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to clone requestsRepo into {requests_clone_dir}: {stderr}",
                )

        if not control_clone_dir.exists():
            cloned_repos_dir.mkdir(parents=True, exist_ok=True)
            try:
                subprocess.run(
                    ["git", "clone", str(cfg.controlRepo or ""), str(control_clone_dir)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            except subprocess.CalledProcessError as e:
                stderr = (e.stderr or "").strip()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to clone controlRepo into {control_clone_dir}: {stderr}",
                )

        cfg_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "workspace": cfg.workspace or "",
            "requestsRepo": cfg.requestsRepo or "",
            "renderedManifestsRepo": cfg.renderedManifestsRepo or "",
            "controlRepo": cfg.controlRepo or "",
        }
        cfg_path.write_text(yaml.safe_dump(data, sort_keys=False))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e}")

    return cfg


@router.get("/envlist")
def get_envlist():
    cfg_path = _config_path()
    if not cfg_path.exists():
        raise HTTPException(status_code=400, detail="not initialized")

    try:
        raw_cfg = yaml.safe_load(cfg_path.read_text()) or {}
        if not isinstance(raw_cfg, dict):
            raise HTTPException(status_code=400, detail="not initialized")

        workspace = str(raw_cfg.get("workspace", "") or "").strip()
        if not workspace:
            raise HTTPException(status_code=400, detail="not initialized")

        workspace_path = Path(workspace).expanduser()
        env_info_path = (
            workspace_path
            / "kselfserv"
            / "cloned-repositories"
            / "requests"
            / "app-requests"
            / "env_info.yaml"
        )
        if not env_info_path.exists():
            raise HTTPException(status_code=400, detail="not initialized")

        env_info = yaml.safe_load(env_info_path.read_text()) or {}
        if not isinstance(env_info, dict):
            raise HTTPException(status_code=400, detail="invalid env_info.yaml file")

        env_order = env_info.get("env_order")
        if not isinstance(env_order, list) or not env_order:
            raise HTTPException(status_code=400, detail="invalid env_info.yaml file")

        out = {}
        for env in env_order:
            if not isinstance(env, str):
                continue
            key = env.strip()
            if not key:
                continue
            out[key.upper()] = ""

        if not out:
            raise HTTPException(status_code=400, detail="invalid env_info.yaml file")

        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load env list: {e}")


@router.get("/deployment_type")
def get_deployment_type():
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
    return {"user": "user1"}
