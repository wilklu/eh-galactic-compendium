# /backend/apps/galaxy/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import random
import json
import re
from pathlib import Path

from .database import get_db
from .generator import build_galaxy_profile
from .models import Galaxy
from .render import render_galaxy_png
from .schemas import (
    GalaxyCreate,
    GalaxyUpdate,
    GalaxyResponse,
    GalaxyListResponse,
)

router = APIRouter(prefix="/api/galaxies", tags=["galaxies"])

BASE_DIR = Path(__file__).resolve().parents[2]
GALAXY_STATIC_DIR = BASE_DIR / "static" / "galaxies"
GALAXY_PREVIEW_DIR = GALAXY_STATIC_DIR / "previews"


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "galaxy"


def _build_asset_files(prefix: str) -> tuple[Path, Path, str]:
    GALAXY_STATIC_DIR.mkdir(parents=True, exist_ok=True)
    GALAXY_PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    image_path = GALAXY_STATIC_DIR / f"{prefix}.png"
    profile_path = GALAXY_STATIC_DIR / f"{prefix}.json"
    relative_image_path = f"galaxies/{prefix}.png"
    return image_path, profile_path, relative_image_path


def _generate_galaxy_assets(seed: int, name: str, grid_tier: str, params: dict, prefix: str) -> dict:
    profile = build_galaxy_profile(seed=seed, params=params)
    profile.update({"name": name, "gridTier": grid_tier, "params": params})

    image_path, profile_path, relative_image_path = _build_asset_files(prefix)
    render_galaxy_png(profile, image_path, size=int(profile.get("imageSize", 1536)))

    with profile_path.open("w", encoding="utf-8") as handle:
        json.dump(profile, handle, indent=2, ensure_ascii=False)

    return {
        "profile": profile,
        "image_png_path": relative_image_path,
        "profile_json_path": f"galaxies/{prefix}.json",
        "previewPngUrl": f"/static/{relative_image_path}",
    }


def _load_galaxy_params(image_png_path: str | None) -> dict:
    if not image_png_path:
        return {}

    profile_path = GALAXY_STATIC_DIR / Path(image_png_path).with_suffix(".json").name
    if not profile_path.exists():
        return {}

    try:
        with profile_path.open("r", encoding="utf-8") as handle:
            profile = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}

    if isinstance(profile, dict):
        return profile.get("params", {}) if isinstance(profile.get("params"), dict) else {}
    return {}


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
    params = payload.get("params") if isinstance(payload.get("params"), dict) else {}
    prefix = f"preview-{seed}-{_slugify(name)}"

    asset = _generate_galaxy_assets(
        seed=seed,
        name=name,
        grid_tier=grid_tier,
        params=params,
        prefix=prefix,
    )

    return {
        "seed": seed,
        "previewPngUrl": asset["previewPngUrl"],
        "imagePngPath": asset["image_png_path"],
        "profile": {key: value for key, value in asset["profile"].items() if key != "stars"},
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

    asset = _generate_galaxy_assets(
        seed=db_galaxy.seed,
        name=db_galaxy.name,
        grid_tier=db_galaxy.grid_tier,
        params=galaxy.params,
        prefix=f"galaxy-{db_galaxy.id}-{_slugify(db_galaxy.name)}",
    )
    db_galaxy.image_png_path = asset["image_png_path"]
    db_galaxy.params = galaxy.params
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
    for galaxy in galaxies:
        galaxy.params = _load_galaxy_params(galaxy.image_png_path)
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
    galaxy.params = _load_galaxy_params(galaxy.image_png_path)
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
    if galaxy_update.params is not None:
        galaxy.params = galaxy_update.params

    db.commit()
    db.refresh(galaxy)

    asset = _generate_galaxy_assets(
        seed=galaxy.seed,
        name=galaxy.name,
        grid_tier=galaxy.grid_tier,
        params=galaxy_update.params or _load_galaxy_params(galaxy.image_png_path),
        prefix=f"galaxy-{galaxy.id}-{_slugify(galaxy.name)}",
    )
    galaxy.image_png_path = asset["image_png_path"]
    galaxy.params = galaxy_update.params or _load_galaxy_params(galaxy.image_png_path)
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
