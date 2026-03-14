from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
import re


def _validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    return password


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        return _validate_password_strength(v)

class VerifySignupRequest(BaseModel):
    email: EmailStr
    otp: str
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        return _validate_password_strength(v)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        return _validate_password_strength(v)

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: str

    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class ContactCreate(BaseModel):
    name: str
    phone: str = Field(..., pattern=r"^\d{10}$")
    relationship: str = "other"

class ContactResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    phone: str
    relationship: str

    class Config:
        populate_by_name = True

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    medical_conditions: Optional[str] = None

class IncidentLog(BaseModel):
    user_id: str
    lat: float
    lng: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SOSRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
