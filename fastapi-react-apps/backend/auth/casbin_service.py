from __future__ import annotations

from pathlib import Path
from threading import RLock
from time import monotonic
from typing import Any
import logging

import casbin
from casbin.persist.adapters import FileAdapter
from fastapi import HTTPException, status

logger = logging.getLogger("uvicorn.error")


_ENFORCER_LOCK = RLock()
_POLICY_RELOAD_INTERVAL_SECONDS = 30 * 60
_LAST_POLICY_LOAD_AT = 0.0


def build_enforcer(*, model_path: Path, policy_path: Path) -> casbin.Enforcer:
    adapter = FileAdapter(str(policy_path))
    e = casbin.Enforcer(str(model_path), adapter)
    with _ENFORCER_LOCK:
        e.load_policy()

    global _LAST_POLICY_LOAD_AT
    _LAST_POLICY_LOAD_AT = monotonic()
    return e


def enforce_rbac(
    *,
    enforcer: casbin.Enforcer,
    usercontext: dict[str, Any],
    obj: str,
    act: str,
    app: dict[str, Any] | None = None,
) -> None:
    """Enforce RBAC policy for a user action on a resource.

    Raises HTTPException with 403 status if permission is denied.
    Logs all authorization failures for security auditing.

    Args:
        enforcer: Casbin enforcer instance
        usercontext: User context with username, roles, groups, app_roles
        obj: Resource path (e.g., "/apps/app1")
        act: HTTP method (e.g., "GET", "POST", "PUT", "DELETE")
        app: Optional app context with id field

    Raises:
        HTTPException: 403 Forbidden if user lacks permission
    """
    app_ctx = app or {"id": ""}
    username = usercontext.get("username", "unknown")
    roles = usercontext.get("roles", [])
    groups = usercontext.get("groups", [])
    app_roles = usercontext.get("app_roles", {})

    with _ENFORCER_LOCK:
        global _LAST_POLICY_LOAD_AT
        now = monotonic()
        if now - _LAST_POLICY_LOAD_AT >= _POLICY_RELOAD_INTERVAL_SECONDS:
            enforcer.load_policy()
            _LAST_POLICY_LOAD_AT = now
        allowed = enforcer.enforce(usercontext, obj, act, app_ctx)

    if not allowed:
        # Log security event for audit trail
        logger.warning(
            "RBAC: Access denied - user=%s, roles=%s, groups=%s, app_roles=%s, resource=%s, action=%s, app_id=%s",
            username,
            roles,
            groups,
            app_roles,
            obj,
            act,
            app_ctx.get("id", ""),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": f"Access denied: You don't have permission to {act} {obj}",
                "user": username,
                "roles": roles,
                "resource": obj,
                "action": act,
            },
        )