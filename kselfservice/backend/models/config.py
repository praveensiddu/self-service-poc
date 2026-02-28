"""Configuration-related Pydantic models."""

from pydantic import BaseModel


class KSelfServeConfig(BaseModel):
    """Configuration model for KSelfServe settings."""
    workspace: str = ""
    requestsRepo: str = ""
    templatesRepo: str = ""
    renderedManifestsRepo: str = ""
    controlRepo: str = ""
