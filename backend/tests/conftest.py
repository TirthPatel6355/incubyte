"""Shared pytest fixtures: an isolated in-file SQLite DB per test and a TestClient."""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point the app at a fresh temp SQLite file BEFORE importing the app,
# so models.Base.metadata.create_all runs against the test DB, not the dev DB.
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"

from app.main import app  # noqa: E402
from app.database import Base, get_db  # noqa: E402

engine = create_engine(f"sqlite:///{_db_path}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def clean_database():
    """Drop and recreate all tables before every test for full isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token(client):
    client.post("/api/auth/register", json={
        "email": "admin@dealership.com", "password": "adminpass", "is_admin": True
    })
    resp = client.post("/api/auth/login", json={
        "email": "admin@dealership.com", "password": "adminpass"
    })
    return resp.json()["access_token"]


@pytest.fixture
def user_token(client):
    client.post("/api/auth/register", json={
        "email": "user@dealership.com", "password": "userpass", "is_admin": False
    })
    resp = client.post("/api/auth/login", json={
        "email": "user@dealership.com", "password": "userpass"
    })
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
