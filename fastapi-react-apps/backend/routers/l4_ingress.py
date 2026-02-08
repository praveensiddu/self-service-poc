from fastapi import APIRouter
from typing import Any, Dict, List, Optional

from backend.routers.apps import _require_env, L4_INGRESS_BY_ENV_AND_APP

router = APIRouter(tags=["l4_ingress"])


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
    items = L4_INGRESS_BY_ENV_AND_APP.get(env, {}).get(appname, [])
    return _sanitize_l4_ingress_items(items)
