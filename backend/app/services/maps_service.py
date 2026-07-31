import httpx
from app.core.config import settings
import logging
import math
import asyncio

logger = logging.getLogger(__name__)

# In-memory geocode cache: { "lat,lng" -> "formatted address" }
_geocode_cache: dict[str, str] = {}

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
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

    # ── Main Entry Point ─────────────────────────────────────────
    async def get_nearby_hospitals(self, lat: float, lng: float, radius: int = 15000, specialty: str = None) -> list:
        if self.api_key and "ADD_" not in self.api_key:
            try:
                return await self._get_google_hospitals(lat, lng, radius, specialty)
            except Exception as e:
                logger.error(f"Google Places API failed, falling back to OSM: {e}")

        return await self._get_osm_hospitals_multi_tier(lat, lng, specialty)

    # ── Google Places Provider ───────────────────────────────────
    async def _get_google_hospitals(self, lat: float, lng: float, radius: int, specialty: str = None) -> list:
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{lat},{lng}",
            "radius": radius,
            "type": "hospital",
            "key": self.api_key,
        }
        if specialty:
            params["keyword"] = specialty

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            hospitals = []
            for result in data.get("results", [])[:15]:
                h_lat = result["geometry"]["location"]["lat"]
                h_lng = result["geometry"]["location"]["lng"]
                dist = haversine(lat, lng, h_lat, h_lng)
                hospitals.append({
                    "name": result.get("name"),
                    "address": result.get("vicinity") or "Address on Map",
                    "phone": result.get("formatted_phone_number", "Emergency 108 / 112"),
                    "rating": f"{result.get('rating', 4.5)} ⭐",
                    "distance": f"{dist} km",
                    "lat": h_lat,
                    "lng": h_lng,
                    "place_id": result.get("place_id"),
                })

            hospitals.sort(key=lambda x: float(x["distance"].split()[0]))
            return hospitals

    # ── Multi-Tier Spatial OpenStreetMap Healthcare Provider ─────
    async def _get_osm_hospitals_multi_tier(self, lat: float, lng: float, specialty: str = None) -> list:
        """
        Fast & Resilient Multi-Tier Provider:
        Tier 1: Nominatim Direct Spatial Bounding Box Search (sub-300ms)
        Tier 2: Overpass Multi-Mirror Query Across Multiple Public Endpoints
        Tier 3: Expanded Bounding Box Search (35km / 50km)
        """
        async with httpx.AsyncClient(timeout=8.0) as client:
            headers = {"User-Agent": "AyuSphere/1.0"}

            # --- TIER 1: Nominatim Direct Spatial Bounding Box Search ---
            hospitals = await self._query_nominatim_spatial(client, lat, lng, delta=0.25, specialty=specialty, headers=headers)
            if len(hospitals) >= 3:
                logger.info(f"Nominatim Spatial Search returned {len(hospitals)} facilities for lat={lat}, lng={lng}")
                return hospitals[:15]

            # --- TIER 2: Overpass API Multi-Mirror Fallback ---
            logger.info("Fewer than 3 facilities found via Nominatim. Attempting Overpass multi-mirror search...")
            overpass_results = await self._query_overpass_mirrors(client, lat, lng, radius=20000, specialty=specialty)
            if overpass_results:
                # Merge unique facilities
                existing_names = {h["name"].lower() for h in hospitals}
                for h in overpass_results:
                    if h["name"].lower() not in existing_names:
                        hospitals.append(h)
                        existing_names.add(h["name"].lower())

            if len(hospitals) >= 3:
                hospitals.sort(key=lambda x: float(x["distance"].split()[0]))
                return hospitals[:15]

            # --- TIER 3: Expanded Bounding Box Search (35km / 50km) ---
            logger.info("Expanding spatial bounding box search to 40km...")
            expanded_results = await self._query_nominatim_spatial(client, lat, lng, delta=0.45, specialty=None, headers=headers)
            existing_names = {h["name"].lower() for h in hospitals}
            for h in expanded_results:
                if h["name"].lower() not in existing_names:
                    hospitals.append(h)
                    existing_names.add(h["name"].lower())

            hospitals.sort(key=lambda x: float(x["distance"].split()[0]))
            return hospitals[:15]

    async def _query_nominatim_spatial(self, client: httpx.AsyncClient, lat: float, lng: float, delta: float, specialty: str = None, headers: dict = None) -> list:
        hospitals = []
        seen_names = set()
        
        # Determine query term
        query_term = f"{specialty} hospital" if specialty else "hospital"
        viewbox = f"{lng - delta},{lat + delta},{lng + delta},{lat - delta}"

        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": query_term,
                "format": "json",
                "limit": 30,
                "bounded": 1,
                "viewbox": viewbox,
            }
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                for item in resp.json():
                    raw_name = item.get("display_name", "").split(",")[0].strip()
                    if not raw_name:
                        continue

                    h_lat = float(item["lat"])
                    h_lng = float(item["lon"])
                    dist = haversine(lat, lng, h_lat, h_lng)
                    key = raw_name.lower()

                    if key not in seen_names:
                        seen_names.add(key)
                        hospitals.append({
                            "name": raw_name,
                            "address": item.get("display_name", "Address on Map"),
                            "phone": "Emergency 108 / 112",
                            "rating": "4.5 ⭐",
                            "distance": f"{dist} km",
                            "lat": h_lat,
                            "lng": h_lng,
                        })
        except Exception as e:
            logger.warning(f"Nominatim spatial query failed: {e}")

        # Also search for 'clinic' if hospital search yields few results
        if len(hospitals) < 5 and not specialty:
            try:
                params["q"] = "clinic"
                resp = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
                if resp.status_code == 200:
                    for item in resp.json():
                        raw_name = item.get("display_name", "").split(",")[0].strip()
                        if not raw_name:
                            continue
                        h_lat = float(item["lat"])
                        h_lng = float(item["lon"])
                        dist = haversine(lat, lng, h_lat, h_lng)
                        key = raw_name.lower()

                        if key not in seen_names:
                            seen_names.add(key)
                            hospitals.append({
                                "name": raw_name,
                                "address": item.get("display_name", "Address on Map"),
                                "phone": "Emergency 108 / 112",
                                "rating": "4.3 ⭐",
                                "distance": f"{dist} km",
                                "lat": h_lat,
                                "lng": h_lng,
                            })
            except Exception as e:
                logger.warning(f"Nominatim secondary clinic query failed: {e}")

        hospitals.sort(key=lambda x: float(x["distance"].split()[0]))
        return hospitals

    async def _query_overpass_mirrors(self, client: httpx.AsyncClient, lat: float, lng: float, radius: int, specialty: str = None) -> list:
        mirrors = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.nchc.org.tw/api/interpreter"
        ]
        
        overpass_query = f"""
        [out:json][timeout:15];
        (
          node["amenity"="hospital"](around:{radius},{lat},{lng});
          way["amenity"="hospital"](around:{radius},{lat},{lng});
          node["healthcare"="hospital"](around:{radius},{lat},{lng});
          way["healthcare"="hospital"](around:{radius},{lat},{lng});
          node["amenity"="clinic"](around:{radius},{lat},{lng});
          way["amenity"="clinic"](around:{radius},{lat},{lng});
          node["building"="hospital"](around:{radius},{lat},{lng});
          way["building"="hospital"](around:{radius},{lat},{lng});
        );
        out center;
        """

        for mirror_url in mirrors:
            try:
                resp = await client.post(mirror_url, data={"data": overpass_query}, timeout=6.0)
                if resp.status_code == 200:
                    data = resp.json()
                    hospitals = []
                    for element in data.get("elements", []):
                        tags = element.get("tags", {})
                        name = (
                            tags.get("name") or 
                            tags.get("name:en") or 
                            tags.get("official_name") or 
                            tags.get("operator") or 
                            tags.get("brand") or 
                            tags.get("description")
                        )
                        if not name:
                            amenity_type = tags.get("amenity") or tags.get("healthcare") or "Medical Center"
                            name = f"{amenity_type.replace('_', ' ').title()} Facility"

                        elem_lat = element.get("lat") or element.get("center", {}).get("lat")
                        elem_lng = element.get("lon") or element.get("center", {}).get("lon")
                        if not elem_lat or not elem_lng:
                            continue

                        tag_parts = [tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:city")]
                        address = ", ".join(filter(None, tag_parts)) or "Address on Map"
                        phone = tags.get("phone", tags.get("contact:phone", "Emergency 108 / 112"))
                        dist = haversine(lat, lng, elem_lat, elem_lng)

                        hospitals.append({
                            "name": name,
                            "address": address,
                            "phone": phone,
                            "rating": "4.4 ⭐",
                            "distance": f"{dist} km",
                            "lat": elem_lat,
                            "lng": elem_lng,
                        })

                    hospitals.sort(key=lambda x: float(x["distance"].split()[0]))
                    return hospitals
            except Exception as e:
                logger.warning(f"Overpass mirror {mirror_url} failed: {e}")
                continue

        return []


maps_service = MapsService()
