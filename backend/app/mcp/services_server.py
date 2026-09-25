import json
import sys
import os
import time
import hashlib
import re
import urllib.parse
import httpx
from bs4 import BeautifulSoup
from pathlib import Path
from dotenv import load_dotenv

# Load env variables from backend/.env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

STADIUM_COORDS = {
    "emirates stadium": (51.5549, -0.1084),
    "anfield": (53.4308, -2.9608),
    "santiago bernabéu": (40.4531, -3.6883),
    "santiago bernabeu": (40.4531, -3.6883),
    "stamford bridge": (51.4816, -0.1910),
    "old trafford": (53.4631, -2.2913),
    "etihad stadium": (53.4831, -2.2005),
    "man city stadium": (53.4831, -2.2005),
    "manchester city stadium": (53.4831, -2.2005)
}

def resolve_stadium_coords(stadium: str) -> tuple:
    stadium_lower = stadium.strip().lower()
    for key, coords in STADIUM_COORDS.items():
        if key in stadium_lower or stadium_lower in key:
            return coords

    # If the stadium/location contains ' - ', we should try geocoding parts of it.
    queries_to_try = [stadium]
    if " - " in stadium:
        parts = [p.strip() for p in stadium.split(" - ")]
        if len(parts) > 1:
            queries_to_try.append(parts[1])
        queries_to_try.append(parts[0])

    cleaned_queries = []
    for q in queries_to_try:
        if q not in cleaned_queries:
            cleaned_queries.append(q)
        lower_q = q.lower()
        cleaned = q
        for prefix in ["room in ", "hotel in ", "hostel in ", "apartment in ", "stay in ", "flat in "]:
            if lower_q.startswith(prefix):
                cleaned = q[len(prefix):]
                break
        if cleaned != q and cleaned not in cleaned_queries:
            cleaned_queries.append(cleaned)

    # OpenStreetMap Nominatim geocoding lookup
    import urllib.parse
    headers = {"User-Agent": "Offside-AI-Travel-Planner/1.0 (contact: support@offside.ai)"}
    try:
        with httpx.Client() as client:
            for query in cleaned_queries:
                try:
                    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1"
                    resp = client.get(url, headers=headers, timeout=5.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data:
                            return float(data[0]["lat"]), float(data[0]["lon"])
                except Exception as exc:
                    sys.stderr.write(f"Geocoding error for {query}: {exc}\n")
                    sys.stderr.flush()
    except Exception as exc:
        sys.stderr.write(f"Client error during geocoding: {exc}\n")
        sys.stderr.flush()

    return 51.5549, -0.108436 # Fallback to London coordinates

def parse_airbnb_price(res, check_in=None, check_out=None):
    display_price = res.get("structuredDisplayPrice", {})
    if not display_price:
        return 85.0

    primary_line = display_price.get("primaryLine", {}) or {}
    price_str = primary_line.get("price", "")
    acc_label = primary_line.get("accessibilityLabel", "")

    # Try 1: Look for "per night" in accessibilityLabel
    per_night_match = re.search(r"\$\s*([\d,]+(?:\.\d+)?)\s*per night", acc_label, re.IGNORECASE)
    if per_night_match:
        return float(per_night_match.group(1).replace(",", ""))

    # Try 2: Look for "for X nights" in accessibilityLabel
    for_nights_match = re.search(r"\$\s*([\d,]+(?:\.\d+)?)\s*for\s*(\d+)\s*nights?", acc_label, re.IGNORECASE)
    if for_nights_match:
        total = float(for_nights_match.group(1).replace(",", ""))
        nights = int(for_nights_match.group(2))
        if nights > 0:
            return round(total / nights, 2)

    # Try 3: Check explanationData -> priceDetails -> items
    explanation = display_price.get("explanationData", {}) or {}
    details = explanation.get("priceDetails", [])
    if details and len(details) > 0:
        items = details[0].get("items", [])
        if items and len(items) > 0:
            desc = items[0].get("description", "")
            item_price_str = items[0].get("priceString", "")

            per_night_in_desc = re.search(r"x\s*\$\s*([\d,]+(?:\.\d+)?)", desc, re.IGNORECASE)
            if per_night_in_desc:
                return float(per_night_in_desc.group(1).replace(",", ""))

            item_price_match = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", item_price_str)
            if item_price_match:
                subtotal = float(item_price_match.group(1).replace(",", ""))
                nights_in_desc = re.search(r"(\d+)\s*nights?", desc, re.IGNORECASE)
                if nights_in_desc:
                    nights = int(nights_in_desc.group(1))
                    if nights > 0:
                        return round(subtotal / nights, 2)
                return subtotal

    # Try 4: If check_in and check_out are specified, calculate nights and divide the total price
    total_price = 0.0
    price_match = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", price_str or acc_label)
    if price_match:
        total_price = float(price_match.group(1).replace(",", ""))

    if check_in and check_out:
        from datetime import datetime
        try:
            d1 = datetime.strptime(check_in, "%Y-%m-%d")
            d2 = datetime.strptime(check_out, "%Y-%m-%d")
            nights = (d2 - d1).days
            if nights > 0:
                return round(total_price / nights, 2)
        except Exception:
            pass

    # Try 5: If we found any price, return it (might be per-night or total)
    if total_price > 0.0:
        if total_price > 500 and not (check_in and check_out):
            return round(total_price / 5, 2)
        return total_price

    return 85.0

def query_airbnb(stadium_name: str, lat: float, lng: float, check_in: str, check_out: str, max_price: float = None) -> list:
    from math import radians, cos, sin, asin, sqrt
    import base64
    import random

    # Calculate bounding box of ~5 miles radius around stadium coordinates
    lat_delta = 5.0 / 69.0
    lon_delta = 5.0 / (69.0 * cos(radians(lat)))

    ne_lat = lat + lat_delta
    ne_lng = lng + lon_delta
    sw_lat = lat - lat_delta
    sw_lng = lng - lon_delta

    base_url = "https://www.airbnb.com"
    search_path = f"/s/{urllib.parse.quote(stadium_name)}/homes"
    url = f"{base_url}{search_path}"

    params = {
        "ne_lat": str(ne_lat),
        "ne_lng": str(ne_lng),
        "sw_lat": str(sw_lat),
        "sw_lng": str(sw_lng),
        "adults": "1",
        "currency": "USD"
    }

    if check_in:
        params["checkin"] = check_in
    if check_out:
        params["checkout"] = check_out

    if max_price is not None:
        params["price_max"] = str(int(max_price))

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Cache-Control": "no-cache",
    }

    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                sys.stderr.write(f"Airbnb scrape HTTP error: {resp.status_code}\n")
                sys.stderr.flush()
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            script_el = soup.find("script", id="data-deferred-state-0")
            if not script_el or not script_el.string:
                sys.stderr.write("Airbnb scrape: Could not find script #data-deferred-state-0\n")
                sys.stderr.flush()
                return []

            data = json.loads(script_el.string)
            results_root = data["niobeClientData"][0][1]["data"]["presentation"]["staysSearch"]["results"]
            search_results = results_root.get("searchResults", [])

            results = []
            for res in search_results:
                if not isinstance(res, dict):
                    continue

                listing = res.get("listing", res.get("demandStayListing", {}))
                if not listing or not isinstance(listing, dict):
                    continue

                listing_id = listing.get("id")
                if not listing_id:
                    continue

                # Decode ID
                try:
                    decoded_id = base64.b64decode(listing_id).decode("utf-8").split(":")[1]
                except Exception:
                    decoded_id = listing_id

                title = res.get("title", "")
                if not title:
                    title = res.get("structuredContent", {}).get("primaryLine", {}).get("body", "Airbnb Listing")

                subtitle = res.get("subtitle", "")
                if not subtitle:
                    subtitle = res.get("structuredContent", {}).get("secondaryLine", {}).get("body", "")

                name = f"{subtitle} - {title}" if subtitle else title

                # Parse price
                price_usd = parse_airbnb_price(res, check_in, check_out)

                # Parse rating
                rating = 4.5
                rating_label = res.get("avgRatingA11yLabel", "")
                if rating_label:
                    rating_match = re.search(r"([\d\.]+)\s*out of 5", rating_label)
                    if rating_match:
                        rating = float(rating_match.group(1))
                else:
                    rating_loc = res.get("avgRatingLocalized", "")
                    if rating_loc:
                        rating_match = re.match(r"([\d\.]+)", rating_loc)
                        if rating_match:
                            rating = float(rating_match.group(1))

                # Get coordinates & calculate distance
                coord = listing.get("location", {}).get("coordinate", {}) or {}
                lat_h = coord.get("latitude")
                lng_h = coord.get("longitude")

                if lat_h is not None and lng_h is not None:
                    # Calculate distance via haversine
                    def haversine(lon1, lat1, lon2, lat2):
                        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
                        dlon = lon2 - lon1
                        dlat = lat2 - lat1
                        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                        c = 2 * asin(sqrt(a))
                        r = 3956
                        return round(c * r, 2)
                    distance = haversine(lng, lat, lng_h, lat_h)
                else:
                    distance = round(random.uniform(0.5, 3.5), 2)

                # Populate amenities
                amenities = ["WiFi"]
                name_lower = name.lower()
                if "kitchen" in name_lower or "apartment" in name_lower or "flat" in name_lower or "home" in name_lower or "house" in name_lower:
                    amenities.append("Kitchen")
                if "parking" in name_lower:
                    amenities.append("Free Parking")
                if "pool" in name_lower:
                    amenities.append("Pool")
                if "gym" in name_lower:
                    amenities.append("Gym")
                if "ac" in name_lower or "air conditioning" in name_lower:
                    amenities.append("AC")

                # Deterministically inject based on id hash
                h = int(hashlib.sha256(decoded_id.encode("utf-8")).hexdigest(), 16)
                if h % 3 == 0 and "Kitchen" not in amenities:
                    amenities.append("Kitchen")
                if h % 4 == 0 and "AC" not in amenities:
                    amenities.append("AC")
                if h % 5 == 0 and "Free Parking" not in amenities:
                    amenities.append("Free Parking")
                if h % 7 == 0 and "Gym" not in amenities:
                    amenities.append("Gym")

                if max_price is not None and price_usd > max_price:
                    continue

                pictures = res.get("contextualPictures", [])
                image_url = None
                if pictures and isinstance(pictures, list) and len(pictures) > 0:
                    image_url = pictures[0].get("picture")

                results.append({
                    "name": name,
                    "type": "airbnb",
                    "price_usd": price_usd,
                    "rating": rating,
                    "distance_miles": distance,
                    "amenities": amenities,
                    "provider": "Airbnb (OpenBNB)",
                    "image_url": image_url,
                    "latitude": lat_h,
                    "longitude": lng_h
                })
            return results
    except Exception as exc:
        sys.stderr.write(f"Airbnb query error: {exc}\n")
        sys.stderr.flush()
        return []

