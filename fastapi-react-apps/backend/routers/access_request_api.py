from datetime import datetime
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, List

import yaml

from backend.dependencies import get_current_user
from backend.auth.rbac import require_rbac
from backend.auth.role_mgmt_impl import RoleMgmtImpl
from backend.models.access_request import AccessRequest, AppAccessRequest, GlobalAccessRequest


router = APIRouter(tags=["access_request"])

logger = logging.getLogger("uvicorn.error")


class AccessRequestsImpl:
    _instance = None

    def __init__(self):
        self._store_path = (Path.home() / "workspace" / "kselfserv" / "temp" / "accessrequests.yaml")

    def _read_from_disk(self) -> Dict[str, Dict[str, object]]:
        try:
            if not self._store_path.exists() or not self._store_path.is_file():
                return {}
            loaded = yaml.safe_load(self._store_path.read_text())
            if not isinstance(loaded, dict):
                return {}
            sanitized: Dict[str, Dict[str, object]] = {}
            for k, v in loaded.items():
                if not isinstance(k, str) or not isinstance(v, dict):
                    continue

                row: Dict[str, object] = {}
                for kk, vv in v.items():
                    if not isinstance(kk, str):
                        continue

                    # Preserve nested payload object as a dict. Older entries may have payload
                    # stored as a string representation; attempt to parse it as YAML.
                    if kk == "payload":
                        if isinstance(vv, dict):
                            row[kk] = {str(pkk): str(pvv) for pkk, pvv in vv.items() if isinstance(pkk, str)}
                        elif isinstance(vv, str):
                            try:
                                parsed = yaml.safe_load(vv)
                                if isinstance(parsed, dict):
                                    row[kk] = {str(pkk): str(pvv) for pkk, pvv in parsed.items() if isinstance(pkk, str)}
                                else:
                                    row[kk] = {}
                            except Exception:
                                row[kk] = {}
                        else:
                            row[kk] = {}
                        continue

                    # All other fields should be strings.
                    row[kk] = str(vv)

                sanitized[str(k)] = row
            return sanitized
        except Exception as e:
            logger.error("Failed to load access requests from %s: %s", str(self._store_path), str(e), exc_info=True)
            return {}

    def _write_to_disk(self, items: Dict[str, Dict[str, object]]) -> None:
        try:
            self._store_path.parent.mkdir(parents=True, exist_ok=True)
            self._store_path.write_text(yaml.safe_dump(items or {}, sort_keys=False))
        except Exception as e:
            logger.error("Failed to persist access requests to %s: %s", str(self._store_path), str(e), exc_info=True)

    @classmethod
    def get_instance(cls) -> "AccessRequestsImpl":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def request_access(self, item: "AccessRequest") -> None:
        key = f"{item.requested_at}:{item.requestor}:{item.type}"
        items = self._read_from_disk()
        items[key] = item.model_dump()
        self._write_to_disk(items)

    def get_all_access_requests(self) -> Dict[str, Dict[str, object]]:
        return dict(self._read_from_disk())


accessrequestimpl: AccessRequestsImpl = AccessRequestsImpl.get_instance()

@router.get("/access_requests", response_model=List[AccessRequest])
def list_requests(
    request: Request,
    _: None = Depends(require_rbac(obj=lambda r: r.url.path, act=lambda r: r.method)),
):
    requests = accessrequestimpl.get_all_access_requests()
    return sorted(requests.values(), key=lambda r: r.get("requested_at"), reverse=True)

@router.post("/app_access", response_model=AccessRequest)
def create_app_access_request(payload: AppAccessRequest, request: Request):
    userid = (payload.userid or "").strip()
    group = (payload.group or "").strip()
    if bool(userid) == bool(group):
        raise HTTPException(status_code=400, detail="Exactly one of userid or group is required")

    requestor = get_current_user(request) or "unknown"
    item = AccessRequest(
        requestor=requestor,
        requested_at= datetime.now().astimezone().isoformat(),
        type="app_access",
        payload={
            "role": payload.role,
            "application": payload.application,
            **({"userid": userid} if userid else {}),
            **({"group": group} if group else {}),
        },
    )
    accessrequestimpl.request_access(item)
    return item

@router.post("/global_access", response_model=AccessRequest)
def create_global_request(payload: GlobalAccessRequest, request: Request):
    userid = (payload.userid or "").strip()
    group = (payload.group or "").strip()
    if bool(userid) == bool(group):
        raise HTTPException(status_code=400, detail="Exactly one of userid or group is required")

    requestor = get_current_user(request) or "unknown"

    rolemgmtimpl = RoleMgmtImpl.get_instance()
    if userid:
        rolemgmtimpl.add_users2globalroles(requestor, userid, payload.role)
    else:
        rolemgmtimpl.add_grps2globalroles(requestor, group, payload.role)

    item = AccessRequest(
        requestor=requestor,
        requested_at=datetime.now().astimezone().isoformat(),
        type="global_access",
        payload={
            "role": payload.role,
            **({"userid": userid} if userid else {}),
            **({"group": group} if group else {}),
        },
    )
    accessrequestimpl.request_access(item)
    return item