from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from app.db.mongodb import db
from app.services.sms_service import sms_service
from app.models.models import IncidentLog
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/trigger")
async def trigger_sos(location: dict, current_user: dict = Depends(get_current_user)):
    lat = location.get("lat")
    lng = location.get("lng")
    
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Latitude and Longitude are required")
        
    maps_link = f"https://www.google.com/maps?q={lat},{lng}"
    
    # Log the incident to DB
    log = IncidentLog(user_id=current_user["user_id"], lat=lat, lng=lng)
    await db.db.incidents.insert_one(log.model_dump(by_alias=True, exclude_none=True))
    logger.info(f"Incident Logged for User {current_user['user_id']} at {lat},{lng}")
    
    # Fetch User Profile Name (or default to 'A User')
    profile = await db.db.profiles.find_one({"user_id": current_user["user_id"]})
    user_name = profile.get("name", "A AyuSphere User") if profile else "A AyuSphere User"

    # Fetch User Contacts
    contacts = await db.db.contacts.find({"user_id": current_user["user_id"]}).to_list(length=None)
    sent_count = 0
    current_time = datetime.now().strftime("%I:%M %p, %b %d %Y")
    
    logger.info(f"Preparing to dispatch alerts to {len(contacts)} saved emergency contacts.")
    for contact in contacts:
        success = await sms_service.send_emergency_alert(
            to_phone=contact["phone"], 
            user_name=user_name, 
            maps_link=maps_link,
            timestamp=current_time
        )
        if success:
            sent_count += 1
            logger.info(f"Successfully transmitted SMS to Contact: {contact.get('name', 'Unknown')} ({contact['phone']})")
            
    return {
        "status": "success",
        "message": f"Emergency alerts dispatched to {sent_count} contact(s).",
        "maps_link": maps_link
    }
