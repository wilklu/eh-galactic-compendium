# /backend/apps/galaxy/models.py
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Galaxy(Base):
    """SQLAlchemy model for galaxies table."""
    __tablename__ = "galaxies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(String(1000), nullable=True)
    seed = Column(Integer, nullable=False)
    grid_tier = Column(String(100), nullable=False)  # "Sector", "Subsector", etc.
    image_png_path = Column(String(500), nullable=True)  # relative path to PNG
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Galaxy(id={self.id}, name={self.name}, grid_tier={self.grid_tier})>"
