import pytest
import asyncio
import httpx
from typing import AsyncGenerator


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the API server."""
    return "http://localhost:8888"


@pytest.fixture
async def async_client(base_url: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client for testing."""
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        yield client
