"""Namespace repository for data access."""

from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import HTTPException
import logging

from backend.dependencies import get_requests_root
from backend.utils.yaml_utils import read_yaml_dict, write_yaml_dict

logger = logging.getLogger("uvicorn.error")


class NamespaceRepository:
    """Repository for namespace data operations."""

    @staticmethod
    def get_namespace_dir(env: str, appname: str, namespace: str) -> Path:
        """Get namespace directory path, raising error if it doesn't exist.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Path to namespace directory

        Raises:
            HTTPException: If namespace directory doesn't exist
        """
        requests_root = get_requests_root()
        ns_dir = requests_root / env / appname / namespace
        if not ns_dir.exists() or not ns_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"Namespace folder not found: {ns_dir}")
        return ns_dir

    @staticmethod
    def get_app_dir(env: str, appname: str) -> Path:
        """Get application directory path.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            Path to application directory

        Raises:
            HTTPException: If app directory doesn't exist
        """
        requests_root = get_requests_root()
        app_dir = requests_root / env / appname
        if not app_dir.exists() or not app_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")
        return app_dir

    @staticmethod
    def create_namespace_dir(env: str, appname: str, namespace: str) -> Path:
        """Create a new namespace directory.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Path to created namespace directory

        Raises:
            HTTPException: If namespace already exists or creation fails
        """
        requests_root = get_requests_root()
        app_dir = requests_root / env / appname
        if not app_dir.exists() or not app_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"App folder not found: {app_dir}")

        ns_dir = app_dir / namespace
        if ns_dir.exists():
            raise HTTPException(status_code=409, detail=f"Namespace already exists: {namespace}")

        ns_dir.mkdir(parents=True, exist_ok=False)
        return ns_dir

    @staticmethod
    def read_namespace_info(env: str, appname: str, namespace: str) -> Dict[str, Any]:
        """Read namespace_info.yaml file.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary from namespace_info.yaml
        """
        ns_dir = NamespaceRepository.get_namespace_dir(env, appname, namespace)
        ns_info_path = ns_dir / "namespace_info.yaml"
        return read_yaml_dict(ns_info_path)

    @staticmethod
    def write_namespace_info(env: str, appname: str, namespace: str, data: Dict[str, Any]) -> None:
        """Write namespace_info.yaml file.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            data: Data to write
        """
        ns_dir = NamespaceRepository.get_namespace_dir(env, appname, namespace)
        ns_info_path = ns_dir / "namespace_info.yaml"
        write_yaml_dict(ns_info_path, data, sort_keys=False)

    @staticmethod
    def read_nsargocd(env: str, appname: str, namespace: str) -> Dict[str, Any]:
        """Read nsargocd.yaml file.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            Dictionary from nsargocd.yaml
        """
        ns_dir = NamespaceRepository.get_namespace_dir(env, appname, namespace)
        nsargocd_path = ns_dir / "nsargocd.yaml"
        return read_yaml_dict(nsargocd_path)

    @staticmethod
    def argocd_exists(env: str, appname: str) -> bool:
        """Check if argocd.yaml exists for an app.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            True if argocd.yaml exists
        """
        try:
            app_dir = NamespaceRepository.get_app_dir(env, appname)
            argocd_path = app_dir / "argocd.yaml"
            return argocd_path.exists() and argocd_path.is_file()
        except Exception:
            return False

    @staticmethod
    def list_namespaces(env: str, appname: str) -> list:
        """List all namespace directories for an app.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            List of namespace directory paths
        """
        app_dir = NamespaceRepository.get_app_dir(env, appname)
        return [child for child in app_dir.iterdir() if child.is_dir()]

    @staticmethod
    def delete_namespace_dir(env: str, appname: str, namespace: str) -> bool:
        """Delete a namespace directory.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name

        Returns:
            True if deleted, False if not found
        """
        import shutil
        requests_root = get_requests_root()
        app_dir = requests_root / env / appname
        ns_dir = app_dir / namespace

        if not ns_dir.exists() or not ns_dir.is_dir():
            return False

        shutil.rmtree(ns_dir)
        return True
