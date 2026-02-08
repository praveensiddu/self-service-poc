from fastapi import APIRouter
from typing import Any, Dict, List, Optional
import logging

import yaml

from backend.routers.apps import _require_env, _require_initialized_workspace

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

    req_path = requests_root / env / str(appname or "").strip() / "l4_ingress_request.yaml"
    if not req_path.exists() or not req_path.is_file():
        return []

    try:
        raw = yaml.safe_load(req_path.read_text()) or {}
    except Exception as e:
        logger.error("Failed to read l4_ingress_request.yaml for %s/%s: %s", str(env), str(appname), str(e))
        return []

    if not isinstance(raw, dict):
        return []

    out: List[Dict[str, Any]] = []
    for cluster_no, purposes in raw.items():
        if not isinstance(purposes, dict):
            continue
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

    return out
