"""Common/shared Pydantic models used across multiple domains."""

from pydantic import BaseModel
from typing import List, Optional


class L4IngressRequestedUpdate(BaseModel):
    """Request model for updating L4 ingress requested counts."""
    clustername: str
    purpose: str
    requested_total: int


class L4IngressReleaseIpRequest(BaseModel):
    """Request model for releasing a single allocated L4 ingress IP."""
    clustername: str
    purpose: str
    ip: str


class L4IngressAllocation(BaseModel):
    """L4 ingress allocation details."""
    name: str
    purpose: str
    ips: List[str]


class L4IngressResponse(BaseModel):
    """Response model for L4 ingress data."""
    clustername: str
    purpose: str
    requested_total: int
    allocated_total: int
    allocations: List[L4IngressAllocation] = []


class PullRequestStatus(BaseModel):
    """Status model for pull requests."""
    env: str
    appname: str
    head_branch: str
    base_branch: str
    pr_number: Optional[int] = None
    pr_url: str = ""
    required_approvers: List[str] = []
    approved_by: List[str] = []
    missing_approvers: List[str] = []
    merge_allowed: bool = False
