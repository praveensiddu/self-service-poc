"""
Shared dependencies for FastAPI routers.

This module provides common dependencies and helper functions that are used
across multiple routers. Centralizing them here prevents circular imports
and reduces code duplication.
"""

from typing import Optional
from fastapi import HTTPException

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
        HTTPException: If env is missing or empty
    """
    if not env:
        raise HTTPException(status_code=400, detail="Missing required query parameter: env")
    return env.strip().lower()


def require_initialized_workspace():
    """Get the initialized workspace root path.

    Alias for get_requests_root for backward compatibility.

    Returns:
        Path to requests root

    Raises:
        HTTPException: If workspace is not initialized
    """
    return get_requests_root()


# Re-export workspace functions for convenience
__all__ = [
    'require_env',
    'require_initialized_workspace',
    'get_config_path',
    'get_workspace_path',
    'get_requests_root',
    'get_control_clusters_root',
    'require_control_clusters_root',
    'get_control_settings_path',
    'get_requests_repo_root',
    'get_templates_repo_root',
]
