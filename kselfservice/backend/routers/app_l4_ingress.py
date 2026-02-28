from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, List, Optional
import ipaddress
import logging
from pathlib import Path

import yaml

from backend.models import L4IngressRequestedUpdate, L4IngressReleaseIpRequest
from backend.dependencies import (
    require_env,
    require_initialized_workspace,
    get_requests_root,
    get_workspace_path,
    require_control_clusters_root,
)
from backend.routers.allocate_l4_ingress import _load_cluster_first_range
from backend.routers.clusters import get_allocated_clusters_for_app
from backend.utils.yaml_utils import read_yaml_dict, write_yaml_dict
from backend.auth.rbac import require_rbac, get_current_user_context, wrap_response_with_permissions

router = APIRouter(tags=["l4_ingress"])

logger = logging.getLogger("uvicorn.error")



def _sanitize_allocations(allocations: Any) -> List[Dict[str, Any]]:
    if not isinstance(allocations, list):
        return []
    sanitized: List[Dict[str, Any]] = []
    for a in allocations:
        if not isinstance(a, dict):
            continue
        out: Dict[str, Any] = {}
        if "name" in a:
            out["name"] = a.get("name")
        if "purpose" in a:
            out["purpose"] = a.get("purpose")
        if "ips" in a:
            out["ips"] = a.get("ips")
        sanitized.append(out)
    return sanitized


@router.get("/l4_ingress/free_pool")
def get_l4_ingress_free_pool(
    clustername: str,
    env: Optional[str] = None,
    _: Dict[str, Any] = Depends(get_current_user_context),
):
    env = require_env(env)
    c = str(clustername or "").strip()
    if not c:
        raise HTTPException(status_code=400, detail="clustername is required")

    workspace_path = get_workspace_path()
    allocated_path = _allocated_file_for_cluster(workspace_path=workspace_path, env=env, clustername=c)
    allocated_yaml = _load_allocated_yaml(allocated_path)

    clusters_root = require_control_clusters_root()
    first_range = _load_cluster_first_range(clusters_root=clusters_root, env=env, clustername=c)
    if not first_range:
        return {
            "clustername": c,
            "capacity": 0,
            "allocated_in_range": 0,
            "free_remaining": 0,
        }

    try:
        start_int = int(ipaddress.ip_address(str(first_range.get("start_ip") or "").strip()))
        end_int = int(ipaddress.ip_address(str(first_range.get("end_ip") or "").strip()))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid l4_ingress_ip_ranges configured for this cluster")

    lo = min(start_int, end_int)
    hi = max(start_int, end_int)
    capacity = (hi - lo) + 1
    if capacity <= 0:
        return {
            "clustername": c,
            "capacity": 0,
            "allocated_in_range": 0,
            "free_remaining": 0,
        }

    allocated_in_range: set[int] = set()
    if isinstance(allocated_yaml, dict):
        for v in allocated_yaml.values():
            for ip in v:
                allocated_in_range.add(ip)

    free_remaining = capacity - len(allocated_in_range)

    return {
        "clustername": c,
        "capacity": capacity,
        "allocated_in_range": len(allocated_in_range),
        "free_remaining": max(free_remaining, 0),
    }


def _allocated_file_for_cluster(*, workspace_path: Path, env: str, clustername: str) -> Path:
    return (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
        / "ip_provisioning"
        / str(clustername).strip()
        / "l4ingressip-allocated.yaml"
    )


def _key_for_app_purpose(*, appname: str, purpose: str) -> str:
    a = str(appname or "").strip()
    p = str(purpose or "").strip()
    return f"l4ingress_{a}_{p}"


def _load_allocated_yaml(path: Path) -> Dict[str, Any]:
    """Helper function for backward compatibility."""
    return read_yaml_dict(path)


def _sanitize_l4_ingress_items(items: Any) -> List[Dict[str, Any]]:
    if not isinstance(items, list):
        return []

    sanitized: List[Dict[str, Any]] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        out: Dict[str, Any] = {}
        for k in ["clustername", "requested_total", "allocated_total"]:
            if k in it:
                out[k] = it.get(k)

        out["allocations"] = _sanitize_allocations(it.get("allocations"))
        sanitized.append(out)
    return sanitized


