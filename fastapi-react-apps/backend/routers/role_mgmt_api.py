#!/usr/bin/env python3

import logging
from fastapi import APIRouter, UploadFile, Form, HTTPException, Body, Request, Depends

from backend.auth.role_mgmt_impl import RoleMgmtImpl
from pydantic import BaseModel, Field
from fastapi import HTTPException, status
from typing import Any, Callable


from backend.core.deps import get_current_user


rolemgmtimpl = RoleMgmtImpl.get_instance()

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
    def list_applicationservice_roles() -> dict():
        rows = rolemgmtimpl.get_grp2apps2roles()
        return {"rows": rows}


    @router.post("/role-management/app/assign")
    def assign_role(payload: RoleAssignmentRequest,
                    grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, f"/role-management/app/assign", "POST", {})
        try:
            rolemgmtimpl.add_grp2apps2roles(
                grantor,
                payload.group,
                payload.app,
                payload.role,
            )
            return {
                "status": "success",
                "message": "Role assigned successfully",
            }

        except ValueError as ve:
            # Validation / business rule errors → UI-friendly
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "message": str(ve),
                },
            )

        except Exception as e:
            # Unexpected failures
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "message": "Internal server error while assigning role",
                },
            )


    @router.post("/role-management/app/unassign")
    def unassign_role(payload: RoleAssignmentRequest,
                      grantor: str | None = Depends(get_grantor),
                    user_context: dict[str, Any] = Depends(get_current_user_context)) -> dict[str, Any]:
        enforce(user_context, f"/role-management/app/unassign", "POST", {})
        try:
            rolemgmtimpl.del_grp2apps2roles(
                grantor,
                payload.group,
                payload.app,
                payload.role,
            )
            return {
                "status": "success",
                "message": "Role unassigned successfully",
            }

        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "message": str(ve),
                },
            )

        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "message": "Internal server error while unassigning role",
                },
            )


    @router.get("/role-management/groupglobal")
    def list_groupglobal_roles() -> dict():
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

        enforce(user_context, f"/role-management/groupglobal/assign", "POST", {})
        try:
            rolemgmtimpl.add_grps2globalroles(
                grantor,
                payload.group,
                payload.role,
            )
            return {
                "status": "success",
                "message": "Role assigned successfully",
            }

        except ValueError as ve:
            # Validation / business rule errors → UI-friendly
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "message": str(ve),
                },
            )

        except Exception as e:
            # Unexpected failures
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "message": "Internal server error while assigning role",
                },
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

        enforce(user_context, f"/role-management/groupglobal/unassign", "POST", {})
        try:
            rolemgmtimpl.del_grps2globalroles(
                grantor,
                payload.group,
                payload.role,
            )
            return {
                "status": "success",
                "message": "Role unassigned successfully",
            }

        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "message": str(ve),
                },
            )

        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "message": "Internal server error while unassigning role",
                },
            )


    @router.get("/role-management/userglobal",
                 summary="Get the list of roles that govern user access across the portal",
                 description="""""")
    def list_userglobal_roles() -> dict():
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

        enforce(user_context, f"/role-management/userglobal/assign", "POST", {})
        try:
            rolemgmtimpl.add_users2globalroles(
                grantor,
                payload.user,
                payload.role,
            )
            return {
                "status": "success",
                "message": "Role assigned successfully",
            }

        except ValueError as ve:
            # Validation / business rule errors → UI-friendly
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "message": str(ve),
                },
            )

        except Exception as e:
            # Unexpected failures
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "message": "Internal server error while assigning role",
                },
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

        enforce(user_context, f"/role-management/userglobal/unassign", "POST", {})
        try:
            rolemgmtimpl.del_users2globalroles(
                grantor,
                payload.user,
                payload.role,
            )
            return {
                "status": "success",
                "message": "Role unassigned successfully",
            }

        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "status": "error",
                    "message": str(ve),
                },
            )

        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "status": "error",
                    "message": "Internal server error while unassigning role",
                },
            )


    return router
