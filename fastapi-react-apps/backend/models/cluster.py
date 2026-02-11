"""Cluster-related Pydantic models."""

from pydantic import BaseModel
from typing import List, Optional, Dict


class IpRange(BaseModel):
    """IP range with start and end addresses."""
    start_ip: str
    end_ip: str


class ClusterUpsert(BaseModel):
    """Request model for creating or updating a cluster."""
    clustername: str
    purpose: str = ""
    datacenter: str = ""
    applications: Optional[List[str]] = None
    l4_ingress_ip_ranges: Optional[List[Dict[str, str]]] = None
    egress_ip_ranges: Optional[List[Dict[str, str]]] = None


class ClusterResponse(BaseModel):
    """Response model for cluster data."""
    clustername: str
    purpose: str = ""
    datacenter: str = ""
    applications: List[str] = []
    l4_ingress_ip_ranges: List[Dict[str, str]] = []
    egress_ip_ranges: List[Dict[str, str]] = []


class ClusterDependency(BaseModel):
    """Model for cluster dependency information."""
    app: str
    namespace: Optional[str] = None
    cluster: Optional[str] = None
    note: Optional[str] = None


class ClusterDeleteCheckResponse(BaseModel):
    """Response model for checking if cluster can be deleted."""
    can_delete: bool
    namespaces: List[ClusterDependency] = []
    l4_ingress_allocations: List[ClusterDependency] = []
    egress_allocations: List[ClusterDependency] = []


class ClusterDeleteResponse(BaseModel):
    """Response model for cluster deletion."""
    deleted: bool


class ClusterCreateResponse(BaseModel):
    """Response model for cluster creation."""
    env: str
    cluster: ClusterResponse
