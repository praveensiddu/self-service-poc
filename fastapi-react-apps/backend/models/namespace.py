"""Namespace-related Pydantic models."""

from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class NamespaceCreate(BaseModel):
    """Request model for creating a namespace."""
    namespace: str
    clusters: Optional[List[str]] = None
    egress_nameid: Optional[str] = None


class NamespaceInfoUpdate(BaseModel):
    """Model for updating namespace info."""
    clusters: Optional[List[str]] = None
    egress_nameid: Optional[str] = None


class NamespaceInfoEgressUpdate(BaseModel):
    """Model for updating namespace egress settings."""
    egress_nameid: Optional[str] = None
    enable_pod_based_egress_ip: Optional[bool] = None


class NsArgoCdDetails(BaseModel):
    """Model for namespace ArgoCD configuration."""
    need_argo: Optional[bool] = None
    argocd_sync_strategy: Optional[str] = None
    gitrepourl: Optional[str] = None


class EgressPort(BaseModel):
    """Model for egress firewall port configuration."""
    protocol: Optional[str] = None
    port: Optional[int] = None


class EgressFirewallRule(BaseModel):
    """Model for egress firewall rule."""
    egressType: Optional[str] = None
    egressValue: Optional[str] = None
    ports: Optional[List[EgressPort]] = None


class EgressFirewallUpdate(BaseModel):
    """Model for updating egress firewall rules."""
    rules: Optional[List[EgressFirewallRule]] = None


class RoleBindingYamlRequest(BaseModel):
    """Model for role binding YAML generation request."""
    subjects: List['RBSubject']
    roleRef: 'RBRoleRef'
    binding_index: Optional[int] = None
    binding_name: Optional[str] = None


class NamespaceResourcesCpuMem(BaseModel):
    """Model for CPU and memory resource specifications."""
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesLimitsDefault(BaseModel):
    """Model for default resource limits."""
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesLimits(BaseModel):
    """Model for resource limits with defaults."""
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")
    default: Optional[NamespaceResourcesLimitsDefault] = None


class NamespaceResourcesQuotaLimits(BaseModel):
    """ResourceQuota limits section (limits.memory and limits.ephemeral-storage)."""
    model_config = ConfigDict(populate_by_name=True)

    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesUpdate(BaseModel):
    """Model for updating namespace resources."""
    requests: Optional[NamespaceResourcesCpuMem] = None
    quota_limits: Optional[NamespaceResourcesQuotaLimits] = None
    limits: Optional[NamespaceResourcesLimits] = None


class RBSubject(BaseModel):
    """Model for RoleBinding subject."""
    kind: Optional[str] = None
    name: Optional[str] = None


class RBRoleRef(BaseModel):
    """Model for RoleBinding role reference."""
    kind: Optional[str] = None
    name: Optional[str] = None


class RoleBinding(BaseModel):
    """Represents a RoleBinding with multiple subjects and one roleRef."""
    subjects: List[RBSubject]
    roleRef: RBRoleRef


class RoleBindingList(BaseModel):
    """List of RoleBindings, each with multiple subjects."""
    bindings: Optional[List[RoleBinding]] = None


class NamespaceUpdate(BaseModel):
    """Model for updating a namespace."""
    namespace_info: Optional[NamespaceInfoUpdate] = None
    resources: Optional[NamespaceResourcesUpdate] = None
    rolebindings: Optional[RoleBindingList] = None


class NamespaceInfoBasicUpdate(BaseModel):
    """Model for basic namespace info update."""
    namespace_info: NamespaceInfoUpdate


class NamespaceInfoEgressRequest(BaseModel):
    """Request model for namespace egress update."""
    namespace_info: NamespaceInfoEgressUpdate


class NamespaceResourceQuotaUpdate(BaseModel):
    """Model for updating namespace resource quota."""
    requests: Optional[NamespaceResourcesCpuMem] = None
    quota_limits: Optional[NamespaceResourcesQuotaLimits] = None


class NamespaceLimitRangeUpdate(BaseModel):
    """Model for updating namespace limit range."""
    limits: Optional[NamespaceResourcesLimits] = None


class NamespaceRoleBindingsUpdate(BaseModel):
    """Model for updating namespace role bindings."""
    bindings: Optional[List[RoleBinding]] = None


class NamespaceResourcesYamlRequest(BaseModel):
    """Request model for generating namespace resources YAML."""
    resources: NamespaceResourcesUpdate


class NamespaceCopyRequest(BaseModel):
    """Request model for copying a namespace."""
    from_env: str
    to_env: str
    to_namespace: str


# ============================================
# Response Models
# ============================================

class NamespaceResponse(BaseModel):
    """Response model for namespace data."""
    name: str
    description: str = ""
    clusters: List[str] = []
    egress_nameid: Optional[str] = None
    enable_pod_based_egress_ip: bool = False
    allow_all_egress: bool = False
    need_argo: bool = False


class NamespaceCreateResponse(BaseModel):
    """Response model for namespace creation."""
    name: str
    description: str = ""
    clusters: List[str] = []
    egress_nameid: Optional[str] = None
    enable_pod_based_egress_ip: bool = False
    allow_all_egress: bool = False
    need_argo: bool = False
    generate_argo_app: bool = True
    status: str = ""


class NamespaceDeleteResponse(BaseModel):
    """Response model for namespace deletion."""
    appname: str
    env: str
    requested_deletions: List[str]
    deleted_namespaces: List[str] = []
    not_found: List[str] = []
    app_entry_removed: bool = False


class NamespaceCopyResponse(BaseModel):
    """Response model for namespace copy."""
    from_env: str
    from_namespace: str
    to_env: str
    to_namespace: str
    copied: bool
