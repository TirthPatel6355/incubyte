"""Pydantic schemas used for request/response validation."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- Auth ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    is_admin: bool = False


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    is_admin: bool


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Vehicles ----------

class VehicleBase(BaseModel):
    make: str
    model: str
    category: str
    price: float = Field(gt=0)
    quantity: int = Field(ge=0)


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    make: str | None = None
    model: str | None = None
    category: str | None = None
    price: float | None = Field(default=None, gt=0)
    quantity: int | None = Field(default=None, ge=0)


class VehicleOut(VehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class RestockRequest(BaseModel):
    amount: int = Field(gt=0)


class PurchaseResponse(BaseModel):
    vehicle: VehicleOut
    message: str
