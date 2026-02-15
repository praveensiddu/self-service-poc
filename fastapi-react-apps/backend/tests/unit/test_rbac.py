"""
Unit tests for RBAC permission checking logic.

These tests verify the Casbin enforcer and permission checking functions
work correctly without requiring a running server.

Tests cover:
- Global role permissions (platform_admin, role_mgmt_admin, viewall)
- Per-app role permissions (manager, viewer)
- Permission checking helper functions
- Edge cases and permission boundaries
"""
import pytest
from pathlib import Path
from typing import Any, Dict


# Import the RBAC module functions
try:
    from backend.auth.casbin_service import build_enforcer
    from backend.auth.rbac import (
        check_permission,
        calculate_resource_permissions,
        _normalize_obj,
    )
    RBAC_AVAILABLE = True
except ImportError:
    RBAC_AVAILABLE = False


# ============================================
# Test User Context Definitions
# ============================================

def make_user_context(
    username: str = "testuser",
    roles: list = None,
    groups: list = None,
    app_roles: dict = None
) -> Dict[str, Any]:
    """Create a user context dict for testing."""
    return {
        "username": username,
        "roles": roles or [],
        "groups": groups or [],
        "app_roles": app_roles or {},
    }


# Predefined user contexts for testing
PLATFORM_ADMIN = make_user_context(
    username="admin",
    roles=["platform_admin"],
    groups=["admins"],
)

ROLE_MGMT_ADMIN = make_user_context(
    username="role_mgr",
    roles=["role_mgmt_admin"],
    groups=["role_managers"],
)

VIEWALL_USER = make_user_context(
    username="viewer",
    roles=["viewall"],
    groups=["viewers"],
)

APP_MANAGER = make_user_context(
    username="app_mgr",
    roles=[],
    groups=["dev_team"],
    app_roles={"myapp": ["manager"]},
)

APP_VIEWER = make_user_context(
    username="app_viewer",
    roles=[],
    groups=["viewers"],
    app_roles={"myapp": ["viewer"]},
)

MULTI_APP_USER = make_user_context(
    username="multi_user",
    roles=[],
    groups=["multi_team"],
    app_roles={
        "app1": ["manager"],
        "app2": ["viewer"],
        "app3": ["manager", "viewer"],
    },
)

NO_ROLE_USER = make_user_context(
    username="no_role",
    roles=[],
    groups=[],
    app_roles={},
)


