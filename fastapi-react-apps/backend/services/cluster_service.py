"""Cluster service for business logic."""

from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import logging
import yaml

from backend.repositories.cluster_repository import ClusterRepository
from backend.utils.helpers import as_string_list
from backend.utils.validators import is_valid_ip
from backend.dependencies import (
    get_control_clusters_root,
    get_workspace_path,
    get_requests_root,
)

logger = logging.getLogger("uvicorn.error")


class ClusterService:
    """Service for cluster business logic."""

    def __init__(self):
        self.repo = ClusterRepository()

    def get_clusters_by_app(self, env: str) -> Dict[str, List[str]]:
        """Get clusters grouped by application.

        Args:
            env: Environment name

        Returns:
            Dictionary mapping app names to list of cluster names
        """
        items = self.repo.load_clusters(env)

        out: Dict[str, List[str]] = {}
        for item in items:
            raw_clustername = item.get("clustername", item.get("clusterName", item.get("name")))
            cname = str(raw_clustername or "").strip()
            if not cname:
                continue
            apps = as_string_list(item.get("applications"))
            for appname in apps:
                key = str(appname or "").strip()
                if not key:
                    continue
                out.setdefault(key, []).append(cname)

        # Sort and deduplicate
        for k, v in list(out.items()):
            out[k] = sorted(set([str(x).strip() for x in v if str(x).strip()]), key=lambda s: s.lower())
        return out

    def get_allocated_clusters_for_app(self, env: str, app: str) -> List[str]:
        """Get list of allocated clusters for a specific app.

        Args:
            env: Environment name
            app: Application name

        Returns:
            List of cluster names allocated to the app
        """
        clusters_by_app = self.get_clusters_by_app(env)
        return clusters_by_app.get(str(app or "").strip(), [])

    def get_cluster_egress_ranges(self, env: str, clustername: str) -> List[Dict[str, str]]:
        """Get egress IP ranges for a cluster.

        Args:
            env: Environment name
            clustername: Cluster name

        Returns:
            List of egress IP range dictionaries with start_ip and end_ip
        """
        cluster = self.repo.find_cluster_by_name(env, clustername)
        if not cluster:
            return []

        egress_ranges = cluster.get("egress_ip_ranges", [])
        return self._normalize_ranges(egress_ranges)

    def get_cluster_l4_ingress_ranges(self, env: str, clustername: str) -> List[Dict[str, str]]:
        """Get L4 ingress IP ranges for a cluster.

        Args:
            env: Environment name
            clustername: Cluster name

        Returns:
            List of L4 ingress IP range dictionaries with start_ip and end_ip
        """
        cluster = self.repo.find_cluster_by_name(env, clustername)
        if not cluster:
            return []

        l4_ranges = cluster.get("l4_ingress_ranges", cluster.get("l4IngressRanges", []))
        return self._normalize_ranges(l4_ranges)

    @staticmethod
    def _normalize_ranges(value: Any) -> List[Dict[str, str]]:
        """Normalize IP ranges to consistent format.

        Args:
            value: Raw ranges value from cluster data

        Returns:
            List of normalized range dictionaries
        """
        if not isinstance(value, list):
            return []
        out: List[Dict[str, str]] = []
        for r in value:
            if not isinstance(r, dict):
                continue
            start_ip = str(r.get("start_ip") or r.get("startIp") or "").strip()
            end_ip = str(r.get("end_ip") or r.get("endIp") or "").strip()
            if not (start_ip or end_ip):
                continue
            out.append({"start_ip": start_ip, "end_ip": end_ip})
        return out

    def normalize_cluster_item(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize a cluster item to a consistent format.

        Args:
            item: Raw cluster dictionary

        Returns:
            Normalized cluster dictionary or None if invalid
        """
        raw_clustername = item.get("clustername", item.get("clusterName", item.get("name")))
        clustername = str(raw_clustername or "").strip()
        if not clustername:
            return None

        purpose = str(item.get("purpose", "") or "")
        datacenter = str(item.get("datacenter", "") or "")
        applications = as_string_list(item.get("applications"))

        # Parse L4 ingress IP ranges
        l4_ranges = self._parse_ip_ranges_from_item(
            item, ["l4_ingress_ip_ranges"]
        )

        # Parse egress IP ranges
        egress_ranges = self._parse_ip_ranges_from_item(
            item, ["egress_ip_ranges"]
        )

        return {
            "clustername": clustername,
            "purpose": purpose,
            "datacenter": datacenter,
            "applications": sorted(set(applications), key=lambda s: s.lower()),
            "l4_ingress_ip_ranges": l4_ranges,
            "egress_ip_ranges": egress_ranges,
        }

    def _parse_ip_ranges_from_item(
        self, item: Dict[str, Any], keys: List[str]
    ) -> List[Dict[str, str]]:
        """Parse IP ranges from various possible key names.

        Args:
            item: Cluster dictionary
            keys: List of possible key names to check

        Returns:
            List of IP range dictionaries
        """
        ranges_raw = None
        for key in keys:
            if key in item:
                ranges_raw = item.get(key)
                break

        ranges_out: List[Dict[str, str]] = []
        if isinstance(ranges_raw, list):
            for r in ranges_raw:
                if not isinstance(r, dict):
                    continue
                start_ip = str(
                    r.get("start_ip", r.get("startIp", r.get("startip", ""))) or ""
                ).strip()
                end_ip = str(
                    r.get("end_ip", r.get("endIp", r.get("endip", ""))) or ""
                ).strip()
                if not start_ip and not end_ip:
                    continue
                if not is_valid_ip(start_ip) or not is_valid_ip(end_ip):
                    continue
                ranges_out.append({"start_ip": start_ip, "end_ip": end_ip})
        return ranges_out

    def validate_and_parse_ip_ranges(
        self, ranges: Optional[List[Dict[str, str]]]
    ) -> Tuple[List[Dict[str, str]], Optional[str]]:
        """Validate and parse IP ranges from request payload.

        Args:
            ranges: List of IP range dictionaries

        Returns:
            Tuple of (validated ranges list, error message or None)
        """
        ranges_out: List[Dict[str, str]] = []
        if not isinstance(ranges, list):
            return ranges_out, None

        for r in ranges:
            if not isinstance(r, dict):
                continue
            start_ip = str(
                r.get("start_ip", r.get("startIp", r.get("startip", ""))) or ""
            ).strip()
            end_ip = str(
                r.get("end_ip", r.get("endIp", r.get("endip", ""))) or ""
            ).strip()
            if not start_ip and not end_ip:
                continue
            if start_ip and not is_valid_ip(start_ip):
                return [], f"Invalid start_ip: {start_ip}"
            if end_ip and not is_valid_ip(end_ip):
                return [], f"Invalid end_ip: {end_ip}"
            ranges_out.append({"start_ip": start_ip, "end_ip": end_ip})

        return ranges_out, None

    def get_environments_to_query(
        self, env: Optional[str], requests_root: Optional[Path], clusters_root: Path
    ) -> List[str]:
        """Determine which environments to query based on input.

        Args:
            env: Optional specific environment
            requests_root: Path to requests root
            clusters_root: Path to clusters root

        Returns:
            List of environment names to query
        """
        if env is not None:
            return [str(env).strip()]

        envs = []
        try:
            if requests_root is not None:
                env_info_path = requests_root / "env_info.yaml"
                if env_info_path.exists():
                    envs = yaml.safe_load(env_info_path.read_text()).get("env_order", [])
        except Exception:
            pass

        if not envs:
            envs = sorted(
                {
                    p.name.split("_clusters.yaml")[0]
                    for p in clusters_root.iterdir()
                    if p.is_file() and p.name.endswith("_clusters.yaml")
                }
            )

        return envs

    def get_clusters_for_env(
        self, env: str, clusters_root: Path, requests_root: Optional[Path]
    ) -> List[Dict[str, Any]]:
        """Get all clusters for an environment with derived app associations.

        Args:
            env: Environment name
            clusters_root: Path to clusters root
            requests_root: Path to requests root

        Returns:
            List of normalized cluster dictionaries
        """
        derived_apps_by_cluster: Dict[str, List[str]] = {}

        # Derive app associations from namespace configs
        env_requests_dir = (
            (requests_root / str(env).strip().lower()) if requests_root else None
        )
        if env_requests_dir and env_requests_dir.exists() and env_requests_dir.is_dir():
            for app_dir in env_requests_dir.iterdir():
                if not app_dir.is_dir():
                    continue
                appname = app_dir.name
                appinfo_path = app_dir / "appinfo.yaml"
                if not appinfo_path.exists() or not appinfo_path.is_file():
                    continue
                try:
                    appinfo = yaml.safe_load(appinfo_path.read_text()) or {}
                    if isinstance(appinfo, dict):
                        clusters = as_string_list(appinfo.get("clusters"))
                        for c in clusters:
                            derived_apps_by_cluster.setdefault(c, []).append(appname)
                except Exception:
                    continue

        # Load and normalize clusters
        items = self.repo.load_clusters(env)
        rows: List[Dict[str, Any]] = []

        for item in items:
            normalized = self.normalize_cluster_item(item)
            if not normalized:
                continue
            if not normalized.get("applications"):
                cname = str(normalized.get("clustername") or "")
                normalized["applications"] = sorted(
                    set(as_string_list(derived_apps_by_cluster.get(cname))),
                    key=lambda s: s.lower(),
                )
            rows.append(normalized)

        return sorted(rows, key=lambda r: str(r.get("clustername") or "").lower())

    def ensure_appinfo_exists(
        self, requests_root: Path, env_key: str, appname: str
    ) -> None:
        """Ensure appinfo.yaml exists for an app, creating it if needed.

        Args:
            requests_root: Path to requests root
            env_key: Environment key
            appname: Application name
        """
        env_dir = requests_root / str(env_key or "").strip().lower()
        app_dir = env_dir / str(appname or "").strip()
        appinfo_path = app_dir / "appinfo.yaml"

        if appinfo_path.exists():
            return

        app_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "appname": str(appname or "").strip(),
            "description": ""
        }
        appinfo_path.write_text(yaml.safe_dump(payload, sort_keys=False))

    def create_or_update_cluster(
        self,
        env: str,
        clustername: str,
        purpose: str,
        datacenter: str,
        applications: List[str],
        l4_ingress_ip_ranges: List[Dict[str, str]],
        egress_ip_ranges: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Create or update a cluster.

        Args:
            env: Environment name
            clustername: Cluster name
            purpose: Cluster purpose
            datacenter: Datacenter location
            applications: List of application names
            l4_ingress_ip_ranges: L4 ingress IP ranges
            egress_ip_ranges: Egress IP ranges

        Returns:
            Created/updated cluster dictionary
        """
        clusters_root = get_control_clusters_root()
        if clusters_root is None:
            workspace_path = get_workspace_path()
            clusters_root = (
                workspace_path
                / "kselfserv"
                / "cloned-repositories"
                / "control"
                / "clusters"
            )
            clusters_root.mkdir(parents=True, exist_ok=True)

        env_key = str(env or "").strip().lower()

        # Build normalized cluster data
        normalized = {
            "clustername": clustername,
            "purpose": purpose,
            "datacenter": datacenter,
            "applications": sorted(set(applications), key=lambda s: s.lower()),
            "l4_ingress_ip_ranges": l4_ingress_ip_ranges,
            "egress_ip_ranges": egress_ip_ranges,
        }

        # Ensure appinfo.yaml exists for all applications
        try:
            requests_root = get_requests_root()
            for appname in normalized.get("applications") or []:
                key = str(appname or "").strip()
                if key:
                    self.ensure_appinfo_exists(requests_root, env_key, key)
        except Exception as e:
            raise Exception(f"Failed to create appinfo.yaml: {e}")

        # Load existing clusters and update/add
        file_path = self.repo.get_clusters_file_path(env)
        clusters = self.repo.load_clusters(env)

        replaced = False
        for i, item in enumerate(clusters):
            raw = (
                item.get("clustername", item.get("clusterName", item.get("name")))
                if isinstance(item, dict)
                else None
            )
            if str(raw or "").strip().lower() == clustername.lower():
                clusters[i] = normalized
                replaced = True
                break
        if not replaced:
            clusters.append(normalized)

        # Write updated clusters file
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(yaml.safe_dump(clusters, sort_keys=False))
        except Exception as e:
            logger.error("Failed to write clusters file %s: %s", str(file_path), str(e))
            raise Exception("Failed to write clusters file")

        return normalized

    def delete_cluster(self, env: str, clustername: str) -> bool:
        """Delete a cluster from the configuration.

        Args:
            env: Environment name
            clustername: Cluster name to delete

        Returns:
            True if cluster was deleted, False otherwise
        """
        clusters_root = get_control_clusters_root()
        if clusters_root is None:
            return False

        env_key = str(env or "").strip().lower()
        name = str(clustername or "").strip()

        # Remove cluster from file
        file_path = self.repo.get_clusters_file_path(env_key)
        clusters = self.repo.load_clusters(env_key)

        next_items: List[Dict[str, Any]] = []
        deleted = False
        for item in clusters:
            raw = (
                item.get("clustername", item.get("clusterName", item.get("name")))
                if isinstance(item, dict)
                else None
            )
            if str(raw or "").strip().lower() == name.lower():
                deleted = True
                continue
            next_items.append(item)

        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(yaml.safe_dump(next_items, sort_keys=False))
        except Exception as e:
            logger.error("Failed to write clusters file %s: %s", str(file_path), str(e))
            raise Exception("Failed to write clusters file")

        return deleted

    def find_namespaces_using_cluster(
        self, env_key: str, cluster_name: str
    ) -> List[Dict[str, str]]:
        """Find namespaces that are using a specific cluster.

        Args:
            env_key: Environment key
            cluster_name: Cluster name

        Returns:
            List of dictionaries with app and namespace information
        """
        namespaces_using_cluster = []
        try:
            requests_root = get_requests_root()
        except Exception:
            return namespaces_using_cluster

        env_dir = requests_root / env_key

        if not env_dir.exists() or not env_dir.is_dir():
            return namespaces_using_cluster

        for app_dir in env_dir.iterdir():
            if not app_dir.is_dir():
                continue
            appname = app_dir.name

            for ns_dir in app_dir.iterdir():
                if not ns_dir.is_dir():
                    continue
                ns_info_path = ns_dir / "namespace_info.yaml"
                if not ns_info_path.exists() or not ns_info_path.is_file():
                    continue
                try:
                    ns_info = yaml.safe_load(ns_info_path.read_text()) or {}
                    if not isinstance(ns_info, dict):
                        continue
                    clusters_list = ns_info.get("clusters")
                    if not isinstance(clusters_list, list):
                        continue
                    if any(
                        str(c or "").strip().lower() == cluster_name.lower()
                        for c in clusters_list
                    ):
                        namespaces_using_cluster.append(
                            {"app": appname, "namespace": ns_dir.name}
                        )
                except Exception as e:
                    logger.error(
                        "Failed to check namespace_info.yaml for %s/%s/%s: %s",
                        env_key,
                        app_dir.name,
                        ns_dir.name,
                        str(e),
                    )

        return namespaces_using_cluster

    def find_l4_ingress_allocations(
        self, env_key: str, cluster_name: str
    ) -> List[Dict[str, str]]:
        """Find L4 ingress allocations for a specific cluster.

        Args:
            env_key: Environment key
            cluster_name: Cluster name

        Returns:
            List of dictionaries with allocation information
        """
        allocations = []
        try:
            requests_root = get_requests_root()
            workspace_path = get_workspace_path()
        except Exception:
            return allocations

        env_dir = requests_root / env_key

        # Check L4 ingress requests in app directories
        if env_dir.exists() and env_dir.is_dir():
            for app_dir in env_dir.iterdir():
                if not app_dir.is_dir():
                    continue
                l4_ingress_request_path = app_dir / "l4_ingress_request.yaml"
                if (
                    l4_ingress_request_path.exists()
                    and l4_ingress_request_path.is_file()
                ):
                    try:
                        l4_data = (
                            yaml.safe_load(l4_ingress_request_path.read_text()) or {}
                        )
                        if isinstance(l4_data, dict) and cluster_name in l4_data:
                            allocations.append(
                                {"app": app_dir.name, "cluster": cluster_name}
                            )
                    except Exception as e:
                        logger.error(
                            "Failed to check l4_ingress_request.yaml for %s/%s: %s",
                            env_key,
                            app_dir.name,
                            str(e),
                        )

        # Check allocated L4 ingress IPs
        try:
            allocated_dir = (
                workspace_path
                / "kselfserv"
                / "cloned-repositories"
                / f"rendered_{env_key}"
                / "ip_provisioning"
                / cluster_name
            )
            if allocated_dir.exists() and allocated_dir.is_dir():
                allocated_file = allocated_dir / "l4ingressip-allocated.yaml"
                if allocated_file.exists():
                    try:
                        allocated_data = (
                            yaml.safe_load(allocated_file.read_text()) or []
                        )
                        if allocated_data and len(allocated_data) > 0:
                            allocations.append(
                                {
                                    "app": "system",
                                    "cluster": cluster_name,
                                    "note": "Has allocated L4 ingress IPs",
                                }
                            )
                    except Exception:
                        pass
        except Exception as e:
            logger.error(
                "Failed to check allocated L4 ingress IPs for cluster %s: %s",
                cluster_name,
                str(e),
            )

        return allocations

    def find_egress_allocations(
        self, env_key: str, cluster_name: str
    ) -> List[Dict[str, str]]:
        """Find egress IP allocations for a specific cluster.

        Args:
            env_key: Environment key
            cluster_name: Cluster name

        Returns:
            List of dictionaries with allocation information
        """
        allocations = []
        try:
            workspace_path = get_workspace_path()
        except Exception:
            return allocations

        try:
            egress_allocated_dir = (
                workspace_path
                / "kselfserv"
                / "cloned-repositories"
                / f"rendered_{env_key}"
                / "egress_provisioning"
                / cluster_name
            )
            if egress_allocated_dir.exists() and egress_allocated_dir.is_dir():
                egress_allocated_file = egress_allocated_dir / "egressip-allocated.yaml"
                if egress_allocated_file.exists():
                    try:
                        egress_data = (
                            yaml.safe_load(egress_allocated_file.read_text()) or []
                        )
                        if egress_data and len(egress_data) > 0:
                            allocations.append(
                                {
                                    "app": "system",
                                    "cluster": cluster_name,
                                    "note": "Has allocated egress IPs",
                                }
                            )
                    except Exception:
                        pass
        except Exception as e:
            logger.error(
                "Failed to check allocated egress IPs for cluster %s: %s",
                cluster_name,
                str(e),
            )

        return allocations

    def cleanup_cluster_references(self, env_key: str, cluster_name: str) -> None:
        """Clean up all references to a deleted cluster.

        Args:
            env_key: Environment key
            cluster_name: Cluster name
        """
        try:
            requests_root = get_requests_root()
            workspace_path = get_workspace_path()
            env_dir = requests_root / env_key

            # Clean up allocated L4 ingress IPs
            self._cleanup_l4_ingress_allocations(workspace_path, env_key, cluster_name)

            # Clean up namespace references and L4 ingress requests
            if env_dir.exists() and env_dir.is_dir():
                for app_dir in env_dir.iterdir():
                    if not app_dir.is_dir():
                        continue
                    self._cleanup_app_l4_ingress_requests(
                        app_dir, env_key, cluster_name
                    )
                    self._cleanup_namespace_cluster_references(
                        app_dir, env_key, cluster_name
                    )
        except Exception as e:
            logger.error(
                "Failed to clean up cluster references from namespaces: %s", str(e)
            )

    def _cleanup_l4_ingress_allocations(
        self, workspace_path: Path, env_key: str, cluster_name: str
    ) -> None:
        """Clean up L4 ingress IP allocations for a cluster."""
        try:
            allocated_dir = (
                workspace_path
                / "kselfserv"
                / "cloned-repositories"
                / f"rendered_{env_key}"
                / "ip_provisioning"
                / cluster_name
            )
            if allocated_dir.exists() and allocated_dir.is_dir():
                allocated_file = allocated_dir / "l4ingressip-allocated.yaml"
                if allocated_file.exists():
                    allocated_file.unlink()
                    logger.info(
                        "Removed allocated L4 ingress IPs for cluster %s in env %s",
                        cluster_name,
                        env_key,
                    )
                try:
                    if allocated_dir.exists() and not any(allocated_dir.iterdir()):
                        allocated_dir.rmdir()
                except Exception:
                    pass
        except Exception as e:
            logger.error(
                "Failed to clean up allocated L4 ingress IPs for cluster %s: %s",
                cluster_name,
                str(e),
            )

    def _cleanup_app_l4_ingress_requests(
        self, app_dir: Path, env_key: str, cluster_name: str
    ) -> None:
        """Clean up L4 ingress requests for an app referencing a cluster."""
        l4_ingress_request_path = app_dir / "l4_ingress_request.yaml"
        if (
            not l4_ingress_request_path.exists()
            or not l4_ingress_request_path.is_file()
        ):
            return

        try:
            l4_data = yaml.safe_load(l4_ingress_request_path.read_text()) or {}
            if isinstance(l4_data, dict) and cluster_name in l4_data:
                del l4_data[cluster_name]
                l4_ingress_request_path.write_text(
                    yaml.safe_dump(l4_data, sort_keys=False)
                )
                logger.info(
                    "Removed cluster %s from L4 ingress requests for app %s/%s",
                    cluster_name,
                    env_key,
                    app_dir.name,
                )
        except Exception as e:
            logger.error(
                "Failed to update l4_ingress_request.yaml for %s/%s: %s",
                env_key,
                app_dir.name,
                str(e),
            )

    def _cleanup_namespace_cluster_references(
        self, app_dir: Path, env_key: str, cluster_name: str
    ) -> None:
        """Clean up namespace references to a cluster."""
        for ns_dir in app_dir.iterdir():
            if not ns_dir.is_dir():
                continue
            ns_info_path = ns_dir / "namespace_info.yaml"
            if not ns_info_path.exists() or not ns_info_path.is_file():
                continue
            try:
                ns_info = yaml.safe_load(ns_info_path.read_text()) or {}
                if not isinstance(ns_info, dict):
                    continue
                clusters_list = ns_info.get("clusters")
                if not isinstance(clusters_list, list):
                    continue
                updated_clusters = [
                    c
                    for c in clusters_list
                    if str(c or "").strip().lower() != cluster_name.lower()
                ]
                if len(updated_clusters) != len(clusters_list):
                    ns_info["clusters"] = updated_clusters
                    ns_info_path.write_text(yaml.safe_dump(ns_info, sort_keys=False))
                    logger.info(
                        "Removed cluster %s from namespace %s/%s/%s",
                        cluster_name,
                        env_key,
                        app_dir.name,
                        ns_dir.name,
                    )
            except Exception as e:
                logger.error(
                    "Failed to update namespace_info.yaml for %s/%s/%s: %s",
                    env_key,
                    app_dir.name,
                    ns_dir.name,
                    str(e),
                )

