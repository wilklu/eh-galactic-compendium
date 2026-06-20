# /backend/apps/galaxy/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GalaxyBase(BaseModel):
    """Base schema for galaxy data."""
    name: str
    description: Optional[str] = None
    seed: int
    grid_tier: str  # e.g., "Sector", "Subsector", "System"


class GalaxyCreate(GalaxyBase):
    """Schema for creating a new galaxy."""
    pass


class GalaxyUpdate(BaseModel):
    """Schema for updating a galaxy."""
    name: Optional[str] = None
    description: Optional[str] = None
    grid_tier: Optional[str] = None


class GalaxyResponse(GalaxyBase):
    """Schema for galaxy response (includes DB fields)."""
    id: int
    image_png_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # for SQLAlchemy ORM compatibility


class GalaxyListResponse(BaseModel):
    """Schema for listing galaxies."""
    id: int
    name: str
    grid_tier: str
    created_at: datetime
    image_png_path: Optional[str] = None
