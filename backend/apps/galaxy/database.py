# /backend/apps/galaxy/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pathlib import Path

# Point to your SQLite DB
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
DATABASE_URL = f"sqlite:///{BASE_DIR}/ehgc_galaxy.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for FastAPI to inject DB session into routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
