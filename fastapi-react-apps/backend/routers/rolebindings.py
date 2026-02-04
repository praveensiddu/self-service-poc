from fastapi import APIRouter, HTTPException, Response
from typing import Optional, List

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env
from backend.routers.namespaces import RBRoleRef, RBSubject

router = APIRouter(tags=["rolebindings"])


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
