from fastapi import APIRouter, HTTPException, Response
from typing import Optional, List

import logging
import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env
from backend.routers.ns_models import NamespaceRoleBindingsUpdate, RBRoleRef, RBSubject
from backend.routers.namespaces import _require_namespace_dir
from backend.routers import pull_requests

router = APIRouter(tags=["rolebindings"])

logger = logging.getLogger("uvicorn.error")


class RoleBindingYamlRequest(BaseModel):
    subjects: List[RBSubject]
    roleRef: RBRoleRef
    binding_index: Optional[int] = None
    binding_name: Optional[str] = None


@router.post("/apps/{appname}/namespaces/{namespace}/rolebindings/rolebinding_yaml")
def get_rolebinding_yaml(appname: str, namespace: str, payload: RoleBindingYamlRequest, env: Optional[str] = None):
    env = _require_env(env)

    roleref_kind = str(payload.roleRef.kind).strip() if payload.roleRef and payload.roleRef.kind is not None else ""
    roleref_name = str(payload.roleRef.name).strip() if payload.roleRef and payload.roleRef.name is not None else ""

    if not roleref_kind or not roleref_name:
        raise HTTPException(status_code=400, detail="roleRef.kind and roleRef.name are required")

    if not payload.subjects or len(payload.subjects) == 0:
        raise HTTPException(status_code=400, detail="At least one subject is required")

    # Validate and format subjects
    formatted_subjects = []
    for subject in payload.subjects:
        subject_kind = str(subject.kind).strip() if subject and subject.kind is not None else ""
        subject_name = str(subject.name).strip() if subject and subject.name is not None else ""

        if not subject_kind or not subject_name:
            raise HTTPException(status_code=400, detail="Each subject must have kind and name")

        formatted_subjects.append({
            "kind": subject_kind,
            "name": subject_name,
            "apiGroup": "rbac.authorization.k8s.io",
        })

    idx = payload.binding_index if payload.binding_index is not None else 0
    binding_name = str(payload.binding_name).strip() if payload.binding_name is not None else ""
    if not binding_name:
        binding_name = f"{namespace}-binding-{idx}"

    rolebinding_obj = {
        "apiVersion": "rbac.authorization.k8s.io/v1",
        "kind": "RoleBinding",
        "metadata": {
            "name": binding_name,
            "namespace": namespace,
        },
        "subjects": formatted_subjects,
        "roleRef": {
            "kind": roleref_kind,
            "name": roleref_name,
            "apiGroup": "rbac.authorization.k8s.io",
        },
    }

    yaml_text = yaml.safe_dump(rolebinding_obj, sort_keys=False)
    return Response(content=yaml_text, media_type="text/yaml")


@router.put("/apps/{appname}/namespaces/{namespace}/rolebinding_requests")
def put_namespace_rolebinding_requests(appname: str, namespace: str, payload: NamespaceRoleBindingsUpdate, env: Optional[str] = None):
    env = _require_env(env)
    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)

    rolebinding_path = ns_dir / "rolebinding_requests.yaml"

    bindings_in = payload.bindings or []
    rolebindings_data = []
    for idx, binding in enumerate(bindings_in):
        roleref_kind = str(binding.roleRef.kind).strip() if binding.roleRef.kind is not None else ""
        roleref_name = str(binding.roleRef.name).strip() if binding.roleRef.name is not None else ""

        if not roleref_kind:
            raise HTTPException(status_code=400, detail=f"Role Binding #{idx + 1}: Role Type is mandatory and cannot be empty")
        if not roleref_name:
            raise HTTPException(status_code=400, detail=f"Role Binding #{idx + 1}: Role Reference is mandatory and cannot be empty")

        if not binding.subjects or len(binding.subjects) == 0:
            raise HTTPException(status_code=400, detail=f"Role Binding #{idx + 1}: At least one subject is required")

        validated_subjects = []
        for sub_idx, subject in enumerate(binding.subjects):
            subject_kind = str(subject.kind).strip() if subject.kind is not None else ""
            subject_name = str(subject.name).strip() if subject.name is not None else ""

            if not subject_kind:
                raise HTTPException(status_code=400, detail=f"Role Binding #{idx + 1}, Subject #{sub_idx + 1}: Subject Kind is mandatory and cannot be empty")
            if not subject_name:
                raise HTTPException(status_code=400, detail=f"Role Binding #{idx + 1}, Subject #{sub_idx + 1}: Subject Name is mandatory and cannot be empty")

            validated_subjects.append({
                "kind": subject_kind,
                "name": subject_name,
            })

        rolebindings_data.append({
            "subjects": validated_subjects,
            "roleRef": {
                "kind": roleref_kind,
                "name": roleref_name,
            }
        })

    try:
        rolebinding_path.write_text(yaml.safe_dump(rolebindings_data, sort_keys=False))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write RoleBinding: {e}")

    try:
        pull_requests.ensure_pull_request(appname=appname, env=env)
    except Exception as e:
        logger.error("Failed to ensure PR for %s/%s: %s", str(env), str(appname), str(e))

    return {"bindings": rolebindings_data}


@router.get("/apps/{appname}/namespaces/{namespace}/rolebinding_requests")
def get_namespace_rolebinding_requests(appname: str, namespace: str, env: Optional[str] = None):
    env = _require_env(env)
    ns_dir = _require_namespace_dir(env=env, appname=appname, namespace=namespace)

    rolebinding_path = ns_dir / "rolebinding_requests.yaml"
    if not rolebinding_path.exists() or not rolebinding_path.is_file():
        return {"bindings": []}

    try:
        parsed = yaml.safe_load(rolebinding_path.read_text())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read RoleBinding: {e}")

    if parsed is None:
        return {"bindings": []}

    if isinstance(parsed, list):
        bindings = [b for b in parsed if isinstance(b, dict)]
        return {"bindings": bindings}

    if isinstance(parsed, dict) and parsed.get("subjects"):
        subjects = parsed.get("subjects", [])
        role_ref = parsed.get("roleRef", {})
        bindings = []
        if isinstance(subjects, list):
            bindings.append({
                "subjects": [s for s in subjects if isinstance(s, dict)],
                "roleRef": role_ref if isinstance(role_ref, dict) else {},
            })
        return {"bindings": bindings}

    return {"bindings": []}
