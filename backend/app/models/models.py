from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class VerifySignupRequest(BaseModel):
    email: EmailStr
    otp: str
    password: str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=6)

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
    phone: str
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
    timestamp: datetime = Field(default_factory=datetime.utcnow)