@pytest.fixture(scope="module")
def enforcer():
    """Create a Casbin enforcer for testing."""
    if not RBAC_AVAILABLE:
        pytest.skip("RBAC module not available")

    base_dir = Path(__file__).resolve().parent.parent.parent / "auth"
    model_path = base_dir / "casbin_model.conf"
    policy_path = base_dir / "casbin_policy.csv"

    if not model_path.exists() or not policy_path.exists():
        pytest.skip("Casbin policy files not found")

    return build_enforcer(model_path=model_path, policy_path=policy_path)


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestNormalizeObj:
    """Tests for path normalization function."""

    def test_normalize_removes_api_prefix(self):
        """Path normalization removes /api/v1 prefix."""
        assert _normalize_obj("/api/v1/apps") == "/apps"
        assert _normalize_obj("/api/v1/clusters") == "/clusters"
        assert _normalize_obj("/api/v1/apps/myapp/namespaces") == "/apps/myapp/namespaces"

    def test_normalize_keeps_non_api_paths(self):
        """Paths without API prefix are kept as-is."""
        assert _normalize_obj("/apps") == "/apps"
        assert _normalize_obj("/clusters") == "/clusters"

    def test_normalize_handles_root(self):
        """Root API path normalizes correctly."""
        assert _normalize_obj("/api/v1") == "/"


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestPlatformAdminPermissions:
    """Tests for platform_admin global role permissions."""

    def test_can_list_apps(self, enforcer):
        """Platform admin can list apps."""
        result = enforcer.enforce(PLATFORM_ADMIN, "/apps", "GET", {"id": ""})
        assert result is True

    def test_can_create_apps(self, enforcer):
        """Platform admin can create apps."""
        result = enforcer.enforce(PLATFORM_ADMIN, "/apps", "POST", {"id": ""})
        assert result is True

    def test_can_view_any_app(self, enforcer):
        """Platform admin can view any app."""
        result = enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp", "GET", {"id": "anyapp"})
        assert result is True

    def test_can_update_any_app(self, enforcer):
        """Platform admin can update any app."""
        result = enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp", "PUT", {"id": "anyapp"})
        assert result is True

    def test_can_delete_any_app(self, enforcer):
        """Platform admin can delete any app."""
        result = enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp", "DELETE", {"id": "anyapp"})
        assert result is True

    def test_can_manage_namespaces(self, enforcer):
        """Platform admin can manage namespaces."""
        assert enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp/namespaces", "GET", {"id": "anyapp"}) is True
        assert enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp/namespaces", "POST", {"id": "anyapp"}) is True
        assert enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp/namespaces", "DELETE", {"id": "anyapp"}) is True

    def test_can_manage_clusters(self, enforcer):
        """Platform admin can manage clusters."""
        assert enforcer.enforce(PLATFORM_ADMIN, "/clusters", "GET", {"id": ""}) is True
        assert enforcer.enforce(PLATFORM_ADMIN, "/clusters", "POST", {"id": ""}) is True
        assert enforcer.enforce(PLATFORM_ADMIN, "/clusters/cluster1", "GET", {"id": ""}) is True
        assert enforcer.enforce(PLATFORM_ADMIN, "/clusters/cluster1", "DELETE", {"id": ""}) is True

    def test_can_access_enforcement_settings(self, enforcer):
        """Platform admin can access enforcement settings."""
        assert enforcer.enforce(PLATFORM_ADMIN, "/settings/enforcement", "GET", {"id": ""}) is True
        assert enforcer.enforce(PLATFORM_ADMIN, "/settings/enforcement", "PUT", {"id": ""}) is True

    def test_can_view_access_requests(self, enforcer):
        """Platform admin can view access requests."""
        assert enforcer.enforce(PLATFORM_ADMIN, "/access_requests", "GET", {"id": ""}) is True

    def test_can_view_l4_ingress(self, enforcer):
        """Platform admin can view and manage L4 ingress."""
        assert enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp/l4_ingress", "GET", {"id": "anyapp"}) is True
        assert enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp/l4_ingress", "PUT", {"id": "anyapp"}) is True

    def test_can_view_egress_ips(self, enforcer):
        """Platform admin can view egress IPs."""
        assert enforcer.enforce(PLATFORM_ADMIN, "/apps/anyapp/egress_ips", "GET", {"id": "anyapp"}) is True


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestRoleMgmtAdminPermissions:
    """Tests for role_mgmt_admin global role permissions."""

    def test_can_manage_roles(self, enforcer):
        """Role mgmt admin can manage roles."""
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/role-management/app", "GET", {"id": ""}) is True
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/role-management/app/assign", "POST", {"id": ""}) is True

    def test_can_manage_global_roles(self, enforcer):
        """Role mgmt admin can manage global roles."""
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/role-management/groupglobal", "GET", {"id": ""}) is True
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/role-management/groupglobal/assign", "POST", {"id": ""}) is True
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/role-management/userglobal", "GET", {"id": ""}) is True
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/role-management/userglobal/assign", "POST", {"id": ""}) is True

    def test_can_access_enforcement_settings(self, enforcer):
        """Role mgmt admin can access enforcement settings."""
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/settings/enforcement", "GET", {"id": ""}) is True
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/settings/enforcement", "PUT", {"id": ""}) is True

    def test_can_view_access_requests(self, enforcer):
        """Role mgmt admin can view access requests."""
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/access_requests", "GET", {"id": ""}) is True

    def test_cannot_create_apps(self, enforcer):
        """Role mgmt admin cannot create apps."""
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/apps", "POST", {"id": ""}) is False

    def test_cannot_create_clusters(self, enforcer):
        """Role mgmt admin cannot create clusters."""
        assert enforcer.enforce(ROLE_MGMT_ADMIN, "/clusters", "POST", {"id": ""}) is False


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestViewAllPermissions:
    """Tests for viewall global role permissions."""

    def test_can_list_apps(self, enforcer):
        """Viewall can list apps."""
        assert enforcer.enforce(VIEWALL_USER, "/apps", "GET", {"id": ""}) is True

    def test_can_view_any_app(self, enforcer):
        """Viewall can view any app."""
        assert enforcer.enforce(VIEWALL_USER, "/apps/anyapp", "GET", {"id": "anyapp"}) is True

    def test_can_view_namespaces(self, enforcer):
        """Viewall can view namespaces."""
        assert enforcer.enforce(VIEWALL_USER, "/apps/anyapp/namespaces", "GET", {"id": "anyapp"}) is True

    def test_can_view_clusters(self, enforcer):
        """Viewall can view clusters."""
        assert enforcer.enforce(VIEWALL_USER, "/clusters", "GET", {"id": ""}) is True

    def test_can_view_l4_ingress(self, enforcer):
        """Viewall can view L4 ingress."""
        assert enforcer.enforce(VIEWALL_USER, "/apps/anyapp/l4_ingress", "GET", {"id": "anyapp"}) is True

    def test_can_view_egress_ips(self, enforcer):
        """Viewall can view egress IPs."""
        assert enforcer.enforce(VIEWALL_USER, "/apps/anyapp/egress_ips", "GET", {"id": "anyapp"}) is True

    def test_cannot_create_apps(self, enforcer):
        """Viewall cannot create apps."""
        assert enforcer.enforce(VIEWALL_USER, "/apps", "POST", {"id": ""}) is False

    def test_cannot_update_apps(self, enforcer):
        """Viewall cannot update apps."""
        assert enforcer.enforce(VIEWALL_USER, "/apps/anyapp", "PUT", {"id": "anyapp"}) is False

    def test_cannot_delete_apps(self, enforcer):
        """Viewall cannot delete apps."""
        assert enforcer.enforce(VIEWALL_USER, "/apps/anyapp", "DELETE", {"id": "anyapp"}) is False

    def test_cannot_create_namespaces(self, enforcer):
        """Viewall cannot create namespaces."""
        assert enforcer.enforce(VIEWALL_USER, "/apps/anyapp/namespaces", "POST", {"id": "anyapp"}) is False

    def test_cannot_create_clusters(self, enforcer):
        """Viewall cannot create clusters."""
        assert enforcer.enforce(VIEWALL_USER, "/clusters", "POST", {"id": ""}) is False


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestAppManagerPermissions:
    """Tests for app-specific manager role permissions."""

    def test_can_view_their_app(self, enforcer):
        """App manager can view their assigned app."""
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp", "GET", {"id": "myapp"}) is True

    def test_can_update_their_app(self, enforcer):
        """App manager can update their assigned app."""
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp", "PUT", {"id": "myapp"}) is True

    def test_can_delete_their_app(self, enforcer):
        """App manager can delete their assigned app."""
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp", "DELETE", {"id": "myapp"}) is True

    def test_can_manage_their_namespaces(self, enforcer):
        """App manager can manage namespaces for their app."""
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp/namespaces", "GET", {"id": "myapp"}) is True
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp/namespaces", "POST", {"id": "myapp"}) is True
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp/namespaces", "DELETE", {"id": "myapp"}) is True

    def test_can_copy_namespace(self, enforcer):
        """App manager can copy namespaces for their app."""
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp/namespaces/ns1/copy", "POST", {"id": "myapp"}) is True

    def test_can_view_l4_ingress(self, enforcer):
        """App manager can view and manage L4 ingress for their app."""
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp/l4_ingress", "GET", {"id": "myapp"}) is True
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp/l4_ingress", "PUT", {"id": "myapp"}) is True

    def test_can_view_egress_ips(self, enforcer):
        """App manager can view egress IPs for their app."""
        assert enforcer.enforce(APP_MANAGER, "/apps/myapp/egress_ips", "GET", {"id": "myapp"}) is True

    def test_cannot_view_clusters_without_global_role(self, enforcer):
        """App manager with only per-app role cannot view clusters (requires global role)."""
        # Per-app manager role doesn't grant access to /clusters endpoint
        # because there's no app.id context for cluster listing
        assert enforcer.enforce(APP_MANAGER, "/clusters", "GET", {"id": ""}) is False

    def test_cannot_view_other_apps(self, enforcer):
        """App manager cannot view other apps."""
        assert enforcer.enforce(APP_MANAGER, "/apps/otherapp", "GET", {"id": "otherapp"}) is False

    def test_cannot_update_other_apps(self, enforcer):
        """App manager cannot update other apps."""
        assert enforcer.enforce(APP_MANAGER, "/apps/otherapp", "PUT", {"id": "otherapp"}) is False

    def test_cannot_create_apps(self, enforcer):
        """App manager cannot create apps."""
        assert enforcer.enforce(APP_MANAGER, "/apps", "POST", {"id": ""}) is False

    def test_cannot_create_clusters(self, enforcer):
        """App manager cannot create clusters."""
        assert enforcer.enforce(APP_MANAGER, "/clusters", "POST", {"id": ""}) is False


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestAppViewerPermissions:
    """Tests for app-specific viewer role permissions."""

    def test_cannot_list_apps_without_global_role(self, enforcer):
        """App viewer with only per-app role cannot list all apps (requires global role)."""
        # Per-app viewer role doesn't grant access to /apps listing
        # because there's no app.id context for app listing
        assert enforcer.enforce(APP_VIEWER, "/apps", "GET", {"id": ""}) is False

    def test_can_view_their_app(self, enforcer):
        """App viewer can view their assigned app."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp", "GET", {"id": "myapp"}) is True

    def test_can_view_their_namespaces(self, enforcer):
        """App viewer can view namespaces for their app."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp/namespaces", "GET", {"id": "myapp"}) is True

    def test_can_view_l4_ingress(self, enforcer):
        """App viewer can view L4 ingress for their app."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp/l4_ingress", "GET", {"id": "myapp"}) is True

    def test_can_view_egress_ips(self, enforcer):
        """App viewer can view egress IPs for their app."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp/egress_ips", "GET", {"id": "myapp"}) is True

    def test_cannot_view_clusters_without_global_role(self, enforcer):
        """App viewer with only per-app role cannot view clusters (requires global role)."""
        # Per-app viewer role doesn't grant access to /clusters endpoint
        # because there's no app.id context for cluster listing
        assert enforcer.enforce(APP_VIEWER, "/clusters", "GET", {"id": ""}) is False

    def test_cannot_update_their_app(self, enforcer):
        """App viewer cannot update their app."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp", "PUT", {"id": "myapp"}) is False

    def test_cannot_delete_their_app(self, enforcer):
        """App viewer cannot delete their app."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp", "DELETE", {"id": "myapp"}) is False

    def test_cannot_create_namespaces(self, enforcer):
        """App viewer cannot create namespaces."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp/namespaces", "POST", {"id": "myapp"}) is False

    def test_cannot_update_l4_ingress(self, enforcer):
        """App viewer cannot update L4 ingress."""
        assert enforcer.enforce(APP_VIEWER, "/apps/myapp/l4_ingress", "PUT", {"id": "myapp"}) is False

    def test_cannot_view_other_apps(self, enforcer):
        """App viewer cannot view other apps."""
        assert enforcer.enforce(APP_VIEWER, "/apps/otherapp", "GET", {"id": "otherapp"}) is False


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestNoRolePermissions:
    """Tests for users with no roles."""

    def test_cannot_list_apps(self, enforcer):
        """User with no roles cannot list apps."""
        assert enforcer.enforce(NO_ROLE_USER, "/apps", "GET", {"id": ""}) is False

    def test_cannot_view_apps(self, enforcer):
        """User with no roles cannot view apps."""
        assert enforcer.enforce(NO_ROLE_USER, "/apps/anyapp", "GET", {"id": "anyapp"}) is False

    def test_cannot_view_clusters(self, enforcer):
        """User with no roles cannot view clusters."""
        assert enforcer.enforce(NO_ROLE_USER, "/clusters", "GET", {"id": ""}) is False

    def test_cannot_access_role_management(self, enforcer):
        """User with no roles cannot access role management."""
        assert enforcer.enforce(NO_ROLE_USER, "/role-management/app", "GET", {"id": ""}) is False

    def test_cannot_access_enforcement_settings(self, enforcer):
        """User with no roles cannot access enforcement settings."""
        assert enforcer.enforce(NO_ROLE_USER, "/settings/enforcement", "GET", {"id": ""}) is False


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestMultiAppUserPermissions:
    """Tests for users with roles on multiple apps."""

    def test_manager_permissions_on_app1(self, enforcer):
        """Multi-app user has manager permissions on app1."""
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app1", "GET", {"id": "app1"}) is True
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app1", "PUT", {"id": "app1"}) is True
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app1", "DELETE", {"id": "app1"}) is True

    def test_viewer_permissions_on_app2(self, enforcer):
        """Multi-app user has viewer permissions on app2."""
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app2", "GET", {"id": "app2"}) is True
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app2", "PUT", {"id": "app2"}) is False
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app2", "DELETE", {"id": "app2"}) is False

    def test_both_roles_on_app3(self, enforcer):
        """Multi-app user with both manager and viewer roles has manager access."""
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app3", "GET", {"id": "app3"}) is True
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app3", "PUT", {"id": "app3"}) is True
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app3", "DELETE", {"id": "app3"}) is True

    def test_no_permissions_on_other_apps(self, enforcer):
        """Multi-app user has no permissions on unassigned apps."""
        assert enforcer.enforce(MULTI_APP_USER, "/apps/app4", "GET", {"id": "app4"}) is False


@pytest.mark.skipif(not RBAC_AVAILABLE, reason="RBAC module not available")
class TestCalculateResourcePermissions:
    """Tests for the calculate_resource_permissions helper function."""

    def test_platform_admin_has_full_permissions(self):
        """Platform admin has canView and canManage."""
        permissions = calculate_resource_permissions(
            PLATFORM_ADMIN, "/apps/anyapp", {"id": "anyapp"}
        )
        assert permissions["canView"] is True
        assert permissions["canManage"] is True

    def test_viewall_has_view_only(self):
        """Viewall user has canView but not canManage."""
        permissions = calculate_resource_permissions(
            VIEWALL_USER, "/apps/anyapp", {"id": "anyapp"}
        )
        assert permissions["canView"] is True
        assert permissions["canManage"] is False

    def test_app_manager_has_permissions_on_their_app(self):
        """App manager has permissions on their app."""
        permissions = calculate_resource_permissions(
            APP_MANAGER, "/apps/myapp", {"id": "myapp"}
        )
        assert permissions["canView"] is True
        assert permissions["canManage"] is True

    def test_app_manager_no_permissions_on_other_apps(self):
        """App manager has no permissions on other apps."""
        permissions = calculate_resource_permissions(
            APP_MANAGER, "/apps/otherapp", {"id": "otherapp"}
        )
        assert permissions["canView"] is False
        assert permissions["canManage"] is False

    def test_app_viewer_has_view_only_on_their_app(self):
        """App viewer has view-only on their app."""
        permissions = calculate_resource_permissions(
            APP_VIEWER, "/apps/myapp", {"id": "myapp"}
        )
        assert permissions["canView"] is True
        assert permissions["canManage"] is False

    def test_no_role_user_has_no_permissions(self):
        """User with no roles has no permissions."""
        permissions = calculate_resource_permissions(
            NO_ROLE_USER, "/apps/anyapp", {"id": "anyapp"}
        )
        assert permissions["canView"] is False
        assert permissions["canManage"] is False

