from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from pathlib import Path
import logging
import os
import subprocess

import yaml

router = APIRouter(tags=["general"])

logger = logging.getLogger("uvicorn.error")


class KSelfServeConfig(BaseModel):
    workspace: str = ""
    requestsRepo: str = ""
    renderedManifestsRepo: str = ""
    controlRepo: str = ""


def _config_path() -> Path:
    return Path.home() / ".kselfserve" / "kselfserveconfig.yaml"


def _require_workspace_path() -> Path:
    cfg_path = _config_path()
    if not cfg_path.exists():
        raise HTTPException(status_code=400, detail="not initialized")

    try:
        raw_cfg = yaml.safe_load(cfg_path.read_text()) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")

    if not isinstance(raw_cfg, dict):
        raise HTTPException(status_code=400, detail="not initialized")

    workspace = str(raw_cfg.get("workspace", "") or "").strip()
    if not workspace:
        raise HTTPException(status_code=400, detail="not initialized")

    workspace_path = Path(workspace).expanduser()
    if not workspace_path.exists() or not workspace_path.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")

    return workspace_path


def _require_initialized_workspace() -> Path:
    workspace_path = _require_workspace_path()

    requests_root = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / "requests"
        / "app-requests"
    )
    if not requests_root.exists() or not requests_root.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")

    return requests_root


def _require_control_clusters_root() -> Optional[Path]:
    workspace_path = _require_workspace_path()

    clusters_root = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / "control"
        / "clusters"
    )
    if not clusters_root.exists() or not clusters_root.is_dir():
        logger.error(
            "Control clusters directory not found or not a directory: %s",
            str(clusters_root),
        )
        return None

    return clusters_root


def _as_string_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        out: List[str] = []
        for v in value:
            if v is None:
                continue
            s = str(v).strip()
            if s:
                out.append(s)
        return out
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return []
        return [p.strip() for p in s.split(",") if p.strip()]
    return []


def _parse_cluster_documents(path: Path) -> List[Dict[str, Any]]:
    try:
        raw = yaml.safe_load(path.read_text())
    except Exception:
        return []

    items: List[Dict[str, Any]] = []
    if isinstance(raw, list):
        for x in raw:
            if isinstance(x, dict):
                items.append(x)
    elif isinstance(raw, dict):
        items.append(raw)
    return items


def _clusters_file_for_env(clusters_root: Path, env: str) -> Path:
    key = str(env or "").strip().lower()
    return clusters_root / f"{key}_clusters.yaml"


def _load_clusters_from_file(path: Path) -> List[Dict[str, Any]]:
    if not path.exists() or not path.is_file():
        return []
    try:
        raw = yaml.safe_load(path.read_text())
    except Exception:
        return []
    if raw is None:
        return []
    if isinstance(raw, list):
        return [x for x in raw if isinstance(x, dict)]
    if isinstance(raw, dict):
        return [raw]
    return []


def _normalize_cluster_item(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    raw_clustername = item.get("clustername", item.get("clusterName", item.get("name")))
    clustername = str(raw_clustername or "").strip()
    if not clustername:
        return None
    purpose = str(item.get("purpose", "") or "")
    datacenter = str(item.get("datacenter", "") or "")
    applications = _as_string_list(item.get("applications"))
    return {
        "clustername": clustername,
        "purpose": purpose,
        "datacenter": datacenter,
        "applications": sorted(set(applications), key=lambda s: s.lower()),
    }


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
        rendered_clone_dir = cloned_repos_dir / "rendered"
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

        if rendered_clone_dir.exists() and not rendered_clone_dir.is_dir():
            raise HTTPException(
                status_code=400,
                detail=f"Expected rendered clone path to be a directory: {rendered_clone_dir}",
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

        rendered_repo_url = str(cfg.renderedManifestsRepo or "").strip()
        if rendered_repo_url:
            if not rendered_clone_dir.exists():
                cloned_repos_dir.mkdir(parents=True, exist_ok=True)
                try:
                    subprocess.run(
                        ["git", "clone", rendered_repo_url, str(rendered_clone_dir)],
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                except subprocess.CalledProcessError as e:
                    stderr = (e.stderr or "").strip()
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to clone renderedManifestsRepo into {rendered_clone_dir}: {stderr}",
                    )
            else:
                try:
                    git_dir = rendered_clone_dir / ".git"
                    if git_dir.exists() and git_dir.is_dir():
                        subprocess.run(
                            ["git", "-C", str(rendered_clone_dir), "fetch", "--all"],
                            check=True,
                            capture_output=True,
                            text=True,
                        )
                        subprocess.run(
                            ["git", "-C", str(rendered_clone_dir), "pull", "--ff-only"],
                            check=True,
                            capture_output=True,
                            text=True,
                        )
                except subprocess.CalledProcessError as e:
                    stderr = (e.stderr or "").strip()
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to update renderedManifestsRepo in {rendered_clone_dir}: {stderr}",
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
