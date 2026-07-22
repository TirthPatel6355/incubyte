"""Vehicle inventory endpoints (protected by JWT auth)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..auth import get_current_user, require_admin
from ..database import get_db

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.post("", response_model=schemas.VehicleOut, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    vehicle: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.create_vehicle(db, vehicle)


@router.get("", response_model=list[schemas.VehicleOut])
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_vehicles(db)


@router.get("/search", response_model=list[schemas.VehicleOut])
def search_vehicles(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.search_vehicles(db, make, model, category, min_price, max_price)


@router.put("/{vehicle_id}", response_model=schemas.VehicleOut)
def update_vehicle(
    vehicle_id: int,
    update: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    updated = crud.update_vehicle(db, vehicle_id, update)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return updated


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    deleted = crud.delete_vehicle(db, vehicle_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return None


@router.post("/{vehicle_id}/purchase", response_model=schemas.PurchaseResponse)
def purchase_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        vehicle = crud.purchase_vehicle(db, vehicle_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return schemas.PurchaseResponse(vehicle=vehicle, message="Purchase successful")


@router.post("/{vehicle_id}/restock", response_model=schemas.VehicleOut)
def restock_vehicle(
    vehicle_id: int,
    restock: schemas.RestockRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    vehicle = crud.restock_vehicle(db, vehicle_id, restock.amount)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle
