from fastapi import APIRouter, HTTPException, Response
from typing import Optional

import logging
import yaml

from backend.routers.apps import _require_env
from backend.routers.namespaces import (
    NamespaceLimitRangeUpdate,
    NamespaceResourcesLimits,
    NamespaceResourcesYamlRequest,
    _as_trimmed_str,
    _reload_namespace_details,
    _require_namespace_dir,
)
from backend.routers import pull_requests

router = APIRouter(tags=["limitrange"])

logger = logging.getLogger("uvicorn.error")

__all__ = [
    "_build_limitrange_file_obj",
    "_limits_from_limitrange",
    "_parse_limitrange_manifest",
]


def _is_set(v: Optional[str]) -> bool:
    s = str(v or "").strip()
    return bool(s) and s != "0"


def _parse_limitrange_manifest(path) -> dict:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _build_limitrange_obj(namespace: str, limits: Optional[NamespaceResourcesLimits]) -> dict:
    default_request = {}
    default = {}

    if limits is not None:
        if _is_set(limits.cpu):
            default_request["cpu"] = str(limits.cpu).strip()
        if _is_set(limits.memory):
            default_request["memory"] = str(limits.memory).strip()
        if _is_set(limits.ephemeral_storage):
            default_request["ephemeral-storage"] = str(limits.ephemeral_storage).strip()

        if limits.default is not None:
            if _is_set(limits.default.cpu):
                default["cpu"] = str(limits.default.cpu).strip()
            if _is_set(limits.default.memory):
                default["memory"] = str(limits.default.memory).strip()
            if _is_set(limits.default.ephemeral_storage):
                default["ephemeral-storage"] = str(limits.default.ephemeral_storage).strip()

    limit_entry = {
        "type": "Container",
    }
    if default:
        limit_entry["default"] = default
    if default_request:
        limit_entry["defaultRequest"] = default_request

    return {
        "apiVersion": "v1",
        "kind": "LimitRange",
        "metadata": {
            "name": "default",
            "namespace": namespace,
        },
        "spec": {
            "limits": [limit_entry],
        },
    }


def _build_limitrange_file_obj(namespace: str, limits: Optional[NamespaceResourcesLimits]) -> dict:
    return _build_limitrange_obj(namespace=namespace, limits=limits)


def _limits_from_limitrange(limitrange: dict) -> dict:
    spec = limitrange.get("spec") if isinstance(limitrange, dict) else None
    limits_list = spec.get("limits") if isinstance(spec, dict) else None
    first = limits_list[0] if isinstance(limits_list, list) and len(limits_list) > 0 and isinstance(limits_list[0], dict) else {}

    default_request = first.get("defaultRequest") if isinstance(first, dict) else None
    default_obj = first.get("default") if isinstance(first, dict) else None

    out = {
        "cpu": _as_trimmed_str(default_request.get("cpu")) if isinstance(default_request, dict) else None,
        "memory": _as_trimmed_str(default_request.get("memory")) if isinstance(default_request, dict) else None,
        "ephemeral-storage": _as_trimmed_str(default_request.get("ephemeral-storage")) if isinstance(default_request, dict) else None,
        "default": None,
    }

    default_out = {
        "cpu": _as_trimmed_str(default_obj.get("cpu")) if isinstance(default_obj, dict) else None,
        "memory": _as_trimmed_str(default_obj.get("memory")) if isinstance(default_obj, dict) else None,
        "ephemeral-storage": _as_trimmed_str(default_obj.get("ephemeral-storage")) if isinstance(default_obj, dict) else None,
    }

    if any(v is not None for v in default_out.values()):
        out["default"] = default_out

    return out


@router.post("/apps/{appname}/namespaces/{namespace}/resources/limitrange_yaml")
def get_limitrange_yaml(appname: str, namespace: str, payload: NamespaceResourcesYamlRequest, env: Optional[str] = None):
    env = _require_env(env)

    limits = payload.resources.limits if payload and payload.resources is not None else None
    lr_obj = _build_limitrange_obj(namespace=namespace, limits=limits)
    yaml_text = yaml.safe_dump(lr_obj, sort_keys=False)
    return Response(content=yaml_text, media_type="text/yaml")


@router.put("/apps/{appname}/namespaces/{namespace}/resources/limitrange")
def put_namespace_limitrange(appname: str, namespace: str, payload: NamespaceLimitRangeUpdate, env: Optional[str] = None):
    env = _require_env(env)
    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)

    limitrange_path = ns_dir / "limitrange.yaml"
    try:
        lr_obj = _build_limitrange_file_obj(namespace=namespace, limits=payload.limits)
        limitrange_path.write_text(yaml.safe_dump(lr_obj, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write limitrange.yaml: {e}")

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return _reload_namespace_details(env=env, appname=appname, namespace=namespace, ns_dir=ns_dir)
