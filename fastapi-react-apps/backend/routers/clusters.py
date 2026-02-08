from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from pathlib import Path
import logging
import os

import yaml

router = APIRouter(tags=["clusters"])

logger = logging.getLogger("uvicorn.error")


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


def _ensure_appinfo_exists(requests_root: Path, env_key: str, appname: str) -> None:
    env_dir = requests_root / str(env_key or "").strip().lower()
    app_dir = env_dir / str(appname or "").strip()
    appinfo_path = app_dir / "appinfo.yaml"

    if appinfo_path.exists():
        return

    app_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "appname": str(appname or "").strip(),
        "description": "",
        "managedby": "",
    }
    appinfo_path.write_text(yaml.safe_dump(payload, sort_keys=False))


def get_allocated_clusters_for_app(
    *,
    env: str,
    app: str,
    clusters_root: Optional[Path] = None,
) -> List[str]:
    clusters_root = clusters_root or _require_control_clusters_root()
    if clusters_root is None:
        return []

    env_key = str(env or "").strip().lower()
    app_key = str(app or "").strip()
    if not env_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")
    if not app_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: app")

    file_path = _clusters_file_for_env(clusters_root, env_key)
    items = _load_clusters_from_file(file_path)

    out_clusters: List[str] = []
    for item in items:
        normalized = _normalize_cluster_item(item)
        if not normalized:
            continue
        apps = _as_string_list(normalized.get("applications"))
        if any(str(a).strip().lower() == app_key.lower() for a in apps):
            cname = str(normalized.get("clustername") or "").strip()
            if cname:
                out_clusters.append(cname)

    return sorted(set(out_clusters), key=lambda s: s.lower())


@router.get("/clusters")
def get_clusters(env: Optional[str] = None, app: Optional[str] = None):
    clusters_root = _require_control_clusters_root()
    if clusters_root is None:
        return {}

    try:
        requests_root = _require_initialized_workspace()
    except HTTPException:
        requests_root = None

    if app is not None:
        return get_allocated_clusters_for_app(env=str(env or ""), app=str(app or ""), clusters_root=clusters_root)

    if env is not None and not str(env or "").strip():
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    envs: List[str]
    if env is not None:
        envs = [str(env).strip()]
    else:
        envs = []
        try:
            envs = [k for k in yaml.safe_load((requests_root / "env_info.yaml").read_text()).get("env_order", [])] if requests_root is not None else []
        except Exception:
            envs = []
        if not envs:
            envs = sorted({p.name.split("_clusters.yaml")[0] for p in clusters_root.iterdir() if p.is_file() and p.name.endswith("_clusters.yaml")})

    out: Dict[str, List[Dict[str, Any]]] = {}
    for e in envs:
        derived_apps_by_cluster: Dict[str, List[str]] = {}
        env_requests_dir = (requests_root / str(e).strip().lower()) if requests_root is not None else None
        if env_requests_dir is not None and env_requests_dir.exists() and env_requests_dir.is_dir():
            for app_dir in env_requests_dir.iterdir():
                if not app_dir.is_dir():
                    continue
                appname = app_dir.name
                appinfo_path = app_dir / "appinfo.yaml"
                if not appinfo_path.exists() or not appinfo_path.is_file():
                    continue
                try:
                    appinfo = yaml.safe_load(appinfo_path.read_text()) or {}
                except Exception:
                    continue
                if not isinstance(appinfo, dict):
                    continue
                clusters = _as_string_list(appinfo.get("clusters"))
                for c in clusters:
                    derived_apps_by_cluster.setdefault(c, []).append(appname)

        file_path = _clusters_file_for_env(clusters_root, str(e))
        items = _load_clusters_from_file(file_path)
        rows: List[Dict[str, Any]] = []
        for item in items:
            normalized = _normalize_cluster_item(item)
            if not normalized:
                continue
            if not normalized.get("applications"):
                cname = str(normalized.get("clustername") or "")
                normalized["applications"] = sorted(
                    set(_as_string_list(derived_apps_by_cluster.get(cname))),
                    key=lambda s: s.lower(),
                )
            rows.append(normalized)

        rows = sorted(rows, key=lambda r: str(r.get("clustername") or "").lower())
        out[str(e).strip().upper()] = rows

    return out


class ClusterUpsert(BaseModel):
    clustername: str
    purpose: str = ""
    datacenter: str = ""
    applications: Optional[List[str]] = None


@router.post("/clusters")
def add_cluster(payload: ClusterUpsert, env: Optional[str] = None):
    clusters_root = _require_control_clusters_root()
    if clusters_root is None:
        workspace_path = _require_workspace_path()
        clusters_root = (
            workspace_path
            / "kselfserv"
            / "cloned-repositories"
            / "control"
            / "clusters"
        )
        clusters_root.mkdir(parents=True, exist_ok=True)

    env_key = str(env or "").strip().lower()
    if not env_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    clustername = str(payload.clustername or "").strip()
    if not clustername:
        raise HTTPException(status_code=400, detail="clustername is required")

    file_path = _clusters_file_for_env(clusters_root, env_key)
    clusters = _load_clusters_from_file(file_path)

    normalized = {
        "clustername": clustername,
        "purpose": str(payload.purpose or ""),
        "datacenter": str(payload.datacenter or ""),
        "applications": sorted(set(_as_string_list(payload.applications)), key=lambda s: s.lower()),
    }

    try:
        requests_root = _require_initialized_workspace()
        for appname in list(normalized.get("applications") or []):
            key = str(appname or "").strip()
            if not key:
                continue
            _ensure_appinfo_exists(requests_root, env_key, key)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create appinfo.yaml: {e}")

    replaced = False
    for i, item in enumerate(clusters):
        raw = item.get("clustername", item.get("clusterName", item.get("name"))) if isinstance(item, dict) else None
        if str(raw or "").strip().lower() == clustername.lower():
            clusters[i] = normalized
            replaced = True
            break
    if not replaced:
        clusters.append(normalized)

    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(yaml.safe_dump(clusters, sort_keys=False))
    except Exception as e:
        logger.error("Failed to write clusters file %s: %s", str(file_path), str(e))
        raise HTTPException(status_code=500, detail="failed")

    return {"env": env_key.upper(), "cluster": normalized}


@router.delete("/clusters/{clustername}")
def delete_cluster(clustername: str, env: Optional[str] = None):
    clusters_root = _require_control_clusters_root()
    if clusters_root is None:
        return {"deleted": False}

    env_key = str(env or "").strip().lower()
    if not env_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    name = str(clustername or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="clustername is required")

    file_path = _clusters_file_for_env(clusters_root, env_key)
    clusters = _load_clusters_from_file(file_path)

    next_items: List[Dict[str, Any]] = []
    deleted = False
    for item in clusters:
        raw = item.get("clustername", item.get("clusterName", item.get("name"))) if isinstance(item, dict) else None
        if str(raw or "").strip().lower() == name.lower():
            deleted = True
            continue
        next_items.append(item)

    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(yaml.safe_dump(next_items, sort_keys=False))
    except Exception as e:
        logger.error("Failed to write clusters file %s: %s", str(file_path), str(e))
        raise HTTPException(status_code=500, detail="failed")

    return {"deleted": deleted}