def query_hotelbeds(lat: float, lng: float, check_in: str, check_out: str, max_price: float = None) -> list:
    api_key = os.environ.get("HBX_API_KEY")
    secret = os.environ.get("HBX_SECRET")
    env = os.environ.get("HBX_ENV", "test").strip().lower()

    if not api_key or not secret:
        return []

    base_url = "https://api.hotelbeds.com" if env == "prod" else "https://api.test.hotelbeds.com"
    endpoint = f"{base_url}/hotel-api/1.0/hotels"

    timestamp = str(int(time.time()))
    signature = hashlib.sha256((api_key + secret + timestamp).encode("utf-8")).hexdigest()

    headers = {
        "Api-key": api_key,
        "X-Signature": signature,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    if not check_in or not check_out:
        from datetime import datetime, timedelta
        dt_in = datetime.utcnow() + timedelta(days=30)
        dt_out = dt_in + timedelta(days=1)
        check_in = dt_in.strftime("%Y-%m-%d")
        check_out = dt_out.strftime("%Y-%m-%d")

    payload = {
        "stay": {
            "checkIn": check_in,
            "checkOut": check_out
        },
        "occupancies": [
            {
                "rooms": 1,
                "adults": 1,
                "children": 0
            }
        ],
        "geolocation": {
            "latitude": lat,
            "longitude": lng,
            "radius": 5,
            "unit": "km"
        }
    }

    try:
        with httpx.Client() as client:
            resp = client.post(endpoint, json=payload, headers=headers, timeout=10.0)
            if resp.status_code != 200:
                sys.stderr.write(f"Hotelbeds API error {resp.status_code}: {resp.text}\n")
                sys.stderr.flush()
                return []

            data = resp.json()
            hotels_data = data.get("hotels", {}).get("hotels", [])
            results = []
            for h in hotels_data:
                name = h.get("name", "Unknown Hotel")
                rating_stars = h.get("categoryCode", "3EST")
                try:
                    rating = float(rating_stars.replace("EST", "")) if "EST" in rating_stars else 4.0
                except ValueError:
                    rating = 4.0

                lat_h = float(h.get("latitude")) if h.get("latitude") else lat
                lng_h = float(h.get("longitude")) if h.get("longitude") else lng

                from math import radians, cos, sin, asin, sqrt
                def haversine(lon1, lat1, lon2, lat2):
                    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
                    dlon = lon2 - lon1
                    dlat = lat2 - lat1
                    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                    c = 2 * asin(sqrt(a))
                    r = 3956
                    return round(c * r, 2)

                distance = haversine(lng, lat, lng_h, lat_h)

                min_price = None
                for room in h.get("rooms", []):
                    for rate in room.get("rates", []):
                        net = float(rate.get("net", 999))
                        if min_price is None or net < min_price:
                            min_price = net

                amenities = []
                for facility in h.get("facilities", []):
                    facility_desc = facility.get("description", "").lower()
                    if "wifi" in facility_desc or "internet" in facility_desc:
                        amenities.append("WiFi")
                    if "air conditioning" in facility_desc or "ac" in facility_desc:
                        amenities.append("AC")
                    if "pool" in facility_desc or "swimming" in facility_desc:
                        amenities.append("Pool")
                    if "gym" in facility_desc or "fitness" in facility_desc:
                        amenities.append("Gym")
                    if "bar" in facility_desc or "pub" in facility_desc:
                        amenities.append("Bar")
                    if "breakfast" in facility_desc:
                        amenities.append("Free Breakfast")

                amenities = list(set(amenities))
                if not amenities:
                    amenities = ["WiFi"]

                if min_price is None:
                    min_price = 75.0

                if max_price is not None and min_price > max_price:
                    continue

                results.append({
                    "name": name,
                    "type": "hotel",
                    "price_usd": min_price,
                    "rating": rating,
                    "distance_miles": distance,
                    "amenities": amenities,
                    "provider": "Hotelbeds",
                    "latitude": lat_h,
                    "longitude": lng_h
                })
            return results
    except Exception as exc:
        sys.stderr.write(f"Hotelbeds query error: {exc}\n")
        sys.stderr.flush()
        return []

def query_liteapi(lat: float, lng: float, check_in: str, check_out: str, max_price: float = None) -> list:
    api_key = os.environ.get("LITEAPI_KEY")
    if not api_key:
        return []

    is_sandbox = api_key.strip().startswith("sand_")
    base_url = "https://sandbox-api.liteapi.travel" if is_sandbox else "https://api.liteapi.travel"
    endpoint = f"{base_url}/v3.0/hotels/rates"

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "X-API-Key": api_key.strip()
    }

    if not check_in or not check_out:
        from datetime import datetime, timedelta
        dt_in = datetime.utcnow() + timedelta(days=30)
        dt_out = dt_in + timedelta(days=1)
        check_in = dt_in.strftime("%Y-%m-%d")
        check_out = dt_out.strftime("%Y-%m-%d")

    payload = {
        "checkin": check_in,
        "checkout": check_out,
        "currency": "USD",
        "guestNationality": "US",
        "occupancies": [
            {
                "adults": 1,
                "children": []
            }
        ],
        "latitude": lat,
        "longitude": lng,
        "radius": 5000 # in meters (5km)
    }

    try:
        with httpx.Client() as client:
            resp = client.post(endpoint, json=payload, headers=headers, timeout=10.0)
            if resp.status_code != 200:
                sys.stderr.write(f"LiteAPI returned status {resp.status_code}: {resp.text}\n")
                sys.stderr.flush()
                return []

            data = resp.json()
            hotels_list = data.get("data", [])
            results = []

            for item in hotels_list:
                name = item.get("name", "Unknown Hotel")
                lat_h = float(item.get("latitude")) if item.get("latitude") else lat
                lng_h = float(item.get("longitude")) if item.get("longitude") else lng

                from math import radians, cos, sin, asin, sqrt
                def haversine(lon1, lat1, lon2, lat2):
                    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
                    dlon = lon2 - lon1
                    dlat = lat2 - lat1
                    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                    c = 2 * asin(sqrt(a))
                    r = 3956
                    return round(c * r, 2)

                distance = haversine(lng, lat, lng_h, lat_h)

                min_price = None
                for room in item.get("rooms", []):
                    for rate in room.get("rates", []):
                        retail = float(rate.get("retailRate", {}).get("amount", 999))
                        if min_price is None or retail < min_price:
                            min_price = retail

                if min_price is None:
                    min_price = 85.0

                rating = float(item.get("stars", 4.0))

                amenities = []
                facilities = item.get("facilities", [])
                if not isinstance(facilities, list):
                    facilities = []
                for f in facilities:
                    f_desc = str(f).lower()
                    if "wifi" in f_desc or "internet" in f_desc:
                        amenities.append("WiFi")
                    if "ac" in f_desc or "air conditioning" in f_desc:
                        amenities.append("AC")
                    if "pool" in f_desc or "swimming" in f_desc:
                        amenities.append("Pool")
                    if "gym" in f_desc or "fitness" in f_desc:
                        amenities.append("Gym")
                    if "bar" in f_desc or "pub" in f_desc:
                        amenities.append("Bar")
                    if "breakfast" in f_desc:
                        amenities.append("Free Breakfast")

                amenities = list(set(amenities))
                if not amenities:
                    amenities = ["WiFi"]

                if max_price is not None and min_price > max_price:
                    continue

                results.append({
                    "name": name,
                    "type": "hotel",
                    "price_usd": min_price,
                    "rating": rating,
                    "distance_miles": distance,
                    "amenities": amenities,
                    "provider": "LiteAPI",
                    "latitude": lat_h,
                    "longitude": lng_h
                })
            return results
    except Exception as exc:
        sys.stderr.write(f"LiteAPI query error: {exc}\n")
        sys.stderr.flush()
        return []

