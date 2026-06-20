# /backend/apps/galaxy/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import random
import base64
import urllib.parse

from .database import get_db
from .models import Galaxy
from .schemas import (
    GalaxyCreate,
    GalaxyUpdate,
    GalaxyResponse,
    GalaxyListResponse,
)

router = APIRouter(prefix="/api/galaxies", tags=["galaxies"])


def _build_preview_data_url(seed: int, name: str, grid_tier: str) -> str:
    """Build a lightweight inline SVG preview as a data URL."""
    # deterministic pseudo-variation from seed
    hue = seed % 360
    hue_2 = (hue + 35) % 360
    stars = [
        (60 + (seed * 7) % 900, 60 + (seed * 11) % 500, 2),
        (100 + (seed * 13) % 860, 90 + (seed * 17) % 420, 1.5),
        (140 + (seed * 19) % 780, 120 + (seed * 23) % 360, 2.5),
        (200 + (seed * 29) % 700, 180 + (seed * 31) % 300, 2),
        (260 + (seed * 37) % 620, 220 + (seed * 41) % 240, 1.5),
        (320 + (seed * 43) % 540, 260 + (seed * 47) % 180, 2),
    ]

    star_svg = "\n".join(
        [
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="hsla({hue_2}, 90%, 80%, .95)" />'
            for x, y, r in stars
        ]
    )

    safe_name = urllib.parse.quote(name)
    safe_tier = urllib.parse.quote(grid_tier)
    svg = f"""
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"960\" height=\"540\" viewBox=\"0 0 960 540\"> 
  <defs>
    <linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">
      <stop offset=\"0%\" stop-color=\"hsl({hue}, 35%, 8%)\" />
      <stop offset=\"100%\" stop-color=\"hsl({hue_2}, 40%, 14%)\" />
    </linearGradient>
  </defs>
  <rect width=\"960\" height=\"540\" fill=\"url(#bg)\" />
  {star_svg}
  <text x=\"24\" y=\"36\" fill=\"#e8f1ff\" font-size=\"22\" font-family=\"Segoe UI, Arial, sans-serif\">Galaxy Survey Preview</text>
  <text x=\"24\" y=\"66\" fill=\"#9fb4d1\" font-size=\"16\" font-family=\"Segoe UI, Arial, sans-serif\">{safe_name}</text>
  <text x=\"24\" y=\"92\" fill=\"#9fb4d1\" font-size=\"14\" font-family=\"Segoe UI, Arial, sans-serif\">Tier: {safe_tier} • Seed: {seed}</text>
</svg>
""".strip()

    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


@router.post("/generate", status_code=status.HTTP_200_OK)
def generate_galaxy_preview(payload: dict):
    """Generate a non-persistent preview payload for Galaxy Survey UI."""
    seed = payload.get("seed")
    if seed is None:
        seed = random.randint(1, 999_999)

    try:
        seed = int(seed)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="seed must be an integer",
        )

    name = str(payload.get("name") or "Unnamed Galaxy")
    grid_tier = str(payload.get("grid_tier") or payload.get("gridTier") or "Sector")

    return {
        "seed": seed,
        "previewPngUrl": _build_preview_data_url(seed=seed, name=name, grid_tier=grid_tier),
    }


@router.post("", response_model=GalaxyResponse, status_code=status.HTTP_201_CREATED)
def create_galaxy(
    galaxy: GalaxyCreate,
    db: Session = Depends(get_db),
):
    """Create a new galaxy."""
    # Check if name already exists
    existing = db.query(Galaxy).filter(Galaxy.name == galaxy.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Galaxy with name '{galaxy.name}' already exists.",
        )

    # Create new galaxy record
    db_galaxy = Galaxy(
        name=galaxy.name,
        description=galaxy.description,
        seed=galaxy.seed,
        grid_tier=galaxy.grid_tier,
    )
    db.add(db_galaxy)
    db.commit()
    db.refresh(db_galaxy)
    return db_galaxy


@router.get("", response_model=List[GalaxyListResponse])
def list_galaxies(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List all galaxies (paginated)."""
    galaxies = db.query(Galaxy).offset(skip).limit(limit).all()
    return galaxies


@router.get("/{galaxy_id}", response_model=GalaxyResponse)
def get_galaxy(
    galaxy_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific galaxy by ID."""
    galaxy = db.query(Galaxy).filter(Galaxy.id == galaxy_id).first()
    if not galaxy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Galaxy with ID {galaxy_id} not found.",
        )
    return galaxy


@router.put("/{galaxy_id}", response_model=GalaxyResponse)
def update_galaxy(
    galaxy_id: int,
    galaxy_update: GalaxyUpdate,
    db: Session = Depends(get_db),
):
    """Update a galaxy."""
    galaxy = db.query(Galaxy).filter(Galaxy.id == galaxy_id).first()
    if not galaxy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Galaxy with ID {galaxy_id} not found.",
        )

    # Update only provided fields
    if galaxy_update.name is not None:
        galaxy.name = galaxy_update.name
    if galaxy_update.description is not None:
        galaxy.description = galaxy_update.description
    if galaxy_update.grid_tier is not None:
        galaxy.grid_tier = galaxy_update.grid_tier

    db.commit()
    db.refresh(galaxy)
    return galaxy


@router.delete("/{galaxy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_galaxy(
    galaxy_id: int,
    db: Session = Depends(get_db),
):
    """Delete a galaxy."""
    galaxy = db.query(Galaxy).filter(Galaxy.id == galaxy_id).first()
    if not galaxy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Galaxy with ID {galaxy_id} not found.",
        )

    db.delete(galaxy)
    db.commit()
    return None
