from fastapi import APIRouter, HTTPException, Response
from typing import Optional

import yaml

from pydantic import BaseModel

from backend.routers.apps import _require_env
from backend.routers.namespaces import RBRoleRef, RBSubject

router = APIRouter(tags=["rolebindings"])


class RoleBindingYamlRequest(BaseModel):
    subject: RBSubject
    roleRef: RBRoleRef
    binding_index: Optional[int] = None
    binding_name: Optional[str] = None


@router.post("/apps/{appname}/namespaces/{namespace}/rolebindings/rolebinding_yaml")
def get_rolebinding_yaml(appname: str, namespace: str, payload: RoleBindingYamlRequest, env: Optional[str] = None):
    env = _require_env(env)

    subject_kind = str(payload.subject.kind).strip() if payload.subject and payload.subject.kind is not None else ""
    subject_name = str(payload.subject.name).strip() if payload.subject and payload.subject.name is not None else ""
    roleref_kind = str(payload.roleRef.kind).strip() if payload.roleRef and payload.roleRef.kind is not None else ""
    roleref_name = str(payload.roleRef.name).strip() if payload.roleRef and payload.roleRef.name is not None else ""

    if not subject_kind or not subject_name or not roleref_kind or not roleref_name:
        raise HTTPException(status_code=400, detail="subject.kind, subject.name, roleRef.kind, and roleRef.name are required")

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
        "subjects": [
            {
                "kind": subject_kind,
                "name": subject_name,
                "apiGroup": "rbac.authorization.k8s.io",
            }
        ],
        "roleRef": {
            "kind": roleref_kind,
            "name": roleref_name,
            "apiGroup": "rbac.authorization.k8s.io",
        },
    }

    yaml_text = yaml.safe_dump(rolebinding_obj, sort_keys=False)
    return Response(content=yaml_text, media_type="text/yaml")
