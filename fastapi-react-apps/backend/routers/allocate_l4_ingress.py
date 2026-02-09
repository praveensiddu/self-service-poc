from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional, Set
from pathlib import Path
import ipaddress
import logging

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace, _require_workspace_path, _require_control_clusters_root

router = APIRouter(tags=["allocate_l4_ingress"])

logger = logging.getLogger("uvicorn.error")


class AllocateL4IngressRequest(BaseModel):
    cluster_no: str
    purpose: str


def _key_for_app_purpose(*, appname: str, purpose: str) -> str:
    a = str(appname or "").strip()
    p = str(purpose or "").strip()
    return f"l4ingress_{a}_{p}"


def _allocated_file_for_cluster(*, workspace_path: Path, env: str, cluster_no: str) -> Path:
    return (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
        / "ip_provisioning"
        / str(cluster_no).strip()
        / "l4ingressip-allocated.yaml"
    )


def _load_yaml_dict(path: Path) -> Dict[str, Any]:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text())
    except Exception:
        return {}
    return raw if isinstance(raw, dict) else {}


def _write_yaml_dict(path: Path, payload: Dict[str, Any]) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(payload, sort_keys=False))
    except Exception as e:
        logger.error("Failed to write allocated yaml %s: %s", str(path), str(e))
        raise HTTPException(status_code=500, detail=f"Failed to write allocated yaml: {e}")


def _load_requested_total(*, requests_root: Path, env: str, appname: str, cluster_no: str, purpose: str) -> int:
    req_path = requests_root / str(env).strip().lower() / str(appname or "").strip() / "l4_ingress_request.yaml"
    raw = _load_yaml_dict(req_path)

    cluster_map = raw.get(str(cluster_no))
    if not isinstance(cluster_map, dict):
        return 0

    value = cluster_map.get(str(purpose))
    if value is None:
        return 0

    try:
        n = int(value)
    except Exception:
        return 0

    if n < 0:
        return 0
    if n > 256:
        return 256
    return n


def _load_cluster_first_range(*, clusters_root: Path, env: str, cluster_no: str) -> Optional[Dict[str, str]]:
    env_key = str(env or "").strip().lower()
    clusters_path = clusters_root / f"{env_key}_clusters.yaml"
    if not clusters_path.exists() or not clusters_path.is_file():
        raise HTTPException(status_code=404, detail=f"Clusters file not found: {clusters_path}")

    try:
        raw = yaml.safe_load(clusters_path.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read clusters yaml: {e}")

    items: List[Dict[str, Any]] = []
    if isinstance(raw, list):
        items = [x for x in raw if isinstance(x, dict)]
    elif isinstance(raw, dict):
        items = [raw]

    target = str(cluster_no or "").strip().lower()
    for it in items:
        cname = str(it.get("clustername", it.get("clusterName", it.get("name", ""))) or "").strip().lower()
        if not cname or cname != target:
            continue
        ranges = it.get("l4_ingress_ip_ranges")
        if not isinstance(ranges, list) or not ranges:
            return None
        first = ranges[0]
        if not isinstance(first, dict):
            return None
        start_ip = str(first.get("start_ip") or "").strip()
        end_ip = str(first.get("end_ip") or "").strip()
        if not start_ip or not end_ip:
            return None
        return {"start_ip": start_ip, "end_ip": end_ip}

    return None


def _collect_all_allocated_ips(allocated_yaml: Dict[str, Any]) -> Set[str]:
    out: Set[str] = set()
    for v in allocated_yaml.values():
        if not isinstance(v, list):
            continue
        for x in v:
            s = str(x or "").strip()
            if s:
                out.add(s)
    return out


def _allocate_from_range(*, start_ip: str, end_ip: str, count: int, already_allocated: Set[str]) -> List[str]:
    if count <= 0:
        return []

    try:
        start = ipaddress.ip_address(str(start_ip).strip())
        end = ipaddress.ip_address(str(end_ip).strip())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid l4_ingress_ip_ranges start/end IP")

    if start.version != 4 or end.version != 4:
        raise HTTPException(status_code=400, detail="Only IPv4 allocation is supported")

    s = int(start)
    e = int(end)
    if s > e:
        raise HTTPException(status_code=400, detail="Invalid l4_ingress_ip_ranges: start_ip > end_ip")

    out: List[str] = []
    for i in range(s, e + 1):
        ip_str = str(ipaddress.IPv4Address(i))
        if ip_str in already_allocated:
            continue
        out.append(ip_str)
        already_allocated.add(ip_str)
        if len(out) >= count:
            break

    return out


@router.post("/apps/{appname}/l4_ingress/allocate")
def allocate_l4_ingress(appname: str, payload: AllocateL4IngressRequest, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()
    workspace_path = _require_workspace_path()
    clusters_root = _require_control_clusters_root()

    cluster_no = str(payload.cluster_no or "").strip()
    purpose = str(payload.purpose or "").strip()
    if not cluster_no:
        raise HTTPException(status_code=400, detail="cluster_no is required")
    if not purpose:
        raise HTTPException(status_code=400, detail="purpose is required")

    requested_total = _load_requested_total(
        requests_root=requests_root,
        env=env,
        appname=str(appname or "").strip(),
        cluster_no=cluster_no,
        purpose=purpose,
    )

    key = _key_for_app_purpose(appname=str(appname or ""), purpose=purpose)
    allocated_path = _allocated_file_for_cluster(workspace_path=workspace_path, env=env, cluster_no=cluster_no)
    allocated_yaml = _load_yaml_dict(allocated_path)

    existing_ips_any = _collect_all_allocated_ips(allocated_yaml)
    existing_for_key = allocated_yaml.get(key)
    existing_for_key_list = [str(x).strip() for x in existing_for_key] if isinstance(existing_for_key, list) else []
    existing_for_key_list = [x for x in existing_for_key_list if x]

    allocated_total = len(existing_for_key_list)
    if allocated_total >= requested_total:
        return {
            "env": env,
            "app": str(appname or ""),
            "cluster_no": cluster_no,
            "purpose": purpose,
            "requested_total": requested_total,
            "allocated_total": allocated_total,
            "key": key,
            "allocated_ips": existing_for_key_list,
            "newly_allocated_ips": [],
        }

    to_allocate = requested_total - allocated_total

    first_range = _load_cluster_first_range(clusters_root=clusters_root, env=env, cluster_no=cluster_no)
    if not first_range:
        raise HTTPException(status_code=400, detail="No l4_ingress_ip_ranges configured for this cluster")

    new_ips = _allocate_from_range(
        start_ip=first_range["start_ip"],
        end_ip=first_range["end_ip"],
        count=to_allocate,
        already_allocated=existing_ips_any,
    )

    if not new_ips:
        raise HTTPException(status_code=400, detail="No available IPs left in cluster range")

    merged = existing_for_key_list + new_ips
    allocated_yaml[key] = merged
    _write_yaml_dict(allocated_path, allocated_yaml)

    return {
        "env": env,
        "app": str(appname or ""),
        "cluster_no": cluster_no,
        "purpose": purpose,
        "requested_total": requested_total,
        "allocated_total": len(merged),
        "key": key,
        "allocated_ips": merged,
        "newly_allocated_ips": new_ips,
    }
