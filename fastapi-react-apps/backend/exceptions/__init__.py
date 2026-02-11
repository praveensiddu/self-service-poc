"""
Exceptions package - Custom exceptions and exception handlers.

This package contains:
- Custom exception classes for domain-specific errors
- FastAPI exception handlers for converting exceptions to HTTP responses
"""

from backend.exceptions.custom import (
    AppError,
    NotFoundError,
    AlreadyExistsError,
    ValidationError,
    NotInitializedError,
    ResourceInUseError,
    ConfigurationError,
    ExternalServiceError,
    IpAllocationError,
    ReadOnlyModeError,
)

from backend.exceptions.handlers import (
    register_exception_handlers,
    app_error_handler,
    not_found_error_handler,
    already_exists_error_handler,
    validation_error_handler,
    resource_in_use_error_handler,
)

__all__ = [
    # Custom exceptions
    'AppError',
    'NotFoundError',
    'AlreadyExistsError',
    'ValidationError',
    'NotInitializedError',
    'ResourceInUseError',
    'ConfigurationError',
    'ExternalServiceError',
    'IpAllocationError',
    'ReadOnlyModeError',
    # Exception handlers
    'register_exception_handlers',
    'app_error_handler',
    'not_found_error_handler',
    'already_exists_error_handler',
    'validation_error_handler',
    'resource_in_use_error_handler',
]
