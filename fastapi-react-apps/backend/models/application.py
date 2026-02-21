"""Application-related Pydantic models."""

from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict


class ApplicationBase(BaseModel):
    """Base model for application data."""
    appname: str
    description: Optional[str] = None
    managergroups: List[str]
    environment: str


class ApplicationCreate(ApplicationBase):
    """Model for creating an application with appcode."""
    appcode: str


class ApplicationUpdate(ApplicationBase):
    """Model for updating an application."""
    pass


class Application(ApplicationCreate):
    """Full application model with ORM support."""
    model_config = ConfigDict(from_attributes=True)


class AppCreate(BaseModel):
    """Request model for creating an application via API."""
    model_config = ConfigDict(extra="forbid")
    appname: str
    description: Optional[str] = ""
    clusters: Optional[List[str]] = None


class AppResponse(BaseModel):
    """Response model for application data."""
    appname: str
    description: str = ""
    managedby: str = ""
    clusters: List[str] = []
    totalns: int = 0
    argocd: bool = False


class AppDeleteResponse(BaseModel):
    """Response model for application deletion."""
    appname: str
    env: str
    deleted: bool
    removed: Dict[str, bool] = {}
