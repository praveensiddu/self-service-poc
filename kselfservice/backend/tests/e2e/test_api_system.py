"""
End-to-end tests for System API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx


@pytest.mark.asyncio
class TestSystemE2E:
    """End-to-end tests for system management endpoints."""

    async def test_get_config_returns_valid_structure(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/config returns valid configuration."""
        response = await async_client.get("/api/v1/config")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "workspace" in data

    async def test_get_envlist_returns_list(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/envlist returns a list or dict of environments."""
        response = await async_client.get("/api/v1/envlist")
        assert response.status_code == 200

        data = response.json()
        # envlist can return either a list or a dict depending on configuration
        assert isinstance(data, (list, dict))

    async def test_get_deployment_type_returns_valid_structure(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/deployment_type returns valid deployment info."""
        response = await async_client.get("/api/v1/deployment_type")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "deployment_env" in data
        assert "demo_mode" in data
        assert "title" in data
        assert "headerColor" in data
        assert isinstance(data["title"], dict)
        assert isinstance(data["headerColor"], dict)

    async def test_get_portal_mode_returns_readonly_flag(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/portal-mode returns portal mode info."""
        response = await async_client.get("/api/v1/portal-mode")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "readonly" in data
        assert "env_configured" in data
        assert isinstance(data["readonly"], bool)
        assert isinstance(data["env_configured"], bool)

    async def test_get_enforcement_settings(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/settings/enforcement returns enforcement settings."""
        response = await async_client.get("/api/v1/settings/enforcement")
        # May return 403 if not authorized, or 200 with settings
        assert response.status_code in [200, 400, 403]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

    async def test_get_role_refs_with_kind(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/catalog/role_refs returns role references."""
        response = await async_client.get("/api/v1/catalog/role_refs", params={"kind": "Role"})
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_get_role_refs_cluster_role(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/catalog/role_refs with ClusterRole kind."""
        response = await async_client.get("/api/v1/catalog/role_refs", params={"kind": "ClusterRole"})
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_get_requests_changes(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/requests/changes returns change info."""
        response = await async_client.get("/api/v1/requests/changes")
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_get_requests_changes_with_env(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/requests/changes with env parameter."""
        response = await async_client.get("/api/v1/requests/changes", params={"env": "dev"})
        assert response.status_code in [200, 400]

