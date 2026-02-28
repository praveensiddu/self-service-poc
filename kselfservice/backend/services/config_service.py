"""Configuration service for system-level operations.

This service handles workspace configuration, environment management,
repository operations, and system settings.
"""

from typing import Any, Dict, List, Optional
from pathlib import Path
import os
import subprocess

import yaml

from backend.dependencies import (
    get_config_path,
    get_workspace_path,
    get_control_settings_path,
    get_requests_repo_root,
    get_templates_repo_root,
)
from backend.utils.helpers import normalize_yes_no
from backend.utils.enforcement import EnforcementSettings
from backend.config.logging_config import get_logger
from backend.exceptions.custom import (
    ValidationError,
    NotFoundError,
    NotInitializedError,
    AppError,
)

logger = get_logger(__name__)


class ConfigService:
    """Service for configuration and system-level operations."""

    def __init__(self):
        self.config_path = get_config_path()

    # ============================================
    # Configuration Operations
    # ============================================

    def get_config(self) -> Dict[str, str]:
        """Get workspace configuration.

        Returns:
            Dictionary with configuration values

        Raises:
            AppError: If configuration cannot be read
        """
        if not self.config_path.exists():
            return {
                "workspace": "",
                "requestsRepo": "",
                "templatesRepo": "",
                "renderedManifestsRepo": "",
                "controlRepo": "",
            }

        try:
            raw = yaml.safe_load(self.config_path.read_text()) or {}
            if not isinstance(raw, dict):
                raise ValueError("config is not a mapping")
        except Exception as e:
            logger.error("Failed to read config from %s: %s", self.config_path, e, exc_info=True)
            raise AppError(f"Failed to read config: {e}")

        return {
            "workspace": str(raw.get("workspace", "") or ""),
            "requestsRepo": str(raw.get("requestsRepo", "") or ""),
            "templatesRepo": str(raw.get("templatesRepo", raw.get("TemplatesRepo", "")) or ""),
            "renderedManifestsRepo": str(
                raw.get("renderedManifestsRepo", raw.get("RenderedManifestsRepo", "")) or ""
            ),
            "controlRepo": str(raw.get("controlRepo", raw.get("ControlRepo", "")) or ""),
        }

    def save_config(
        self,
        workspace: str,
        requests_repo: str,
        templates_repo: str,
        rendered_manifests_repo: str,
        control_repo: str,
    ) -> Dict[str, str]:
        """Save workspace configuration and clone/update repositories.

        Args:
            workspace: Workspace directory path
            requests_repo: Requests repository URL
            templates_repo: Templates repository URL
            rendered_manifests_repo: Rendered manifests repository URL
            control_repo: Control repository URL

        Returns:
            Saved configuration dictionary

        Raises:
            ValidationError: If validation fails
            AppError: If repository operations fail
        """
        workspace_path = Path(workspace or "").expanduser()

        # Validate workspace
        self._validate_workspace(workspace_path)

        # Setup repository directories
        cloned_repos_dir = workspace_path / "kselfserv" / "cloned-repositories"
        requests_clone_dir = cloned_repos_dir / "requests"
        requests_write_clone_dir = cloned_repos_dir / "requests-write"
        templates_clone_dir = cloned_repos_dir / "templates"
        control_clone_dir = cloned_repos_dir / "control"

        # Validate existing clone directories
        self._validate_clone_directories(
            requests_clone_dir,
            requests_write_clone_dir,
            templates_clone_dir,
            control_clone_dir,
        )

        # Clone requests repo if needed
        if not requests_clone_dir.exists():
            self._clone_repository(requests_repo, requests_clone_dir, "requestsRepo")

        if not requests_write_clone_dir.exists():
            self._clone_repository(requests_repo, requests_write_clone_dir, "requestsRepo")

        # Validate env_info.yaml
        env_keys = self._validate_env_info(requests_clone_dir)

        # Clone templates repo if needed
        if templates_repo and not templates_clone_dir.exists():
            self._clone_repository(templates_repo, templates_clone_dir, "templatesRepo")

        # Clone control repo if needed
        if not control_clone_dir.exists():
            self._clone_repository(control_repo, control_clone_dir, "controlRepo")

        # Clone/update rendered manifests repos per environment
        if rendered_manifests_repo:
            self._setup_rendered_repos(
                cloned_repos_dir,
                rendered_manifests_repo,
                env_keys,
            )

        # Write configuration
        config_data = {
            "workspace": workspace,
            "requestsRepo": requests_repo,
            "templatesRepo": templates_repo,
            "renderedManifestsRepo": rendered_manifests_repo,
            "controlRepo": control_repo,
        }

        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            self.config_path.write_text(yaml.safe_dump(config_data, sort_keys=False))
        except Exception as e:
            logger.error("Failed to write config to %s: %s", self.config_path, e, exc_info=True)
            raise AppError(f"Failed to write config: {e}")

        return config_data

    def _validate_workspace(self, workspace_path: Path) -> None:
        """Validate workspace directory.

        Args:
            workspace_path: Path to workspace directory

        Raises:
            ValidationError: If validation fails
        """
        if not workspace_path.exists() or not workspace_path.is_dir():
            logger.error("Workspace validation failed: directory does not exist or is not a directory: %s", workspace_path)
            raise ValidationError(
                "workspace",
                f"Workspace directory does not exist or is not a directory: {workspace_path}",
            )
        if not os.access(workspace_path, os.R_OK | os.W_OK | os.X_OK):
            logger.error("Workspace validation failed: directory is not accessible (need read/write/execute): %s", workspace_path)
            raise ValidationError(
                "workspace",
                f"Workspace directory is not accessible (need read/write/execute): {workspace_path}",
            )

    def _validate_clone_directories(
        self,
        requests_dir: Path,
        requests_write_dir: Path,
        templates_dir: Path,
        control_dir: Path,
    ) -> None:
        """Validate clone directories if they exist.

        Args:
            requests_dir: Requests clone directory
            templates_dir: Templates clone directory
            control_dir: Control clone directory

        Raises:
            ValidationError: If validation fails
        """
        if requests_dir.exists() and not requests_dir.is_dir():
            logger.error("Requests clone path validation failed: expected directory but found file: %s", requests_dir)
            raise ValidationError(
                "requestsRepo",
                f"Expected requests clone path to be a directory: {requests_dir}",
            )
        if templates_dir.exists() and not templates_dir.is_dir():
            logger.error("Templates clone path validation failed: expected directory but found file: %s", templates_dir)
            raise ValidationError(
                "templatesRepo",
                f"Expected templates clone path to be a directory: {templates_dir}",
            )
        if requests_write_dir.exists() and not requests_write_dir.is_dir():
            logger.error("Requests-write clone path validation failed: expected directory but found file: %s", requests_write_dir)
            raise ValidationError(
                "requestsRepo",
                f"Expected requests-write clone path to be a directory: {requests_write_dir}",
            )
        if control_dir.exists() and not control_dir.is_dir():
            logger.error("Control clone path validation failed: expected directory but found file: %s", control_dir)
            raise ValidationError(
                "controlRepo",
                f"Expected control clone path to be a directory: {control_dir}",
            )

    def _clone_repository(
        self,
        repo_url: str,
        target_dir: Path,
        repo_name: str,
    ) -> None:
        """Clone a git repository.

        Args:
            repo_url: Repository URL
            target_dir: Target directory for clone
            repo_name: Repository name for error messages

        Raises:
            AppError: If clone fails
        """
        target_dir.parent.mkdir(parents=True, exist_ok=True)
        try:
            subprocess.run(
                ["git", "clone", str(repo_url), str(target_dir)],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or "").strip()
            logger.error("Failed to clone %s into %s: %s", repo_name, target_dir, stderr)
            raise AppError(f"Failed to clone {repo_name} into {target_dir}: {stderr}")

    def _validate_env_info(self, requests_clone_dir: Path) -> List[str]:
        """Validate env_info.yaml and return environment keys.

        Args:
            requests_clone_dir: Requests clone directory

        Returns:
            List of environment keys

        Raises:
            ValidationError: If validation fails
        """
        env_info_path = requests_clone_dir / "apprequests" / "env_info.yaml"
        if not env_info_path.exists() or not env_info_path.is_file():
            logger.error("env_info.yaml validation failed: file not present at %s", env_info_path)
            raise ValidationError(
                "env_info.yaml",
                f"env_info.yaml file not present {env_info_path}",
            )

        try:
            env_info = yaml.safe_load(env_info_path.read_text()) or {}
        except Exception as e:
            logger.error("env_info.yaml parsing failed at %s: %s", env_info_path, e, exc_info=True)
            raise ValidationError(
                "env_info.yaml",
                "env_info.yaml file parsing failed",
            )

        if not isinstance(env_info, dict):
            logger.error("env_info.yaml validation failed: not a dictionary, got type %s", type(env_info).__name__)
            raise ValidationError(
                "env_info.yaml",
                "env_info.yaml is not a dictionary",
            )

        env_order = env_info.get("env_order")
        if not isinstance(env_order, list) or not env_order:
            logger.error("env_info.yaml validation failed: env_order field missing or invalid, got type %s", type(env_order).__name__ if env_order else "None")
            raise ValidationError(
                "env_info.yaml",
                "env_order field is not present in env_info.yaml file",
            )

        env_keys: List[str] = []
        for e in env_order:
            if not isinstance(e, str):
                continue
            k = e.strip().lower()
            if k:
                env_keys.append(k)

        if not env_keys:
            logger.error("env_info.yaml validation failed: no valid environment keys found in env_order")
            raise ValidationError("env_info.yaml", "invalid env_info.yaml file")

        return env_keys

    def _setup_rendered_repos(
        self,
        cloned_repos_dir: Path,
        rendered_repo_url: str,
        env_keys: List[str],
    ) -> None:
        """Setup rendered manifests repositories per environment.

        Args:
            cloned_repos_dir: Cloned repositories directory
            rendered_repo_url: Rendered manifests repository URL
            env_keys: List of environment keys

        Raises:
            ValidationError: If setup fails
        """
        cloned_repos_dir.mkdir(parents=True, exist_ok=True)

        for env_key in env_keys:
            rendered_env_dir = cloned_repos_dir / f"rendered_{env_key}"

            if rendered_env_dir.exists() and not rendered_env_dir.is_dir():
                logger.error("Rendered clone path validation failed for env %s: expected directory but found file: %s", env_key, rendered_env_dir)
                raise ValidationError(
                    "renderedManifestsRepo",
                    f"Expected rendered clone path to be a directory: {rendered_env_dir}",
                )

            if not rendered_env_dir.exists():
                self._clone_rendered_branch(rendered_repo_url, rendered_env_dir, env_key)
            else:
                self._update_rendered_branch(rendered_env_dir, env_key)

    def _clone_rendered_branch(
        self,
        repo_url: str,
        target_dir: Path,
        branch: str,
    ) -> None:
        """Clone a specific branch of rendered manifests repository.

        Args:
            repo_url: Repository URL
            target_dir: Target directory
            branch: Branch name

        Raises:
            AppError: If clone fails
        """
        try:
            subprocess.run(
                [
                    "git",
                    "clone",
                    "--branch",
                    branch,
                    "--single-branch",
                    repo_url,
                    str(target_dir),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or "").strip()
            logger.error("Failed to clone rendered branch %s into %s: %s", branch, target_dir, stderr)
            raise AppError(
                f"Failed to clone renderedManifestsRepo branch {branch} into {target_dir}: {stderr}"
            )

    def _update_rendered_branch(self, repo_dir: Path, branch: str) -> None:
        """Update existing rendered manifests repository.

        Args:
            repo_dir: Repository directory
            branch: Branch name

        Raises:
            AppError: If update fails
        """
        try:
            git_dir = repo_dir / ".git"
            if git_dir.exists() and git_dir.is_dir():
                subprocess.run(
                    ["git", "-C", str(repo_dir), "fetch", "--all"],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                subprocess.run(
                    ["git", "-C", str(repo_dir), "checkout", branch],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                subprocess.run(
                    ["git", "-C", str(repo_dir), "pull", "--ff-only", "origin", branch],
                    check=True,
                    capture_output=True,
                    text=True,
                )
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or "").strip()
            logger.error("Failed to update rendered repo in %s for branch %s: %s", repo_dir, branch, stderr)
            raise AppError(
                f"Failed to update renderedManifestsRepo in {repo_dir}: {stderr}"
            )

    # ============================================
    # Environment Operations
    # ============================================

    def get_env_list(self) -> Dict[str, str]:
        """Get list of available environments.

        Returns:
            Dictionary of environment keys

        Raises:
            NotInitializedError: If environments cannot be loaded
            ValidationError: If env_info.yaml is invalid
        """
        if not self.config_path.exists():
            logger.error("Configuration not initialized: config file does not exist at %s", self.config_path)
            raise NotInitializedError("configuration")

        try:
            raw_cfg = yaml.safe_load(self.config_path.read_text()) or {}
            if not isinstance(raw_cfg, dict):
                logger.error("Configuration not initialized: config is not a dictionary")
                raise NotInitializedError("configuration")

            workspace = str(raw_cfg.get("workspace", "") or "").strip()
            if not workspace:
                logger.error("Configuration not initialized: workspace not set")
                raise NotInitializedError("workspace")

            workspace_path = Path(workspace).expanduser()
            env_info_path = (
                workspace_path
                / "kselfserv"
                / "cloned-repositories"
                / "requests"
                / "apprequests"
                / "env_info.yaml"
            )

            if not env_info_path.exists():
                logger.error("env_info.yaml not found at %s", env_info_path)
                raise NotInitializedError("env_info.yaml")

            env_info = yaml.safe_load(env_info_path.read_text()) or {}
            if not isinstance(env_info, dict):
                logger.error("env_info.yaml is not a dictionary")
                raise ValidationError("env_info.yaml", "invalid env_info.yaml file")

            env_order = env_info.get("env_order")
            if not isinstance(env_order, list) or not env_order:
                logger.error("env_order field missing or invalid in env_info.yaml")
                raise ValidationError("env_info.yaml", "invalid env_info.yaml file")

            out = {}
            for env in env_order:
                if not isinstance(env, str):
                    continue
                key = env.strip()
                if not key:
                    continue
                out[key.upper()] = ""

            if not out:
                logger.error("No valid environment keys found in env_order")
                raise ValidationError("env_info.yaml", "invalid env_info.yaml file")

            return out
        except (ValidationError, NotInitializedError):
            raise
        except Exception as e:
            logger.error("Failed to load env list: %s", e, exc_info=True)
            raise AppError(f"Failed to load env list: {e}")

    # ============================================
    # Enforcement Settings Operations
    # ============================================

    def get_enforcement_settings(self) -> EnforcementSettings:
        """Get enforcement settings.

        Returns:
            EnforcementSettings object
        """
        from backend.utils.enforcement import load_enforcement_settings
        return load_enforcement_settings()

    def update_enforcement_settings(
        self,
        enforce_egress_firewall: Optional[str] = None,
        enforce_egress_ip: Optional[str] = None,
    ) -> EnforcementSettings:
        """Update enforcement settings.

        Args:
            enforce_egress_firewall: Egress firewall enforcement setting
            enforce_egress_ip: Egress IP enforcement setting

        Returns:
            Updated EnforcementSettings

        Raises:
            AppError: If update fails
        """
        path = get_control_settings_path()

        # Preserve unrelated keys, but always update our two.
        base: Dict[str, Any] = {}
        if path.exists() and path.is_file():
            try:
                raw = yaml.safe_load(path.read_text())
                if isinstance(raw, dict):
                    base = dict(raw)
            except Exception as e:
                logger.error("Failed to read enforcement settings from %s: %s", path, e, exc_info=True)
                raise AppError(f"Failed to read settings: {e}")

        base["enforce_egress_firewall"] = normalize_yes_no(enforce_egress_firewall, "yes")
        base["enforce_egress_ip"] = normalize_yes_no(enforce_egress_ip, "yes")

        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(yaml.safe_dump(base, sort_keys=False))
        except Exception as e:
            logger.error("Failed to write enforcement settings to %s: %s", path, e, exc_info=True)
            raise AppError(f"Failed to write settings: {e}")

        return EnforcementSettings(
            enforce_egress_firewall=normalize_yes_no(base.get("enforce_egress_firewall"), "yes"),
            enforce_egress_ip=normalize_yes_no(base.get("enforce_egress_ip"), "yes"),
        )

    # ============================================
    # Catalog Operations
    # ============================================

    def get_role_catalog(self, kind: str, env: Optional[str] = None) -> List[str]:
        """Get role catalog for a specific kind.

        Args:
            kind: Role kind (Role or ClusterRole)
            env: Optional environment filter

        Returns:
            List of role names

        Raises:
            ValidationError: If invalid parameters
            NotInitializedError: If catalog not initialized
            AppError: If catalog cannot be loaded
        """
        kind_key = str(kind or "").strip()
        if kind_key not in ("Role", "ClusterRole"):
            logger.error("Invalid role kind specified: %s (expected Role or ClusterRole)", kind_key)
            raise ValidationError(
                "kind",
                "Invalid kind; expected Role or ClusterRole",
            )

        templates_root = get_templates_repo_root()
        catalog_dir = templates_root / "catalog_roles"
        filename = "role_list.yaml" if kind_key == "Role" else "clusterrole_list.yaml"
        path = catalog_dir / filename

        if not path.exists() or not path.is_file():
            logger.error("Role catalog not found at %s", path)
            raise NotInitializedError("role catalog")

        try:
            raw = yaml.safe_load(path.read_text())
        except Exception as e:
            logger.error("Failed to read role catalog: %s", e, exc_info=True)
            raise AppError(f"Failed to read role catalog: {e}")

        base = self._normalize_role_catalog(raw)

        env_key = str(env or "").strip()
        if env_key:
            env_path = catalog_dir / env_key / filename
            if env_path.exists() and env_path.is_file():
                try:
                    env_raw = yaml.safe_load(env_path.read_text())
                except Exception as e:
                    logger.error("Failed to read env role catalog: %s", e, exc_info=True)
                    raise AppError(f"Failed to read env role catalog: {e}")

                env_items = self._normalize_role_catalog(env_raw)
                return sorted(set([*base, *env_items]), key=lambda s: s.lower())

        return base

    def _normalize_role_catalog(self, raw: Any) -> List[str]:
        """Normalize role catalog data.

        Args:
            raw: Raw catalog data

        Returns:
            Sorted list of role names
        """
        if raw is None:
            return []
        if isinstance(raw, list):
            return sorted(
                {str(x).strip() for x in raw if str(x).strip()},
                key=lambda s: s.lower(),
            )
        if isinstance(raw, dict):
            v = raw.get("roles", raw.get("role_list", raw.get("items", raw.get("data"))))
            if isinstance(v, list):
                return sorted(
                    {str(x).strip() for x in v if str(x).strip()},
                    key=lambda s: s.lower(),
                )

            # Support catalogs shaped like: role-name-1: {}, role-name-2: {}
            keys = [str(k).strip() for k in raw.keys() if str(k).strip()]
            if keys:
                return sorted(set(keys), key=lambda s: s.lower())
        if isinstance(raw, str):
            s = raw.strip()
            return [s] if s else []
        return []

    # ============================================
    # Git Changes Tracking
    # ============================================

    def get_requests_changes(self, env: Optional[str] = None) -> Dict[str, Any]:
        """Get changes in requests repository.

        Args:
            env: Optional environment filter

        Returns:
            Dictionary with changed apps and namespaces

        Raises:
            NotInitializedError: If repo not initialized
            ValidationError: If repo is not a git repository
            AppError: If changes cannot be computed
        """
        env_key = str(env or "").strip().lower()
        repo_root = get_requests_repo_root()

        if not repo_root.exists() or not repo_root.is_dir():
            raise NotInitializedError("requests repository")

        try:
            git_dir = repo_root / ".git"
            if not git_dir.exists() or not git_dir.is_dir():
                raise ValidationError(
                    "requestsRepo",
                    f"Requests repo is not a git repository: {repo_root}",
                )

            # Try to fetch latest changes
            try:
                self._run_git(repo_root, ["fetch", "origin"])
            except subprocess.CalledProcessError:
                # If fetch fails (no network, etc.), still try to compute local changes
                pass

            changed_files = self._get_changed_files(repo_root)
            apps_set, namespaces_set = self._parse_changed_paths(changed_files, env_key)

            return {
                "env": env_key,
                "apps": sorted(apps_set),
                "namespaces": sorted(namespaces_set),
            }
        except (NotInitializedError, ValidationError):
            raise
        except Exception as e:
            logger.error("Failed to compute requests repo changes: %s", e, exc_info=True)
            raise AppError(f"Failed to compute requests repo changes: {e}")

    def _run_git(self, repo_dir: Path, args: List[str]) -> subprocess.CompletedProcess:
        """Run a git command.

        Args:
            repo_dir: Repository directory
            args: Git command arguments

        Returns:
            CompletedProcess instance
        """
        return subprocess.run(
            ["git", "-C", str(repo_dir), *args],
            check=True,
            capture_output=True,
            text=True,
        )

    def _get_changed_files(self, repo_root: Path) -> List[str]:
        """Get list of changed files in repository.

        Args:
            repo_root: Repository root directory

        Returns:
            List of changed file paths
        """
        changed_files: List[str] = []

        # Changes vs origin/main on current branch
        try:
            cp = self._run_git(repo_root, ["diff", "--name-only", "origin/main...HEAD"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        # Staged changes
        try:
            cp = self._run_git(repo_root, ["diff", "--name-only", "--cached"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        # Unstaged changes
        try:
            cp = self._run_git(repo_root, ["diff", "--name-only"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        # Untracked files
        try:
            cp = self._run_git(repo_root, ["ls-files", "--others", "--exclude-standard"])
            changed_files.extend([ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()])
        except subprocess.CalledProcessError:
            pass

        return changed_files

    def _parse_changed_paths(
        self,
        changed_files: List[str],
        env_filter: str,
    ) -> tuple[set, set]:
        """Parse changed file paths to extract apps and namespaces.

        Args:
            changed_files: List of changed file paths
            env_filter: Environment filter

        Returns:
            Tuple of (apps_set, namespaces_set)
        """
        apps_set = set()
        namespaces_set = set()

        for p in changed_files:
            rel = str(p or "").strip().lstrip("/")
            if not rel:
                continue
            if not rel.startswith("apprequests/"):
                continue

            parts = rel.split("/")
            if len(parts) < 4:
                continue

            env_part = str(parts[1] or "").strip().lower()
            app_part = str(parts[2] or "").strip()
            ns_part = str(parts[3] or "").strip()
            if not env_part or not app_part or not ns_part:
                continue

            if env_filter and env_part != env_filter:
                continue

            apps_set.add(f"{env_part}/{app_part}")
            namespaces_set.add(f"{env_part}/{app_part}/{ns_part}")

        return apps_set, namespaces_set
