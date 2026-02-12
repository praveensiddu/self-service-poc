from fastapi import APIRouter, Request, HTTPException
from pathlib import Path
import os
import yaml

from backend.auth.role_mgmt_impl import RoleMgmtImpl
from backend.auth.rbac import get_current_user_context

router = APIRouter(tags=["users"])


@router.get("/current-user")
def get_user_api(request: Request):
    """Get current user information."""
    ctx = get_current_user_context(request)
    return {
        "user": ctx.get("username") or "",
        "roles": ctx.get("roles") or [],
        "groups": ctx.get("groups") or [],
        "app_roles": ctx.get("app_roles") or {},
    }


@router.put("/current-user")
def put_user_api(payload: dict):
    if os.getenv("DEMO_MODE", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Not supported")

    user = str((payload or {}).get("user") or "").strip()
    if not user:
        raise HTTPException(status_code=400, detail="user is required")

    os.environ["CURRENT_USER"] = user
    RoleMgmtImpl.get_instance().update_roles(force=True)
    return {"status": "success", "user": user}


@router.get("/demo-users")
def get_demo_users():
    if os.getenv("DEMO_MODE", "").lower() != "true":
        return {"rows": []}

    p = Path.home() / "workspace" / "kselfserv" / "cloned-repositories" / "control" / "rbac" / "demo_mode" / "demo_users.yaml"
    if not p.exists() or not p.is_file():
        return {"rows": []}
    raw = yaml.safe_load(p.read_text())
    if not isinstance(raw, dict):
        return {"rows": []}
    rows = []
    for user, meta in raw.items():
        if not isinstance(user, str) or not isinstance(meta, dict):
            continue
        rows.append({
            "user": user,
            "name": str(meta.get("name") or user),
            "description": str(meta.get("description") or ""),
        })
    return {"rows": rows}
