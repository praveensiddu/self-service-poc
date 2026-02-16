#!/usr/bin/env python3

from datetime import datetime
import logging
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel
import yaml

from backend.auth.role_mgmt_impl import RoleMgmtImpl
from backend.dependencies import get_current_user


rolemgmtimpl = RoleMgmtImpl.get_instance()


def execute_role_operation(operation: Callable[[], None], operation_name: str) -> dict[str, Any]:
    """Execute a role management operation with standardized error handling.

    This helper handles common error patterns:
    - Success -> Returns success response
    - ValueError -> 400 Bad Request (validation/business rule errors)
    - Exception -> 500 Internal Server Error (unexpected failures)

    Args:
        operation: The operation to execute (callable with no args)
        operation_name: Human-readable operation name for error messages (e.g., "assigned", "unassigned")

    Returns:
        Success response dict with status and message

    Raises:
        HTTPException: On validation or server errors
    """
    try:
        operation()
        return {
            "status": "success",
            "message": f"Role {operation_name} successfully",
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"status": "error", "message": str(ve)},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"status": "error", "message": f"Internal server error while {operation_name.replace('ed', 'ing')} role"},
        )


def create_rolemgmt_router(
    *,
    enforce: Callable[[dict[str, Any], str, str, dict[str, Any] | None], None],
    get_current_user_context: Callable[..., dict[str, Any]]
) -> APIRouter:

    router = APIRouter(tags=["RoleManagement"])
    logger = logging.getLogger("RoleManagementAPI")

    class RoleAssignmentRequest(BaseModel):
        app: str
        role: str
        userid: str | None = None
        group: str | None = None


    class GlobalRoleAssignmentRequest(BaseModel):
        group: str
        role: str


    class UserGlobalRoleAssignmentRequest(BaseModel):
        user: str
        role: str


    def get_grantor(request: Request) -> str | None:
        return get_current_user(request)

    @router.get("/role-management/rbac/refresh")
    def refresh_rbac_roles() -> dict[str, Any]:
        try:
            rolemgmtimpl.update_roles(force=True)
            return {
                "status": "success",
                "message": "Role refreshed successfully",
            }
        except Exception as e:
            # Unexpected failures
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "message": "Internal server error while refreshing role",
                },
            )

    @router.get("/role-management/app")
    def list_applicationservice_roles() -> dict[str, Any]:
        group_rows = rolemgmtimpl.get_grp2apps2roles()
        user_rows = rolemgmtimpl.get_user2apps2roles()
        return {
            "rows": group_rows,
            "group_rows": group_rows,
            "user_rows": user_rows,
        }


    @router.post("/role-management/app/assign")
    def assign_role(payload: RoleAssignmentRequest,
                    grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/app/assign", "POST", {})
        userid = str(payload.userid or "").strip()
        group = str(payload.group or "").strip()
        if bool(userid) == bool(group):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"status": "error", "message": "Exactly one of userid or group is required"},
            )
        result = execute_role_operation(
            (lambda: rolemgmtimpl.add_user2apps2roles(grantor, userid, payload.app, payload.role))
            if userid
            else (lambda: rolemgmtimpl.add_grp2apps2roles(grantor, group, payload.app, payload.role)),
            "assigned"
        )
        try:
            store_path = (Path.home() / "workspace" / "kselfserv" / "temp" / "accessrequests.yaml")
            raw = None
            if store_path.exists() and store_path.is_file():
                loaded = yaml.safe_load(store_path.read_text())
                if isinstance(loaded, dict):
                    raw = loaded
            if isinstance(raw, dict):
                matches: list[tuple[str, dict[str, object]]] = []
                for k, v in raw.items():
                    if not isinstance(k, str) or not isinstance(v, dict):
                        continue
                    if str(v.get("type") or "").strip() != "app_access":
                        continue
                    p = v.get("payload")
                    if not isinstance(p, dict):
                        continue
                    if str(p.get("application") or "").strip() != str(payload.app or "").strip():
                        continue
                    if userid and str(p.get("userid") or "").strip() != userid:
                        continue
                    if group and str(p.get("group") or "").strip() != group:
                        continue
                    matches.append((k, v))

                if matches:
                    def _requested_at(key: str) -> str:
                        return str(key.split(":", 1)[0] if ":" in key else "")

                    matches.sort(key=lambda kv: _requested_at(kv[0]), reverse=True)
                    k, v = matches[0]
                    v = dict(v)
                    p = dict(v.get("payload") or {})
                    p["application"] = str(payload.app or "").strip()
                    p["role"] = str(payload.role or "").strip()
                    if userid:
                        p["userid"] = userid
                        p.pop("group", None)
                    else:
                        p["group"] = group
                        p.pop("userid", None)
                    v["payload"] = p
                    v["status"] = "granted"
                    v["granted_by"] = str(grantor or "").strip() or "unknown"
                    v["granted_at"] = datetime.now().astimezone().isoformat()
                    raw[k] = v
                    store_path.write_text(yaml.safe_dump(raw, sort_keys=False))
        except Exception:
            pass

        return result


    @router.post("/role-management/app/unassign")
    def unassign_role(payload: RoleAssignmentRequest,
                      grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/app/unassign", "POST", {})
        userid = str(payload.userid or "").strip()
        group = str(payload.group or "").strip()
        if bool(userid) == bool(group):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"status": "error", "message": "Exactly one of userid or group is required"},
            )
        return execute_role_operation(
            (lambda: rolemgmtimpl.del_user2apps2roles(grantor, userid, payload.app, payload.role))
            if userid
            else (lambda: rolemgmtimpl.del_grp2apps2roles(grantor, group, payload.app, payload.role)),
            "unassigned"
        )


    @router.get("/role-management/groupglobal")
    def list_groupglobal_roles() -> dict[str, Any]:
        rows = rolemgmtimpl.get_grps2globalroles()
        return {"rows": rows}


    @router.post("/role-management/groupglobal/assign",
                 summary="Assign roles for groups ",
                 description="""{
      "group": "sysgrp",
      "role": "viewall", "role_mgmt_admin"
      ]
    }""")
    def assign_groupglobal_role(payload: GlobalRoleAssignmentRequest,
                                grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/groupglobal/assign", "POST", {})
        return execute_role_operation(
            lambda: rolemgmtimpl.add_grps2globalroles(grantor, payload.group, payload.role),
            "assigned"
        )


    @router.post("/role-management/groupglobal/unassign",
                 summary="Unassign roles for groups ",
                 description="""{
      "group": "sysgrp",
      "role": "viewall", "role_mgmt_admin"
      ]
    }""")
    def unassign_groupglobal_role(payload: GlobalRoleAssignmentRequest,
                                  grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/groupglobal/unassign", "POST", {})
        return execute_role_operation(
            lambda: rolemgmtimpl.del_grps2globalroles(grantor, payload.group, payload.role),
            "unassigned"
        )


    @router.get("/role-management/userglobal",
                 summary="Get the list of roles that govern user access across the portal",
                 description="""""")
    def list_userglobal_roles() -> dict[str, Any]:
        rows = rolemgmtimpl.get_users2globalroles()
        return {"rows": rows}


    @router.get("/role-management/user/roles")
    def lookup_user_roles(
        userid: str,
        user_context: dict[str, Any] = Depends(get_current_user_context),
    ) -> dict[str, Any]:
        enforce(user_context, "/role-management/user/roles", "GET", {})

        user_id = str(userid or "").strip()
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"status": "error", "message": "userid is required"},
            )

        groups = rolemgmtimpl.get_user_groups(user_id)

        user_global_map = rolemgmtimpl.get_users2globalroles()
        group_global_map = rolemgmtimpl.get_grps2globalroles()
        user_app_map = rolemgmtimpl.get_user2apps2roles()
        group_app_map = rolemgmtimpl.get_grp2apps2roles()

        user_global_roles = user_global_map.get(user_id) if isinstance(user_global_map, dict) else None
        if not isinstance(user_global_roles, list):
            user_global_roles = []

        group_global_roles: dict[str, list[str]] = {}
        if isinstance(group_global_map, dict):
            for g in groups:
                roles = group_global_map.get(g)
                if isinstance(roles, list):
                    group_global_roles[g] = [str(r).strip() for r in roles if str(r).strip()]

        user_app_roles = user_app_map.get(user_id) if isinstance(user_app_map, dict) else None
        if not isinstance(user_app_roles, dict):
            user_app_roles = {}

        group_app_roles: dict[str, dict[str, list[str]]] = {}
        if isinstance(group_app_map, dict):
            for g in groups:
                amap = group_app_map.get(g)
                if not isinstance(amap, dict):
                    continue
                next_amap: dict[str, list[str]] = {}
                for app, roles in amap.items():
                    if not isinstance(roles, list):
                        continue
                    next_amap[str(app)] = [str(r).strip() for r in roles if str(r).strip()]
                if next_amap:
                    group_app_roles[g] = next_amap

        combined_app_roles = rolemgmtimpl.get_app_roles(groups, user_id)
        combined_global_roles = rolemgmtimpl.get_user_roles(user_id, groups)

        return {
            "userid": user_id,
            "groups": groups,
            "user_global_roles": [str(r).strip() for r in user_global_roles if str(r).strip()],
            "group_global_roles": group_global_roles,
            "user_app_roles": user_app_roles,
            "group_app_roles": group_app_roles,
            "combined_global_roles": combined_global_roles,
            "combined_app_roles": combined_app_roles,
        }


    @router.post("/role-management/userglobal/assign",
                 summary="Assign roles for users ",
                 description="""{
      "user": "asingh",
      "role": "viewall", "role_mgmt_admin", "bastion_view", "bastion_review", "bastion_recertify", "bastion_upload"
      ]
    }""")
    def assign_userglobal_role(payload: UserGlobalRoleAssignmentRequest,
                               grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/userglobal/assign", "POST", {})
        return execute_role_operation(
            lambda: rolemgmtimpl.add_users2globalroles(grantor, payload.user, payload.role),
            "assigned"
        )


    @router.post("/role-management/userglobal/unassign",
                 summary="Unassign roles for users ",
                 description="""{
      "user": "asingh",
      "role": "viewall", "role_mgmt_admin"
      ]
    }""")
    def unassign_userglobal_role(payload: UserGlobalRoleAssignmentRequest,
                                 grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/userglobal/unassign", "POST", {})
        return execute_role_operation(
            lambda: rolemgmtimpl.del_users2globalroles(grantor, payload.user, payload.role),
            "unassigned"
        )


    return router
