from fastapi import APIRouter, HTTPException
from typing import List, Optional
import shutil
import re

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env, _require_initialized_workspace

router = APIRouter(tags=["namespaces"])


class NamespaceCreate(BaseModel):
    namespace: str
    clusters: Optional[List[str]] = None
    need_argo: Optional[bool] = None
    egress_nameid: Optional[str] = None


class NamespaceInfoUpdate(BaseModel):
    clusters: Optional[List[str]] = None
    need_argo: Optional[bool] = None
    egress_nameid: Optional[str] = None


class NamespaceResourcesCpuMem(BaseModel):
    cpu: Optional[str] = None
    memory: Optional[str] = None


class NamespaceResourcesUpdate(BaseModel):
    requests: Optional[NamespaceResourcesCpuMem] = None
    limits: Optional[NamespaceResourcesCpuMem] = None


class RbacSubject(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None


class RbacRoleRef(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None


class RbacBinding(BaseModel):
    """Represents a single RoleBinding with one subject and one roleRef"""
    subject: RbacSubject
    roleRef: RbacRoleRef


class RbacUpdate(BaseModel):
    """List of RoleBindings, each with its own subject and roleRef"""
    bindings: Optional[List[RbacBinding]] = None


class NamespaceUpdate(BaseModel):
    namespace_info: Optional[NamespaceInfoUpdate] = None
    resources: Optional[NamespaceResourcesUpdate] = None
    rbac: Optional[RbacUpdate] = None


def _parse_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    return s in {"true", "1", "yes", "y", "on"}


@router.get("/apps/{appname}/namespaces")
def get_namespaces(appname: str, env: Optional[str] = None):
    env = _require_env(env)

    requests_root = _require_initialized_workspace()
    app_dir = requests_root / env / appname
    if not app_dir.exists() or not app_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

    out = {}
    for child in app_dir.iterdir():
        if not child.is_dir():
            continue

        ns_name = child.name
        ns_info_path = child / "namespace_info.yaml"
        limits_path = child / "limits.yaml"
        requests_path = child / "requests.yaml"
        rbac_path = child / "rbac.yaml"

        ns_info = {}
        if ns_info_path.exists() and ns_info_path.is_file():
            try:
                parsed = yaml.safe_load(ns_info_path.read_text()) or {}
                if isinstance(parsed, dict):
                    ns_info = parsed
            except Exception:
                ns_info = {}

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

        rbac = None
        if rbac_path.exists() and rbac_path.is_file():
            try:
                parsed = yaml.safe_load(rbac_path.read_text())
                if parsed is not None:
                    rbac = parsed
            except Exception:
                rbac = None

        # Convert rbac to array of bindings format
        rbac_bindings = []
        if isinstance(rbac, list):
            # Already in new format: array of bindings
            rbac_bindings = rbac
        elif isinstance(rbac, dict) and rbac.get("subjects"):
            # Old format: single binding with multiple subjects - convert to array
            subjects = rbac.get("subjects", [])
            role_ref = rbac.get("roleRef", {})
            for subject in subjects:
                rbac_bindings.append({
                    "subject": subject,
                    "roleRef": role_ref
                })

        clusters = ns_info.get("clusters")
        if not isinstance(clusters, list):
            clusters = []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

        need_argo = _parse_bool(ns_info.get("need_argo"))
        status = "Argo used" if need_argo else "Argo not used"

        out[ns_name] = {
            "name": ns_name,
            "description": str(ns_info.get("description", "") or ""),
            "clusters": clusters,
            "egress_nameid": (None if ns_info.get("egress_nameid") in (None, "") else str(ns_info.get("egress_nameid"))),
            "enable_pod_based_egress_ip": _parse_bool(ns_info.get("enable_pod_based_egress_ip")),
            "allow_all_egress": _parse_bool(ns_info.get("allow_all_egress")),
            "need_argo": need_argo,
            "generate_argo_app": _parse_bool(ns_info.get("generate_argo_app")),
            "status": status,
            "resources": {
                "requests": {
                    "cpu": (None if reqs.get("cpu") in (None, "") else str(reqs.get("cpu"))),
                    "memory": (None if reqs.get("memory") in (None, "") else str(reqs.get("memory"))),
                },
                "limits": {
                    "cpu": (None if limits.get("cpu") in (None, "") else str(limits.get("cpu"))),
                    "memory": (None if limits.get("memory") in (None, "") else str(limits.get("memory"))),
                },
            },
            "rbac": rbac_bindings,
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

        need_argo = bool(payload.need_argo) if payload.need_argo is not None else False
        egress_nameid = str(payload.egress_nameid or "").strip()

        ns_info = {
            "clusters": clusters,
            "need_argo": need_argo,
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

    status = "Argo used" if need_argo else "Argo not used"

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
        "rbac": [],
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
            if ni.need_argo is not None:
                existing["need_argo"] = bool(ni.need_argo)
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
                    req_existing["cpu"] = str(payload.resources.requests.cpu)
                if payload.resources.requests.memory is not None:
                    req_existing["memory"] = str(payload.resources.requests.memory)

                req_path.write_text(yaml.safe_dump(req_existing, sort_keys=False))

            if payload.resources.limits is not None:
                lim_path = ns_dir / "limits.yaml"
                lim_existing = {}
                if lim_path.exists() and lim_path.is_file():
                    parsed = yaml.safe_load(lim_path.read_text()) or {}
                    if isinstance(parsed, dict):
                        lim_existing = parsed

                if payload.resources.limits.cpu is not None:
                    lim_existing["cpu"] = str(payload.resources.limits.cpu)
                if payload.resources.limits.memory is not None:
                    lim_existing["memory"] = str(payload.resources.limits.memory)

                lim_path.write_text(yaml.safe_dump(lim_existing, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update namespace_info.yaml: {e}")

    # RBAC validation and update - outside try-except so validation errors return proper 400 status
    if payload.rbac is not None and payload.rbac.bindings is not None:
        rbac_path = ns_dir / "rbac.yaml"

        # Convert bindings to array format for storage with validation
        rbac_data = []
        for idx, binding in enumerate(payload.rbac.bindings):
            # Validate mandatory fields - all must be non-empty
            subject_kind = str(binding.subject.kind).strip() if binding.subject.kind is not None else ""
            subject_name = str(binding.subject.name).strip() if binding.subject.name is not None else ""
            roleref_kind = str(binding.roleRef.kind).strip() if binding.roleRef.kind is not None else ""
            roleref_name = str(binding.roleRef.name).strip() if binding.roleRef.name is not None else ""

            # Check if any mandatory field is empty
            if not subject_kind:
                raise HTTPException(
                    status_code=400,
                    detail=f"RBAC binding #{idx + 1}: Subject Kind is mandatory and cannot be empty"
                )
            if not subject_name:
                raise HTTPException(
                    status_code=400,
                    detail=f"RBAC binding #{idx + 1}: Subject Name is mandatory and cannot be empty"
                )
            if not roleref_kind:
                raise HTTPException(
                    status_code=400,
                    detail=f"RBAC binding #{idx + 1}: Role Type is mandatory and cannot be empty"
                )
            if not roleref_name:
                raise HTTPException(
                    status_code=400,
                    detail=f"RBAC binding #{idx + 1}: Role Reference is mandatory and cannot be empty"
                )

            binding_dict = {
                "subject": {
                    "kind": subject_kind,
                    "name": subject_name
                },
                "roleRef": {
                    "kind": roleref_kind,
                    "name": roleref_name
                }
            }
            rbac_data.append(binding_dict)

        # Write rbac data - even if array is empty, write it to clear previous values
        try:
            rbac_path.write_text(yaml.safe_dump(rbac_data, sort_keys=False))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write RBAC configuration: {e}")

    # Return updated namespace in the same shape as get_namespaces
    # by reusing the same file parsing logic.
    try:
        limits_path = ns_dir / "limits.yaml"
        requests_path = ns_dir / "requests.yaml"
        rbac_path = ns_dir / "rbac.yaml"

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

        rbac = None
        if rbac_path.exists() and rbac_path.is_file():
            parsed = yaml.safe_load(rbac_path.read_text())
            if parsed is not None:
                rbac = parsed

        # Convert rbac to array of bindings format
        rbac_bindings = []
        if isinstance(rbac, list):
            # Already in new format: array of bindings
            rbac_bindings = rbac
        elif isinstance(rbac, dict) and rbac.get("subjects"):
            # Old format: single binding with multiple subjects - convert to array
            subjects = rbac.get("subjects", [])
            role_ref = rbac.get("roleRef", {})
            for subject in subjects:
                rbac_bindings.append({
                    "subject": subject,
                    "roleRef": role_ref
                })

        clusters = existing.get("clusters")
        if not isinstance(clusters, list):
            clusters = []
        clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

        need_argo = _parse_bool(existing.get("need_argo"))
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
            "generate_argo_app": _parse_bool(existing.get("generate_argo_app")),
            "status": status,
            "resources": {
                "requests": {
                    "cpu": (None if reqs.get("cpu") in (None, "") else str(reqs.get("cpu"))),
                    "memory": (None if reqs.get("memory") in (None, "") else str(reqs.get("memory"))),
                },
                "limits": {
                    "cpu": (None if limits.get("cpu") in (None, "") else str(limits.get("cpu"))),
                    "memory": (None if limits.get("memory") in (None, "") else str(limits.get("memory"))),
                },
            },
            "rbac": rbac_bindings,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Updated but failed to reload namespace details: {e}")
