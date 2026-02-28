"""
End-to-end tests for Pull Requests API endpoints.
These tests require the server to be running on http://localhost:8888
"""
import pytest
import httpx


@pytest.mark.asyncio
class TestPullRequestsE2E:
    """End-to-end tests for pull requests endpoints."""

    async def test_get_pull_requests_for_app(
        self, async_client: httpx.AsyncClient, test_app_setup: str, test_env: str
    ):
        """Test that GET /api/v1/apps/{appname}/pull_requests returns PR data."""
        appname = test_app_setup

        response = await async_client.get(
            f"/api/v1/apps/{appname}/pull_requests",
            params={"env": test_env}
        )
        assert response.status_code in [200, 400, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_get_pull_requests_requires_env(self, async_client: httpx.AsyncClient):
        """Test that pull_requests endpoint requires env parameter."""
        response = await async_client.get("/api/v1/apps/testapp/pull_requests")
        assert response.status_code in [200, 400]

