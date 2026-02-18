"""
End-to-end tests for Access Requests API endpoints.
These tests require the server to be running on http://localhost:8888

NOTE: These tests only verify validation logic (400 errors) and do NOT create
actual access requests to avoid polluting the access requests list.
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
        """Test that POST /api/v1/app_access requires exactly one of userid or group."""
        # Test with neither userid nor group - should fail
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": "testapp"
            }
        )
        assert response.status_code == 400

        # Test with both userid and group - should fail
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

    async def test_create_app_access_request_validates_payload_structure(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/app_access validates payload structure."""
        # Test with missing required field 'role'
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "application": "testapp",
                "userid": "testuser"
            }
        )
        # Should return 422 for validation error
        assert response.status_code in [400, 422]

        # Test with missing required field 'application'
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "userid": "testuser"
            }
        )
        assert response.status_code in [400, 422]

    async def test_create_app_access_request_empty_userid_treated_as_missing(
        self, async_client: httpx.AsyncClient
    ):
        """Test that empty userid is treated as missing."""
        # Empty userid with no group should fail
        response = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": "testapp",
                "userid": ""
            }
        )
        assert response.status_code == 400

        # Empty userid with valid group should work (validation passes)
        # But we don't actually create it to avoid polluting data

    async def test_create_global_access_request_requires_userid_or_group(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/global_access requires exactly one of userid or group."""
        # Test with neither userid nor group - should fail
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "role": "viewall"
            }
        )
        assert response.status_code == 400

        # Test with both userid and group - should fail
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "role": "viewall",
                "userid": "testuser",
                "group": "testgroup"
            }
        )
        assert response.status_code == 400

    async def test_create_global_access_request_validates_payload_structure(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/global_access validates payload structure."""
        # Test with missing required field 'role'
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "userid": "testuser"
            }
        )
        # Should return 422 for validation error
        assert response.status_code in [400, 422]

    async def test_create_global_access_request_empty_group_treated_as_missing(
        self, async_client: httpx.AsyncClient
    ):
        """Test that empty group is treated as missing."""
        # Empty group with no userid should fail
        response = await async_client.post(
            "/api/v1/global_access",
            json={
                "role": "viewall",
                "group": ""
            }
        )
        assert response.status_code == 400

    async def test_create_app_access_request_duplicate_returns_409(
        self, async_client: httpx.AsyncClient
    ):
        """Test that POST /api/v1/app_access returns 409 for duplicate requests.

        A duplicate is defined as a request with the same:
        - application
        - role
        - userid (for user requests) or group (for group requests)
        """
        import uuid
        # Use unique identifiers to avoid conflicts with other tests
        unique_id = str(uuid.uuid4())[:8]
        test_userid = f"test-dup-user-{unique_id}"
        test_app = "test-dup-app"
        test_role = "viewer"

        # First request should succeed (201 or 200)
        response1 = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": test_role,
                "application": test_app,
                "userid": test_userid
            }
        )
        # Accept 200/201 for success, or 403 if not authorized
        assert response1.status_code in [200, 201, 403]

        if response1.status_code in [200, 201]:
            # Second identical request should return 409 Conflict
            response2 = await async_client.post(
                "/api/v1/app_access",
                json={
                    "role": test_role,
                    "application": test_app,
                    "userid": test_userid
                }
            )
            assert response2.status_code == 409
            data = response2.json()
            assert "detail" in data
            assert "already exists" in data["detail"].lower()

    async def test_create_app_access_request_different_role_not_duplicate(
        self, async_client: httpx.AsyncClient
    ):
        """Test that requests with different roles are not considered duplicates."""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        test_userid = f"test-role-user-{unique_id}"
        test_app = "test-role-app"

        # First request with viewer role
        response1 = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": test_app,
                "userid": test_userid
            }
        )
        assert response1.status_code in [200, 201, 403]

        if response1.status_code in [200, 201]:
            # Second request with manager role should succeed (not a duplicate)
            response2 = await async_client.post(
                "/api/v1/app_access",
                json={
                    "role": "manager",
                    "application": test_app,
                    "userid": test_userid
                }
            )
            # Should succeed, not 409
            assert response2.status_code in [200, 201]

    async def test_create_app_access_request_different_app_not_duplicate(
        self, async_client: httpx.AsyncClient
    ):
        """Test that requests for different apps are not considered duplicates."""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        test_userid = f"test-app-user-{unique_id}"

        # First request for app1
        response1 = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": "viewer",
                "application": f"test-app1-{unique_id}",
                "userid": test_userid
            }
        )
        assert response1.status_code in [200, 201, 403]

        if response1.status_code in [200, 201]:
            # Second request for app2 should succeed (not a duplicate)
            response2 = await async_client.post(
                "/api/v1/app_access",
                json={
                    "role": "viewer",
                    "application": f"test-app2-{unique_id}",
                    "userid": test_userid
                }
            )
            # Should succeed, not 409
            assert response2.status_code in [200, 201]

    async def test_create_app_access_request_group_duplicate_returns_409(
        self, async_client: httpx.AsyncClient
    ):
        """Test that duplicate group access requests return 409."""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        test_group = f"test-dup-group-{unique_id}"
        test_app = "test-dup-grp-app"
        test_role = "manager"

        # First request should succeed
        response1 = await async_client.post(
            "/api/v1/app_access",
            json={
                "role": test_role,
                "application": test_app,
                "group": test_group
            }
        )
        assert response1.status_code in [200, 201, 403]

        if response1.status_code in [200, 201]:
            # Second identical request should return 409 Conflict
            response2 = await async_client.post(
                "/api/v1/app_access",
                json={
                    "role": test_role,
                    "application": test_app,
                    "group": test_group
                }
            )
            assert response2.status_code == 409

