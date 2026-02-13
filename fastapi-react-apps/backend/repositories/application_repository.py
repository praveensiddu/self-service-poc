"""Application repository for data access."""

from pathlib import Path
from typing import Dict, Any, Optional, List
import logging

import yaml

from backend.dependencies import get_requests_root
from backend.utils.yaml_utils import read_yaml_dict, write_yaml_dict
from backend.exceptions.custom import NotFoundError, AlreadyExistsError, NotInitializedError, AppError

logger = logging.getLogger("uvicorn.error")


class ApplicationRepository:
    """Repository for application data operations."""

    @staticmethod
    def get_env_dir(env: str) -> Path:
        """Get environment directory path.

        Args:
            env: Environment name

        Returns:
            Path to environment directory

        Raises:
            NotInitializedError: If env directory doesn't exist
        """
        requests_root = get_requests_root()
        env_dir = requests_root / str(env or "").strip().lower()
        if not env_dir.exists() or not env_dir.is_dir():
            logger.warning("Environment not initialized: %s", env)
            raise NotInitializedError(f"environment '{env}'")
        return env_dir

    @staticmethod
    def get_app_dir(env: str, appname: str) -> Path:
        """Get application directory path.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            Path to application directory

        Raises:
            NotFoundError: If app directory doesn't exist
        """
        env_dir = ApplicationRepository.get_env_dir(env)
        app_dir = env_dir / str(appname or "").strip()
        if not app_dir.exists() or not app_dir.is_dir():
            logger.warning("App folder not found: %s/%s", env, appname)
            raise NotFoundError("Application", f"{env}/{appname}")
        return app_dir

    @staticmethod
    def app_exists(env: str, appname: str) -> bool:
        """Check if an application exists.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            True if app exists
        """
        try:
            requests_root = get_requests_root()
            app_dir = requests_root / env / appname
            return app_dir.exists() and app_dir.is_dir()
        except Exception:
            return False

    @staticmethod
    def create_app_dir(env: str, appname: str) -> Path:
        """Create a new application directory.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            Path to created app directory

        Raises:
            NotInitializedError: If environment not initialized
            AlreadyExistsError: If app already exists
        """
        env_dir = ApplicationRepository.get_env_dir(env)
        app_dir = env_dir / str(appname or "").strip()

        if app_dir.exists():
            logger.warning("App already exists: %s/%s", env, appname)
            raise AlreadyExistsError("Application", f"{env}/{appname}")

        app_dir.mkdir(parents=True, exist_ok=False)
        return app_dir

    @staticmethod
    def read_appinfo(env: str, appname: str) -> Dict[str, Any]:
        """Read appinfo.yaml file.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            Dictionary from appinfo.yaml
        """
        try:
            app_dir = ApplicationRepository.get_app_dir(env, appname)
            appinfo_path = app_dir / "appinfo.yaml"
            return read_yaml_dict(appinfo_path)
        except (NotFoundError, NotInitializedError):
            return {}
        except Exception:
            return {}

    @staticmethod
    def write_appinfo(env: str, appname: str, data: Dict[str, Any]) -> None:
        """Write appinfo.yaml file.

        Args:
            env: Environment name
            appname: Application name
            data: Data to write
        """
        app_dir = ApplicationRepository.get_app_dir(env, appname)
        appinfo_path = app_dir / "appinfo.yaml"
        write_yaml_dict(appinfo_path, data, sort_keys=False)

    @staticmethod
    def list_apps(env: str) -> List[Path]:
        """List all application directories for an environment.

        Args:
            env: Environment name

        Returns:
            List of app directory paths
        """
        env_dir = ApplicationRepository.get_env_dir(env)
        return [child for child in env_dir.iterdir() if child.is_dir()]

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
            app_dir = ApplicationRepository.get_app_dir(env, appname)
            argocd_path = app_dir / "argocd.yaml"
            return argocd_path.exists() and argocd_path.is_file()
        except Exception:
            return False

    @staticmethod
    def delete_app_dir(env: str, appname: str) -> bool:
        """Delete an application directory.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            True if deleted, False if not found

        Raises:
            AppError: If deletion fails
        """
        import shutil
        try:
            requests_root = get_requests_root()
            app_dir = requests_root / env / appname

            if not app_dir.exists() or not app_dir.is_dir():
                return False

            shutil.rmtree(app_dir)
            return True
        except Exception as e:
            logger.error("Failed to delete app dir %s/%s: %s", env, appname, str(e), exc_info=True)
            raise AppError(f"Failed to delete app: {e}")

    @staticmethod
    def ensure_appinfo_exists(env: str, appname: str) -> None:
        """Ensure appinfo.yaml exists for an app, creating it if needed.

        Args:
            env: Environment name
            appname: Application name
        """
        requests_root = get_requests_root()
        env_dir = requests_root / str(env or "").strip().lower()
        app_dir = env_dir / str(appname or "").strip()
        appinfo_path = app_dir / "appinfo.yaml"

        if appinfo_path.exists():
            return

        app_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "appname": str(appname or "").strip(),
            "description": "",
            "managedby": "",
        }
        appinfo_path.write_text(yaml.safe_dump(payload, sort_keys=False))
