from fastapi import APIRouter, Query, Depends, Request
from app.services.maps_service import maps_service
from app.api.auth import get_current_user
from app.core.limiter import limiter

router = APIRouter()

@router.get("/hospitals")
@limiter.limit("10/minute")
async def get_hospitals(
    request: Request,
    lat: float = Query(...),
    lng: float = Query(...),
    specialty: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    hospitals = await maps_service.get_nearby_hospitals(lat, lng, specialty=specialty)
    return hospitals

