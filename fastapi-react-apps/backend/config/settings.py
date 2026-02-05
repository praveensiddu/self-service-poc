import os
from functools import lru_cache


@lru_cache()
def is_readonly() -> bool:
    """Check if the application is in read-only mode based on READONLY env variable."""
    readonly_value = os.getenv("READONLY", "false").strip().lower()
    return readonly_value in ("true", "1", "yes", "on")
