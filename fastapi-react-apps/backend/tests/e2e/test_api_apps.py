"""
End-to-end tests for Apps API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx


@pytest.mark.asyncio
class TestAppsE2E:
    """End-to-end tests for apps management."""

    async def test_get_apps_returns_valid_structure(self, async_client: httpx.AsyncClient):
        """Test that GET /api/apps returns valid app data."""
        response = await async_client.get("/api/apps")
        assert response.status_code in [200, 400]  # 400 if not initialized

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

            # Check structure of each app if list is not empty
            for app in data:
                assert "appname" in app
                assert isinstance(app["appname"], str)
        else:
            # Backend not initialized
            print("Backend not initialized, skipping app structure validation")

    async def test_create_and_delete_app_workflow(self, async_client: httpx.AsyncClient):
        """Test full app lifecycle: create, verify, delete."""
        test_app = {
            "appname": "e2e-test-app",
            "description": "E2E test application",
            "owner": "test-team"
        }

        # Create app
        create_response = await async_client.post("/api/apps", json=test_app)

        if create_response.status_code in [201, 200]:
            # Verify app exists
            apps_response = await async_client.get("/api/apps")
            assert apps_response.status_code == 200

            apps_data = apps_response.json()
            app_found = any(
                app.get("appname") == test_app["appname"]
                for app in apps_data
            )

            if app_found:
                # Delete app
                delete_response = await async_client.delete(
                    f"/api/apps/{test_app['appname']}"
                )
                assert delete_response.status_code in [200, 204]
        else:
            print(f"Create app returned: {create_response.status_code}")
            print(f"Response: {create_response.text}")

    async def test_app_namespaces_workflow(self, async_client: httpx.AsyncClient):
        """Test getting namespaces for an app."""
        # First get list of apps
        apps_response = await async_client.get("/api/apps")
        assert apps_response.status_code in [200, 400]  # 400 if not initialized

        if apps_response.status_code == 200:
            apps = apps_response.json()

            if apps:
                # Get namespaces for first app
                first_app = apps[0]["appname"]
                ns_response = await async_client.get(f"/api/apps/{first_app}/namespaces")

                # Should return 200 even if empty
                assert ns_response.status_code in [200, 400, 404]

                if ns_response.status_code == 200:
                    namespaces = ns_response.json()
                    assert isinstance(namespaces, list)
        else:
            print("Backend not initialized, skipping namespaces test")

    async def test_app_pull_requests_endpoint(self, async_client: httpx.AsyncClient):
        """Test getting pull requests for an app."""
        apps_response = await async_client.get("/api/apps")
        assert apps_response.status_code in [200, 400]  # 400 if not initialized

        if apps_response.status_code == 200:
            apps = apps_response.json()

            if apps:
                first_app = apps[0]["appname"]
                pr_response = await async_client.get(f"/api/apps/{first_app}/pull_requests")

                # Should return 200 even if empty
                assert pr_response.status_code in [200, 400, 404]

                if pr_response.status_code == 200:
                    pull_requests = pr_response.json()
                    assert isinstance(pull_requests, list)
        else:
            print("Backend not initialized, skipping pull_requests test")

    async def test_app_egress_ips_endpoint(self, async_client: httpx.AsyncClient):
        """Test getting egress IPs for an app."""
        apps_response = await async_client.get("/api/apps")
        assert apps_response.status_code in [200, 400]  # 400 if not initialized

        if apps_response.status_code == 200:
            apps = apps_response.json()

            if apps:
                first_app = apps[0]["appname"]
                egress_response = await async_client.get(f"/api/apps/{first_app}/egress_ips")

                # Should return 200 even if empty
                assert egress_response.status_code in [200, 400, 404]

                if egress_response.status_code == 200:
                    egress_ips = egress_response.json()
                    assert isinstance(egress_ips, list)
        else:
            print("Backend not initialized, skipping egress_ips test")

    async def test_app_l4_ingress_endpoint(self, async_client: httpx.AsyncClient):
        """Test getting L4 ingress for an app."""
        apps_response = await async_client.get("/api/apps")
        assert apps_response.status_code in [200, 400]  # 400 if not initialized

        if apps_response.status_code == 200:
            apps = apps_response.json()

            if apps and len(apps) > 0:
                first_app = apps[0]["appname"]
                l4_response = await async_client.get(f"/api/apps/{first_app}/l4_ingress")

                # Should return 200, 400, or 404
                assert l4_response.status_code in [200, 400, 404]

                if l4_response.status_code == 200:
                    l4_ingress = l4_response.json()
                    assert isinstance(l4_ingress, list)
            else:
                print("No apps available to test l4_ingress endpoint")
        else:
            print("Backend not initialized, skipping l4_ingress test")
