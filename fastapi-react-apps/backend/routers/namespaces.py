from fastapi import APIRouter, HTTPException
from typing import Optional

from routers.apps import _require_env, NAMESPACES_BY_ENV_AND_APP

router = APIRouter(tags=["namespaces"])


@router.get("/apps/{appname}/namespaces")
def get_namespaces(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return NAMESPACES_BY_ENV_AND_APP.get(env, {}).get(appname, {})


@router.delete("/apps/{appname}/namespaces")
def delete_namespaces(appname: str, env: Optional[str] = None, namespaces: Optional[str] = None):
    """Delete specific namespaces from an application

    Args:
        appname: The application name
        env: The environment (dev/qa/prd)
        namespaces: Comma-separated list of namespace names to delete
    """
    env = _require_env(env)

    if not namespaces:
        raise HTTPException(status_code=400, detail="namespaces parameter is required (comma-separated list)")

    namespace_list = [ns.strip() for ns in namespaces.split(",") if ns.strip()]

    if not namespace_list:
        raise HTTPException(status_code=400, detail="No valid namespaces provided")

    deleted_data = {
        "appname": appname,
        "env": env,
        "requested_deletions": namespace_list,
        "deleted_namespaces": [],
        "not_found": [],
    }

    # Check if app exists in this environment
    if env not in NAMESPACES_BY_ENV_AND_APP or appname not in NAMESPACES_BY_ENV_AND_APP[env]:
        deleted_data["not_found"] = namespace_list
        return deleted_data

    app_namespaces = NAMESPACES_BY_ENV_AND_APP[env][appname]

    # Delete each namespace
    for ns_name in namespace_list:
        if ns_name in app_namespaces:
            del app_namespaces[ns_name]
            deleted_data["deleted_namespaces"].append(ns_name)
        else:
            deleted_data["not_found"].append(ns_name)

    # If all namespaces are deleted, remove the app entry
    if len(app_namespaces) == 0:
        del NAMESPACES_BY_ENV_AND_APP[env][appname]
        deleted_data["app_entry_removed"] = True



    return deleted_data
