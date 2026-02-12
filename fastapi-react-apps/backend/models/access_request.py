from typing import Dict, Literal

from pydantic import BaseModel


class AppAccessRequest(BaseModel):
    role: Literal["viewer", "manager"]
    application: str
    usr_or_grp: str


class GlobalAccessRequest(BaseModel):
    role: Literal["viewall"]
    usr_or_grp: str


AccessReqType = Literal["app_access", "global_access"]


class AccessRequest(BaseModel):
    requestor: str
    requested_at: str
    type: AccessReqType
    payload: Dict[str, str]
