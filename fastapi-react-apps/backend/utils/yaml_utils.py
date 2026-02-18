"""YAML file utilities."""

from pathlib import Path
from typing import Any, Dict, List
import yaml
import logging

logger = logging.getLogger("uvicorn.error")


def read_yaml_dict(path: Path) -> Dict[str, Any]:
    """Read a YAML file and return as dictionary.

    Args:
        path: Path to YAML file

    Returns:
        Dictionary from YAML file, or empty dict if file doesn't exist or has issues
    """
    if not path.exists() or not path.is_file():
        return {}
    try:
        raw = yaml.safe_load(path.read_text()) or {}
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def read_yaml_list(path: Path) -> List[Any]:
    """Read a YAML file and return as list.

    Args:
        path: Path to YAML file

    Returns:
        List from YAML file, or empty list if file doesn't exist or has issues
    """
    if not path.exists() or not path.is_file():
        return []
    try:
        raw = yaml.safe_load(path.read_text())
        return raw if isinstance(raw, list) else []
    except Exception:
        return []


def write_yaml_dict(path: Path, data: Dict[str, Any], sort_keys: bool = False) -> None:
    """Write a dictionary to a YAML file.

    Args:
        path: Path to YAML file
        data: Dictionary to write
        sort_keys: Whether to sort keys in output

    Raises:
        Exception: If write fails
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, sort_keys=sort_keys))


def write_yaml_list(path: Path, data: List[Any], sort_keys: bool = False) -> None:
    """Write a list to a YAML file.

    Args:
        path: Path to YAML file
        data: List to write
        sort_keys: Whether to sort keys in output

    Raises:
        Exception: If write fails
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, sort_keys=sort_keys))


def rewrite_namespace_in_yaml_files(root: Path, namespace: str) -> None:
    """Rewrite metadata.namespace field in all YAML files under root.

    Args:
        root: Root directory to search for YAML files
        namespace: New namespace value to set
    """
    to_ns = str(namespace or "").strip()
    if not to_ns:
        return

    patterns = ("*.yaml", "*.yml")
    for pattern in patterns:
        for path in root.rglob(pattern):
            if not path.is_file():
                continue
            try:
                raw = path.read_text()
            except Exception:
                continue

            try:
                docs = list(yaml.safe_load_all(raw))
            except Exception:
                continue

            changed = False
            next_docs = []
            for doc in docs:
                if isinstance(doc, dict):
                    md = doc.get("metadata")
                    if isinstance(md, dict) and "namespace" in md:
                        if md.get("namespace") != to_ns:
                            md["namespace"] = to_ns
                            changed = True
                next_docs.append(doc)

            if not changed:
                continue

            try:
                out = yaml.safe_dump_all(next_docs, sort_keys=False)
                path.write_text(out)
            except Exception as e:
                logger.error("Failed to rewrite metadata.namespace in %s: %s", str(path), str(e))


def load_clusters_from_file(path: Path) -> List[Dict[str, Any]]:
    """Load cluster definitions from a YAML file.

    Args:
        path: Path to clusters YAML file

    Returns:
        List of cluster dictionaries
    """
    if not path.exists() or not path.is_file():
        return []
    try:
        raw = yaml.safe_load(path.read_text())
    except Exception:
        return []
    if raw is None:
        return []
    if isinstance(raw, list):
        return [x for x in raw if isinstance(x, dict)]
    if isinstance(raw, dict):
        return [raw]
    return []
