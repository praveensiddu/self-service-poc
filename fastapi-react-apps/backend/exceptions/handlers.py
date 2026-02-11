"""FastAPI exception handlers for custom exceptions.

These handlers convert custom exceptions to appropriate HTTP responses,
providing consistent error formatting across the API.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging

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

logger = logging.getLogger("uvicorn.error")


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers with the FastAPI app.

    Args:
        app: The FastAPI application instance
    """
    app.add_exception_handler(NotFoundError, not_found_error_handler)
    app.add_exception_handler(AlreadyExistsError, already_exists_error_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(NotInitializedError, not_initialized_error_handler)
    app.add_exception_handler(ResourceInUseError, resource_in_use_error_handler)
    app.add_exception_handler(ConfigurationError, configuration_error_handler)
    app.add_exception_handler(ExternalServiceError, external_service_error_handler)
    app.add_exception_handler(IpAllocationError, ip_allocation_error_handler)
    app.add_exception_handler(ReadOnlyModeError, readonly_mode_error_handler)
    app.add_exception_handler(AppError, app_error_handler)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Handle generic AppError exceptions.

    Returns 500 Internal Server Error for unhandled application errors.
    """
    logger.error("Application error: %s", exc.message, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": exc.message,
            "type": "app_error",
            **exc.details
        }
    )


async def not_found_error_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    """Handle NotFoundError exceptions.

    Returns 404 Not Found.
    """
    return JSONResponse(
        status_code=404,
        content={
            "detail": exc.message,
            "type": "not_found",
            "resource_type": exc.resource_type,
            "identifier": exc.identifier
        }
    )


async def already_exists_error_handler(request: Request, exc: AlreadyExistsError) -> JSONResponse:
    """Handle AlreadyExistsError exceptions.

    Returns 409 Conflict.
    """
    return JSONResponse(
        status_code=409,
        content={
            "detail": exc.message,
            "type": "already_exists",
            "resource_type": exc.resource_type,
            "identifier": exc.identifier
        }
    )


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle ValidationError exceptions.

    Returns 400 Bad Request.
    """
    return JSONResponse(
        status_code=400,
        content={
            "detail": exc.message,
            "type": "validation_error",
            "field": exc.field
        }
    )


async def not_initialized_error_handler(request: Request, exc: NotInitializedError) -> JSONResponse:
    """Handle NotInitializedError exceptions.

    Returns 400 Bad Request.
    """
    return JSONResponse(
        status_code=400,
        content={
            "detail": exc.message,
            "type": "not_initialized",
            "component": exc.component
        }
    )


async def resource_in_use_error_handler(request: Request, exc: ResourceInUseError) -> JSONResponse:
    """Handle ResourceInUseError exceptions.

    Returns 409 Conflict.
    """
    return JSONResponse(
        status_code=409,
        content={
            "detail": exc.message,
            "type": "resource_in_use",
            "resource_type": exc.resource_type,
            "identifier": exc.identifier,
            "used_by": exc.used_by
        }
    )


async def configuration_error_handler(request: Request, exc: ConfigurationError) -> JSONResponse:
    """Handle ConfigurationError exceptions.

    Returns 500 Internal Server Error.
    """
    logger.error("Configuration error: %s", exc.message)
    return JSONResponse(
        status_code=500,
        content={
            "detail": exc.message,
            "type": "configuration_error",
            "config_key": exc.config_key
        }
    )


async def external_service_error_handler(request: Request, exc: ExternalServiceError) -> JSONResponse:
    """Handle ExternalServiceError exceptions.

    Returns 502 Bad Gateway.
    """
    logger.error("External service error (%s): %s", exc.service, exc.message)
    return JSONResponse(
        status_code=502,
        content={
            "detail": exc.message,
            "type": "external_service_error",
            "service": exc.service,
            "status_code": exc.status_code
        }
    )


async def ip_allocation_error_handler(request: Request, exc: IpAllocationError) -> JSONResponse:
    """Handle IpAllocationError exceptions.

    Returns 400 Bad Request.
    """
    return JSONResponse(
        status_code=400,
        content={
            "detail": exc.message,
            "type": "ip_allocation_error",
            "cluster": exc.cluster
        }
    )


async def readonly_mode_error_handler(request: Request, exc: ReadOnlyModeError) -> JSONResponse:
    """Handle ReadOnlyModeError exceptions.

    Returns 403 Forbidden.
    """
    return JSONResponse(
        status_code=403,
        content={
            "detail": exc.message,
            "type": "readonly_mode",
            "operation": exc.operation
        }
    )
