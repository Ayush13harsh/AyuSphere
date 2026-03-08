from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from app.db.mongodb import db
from app.models.models import ContactCreate
from bson import ObjectId

router = APIRouter()

@router.get("/")
async def get_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.db.contacts.find({"user_id": current_user["user_id"]}).to_list(length=50)
    for c in contacts:
        c["_id"] = str(c["_id"])
    return contacts

@router.post("/")
async def add_contact(contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    # Check if phone number already exists for this user
    existing = await db.db.contacts.find_one({"user_id": user_id, "phone": contact.phone})
    if existing:
        raise HTTPException(status_code=400, detail="A contact with this phone number already exists.")
        
    contact_dict = contact.model_dump()
    contact_dict["user_id"] = user_id
    result = await db.db.contacts.insert_one(contact_dict)
    contact_dict["_id"] = str(result.inserted_id)
    return contact_dict

@router.put("/{contact_id}")
async def update_contact(contact_id: str, contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    # Check if another contact (different ID) has this phone number
    existing = await db.db.contacts.find_one({
        "user_id": user_id, 
        "phone": contact.phone,
        "_id": {"$ne": ObjectId(contact_id)}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Another contact with this phone number already exists.")
        
    result = await db.db.contacts.update_one(
        {"_id": ObjectId(contact_id), "user_id": user_id},
        {"$set": contact.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    updated_contact = contact.model_dump()
    updated_contact["_id"] = contact_id
    updated_contact["user_id"] = user_id
    return updated_contact

@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.db.contacts.delete_one({"_id": ObjectId(contact_id), "user_id": current_user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"status": "deleted"}
