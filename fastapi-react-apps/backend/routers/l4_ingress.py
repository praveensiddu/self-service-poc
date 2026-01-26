from fastapi import APIRouter
from typing import Optional

from backend.routers.apps import _require_env, L4_INGRESS_BY_ENV_AND_APP

router = APIRouter(tags=["l4_ingress"])


@router.get("/apps/{appname}/l4_ingress")
def get_l4_ingress(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return L4_INGRESS_BY_ENV_AND_APP.get(env, {}).get(appname, [])
