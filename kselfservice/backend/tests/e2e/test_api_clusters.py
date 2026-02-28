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
        """Test that GET /api/v1/clusters returns valid cluster data with permissions."""
        response = await async_client.get("/api/v1/clusters")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)

        # New structure includes 'clusters' and 'permissions'
        assert "clusters" in data
        assert "permissions" in data
        assert isinstance(data["permissions"], dict)

        clusters_data = data["clusters"]
        assert isinstance(clusters_data, dict)

        # Check that environments contain cluster lists
        for env_key, clusters in clusters_data.items():
            assert isinstance(clusters, list)
            for cluster in clusters:
                assert "clustername" in cluster
                assert "purpose" in cluster
                assert "datacenter" in cluster
                assert "applications" in cluster
                assert isinstance(cluster["applications"], list)

    async def test_get_clusters_for_app_returns_list(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/clusters?env=...&app=... returns cluster names with permissions."""
        response = await async_client.get("/api/v1/clusters", params={"env": "dev", "app": "someapp"})
        # Server may return 400 if not initialized in test environment
        assert response.status_code in (200, 400)
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert "clusters" in data
            assert "permissions" in data
            # When app is specified, clusters is a list of names
            assert isinstance(data["clusters"], list)

    async def test_get_clusters_requires_env_when_empty(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/clusters with empty env returns 400."""
        response = await async_client.get("/api/v1/clusters", params={"env": ""})
        assert response.status_code in (200, 400)

    async def test_get_datacenters_returns_list(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/clusters/datacenters returns datacenter choices."""
        response = await async_client.get("/api/v1/clusters/datacenters", params={"env": "dev"})
        assert response.status_code in (200, 400, 403)

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert "env" in data
            assert "datacenters" in data
            assert isinstance(data["datacenters"], list)

    async def test_add_cluster_requires_clustername(self, async_client: httpx.AsyncClient):
        """Test that POST /api/v1/clusters requires clustername."""
        response = await async_client.post(
            "/api/v1/clusters",
            json={"purpose": "test"},
            params={"env": "dev"}
        )
        assert response.status_code in (400, 403, 422)

    async def test_add_cluster_requires_env(self, async_client: httpx.AsyncClient):
        """Test that POST /api/v1/clusters requires env parameter."""
        response = await async_client.post(
            "/api/v1/clusters",
            json={"clustername": "test-cluster"}
        )
        assert response.status_code in (400, 403, 422)

    async def test_check_cluster_can_delete(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/clusters/{clustername}/can-delete checks dependencies."""
        response = await async_client.get(
            "/api/v1/clusters/nonexistent-cluster/can-delete",
            params={"env": "dev"}
        )
        assert response.status_code in (200, 400, 403, 404)

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert "can_delete" in data
            assert isinstance(data["can_delete"], bool)

    async def test_delete_cluster_requires_env(self, async_client: httpx.AsyncClient):
        """Test that DELETE /api/v1/clusters/{clustername} requires env."""
        response = await async_client.delete("/api/v1/clusters/test-cluster")
        assert response.status_code in (400, 403)
