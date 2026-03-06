from fastapi import APIRouter, Query
from app.services.maps_service import maps_service

router = APIRouter()

@router.get("/hospitals")
async def get_hospitals(lat: float = Query(...), lng: float = Query(...), specialty: str = Query(None)):
    hospitals = await maps_service.get_nearby_hospitals(lat, lng, specialty=specialty)
    return hospitals
