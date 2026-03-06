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
    contact_dict = contact.model_dump()
    contact_dict["user_id"] = current_user["user_id"]
    result = await db.db.contacts.insert_one(contact_dict)
    contact_dict["_id"] = str(result.inserted_id)
    return contact_dict

@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.db.contacts.delete_one({"_id": ObjectId(contact_id), "user_id": current_user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"status": "deleted"}
