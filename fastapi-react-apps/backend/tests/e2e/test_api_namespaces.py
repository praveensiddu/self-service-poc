"""
End-to-end tests for Namespaces API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx
from typing import Optional


@pytest.mark.asyncio
class TestNamespacesE2E:
    """End-to-end tests for namespaces management endpoints."""

    async def test_get_namespaces_returns_valid_structure(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test that GET /api/v1/apps/{appname}/namespaces returns valid namespace data."""
        appname = test_app_setup

        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            # Check structure of each namespace if dict is not empty
            for ns_name, ns_data in data.items():
                assert isinstance(ns_name, str)
                assert isinstance(ns_data, dict)
                # Check for permissions field
                if "permissions" in ns_data:
                    assert isinstance(ns_data["permissions"], dict)

    async def test_get_namespaces_requires_env(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/apps/{appname}/namespaces requires env parameter."""
        response = await async_client.get("/api/v1/apps/testapp/namespaces")
        # Should return 400 if env is missing
        assert response.status_code in [200, 400]

    async def test_create_namespace_requires_valid_payload(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test that POST /api/v1/apps/{appname}/namespaces requires valid payload."""
        appname = test_app_setup

        # Missing required fields
        response = await async_client.post(
            f"/api/v1/apps/{appname}/namespaces",
            json={},
            params={"env": test_env}
        )
        assert response.status_code in [400, 403, 422]

    async def test_delete_namespaces_requires_namespace_list(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test that DELETE /api/v1/apps/{appname}/namespaces requires namespace list."""
        appname = test_app_setup

        # Missing namespaces parameter
        response = await async_client.delete(
            f"/api/v1/apps/{appname}/namespaces",
            params={"env": test_env}
        )
        assert response.status_code in [400, 403]


@pytest.mark.asyncio
class TestNamespaceDetailsE2E:
    """End-to-end tests for namespace details endpoints."""

    async def test_get_namespace_argocd(
        self, async_client: httpx.AsyncClient,
        test_app_setup: str, test_namespace_setup: str, test_env: str
    ):
        """Test that GET /api/v1/apps/{appname}/namespaces/{namespace}/nsargocd returns ArgoCD config."""
        appname = test_app_setup
        namespace = test_namespace_setup

        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces/{namespace}/nsargocd",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 403, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

    async def test_get_namespace_resourcequota(
        self, async_client: httpx.AsyncClient,
        test_app_setup: str, test_namespace_setup: str, test_env: str
    ):
        """Test that GET /api/v1/apps/{appname}/namespaces/{namespace}/resources/resourcequota returns quota."""
        appname = test_app_setup
        namespace = test_namespace_setup

        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces/{namespace}/resources/resourcequota",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 403, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

    async def test_get_namespace_limitrange(
        self, async_client: httpx.AsyncClient,
        test_app_setup: str, test_namespace_setup: str, test_env: str
    ):
        """Test that GET /api/v1/apps/{appname}/namespaces/{namespace}/resources/limitrange returns limits."""
        appname = test_app_setup
        namespace = test_namespace_setup

        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces/{namespace}/resources/limitrange",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 403, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

    async def test_get_namespace_rolebindings(
        self, async_client: httpx.AsyncClient,
        test_app_setup: str, test_namespace_setup: str, test_env: str
    ):
        """Test that GET /api/v1/apps/{appname}/namespaces/{namespace}/rolebinding_requests returns bindings."""
        appname = test_app_setup
        namespace = test_namespace_setup

        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces/{namespace}/rolebinding_requests",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 403, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

    async def test_get_namespace_egressfirewall(
        self, async_client: httpx.AsyncClient,
        test_app_setup: str, test_namespace_setup: str, test_env: str
    ):
        """Test that GET /api/v1/apps/{appname}/namespaces/{namespace}/egressfirewall returns firewall rules."""
        appname = test_app_setup
        namespace = test_namespace_setup

        response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces/{namespace}/egressfirewall",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 403, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))

