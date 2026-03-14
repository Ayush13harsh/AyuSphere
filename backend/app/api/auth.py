from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.models.models import UserCreate, UserResponse, Token, VerifySignupRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.db.mongodb import db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from app.services.email_service import send_otp_email
from bson import ObjectId
import secrets
from datetime import datetime, timedelta, timezone
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or access token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Strictly verify the user still exists in the database
    user = await db.db.users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(
             status_code=status.HTTP_401_UNAUTHORIZED,
             detail="User account no longer exists",
             headers={"WWW-Authenticate": "Bearer"},
        )
        
    return payload

@router.post("/signup", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate):
    existing_user = await db.db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.db.users_otp.update_one(
        {"email": user.email, "purpose": "signup"},
        {"$set": {"otp": otp, "expires_at": expires_at}},
        upsert=True
    )
    
    await send_otp_email(user.email, otp, "signup")
    return {"message": "OTP sent to email. Please verify."}

@router.post("/verify-signup", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def verify_signup(request: Request, data: VerifySignupRequest):
    otp_record = await db.db.users_otp.find_one({"email": data.email, "purpose": "signup"})
    if not otp_record or not secrets.compare_digest(str(otp_record["otp"]), str(data.otp)):
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record.get("expires_at", datetime.now(timezone.utc)) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
        
    existing_user = await db.db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(data.password)
    user_dict = {"email": data.email, "hashed_password": hashed_password}
    
    result = await db.db.users.insert_one(user_dict)
    await db.db.users_otp.delete_one({"_id": otp_record["_id"]})
    
    access_token = create_access_token(data={"sub": data.email, "user_id": str(result.inserted_id)})
    refresh_token = create_refresh_token(data={"sub": data.email, "user_id": str(result.inserted_id)})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    user = await db.db.users.find_one({"email": data.email})
    if not user:
        # Prevent email enumeration
        return {"message": "If an account exists, an OTP has been sent."}
        
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.db.users_otp.update_one(
        {"email": data.email, "purpose": "reset_password"},
        {"$set": {"otp": otp, "expires_at": expires_at}},
        upsert=True
    )
    
    await send_otp_email(data.email, otp, "reset_password")
    return {"message": "If an account exists, an OTP has been sent."}

@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPasswordRequest):
    otp_record = await db.db.users_otp.find_one({"email": data.email, "purpose": "reset_password"})
    if not otp_record or not secrets.compare_digest(str(otp_record["otp"]), str(data.otp)):
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record.get("expires_at", datetime.now(timezone.utc)) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
        
    hashed_password = get_password_hash(data.new_password)
    await db.db.users.update_one(
        {"email": data.email},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    await db.db.users_otp.delete_many({"email": data.email, "purpose": "reset_password"})
    return {"message": "Password updated successfully."}

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"], "user_id": str(user["_id"])})
    refresh_token = create_refresh_token(data={"sub": user["email"], "user_id": str(user["_id"])})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
async def refresh_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Refresh token required")
        
    token_str = auth_header.split(" ")[1]
    payload = verify_token(token_str, expected_type="refresh")
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    # Prevent deleted users from minting new tokens
    user = await db.db.users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(status_code=401, detail="User account no longer exists")
        
    access_token = create_access_token(data={"sub": payload["email"], "user_id": payload["user_id"]})
    new_refresh = create_refresh_token(data={"sub": payload["email"], "user_id": payload["user_id"]})
    
    return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.delete("/account", status_code=status.HTTP_200_OK)
async def delete_account(current_user: dict = Depends(get_current_user)):
    user_id_str = current_user["user_id"]
    email = current_user["email"]
    
    # 1. Delete the user's profile
    await db.db.profiles.delete_one({"user_id": user_id_str})
    
    # 2. Delete the user's emergency contacts
    await db.db.contacts.delete_many({"user_id": user_id_str})
    
    # 3. Delete the user's SOS incidents
    await db.db.incidents.delete_many({"user_id": user_id_str})
    
    # 4. Clean up any pending OTPs for the user
    await db.db.users_otp.delete_many({"email": email})
    
    # 5. Delete the actual user record
    result = await db.db.users.delete_one({"_id": ObjectId(user_id_str)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "Account and all associated data successfully deleted."}


