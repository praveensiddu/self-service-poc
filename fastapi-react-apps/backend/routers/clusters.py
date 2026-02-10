from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from pathlib import Path
import logging
import os
import ipaddress

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
            if not s:
                continue
            out.append(s)
        return out
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return []
        return [p.strip() for p in s.split(",") if p.strip()]
    return []


def _is_valid_ip(value: str) -> bool:
    s = str(value or "").strip()
    if not s:
        return True
    try:
        ipaddress.ip_address(s)
        return True
    except Exception:
        return False


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

    ranges_raw = item.get(
        "l4_ingress_ip_ranges",
        item.get("l4IngressIpRanges", item.get("l4_ingress_ipranges", item.get("l4IngressIpRanges"))),
    )
    ranges_out: List[Dict[str, str]] = []
    if isinstance(ranges_raw, list):
        for r in ranges_raw:
            if not isinstance(r, dict):
                continue
            start_ip = str(r.get("start_ip", r.get("startIp", r.get("startip", ""))) or "").strip()
            end_ip = str(r.get("end_ip", r.get("endIp", r.get("endip", ""))) or "").strip()
            if not start_ip and not end_ip:
                continue
            if not _is_valid_ip(start_ip) or not _is_valid_ip(end_ip):
                continue
            ranges_out.append({"start_ip": start_ip, "end_ip": end_ip})

    egress_ranges_raw = item.get(
        "egress_ip_ranges",
        item.get("egressIpRanges", item.get("egress_ipranges", item.get("egressIpRanges"))),
    )
    egress_ranges_out: List[Dict[str, str]] = []
    if isinstance(egress_ranges_raw, list):
        for r in egress_ranges_raw:
            if not isinstance(r, dict):
                continue
            start_ip = str(r.get("start_ip", r.get("startIp", r.get("startip", ""))) or "").strip()
            end_ip = str(r.get("end_ip", r.get("endIp", r.get("endip", ""))) or "").strip()
            if not start_ip and not end_ip:
                continue
            if not _is_valid_ip(start_ip) or not _is_valid_ip(end_ip):
                continue
            egress_ranges_out.append({"start_ip": start_ip, "end_ip": end_ip})
    return {
        "clustername": clustername,
        "purpose": purpose,
        "datacenter": datacenter,
        "applications": sorted(set(applications), key=lambda s: s.lower()),
        "l4_ingress_ip_ranges": ranges_out,
        "egress_ip_ranges": egress_ranges_out,
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
    l4_ingress_ip_ranges: Optional[List[Dict[str, str]]] = None
    egress_ip_ranges: Optional[List[Dict[str, str]]] = None


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
        "l4_ingress_ip_ranges": [],
        "egress_ip_ranges": [],
    }

    try:
        ranges_out: List[Dict[str, str]] = []
        if isinstance(payload.l4_ingress_ip_ranges, list):
            for r in payload.l4_ingress_ip_ranges:
                if not isinstance(r, dict):
                    continue
                start_ip = str(r.get("start_ip", r.get("startIp", r.get("startip", ""))) or "").strip()
                end_ip = str(r.get("end_ip", r.get("endIp", r.get("endip", ""))) or "").strip()
                if not start_ip and not end_ip:
                    continue
                if start_ip and not _is_valid_ip(start_ip):
                    raise HTTPException(status_code=400, detail=f"Invalid start_ip: {start_ip}")
                if end_ip and not _is_valid_ip(end_ip):
                    raise HTTPException(status_code=400, detail=f"Invalid end_ip: {end_ip}")
                ranges_out.append({"start_ip": start_ip, "end_ip": end_ip})
        normalized["l4_ingress_ip_ranges"] = ranges_out
    except HTTPException:
        raise
    except Exception:
        normalized["l4_ingress_ip_ranges"] = []

    try:
        ranges_out: List[Dict[str, str]] = []
        if isinstance(payload.egress_ip_ranges, list):
            for r in payload.egress_ip_ranges:
                if not isinstance(r, dict):
                    continue
                start_ip = str(r.get("start_ip", r.get("startIp", r.get("startip", ""))) or "").strip()
                end_ip = str(r.get("end_ip", r.get("endIp", r.get("endip", ""))) or "").strip()
                if not start_ip and not end_ip:
                    continue
                if start_ip and not _is_valid_ip(start_ip):
                    raise HTTPException(status_code=400, detail=f"Invalid start_ip: {start_ip}")
                if end_ip and not _is_valid_ip(end_ip):
                    raise HTTPException(status_code=400, detail=f"Invalid end_ip: {end_ip}")
                ranges_out.append({"start_ip": start_ip, "end_ip": end_ip})
        normalized["egress_ip_ranges"] = ranges_out
    except HTTPException:
        raise
    except Exception:
        normalized["egress_ip_ranges"] = []

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


