from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional, Set

import ipaddress
import logging
from pathlib import Path
import yaml

from backend.routers.apps import _require_env
from backend.routers.apps import _require_control_clusters_root
from backend.routers.apps import _require_workspace_path
from backend.routers.general import load_enforcement_settings
from backend.routers import pull_requests
from backend.routers.ns_models import NamespaceInfoEgressRequest
from backend.routers.namespaces import _parse_bool, _require_namespace_dir

router = APIRouter(tags=["egress"])

logger = logging.getLogger("uvicorn.error")


def _egress_allocated_file_for_cluster(*, workspace_path: Path, env: str, cluster_no: str) -> Path:
    return (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
        / "ip_provisioning"
        / str(cluster_no).strip()
        / "egressip-allocated.yaml"
    )


def _load_allocated_yaml(path: Path) -> Dict[str, Any]:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
    except Exception:
        return {}
    return raw if isinstance(raw, dict) else {}


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


def _cluster_id_from_item(item: Dict[str, Any]) -> str:
    for k in ["clustername", "cluster_no", "name", "cluster"]:
        v = item.get(k)
        if v is None:
            continue
        s = str(v).strip()
        if s:
            return s
    return ""


def _normalize_ranges(value: Any) -> List[Dict[str, str]]:
    if not isinstance(value, list):
        return []
    out: List[Dict[str, str]] = []
    for r in value:
        if not isinstance(r, dict):
            continue
        start_ip = str(r.get("start_ip") or r.get("startIp") or "").strip()
        end_ip = str(r.get("end_ip") or r.get("endIp") or "").strip()
        if not (start_ip or end_ip):
            continue
        out.append({"start_ip": start_ip, "end_ip": end_ip})
    return out


def _load_cluster_egress_ranges(*, env: str, cluster_no: str) -> List[Dict[str, str]]:
    clusters_root = _require_control_clusters_root()
    file_path = _clusters_file_for_env(clusters_root, env)
    items = _load_clusters_from_file(file_path)
    target = str(cluster_no or "").strip()
    if not target:
        return []

    for it in items:
        if _cluster_id_from_item(it) != target:
            continue
        return _normalize_ranges(it.get("egress_ip_ranges") or it.get("egressIpRanges") or [])
    return []


def _collect_allocated_ips(allocated_yaml: Dict[str, Any]) -> Set[int]:
    out: Set[int] = set()
    if not isinstance(allocated_yaml, dict):
        return out
    for v in allocated_yaml.values():
        if not isinstance(v, list):
            continue
        for ip_s in v:
            try:
                out.add(int(ipaddress.ip_address(str(ip_s).strip())))
            except Exception:
                continue
    return out


def _allocate_first_free_ip(*, ranges: List[Dict[str, str]], allocated: Set[int]) -> str:
    for r in ranges:
        try:
            lo = int(ipaddress.ip_address(str(r.get("start_ip") or "").strip()))
            hi = int(ipaddress.ip_address(str(r.get("end_ip") or "").strip()))
        except Exception:
            continue
        if hi < lo:
            lo, hi = hi, lo

        for ip_i in range(lo, hi + 1):
            if ip_i in allocated:
                continue
            try:
                return str(ipaddress.ip_address(ip_i))
            except Exception:
                continue
    return ""


@router.put("/apps/{appname}/namespaces/{namespace}/namespace_info/egress")
def put_namespace_info_egress(appname: str, namespace: str, payload: NamespaceInfoEgressRequest, env: Optional[str] = None):
    env = _require_env(env)

    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)
    ns_info_path = ns_dir / "namespace_info.yaml"

    try:
        existing = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            parsed = yaml.safe_load(ns_info_path.read_text()) or {}
            if isinstance(parsed, dict):
                existing = parsed

        ni = payload.namespace_info
        if ni.egress_nameid is not None:
            existing["egress_nameid"] = str(ni.egress_nameid)
        if ni.enable_pod_based_egress_ip is not None:
            existing["enable_pod_based_egress_ip"] = bool(ni.enable_pod_based_egress_ip)

        ns_info_path.write_text(yaml.safe_dump(existing, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update namespace_info.yaml: {e}")

    # If egress_nameid is set, ensure an IP is allocated for this namespace in each cluster.
    egress_nameid_raw = existing.get("egress_nameid")
    egress_nameid = None if egress_nameid_raw in (None, "") else str(egress_nameid_raw).strip()
    if egress_nameid:
        clusters_any = existing.get("clusters")
        clusters_list = clusters_any if isinstance(clusters_any, list) else []
        clusters_list = [str(c).strip() for c in clusters_list if c is not None and str(c).strip()]

        workspace_path = _require_workspace_path()
        alloc_key = f"{str(appname or '').strip()}_{str(egress_nameid or '').strip()}"

        for cluster_no in clusters_list:
            allocated_path = _egress_allocated_file_for_cluster(workspace_path=workspace_path, env=env, cluster_no=cluster_no)
            allocated_yaml = _load_allocated_yaml(allocated_path)

            existing_ips_for_key = allocated_yaml.get(alloc_key)
            existing_ip_list = [str(x).strip() for x in existing_ips_for_key] if isinstance(existing_ips_for_key, list) else []
            existing_ip_list = [x for x in existing_ip_list if x]
            if existing_ip_list:
                continue

            ranges = _load_cluster_egress_ranges(env=env, cluster_no=cluster_no)
            if not ranges:
                raise HTTPException(status_code=400, detail=f"No egress_ip_ranges configured for cluster {cluster_no}")

            allocated_all = _collect_allocated_ips(allocated_yaml)
            new_ip = _allocate_first_free_ip(ranges=ranges, allocated=allocated_all)
            if not new_ip:
                raise HTTPException(status_code=400, detail=f"No free egress IPs remaining for cluster {cluster_no}")

            allocated_yaml[alloc_key] = [new_ip]
            try:
                allocated_path.parent.mkdir(parents=True, exist_ok=True)
                allocated_path.write_text(yaml.safe_dump(allocated_yaml, sort_keys=False))
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to persist egress IP allocation for cluster {cluster_no}: {e}")

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return {
        "egress_nameid": egress_nameid,
        "enable_pod_based_egress_ip": _parse_bool(existing.get("enable_pod_based_egress_ip")),
    }


@router.get("/apps/{appname}/namespaces/{namespace}/namespace_info/egress")
def get_namespace_info_egress(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)

    enforcement = load_enforcement_settings()
    egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"

    ns_info_path = ns_dir / "namespace_info.yaml"
    ns_info = {}
    if ns_info_path.exists() and ns_info_path.is_file():
        try:
            parsed = yaml.safe_load(ns_info_path.read_text()) or {}
            if isinstance(parsed, dict):
                ns_info = parsed
        except Exception:
            ns_info = {}

    egress_nameid = ns_info.get("egress_nameid")
    egress_nameid = None if egress_nameid in (None, "") else str(egress_nameid)

    return {
        "egress_nameid": egress_nameid,
        "enable_pod_based_egress_ip": _parse_bool(ns_info.get("enable_pod_based_egress_ip")),
        "allow_all_egress": (not egress_firewall_enforced) or _parse_bool(ns_info.get("allow_all_egress")),
    }
