"""Namespace service for business logic."""

from typing import Dict, Any, List, Optional
from pathlib import Path
import re
import shutil
import logging

from backend.repositories.namespace_repository import NamespaceRepository
from backend.utils.helpers import parse_bool, as_trimmed_str
from backend.utils.yaml_utils import write_yaml_dict
from backend.utils.enforcement import load_enforcement_settings
from backend.exceptions.custom import (
    ValidationError,
    NotFoundError,
    AlreadyExistsError,
    AppError,
)

logger = logging.getLogger("uvicorn.error")


class NamespaceService:
    """Service for namespace business logic."""

    def __init__(self):
        self.repo = NamespaceRepository()

    def get_namespaces_for_app(self, env: str, appname: str) -> Dict[str, Any]:
        """Get all namespaces for an application.

        Args:
            env: Environment name
            appname: Application name

        Returns:
            Dictionary of namespace data keyed by namespace name
        """
        enforcement = load_enforcement_settings()
        egress_firewall_enforced = str(enforcement.enforce_egress_firewall or "yes").strip().lower() != "no"

        argocd_exists = self.repo.argocd_exists(env, appname)

        out = {}
        for child in self.repo.list_namespaces(env, appname):
            ns_name = child.name
            ns_info = self.repo.read_namespace_info(env, appname, ns_name)
            nsargocd = self.repo.read_nsargocd(env, appname, ns_name)

            clusters = ns_info.get("clusters")
            if not isinstance(clusters, list):
                clusters = []
            clusters = [str(c) for c in clusters if c is not None and str(c).strip()]

            egress_nameid = as_trimmed_str(ns_info.get("egress_nameid"))

            need_argo = parse_bool(nsargocd.get("need_argo"))
            if not argocd_exists:
                need_argo = False

            out[ns_name] = {
                "name": ns_name,
                "description": str(ns_info.get("description", "") or ""),
                "clusters": clusters,
                "egress_nameid": egress_nameid,
                "enable_pod_based_egress_ip": parse_bool(ns_info.get("enable_pod_based_egress_ip")),
                "allow_all_egress": (not egress_firewall_enforced) or parse_bool(ns_info.get("allow_all_egress")),
                "need_argo": need_argo,
            }

        return out

    def create_namespace(
        self,
        env: str,
        appname: str,
        namespace: str,
        clusters: Optional[List[str]] = None,
        egress_nameid: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new namespace.

        Args:
            env: Environment name
            appname: Application name
            namespace: Namespace name
            clusters: List of cluster names
            egress_nameid: Egress namespace ID

        Returns:
            Created namespace data

        Raises:
            ValidationError: If validation fails
            AppError: If creation fails
        """
        # Validate namespace name
        namespace = str(namespace or "").strip()
        if not namespace:
            raise ValidationError("namespace", "is required")
        if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", namespace):
            raise ValidationError(
                "namespace",
                "Invalid namespace name. Must be lowercase alphanumeric with hyphens."
            )

        ns_dir = None
        try:
            # Create namespace directory
            ns_dir = self.repo.create_namespace_dir(env, appname, namespace)

            # Prepare namespace info
            clusters = clusters or []
            # Flatten any nested lists and convert to strings
            flattened_clusters = []
            for item in clusters:
                if isinstance(item, list):
                    # Handle nested lists by flattening them
                    for sub_item in item:
                        if sub_item is not None and str(sub_item).strip():
                            flattened_clusters.append(str(sub_item).strip())
                elif item is not None and str(item).strip():
                    flattened_clusters.append(str(item).strip())

            ns_info: Dict[str, Any] = {
                "clusters": flattened_clusters,
            }

            egress_nameid_str = str(egress_nameid or "").strip()
            if egress_nameid_str:
                ns_info["egress_nameid"] = egress_nameid_str

            # Write namespace info
            ns_info_path = ns_dir / "namespace_info.yaml"
            write_yaml_dict(ns_info_path, ns_info, sort_keys=False)

        except (ValidationError, AlreadyExistsError, NotFoundError):
            raise
        except Exception as e:
            # Clean up if something went wrong
            if ns_dir is not None and ns_dir.exists():
                shutil.rmtree(ns_dir)
            logger.error("Failed to create namespace: %s", e, exc_info=True)
            raise AppError(f"Failed to create namespace: {e}")

        need_argo = False
        status = "Argo used" if need_argo else "Argo not used"

        return {
            "name": namespace,
            "description": "",
            "clusters": flattened_clusters,
            "egress_nameid": egress_nameid_str if egress_nameid_str else None,
            "enable_pod_based_egress_ip": False,
            "allow_all_egress": False,
            "need_argo": need_argo,
            "generate_argo_app": True,
            "status": status
        }

    def delete_namespaces(
        self,
        env: str,
        appname: str,
        namespace_list: List[str]
    ) -> Dict[str, Any]:
        """Delete multiple namespaces.

        Args:
            env: Environment name
            appname: Application name
            namespace_list: List of namespace names to delete

        Returns:
            Dictionary with deletion results
        """
        deleted_data = {
            "appname": appname,
            "env": env,
            "requested_deletions": namespace_list,
            "deleted_namespaces": [],
            "not_found": [],
        }

        for ns_name in namespace_list:
            if self.repo.delete_namespace_dir(env, appname, ns_name):
                deleted_data["deleted_namespaces"].append(ns_name)
            else:
                deleted_data["not_found"].append(ns_name)

        # Check if app directory is empty
        if deleted_data["deleted_namespaces"]:
            app_dir = self.repo.get_app_dir(env, appname)
            if not any(p.is_dir() for p in app_dir.iterdir()):
                deleted_data["app_entry_removed"] = True

        return deleted_data

    def copy_namespace(
        self,
        appname: str,
        namespace: str,
        from_env: str,
        to_env: str,
        to_namespace: str
    ) -> Dict[str, Any]:
        """Copy a namespace from one environment to another.

        Args:
            appname: Application name
            namespace: Source namespace name
            from_env: Source environment
            to_env: Destination environment
            to_namespace: Destination namespace name

        Returns:
            Dictionary with copy results

        Raises:
            ValidationError: If validation fails
            NotFoundError: If source not found
            AlreadyExistsError: If destination exists
            AppError: If copy fails
        """
        from backend.utils.yaml_utils import rewrite_namespace_in_yaml_files
        from backend.dependencies import get_requests_root

        # Validate namespace name
        if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", to_namespace):
            raise ValidationError(
                "to_namespace",
                "Invalid namespace name. Must be lowercase alphanumeric with hyphens."
            )

        if from_env == to_env and to_namespace == namespace:
            raise ValidationError(
                "to_namespace",
                "When copying within the same env, to_namespace must be different"
            )

        requests_root = get_requests_root()
        src_dir = requests_root / from_env / appname / namespace

        if not src_dir.exists() or not src_dir.is_dir():
            raise NotFoundError("Namespace", f"{from_env}/{appname}/{namespace}")

        dst_dir = requests_root / to_env / appname / to_namespace
        if dst_dir.exists():
            raise AlreadyExistsError("Namespace", f"{to_env}/{appname}/{to_namespace}")

        # Ensure app folder exists in destination env
        dst_app_dir = requests_root / to_env / appname
        if not dst_app_dir.exists() or not dst_app_dir.is_dir():
            raise NotFoundError("Application", f"{to_env}/{appname}")

        try:
            shutil.copytree(src_dir, dst_dir)
        except Exception as e:
            # best effort cleanup if partially copied
            try:
                if dst_dir.exists():
                    shutil.rmtree(dst_dir)
            except Exception:
                pass
            logger.error("Failed to copy namespace: %s", e, exc_info=True)
            raise AppError(f"Failed to copy namespace: {e}")

        try:
            rewrite_namespace_in_yaml_files(dst_dir, to_namespace)
        except Exception as e:
            logger.error(
                "Failed to rewrite copied YAML metadata namespaces for %s/%s -> %s/%s: %s",
                from_env, namespace, to_env, to_namespace, str(e),
            )

        return {
            "from_env": from_env,
            "from_namespace": namespace,
            "to_env": to_env,
            "to_namespace": to_namespace,
            "copied": True,
        }

