from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from app.db.mongodb import db
from app.models.models import ProfileUpdate

router = APIRouter()

@router.get("/")
async def get_profile(current_user: dict = Depends(get_current_user)):
    profile = await db.db.profiles.find_one({"user_id": current_user["user_id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create one.")
    profile["_id"] = str(profile["_id"])
    return profile

@router.put("/")
async def update_profile(profile: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    profile_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    profile_data["user_id"] = current_user["user_id"]
    
    result = await db.db.profiles.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": profile_data},
        upsert=True
    )
    
    updated = await db.db.profiles.find_one({"user_id": current_user["user_id"]})
    updated["_id"] = str(updated["_id"])
    return updated
