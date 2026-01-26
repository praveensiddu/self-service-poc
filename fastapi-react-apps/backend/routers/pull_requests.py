from fastapi import APIRouter
from typing import Optional

from backend.routers.apps import _require_env, PULL_REQUESTS_BY_ENV_AND_APP

router = APIRouter(tags=["pull_requests"])


@router.get("/apps/{appname}/pull_requests")
def get_pull_requests(appname: str, env: Optional[str] = None):
    env = _require_env(env)
    return PULL_REQUESTS_BY_ENV_AND_APP.get(env, {}).get(appname, [])
