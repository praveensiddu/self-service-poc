from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from pathlib import Path
import logging
import os
import subprocess

import yaml

from backend.config.settings import is_readonly

router = APIRouter(tags=["general"])

logger = logging.getLogger("uvicorn.error")


class KSelfServeConfig(BaseModel):
    workspace: str = ""
    requestsRepo: str = ""
    templatesRepo: str = ""
    renderedManifestsRepo: str = ""
    controlRepo: str = ""


class EnforcementSettings(BaseModel):
    enforce_egress_firewall: str = "yes"
    enforce_egress_ip: str = "yes"


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
        / "apprequests"
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


def _requests_repo_root() -> Path:
    workspace_path = _require_workspace_path()
    return workspace_path / "kselfserv" / "cloned-repositories" / "requests"


def _templates_repo_root() -> Path:
    workspace_path = _require_workspace_path()
    root = workspace_path / "kselfserv" / "cloned-repositories" / "templates"
    if not root.exists() or not root.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")
    return root


def _control_settings_path() -> Path:
    workspace_path = _require_workspace_path()
    return (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / "control"
        / "settings"
        / "settings.yaml"
    )


def _normalize_yes_no(value: Any, default: str = "yes") -> str:
    if value is None:
        return default
    s = str(value).strip().lower()
    if s in ("yes", "y", "true", "1", "on"):
        return "yes"
    if s in ("no", "n", "false", "0", "off"):
        return "no"
    return default


def load_enforcement_settings() -> EnforcementSettings:
    path = _control_settings_path()
    if not path.exists() or not path.is_file():
        return EnforcementSettings()

    try:
        raw = yaml.safe_load(path.read_text()) or {}
    except Exception:
        return EnforcementSettings()

    if not isinstance(raw, dict):
        raw = {}

    return EnforcementSettings(
        enforce_egress_firewall=_normalize_yes_no(raw.get("enforce_egress_firewall"), "yes"),
        enforce_egress_ip=_normalize_yes_no(raw.get("enforce_egress_ip"), "yes"),
    )


def _run_git(repo_dir: Path, args: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(repo_dir), *args],
        check=True,
        capture_output=True,
        text=True,
    )


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


