"""Repositories package - Data Access Layer

This package contains repository classes that handle all data access operations.
Repositories abstract away the details of reading/writing YAML files and
directory operations.

Available Repositories:
- ApplicationRepository: Manages application data persistence
- NamespaceRepository: Manages namespace data persistence
- ClusterRepository: Manages cluster data access

Pattern:
Repositories provide a clean interface to data sources, hiding implementation
details like file paths, YAML parsing, and error handling from the business logic.
"""

from backend.repositories.application_repository import ApplicationRepository
from backend.repositories.cluster_repository import ClusterRepository
from backend.repositories.namespace_repository import NamespaceRepository

__all__ = [
    'ApplicationRepository',
    'ClusterRepository',
    'NamespaceRepository',
]

