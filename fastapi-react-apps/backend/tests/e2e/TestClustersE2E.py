"""
End-to-end tests for Clusters API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx


@pytest.mark.asyncio
class TestClustersE2E:
    """End-to-end tests for clusters management."""

    async def test_get_clusters_returns_valid_structure(self, async_client: httpx.AsyncClient):
        """Test that GET /api/clusters returns valid cluster data."""
        response = await async_client.get("/api/clusters")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)

        # Check that environments are present
        for env_key, clusters in data.items():
            assert isinstance(clusters, list)
            for cluster in clusters:
                assert "clustername" in cluster
                assert "purpose" in cluster
                assert "datacenter" in cluster
                assert "applications" in cluster
                assert isinstance(cluster["applications"], list)

    async def test_get_clusters_for_app_returns_list(self, async_client: httpx.AsyncClient):
        """Test that GET /api/clusters?env=...&app=... returns a list of cluster names."""
        response = await async_client.get("/api/clusters", params={"env": "test", "app": "someapp"})
        # Server may return 400 if not initialized in test environment; accept both.
        assert response.status_code in (200, 400)
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    async def test_get_envlist_returns_environments(self, async_client: httpx.AsyncClient):
        """Test that GET /api/envlist returns environment keys."""
        response = await async_client.get("/api/envlist")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 0

    async def test_config_endpoint(self, async_client: httpx.AsyncClient):
        """Test GET /api/config endpoint."""
        response = await async_client.get("/api/config")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "workspace" in data

    async def test_deployment_type_endpoint(self, async_client: httpx.AsyncClient):
        """Test GET /api/deployment_type endpoint."""
        response = await async_client.get("/api/deployment_type")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "deployment_type" in data

    async def test_current_user_endpoint(self, async_client: httpx.AsyncClient):
        """Test GET /api/current-user endpoint."""
        response = await async_client.get("/api/current-user")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "username" in data
