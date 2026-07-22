"""Database access helpers, kept separate from route handlers (SRP)."""
from sqlalchemy.orm import Session
from sqlalchemy import and_

from . import models, schemas
from .auth import hash_password


# ---------- Users ----------

def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(
        email=user.email,
        hashed_password=hash_password(user.password),
        is_admin=user.is_admin,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ---------- Vehicles ----------

def create_vehicle(db: Session, vehicle: schemas.VehicleCreate) -> models.Vehicle:
    db_vehicle = models.Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def get_vehicle(db: Session, vehicle_id: int) -> models.Vehicle | None:
    return db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()


def list_vehicles(db: Session) -> list[models.Vehicle]:
    return db.query(models.Vehicle).all()


def search_vehicles(
    db: Session,
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
) -> list[models.Vehicle]:
    query = db.query(models.Vehicle)
    filters = []
    if make:
        filters.append(models.Vehicle.make.ilike(f"%{make}%"))
    if model:
        filters.append(models.Vehicle.model.ilike(f"%{model}%"))
    if category:
        filters.append(models.Vehicle.category.ilike(f"%{category}%"))
    if min_price is not None:
        filters.append(models.Vehicle.price >= min_price)
    if max_price is not None:
        filters.append(models.Vehicle.price <= max_price)
    if filters:
        query = query.filter(and_(*filters))
    return query.all()


def update_vehicle(
    db: Session, vehicle_id: int, update: schemas.VehicleUpdate
) -> models.Vehicle | None:
    db_vehicle = get_vehicle(db, vehicle_id)
    if db_vehicle is None:
        return None
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(db_vehicle, field, value)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def delete_vehicle(db: Session, vehicle_id: int) -> bool:
    db_vehicle = get_vehicle(db, vehicle_id)
    if db_vehicle is None:
        return False
    db.delete(db_vehicle)
    db.commit()
    return True


def purchase_vehicle(db: Session, vehicle_id: int) -> models.Vehicle | None:
    """Decrease quantity by 1. Returns None if not found, raises ValueError if out of stock."""
    db_vehicle = get_vehicle(db, vehicle_id)
    if db_vehicle is None:
        return None
    if db_vehicle.quantity <= 0:
        raise ValueError("Vehicle is out of stock")
    db_vehicle.quantity -= 1
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def restock_vehicle(db: Session, vehicle_id: int, amount: int) -> models.Vehicle | None:
    db_vehicle = get_vehicle(db, vehicle_id)
    if db_vehicle is None:
        return None
    db_vehicle.quantity += amount
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle
