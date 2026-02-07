from fastapi import APIRouter, HTTPException, Response
from typing import List, Optional
import shutil
import re
import logging
from pathlib import Path

import yaml

from pydantic import BaseModel, Field, ConfigDict

from backend.routers.apps import _require_env, _require_initialized_workspace
from backend.routers import pull_requests

router = APIRouter(tags=["namespaces"])

logger = logging.getLogger("uvicorn.error")


def _require_namespace_dir(env: str, appname: str, namespace: str) -> Path:
    requests_root = _require_initialized_workspace()
    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")
    return ns_dir


def _reload_namespace_details(
    *,
    env: str,
    appname: str,
    namespace: str,
    ns_dir: Path,
    ns_info: Optional[dict] = None,
) -> dict:
    """Return updated namespace in the same shape as get_namespaces."""
    try:
        requests_root = _require_initialized_workspace()

        ns_info_path = ns_dir / "namespace_info.yaml"
        existing = {}
        if isinstance(ns_info, dict):
            existing = ns_info
        elif ns_info_path.exists() and ns_info_path.is_file():
            parsed = yaml.safe_load(ns_info_path.read_text()) or {}
            if isinstance(parsed, dict):
                existing = parsed

        limitrange_path = ns_dir / "limitrange.yaml"
        resourcequota_path = ns_dir / "resourcequota.yaml"
        rolebinding_path = ns_dir / "rolebinding_requests.yaml"
        egress_firewall_path = ns_dir / "egress_firewall_requests.yaml"

        from backend.routers.limitrange import _parse_limitrange_manifest
        limitrange = _parse_limitrange_manifest(limitrange_path)
        from backend.routers.limitrange import _limits_from_limitrange
        limits = _limits_from_limitrange(limitrange)

        from backend.routers.resourcequota import _parse_resourcequota_manifest
        resourcequota = _parse_resourcequota_manifest(resourcequota_path)
        from backend.routers.resourcequota import _requests_and_quota_limits_from_resourcequota
        reqs, quota_limits = _requests_and_quota_limits_from_resourcequota(resourcequota)

        rolebinding = None
        if rolebinding_path.exists() and rolebinding_path.is_file():
            parsed = yaml.safe_load(rolebinding_path.read_text())
            if parsed is not None:
                rolebinding = parsed

        role_bindings = []
        if isinstance(rolebinding, list):
            role_bindings = rolebinding
        elif isinstance(rolebinding, dict) and rolebinding.get("subjects"):
            subjects = rolebinding.get("subjects", [])
            role_ref = rolebinding.get("roleRef", {})
            for subject in subjects:
                role_bindings.append({
                    "subject": subject,
                    "roleRef": role_ref
                })

        egress_firewall_rules = _read_yaml_list(egress_firewall_path)
        if not all(isinstance(r, dict) for r in egress_firewall_rules):
            egress_firewall_rules = [r for r in egress_firewall_rules if isinstance(r, dict)]

        clusters = existing.get("clusters")
        if not isinstance(clusters, list):
            clusters = []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

        nsargocd_path = ns_dir / "nsargocd.yaml"
        nsargocd = _read_yaml_dict(nsargocd_path)
        need_argo = _parse_bool(nsargocd.get("need_argo"))
        argocd_sync_strategy = str(nsargocd.get("argocd_sync_strategy", "") or "")
        gitrepourl = str(nsargocd.get("gitrepourl", "") or "")
        argocd_exists = False
        try:
            argocd_path = (requests_root / env / appname) / "argocd.yaml"
            argocd_exists = argocd_path.exists() and argocd_path.is_file()
        except Exception:
            argocd_exists = False
        if not argocd_exists:
            need_argo = False
        status = "Argo used" if need_argo else "Argo not used"

        return {
            "name": namespace,
            "description": str(existing.get("description", "") or ""),
            "clusters": clusters,
            "egress_nameid": (
                None if existing.get("egress_nameid") in (None, "") else str(existing.get("egress_nameid"))
            ),
            "enable_pod_based_egress_ip": _parse_bool(existing.get("enable_pod_based_egress_ip")),
            "allow_all_egress": _parse_bool(existing.get("allow_all_egress")),
            "need_argo": need_argo,
            "argocd_sync_strategy": argocd_sync_strategy,
            "gitrepourl": gitrepourl,
            "generate_argo_app": _parse_bool(existing.get("generate_argo_app")),
            "status": status,
            "resources": {
                "requests": {
                    "cpu": reqs.get("cpu"),
                    "memory": reqs.get("memory"),
                    "ephemeral-storage": reqs.get("ephemeral-storage"),
                },
                "quota_limits": {
                    "memory": quota_limits.get("memory"),
                    "ephemeral-storage": quota_limits.get("ephemeral-storage"),
                },
                "limits": {
                    "cpu": limits.get("cpu"),
                    "memory": limits.get("memory"),
                    "ephemeral-storage": limits.get("ephemeral-storage"),
                    "default": limits.get("default"),
                },
            },
            "rolebindings": role_bindings,
            "egress_firewall_rules": egress_firewall_rules,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Updated but failed to reload namespace details: {e}")


def _rewrite_default_namespace_in_yaml_files(root: Path, to_namespace: str) -> None:
    to_ns = str(to_namespace or "").strip()
    if not to_ns:
        return

    patterns = ("*.yaml", "*.yml")
    for pattern in patterns:
        for path in root.rglob(pattern):
            if not path.is_file():
                continue
            try:
                raw = path.read_text()
            except Exception:
                continue

            try:
                docs = list(yaml.safe_load_all(raw))
            except Exception:
                continue

            changed = False
            next_docs = []
            for doc in docs:
                if isinstance(doc, dict):
                    md = doc.get("metadata")
                    if isinstance(md, dict) and "namespace" in md:
                        if md.get("namespace") != to_ns:
                            md["namespace"] = to_ns
                            changed = True
                next_docs.append(doc)

            if not changed:
                continue

            try:
                out = yaml.safe_dump_all(next_docs, sort_keys=False)
                path.write_text(out)
            except Exception as e:
                logger.error("Failed to rewrite metadata.namespace in %s: %s", str(path), str(e))


class NamespaceCreate(BaseModel):
    namespace: str
    clusters: Optional[List[str]] = None
    egress_nameid: Optional[str] = None


class NamespaceInfoUpdate(BaseModel):
    clusters: Optional[List[str]] = None
    egress_nameid: Optional[str] = None


class NamespaceResourcesCpuMem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesLimitsDefault(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesLimits(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")
    default: Optional[NamespaceResourcesLimitsDefault] = None


class NamespaceResourcesQuotaLimits(BaseModel):
    """ResourceQuota limits section (limits.memory and limits.ephemeral-storage)"""
    model_config = ConfigDict(populate_by_name=True)

    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesUpdate(BaseModel):
    requests: Optional[NamespaceResourcesCpuMem] = None
    quota_limits: Optional[NamespaceResourcesQuotaLimits] = None
    limits: Optional[NamespaceResourcesLimits] = None


class RBSubject(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None


class RBRoleRef(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None


class RoleBinding(BaseModel):
    """Represents a RoleBinding with multiple subjects and one roleRef"""
    subjects: List[RBSubject]
    roleRef: RBRoleRef


class RoleBindingList(BaseModel):
    """List of RoleBindings, each with multiple subjects"""
    bindings: Optional[List[RoleBinding]] = None


class NamespaceUpdate(BaseModel):
    namespace_info: Optional[NamespaceInfoUpdate] = None
    resources: Optional[NamespaceResourcesUpdate] = None
    rolebindings: Optional[RoleBindingList] = None


class NamespaceInfoBasicUpdate(BaseModel):
    namespace_info: NamespaceInfoUpdate


class NamespaceResourceQuotaUpdate(BaseModel):
    requests: Optional[NamespaceResourcesCpuMem] = None
    quota_limits: Optional[NamespaceResourcesQuotaLimits] = None


class NamespaceLimitRangeUpdate(BaseModel):
    limits: Optional[NamespaceResourcesLimits] = None


class NamespaceRoleBindingsUpdate(BaseModel):
    bindings: Optional[List[RoleBinding]] = None


class NamespaceResourcesYamlRequest(BaseModel):
    resources: NamespaceResourcesUpdate


class NamespaceCopyRequest(BaseModel):
    from_env: str
    to_env: str
    to_namespace: str


def _parse_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    return s in {"true", "1", "yes", "y", "on"}


def _read_yaml_dict(path) -> dict:
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _read_yaml_list(path) -> list:
    if not path.exists() or not path.is_file():
        return []
    try:
        raw = yaml.safe_load(path.read_text())
        return raw if isinstance(raw, list) else []
    except Exception:
        return []


def _as_trimmed_str(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _is_set(v: Optional[str]) -> bool:
    s = str(v or "").strip()
    return bool(s) and s != "0"


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


@router.get("/apps/{appname}/namespaces")
def get_namespaces(appname: str, env: Optional[str] = None):
    env = _require_env(env)

    requests_root = _require_initialized_workspace()
    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    argocd_exists = False
    try:
        argocd_path = app_dir / "argocd.yaml"
        argocd_exists = argocd_path.exists() and argocd_path.is_file()
    except Exception:
        argocd_exists = False

    out = {}
    for child in app_dir.iterdir():
        if not child.is_dir():
            continue

        ns_name = child.name
        ns_info_path = child / "namespace_info.yaml"
        limitrange_path = child / "limitrange.yaml"
        resourcequota_path = child / "resourcequota.yaml"
        rolebinding_path = child / "rolebinding_requests.yaml"
        egress_firewall_path = child / "egress_firewall_requests.yaml"

        ns_info = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            try:
                parsed = yaml.safe_load(ns_info_path.read_text()) or {}
                if isinstance(parsed, dict):
                    ns_info = parsed
            except Exception:
                ns_info = {}

        nsargocd_path = child / "nsargocd.yaml"
        nsargocd = _read_yaml_dict(nsargocd_path)

        from backend.routers.limitrange import _parse_limitrange_manifest
        limitrange = _parse_limitrange_manifest(limitrange_path)
        from backend.routers.limitrange import _limits_from_limitrange
        limits = _limits_from_limitrange(limitrange)

        from backend.routers.resourcequota import _parse_resourcequota_manifest
        resourcequota = _parse_resourcequota_manifest(resourcequota_path)
        from backend.routers.resourcequota import _requests_and_quota_limits_from_resourcequota
        reqs, quota_limits = _requests_and_quota_limits_from_resourcequota(resourcequota)

        rolebinding = None
        if rolebinding_path.exists() and rolebinding_path.is_file():
            try:
                parsed = yaml.safe_load(rolebinding_path.read_text())
                if parsed is not None:
                    rolebinding = parsed
            except Exception:
                rolebinding = None

        # Convert rolebinding to array of bindings format
        role_bindings = []
        if isinstance(rolebinding, list):
            # Already in new format: array of bindings
            role_bindings = rolebinding
        elif isinstance(rolebinding, dict) and rolebinding.get("subjects"):
            # Old format: single binding with multiple subjects - convert to array
            subjects = rolebinding.get("subjects", [])
            role_ref = rolebinding.get("roleRef", {})
            for subject in subjects:
                role_bindings.append({
                    "subject": subject,
                    "roleRef": role_ref
                })

        egress_firewall_rules = _read_yaml_list(egress_firewall_path)
        if not all(isinstance(r, dict) for r in egress_firewall_rules):
            egress_firewall_rules = [r for r in egress_firewall_rules if isinstance(r, dict)]

        clusters = ns_info.get("clusters")
        if not isinstance(clusters, list):
            clusters = []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

        need_argo = _parse_bool(nsargocd.get("need_argo"))
        argocd_sync_strategy = str(nsargocd.get("argocd_sync_strategy", "") or "")
        gitrepourl = str(nsargocd.get("gitrepourl", "") or "")
        if not argocd_exists:
            need_argo = False
        status = "Argo used" if need_argo else "Argo not used"

        out[ns_name] = {
            "name": ns_name,
            "description": str(ns_info.get("description", "") or ""),
            "clusters": clusters,
            "egress_nameid": (None if ns_info.get("egress_nameid") in (None, "") else str(ns_info.get("egress_nameid"))),
            "enable_pod_based_egress_ip": _parse_bool(ns_info.get("enable_pod_based_egress_ip")),
            "allow_all_egress": _parse_bool(ns_info.get("allow_all_egress")),
            "need_argo": need_argo,
            "argocd_sync_strategy": argocd_sync_strategy,
            "gitrepourl": gitrepourl,
            "generate_argo_app": _parse_bool(ns_info.get("generate_argo_app")),
            "status": status,
            "resources": {
                "requests": {
                    "cpu": reqs.get("cpu"),
                    "memory": reqs.get("memory"),
                    "ephemeral-storage": reqs.get("ephemeral-storage"),
                },
                "quota_limits": {
                    "memory": quota_limits.get("memory"),
                    "ephemeral-storage": quota_limits.get("ephemeral-storage"),
                },
                "limits": {
                    "cpu": limits.get("cpu"),
                    "memory": limits.get("memory"),
                    "ephemeral-storage": limits.get("ephemeral-storage"),
                    "default": limits.get("default"),
                },
            },
            "rolebindings": role_bindings,
            "egress_firewall_rules": egress_firewall_rules,
        }

    return out


@router.post("/apps/{appname}/namespaces")
def create_namespace(appname: str, payload: NamespaceCreate, env: Optional[str] = None):
    """Create a new namespace for an application

    Args:
        appname: The application name
        payload: Namespace creation data
        env: The environment (dev/qa/prd)
    """
    env = _require_env(env)
    requests_root = _require_initialized_workspace()

    namespace = str(payload.namespace or "").strip()
    if not namespace:
        raise HTTPException(status_code=400, detail="namespace is required")
    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", namespace):
        raise HTTPException(
            status_code=400,
            detail="Invalid namespace name. Must be lowercase alphanumeric with hyphens."
        )

    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    ns_dir = app_dir / namespace
    if ns_dir.exists():
        raise HTTPException(status_code=409, detail=f"Namespace already exists: {namespace}")

    try:
        ns_dir.mkdir(parents=True, exist_ok=False)

        clusters = payload.clusters or []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]
        egress_nameid = str(payload.egress_nameid or "").strip()

        ns_info = {
            "clusters": clusters,
        }

        if egress_nameid:
            ns_info["egress_nameid"] = egress_nameid

        ns_info_path = ns_dir / "namespace_info.yaml"
        ns_info_path.write_text(yaml.safe_dump(ns_info, sort_keys=False))

    except HTTPException:
        raise
    except Exception as e:
        # Clean up if something went wrong
        if ns_dir.exists():
            shutil.rmtree(ns_dir)
        raise HTTPException(status_code=500, detail=f"Failed to create namespace: {e}")

    need_argo = False
    status = "Argo used" if need_argo else "Argo not used"

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return {
        "name": namespace,
        "description": "",
        "clusters": clusters,
        "egress_nameid": egress_nameid if egress_nameid else None,
        "enable_pod_based_egress_ip": False,
        "allow_all_egress": False,
        "need_argo": need_argo,
        "generate_argo_app": False,
        "status": status,
        "resources": {
            "requests": {
                "cpu": None,
                "memory": None,
            },
            "limits": {
                "cpu": None,
                "memory": None,
            },
        },
        "rolebindings": [],
    }


@router.delete("/apps/{appname}/namespaces")
def delete_namespaces(appname: str, env: Optional[str] = None, namespaces: Optional[str] = None):
    """Delete specific namespaces from an application

    Args:
        appname: The application name
        env: The environment (dev/qa/prd)
        namespaces: Comma-separated list of namespace names to delete
    """
    env = _require_env(env)

    if not namespaces:
        raise HTTPException(status_code=400, detail="namespaces parameter is required (comma-separated list)")

    namespace_list = [ns.strip() for ns in namespaces.split(",") if ns.strip()]

    if not namespace_list:
        raise HTTPException(status_code=400, detail="No valid namespaces provided")

    deleted_data = {
        "appname": appname,
        "env": env,
        "requested_deletions": namespace_list,
        "deleted_namespaces": [],
        "not_found": [],
    }

    requests_root = _require_initialized_workspace()
    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    for ns_name in namespace_list:
        ns_dir = app_dir / ns_name
        if not ns_dir.exists() or not ns_dir.is_dir():
            deleted_data["not_found"].append(ns_name)
            continue

        try:
            shutil.rmtree(ns_dir)
            deleted_data["deleted_namespaces"].append(ns_name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete namespace folder {ns_dir}: {e}")

    if deleted_data["deleted_namespaces"] and not any(p.is_dir() for p in app_dir.iterdir()):
        deleted_data["app_entry_removed"] = True

    return deleted_data


@router.post("/apps/{appname}/namespaces/{namespace}/copy")
def copy_namespace(appname: str, namespace: str, payload: NamespaceCopyRequest, env: Optional[str] = None):
    env = _require_env(env)

    from_env = _require_env(payload.from_env)
    to_env = _require_env(payload.to_env)
    to_namespace = str(payload.to_namespace or "").strip()
    if not to_namespace:
        raise HTTPException(status_code=400, detail="to_namespace is required")

    if from_env != env:
        raise HTTPException(status_code=400, detail="from_env must match query parameter env")

    if from_env == to_env and to_namespace == namespace:
        raise HTTPException(status_code=400, detail="When copying within the same env, to_namespace must be different")

    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", to_namespace):
        raise HTTPException(
            status_code=400,
            detail="Invalid namespace name. Must be lowercase alphanumeric with hyphens."
        )

    requests_root = _require_initialized_workspace()
    src_dir = requests_root / from_env / appname / namespace
    if not src_dir.exists() or not src_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Source namespace folder not found: {src_dir}")

    dst_dir = requests_root / to_env / appname / to_namespace
    if dst_dir.exists():
        raise HTTPException(status_code=409, detail=f"Destination namespace already exists: {dst_dir}")

    # Ensure app folder exists in destination env
    dst_app_dir = requests_root / to_env / appname
    if not dst_app_dir.exists() or not dst_app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Destination app folder not found: {dst_app_dir}")

    try:
        shutil.copytree(src_dir, dst_dir)
    except Exception as e:
        # best effort cleanup if partially copied
        try:
            if dst_dir.exists():
                shutil.rmtree(dst_dir)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to copy namespace: {e}")

    try:
        _rewrite_default_namespace_in_yaml_files(dst_dir, to_namespace)
    except Exception as e:
        logger.error(
            "Failed to rewrite copied YAML metadata namespaces for %s/%s -> %s/%s: %s",
            str(from_env),
            str(namespace),
            str(to_env),
            str(to_namespace),
            str(e),
        )

    try:
        pull_requests.ensure_pull_request(appname=appname, env=to_env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(to_env), str(appname), str(e))

    return {
        "from_env": from_env,
        "from_namespace": namespace,
        "to_env": to_env,
        "to_namespace": to_namespace,
        "copied": True,
    }


@router.put("/apps/{appname}/namespaces/{namespace}/namespace_info/basic")
def put_namespace_info_basic(appname: str, namespace: str, payload: NamespaceInfoBasicUpdate, env: Optional[str] = None):
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
        if ni.clusters is not None:
            existing["clusters"] = [str(c) for c in ni.clusters if c is not None and str(c).strip()]
        if ni.egress_nameid is not None:
            existing["egress_nameid"] = str(ni.egress_nameid)

        ns_info_path.write_text(yaml.safe_dump(existing, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update namespace_info.yaml: {e}")

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return _reload_namespace_details(env=env, appname=appname, namespace=namespace, ns_dir=ns_dir, ns_info=existing)


@router.put("/apps/{appname}/namespaces/{namespace}/namespace_info")
def update_namespace_info(appname: str, namespace: str, payload: NamespaceUpdate, env: Optional[str] = None):
    env = _require_env(env)

    requests_root = _require_initialized_workspace()
    ns_dir = requests_root / env / appname / namespace
    if not ns_dir.exists() or not ns_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")

    ns_info_path = ns_dir / "namespace_info.yaml"
    try:
        existing = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            parsed = yaml.safe_load(ns_info_path.read_text()) or {}
            if isinstance(parsed, dict):
                existing = parsed

        if payload.namespace_info is not None:
            ni = payload.namespace_info
            if ni.clusters is not None:
                existing["clusters"] = [str(c) for c in ni.clusters if c is not None and str(c).strip()]
            if ni.egress_nameid is not None:
                existing["egress_nameid"] = str(ni.egress_nameid)

        ns_info_path.write_text(yaml.safe_dump(existing, sort_keys=False))

        if payload.resources is not None:
            if payload.resources.requests is not None or payload.resources.quota_limits is not None:
                resourcequota_path = ns_dir / "resourcequota.yaml"
                rq_obj = _build_resourcequota_file_obj(
                    requests=payload.resources.requests,
                    quota_limits=payload.resources.quota_limits,
                )
                resourcequota_path.write_text(yaml.safe_dump(rq_obj, sort_keys=False))

            if payload.resources.limits is not None:
                limitrange_path = ns_dir / "limitrange.yaml"

                from backend.routers.limitrange import _build_limitrange_file_obj

                limitrange_obj = _build_limitrange_file_obj(namespace=namespace, limits=payload.resources.limits)
                limitrange_path.write_text(yaml.safe_dump(limitrange_obj, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update namespace_info.yaml: {e}")

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    # RoleBindings validation and update - outside try-except so validation errors return proper 400 status
    if payload.rolebindings is not None and payload.rolebindings.bindings is not None:
        rolebinding_path = ns_dir / "rolebinding_requests.yaml"
        egress_firewall_path = ns_dir / "egress_firewall_requests.yaml"

        # Convert bindings to array format for storage with validation
        rolebindings_data = []
        for idx, binding in enumerate(payload.rolebindings.bindings):
            # Validate roleRef fields
            roleref_kind = str(binding.roleRef.kind).strip() if binding.roleRef.kind is not None else ""
            roleref_name = str(binding.roleRef.name).strip() if binding.roleRef.name is not None else ""

            if not roleref_kind:
                raise HTTPException(
                    status_code=400,
                    detail=f"Role Binding #{idx + 1}: Role Type is mandatory and cannot be empty"
                )
            if not roleref_name:
                raise HTTPException(
                    status_code=400,
                    detail=f"Role Binding #{idx + 1}: Role Reference is mandatory and cannot be empty"
                )

            # Validate subjects array
            if not binding.subjects or len(binding.subjects) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Role Binding #{idx + 1}: At least one subject is required"
                )

            # Validate each subject
            validated_subjects = []
            for sub_idx, subject in enumerate(binding.subjects):
                subject_kind = str(subject.kind).strip() if subject.kind is not None else ""
                subject_name = str(subject.name).strip() if subject.name is not None else ""

                if not subject_kind:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Role Binding #{idx + 1}, Subject #{sub_idx + 1}: Subject Kind is mandatory and cannot be empty"
                    )
                if not subject_name:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Role Binding #{idx + 1}, Subject #{sub_idx + 1}: Subject Name is mandatory and cannot be empty"
                    )

                validated_subjects.append({
                    "kind": subject_kind,
                    "name": subject_name
                })

            binding_dict = {
                "subjects": validated_subjects,
                "roleRef": {
                    "kind": roleref_kind,
                    "name": roleref_name
                }
            }
            rolebindings_data.append(binding_dict)

        # Write rolebindings data - even if array is empty, write it to clear previous values
        try:
            rolebinding_path.write_text(yaml.safe_dump(rolebindings_data, sort_keys=False))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write RoleBinding: {e}")

    # Return updated namespace in the same shape as get_namespaces
    # by reusing the same file parsing logic.
    try:
        limitrange_path = ns_dir / "limitrange.yaml"
        resourcequota_path = ns_dir / "resourcequota.yaml"
        rolebinding_path = ns_dir / "rolebinding_requests.yaml"
        egress_firewall_path = ns_dir / "egress_firewall_requests.yaml"

        from backend.routers.limitrange import _parse_limitrange_manifest
        limitrange = _parse_limitrange_manifest(limitrange_path)
        from backend.routers.limitrange import _limits_from_limitrange
        limits = _limits_from_limitrange(limitrange)

        from backend.routers.resourcequota import _parse_resourcequota_manifest
        resourcequota = _parse_resourcequota_manifest(resourcequota_path)
        from backend.routers.resourcequota import _requests_and_quota_limits_from_resourcequota
        reqs, quota_limits = _requests_and_quota_limits_from_resourcequota(resourcequota)

        rolebinding = None
        if rolebinding_path.exists() and rolebinding_path.is_file():
            parsed = yaml.safe_load(rolebinding_path.read_text())
            if parsed is not None:
                rolebinding = parsed

        # Convert rolebinding to array of bindings format
        role_bindings = []
        if isinstance(rolebinding, list):
            # Already in new format: array of bindings
            role_bindings = rolebinding
        elif isinstance(rolebinding, dict) and rolebinding.get("subjects"):
            # Old format: single binding with multiple subjects - convert to array
            subjects = rolebinding.get("subjects", [])
            role_ref = rolebinding.get("roleRef", {})
            for subject in subjects:
                role_bindings.append({
                    "subject": subject,
                    "roleRef": role_ref
                })

        egress_firewall_rules = _read_yaml_list(egress_firewall_path)
        if not all(isinstance(r, dict) for r in egress_firewall_rules):
            egress_firewall_rules = [r for r in egress_firewall_rules if isinstance(r, dict)]

        clusters = existing.get("clusters")
        if not isinstance(clusters, list):
            clusters = []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

        nsargocd_path = ns_dir / "nsargocd.yaml"
        nsargocd = _read_yaml_dict(nsargocd_path)
        need_argo = _parse_bool(nsargocd.get("need_argo"))
        argocd_sync_strategy = str(nsargocd.get("argocd_sync_strategy", "") or "")
        gitrepourl = str(nsargocd.get("gitrepourl", "") or "")
        argocd_exists = False
        try:
            argocd_path = (requests_root / env / appname) / "argocd.yaml"
            argocd_exists = argocd_path.exists() and argocd_path.is_file()
        except Exception:
            argocd_exists = False
        if not argocd_exists:
            need_argo = False
        status = "Argo used" if need_argo else "Argo not used"

        return {
            "name": namespace,
            "description": str(existing.get("description", "") or ""),
            "clusters": clusters,
            "egress_nameid": (
                None if existing.get("egress_nameid") in (None, "") else str(existing.get("egress_nameid"))
            ),
            "enable_pod_based_egress_ip": _parse_bool(existing.get("enable_pod_based_egress_ip")),
            "allow_all_egress": _parse_bool(existing.get("allow_all_egress")),
            "need_argo": need_argo,
            "argocd_sync_strategy": argocd_sync_strategy,
            "gitrepourl": gitrepourl,
            "generate_argo_app": _parse_bool(existing.get("generate_argo_app")),
            "status": status,
            "resources": {
                "requests": {
                    "cpu": reqs.get("cpu"),
                    "memory": reqs.get("memory"),
                    "ephemeral-storage": reqs.get("ephemeral-storage"),
                },
                "quota_limits": {
                    "memory": quota_limits.get("memory"),
                    "ephemeral-storage": quota_limits.get("ephemeral-storage"),
                },
                "limits": {
                    "cpu": limits.get("cpu"),
                    "memory": limits.get("memory"),
                    "ephemeral-storage": limits.get("ephemeral-storage"),
                    "default": limits.get("default"),
                },
            },
            "rolebindings": role_bindings,
            "egress_firewall_rules": egress_firewall_rules,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Updated but failed to reload namespace details: {e}")
