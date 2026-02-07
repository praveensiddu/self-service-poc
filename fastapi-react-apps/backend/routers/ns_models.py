from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class NamespaceCreate(BaseModel):
    namespace: str
    clusters: Optional[List[str]] = None
    egress_nameid: Optional[str] = None


class NamespaceInfoUpdate(BaseModel):
    clusters: Optional[List[str]] = None
    egress_nameid: Optional[str] = None


class NamespaceInfoEgressUpdate(BaseModel):
    egress_nameid: Optional[str] = None
    enable_pod_based_egress_ip: Optional[bool] = None


class NamespaceResourcesCpuMem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesLimitsDefault(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesLimits(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cpu: Optional[str] = None
    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")
    default: Optional[NamespaceResourcesLimitsDefault] = None


class NamespaceResourcesQuotaLimits(BaseModel):
    """ResourceQuota limits section (limits.memory and limits.ephemeral-storage)"""

    model_config = ConfigDict(populate_by_name=True)

    memory: Optional[str] = None
    ephemeral_storage: Optional[str] = Field(None, alias="ephemeral-storage")


class NamespaceResourcesUpdate(BaseModel):
    requests: Optional[NamespaceResourcesCpuMem] = None
    quota_limits: Optional[NamespaceResourcesQuotaLimits] = None
    limits: Optional[NamespaceResourcesLimits] = None


class RBSubject(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None


class RBRoleRef(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None


class RoleBinding(BaseModel):
    """Represents a RoleBinding with multiple subjects and one roleRef"""

    subjects: List[RBSubject]
    roleRef: RBRoleRef


class RoleBindingList(BaseModel):
    """List of RoleBindings, each with multiple subjects"""

    bindings: Optional[List[RoleBinding]] = None


class NamespaceUpdate(BaseModel):
    namespace_info: Optional[NamespaceInfoUpdate] = None
    resources: Optional[NamespaceResourcesUpdate] = None
    rolebindings: Optional[RoleBindingList] = None


class NamespaceInfoBasicUpdate(BaseModel):
    namespace_info: NamespaceInfoUpdate


class NamespaceInfoEgressRequest(BaseModel):
    namespace_info: NamespaceInfoEgressUpdate


class NamespaceResourceQuotaUpdate(BaseModel):
    requests: Optional[NamespaceResourcesCpuMem] = None
    quota_limits: Optional[NamespaceResourcesQuotaLimits] = None


class NamespaceLimitRangeUpdate(BaseModel):
    limits: Optional[NamespaceResourcesLimits] = None


class NamespaceRoleBindingsUpdate(BaseModel):
    bindings: Optional[List[RoleBinding]] = None


class NamespaceResourcesYamlRequest(BaseModel):
    resources: NamespaceResourcesUpdate


class NamespaceCopyRequest(BaseModel):
    from_env: str
    to_env: str
    to_namespace: str
