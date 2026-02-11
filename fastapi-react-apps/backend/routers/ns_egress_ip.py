from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, List, Optional, Set

import ipaddress
import logging
from pathlib import Path
import yaml

from backend.dependencies import require_env, get_workspace_path
from backend.routers import pull_requests
from backend.models import NamespaceInfoEgressRequest
from backend.services.namespace_details_service import NamespaceDetailsService
from backend.utils.yaml_utils import read_yaml_dict
from backend.services.cluster_service import ClusterService
from backend.repositories.cluster_repository import ClusterRepository

router = APIRouter(tags=["egress"])

logger = logging.getLogger("uvicorn.error")

# Initialize services
cluster_service = ClusterService()
cluster_repo = ClusterRepository()


def get_namespace_details_service() -> NamespaceDetailsService:
    """Dependency injection for NamespaceDetailsService."""
    return NamespaceDetailsService()


def _egress_allocated_file_for_cluster(*, workspace_path: Path, env: str, cluster_no: str) -> Path:
    """Get path to egress allocated file for a cluster."""
    return (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
        / "ip_provisioning"
        / str(cluster_no).strip()
        / "egressip-allocated.yaml"
    )


def _collect_allocated_ips(allocated_yaml: Dict[str, Any]) -> Set[int]:
    """Collect all allocated IPs from the allocation YAML."""
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
    """Allocate the first free IP from the given ranges."""
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
def put_namespace_info_egress(
    appname: str,
    namespace: str,
    payload: NamespaceInfoEgressRequest,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Update egress information for a namespace."""
    env = require_env(env)

    ni = payload.namespace_info
    result = service.update_egress_info(
        env,
        appname,
        namespace,
        egress_nameid=ni.egress_nameid,
        enable_pod_based_egress_ip=ni.enable_pod_based_egress_ip,
    )

    # If egress_nameid is set, ensure an IP is allocated for this namespace in each cluster.
    egress_nameid = result.get("egress_nameid")
    if egress_nameid:
        clusters_list = result.get("clusters", [])
        clusters_list = [str(c).strip() for c in clusters_list if c is not None and str(c).strip()]

        workspace_path = get_workspace_path()
        alloc_key = f"{str(appname or '').strip()}_{str(egress_nameid or '').strip()}"

        for cluster_no in clusters_list:
            allocated_path = _egress_allocated_file_for_cluster(
                workspace_path=workspace_path,
                env=env,
                cluster_no=cluster_no
            )
            allocated_yaml = read_yaml_dict(allocated_path)

            existing_ips_for_key = allocated_yaml.get(alloc_key)
            existing_ip_list = [str(x).strip() for x in existing_ips_for_key] if isinstance(existing_ips_for_key, list) else []
            existing_ip_list = [x for x in existing_ip_list if x]
            if existing_ip_list:
                continue

            ranges = cluster_service.get_cluster_egress_ranges(env, cluster_no)
            if not ranges:
                raise HTTPException(
                    status_code=400,
                    detail=f"No egress_ip_ranges configured for cluster {cluster_no}"
                )

            allocated_all = _collect_allocated_ips(allocated_yaml)
            new_ip = _allocate_first_free_ip(ranges=ranges, allocated=allocated_all)
            if not new_ip:
                raise HTTPException(
                    status_code=400,
                    detail=f"No free egress IPs remaining for cluster {cluster_no}"
                )

            allocated_yaml[alloc_key] = [new_ip]
            try:
                allocated_path.parent.mkdir(parents=True, exist_ok=True)
                allocated_path.write_text(yaml.safe_dump(allocated_yaml, sort_keys=False))
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to persist egress IP allocation for cluster {cluster_no}: {e}"
                )

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return {
        "egress_nameid": result.get("egress_nameid"),
        "enable_pod_based_egress_ip": result.get("enable_pod_based_egress_ip"),
    }


@router.get("/apps/{appname}/namespaces/{namespace}/namespace_info/egress")
def get_namespace_info_egress(
    appname: str,
    namespace: str,
    env: Optional[str] = None,
    service: NamespaceDetailsService = Depends(get_namespace_details_service)
):
    """Get egress information for a namespace."""
    env = require_env(env)
    return service.get_egress_info(env, appname, namespace)
