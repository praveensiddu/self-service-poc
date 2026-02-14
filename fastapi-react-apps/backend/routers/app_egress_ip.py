from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, Dict, List, Optional

import yaml

from backend.dependencies import require_env, get_workspace_path
from backend.auth.rbac import require_rbac
from backend.repositories.namespace_repository import NamespaceRepository
from backend.utils.yaml_utils import read_yaml_dict, write_yaml_dict

router = APIRouter(tags=["egress_ip"])



@router.get("/apps/{appname}/egress_ips")
def get_egress_ips(
    appname: str,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method, app_id=lambda r: r.path_params.get("appname", ""))),
):
    env = require_env(env)

    # Build mapping: egress_nameid -> [namespace, ...]
    target_app = str(appname or "").strip()
    egress_nameid_to_namespaces: Dict[str, List[str]] = {}
    try:
        ns_dirs = NamespaceRepository.list_namespaces(env, target_app)
    except Exception:
        ns_dirs = []
    for ns_dir in ns_dirs:
        ns_name = str(getattr(ns_dir, "name", "") or "").strip()
        if not ns_name:
            continue
        try:
            ns_info = NamespaceRepository.read_namespace_info(env, target_app, ns_name)
        except Exception:
            ns_info = {}
        raw_egress_nameid = ns_info.get("egress_nameid")
        egress_nameid = str(raw_egress_nameid or "").strip()
        if not egress_nameid:
            continue
        prev = egress_nameid_to_namespaces.get(egress_nameid) or []
        prev.append(ns_name)
        egress_nameid_to_namespaces[egress_nameid] = prev

    workspace_path = get_workspace_path()
    rendered_root = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
        / "ip_provisioning"
    )
    if not rendered_root.exists() or not rendered_root.is_dir():
        return []

    target_prefix = f"{str(appname or '').strip()}_"
    merged: Dict[str, List[Dict[str, Any]]] = {}

    for path in rendered_root.rglob("egressip-allocated.yaml"):
        if not path.is_file():
            continue

        # rendered_<env>/ip_provisioning/<cluster>/egressip-allocated.yaml
        # cluster is the immediate parent directory under ip_provisioning.
        cluster = ""
        try:
            cluster = str(path.parent.name or "").strip()
        except Exception:
            cluster = ""

        try:
            raw = yaml.safe_load(path.read_text()) or {}
        except Exception:
            continue
        if not isinstance(raw, dict):
            continue

        for k, v in raw.items():
            key = str(k or "").strip()
            if not key.startswith(target_prefix):
                continue
            ips = [str(x).strip() for x in v] if isinstance(v, list) else []
            ips = [x for x in ips if x]
            if not ips:
                continue

            row_key = f"{cluster}::{key}"
            prev_rows = merged.get(row_key) or []
            prev_ips: List[str] = []
            if prev_rows:
                existing_any = prev_rows[0].get("allocated_ips")
                prev_ips = [str(x).strip() for x in existing_any] if isinstance(existing_any, list) else []
                prev_ips = [x for x in prev_ips if x]

            seen = set(prev_ips)
            for ip in ips:
                if ip in seen:
                    continue
                prev_ips.append(ip)
                seen.add(ip)

            egress_nameid = ""
            if key.startswith(target_prefix):
                egress_nameid = key[len(target_prefix):]

            namespaces = egress_nameid_to_namespaces.get(str(egress_nameid)) or []
            namespaces = sorted(set([str(x).strip() for x in namespaces if str(x).strip()]), key=lambda s: s.lower())

            merged[row_key] = [{
                "cluster": cluster,
                "allocation_id": key,
                "allocated_ips": prev_ips,
                "namespaces": namespaces,
            }]

    out: List[Dict[str, Any]] = []
    for row_key in sorted(merged.keys(), key=lambda s: s.lower()):
        rows = merged.get(row_key) or []
        if not rows:
            continue
        out.append(rows[0])
    return out


@router.delete("/apps/{appname}/egress_ips")
def delete_egress_ip_allocation(
    appname: str,
    cluster: str,
    allocation_id: str,
    env: Optional[str] = None,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method, app_id=lambda r: r.path_params.get("appname", ""))),
):
    env = require_env(env)

    target_app = str(appname or "").strip()
    target_cluster = str(cluster or "").strip()
    target_alloc = str(allocation_id or "").strip()

    if not target_cluster:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing cluster")
    if not target_alloc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing allocation_id")
    if not target_alloc.startswith(f"{target_app}_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="allocation_id must start with '<appname>_'",
        )

    egress_nameid = str(target_alloc[len(f"{target_app}_"):]).strip()
    if not egress_nameid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid allocation_id")

    # Prevent delete if any namespaces still reference this egress_nameid
    used_by: List[str] = []
    try:
        ns_dirs = NamespaceRepository.list_namespaces(env, target_app)
    except Exception:
        ns_dirs = []
    for ns_dir in ns_dirs:
        ns_name = str(getattr(ns_dir, "name", "") or "").strip()
        if not ns_name:
            continue
        try:
            ns_info = NamespaceRepository.read_namespace_info(env, target_app, ns_name)
        except Exception:
            ns_info = {}
        raw_egress_nameid = ns_info.get("egress_nameid")
        if str(raw_egress_nameid or "").strip() == egress_nameid:
            used_by.append(ns_name)

    if used_by:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot remove allocation_id '{target_alloc}' because it is used by namespaces: {', '.join(sorted(set(used_by)))}",
        )

    workspace_path = get_workspace_path()
    allocated_path = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
        / "ip_provisioning"
        / target_cluster
        / "egressip-allocated.yaml"
    )
    if not allocated_path.exists() or not allocated_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="egressip-allocated.yaml not found")

    raw = read_yaml_dict(allocated_path)
    if target_alloc not in raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="allocation_id not found")

    try:
        del raw[target_alloc]
        write_yaml_dict(allocated_path, raw, sort_keys=False)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to remove allocation: {e}")

    return {"deleted": True}
