from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.models.models import UserCreate, UserResponse, Token
from app.db.mongodb import db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from bson import ObjectId

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
    return payload

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate):
    existing_user = await db.db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = {"email": user.email, "hashed_password": hashed_password}
    
    result = await db.db.users.insert_one(user_dict)
    return {"_id": str(result.inserted_id), "email": user.email}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
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
        
    access_token = create_access_token(data={"sub": payload["email"], "user_id": payload["user_id"]})
    new_refresh = create_refresh_token(data={"sub": payload["email"], "user_id": payload["user_id"]})
    
    return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