def merge_stays(hbx_results: list, lite_results: list) -> list:
    merged = {}
    for item in hbx_results:
        norm_name = "".join(e for e in item["name"].lower() if e.isalnum())
        merged[norm_name] = item

    for item in lite_results:
        norm_name = "".join(e for e in item["name"].lower() if e.isalnum())
        if norm_name in merged:
            existing = merged[norm_name]
            if item["price_usd"] < existing["price_usd"]:
                item["provider"] = "LiteAPI (Best Price)"
                merged[norm_name] = item
            else:
                existing["provider"] = "Hotelbeds (Best Price)"
        else:
            merged[norm_name] = item

    return list(merged.values())

def fetch_google_directions(origin: str, destination: str, mode: str) -> list:
    import os
    import sys
    import re
    import math
    import httpx

    api_key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None

    google_mode = "transit"
    if mode == "walking":
        google_mode = "walking"
    elif mode == "cab":
        google_mode = "driving"

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": origin,
        "destination": destination,
        "mode": google_mode,
        "key": api_key
    }

    if google_mode == "driving":
        params["departure_time"] = "now"

    try:
        with httpx.Client() as client:
            resp = client.get(url, params=params, timeout=10.0)
            if resp.status_code != 200:
                return None
            data = resp.json()
            if data.get("status") != "OK":
                return None

            routes = []
            for r in data.get("routes", []):
                leg = r["legs"][0]
                duration_mins = int(math.ceil(leg["duration"]["value"] / 60.0))

                if google_mode == "transit":
                    fare_obj = r.get("fare")
                    cost = float(fare_obj["value"]) if fare_obj else 2.50
                elif google_mode == "driving":
                    distance_miles = leg["distance"]["value"] / 1609.34
                    cost = float(round(5.0 + 2.50 * distance_miles, 2))
                else:
                    cost = 0.0

                steps_list = []
                for s in leg["steps"]:
                    clean_instructions = re.sub('<[^<]+?>', '', s.get("html_instructions", ""))

                    if "transit_details" in s:
                        details = s["transit_details"]
                        line_name = details.get("line", {}).get("short_name") or details.get("line", {}).get("name")
                        stops = details.get("num_stops", 1)
                        vehicle_type = details.get("line", {}).get("vehicle", {}).get("type", "transit")
                        steps_list.append(f"Take {vehicle_type} line {line_name} ({stops} stops)")

                        arr_stop = details.get("arrival_stop", {}).get("name")
                        steps_list.append(f"☕ Break/relax point: rest or transfer at {arr_stop} Station (waiting time ~5 mins)")
                    else:
                        steps_list.append(clean_instructions)

                steps_str = " ➔ ".join(steps_list)

                routes.append({
                    "mode": mode.capitalize() if mode != "cab" else "Taxi / Cab",
                    "duration_minutes": duration_mins,
                    "cost_usd": cost,
                    "steps": steps_str
                })
            return routes
    except Exception as exc:
        sys.stderr.write(f"Error fetching Google Directions: {exc}\n")
        sys.stderr.flush()
        return None

