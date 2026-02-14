"""
Shared dependencies for FastAPI routers.

This module provides common dependencies and helper functions that are used
across multiple routers. Centralizing them here prevents circular imports
and reduces code duplication.
"""

from typing import Optional
import os
from fastapi import Request

from backend.exceptions.custom import ValidationError
from backend.utils.workspace import (
    get_config_path,
    get_workspace_path,
    get_requests_root,
    get_control_clusters_root,
    require_control_clusters_root,
    get_control_settings_path,
    get_requests_repo_root,
    get_templates_repo_root,
)


def require_env(env: Optional[str]) -> str:
    """Validate and return the environment parameter.

    Args:
        env: Environment string (dev, qa, prd)

    Returns:
        Lowercase trimmed environment string

    Raises:
        ValidationError: If env is missing or empty
    """
    if not env:
        raise ValidationError("env", "Missing required query parameter: env")
    return env.strip().lower()


def require_initialized_workspace():
    """Get the initialized workspace root path.

    Alias for get_requests_root for backward compatibility.

    Returns:
        Path to requests root

    Raises:
        NotInitializedError: If workspace is not initialized
    """
    return get_requests_root()


def get_current_user(request: Request):
    """Extract the current user id from request headers or environment.

    This mirrors the implementation that used to live in
    backend.core.deps.get_current_user so callers can import it from
    backend.dependencies after the refactor.
    """
    headers = request.headers
    userid = (
        headers.get("x-user")
        or headers.get("x-userid")
        or headers.get("x-remote-user")
        or headers.get("remote-user")
        or headers.get("x-auth-request-user")
        or os.getenv("CURRENT_USER")
        or "unknown"
    )
    return str(userid)


# Re-export workspace functions for convenience
__all__ = [
    'require_env',
    'require_initialized_workspace',
    'get_current_user',
    'get_config_path',
    'get_workspace_path',
    'get_requests_root',
    'get_control_clusters_root',
    'require_control_clusters_root',
    'get_control_settings_path',
    'get_requests_repo_root',
    'get_templates_repo_root',
]
