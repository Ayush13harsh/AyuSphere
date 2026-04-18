import httpx
from app.core.config import settings
import logging
import math
import asyncio

logger = logging.getLogger(__name__)

# In-memory geocode cache: { "lat,lng" -> "formatted address" }
_geocode_cache: dict[str, str] = {}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


class MapsService:
    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY

    # ── Nominatim Reverse Geocoding ──────────────────────────────
    async def _reverse_geocode(self, lat: float, lng: float, client: httpx.AsyncClient) -> str:
        """Resolve lat/lng to a readable address via Nominatim, with caching."""
        cache_key = f"{round(lat, 5)},{round(lng, 5)}"
        if cache_key in _geocode_cache:
            return _geocode_cache[cache_key]

        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "addressdetails": 1, "zoom": 16},
                headers={"User-Agent": "AyuSphere/1.0"},
                timeout=5.0,
            )
            resp.raise_for_status()
            data = resp.json()
            addr = data.get("address", {})

            parts = [
                addr.get("road"),
                addr.get("neighbourhood") or addr.get("suburb"),
                addr.get("city") or addr.get("town") or addr.get("village"),
                addr.get("state"),
                addr.get("postcode"),
            ]
            formatted = ", ".join(filter(None, parts))
            if not formatted:
                formatted = data.get("display_name", "Address unavailable")

            _geocode_cache[cache_key] = formatted
            return formatted
        except Exception as e:
            logger.debug(f"Reverse geocode failed for {cache_key}: {e}")
            return "Address unavailable"

    # ── Main entry point ─────────────────────────────────────────
    async def get_nearby_hospitals(self, lat: float, lng: float, radius: int = 15000, specialty: str = None) -> list:
        if not self.api_key or "ADD_" in self.api_key:
            logger.warning("Google Maps API key not found. Using OpenStreetMap Overpass API fallback.")
            return await self._get_osm_hospitals_with_retry(lat, lng, specialty)

        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

        params = {
            "location": f"{lat},{lng}",
            "radius": radius,
            "type": "hospital",
            "key": self.api_key,
        }
        
        if specialty:
            params["keyword"] = specialty

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                hospitals = []
                for result in data.get("results", [])[:3]:
                    hospitals.append({
                        "name": result.get("name"),
                        "address": result.get("vicinity"),
                        "phone": "+91804000000",
                        "rating": result.get("rating", "N/A"),
                        "distance": "2.5 km",
                        "lat": result["geometry"]["location"]["lat"],
                        "lng": result["geometry"]["location"]["lng"],
                        "place_id": result.get("place_id"),
                    })

                for h in hospitals:
                    h["distance"] = f"{haversine(lat, lng, h['lat'], h['lng'])} km"

                hospitals.sort(key=lambda x: float(x["distance"].split()[0]))
                return hospitals
            except Exception as e:
                logger.error(f"Failed to fetch hospitals from Google: {e}")
                return await self._get_osm_hospitals(lat, lng, radius, specialty)

    # ── OpenStreetMap fallback ───────────────────────────────────
    async def _get_osm_hospitals(self, lat: float, lng: float, radius: int, specialty: str = None) -> list:
        overpass_url = "https://overpass-api.de/api/interpreter"
        overpass_query = f"""
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:{radius},{lat},{lng});
          way["amenity"="hospital"](around:{radius},{lat},{lng});
          relation["amenity"="hospital"](around:{radius},{lat},{lng});
          node["amenity"="clinic"](around:{radius},{lat},{lng});
          way["amenity"="clinic"](around:{radius},{lat},{lng});
          node["amenity"="doctors"](around:{radius},{lat},{lng});
          way["amenity"="doctors"](around:{radius},{lat},{lng});
          node["healthcare"="hospital"](around:{radius},{lat},{lng});
          way["healthcare"="hospital"](around:{radius},{lat},{lng});
        );
        """
        
        # If specialty is supplied, add an explicit search for that specialty
        if specialty:
            specialty_query = specialty.lower().strip()
            # Try to match the exact string or a contains string
            overpass_query = f"""
            [out:json][timeout:25];
            (
              node["amenity"="doctors"]["healthcare:speciality"~"{specialty_query}",i](around:{radius},{lat},{lng});
              way["amenity"="doctors"]["healthcare:speciality"~"{specialty_query}",i](around:{radius},{lat},{lng});
              node["amenity"="clinic"]["healthcare:speciality"~"{specialty_query}",i](around:{radius},{lat},{lng});
              way["amenity"="clinic"]["healthcare:speciality"~"{specialty_query}",i](around:{radius},{lat},{lng});
              node["healthcare"="hospital"](around:{radius},{lat},{lng});
              way["healthcare"="hospital"](around:{radius},{lat},{lng});
              node["amenity"="hospital"](around:{radius},{lat},{lng});
            );
            """

        overpass_query += "\n        out center;\n        "
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"Querying Overpass API: lat={lat}, lng={lng}, radius={radius}m")
                response = await client.post(overpass_url, data={"data": overpass_query})
                response.raise_for_status()
                data = response.json()

                hospitals = []
                for element in data.get("elements", []):
                    tags = element.get("tags", {})
                    name = tags.get("name")
                    if not name:
                        continue

                    elem_lat = element.get("lat") or element.get("center", {}).get("lat")
                    elem_lng = element.get("lon") or element.get("center", {}).get("lon")

                    tag_parts = [tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:city")]
                    address = ", ".join(filter(None, tag_parts))
                    phone = tags.get("phone", tags.get("contact:phone", "N/A"))
                    dist = haversine(lat, lng, elem_lat, elem_lng)

                    hospitals.append({
                        "name": name,
                        "address": address,
                        "phone": phone,
                        "rating": "N/A (OSM)",
                        "distance": f"{dist} km",
                        "lat": elem_lat,
                        "lng": elem_lng,
                    })

                hospitals.sort(key=lambda x: float(x["distance"].split()[0]))
                hospitals = hospitals[:3]

                # ── Reverse-geocode any hospital missing an address ───
                needs_geocode = [h for h in hospitals if not h["address"]]
                if needs_geocode:
                    logger.info(f"Reverse-geocoding addresses for {len(needs_geocode)} hospital(s)…")
                    for i, h in enumerate(needs_geocode):
                        h["address"] = await self._reverse_geocode(h["lat"], h["lng"], client)
                        if i < len(needs_geocode) - 1:
                            await asyncio.sleep(1.1)

                return hospitals
            except Exception as e:
                logger.error(f"Failed to fetch from OSM (radius={radius}m): {type(e).__name__}: {e}")
                return []

    async def _get_osm_hospitals_with_retry(self, lat: float, lng: float, specialty: str = None) -> list:
        """Try with default 15km radius. If specialty searching yields nothing, fallback to general hospitals in 15km."""
        result = await self._get_osm_hospitals(lat, lng, 15000, specialty)
        
        # Fallback 1: Didn't find specialist in 15km, look for general hospitals in 15km
        if not result and specialty:
            logger.info(f"No {specialty} found within 15km. Falling back to general hospitals.")
            result = await self._get_osm_hospitals(lat, lng, 15000, None)
            
        # Fallback 2: Still didn't find anything, stretch to 25km
        if not result:
            logger.info("No hospitals within 15km, expanding search to 25km…")
            result = await self._get_osm_hospitals(lat, lng, 25000, None)
            
        return result


maps_service = MapsService()