@router.get("/clusters/{clustername}/can-delete")
def check_cluster_can_delete(clustername: str, env: Optional[str] = None):
    """
    Check if a cluster can be safely deleted.
    Returns information about dependencies that would prevent deletion.
    """
    env_key = str(env or "").strip().lower()
    if not env_key:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")

    name = str(clustername or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="clustername is required")

    try:
        requests_root = _require_initialized_workspace()
        workspace_path = _require_workspace_path()
    except HTTPException:
        return {"can_delete": True, "namespaces": [], "l4_ingress_allocations": [], "egress_allocations": []}

    env_dir = requests_root / env_key
    namespaces_using_cluster = []
    l4_ingress_allocations = []
    egress_allocations = []

    # Check namespaces using this cluster
    if env_dir.exists() and env_dir.is_dir():
        for app_dir in env_dir.iterdir():
            if not app_dir.is_dir():
                continue
            appname = app_dir.name

            for ns_dir in app_dir.iterdir():
                if not ns_dir.is_dir():
                    continue
                ns_info_path = ns_dir / "namespace_info.yaml"
                if not ns_info_path.exists() or not ns_info_path.is_file():
                    continue
                try:
                    ns_info = yaml.safe_load(ns_info_path.read_text()) or {}
                    if not isinstance(ns_info, dict):
                        continue
                    clusters_list = ns_info.get("clusters")
                    if not isinstance(clusters_list, list):
                        continue
                    # Check if this cluster is in the list
                    if any(str(c or "").strip().lower() == name.lower() for c in clusters_list):
                        namespaces_using_cluster.append({
                            "app": appname,
                            "namespace": ns_dir.name
                        })
                except Exception as e:
                    logger.error(
                        "Failed to check namespace_info.yaml for %s/%s/%s: %s",
                        env_key, app_dir.name, ns_dir.name, str(e)
                    )

            # Check L4 ingress allocations
            l4_ingress_request_path = app_dir / "l4_ingress_request.yaml"
            if l4_ingress_request_path.exists() and l4_ingress_request_path.is_file():
                try:
                    l4_data = yaml.safe_load(l4_ingress_request_path.read_text()) or {}
                    if isinstance(l4_data, dict) and name in l4_data:
                        l4_ingress_allocations.append({
                            "app": appname,
                            "cluster": name
                        })
                except Exception as e:
                    logger.error(
                        "Failed to check l4_ingress_request.yaml for %s/%s: %s",
                        env_key, app_dir.name, str(e)
                    )

    # Check allocated L4 ingress IPs
    try:
        allocated_dir = (
            workspace_path
            / "kselfserv"
            / "cloned-repositories"
            / f"rendered_{env_key}"
            / "ip_provisioning"
            / name
        )
        if allocated_dir.exists() and allocated_dir.is_dir():
            allocated_file = allocated_dir / "l4ingressip-allocated.yaml"
            if allocated_file.exists():
                try:
                    allocated_data = yaml.safe_load(allocated_file.read_text()) or []
                    if allocated_data and len(allocated_data) > 0:
                        l4_ingress_allocations.append({
                            "app": "system",
                            "cluster": name,
                            "note": "Has allocated L4 ingress IPs"
                        })
                except Exception:
                    pass
    except Exception as e:
        logger.error(
            "Failed to check allocated L4 ingress IPs for cluster %s: %s",
            name, str(e)
        )

    # Check egress IP allocations (if applicable)
    # Similar structure for egress IPs if they exist in your system
    try:
        egress_allocated_dir = (
            workspace_path
            / "kselfserv"
            / "cloned-repositories"
            / f"rendered_{env_key}"
            / "egress_provisioning"
            / name
        )
        if egress_allocated_dir.exists() and egress_allocated_dir.is_dir():
            egress_allocated_file = egress_allocated_dir / "egressip-allocated.yaml"
            if egress_allocated_file.exists():
                try:
                    egress_data = yaml.safe_load(egress_allocated_file.read_text()) or []
                    if egress_data and len(egress_data) > 0:
                        egress_allocations.append({
                            "app": "system",
                            "cluster": name,
                            "note": "Has allocated egress IPs"
                        })
                except Exception:
                    pass
    except Exception as e:
        logger.error(
            "Failed to check allocated egress IPs for cluster %s: %s",
            name, str(e)
        )

    can_delete = (
        len(namespaces_using_cluster) == 0 and
        len(l4_ingress_allocations) == 0 and
        len(egress_allocations) == 0
    )

    return {
        "can_delete": can_delete,
        "namespaces": namespaces_using_cluster,
        "l4_ingress_allocations": l4_ingress_allocations,
        "egress_allocations": egress_allocations
    }


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

    # Check if cluster can be deleted
    check_result = check_cluster_can_delete(clustername=name, env=env_key)
    if not check_result["can_delete"]:
        error_details = {
            "message": "Cannot delete cluster - it is currently in use",
            "namespaces": check_result["namespaces"],
            "l4_ingress_allocations": check_result["l4_ingress_allocations"],
            "egress_allocations": check_result["egress_allocations"]
        }
        raise HTTPException(status_code=409, detail=error_details)

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

    # Clean up cluster references from all namespace files and L4 ingress requests
    if deleted:
        try:
            requests_root = _require_initialized_workspace()
            workspace_path = _require_workspace_path()
            env_dir = requests_root / env_key

            # Clean up allocated L4 ingress IPs for this cluster
            try:
                allocated_dir = (
                    workspace_path
                    / "kselfserv"
                    / "cloned-repositories"
                    / f"rendered_{env_key}"
                    / "ip_provisioning"
                    / name
                )
                if allocated_dir.exists() and allocated_dir.is_dir():
                    allocated_file = allocated_dir / "l4ingressip-allocated.yaml"
                    if allocated_file.exists():
                        allocated_file.unlink()
                        logger.info(
                            "Removed allocated L4 ingress IPs for cluster %s in env %s",
                            name, env_key
                        )
                    # Remove the cluster directory if it's empty
                    try:
                        if allocated_dir.exists() and not any(allocated_dir.iterdir()):
                            allocated_dir.rmdir()
                    except Exception:
                        pass
            except Exception as e:
                logger.error(
                    "Failed to clean up allocated L4 ingress IPs for cluster %s: %s",
                    name, str(e)
                )

            if env_dir.exists() and env_dir.is_dir():
                for app_dir in env_dir.iterdir():
                    if not app_dir.is_dir():
                        continue

                    # Clean up L4 ingress requests for this cluster
                    l4_ingress_request_path = app_dir / "l4_ingress_request.yaml"
                    if l4_ingress_request_path.exists() and l4_ingress_request_path.is_file():
                        try:
                            l4_data = yaml.safe_load(l4_ingress_request_path.read_text()) or {}
                            if isinstance(l4_data, dict) and name in l4_data:
                                del l4_data[name]
                                l4_ingress_request_path.write_text(yaml.safe_dump(l4_data, sort_keys=False))
                                logger.info(
                                    "Removed cluster %s from L4 ingress requests for app %s/%s",
                                    name, env_key, app_dir.name
                                )
                        except Exception as e:
                            logger.error(
                                "Failed to update l4_ingress_request.yaml for %s/%s: %s",
                                env_key, app_dir.name, str(e)
                            )

                    for ns_dir in app_dir.iterdir():
                        if not ns_dir.is_dir():
                            continue
                        ns_info_path = ns_dir / "namespace_info.yaml"
                        if not ns_info_path.exists() or not ns_info_path.is_file():
                            continue
                        try:
                            ns_info = yaml.safe_load(ns_info_path.read_text()) or {}
                            if not isinstance(ns_info, dict):
                                continue
                            clusters_list = ns_info.get("clusters")
                            if not isinstance(clusters_list, list):
                                continue
                            # Remove the deleted cluster from the list
                            updated_clusters = [
                                c for c in clusters_list
                                if str(c or "").strip().lower() != name.lower()
                            ]
                            if len(updated_clusters) != len(clusters_list):
                                ns_info["clusters"] = updated_clusters
                                ns_info_path.write_text(yaml.safe_dump(ns_info, sort_keys=False))
                                logger.info(
                                    "Removed cluster %s from namespace %s/%s/%s",
                                    name, env_key, app_dir.name, ns_dir.name
                                )
                        except Exception as e:
                            logger.error(
                                "Failed to update namespace_info.yaml for %s/%s/%s: %s",
                                env_key, app_dir.name, ns_dir.name, str(e)
                            )
        except Exception as e:
            logger.error("Failed to clean up cluster references from namespaces: %s", str(e))

    return {"deleted": deleted}
