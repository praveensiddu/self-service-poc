from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Dict

from fastapi import Depends, Request

from backend.auth.casbin_service import build_enforcer, enforce_rbac
from backend.auth.role_mgmt_impl import RoleMgmtImpl

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


def check_permission(usercontext: dict[str, Any], obj: str, act: str, app: dict[str, Any] | None = None) -> bool:
    """Check if user has permission without raising exception.

    Args:
        usercontext: User context dict with roles and groups
        obj: Object path (e.g. "/apps/app1")
        act: Action (e.g. "GET", "PUT", "DELETE")
        app: App context dict with id

    Returns:
        True if user has permission, False otherwise
    """
    app_ctx = app or {"id": ""}
    return _ENFORCER.enforce(usercontext, _normalize_obj(obj), act, app_ctx)


def calculate_resource_permissions(
    user_context: Dict[str, Any],
    resource_path: str,
    app_context: Dict[str, Any] | None = None,
    view_actions: tuple[str, ...] = ("GET",),
    manage_actions: tuple[str, ...] = ("PUT", "DELETE", "POST"),
) -> Dict[str, bool]:
    """Calculate standard canView/canManage permissions for a resource.

    This helper reduces code duplication by providing a single function
    for calculating the common permission pattern used across endpoints.

    Args:
        user_context: User context dict with roles, groups, app_roles
        resource_path: The resource path (e.g., "/apps/{appname}")
        app_context: Optional app context with id for app-scoped permissions
        view_actions: HTTP methods that indicate view permission (default: GET)
        manage_actions: HTTP methods that indicate manage permission (default: PUT, DELETE, POST)

    Returns:
        Dict with canView and canManage boolean flags
    """
    app_ctx = app_context or {"id": ""}

    can_view = any(
        check_permission(user_context, resource_path, action, app_ctx)
        for action in view_actions
    )

    can_manage = any(
        check_permission(user_context, resource_path, action, app_ctx)
        for action in manage_actions
    )

    return {"canView": can_view, "canManage": can_manage}


def add_permissions_to_items(
    items: Dict[str, Any],
    user_context: Dict[str, Any],
    resource_path_template: str,
    app_id: str = "",
) -> None:
    """Add permissions to each item in a dictionary of items.

    Mutates the items dict in place by adding a 'permissions' key to each item.

    Args:
        items: Dictionary of items keyed by item name
        user_context: User context for permission checking
        resource_path_template: Path template with {item_id} placeholder (e.g., "/apps/{item_id}")
        app_id: Application ID for app-scoped resources
    """
    for item_id, item_data in items.items():
        app_context = {"id": app_id or item_id}
        resource_path = resource_path_template.format(item_id=item_id)
        item_data["permissions"] = calculate_resource_permissions(
            user_context, resource_path, app_context
        )


def wrap_response_with_permissions(
    data: Any,
    user_context: Dict[str, Any],
    resource_path: str,
    app_context: Dict[str, Any] | None = None,
    data_key: str = "items",
) -> Dict[str, Any]:
    """Wrap response data with top-level permissions.

    Creates a standardized response format with data and permissions.

    Args:
        data: The data to include in response
        user_context: User context for permission checking
        resource_path: Resource path for permission checking
        app_context: Optional app context
        data_key: Key to use for data in response (default: "items")

    Returns:
        Dict with data under data_key and permissions dict
    """
    permissions = calculate_resource_permissions(user_context, resource_path, app_context)
    return {
        data_key: data,
        "permissions": permissions,
    }


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
    from backend.dependencies import get_current_user
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
