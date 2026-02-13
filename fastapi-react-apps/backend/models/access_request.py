from typing import Dict, Literal

from pydantic import BaseModel


class AppAccessRequest(BaseModel):
    role: Literal["viewer", "manager"]
    application: str
    userid: str | None = None
    group: str | None = None


class GlobalAccessRequest(BaseModel):
    role: Literal["viewall"]
    userid: str | None = None
    group: str | None = None


AccessReqType = Literal["app_access", "global_access"]


class AccessRequest(BaseModel):
    requestor: str
    requested_at: str
    type: AccessReqType
    payload: Dict[str, str]
