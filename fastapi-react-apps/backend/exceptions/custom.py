"""Custom exception classes for the application.

Using custom exceptions helps separate business logic errors from HTTP concerns,
making the code more testable and maintainable.
"""

from typing import Optional, Dict, Any


class AppError(Exception):
    """Base exception for application errors."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppError):
    """Resource not found error."""

    def __init__(self, resource_type: str, identifier: str):
        message = f"{resource_type} not found: {identifier}"
        super().__init__(message, {"resource_type": resource_type, "identifier": identifier})
        self.resource_type = resource_type
        self.identifier = identifier


class AlreadyExistsError(AppError):
    """Resource already exists error."""

    def __init__(self, resource_type: str, identifier: str):
        message = f"{resource_type} already exists: {identifier}"
        super().__init__(message, {"resource_type": resource_type, "identifier": identifier})
        self.resource_type = resource_type
        self.identifier = identifier


class ValidationError(AppError):
    """Validation error."""

    def __init__(self, field: str, message: str):
        super().__init__(f"{field}: {message}", {"field": field, "message": message})
        self.field = field


class NotInitializedError(AppError):
    """Workspace not initialized error."""

    def __init__(self, component: str = "workspace"):
        message = f"{component} not initialized"
        super().__init__(message, {"component": component})
        self.component = component


class ResourceInUseError(AppError):
    """Resource is in use and cannot be deleted."""

    def __init__(
        self,
        resource_type: str,
        identifier: str,
        used_by: Optional[Dict[str, Any]] = None
    ):
        message = f"Cannot delete {resource_type} - it is currently in use"
        details = {
            "resource_type": resource_type,
            "identifier": identifier,
            "used_by": used_by or {}
        }
        super().__init__(message, details)
        self.resource_type = resource_type
        self.identifier = identifier
        self.used_by = used_by or {}


class ConfigurationError(AppError):
    """Configuration error."""

    def __init__(self, config_key: str, message: str):
        super().__init__(f"Configuration error for {config_key}: {message}")
        self.config_key = config_key


class ExternalServiceError(AppError):
    """Error from external service (GitHub, etc.)."""

    def __init__(self, service: str, message: str, status_code: Optional[int] = None):
        details = {"service": service}
        if status_code is not None:
            details["status_code"] = status_code
        super().__init__(f"{service} error: {message}", details)
        self.service = service
        self.status_code = status_code


class IpAllocationError(AppError):
    """IP allocation error."""

    def __init__(self, cluster: str, message: str):
        super().__init__(f"IP allocation failed for cluster {cluster}: {message}")
        self.cluster = cluster


class ReadOnlyModeError(AppError):
    """Operation not allowed in read-only mode."""

    def __init__(self, operation: str):
        message = f"Operation '{operation}' not allowed in read-only mode"
        super().__init__(message, {"operation": operation})
        self.operation = operation
