from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from backend.config.settings import is_readonly


class ReadOnlyMiddleware(BaseHTTPMiddleware):
    """Middleware to block modification requests when in read-only mode."""

    async def dispatch(self, request: Request, call_next):
        # Check if readonly mode is enabled
        if is_readonly():
            # Block POST, PUT, DELETE, PATCH requests
            if request.method in ("POST", "PUT", "DELETE", "PATCH"):
                # Allow specific endpoints even in readonly mode
                # These are read-only operations that happen to use POST for technical reasons
                allowed_readonly_paths = [
                    "/api/apps/",  # Will check more specifically below
                ]

                # Allow YAML preview/generation endpoints (they don't modify data)
                # These POST endpoints just generate YAML previews for viewing purposes
                if "_yaml" in request.url.path:
                    # Allow any endpoint that generates YAML (egressfirewall_yaml, rolebinding_yaml, etc.)
                    pass
                else:
                    # Block all other POST/PUT/DELETE/PATCH requests
                    raise HTTPException(
                        status_code=403,
                        detail="Application is in read-only mode. Modifications are not allowed."
                    )

        response = await call_next(request)
        return response
