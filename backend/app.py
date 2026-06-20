# /backend/app.py
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from pathlib import Path
from apps.galaxy.routes import router as galaxy_router
from apps.galaxy.models import Base
from apps.galaxy.database import engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EH Galactic Compendium", version="0.1.0")

BASE_DIR = Path(__file__).resolve().parent  # points to backend/
STATIC_DIR = BASE_DIR / "static"

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include routers
app.include_router(galaxy_router)

@app.get("/")
def root():
    return {"message": "EH Galactic Compendium API running"}
