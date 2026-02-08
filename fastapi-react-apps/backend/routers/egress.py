from fastapi import APIRouter, HTTPException
from typing import Optional

import logging
import yaml

from backend.routers.apps import _require_env
from backend.routers.general import load_enforcement_settings
from backend.routers import pull_requests
from backend.routers.ns_models import NamespaceInfoEgressRequest
from backend.routers.namespaces import _parse_bool, _require_namespace_dir

router = APIRouter(tags=["egress"])

logger = logging.getLogger("uvicorn.error")


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

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    egress_nameid = existing.get("egress_nameid")
    egress_nameid = None if egress_nameid in (None, "") else str(egress_nameid)
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
