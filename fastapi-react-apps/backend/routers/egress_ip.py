from fastapi import APIRouter
from typing import Optional

from backend.routers.apps import _require_env, EGRESS_IPS_BY_ENV_AND_APP

router = APIRouter(tags=["egress_ip"])


@router.get("/apps/{appname}/egress_ips")
def get_egress_ips(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return EGRESS_IPS_BY_ENV_AND_APP.get(env, {}).get(appname, [])
