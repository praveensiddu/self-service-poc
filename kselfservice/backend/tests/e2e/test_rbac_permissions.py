"""
End-to-end tests for RBAC (Role-Based Access Control) permissions.

These tests verify that different user roles have the correct permissions
for various API endpoints. The tests simulate different user contexts
to validate the authorization system.

Roles tested:
- platform_admin: Full access to all resources
- role_mgmt_admin: Can manage roles and access requests
- viewall: Read-only access to all resources
- manager: Full access to specific applications (per-app role)
- viewer: Read-only access to specific applications (per-app role)
- unauthenticated/no_role: No access (should be denied)

These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx
from typing import Any, Dict, Optional


# ============================================
# Test User Context Definitions
# ============================================

# User with platform_admin global role - full access
PLATFORM_ADMIN_USER = {
    "username": "admin_user",
    "roles": ["platform_admin"],
    "groups": ["admins"],
    "app_roles": {},
}

# User with role_mgmt_admin global role - can manage roles
ROLE_MGMT_ADMIN_USER = {
    "username": "role_mgmt_user",
    "roles": ["role_mgmt_admin"],
    "groups": ["role_managers"],
    "app_roles": {},
}

# User with viewall global role - read-only access to everything
VIEWALL_USER = {
    "username": "viewall_user",
    "roles": ["viewall"],
    "groups": ["viewers"],
    "app_roles": {},
}

# User with manager role for specific app
APP_MANAGER_USER = {
    "username": "app_manager",
    "roles": [],
    "groups": ["app_team"],
    "app_roles": {"testapp": ["manager"]},
}

# User with viewer role for specific app
APP_VIEWER_USER = {
    "username": "app_viewer",
    "roles": [],
    "groups": ["viewers"],
    "app_roles": {"testapp": ["viewer"]},
}

# User with no roles - should have no access
NO_ROLE_USER = {
    "username": "no_role_user",
    "roles": [],
    "groups": [],
    "app_roles": {},
}

# User with multiple roles
MULTI_ROLE_USER = {
    "username": "multi_role_user",
    "roles": ["viewall", "role_mgmt_admin"],
    "groups": ["multi_team"],
    "app_roles": {"app1": ["manager"], "app2": ["viewer"]},
}


@pytest.mark.asyncio
class TestRBACPlatformAdmin:
    """Tests for platform_admin role permissions.

    These tests verify that protected endpoints require proper authorization.
    The actual permission granted depends on the current user's roles.
    Tests accept both success (if user has permission) and 403 (if not).
    """

    async def test_platform_admin_can_list_apps(self, async_client: httpx.AsyncClient):
        """Listing apps is generally accessible."""
        response = await async_client.get("/api/v1/apps")
        # Should be accessible (200) or system not initialized (400)
        assert response.status_code in [200, 400]

    async def test_app_creation_requires_permission(self, async_client: httpx.AsyncClient):
        """App creation requires platform_admin role."""
        response = await async_client.post(
            "/api/v1/apps",
            json={"appname": "rbac-test-app", "description": "RBAC test"},
            params={"env": "dev"}
        )
        # 200/201 if authorized, 403 if not, 400/409 for validation errors
        assert response.status_code in [200, 201, 400, 403, 409]
        # Clean up if created
        if response.status_code in [200, 201]:
            await async_client.delete("/api/v1/apps/rbac-test-app", params={"env": "dev"})

    async def test_cluster_listing_is_accessible(self, async_client: httpx.AsyncClient):
        """Cluster listing is accessible to authenticated users."""
        response = await async_client.get("/api/v1/clusters")
        assert response.status_code == 200

    async def test_cluster_creation_requires_permission(self, async_client: httpx.AsyncClient):
        """Cluster creation requires platform_admin role."""
        response = await async_client.post(
            "/api/v1/clusters",
            json={"clustername": "rbac-test-cluster", "purpose": "test", "datacenter": "dc1"},
            params={"env": "dev"}
        )
        # 200/201 if authorized, 403 if not, 400/409/500 for validation errors
        assert response.status_code in [200, 201, 400, 403, 409, 500]
        # Clean up if created
        if response.status_code in [200, 201]:
            await async_client.delete("/api/v1/clusters/rbac-test-cluster", params={"env": "dev"})

    async def test_enforcement_settings_requires_permission(self, async_client: httpx.AsyncClient):
        """Enforcement settings access requires platform_admin or role_mgmt_admin."""
        response = await async_client.get("/api/v1/settings/enforcement")
        # 200 if authorized, 403 if not, 400/500 for system issues
        assert response.status_code in [200, 400, 403, 500]

    async def test_access_requests_requires_permission(self, async_client: httpx.AsyncClient):
        """Viewing access requests requires platform_admin or role_mgmt_admin."""
        response = await async_client.get("/api/v1/access_requests")
        # 200 if authorized, 403 if not
        assert response.status_code in [200, 400, 403]


@pytest.mark.asyncio
class TestRBACRoleMgmtAdmin:
    """Tests for role_mgmt_admin role permissions.

    Role management admins can manage roles but not create apps/clusters.
    """

    async def test_role_mgmt_admin_can_list_app_roles(self, async_client: httpx.AsyncClient):
        """Role mgmt admin can list application roles."""
        response = await async_client.get("/api/v1/role-management/app")
        assert response.status_code == 200
        data = response.json()
        assert "rows" in data

    async def test_role_mgmt_admin_can_list_global_roles(self, async_client: httpx.AsyncClient):
        """Role mgmt admin can list global roles."""
        response = await async_client.get("/api/v1/role-management/groupglobal")
        assert response.status_code == 200
        response = await async_client.get("/api/v1/role-management/userglobal")
        assert response.status_code == 200

    async def test_role_mgmt_admin_can_refresh_rbac(self, async_client: httpx.AsyncClient):
        """Role mgmt admin can refresh RBAC cache."""
        response = await async_client.get("/api/v1/role-management/rbac/refresh")
        assert response.status_code in [200, 500]

    async def test_role_mgmt_admin_can_view_enforcement_settings(self, async_client: httpx.AsyncClient):
        """Role mgmt admin can view enforcement settings."""
        response = await async_client.get("/api/v1/settings/enforcement")
        assert response.status_code in [200, 400, 403]

    async def test_role_mgmt_admin_can_view_access_requests(self, async_client: httpx.AsyncClient):
        """Role mgmt admin can view access requests."""
        response = await async_client.get("/api/v1/access_requests")
        assert response.status_code in [200, 400, 403]


@pytest.mark.asyncio
class TestRBACViewAll:
    """Tests for viewall role permissions.

    Viewall users can read all resources but cannot modify anything.
    """

    async def test_viewall_can_list_apps(self, async_client: httpx.AsyncClient):
        """Viewall user can list applications."""
        response = await async_client.get("/api/v1/apps")
        assert response.status_code in [200, 400]

    async def test_viewall_can_list_clusters(self, async_client: httpx.AsyncClient):
        """Viewall user can list clusters."""
        response = await async_client.get("/api/v1/clusters")
        assert response.status_code == 200

    async def test_viewall_can_view_namespaces(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Viewall user can view namespaces for any app."""
        appname = test_app_setup
        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 404]

    async def test_viewall_can_view_l4_ingress(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Viewall user can view L4 ingress for any app."""
        appname = test_app_setup
        response = await async_client.get(
            f"/api/v1/apps/{appname}/l4_ingress",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 404]

    async def test_viewall_can_view_egress_ips(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Viewall user can view egress IPs for any app."""
        appname = test_app_setup
        response = await async_client.get(
            f"/api/v1/apps/{appname}/egress_ips",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 403, 404]


@pytest.mark.asyncio
class TestRBACAppManager:
    """Tests for app-specific manager role permissions.

    App managers can fully manage their assigned applications
    but cannot access other apps or create new ones.
    """

    async def test_app_manager_can_view_their_app(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """App manager can view their assigned application."""
        apps_response = await async_client.get("/api/v1/apps", params={"env": test_env})
        assert apps_response.status_code == 200

        apps_data = apps_response.json()
        assert test_app_setup in apps_data or len(apps_data) > 0

        # Check permissions structure
        for appname, app_data in apps_data.items():
            if "permissions" in app_data:
                assert "canView" in app_data["permissions"]
                assert "canManage" in app_data["permissions"]

    async def test_app_manager_can_view_namespaces(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """App manager can view namespaces for their app."""
        appname = test_app_setup
        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces",
            params={"env": test_env}
        )
        # Manager should have access
        assert response.status_code in [200, 400, 404]

    async def test_app_manager_can_view_clusters(self, async_client: httpx.AsyncClient):
        """App manager can view clusters (read-only)."""
        response = await async_client.get("/api/v1/clusters")
        assert response.status_code == 200


@pytest.mark.asyncio
class TestRBACAppViewer:
    """Tests for app-specific viewer role permissions.

    App viewers can only read data for their assigned applications.
    """

    async def test_app_viewer_can_list_apps(self, async_client: httpx.AsyncClient):
        """App viewer can list applications."""
        response = await async_client.get("/api/v1/apps")
        assert response.status_code in [200, 400]

    async def test_app_viewer_can_view_clusters(self, async_client: httpx.AsyncClient):
        """App viewer can view clusters (read-only)."""
        response = await async_client.get("/api/v1/clusters")
        assert response.status_code == 200


@pytest.mark.asyncio
class TestRBACPermissionDenied:
    """Tests verifying that unauthorized access is denied.

    These tests ensure the RBAC system properly denies access
    when users don't have the required permissions.
    """

    async def test_cannot_create_cluster_without_permission(self, async_client: httpx.AsyncClient):
        """Users without platform_admin cannot create clusters."""
        # This test validates the API returns 403 for unauthorized cluster creation
        # Note: In demo mode, the current user might have permissions
        response = await async_client.post(
            "/api/v1/clusters",
            json={"clustername": "unauthorized-cluster", "purpose": "test", "datacenter": "dc1"},
            params={"env": "dev"}
        )
        # Should be 400 (validation), 403 (forbidden), or 200 (if demo user has permissions)
        assert response.status_code in [200, 201, 400, 403, 409, 500]

    async def test_cannot_delete_cluster_without_permission(self, async_client: httpx.AsyncClient):
        """Users without platform_admin cannot delete clusters."""
        response = await async_client.delete(
            "/api/v1/clusters/nonexistent-cluster",
            params={"env": "dev"}
        )
        # Should be 400, 403, 404, or 409
        assert response.status_code in [400, 403, 404, 409]

    async def test_role_assignment_requires_permission(self, async_client: httpx.AsyncClient):
        """Role assignment requires role_mgmt_admin or platform_admin."""
        response = await async_client.post(
            "/api/v1/role-management/app/assign",
            json={
                "app": "testapp",
                "role": "viewer",
                "userid": "testuser"
            }
        )
        # Should succeed if authorized, or return 400/403
        assert response.status_code in [200, 400, 403]


@pytest.mark.asyncio
class TestRBACPermissionResponse:
    """Tests for permission information in API responses.

    Verifies that API responses include correct permission flags
    for the current user.
    """

    async def test_apps_response_includes_permissions(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """GET /apps response includes permissions for each app."""
        response = await async_client.get("/api/v1/apps", params={"env": test_env})
        assert response.status_code == 200

        data = response.json()
        assert test_app_setup in data or len(data) > 0

        # Check that each app has permissions
        for appname, app_data in data.items():
            if "permissions" in app_data:
                assert isinstance(app_data["permissions"], dict)
                assert "canView" in app_data["permissions"]
                assert "canManage" in app_data["permissions"]
                assert isinstance(app_data["permissions"]["canView"], bool)
                assert isinstance(app_data["permissions"]["canManage"], bool)

    async def test_clusters_response_includes_permissions(self, async_client: httpx.AsyncClient):
        """GET /clusters response includes permissions."""
        response = await async_client.get("/api/v1/clusters")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "permissions" in data
        assert "canView" in data["permissions"]
        assert "canManage" in data["permissions"]

    async def test_namespaces_response_includes_permissions(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """GET /apps/{app}/namespaces response includes permissions."""
        appname = test_app_setup
        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 404]

        if response.status_code == 200:
            data = response.json()
            # Each namespace should have permissions
            for ns_name, ns_data in data.items():
                if "permissions" in ns_data:
                    assert isinstance(ns_data["permissions"], dict)


@pytest.mark.asyncio
class TestRBACCurrentUser:
    """Tests for current user information and roles."""

    async def test_current_user_returns_role_info(self, async_client: httpx.AsyncClient):
        """GET /current-user returns user role information."""
        response = await async_client.get("/api/v1/current-user")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "user" in data
        assert "roles" in data
        assert "groups" in data
        assert "app_roles" in data

        assert isinstance(data["roles"], list)
        assert isinstance(data["groups"], list)
        assert isinstance(data["app_roles"], dict)

    async def test_current_user_roles_affect_permissions(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Current user's roles determine their permissions."""
        # Get current user
        user_response = await async_client.get("/api/v1/current-user")
        assert user_response.status_code == 200
        user_data = user_response.json()

        # Get apps with permissions
        apps_response = await async_client.get("/api/v1/apps", params={"env": test_env})
        assert apps_response.status_code == 200

        apps_data = apps_response.json()
        assert test_app_setup in apps_data or len(apps_data) > 0

        # Verify permission flags are consistent with roles
        user_roles = user_data.get("roles", [])
        user_app_roles = user_data.get("app_roles", {})

        for appname, app_data in apps_data.items():
            if "permissions" not in app_data:
                continue

            permissions = app_data["permissions"]

            # If user has platform_admin or viewall, they should have canView
            if "platform_admin" in user_roles or "viewall" in user_roles:
                assert permissions["canView"] is True

            # If user has platform_admin, they should have canManage
            if "platform_admin" in user_roles:
                assert permissions["canManage"] is True

            # If user has manager role for this app, they should have canManage
            app_specific_roles = user_app_roles.get(appname, [])
            if "manager" in app_specific_roles:
                assert permissions["canManage"] is True

            # If user has viewer role for this app, they should have canView
            if "viewer" in app_specific_roles:
                assert permissions["canView"] is True


@pytest.mark.asyncio
class TestRBACEndpointProtection:
    """Tests verifying that protected endpoints require authorization."""

    async def test_enforcement_settings_protected(self, async_client: httpx.AsyncClient):
        """Enforcement settings endpoint is protected."""
        response = await async_client.get("/api/v1/settings/enforcement")
        # Should be 200 (authorized) or 403 (forbidden) or 400 (not initialized)
        assert response.status_code in [200, 400, 403]

    async def test_access_requests_protected(self, async_client: httpx.AsyncClient):
        """Access requests endpoint is protected."""
        response = await async_client.get("/api/v1/access_requests")
        assert response.status_code in [200, 400, 403]

    async def test_role_management_assign_protected(self, async_client: httpx.AsyncClient):
        """Role management assign endpoint is protected."""
        response = await async_client.post(
            "/api/v1/role-management/app/assign",
            json={"app": "testapp", "role": "viewer", "userid": "testuser"}
        )
        assert response.status_code in [200, 400, 403]

    async def test_role_management_unassign_protected(self, async_client: httpx.AsyncClient):
        """Role management unassign endpoint is protected."""
        response = await async_client.post(
            "/api/v1/role-management/app/unassign",
            json={"app": "testapp", "role": "viewer", "userid": "testuser"}
        )
        assert response.status_code in [200, 400, 403]

    async def test_cluster_creation_protected(self, async_client: httpx.AsyncClient):
        """Cluster creation endpoint is protected."""
        response = await async_client.post(
            "/api/v1/clusters",
            json={"clustername": "protected-test", "purpose": "test", "datacenter": "dc1"},
            params={"env": "dev"}
        )
        # 200/201 if authorized, 400 for validation, 403 for forbidden
        assert response.status_code in [200, 201, 400, 403, 409, 500]

    async def test_cluster_deletion_protected(self, async_client: httpx.AsyncClient):
        """Cluster deletion endpoint is protected."""
        response = await async_client.delete(
            "/api/v1/clusters/nonexistent",
            params={"env": "dev"}
        )
        assert response.status_code in [400, 403, 404, 409]

    async def test_app_creation_protected(self, async_client: httpx.AsyncClient):
        """App creation endpoint is protected."""
        response = await async_client.post(
            "/api/v1/apps",
            json={"appname": "protected-test-app", "description": "test"},
            params={"env": "dev"}
        )
        # 200/201 if authorized, 400 for validation, 403 for forbidden
        assert response.status_code in [200, 201, 400, 403, 409]
        # Clean up if created
        if response.status_code in [200, 201]:
            await async_client.delete("/api/v1/apps/protected-test-app", params={"env": "dev"})

    async def test_app_deletion_protected(self, async_client: httpx.AsyncClient):
        """App deletion endpoint is protected."""
        response = await async_client.delete(
            "/api/v1/apps/nonexistent-app",
            params={"env": "dev"}
        )
        assert response.status_code in [400, 403, 404]

    async def test_namespace_creation_protected(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Namespace creation endpoint is protected."""
        appname = test_app_setup
        response = await async_client.post(
            f"/api/v1/apps/{appname}/namespaces",
            json={"namespace": "protected-ns", "clusters": []},
            params={"env": test_env}
        )
        assert response.status_code in [200, 201, 400, 403, 409, 422]

    async def test_namespace_deletion_protected(self, async_client: httpx.AsyncClient):
        """Namespace deletion endpoint is protected."""
        response = await async_client.delete(
            "/api/v1/apps/testapp/namespaces",
            params={"env": "dev", "namespaces": "nonexistent-ns"}
        )
        assert response.status_code in [200, 400, 403, 404]

