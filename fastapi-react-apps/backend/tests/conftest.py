"""
Shared pytest fixtures and configuration for E2E tests.
"""
import pytest
import asyncio
import httpx
import atexit
from typing import AsyncGenerator, Optional

# Test data constants
TEST_APP_NAME = "e2e-test-app"
TEST_NAMESPACE_NAME = "e2e-test-ns"
TEST_ENV = "dev"
BASE_URL = "http://localhost:8888"


def cleanup_test_data():
    """Synchronous cleanup function called at exit."""
    try:
        # Use platform_admin user for cleanup permissions
        headers = {"x-user": "usr_platform_admin"}
        with httpx.Client(base_url=BASE_URL, timeout=30.0, headers=headers) as client:
            # Delete namespace first
            client.delete(
                f"/api/v1/apps/{TEST_APP_NAME}/namespaces",
                params={"env": TEST_ENV, "namespaces": TEST_NAMESPACE_NAME}
            )
            # Delete test app (this will also delete namespaces)
            client.delete(
                f"/api/v1/apps/{TEST_APP_NAME}",
                params={"env": TEST_ENV}
            )
    except Exception:
        pass  # Ignore errors during cleanup


# Register cleanup to run at exit
atexit.register(cleanup_test_data)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the API server."""
    return BASE_URL


@pytest.fixture
async def async_client(base_url: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client for testing.

    Creates a new client for each test to ensure clean state.
    Uses 30 second timeout for long-running operations.
    """
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session")
async def session_client(base_url: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Session-scoped async HTTP client for tests that share state.

    Use this for tests that need to share data across test methods.
    Uses platform_admin user for creating/managing test data.
    """
    headers = {"x-user": "usr_platform_admin"}
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0, headers=headers) as client:
        yield client


@pytest.fixture
def api_prefix():
    """API version prefix."""
    return "/api/v1"


# ============================================
# Session-scoped test data setup
# ============================================

@pytest.fixture(scope="session")
async def test_app_setup(session_client: httpx.AsyncClient):
    """Create a test app at the start of the session and clean up at the end.

    This ensures there's always an app available for testing.
    """
    client = session_client
    created_app = False

    # Check if app already exists
    response = await client.get("/api/v1/apps", params={"env": TEST_ENV})
    app_exists = False
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, dict) and TEST_APP_NAME in data:
            app_exists = True

    # Create app if it doesn't exist
    if not app_exists:
        response = await client.post(
            "/api/v1/apps",
            json={"appname": TEST_APP_NAME, "description": "E2E test application", "managedby": "e2e-tests"},
            params={"env": TEST_ENV}
        )
        # Accept success or already exists
        if response.status_code in [200, 201]:
            created_app = True
        elif response.status_code != 409:
            pytest.skip(f"Could not create test app: {response.status_code} - {response.text}")

    try:
        yield TEST_APP_NAME
    finally:
        # Cleanup: Always try to delete the test app
        try:
            delete_response = await client.delete(
                f"/api/v1/apps/{TEST_APP_NAME}",
                params={"env": TEST_ENV}
            )
            # Log cleanup result (optional, for debugging)
            if delete_response.status_code in [200, 204]:
                pass  # Successfully deleted
            elif delete_response.status_code == 404:
                pass  # Already deleted or never existed
            # else: cleanup failed but don't raise to avoid masking test failures
        except Exception:
            pass  # Ignore cleanup errors to avoid masking test failures


@pytest.fixture(scope="session")
async def test_namespace_setup(session_client: httpx.AsyncClient, test_app_setup: str):
    """Create a test namespace at the start of the session and clean up at the end.

    This ensures there's always a namespace available for testing.
    """
    client = session_client
    appname = test_app_setup

    # Check if namespace already exists
    response = await client.get(f"/api/v1/apps/{appname}/namespaces", params={"env": TEST_ENV})
    ns_exists = False
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, dict) and TEST_NAMESPACE_NAME in data:
            ns_exists = True

    # Create namespace if it doesn't exist
    if not ns_exists:
        response = await client.post(
            f"/api/v1/apps/{appname}/namespaces",
            json={"namespace": TEST_NAMESPACE_NAME, "clusters": []},
            params={"env": TEST_ENV}
        )
        # Accept success or already exists - namespace creation might fail due to permissions

    try:
        yield TEST_NAMESPACE_NAME
    finally:
        # Cleanup: Delete the test namespace (app cleanup will handle this too)
        try:
            await client.delete(
                f"/api/v1/apps/{appname}/namespaces",
                params={"env": TEST_ENV, "namespaces": TEST_NAMESPACE_NAME}
            )
        except Exception:
            pass  # Ignore cleanup errors


@pytest.fixture(scope="session")
def test_app_name():
    """Return the test app name constant."""
    return TEST_APP_NAME


@pytest.fixture(scope="session")
def test_namespace_name():
    """Return the test namespace name constant."""
    return TEST_NAMESPACE_NAME


@pytest.fixture(scope="session")
def test_env():
    """Return the test environment constant."""
    return TEST_ENV


class TestDataHelper:
    """Helper class for managing test data."""

    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self._created_apps: list[str] = []
        self._created_namespaces: list[tuple[str, str]] = []

    async def get_first_app(self) -> Optional[str]:
        """Get the first available app for testing."""
        response = await self.client.get("/api/v1/apps")
        if response.status_code != 200:
            return None
        data = response.json()
        if isinstance(data, dict) and data:
            return next(iter(data.keys()))
        return None

    async def get_first_namespace(self, appname: str) -> Optional[str]:
        """Get the first available namespace for an app."""
        response = await self.client.get(f"/api/v1/apps/{appname}/namespaces")
        if response.status_code != 200:
            return None
        data = response.json()
        if isinstance(data, dict) and data:
            return next(iter(data.keys()))
        return None

    async def create_test_app(self, appname: str, env: str = "dev") -> bool:
        """Create a test app and track it for cleanup."""
        response = await self.client.post(
            "/api/v1/apps",
            json={"appname": appname, "description": "E2E test app"},
            params={"env": env}
        )
        if response.status_code in [200, 201]:
            self._created_apps.append(appname)
            return True
        return False

    async def cleanup(self, env: str = "dev"):
        """Clean up all created test data."""
        # Delete namespaces first
        for appname, nsname in self._created_namespaces:
            await self.client.delete(
                f"/api/v1/apps/{appname}/namespaces",
                params={"env": env, "namespaces": nsname}
            )

        # Delete apps
        for appname in self._created_apps:
            await self.client.delete(
                f"/api/v1/apps/{appname}",
                params={"env": env}
            )

        self._created_apps.clear()
        self._created_namespaces.clear()


@pytest.fixture
async def test_data_helper(async_client: httpx.AsyncClient) -> AsyncGenerator[TestDataHelper, None]:
    """Fixture that provides test data helper with automatic cleanup."""
    helper = TestDataHelper(async_client)
    yield helper
    await helper.cleanup()


def pytest_sessionfinish(session, exitstatus):
    """Called after whole test run finished, right before returning exit status.

    This ensures test data cleanup happens even if async fixtures fail to clean up.
    """
    cleanup_test_data()
