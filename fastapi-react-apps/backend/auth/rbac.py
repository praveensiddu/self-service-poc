from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from fastapi import Depends, Request

from backend.auth.casbin_service import build_enforcer, enforce_rbac
from backend.auth.role_mgmt_impl import RoleMgmtImpl
from backend.core.deps import get_current_user
import os

_API_PREFIX = "/api/v1"
_BASE_DIR = Path(__file__).resolve().parent
_ENFORCER = build_enforcer(
    model_path=_BASE_DIR / "casbin_model.conf",
    policy_path=_BASE_DIR / "casbin_policy.csv",
)


def _normalize_obj(path: str) -> str:
    if path.startswith(_API_PREFIX):
        return path[len(_API_PREFIX) :] or "/"
    return path


def enforce_request(usercontext: dict[str, Any], obj: str, act: str, app: dict[str, Any] | None = None) -> None:
    enforce_rbac(enforcer=_ENFORCER, usercontext=usercontext, obj=_normalize_obj(obj), act=act, app=app)


def get_user_context(user_id: str) -> dict[str, Any]:
    rolemgmtimpl = RoleMgmtImpl.get_instance()
    groups = rolemgmtimpl.get_user_groups(user_id)
    roles = rolemgmtimpl.get_user_roles(user_id, groups)
    return {
        "username": user_id,
        "groups": groups,
        "roles": roles,
        "app_roles": rolemgmtimpl.get_app_roles(groups),
    }


def get_current_user_context(request: Request) -> dict[str, Any]:
    user_id = get_current_user(request) or ""
    return get_user_context(user_id)


def require_rbac(
    *,
    obj: str | Callable[[Request], str],
    act: str | Callable[[Request], str],
    app_id: str | Callable[[Request], str] | None = None,
) -> Callable[[Request, dict[str, Any]], None]:
    def _dep(request: Request, user_context: dict[str, Any] = Depends(get_current_user_context)) -> None:
        resolved_obj = obj(request) if callable(obj) else obj
        resolved_act = act(request) if callable(act) else act
        resolved_app_id = ""
        if app_id is not None:
            resolved_app_id = app_id(request) if callable(app_id) else str(app_id)
        enforce_request(user_context, resolved_obj, resolved_act, {"id": resolved_app_id})

    return _dep
