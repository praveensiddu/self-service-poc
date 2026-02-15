"""
End-to-end tests for Apps API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx
from typing import Optional


@pytest.mark.asyncio
class TestAppsE2E:
    """End-to-end tests for apps management."""

    async def _get_first_app(self, async_client: httpx.AsyncClient) -> Optional[str]:
        """Helper to get the first available app for testing."""
        response = await async_client.get("/api/v1/apps")
        if response.status_code != 200:
            return None
        data = response.json()
        if isinstance(data, dict) and data:
            return next(iter(data.keys()))
        return None

    async def test_get_apps_returns_valid_structure(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/apps returns valid app data with permissions."""
        response = await async_client.get("/api/v1/apps")
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

            # Check structure of each app if dict is not empty
            for appname, app_data in data.items():
                assert isinstance(appname, str)
                assert isinstance(app_data, dict)
                # Check for permissions field (new structure)
                if "permissions" in app_data:
                    assert isinstance(app_data["permissions"], dict)
                    assert "canView" in app_data["permissions"]
                    assert "canManage" in app_data["permissions"]

    async def test_get_apps_requires_env(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/apps without env handles gracefully."""
        response = await async_client.get("/api/v1/apps")
        assert response.status_code in [200, 400]

    async def test_create_app_requires_appname(self, async_client: httpx.AsyncClient):
        """Test that POST /api/v1/apps requires appname field."""
        response = await async_client.post(
            "/api/v1/apps",
            json={"description": "Test app"},
            params={"env": "dev"}
        )
        assert response.status_code in [400, 403, 422]

    async def test_create_app_requires_env(self, async_client: httpx.AsyncClient):
        """Test that POST /api/v1/apps requires env parameter."""
        response = await async_client.post(
            "/api/v1/apps",
            json={"appname": "test-app"}
        )
        assert response.status_code in [400, 403]

    async def test_create_and_delete_app_workflow(self, async_client: httpx.AsyncClient):
        """Test full app lifecycle: create, verify, delete."""
        test_app = {
            "appname": "e2e-test-app",
            "description": "E2E test application",
            "managedby": "test-team"
        }

        # Create app
        create_response = await async_client.post(
            "/api/v1/apps",
            json=test_app,
            params={"env": "dev"}
        )

        if create_response.status_code in [201, 200]:
            # Verify app exists
            apps_response = await async_client.get("/api/v1/apps", params={"env": "dev"})
            assert apps_response.status_code == 200

            apps_data = apps_response.json()
            app_found = test_app["appname"] in apps_data

            if app_found:
                # Delete app
                delete_response = await async_client.delete(
                    f"/api/v1/apps/{test_app['appname']}",
                    params={"env": "dev"}
                )
                assert delete_response.status_code in [200, 204, 403]
        else:
            # Create might fail due to permissions or already exists
            assert create_response.status_code in [400, 403, 409]

    async def test_update_app_requires_matching_appname(self, async_client: httpx.AsyncClient):
        """Test that PUT /api/v1/apps/{appname} requires matching appname."""
        response = await async_client.put(
            "/api/v1/apps/testapp",
            json={"appname": "differentname", "description": "Updated"},
            params={"env": "dev"}
        )
        # Should fail because appname doesn't match
        assert response.status_code in [400, 403, 404]

    async def test_app_namespaces_workflow(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test getting namespaces for an app."""
        appname = test_app_setup

        ns_response = await async_client.get(
            f"/api/v1/apps/{appname}/namespaces",
            params={"env": test_env}
        )
        assert ns_response.status_code in [200, 400, 404]

        if ns_response.status_code == 200:
            namespaces = ns_response.json()
            assert isinstance(namespaces, dict)

    async def test_app_pull_requests_endpoint(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test getting pull requests for an app."""
        appname = test_app_setup

        pr_response = await async_client.get(
            f"/api/v1/apps/{appname}/pull_requests",
            params={"env": test_env}
        )
        assert pr_response.status_code in [200, 400, 404]

        if pr_response.status_code == 200:
            pull_requests = pr_response.json()
            assert isinstance(pull_requests, (list, dict))

    async def test_app_egress_ips_endpoint(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test getting egress IPs for an app."""
        appname = test_app_setup

        egress_response = await async_client.get(
            f"/api/v1/apps/{appname}/egress_ips",
            params={"env": test_env}
        )
        assert egress_response.status_code in [200, 400, 403, 404]

        if egress_response.status_code == 200:
            egress_ips = egress_response.json()
            assert isinstance(egress_ips, list)

    async def test_app_l4_ingress_endpoint(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test getting L4 ingress for an app."""
        appname = test_app_setup

        l4_response = await async_client.get(
            f"/api/v1/apps/{appname}/l4_ingress",
            params={"env": test_env}
        )
        assert l4_response.status_code in [200, 400, 404]

        if l4_response.status_code == 200:
            l4_data = l4_response.json()
            assert isinstance(l4_data, dict)
            # New structure includes 'data' and 'permissions'
            if "permissions" in l4_data:
                assert isinstance(l4_data["permissions"], dict)

    async def test_app_argocd_endpoint(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test getting ArgoCD config for an app."""
        appname = test_app_setup

        argocd_response = await async_client.get(
            f"/api/v1/apps/{appname}/argocd",
            params={"env": test_env}
        )
        assert argocd_response.status_code in [200, 400, 404]

        if argocd_response.status_code == 200:
            argocd_data = argocd_response.json()
            assert isinstance(argocd_data, dict)
            assert "exists" in argocd_data
            assert "argocd_sync_strategy" in argocd_data
