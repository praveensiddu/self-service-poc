from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
import logging

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace
from backend.routers.clusters import get_allocated_clusters_for_app

router = APIRouter(tags=["l4_ingress"])

logger = logging.getLogger("uvicorn.error")


class L4IngressRequestedUpdate(BaseModel):
    cluster_no: str
    purpose: str
    requested_total: int


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


def _sanitize_l4_ingress_items(items: Any) -> List[Dict[str, Any]]:
    if not isinstance(items, list):
        return []

    sanitized: List[Dict[str, Any]] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        out: Dict[str, Any] = {}
        for k in ["cluster_no", "requested_total", "allocated_total"]:
            if k in it:
                out[k] = it.get(k)

        out["allocations"] = _sanitize_allocations(it.get("allocations"))
        sanitized.append(out)
    return sanitized


@router.get("/apps/{appname}/l4_ingress")
def get_l4_ingress(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

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

    for cluster_no, purposes in raw.items():
        if not isinstance(purposes, dict):
            continue
        seen_clusters.add(str(cluster_no))
        for purpose, requested_total in purposes.items():
            try:
                req_total_int = int(requested_total)
            except Exception:
                req_total_int = 0
            out.append(
                {
                    "cluster_no": str(cluster_no),
                    "purpose": str(purpose),
                    "requested_total": req_total_int,
                    "allocated_total": 0,
                    "allocations": [],
                }
            )

    # Ensure one row per allocated cluster (even if no request exists yet).
    for c in allocated_clusters:
        if str(c) in seen_clusters:
            continue
        out.append(
            {
                "cluster_no": str(c),
                "purpose": str(appname or ""),
                "requested_total": 0,
                "allocated_total": 0,
                "allocations": [],
            }
        )

    return out


@router.put("/apps/{appname}/l4_ingress")
def put_l4_ingress_requested(appname: str, payload: L4IngressRequestedUpdate, env: Optional[str] = None):
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    cluster_no = str(payload.cluster_no or "").strip()
    purpose = str(payload.purpose or "").strip()
    if not cluster_no:
        raise HTTPException(status_code=400, detail="cluster_no is required")
    if not purpose:
        raise HTTPException(status_code=400, detail="purpose is required")

    requested_total = int(payload.requested_total)
    if requested_total < 0 or requested_total > 256:
        raise HTTPException(status_code=400, detail="requested_total must be between 0 and 256")

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

    cluster_map = raw.get(cluster_no)
    if cluster_map is None or not isinstance(cluster_map, dict):
        cluster_map = {}
        raw[cluster_no] = cluster_map

    cluster_map[purpose] = requested_total

    try:
        req_path.write_text(yaml.safe_dump(raw, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write l4_ingress_request.yaml: {e}")

    return {
        "cluster_no": cluster_no,
        "purpose": purpose,
        "requested_total": requested_total,
        "allocated_total": 0,
        "allocations": [],
    }
