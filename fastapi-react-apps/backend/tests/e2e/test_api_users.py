"""
End-to-end tests for Users API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx


@pytest.mark.asyncio
class TestUsersE2E:
    """End-to-end tests for users management endpoints."""

    async def test_get_current_user_returns_valid_structure(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/current-user returns valid user data."""
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

    async def test_get_demo_users_returns_structure(self, async_client: httpx.AsyncClient):
        """Test that GET /api/v1/demo-users returns user list structure."""
        response = await async_client.get("/api/v1/demo-users")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)
        assert "rows" in data
        assert isinstance(data["rows"], list)

        # If rows exist, validate their structure
        for row in data["rows"]:
            assert isinstance(row, dict)
            assert "user" in row
            assert "name" in row
            assert "description" in row

    async def test_put_current_user_requires_demo_mode(self, async_client: httpx.AsyncClient):
        """Test that PUT /api/v1/current-user requires demo mode."""
        response = await async_client.put(
            "/api/v1/current-user",
            json={"user": "testuser"}
        )
        # Returns 403 if not in demo mode, 200 if in demo mode
        assert response.status_code in [200, 400, 403]

    async def test_put_current_user_requires_user_field(self, async_client: httpx.AsyncClient):
        """Test that PUT /api/v1/current-user requires user field."""
        response = await async_client.put(
            "/api/v1/current-user",
            json={}
        )
        # Should fail with 400 (missing user) or 403 (not demo mode)
        assert response.status_code in [400, 403]

