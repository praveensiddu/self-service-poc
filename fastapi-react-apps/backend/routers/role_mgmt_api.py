#!/usr/bin/env python3

import logging
from typing import Any, Callable

from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel

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
        group: str
        app: str
        role: str


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
        rows = rolemgmtimpl.get_grp2apps2roles()
        return {"rows": rows}


    @router.post("/role-management/app/assign")
    def assign_role(payload: RoleAssignmentRequest,
                    grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/app/assign", "POST", {})
        return execute_role_operation(
            lambda: rolemgmtimpl.add_grp2apps2roles(grantor, payload.group, payload.app, payload.role),
            "assigned"
        )


    @router.post("/role-management/app/unassign")
    def unassign_role(payload: RoleAssignmentRequest,
                      grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, "/role-management/app/unassign", "POST", {})
        return execute_role_operation(
            lambda: rolemgmtimpl.del_grp2apps2roles(grantor, payload.group, payload.app, payload.role),
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
