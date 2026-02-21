"""Workspace utilities for managing workspace paths and configuration."""

from pathlib import Path
from typing import Optional
import yaml
import logging

from backend.exceptions.custom import NotInitializedError, ConfigurationError

logger = logging.getLogger("uvicorn.error")


def get_config_path() -> Path:
    """Get the configuration file path."""
    return Path.home() / ".kselfserve" / "kselfserveconfig.yaml"


def load_config() -> dict:
    """Load and return the configuration as a dictionary.

    Raises:
        NotInitializedError: If config doesn't exist
        ConfigurationError: If config is invalid
    """
    cfg_path = get_config_path()
    if not cfg_path.exists():
        logger.warning("Configuration file not found: %s", cfg_path)
        raise NotInitializedError("configuration")

    try:
        raw_cfg = yaml.safe_load(cfg_path.read_text()) or {}
    except Exception as e:
        logger.error("Failed to read config file: %s", e, exc_info=True)
        raise ConfigurationError("config_file", f"Failed to read config: {e}")

    if not isinstance(raw_cfg, dict):
        logger.warning("Invalid configuration format in: %s", cfg_path)
        raise NotInitializedError("configuration")

    return raw_cfg


def get_workspace_path() -> Path:
    """Get the workspace path from configuration.

    Raises:
        NotInitializedError: If workspace is not configured or doesn't exist
    """
    raw_cfg = load_config()

    workspace = str(raw_cfg.get("workspace", "") or "").strip()
    if not workspace:
        logger.warning("Workspace path not configured")
        raise NotInitializedError("workspace")

    workspace_path = Path(workspace).expanduser()
    if not workspace_path.exists() or not workspace_path.is_dir():
        logger.warning("Workspace directory not found: %s", workspace_path)
        raise NotInitializedError("workspace")

    return workspace_path


def get_requests_root() -> Path:
    """Get the requests root directory path.

    Raises:
        NotInitializedError: If requests root doesn't exist
    """
    workspace_path = get_workspace_path()

    requests_root = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / "requests"
        / "apprequests"
    )
    if not requests_root.exists() or not requests_root.is_dir():
        logger.warning("Requests root directory not found: %s", requests_root)
        raise NotInitializedError("requests repository")

    return requests_root


def get_control_clusters_root() -> Optional[Path]:
    """Get the control clusters root directory path.

    Returns:
        Path if it exists, None otherwise
    """
    workspace_path = get_workspace_path()

    clusters_root = (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / "control"
        / "clusters"
    )
    if not clusters_root.exists() or not clusters_root.is_dir():
        logger.error(
            "Control clusters directory not found or not a directory: %s",
            str(clusters_root),
        )
        return None

    return clusters_root


def require_control_clusters_root() -> Path:
    """Get the control clusters root directory path or raise exception.

    Raises:
        NotInitializedError: If control clusters root doesn't exist
    """
    clusters_root = get_control_clusters_root()
    if clusters_root is None:
        logger.warning("Control clusters root not initialized")
        raise NotInitializedError("control clusters")
    return clusters_root


def get_templates_repo_root() -> Path:
    """Get the templates repository root directory path.

    Raises:
        NotInitializedError: If templates root doesn't exist
    """
    workspace_path = get_workspace_path()
    root = workspace_path / "kselfserv" / "cloned-repositories" / "templates"
    if not root.exists() or not root.is_dir():
        logger.warning("Templates repository root not found: %s", root)
        raise NotInitializedError("templates repository")
    return root


def get_requests_repo_root() -> Path:
    """Get the requests repository root directory path."""
    workspace_path = get_workspace_path()
    return workspace_path / "kselfserv" / "cloned-repositories" / "requests"


def get_requests_write_repo_root() -> Path:
    """Get the writable requests-write repository root directory path."""
    workspace_path = get_workspace_path()
    return workspace_path / "kselfserv" / "cloned-repositories" / "requests-write"


def get_control_settings_path() -> Path:
    """Get the control settings file path."""
    workspace_path = get_workspace_path()
    return (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / "control"
        / "settings"
        / "settings.yaml"
    )


def get_rendered_env_path(env: str) -> Path:
    """Get the rendered environment directory path.

    Args:
        env: Environment name (dev, qa, prd)

    Returns:
        Path to rendered environment directory
    """
    workspace_path = get_workspace_path()
    return (
        workspace_path
        / "kselfserv"
        / "cloned-repositories"
        / f"rendered_{str(env or '').strip().lower()}"
    )
