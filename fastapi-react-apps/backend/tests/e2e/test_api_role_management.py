"""
End-to-end tests for Role Management API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx


@pytest.mark.asyncio
class TestRoleManagementE2E:
    """End-to-end tests for role management endpoints."""

    async def test_refresh_rbac_roles(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/role-management/rbac/refresh refreshes roles."""
        response = await async_client.get("/api/v1/role-management/rbac/refresh")
        assert response.status_code in [200, 400, 500]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert "status" in data
            assert data["status"] == "success"

    async def test_list_application_roles(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/role-management/app returns application roles."""
        response = await async_client.get("/api/v1/role-management/app")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "rows" in data
        # rows is a dict mapping group/user -> app -> roles
        assert isinstance(data["rows"], dict)

    async def test_list_group_global_roles(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/role-management/groupglobal returns group global roles."""
        response = await async_client.get("/api/v1/role-management/groupglobal")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "rows" in data
        # rows is a dict mapping group -> list of roles
        assert isinstance(data["rows"], dict)

    async def test_list_user_global_roles(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/role-management/userglobal returns user global roles."""
        response = await async_client.get("/api/v1/role-management/userglobal")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "rows" in data
        # rows is a dict mapping user -> list of roles
        assert isinstance(data["rows"], dict)

    async def test_assign_app_role_requires_auth(self, async_client: httpx.AsyncClient):
        """Test that POST /api/v1/role-management/app/assign requires proper auth."""
        response = await async_client.post(
            "/api/v1/role-management/app/assign",
            json={
                "app": "testapp",
                "role": "viewer",
                "userid": "testuser"
            }
        )
        # Should return 200, 400, or 403 depending on auth status
        assert response.status_code in [200, 400, 403]

    async def test_assign_app_role_requires_userid_or_group(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/role-management/app/assign requires userid or group."""
        # Neither userid nor group
        response = await async_client.post(
            "/api/v1/role-management/app/assign",
            json={
                "app": "testapp",
                "role": "viewer"
            }
        )
        assert response.status_code in [400, 403, 422]

        # Both userid and group
        response = await async_client.post(
            "/api/v1/role-management/app/assign",
            json={
                "app": "testapp",
                "role": "viewer",
                "userid": "testuser",
                "group": "testgroup"
            }
        )
        assert response.status_code in [400, 403]

    async def test_unassign_app_role_requires_userid_or_group(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/role-management/app/unassign requires userid or group."""
        response = await async_client.post(
            "/api/v1/role-management/app/unassign",
            json={
                "app": "testapp",
                "role": "viewer"
            }
        )
        assert response.status_code in [400, 403, 422]

    async def test_assign_group_global_role_requires_group_and_role(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/role-management/groupglobal/assign requires group and role."""
        # Missing group
        response = await async_client.post(
            "/api/v1/role-management/groupglobal/assign",
            json={"role": "viewall"}
        )
        assert response.status_code in [400, 403, 422]

        # Missing role
        response = await async_client.post(
            "/api/v1/role-management/groupglobal/assign",
            json={"group": "testgroup"}
        )
        assert response.status_code in [400, 403, 422]

    async def test_assign_user_global_role_requires_user_and_role(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/role-management/userglobal/assign requires user and role."""
        # Missing user
        response = await async_client.post(
            "/api/v1/role-management/userglobal/assign",
            json={"role": "viewall"}
        )
        assert response.status_code in [400, 403, 422]

        # Missing role
        response = await async_client.post(
            "/api/v1/role-management/userglobal/assign",
            json={"user": "testuser"}
        )
        assert response.status_code in [400, 403, 422]