@router.get("/apps/{appname}/l4_ingress")
def get_l4_ingress(
    appname: str,
    env: Optional[str] = None,
    user_context: Dict[str, Any] = Depends(get_current_user_context)
):
    """Get L4 ingress allocations for an application with permissions.

    This endpoint is open to users with view permission for the app.
    Returns permissions for manage actions (edit/allocate).

    Args:
        appname: Application name
        env: Environment name

    Returns:
        List of L4 ingress allocations with permissions
    """
    env = require_env(env)
    requests_root = get_requests_root()
    workspace_path = get_workspace_path()

    allocated_clusters: List[str] = []
    try:
        allocated_clusters = get_allocated_clusters_for_app(env=env, app=str(appname or ""))
    except HTTPException:
        allocated_clusters = []
    except Exception as e:
        logger.error("Failed to load allocated clusters for %s/%s: %s", str(env), str(appname), str(e))
        allocated_clusters = []

    req_path = requests_root / env / str(appname or "").strip() / "l4_ingress_request.yaml"
    raw: Dict[str, Any] = {}
    if req_path.exists() and req_path.is_file():
        try:
            loaded = yaml.safe_load(req_path.read_text()) or {}
            if isinstance(loaded, dict):
                raw = loaded
        except Exception as e:
            logger.error("Failed to read l4_ingress_request.yaml for %s/%s: %s", str(env), str(appname), str(e))
            raw = {}

    out: List[Dict[str, Any]] = []
    seen_clusters: set[str] = set()

    for clustername, purposes in raw.items():
        if not isinstance(purposes, dict):
            continue
        seen_clusters.add(str(clustername))
        for purpose, requested_total in purposes.items():
            try:
                req_total_int = int(requested_total)
            except Exception:
                req_total_int = 0
            clustername_s = str(clustername)
            purpose_s = str(purpose)
            allocated_path = _allocated_file_for_cluster(workspace_path=workspace_path, env=env, clustername=clustername_s)
            allocated_yaml = _load_allocated_yaml(allocated_path)
            key = _key_for_app_purpose(appname=str(appname or ""), purpose=purpose_s)
            ips = allocated_yaml.get(key)
            ips_list = [str(x).strip() for x in ips] if isinstance(ips, list) else []
            ips_list = [x for x in ips_list if x]
            out.append(
                {
                    "clustername": clustername_s,
                    "purpose": purpose_s,
                    "requested_total": req_total_int,
                    "allocated_total": len(ips_list),
                    "allocations": ([{"name": key, "purpose": purpose_s, "ips": ips_list}] if ips_list else []),
                }
            )

    # Ensure one row per allocated cluster (even if no request exists yet).
    for c in allocated_clusters:
        if str(c) in seen_clusters:
            continue
        clustername_s = str(c)
        purpose_s = str(appname or "")
        allocated_path = _allocated_file_for_cluster(workspace_path=workspace_path, env=env, clustername=clustername_s)
        allocated_yaml = _load_allocated_yaml(allocated_path)
        key = _key_for_app_purpose(appname=str(appname or ""), purpose=purpose_s)
        ips = allocated_yaml.get(key)
        ips_list = [str(x).strip() for x in ips] if isinstance(ips, list) else []
        ips_list = [x for x in ips_list if x]
        out.append(
            {
                "clustername": clustername_s,
                "purpose": purpose_s,
                "requested_total": 0,
                "allocated_total": len(ips_list),
                "allocations": ([{"name": key, "purpose": purpose_s, "ips": ips_list}] if ips_list else []),
            }
        )

    # Return with permissions using helper
    return wrap_response_with_permissions(
        out, user_context, f"/apps/{appname}/l4_ingress", {"id": appname}
    )