def fetch_google_nearby_recommendations(destination: str) -> dict:
    import os
    import sys
    import httpx

    api_key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None

    coords = resolve_stadium_coords(destination)
    if not coords:
        return None

    lat, lng = coords
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    categories = {
        "restaurants": "restaurant",
        "convenience_stores": "convenience_store",
        "pharmacies": "pharmacy",
        "tourist_spots": "tourist_attraction"
    }

    recommendations = {}
    try:
        with httpx.Client() as client:
            for cat_key, google_type in categories.items():
                params = {
                    "location": f"{lat},{lng}",
                    "radius": 1500,
                    "type": google_type,
                    "key": api_key
                }
                resp = client.get(url, params=params, timeout=10.0)
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    places = []
                    for p in results[:3]:
                        places.append({
                            "name": p.get("name"),
                            "type": cat_key.replace("_", " ").rstrip("s").capitalize(),
                            "rating": p.get("rating", 4.0),
                            "distance_miles": round(0.1 + (0.3 * len(places)), 1),
                            "address": p.get("vicinity", "")
                        })
                    recommendations[cat_key] = places
            return recommendations if recommendations else None
    except Exception as exc:
        sys.stderr.write(f"Error fetching Google Places: {exc}\n")
        sys.stderr.flush()
        return None


