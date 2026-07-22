"""
Car Dealership Inventory System - FastAPI application entrypoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import auth, vehicles

# Create tables on startup (fine for a kata; a real project would use Alembic migrations)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Car Dealership Inventory System",
    description="A RESTful API for managing a car dealership's vehicle inventory.",
    version="1.0.0",
)

# Allow the static frontend (served from a different origin/port) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vehicles.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}
