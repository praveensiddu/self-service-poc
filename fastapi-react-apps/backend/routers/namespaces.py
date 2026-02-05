from fastapi import APIRouter, HTTPException
from typing import List, Optional
import shutil
import re
import logging

import yaml

from pydantic import BaseModel, Field, ConfigDict

from backend.routers.apps import _require_env, _require_initialized_workspace
from backend.routers import pull_requests

router = APIRouter(tags=["namespaces"])

logger = logging.getLogger("uvicorn.error")


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
        limits_path = child / "limits.yaml"
        requests_path = child / "requests.yaml"
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

        limits = {}
        if limits_path.exists() and limits_path.is_file():
            try:
                parsed = yaml.safe_load(limits_path.read_text()) or {}
                if isinstance(parsed, dict):
                    limits = parsed
            except Exception:
                limits = {}

        reqs = {}
        if requests_path.exists() and requests_path.is_file():
            try:
                parsed = yaml.safe_load(requests_path.read_text()) or {}
                if isinstance(parsed, dict):
                    reqs = parsed
            except Exception:
                reqs = {}

        quota_limits_path = child / "quota_limits.yaml"
        quota_limits = {}
        if quota_limits_path.exists() and quota_limits_path.is_file():
            try:
                parsed = yaml.safe_load(quota_limits_path.read_text()) or {}
                if isinstance(parsed, dict):
                    quota_limits = parsed
            except Exception:
                quota_limits = {}

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
                    "cpu": (None if reqs.get("cpu") in (None, "") else str(reqs.get("cpu"))),
                    "memory": (None if reqs.get("memory") in (None, "") else str(reqs.get("memory"))),
                    "ephemeral-storage": (None if reqs.get("ephemeral-storage") in (None, "") else str(reqs.get("ephemeral-storage"))),
                },
                "quota_limits": {
                    "memory": (None if quota_limits.get("memory") in (None, "") else str(quota_limits.get("memory"))),
                    "ephemeral-storage": (None if quota_limits.get("ephemeral-storage") in (None, "") else str(quota_limits.get("ephemeral-storage"))),
                },
                "limits": {
                    "cpu": (None if limits.get("cpu") in (None, "") else str(limits.get("cpu"))),
                    "memory": (None if limits.get("memory") in (None, "") else str(limits.get("memory"))),
                    "ephemeral-storage": (None if limits.get("ephemeral-storage") in (None, "") else str(limits.get("ephemeral-storage"))),
                    "default": (lambda: {
                        "cpu": (None if limits.get("default", {}).get("cpu") in (None, "") else str(limits.get("default", {}).get("cpu"))),
                        "memory": (None if limits.get("default", {}).get("memory") in (None, "") else str(limits.get("default", {}).get("memory"))),
                        "ephemeral-storage": (None if limits.get("default", {}).get("ephemeral-storage") in (None, "") else str(limits.get("default", {}).get("ephemeral-storage"))),
                    })() if limits.get("default") and any(
                        limits.get("default", {}).get(k) not in (None, "")
                        for k in ["cpu", "memory", "ephemeral-storage"]
                    ) else None,
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
            if payload.resources.requests is not None:
                req_path = ns_dir / "requests.yaml"
                req_existing = {}
                if req_path.exists() and req_path.is_file():
                    parsed = yaml.safe_load(req_path.read_text()) or {}
                    if isinstance(parsed, dict):
                        req_existing = parsed

                if payload.resources.requests.cpu is not None:
                    cpu_val = str(payload.resources.requests.cpu).strip()
                    if cpu_val:
                        req_existing["cpu"] = cpu_val

                if payload.resources.requests.memory is not None:
                    mem_val = str(payload.resources.requests.memory).strip()
                    if mem_val:
                        req_existing["memory"] = mem_val

                if payload.resources.requests.ephemeral_storage is not None:
                    eph_val = str(payload.resources.requests.ephemeral_storage).strip()
                    if eph_val:
                        req_existing["ephemeral-storage"] = eph_val

                req_path.write_text(yaml.safe_dump(req_existing, sort_keys=False))

            # Handle quota_limits (ResourceQuota limits section)
            if payload.resources.quota_limits is not None:
                quota_lim_path = ns_dir / "quota_limits.yaml"
                quota_lim_existing = {}
                if quota_lim_path.exists() and quota_lim_path.is_file():
                    parsed = yaml.safe_load(quota_lim_path.read_text()) or {}
                    if isinstance(parsed, dict):
                        quota_lim_existing = parsed

                if payload.resources.quota_limits.memory is not None:
                    mem_val = str(payload.resources.quota_limits.memory).strip()
                    if mem_val:
                        quota_lim_existing["memory"] = mem_val

                if payload.resources.quota_limits.ephemeral_storage is not None:
                    eph_val = str(payload.resources.quota_limits.ephemeral_storage).strip()
                    if eph_val:
                        quota_lim_existing["ephemeral-storage"] = eph_val

                quota_lim_path.write_text(yaml.safe_dump(quota_lim_existing, sort_keys=False))

            if payload.resources.limits is not None:
                lim_path = ns_dir / "limits.yaml"
                lim_existing = {}
                if lim_path.exists() and lim_path.is_file():
                    parsed = yaml.safe_load(lim_path.read_text()) or {}
                    if isinstance(parsed, dict):
                        lim_existing = parsed

                # Update top-level limits fields (defaultRequest)
                if payload.resources.limits.cpu is not None:
                    cpu_val = str(payload.resources.limits.cpu).strip()
                    if cpu_val:
                        lim_existing["cpu"] = cpu_val

                if payload.resources.limits.memory is not None:
                    mem_val = str(payload.resources.limits.memory).strip()
                    if mem_val:
                        lim_existing["memory"] = mem_val

                if payload.resources.limits.ephemeral_storage is not None:
                    eph_val = str(payload.resources.limits.ephemeral_storage).strip()
                    if eph_val:
                        lim_existing["ephemeral-storage"] = eph_val

                # Handle default nested object
                if payload.resources.limits.default is not None:
                    if "default" not in lim_existing:
                        lim_existing["default"] = {}

                    if payload.resources.limits.default.cpu is not None:
                        cpu_val = str(payload.resources.limits.default.cpu).strip()
                        if cpu_val:
                            lim_existing["default"]["cpu"] = cpu_val

                    if payload.resources.limits.default.memory is not None:
                        mem_val = str(payload.resources.limits.default.memory).strip()
                        if mem_val:
                            lim_existing["default"]["memory"] = mem_val

                    if payload.resources.limits.default.ephemeral_storage is not None:
                        eph_val = str(payload.resources.limits.default.ephemeral_storage).strip()
                        if eph_val:
                            lim_existing["default"]["ephemeral-storage"] = eph_val

                # Clean up empty default object if it has no values
                if "default" in lim_existing:
                    # Remove keys with None or empty string values
                    default_obj = lim_existing.get("default", {})
                    if isinstance(default_obj, dict):
                        # Keep only non-empty values
                        cleaned_default = {k: v for k, v in default_obj.items() if v and str(v).strip()}
                        if cleaned_default:
                            lim_existing["default"] = cleaned_default
                        else:
                            del lim_existing["default"]

                lim_path.write_text(yaml.safe_dump(lim_existing, sort_keys=False))
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
        limits_path = ns_dir / "limits.yaml"
        requests_path = ns_dir / "requests.yaml"
        rolebinding_path = ns_dir / "rolebinding_requests.yaml"
        egress_firewall_path = ns_dir / "egress_firewall_requests.yaml"

        limits = {}
        if limits_path.exists() and limits_path.is_file():
            parsed = yaml.safe_load(limits_path.read_text()) or {}
            if isinstance(parsed, dict):
                limits = parsed

        reqs = {}
        if requests_path.exists() and requests_path.is_file():
            parsed = yaml.safe_load(requests_path.read_text()) or {}
            if isinstance(parsed, dict):
                reqs = parsed

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
                    "cpu": (None if reqs.get("cpu") in (None, "") else str(reqs.get("cpu"))),
                    "memory": (None if reqs.get("memory") in (None, "") else str(reqs.get("memory"))),
                    "ephemeral-storage": (None if reqs.get("ephemeral-storage") in (None, "") else str(reqs.get("ephemeral-storage"))),
                },
                "limits": {
                    "cpu": (None if limits.get("cpu") in (None, "") else str(limits.get("cpu"))),
                    "memory": (None if limits.get("memory") in (None, "") else str(limits.get("memory"))),
                    "ephemeral-storage": (None if limits.get("ephemeral-storage") in (None, "") else str(limits.get("ephemeral-storage"))),
                    "default": (lambda: {
                        "cpu": (None if limits.get("default", {}).get("cpu") in (None, "") else str(limits.get("default", {}).get("cpu"))),
                        "memory": (None if limits.get("default", {}).get("memory") in (None, "") else str(limits.get("default", {}).get("memory"))),
                        "ephemeral-storage": (None if limits.get("default", {}).get("ephemeral-storage") in (None, "") else str(limits.get("default", {}).get("ephemeral-storage"))),
                    })() if limits.get("default") and any(
                        limits.get("default", {}).get(k) not in (None, "")
                        for k in ["cpu", "memory", "ephemeral-storage"]
                    ) else None,
                },
            },
            "rolebindings": role_bindings,
            "egress_firewall_rules": egress_firewall_rules,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Updated but failed to reload namespace details: {e}")