@router.put("/apps/{appname}/l4_ingress")
def put_l4_ingress_requested(
    appname: str,
    payload: L4IngressRequestedUpdate,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method, app_id=lambda r: r.path_params.get("appname", ""))),
):
    env = require_env(env)
    requests_root = require_initialized_workspace()

    clustername = str(payload.clustername or "").strip()
    purpose = str(payload.purpose or "").strip()
    if not clustername:
        raise HTTPException(status_code=400, detail="clustername is required")
    if not purpose:
        raise HTTPException(status_code=400, detail="purpose is required")

    requested_total = int(payload.requested_total)
    if requested_total < 0 or requested_total > 256:
        raise HTTPException(status_code=400, detail="requested_total must be between 0 and 256")

    # Prevent reducing requested_total below the number of already-allocated IPs.
    # Allocations are stored in rendered workspace per cluster in l4ingressip-allocated.yaml.
    workspace_path = get_workspace_path()
    allocated_path = _allocated_file_for_cluster(workspace_path=workspace_path, env=env, clustername=clustername)
    allocated_yaml = _load_allocated_yaml(allocated_path)
    key = _key_for_app_purpose(appname=str(appname or ""), purpose=purpose)
    existing_ips = allocated_yaml.get(key)
    existing_ips_list = [str(x).strip() for x in existing_ips] if isinstance(existing_ips, list) else []
    existing_ips_list = [x for x in existing_ips_list if x]
    allocated_total = len(existing_ips_list)
    if requested_total < allocated_total:
        raise HTTPException(
            status_code=400,
            detail=f"requested_total ({requested_total}) cannot be less than allocated_total ({allocated_total}). Use the release ip feature to release the ip your don't need.",
        )

    first_range: Optional[Dict[str, str]] = None
    # Match allocate endpoint behavior: if a cluster doesn't have any configured L4 ingress
    # ranges, we should not allow a non-zero requested_total for that cluster.
    if requested_total > 0:
        clusters_root = require_control_clusters_root()
        first_range = _load_cluster_first_range(clusters_root=clusters_root, env=env, clustername=clustername)
        if not first_range:
            raise HTTPException(status_code=400, detail="No l4_ingress_ip_ranges configured for this cluster")

    req_path = requests_root / env / str(appname or "").strip() / "l4_ingress_request.yaml"
    try:
        req_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create request directory: {e}")

    raw: Dict[str, Any] = {}
    if req_path.exists() and req_path.is_file():
        try:
            loaded = yaml.safe_load(req_path.read_text()) or {}
            if isinstance(loaded, dict):
                raw = loaded
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read l4_ingress_request.yaml: {e}")

    if not isinstance(raw, dict):
        raw = {}

    cluster_map = raw.get(clustername)
    if cluster_map is None or not isinstance(cluster_map, dict):
        cluster_map = {}

    prev_requested_any = cluster_map.get(purpose)
    try:
        prev_requested_total = int(prev_requested_any)
    except Exception:
        prev_requested_total = 0

    delta = requested_total - prev_requested_total

    # Validate that the free IP pool can accommodate the increase.
    # Free pool = (cluster range capacity) - (already allocated IPs in range across all apps/purposes).
    if delta > 0:
        if not first_range:
            clusters_root = require_control_clusters_root()
            first_range = _load_cluster_first_range(clusters_root=clusters_root, env=env, clustername=clustername)
        if not first_range:
            raise HTTPException(status_code=400, detail="No l4_ingress_ip_ranges configured for this cluster")

        try:
            start_int = int(ipaddress.ip_address(str(first_range.get("start_ip") or "").strip()))
            end_int = int(ipaddress.ip_address(str(first_range.get("end_ip") or "").strip()))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid l4_ingress_ip_ranges configured for this cluster")

        lo = min(start_int, end_int)
        hi = max(start_int, end_int)
        capacity = (hi - lo) + 1
        if capacity <= 0:
            raise HTTPException(status_code=400, detail="Invalid l4_ingress_ip_ranges configured for this cluster")

        allocated_in_range: set[int] = set()
        if isinstance(allocated_yaml, dict):
            for v in allocated_yaml.values():
                if not isinstance(v, list):
                    continue
                for ip_s in v:
                    try:
                        ip_i = int(ipaddress.ip_address(str(ip_s).strip()))
                    except Exception:
                        continue
                    if lo <= ip_i <= hi:
                        allocated_in_range.add(ip_i)

        free_remaining = capacity - len(allocated_in_range)
        if delta > free_remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough free IPs remaining in cluster range. Free IPs remaining: {max(free_remaining, 0)}",
            )

    raw[clustername] = cluster_map
    cluster_map[purpose] = requested_total

    try:
        req_path.write_text(yaml.safe_dump(raw, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write l4_ingress_request.yaml: {e}")

    return {
        "clustername": clustername,
        "purpose": purpose,
        "requested_total": requested_total,
        "allocated_total": allocated_total,
        "allocations": ([{"name": key, "purpose": purpose, "ips": existing_ips_list}] if existing_ips_list else []),
    }


@router.post("/apps/{appname}/l4_ingress/release")
def release_l4_ingress_ip(
    appname: str,
    payload: L4IngressReleaseIpRequest,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method, app_id=lambda r: r.path_params.get("appname", ""))),
):
    env = require_env(env)
    requests_root = require_initialized_workspace()

    clustername = str(payload.clustername or "").strip()
    purpose = str(payload.purpose or "").strip()
    ip = str(payload.ip or "").strip()
    if not clustername:
        raise HTTPException(status_code=400, detail="clustername is required")
    if not purpose:
        raise HTTPException(status_code=400, detail="purpose is required")
    if not ip:
        raise HTTPException(status_code=400, detail="ip is required")

    workspace_path = get_workspace_path()
    allocated_path = _allocated_file_for_cluster(workspace_path=workspace_path, env=env, clustername=clustername)
    allocated_yaml = _load_allocated_yaml(allocated_path)

    key = _key_for_app_purpose(appname=str(appname or ""), purpose=purpose)
    existing_ips = allocated_yaml.get(key)
    existing_ips_list = [str(x).strip() for x in existing_ips] if isinstance(existing_ips, list) else []
    existing_ips_list = [x for x in existing_ips_list if x]

    if ip not in existing_ips_list:
        raise HTTPException(status_code=404, detail="IP not allocated for this app/purpose")

    next_list = [x for x in existing_ips_list if x != ip]
    if next_list:
        allocated_yaml[key] = next_list
    else:
        try:
            allocated_yaml.pop(key, None)
        except Exception:
            allocated_yaml[key] = []

    try:
        allocated_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create allocation directory: {e}")

    try:
        write_yaml_dict(allocated_path, allocated_yaml, sort_keys=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write allocated yaml: {e}")

    # If release succeeded, reduce the requested count in l4_ingress_request.yaml.
    req_path = requests_root / env / str(appname or "").strip() / "l4_ingress_request.yaml"
    raw: Dict[str, Any] = {}
    if req_path.exists() and req_path.is_file():
        try:
            loaded = yaml.safe_load(req_path.read_text()) or {}
            if isinstance(loaded, dict):
                raw = loaded
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read l4_ingress_request.yaml: {e}")

    cluster_map = raw.get(clustername)
    if cluster_map is None or not isinstance(cluster_map, dict):
        cluster_map = {}

    prev_any = cluster_map.get(purpose)
    try:
        prev_requested_total = int(prev_any)
    except Exception:
        prev_requested_total = 0

    next_requested_total = max(prev_requested_total - 1, 0)
    raw[clustername] = cluster_map
    cluster_map[purpose] = next_requested_total

    try:
        req_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create request directory: {e}")

    try:
        req_path.write_text(yaml.safe_dump(raw, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write l4_ingress_request.yaml: {e}")

    return {
        "clustername": clustername,
        "purpose": purpose,
        "released_ip": ip,
        "requested_total": next_requested_total,
        "allocated_total": len(next_list),
        "allocations": ([{"name": key, "purpose": purpose, "ips": next_list}] if next_list else []),
    }