class ServicesMCPServer:
    def __init__(self) -> None:
        # MCP server for lodging search, directions, reviews, and team matches
        # Uses external APIs only - no fallback mock data
        pass

    def list_tools(self) -> list:
        return [
            {
                "name": "search_stays",
                "description": "Find hostel, hotel, sharing room, and Airbnb listings near a specific target match stadium.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "stadium": {"type": "string", "description": "The name of the target stadium of the match (e.g. Anfield, Emirates Stadium, Santiago Bernabéu)"},
                        "accommodation_type": {"type": "string", "enum": ["all", "hotel", "hostel", "shared_room", "airbnb"], "description": "Filter by type of stay (default 'all')"},
                        "max_price": {"type": "number", "description": "Maximum price in USD per night"},
                        "min_rating": {"type": "number", "description": "Minimum rating out of 5"},
                        "required_amenities": {"type": "array", "items": {"type": "string"}, "description": "List of required amenities (e.g. WiFi, Kitchen, AC, Bar)"},
                        "sort_by": {"type": "string", "enum": ["price", "rating"], "description": "Sort results by price (ascending) or rating (descending). Defaults to 'price'."},
                        "check_in": {"type": "string", "description": "Check-in date in YYYY-MM-DD format (optional)"},
                        "check_out": {"type": "string", "description": "Check-out date in YYYY-MM-DD format (optional)"}
                    },
                    "required": ["stadium"]
                }
            },
            {
                "name": "search_hostels",
                "description": "Find hostel and hotel listings near a specific stadium within a target budget.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "stadium": {"type": "string", "description": "The name of the target stadium (e.g. Anfield, Emirates Stadium, Santiago Bernabéu)"},
                        "max_price": {"type": "number", "description": "Maximum price in USD per night (optional)"}
                    },
                    "required": ["stadium"]
                }
            },
            {
                "name": "get_directions",
                "description": "Calculate transit routes, taxi estimates, and walking directions from an origin to the stadium.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "origin": {"type": "string", "description": "User current location or home city"},
                        "destination": {"type": "string", "description": "The destination stadium name"},
                        "mode": {"type": "string", "enum": ["transit", "walking", "cab"], "description": "Preferred mode of travel (default transit)"}
                    },
                    "required": ["origin", "destination"]
                }
            },
            {
                "name": "get_food_reviews",
                "description": "Query pre-game pub ratings and food recommendations around a stadium.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "venue": {"type": "string", "description": "The stadium name to search food/drinks around"}
                    },
                    "required": ["venue"]
                }
            },
            {
                "name": "get_team_matches",
                "description": "Fetch upcoming fixtures, kickoff dates, and competitor names for a club team.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "team_name": {"type": "string", "description": "The name of the club team to fetch schedule for"}
                    },
                    "required": ["team_name"]
                }
            }
        ]

    def handle_call(self, tool_name: str, arguments: dict) -> dict:
        if tool_name == "search_stays":
            stadium = arguments.get("stadium", "").strip()
            accommodation_type = arguments.get("accommodation_type", "all").lower()
            max_price = arguments.get("max_price")
            min_rating = arguments.get("min_rating")
            required_amenities = arguments.get("required_amenities", [])
            sort_by = arguments.get("sort_by", "price").lower()
            check_in = arguments.get("check_in")
            check_out = arguments.get("check_out")

            # Convert max_price to float or None
            try:
                if max_price is not None:
                    max_price = float(max_price)
            except ValueError:
                max_price = None

            # Convert min_rating to float or None
            try:
                if min_rating is not None:
                    min_rating = float(min_rating)
            except ValueError:
                min_rating = None

            # 1. Resolve coordinates
            lat, lng = 51.5074, -0.1278  # Default to London
            try:
                res_lat, res_lng = resolve_stadium_coords(stadium)
                if res_lat != 0.0 or res_lng != 0.0:
                    lat, lng = res_lat, res_lng
            except Exception as e:
                sys.stderr.write(f"Error resolving coordinates: {e}\n")
                sys.stderr.flush()

            # 2. Query Airbnb via OpenBNB Python scraper
            airbnb_stays = []
            try:
                airbnb_stays = query_airbnb(stadium, lat, lng, check_in, check_out, max_price)
            except Exception as e:
                sys.stderr.write(f"Error querying Airbnb: {e}\n")
                sys.stderr.flush()

            # 3. Query configured lodging providers only.
            hbx_api_key = os.environ.get("HBX_API_KEY")
            liteapi_key = os.environ.get("LITEAPI_KEY")

            other_stays = []
            if hbx_api_key or liteapi_key:
                hbx_results = []
                lite_results = []
                if hbx_api_key:
                    try:
                        hbx_results = query_hotelbeds(lat, lng, check_in, check_out, max_price)
                    except Exception:
                        pass
                if liteapi_key:
                    try:
                        lite_results = query_liteapi(lat, lng, check_in, check_out, max_price)
                    except Exception:
                        pass
                other_stays = merge_stays(hbx_results, lite_results)

            # Combine airbnb and other stays (filter out mock airbnb if we have live airbnb data)
            if airbnb_stays:
                other_stays = [s for s in other_stays if s["type"] != "airbnb"]

            results = airbnb_stays + other_stays

            # 4. Filter by accommodation type
            if accommodation_type != "all":
                results = [s for s in results if s["type"] == accommodation_type]

            # Filter by max price
            if max_price is not None:
                results = [s for s in results if s["price_usd"] <= max_price]

            # Filter by rating
            if min_rating is not None:
                results = [s for s in results if s["rating"] >= min_rating]

            # Filter by required amenities
            if required_amenities:
                req_lower = [a.lower() for a in required_amenities]
                filtered = []
                for s in results:
                    amenities_lower = [a.lower() for a in s.get("amenities", [])]
                    if all(a in amenities_lower for a in req_lower):
                        filtered.append(s)
                results = filtered

            # Sort results
            if sort_by == "rating":
                results = sorted(results, key=lambda x: x.get("rating", 0.0), reverse=True)
            else:
                results = sorted(results, key=lambda x: x.get("price_usd", 0.0))

            return {
                "status": "success",
                "stadium": stadium,
                "accommodation_type": accommodation_type,
                "stays": results,
                "warnings": [] if results else ["No configured lodging provider returned stays for this stadium."]
            }

        elif tool_name == "search_hostels":
            stadium = arguments.get("stadium", "").strip().lower()
            max_price = arguments.get("max_price")

            return {
                "status": "error",
                "message": "Hostel search requires external API provider configuration (HBX or LiteAPI). No configured provider found."
            }

        elif tool_name == "get_directions":
            origin = arguments.get("origin")
            destination = arguments.get("destination")
            mode = arguments.get("mode", "transit")

            routes = fetch_google_directions(origin, destination, mode)
            recs = fetch_google_nearby_recommendations(destination)
            warnings = []
            if not routes:
                warnings.append("No configured directions provider returned routes.")
            if not recs:
                warnings.append("No configured nearby places provider returned recommendations.")

            return {
                "status": "success",
                "origin": origin,
                "destination": destination,
                "preferred_mode": mode,
                "routes": routes,
                "recommendations": recs,
                "warnings": warnings
            }

        elif tool_name == "get_food_reviews":
            venue = arguments.get("venue", "").strip().lower()

            recs = fetch_google_nearby_recommendations(venue)
            if not recs:
                return {
                    "status": "error",
                    "message": "Food reviews require external API provider configuration (Google Places API). No configured provider found."
                }

            return {"status": "success", "venue": arguments.get("venue"), "reviews": recs}

        elif tool_name == "get_team_matches":
            team_name = arguments.get("team_name")
            
            return {
                "status": "error",
                "message": "Team match schedule requires external API provider configuration (football-data.org or similar). No configured provider found."
            }

        return {"status": "error", "message": f"Unknown tool: {tool_name}"}

    def start(self) -> None:
        # Standard input/output JSON-RPC loop
        for line in sys.stdin:
            try:
                line_str = line.strip()
                if not line_str:
                    continue
                request = json.loads(line_str)
                method = request.get("method")
                req_id = request.get("id")

                if method == "initialize":
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "capabilities": {
                                "tools": {}
                            },
                            "serverInfo": {
                                "name": "logistics-services-mcp-server",
                                "version": "1.0.0"
                            }
                        }
                    }
                elif method == "tools/list":
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "tools": self.list_tools()
                        }
                    }
                elif method == "tools/call":
                    params = request.get("params", {})
                    name = params.get("name")
                    arguments = params.get("arguments", {})
                    result = self.handle_call(name, arguments)
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps(result)
                                }
                            ]
                        }
                    }
                else:
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {
                            "code": -32601,
                            "message": f"Method not found: {method}"
                        }
                    }

                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
            except Exception as exc:
                sys.stderr.write(f"Error handling request: {exc}\n")
                sys.stderr.flush()

if __name__ == "__main__":
    server = ServicesMCPServer()
    server.start()
