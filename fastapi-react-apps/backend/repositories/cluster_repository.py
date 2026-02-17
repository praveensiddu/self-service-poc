"""Cluster repository for data access."""

from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

from backend.dependencies import get_control_clusters_root, require_control_clusters_root
from backend.utils.yaml_utils import load_clusters_from_file

logger = logging.getLogger("uvicorn.error")


class ClusterRepository:
    """Repository for cluster data operations."""

    @staticmethod
    def get_clusters_file_path(env: str) -> Path:
        """Get the clusters file path for an environment.

        Args:
            env: Environment name

        Returns:
            Path to clusters YAML file
        """
        clusters_root = require_control_clusters_root()
        key = str(env or "").strip().lower()
        return clusters_root / f"{key}_clusters.yaml"

    @staticmethod
    def load_clusters(env: str) -> List[Dict[str, Any]]:
        """Load cluster definitions for an environment.

        Args:
            env: Environment name

        Returns:
            List of cluster dictionaries
        """
        file_path = ClusterRepository.get_clusters_file_path(env)
        return load_clusters_from_file(file_path)

    @staticmethod
    def get_clustername_from_item(item: Dict[str, Any]) -> str:
        """Extract clustername from a cluster item.

        Args:
            item: Cluster dictionary

        Returns:
            Clustername string
        """
        for k in ["clustername", "name", "cluster"]:
            v = item.get(k)
            if v is None:
                continue
            s = str(v).strip()
            if s:
                return s
        return ""

    @staticmethod
    def find_cluster_by_name(env: str, clustername: str) -> Optional[Dict[str, Any]]:
        """Find a cluster by its name.

        Args:
            env: Environment name
            clustername: Clustername to find

        Returns:
            Cluster dictionary or None if not found
        """
        clusters = ClusterRepository.load_clusters(env)
        target = str(clustername or "").strip()
        if not target:
            return None

        for cluster in clusters:
            if ClusterRepository.get_clustername_from_item(cluster) == target:
                return cluster
        return None
