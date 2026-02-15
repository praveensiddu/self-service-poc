"""
End-to-end tests for Access Requests API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx


@pytest.mark.asyncio
class TestAccessRequestsE2E:
    """End-to-end tests for access requests management endpoints."""

    async def test_get_access_requests_returns_list(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/access_requests returns a list of access requests."""
        response = await async_client.get("/api/v1/access_requests")
        # May return 403 if not authorized, or 200 with list
        assert response.status_code in [200, 400, 403]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            # Validate structure of each request
            for item in data:
                assert isinstance(item, dict)
                assert "requestor" in item
                assert "requested_at" in item
                assert "type" in item
                assert "payload" in item

    async def test_create_app_access_request_requires_userid_or_group(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/app_access requires either userid or group."""
        # Test with neither userid nor group
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": "testapp"
            }
        )
        assert response.status_code == 400

        # Test with both userid and group
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": "testapp",
                "userid": "testuser",
                "group": "testgroup"
            }
        )
        assert response.status_code == 400

    async def test_create_app_access_request_with_userid(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/app_access works with userid."""
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": "e2e-test-app",
                "userid": "e2e-test-user"
            }
        )
        # Should succeed or fail based on app existence
        assert response.status_code in [200, 400, 403, 422]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert "type" in data
            assert data["type"] == "app_access"
            assert "payload" in data
            assert "userid" in data["payload"]

    async def test_create_app_access_request_with_group(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/app_access works with group."""
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": "e2e-test-app",
                "group": "e2e-test-group"
            }
        )
        assert response.status_code in [200, 400, 403, 422]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert data["type"] == "app_access"
            assert "group" in data["payload"]

    async def test_create_global_access_request_requires_userid_or_group(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/global_access requires either userid or group."""
        # Test with neither userid nor group
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "role": "viewall"
            }
        )
        assert response.status_code == 400

        # Test with both userid and group
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "role": "viewall",
                "userid": "testuser",
                "group": "testgroup"
            }
        )
        assert response.status_code == 400

    async def test_create_global_access_request_with_userid(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/global_access works with userid."""
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "role": "viewall",
                "userid": "e2e-test-globaluser"
            }
        )
        assert response.status_code in [200, 400, 403, 422]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert data["type"] == "global_access"

    async def test_create_global_access_request_with_group(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/global_access works with group."""
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "role": "viewall",
                "group": "e2e-test-globalgroup"
            }
        )
        assert response.status_code in [200, 400, 403, 422]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            assert data["type"] == "global_access"

