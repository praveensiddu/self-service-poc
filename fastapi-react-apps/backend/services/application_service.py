"""Application service for business logic."""

from typing import Dict, Any, List, Optional
from pathlib import Path
import re
import shutil
import logging

import yaml

from backend.dependencies import get_requests_root
from backend.auth.role_mgmt_impl import RoleMgmtImpl
from backend.services.cluster_service import ClusterService
from backend.exceptions.custom import (
    ValidationError,
    NotFoundError,
    AlreadyExistsError,
    NotInitializedError,
    AppError,
)

logger = logging.getLogger("uvicorn.error")


class ApplicationService:
    """Service for application business logic."""

    def __init__(self):
        self.cluster_service = ClusterService()

    def get_apps_for_env(self, env: str) -> Dict[str, Dict[str, Any]]:
        """Get all applications for an environment.

        Args:
            env: Environment name

        Returns:
            Dictionary of app data keyed by app name

        Raises:
            NotInitializedError: If environment is not initialized
        """
        requests_root = get_requests_root()
        env_dir = requests_root / env

        if not env_dir.exists() or not env_dir.is_dir():
            raise NotInitializedError(f"environment '{env}'")

        try:
            clusters_by_app = self.cluster_service.get_clusters_by_app(env)
        except Exception as e:
            logger.error("Failed to compute clusters_by_app for env=%s: %s", str(env), str(e), exc_info=True)
            clusters_by_app = {}

        apps_out: Dict[str, Dict[str, Any]] = {}
        for child in env_dir.iterdir():
            if not child.is_dir():
                continue

            appname = child.name
            app_data = self._load_app_data(child, appname, clusters_by_app)
            apps_out[appname] = app_data

        return apps_out

    def _load_app_data(
        self,
        app_dir: Path,
        appname: str,
        clusters_by_app: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """Load application data from disk.

        Args:
            app_dir: Path to application directory
            appname: Application name
            clusters_by_app: Cluster mapping from cluster service

        Returns:
            Dictionary with app data
        """
        appinfo_path = app_dir / "appinfo.yaml"
        description = ""
        clusters: List[str] = clusters_by_app.get(appname, [])

        if appinfo_path.exists() and appinfo_path.is_file():
            try:
                appinfo = yaml.safe_load(appinfo_path.read_text()) or {}
                if isinstance(appinfo, dict):
                    description = str(appinfo.get("description", "") or "")
            except Exception as e:
                logger.error(
                    "Failed to read appinfo.yaml for app=%s path=%s: %s",
                    str(appname), str(appinfo_path), str(e), exc_info=True,
                )

        totalns = self._count_namespaces(app_dir)
        argocd = self._check_argocd_exists(app_dir)

        managedby: List[str] = []
        try:
            managedby = RoleMgmtImpl.get_instance().get_app_managedby(appname)
        except Exception:
            managedby = []

        return {
            "appname": appname,
            "description": description,
            "managedby": managedby,
            "clusters": clusters,
            "totalns": totalns,
            "argocd": argocd,
        }

    def _count_namespaces(self, app_dir: Path) -> int:
        """Count namespace directories in an app folder."""
        try:
            return sum(1 for p in app_dir.iterdir() if p.is_dir())
        except Exception as e:
            logger.error("Failed to count namespaces for dir=%s: %s", str(app_dir), str(e))
            return 0

    def _check_argocd_exists(self, app_dir: Path) -> bool:
        """Check if argocd.yaml exists for an app."""
        try:
            argocd_path = app_dir / "argocd.yaml"
            return argocd_path.exists() and argocd_path.is_file()
        except Exception:
            return False

    def create_app(
        self,
        env: str,
        appname: str,
        description: str = ""
    ) -> Dict[str, Any]:
        """Create a new application.

        Args:
            env: Environment name
            appname: Application name
            description: Application description

        Returns:
            Created app data

        Raises:
            ValidationError: If validation fails
            NotInitializedError: If environment not initialized
            AlreadyExistsError: If app already exists
            AppError: If creation fails
        """
        appname = str(appname or "").strip()
        if not appname:
            raise ValidationError("appname", "is required")
        if not re.match(r"^[A-Za-z0-9_.-]+$", appname):
            raise ValidationError("appname", "Invalid appname format")

        requests_root = get_requests_root()
        env_dir = requests_root / env

        if not env_dir.exists() or not env_dir.is_dir():
            raise NotInitializedError(f"environment '{env}'")

        app_dir = env_dir / appname
        if app_dir.exists():
            raise AlreadyExistsError("Application", appname)

        try:
            app_dir.mkdir(parents=True, exist_ok=False)
            appinfo = {
                "description": str(description or ""),
            }
            (app_dir / "appinfo.yaml").write_text(yaml.safe_dump(appinfo, sort_keys=False))
        except (ValidationError, AlreadyExistsError, NotInitializedError):
            raise
        except Exception as e:
            logger.error("Failed to create app: %s", e, exc_info=True)
            raise AppError(f"Failed to create app: {e}")

        clusters_by_app = {}
        try:
            clusters_by_app = self.cluster_service.get_clusters_by_app(env)
        except Exception:
            pass

        return {
            "appname": appname,
            "description": str(description or ""),
            "clusters": clusters_by_app.get(appname, []),
            "totalns": 0,
        }

    def update_app(
        self,
        env: str,
        appname: str,
        description: str = "",
    ) -> Dict[str, Any]:
        """Update an existing application.

        Args:
            env: Environment name
            appname: Application name
            description: New description

        Returns:
            Updated app data

        Raises:
            ValidationError: If validation fails
            NotInitializedError: If environment not initialized
            NotFoundError: If app not found
            AppError: If update fails
        """
        target_appname = str(appname or "").strip()
        if not target_appname:
            raise ValidationError("appname", "is required")

        requests_root = get_requests_root()
        env_dir = requests_root / env

        if not env_dir.exists() or not env_dir.is_dir():
            raise NotInitializedError(f"environment '{env}'")

        app_dir = env_dir / target_appname
        if not app_dir.exists() or not app_dir.is_dir():
            raise NotFoundError("Application", target_appname)

        try:
            appinfo = {
                "description": str(description or ""),
            }
            (app_dir / "appinfo.yaml").write_text(yaml.safe_dump(appinfo, sort_keys=False))
        except Exception as e:
            logger.error("Failed to update app: %s", e, exc_info=True)
            raise AppError(f"Failed to update app: {e}")

        totalns = self._count_namespaces(app_dir)

        clusters_by_app = {}
        try:
            clusters_by_app = self.cluster_service.get_clusters_by_app(env)
        except Exception:
            pass

        return {
            "appname": target_appname,
            "description": str(description or ""),
            "clusters": clusters_by_app.get(target_appname, []),
            "totalns": totalns,
        }

    def delete_app(self, env: str, appname: str) -> Dict[str, Any]:
        """Delete an application and all its data.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            Deletion result data

        Raises:
            NotFoundError: If app not found
            AppError: If deletion fails
        """
        requests_root = get_requests_root()
        app_dir = requests_root / env / appname

        if not app_dir.exists() or not app_dir.is_dir():
            raise NotFoundError("Application", f"{env}/{appname}")

        deleted_data = {
            "appname": appname,
            "env": env,
            "deleted": False,
            "removed": {}
        }

        try:
            shutil.rmtree(app_dir)
            deleted_data["removed"]["folder"] = True
            deleted_data["deleted"] = True
        except Exception as e:
            logger.error("Failed to delete app folder %s: %s", app_dir, e, exc_info=True)
            raise AppError(f"Failed to delete app folder {app_dir}: {e}")

        return deleted_data
