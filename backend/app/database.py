"""
Database configuration for the Car Dealership Inventory System.

Uses SQLite via SQLAlchemy. The database URL can be overridden with the
DATABASE_URL environment variable, which is how the test suite points
the app at a separate, throwaway SQLite file instead of the dev DB.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dealership.db")

# check_same_thread=False is required for SQLite when used with FastAPI's
# threaded request handling.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and closes it afterward."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