def _normalize_role_catalog(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted({str(x).strip() for x in raw if str(x).strip()}, key=lambda s: s.lower())
    if isinstance(raw, dict):
        v = raw.get("roles", raw.get("role_list", raw.get("items", raw.get("data"))))
        if isinstance(v, list):
            return sorted({str(x).strip() for x in v if str(x).strip()}, key=lambda s: s.lower())

        # Support catalogs shaped like:
        # role-name-1: {}
        # role-name-2: {}
        # ...
        keys = [str(k).strip() for k in raw.keys() if str(k).strip()]
        if keys:
            return sorted(set(keys), key=lambda s: s.lower())
    if isinstance(raw, str):
        s = raw.strip()
        return [s] if s else []
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
        templatesRepo=str(raw.get("templatesRepo", raw.get("TemplatesRepo", "")) or ""),
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
        templates_clone_dir = cloned_repos_dir / "templates"
        control_clone_dir = cloned_repos_dir / "control"
        rendered_clone_dir = cloned_repos_dir / "rendered"
        if requests_clone_dir.exists() and not requests_clone_dir.is_dir():
            raise HTTPException(
                status_code=400,
                detail=f"Expected requests clone path to be a directory: {requests_clone_dir}",
            )

        if templates_clone_dir.exists() and not templates_clone_dir.is_dir():
            raise HTTPException(
                status_code=400,
                detail=f"Expected templates clone path to be a directory: {templates_clone_dir}",
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

        templates_repo_url = str(cfg.templatesRepo or "").strip()
        if templates_repo_url and not templates_clone_dir.exists():
            cloned_repos_dir.mkdir(parents=True, exist_ok=True)
            try:
                subprocess.run(
                    ["git", "clone", templates_repo_url, str(templates_clone_dir)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            except subprocess.CalledProcessError as e:
                stderr = (e.stderr or "").strip()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to clone templatesRepo into {templates_clone_dir}: {stderr}",
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
            "templatesRepo": cfg.templatesRepo or "",
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
            / "apprequests"
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


@router.get("/portal-mode")
def get_portal_mode():
    """Return the portal mode (readonly or not)"""
    return {
        "readonly": is_readonly()
    }


@router.get("/settings/enforcement", response_model=EnforcementSettings)
def get_enforcement_settings():
    return load_enforcement_settings()


@router.put("/settings/enforcement", response_model=EnforcementSettings)
def put_enforcement_settings(payload: EnforcementSettings):
    path = _control_settings_path()

    # Preserve unrelated keys, but always update our two.
    base: Dict[str, Any] = {}
    if path.exists() and path.is_file():
        try:
            raw = yaml.safe_load(path.read_text())
            if isinstance(raw, dict):
                base = dict(raw)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read settings: {e}")

    base["enforce_egress_firewall"] = _normalize_yes_no(payload.enforce_egress_firewall, "yes")
    base["enforce_egress_ip"] = _normalize_yes_no(payload.enforce_egress_ip, "yes")

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(base, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write settings: {e}")

    return EnforcementSettings(
        enforce_egress_firewall=_normalize_yes_no(base.get("enforce_egress_firewall"), "yes"),
        enforce_egress_ip=_normalize_yes_no(base.get("enforce_egress_ip"), "yes"),
    )


@router.get("/catalog/role_refs")
def get_role_refs(kind: str, env: Optional[str] = None):
    kind_key = str(kind or "").strip()
    if kind_key not in ("Role", "ClusterRole"):
        raise HTTPException(status_code=400, detail="Invalid kind; expected Role or ClusterRole")

    templates_root = _templates_repo_root()
    catalog_dir = templates_root / "catalog_roles"
    if kind_key == "Role":
        filename = "role_list.yaml"
    else:
        filename = "clusterrole_list.yaml"

    path = catalog_dir / filename

    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=400, detail="not initialized")

    try:
        raw = yaml.safe_load(path.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read role catalog: {e}")

    base = _normalize_role_catalog(raw)

    env_key = str(env or "").strip()
    if env_key:
        env_path = catalog_dir / env_key / filename
        if env_path.exists() and env_path.is_file():
            try:
                env_raw = yaml.safe_load(env_path.read_text())
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to read env role catalog: {e}")

            env_items = _normalize_role_catalog(env_raw)
            return sorted(set([*base, *env_items]), key=lambda s: s.lower())

    return base


@router.get("/requests/changes")
def get_requests_changes(env: Optional[str] = None):
    env_key = str(env or "").strip().lower()

    repo_root = _requests_repo_root()
    if not repo_root.exists() or not repo_root.is_dir():
        raise HTTPException(status_code=400, detail="not initialized")

    try:
        git_dir = repo_root / ".git"
        if not git_dir.exists() or not git_dir.is_dir():
            raise HTTPException(status_code=400, detail=f"Requests repo is not a git repository: {repo_root}")

        try:
            _run_git(repo_root, ["fetch", "origin"])
        except subprocess.CalledProcessError:
            # If fetch fails (no network, etc.), still try to compute local changes.
            pass

        changed_files: List[str] = []

        # Changes vs origin/main on current branch
        try:
            cp = _run_git(repo_root, ["diff", "--name-only", "origin/main...HEAD"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        # Staged changes
        try:
            cp = _run_git(repo_root, ["diff", "--name-only", "--cached"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        # Unstaged changes
        try:
            cp = _run_git(repo_root, ["diff", "--name-only"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        # Untracked files
        try:
            cp = _run_git(repo_root, ["ls-files", "--others", "--exclude-standard"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        apps_set = set()
        namespaces_set = set()

        for p in changed_files:
            rel = str(p or "").strip().lstrip("/")
            if not rel:
                continue
            if not rel.startswith("apprequests/"):
                continue

            parts = rel.split("/")
            if len(parts) < 4:
                continue

            env_part = str(parts[1] or "").strip().lower()
            app_part = str(parts[2] or "").strip()
            ns_part = str(parts[3] or "").strip()
            if not env_part or not app_part or not ns_part:
                continue

            if env_key and env_part != env_key:
                continue

            apps_set.add(f"{env_part}/{app_part}")
            namespaces_set.add(f"{env_part}/{app_part}/{ns_part}")

        return {
            "env": env_key,
            "apps": sorted(apps_set),
            "namespaces": sorted(namespaces_set),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute requests repo changes: {e}")
