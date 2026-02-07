from fastapi import APIRouter, HTTPException, Response
from typing import Optional

import logging

import yaml

from backend.routers.apps import _require_env
from backend.routers.namespaces import (
    NamespaceResourcesCpuMem,
    NamespaceResourcesQuotaLimits,
    NamespaceResourcesYamlRequest,
    NamespaceResourceQuotaUpdate,
    _reload_namespace_details,
    _require_namespace_dir,
)
from backend.routers import pull_requests

router = APIRouter(tags=["resourcequota"])

logger = logging.getLogger("uvicorn.error")

__all__ = [
    "_parse_resourcequota_manifest",
    "_requests_and_quota_limits_from_resourcequota",
    "_build_resourcequota_file_obj",
]


def _is_set(v: Optional[str]) -> bool:
    s = str(v or "").strip()
    return bool(s) and s != "0"


def _parse_resourcequota_manifest(path) -> dict:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _as_trimmed_str(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _requests_and_quota_limits_from_resourcequota(resourcequota: dict) -> tuple[dict, dict]:
    spec = resourcequota.get("spec") if isinstance(resourcequota, dict) else None
    hard = spec.get("hard") if isinstance(spec, dict) else None
    hard = hard if isinstance(hard, dict) else {}

    requests = {
        "cpu": _as_trimmed_str(hard.get("requests.cpu")),
        "memory": _as_trimmed_str(hard.get("requests.memory")),
        "ephemeral-storage": _as_trimmed_str(hard.get("requests.ephemeral-storage")),
    }
    quota_limits = {
        "memory": _as_trimmed_str(hard.get("limits.memory")),
        "ephemeral-storage": _as_trimmed_str(hard.get("limits.ephemeral-storage")),
    }

    return requests, quota_limits


def _build_resourcequota_obj(
    namespace: str,
    requests: Optional[NamespaceResourcesCpuMem],
    quota_limits: Optional[NamespaceResourcesQuotaLimits],
) -> dict:
    hard = {}

    if quota_limits is not None:
        if _is_set(quota_limits.ephemeral_storage):
            hard["limits.ephemeral-storage"] = str(quota_limits.ephemeral_storage).strip()
        if _is_set(quota_limits.memory):
            hard["limits.memory"] = str(quota_limits.memory).strip()

    if requests is not None:
        if _is_set(requests.cpu):
            hard["requests.cpu"] = str(requests.cpu).strip()
        if _is_set(requests.memory):
            hard["requests.memory"] = str(requests.memory).strip()
        if _is_set(requests.ephemeral_storage):
            hard["requests.ephemeral-storage"] = str(requests.ephemeral_storage).strip()

    return {
        "apiVersion": "v1",
        "kind": "ResourceQuota",
        "metadata": {
            "name": f"{namespace}-quota",
            "namespace": namespace,
        },
        "spec": {
            "hard": hard,
        },
    }


@router.get("/apps/{appname}/namespaces/{namespace}/resources/resourcequota")
def get_namespace_resourcequota(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)

    resourcequota_path = ns_dir / "resourcequota.yaml"
    rq = _parse_resourcequota_manifest(resourcequota_path)
    reqs, quota_limits = _requests_and_quota_limits_from_resourcequota(rq)

    return {
        "requests": {
            "cpu": reqs.get("cpu"),
            "memory": reqs.get("memory"),
            "ephemeral-storage": reqs.get("ephemeral-storage"),
        },
        "quota_limits": {
            "memory": quota_limits.get("memory"),
            "ephemeral-storage": quota_limits.get("ephemeral-storage"),
        },
    }


def _build_resourcequota_file_obj(
    requests: Optional[NamespaceResourcesCpuMem],
    quota_limits: Optional[NamespaceResourcesQuotaLimits],
) -> dict:
    hard = {}

    if quota_limits is not None:
        if _is_set(quota_limits.ephemeral_storage):
            hard["limits.ephemeral-storage"] = str(quota_limits.ephemeral_storage).strip()
        if _is_set(quota_limits.memory):
            hard["limits.memory"] = str(quota_limits.memory).strip()

    if requests is not None:
        if _is_set(requests.cpu):
            hard["requests.cpu"] = str(requests.cpu).strip()
        if _is_set(requests.memory):
            hard["requests.memory"] = str(requests.memory).strip()
        if _is_set(requests.ephemeral_storage):
            hard["requests.ephemeral-storage"] = str(requests.ephemeral_storage).strip()

    return {
        "apiVersion": "v1",
        "kind": "ResourceQuota",
        "metadata": {
            "name": "default",
            "namespace": "{{ .Values.namespacename }}",
        },
        "spec": {
            "hard": hard,
        },
    }


@router.post("/apps/{appname}/namespaces/{namespace}/resources/resourcequota_yaml")
def get_resourcequota_yaml(appname: str, namespace: str, payload: NamespaceResourcesYamlRequest, env: Optional[str] = None):
    env = _require_env(env)

    req = payload.resources.requests if payload and payload.resources is not None else None
    quota_limits = payload.resources.quota_limits if payload and payload.resources is not None else None

    rq_obj = _build_resourcequota_obj(namespace=namespace, requests=req, quota_limits=quota_limits)

    yaml_text = yaml.safe_dump(rq_obj, sort_keys=False)
    return Response(content=yaml_text, media_type="text/yaml")


@router.put("/apps/{appname}/namespaces/{namespace}/resources/resourcequota")
def put_namespace_resourcequota(appname: str, namespace: str, payload: NamespaceResourceQuotaUpdate, env: Optional[str] = None):
    env = _require_env(env)
    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)

    resourcequota_path = ns_dir / "resourcequota.yaml"
    try:
        rq_obj = _build_resourcequota_file_obj(
            requests=payload.requests,
            quota_limits=payload.quota_limits,
        )
        resourcequota_path.write_text(yaml.safe_dump(rq_obj, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write resourcequota.yaml: {e}")

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return _reload_namespace_details(env=env, appname=appname, namespace=namespace, ns_dir=ns_dir)
