"""
Models package - Pydantic models for request/response validation.

This package contains all Pydantic models used throughout the application,
organized by domain:

- application.py: Application-related models
- cluster.py: Cluster-related models
- namespace.py: Namespace-related models
- config.py: Configuration models
- common.py: Shared/common models
"""

from backend.models.application import (
    ApplicationBase,
    ApplicationCreate,
    ApplicationUpdate,
    Application,
    AppCreate,
    AppResponse,
    AppDeleteResponse,
)

from backend.models.cluster import (
    IpRange,
    ClusterUpsert,
    ClusterResponse,
    ClusterDependency,
    ClusterDeleteCheckResponse,
    ClusterDeleteResponse,
    ClusterCreateResponse,
)

from backend.models.namespace import (
    NamespaceCreate,
    NamespaceInfoUpdate,
    NamespaceInfoEgressUpdate,
    NsArgoCdDetails,
    EgressPort,
    EgressFirewallRule,
    EgressFirewallUpdate,
    RoleBindingYamlRequest,
    NamespaceResourcesCpuMem,
    NamespaceResourcesLimitsDefault,
    NamespaceResourcesLimits,
    NamespaceResourcesQuotaLimits,
    NamespaceResourcesUpdate,
    RBSubject,
    RBRoleRef,
    RoleBinding,
    RoleBindingList,
    NamespaceUpdate,
    NamespaceInfoBasicUpdate,
    NamespaceInfoEgressRequest,
    NamespaceResourceQuotaUpdate,
    NamespaceLimitRangeUpdate,
    NamespaceRoleBindingsUpdate,
    NamespaceResourcesYamlRequest,
    NamespaceCopyRequest,
    NamespaceResponse,
    NamespaceCreateResponse,
    NamespaceDeleteResponse,
    NamespaceCopyResponse,
)

from backend.models.config import (
    KSelfServeConfig,
)

from backend.models.common import (
    L4IngressRequestedUpdate,
    L4IngressAllocation,
    L4IngressResponse,
    PullRequestStatus,
)

__all__ = [
    # Application models
    'ApplicationBase',
    'ApplicationCreate',
    'ApplicationUpdate',
    'Application',
    'AppCreate',
    'AppResponse',
    'AppDeleteResponse',
    # Cluster models
    'IpRange',
    'ClusterUpsert',
    'ClusterResponse',
    'ClusterDependency',
    'ClusterDeleteCheckResponse',
    'ClusterDeleteResponse',
    'ClusterCreateResponse',
    # Namespace models
    'NamespaceCreate',
    'NamespaceInfoUpdate',
    'NamespaceInfoEgressUpdate',
    'NsArgoCdDetails',
    'EgressPort',
    'EgressFirewallRule',
    'EgressFirewallUpdate',
    'RoleBindingYamlRequest',
    'NamespaceResourcesCpuMem',
    'NamespaceResourcesLimitsDefault',
    'NamespaceResourcesLimits',
    'NamespaceResourcesQuotaLimits',
    'NamespaceResourcesUpdate',
    'RBSubject',
    'RBRoleRef',
    'RoleBinding',
    'RoleBindingList',
    'NamespaceUpdate',
    'NamespaceInfoBasicUpdate',
    'NamespaceInfoEgressRequest',
    'NamespaceResourceQuotaUpdate',
    'NamespaceLimitRangeUpdate',
    'NamespaceRoleBindingsUpdate',
    'NamespaceResourcesYamlRequest',
    'NamespaceCopyRequest',
    'NamespaceResponse',
    'NamespaceCreateResponse',
    'NamespaceDeleteResponse',
    'NamespaceCopyResponse',
    # Config models
    'KSelfServeConfig',
    # Common models
    'L4IngressRequestedUpdate',
    'L4IngressAllocation',
    'L4IngressResponse',
    'PullRequestStatus',
]
