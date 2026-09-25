"""
Team Matches Helper
-------------------
Fetches upcoming / recent matches for a specific football-data.org team
via GET /v4/teams/{teamId}/matches and normalises the response.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import httpx

from app.db.vector_search import vector_search_manager

logger = logging.getLogger("offside_ai.team_matches_helper")

LEAGUE_LABELS = {
    "PL": "Premier League", "PD": "LaLiga", "SA": "Serie A",
    "BL1": "Bundesliga", "FL1": "Ligue 1", "CL": "Champions League",
    "WC": "FIFA World Cup", "ELC": "Championship", "DED": "Eredivisie",
    "PPL": "Primeira Liga", "CLI": "Copa Libertadores", "MLS": "Major League Soccer",
}

# football-data.org team IDs — used to call /v4/teams/{id}/matches
TEAM_ID_MAP: Dict[str, int] = {
    "Osasuna": 79,
    "CA Osasuna": 79,
    "Genoa": 107,
    "Genoa CFC": 107,
    "Schalke": 15,
    "FC Schalke 04": 15,
    "TSG 1899 Hoffenheim": 720,
    "Hoffenheim": 720,
    "Milan": 98,
    "Atleti": 78,
    "Athletic": 77,

    # Premier League
    "Arsenal": 57,
    "Chelsea": 61,
    "Liverpool": 64,
    "Manchester City": 65,
    "Manchester United": 66,
    "Tottenham Hotspur": 73,
    "Aston Villa": 58,
    "Newcastle United": 67,
    "West Ham United": 563,
    "Brighton & Hove Albion": 397,
    "Brighton": 397,
    "Brentford": 402,
    "Fulham": 63,
    "Wolverhampton Wanderers": 76,
    "Crystal Palace": 354,
    "Nottingham Forest": 351,
    "Bournemouth": 1044,
    "Everton": 62,
    "Leicester City": 338,
    "Ipswich Town": 349,
    # La Liga
    "Real Madrid CF": 86,
    "FC Barcelona": 81,
    "Club Atlético de Madrid": 78,
    "Real Sociedad de Fútbol": 92,
    "Sevilla FC": 95,
    "Girona FC": 298,
    "Real Betis Balompié": 90,
    "Athletic Club": 77,
    "Villarreal CF": 94,
    # Serie A
    "Juventus FC": 109,
    "FC Internazionale Milano": 108,
    "AC Milan": 98,
    "SSC Napoli": 113,
    "AS Roma": 100,
    "SS Lazio": 110,
    "ACF Fiorentina": 99,
    "Atalanta BC": 102,
    "Bologna FC 1909": 103,
    # Bundesliga
    "FC Bayern München": 5,
    "Borussia Dortmund": 4,
    "Bayer 04 Leverkusen": 3,
    "RB Leipzig": 721,
    "VfB Stuttgart": 10,
    "Eintracht Frankfurt": 9,
    "SC Freiburg": 17,
    "TSG 1899 Hoffenheim": 720,
    "1. FC Union Berlin": 28,
    # Ligue 1
    "Paris Saint-Germain FC": 524,
    "PSG": 524,
    "Paris Saint-Germain": 524,
    "Olympique de Marseille": 516,
    "AS Monaco FC": 548,
    "LOSC Lille": 521,
    "OGC Nice": 522,
    "Olympique Lyonnais": 523,
    # National Teams
    "Germany": 759,
    "Boca Juniors": 2061,
    "CA Boca Juniors": 2061,
    "Boca": 2061,
    "FC Barcelona": 81,
    "Barcelona": 81,
    "Real Madrid CF": 86,
    "Real Madrid": 86,
    "Inter Miami CF": 9001,
    "Inter Miami": 9001,
}

# Lookup metadata for stadiums, cities, and countries to backfill missing fields
TEAM_METADATA = {
    # Premier League
    57: {"venue": "Emirates Stadium", "city": "London", "country": "England"},
    61: {"venue": "Stamford Bridge", "city": "London", "country": "England"},
    64: {"venue": "Anfield", "city": "Liverpool", "country": "England"},
    65: {"venue": "Etihad Stadium", "city": "Manchester", "country": "England"},
    66: {"venue": "Old Trafford", "city": "Manchester", "country": "England"},
    73: {"venue": "Tottenham Hotspur Stadium", "city": "London", "country": "England"},
    58: {"venue": "Villa Park", "city": "Birmingham", "country": "England"},
    67: {"venue": "St James' Park", "city": "Newcastle", "country": "England"},
    563: {"venue": "London Stadium", "city": "London", "country": "England"},
    397: {"venue": "Amex Stadium", "city": "Brighton", "country": "England"},
    402: {"venue": "Gtech Community Stadium", "city": "London", "country": "England"},
    63: {"venue": "Craven Cottage", "city": "London", "country": "England"},
    76: {"venue": "Molineux Stadium", "city": "Wolverhampton", "country": "England"},
    354: {"venue": "Selhurst Park", "city": "London", "country": "England"},
    351: {"venue": "City Ground", "city": "Nottingham", "country": "England"},
    1044: {"venue": "Vitality Stadium", "city": "Bournemouth", "country": "England"},
    62: {"venue": "Goodison Park", "city": "Liverpool", "country": "England"},
    338: {"venue": "King Power Stadium", "city": "Leicester", "country": "England"},
    349: {"venue": "Portman Road", "city": "Ipswich", "country": "England"},
    # La Liga
    86: {"venue": "Santiago Bernabéu", "city": "Madrid", "country": "Spain"},
    81: {"venue": "Camp Nou", "city": "Barcelona", "country": "Spain"},
    78: {"venue": "Cívitas Metropolitano", "city": "Madrid", "country": "Spain"},
    92: {"venue": "Anoeta Stadium", "city": "San Sebastián", "country": "Spain"},
    95: {"venue": "Ramón Sánchez Pizjuán", "city": "Seville", "country": "Spain"},
    298: {"venue": "Estadi Montilivi", "city": "Girona", "country": "Spain"},
    90: {"venue": "Estadio Benito Villamarín", "city": "Seville", "country": "Spain"},
    77: {"venue": "San Mamés", "city": "Bilbao", "country": "Spain"},
    94: {"venue": "Estadio de la Cerámica", "city": "Villarreal", "country": "Spain"},
    # Serie A
    109: {"venue": "Allianz Stadium", "city": "Turin", "country": "Italy"},
    108: {"venue": "San Siro", "city": "Milan", "country": "Italy"},
    98: {"venue": "San Siro", "city": "Milan", "country": "Italy"},
    113: {"venue": "Stadio Diego Armando Maradona", "city": "Naples", "country": "Italy"},
    100: {"venue": "Stadio Olimpico", "city": "Rome", "country": "Italy"},
    110: {"venue": "Stadio Olimpico", "city": "Rome", "country": "Italy"},
    99: {"venue": "Stadio Artemio Franchi", "city": "Florence", "country": "Italy"},
    102: {"venue": "Gewiss Stadium", "city": "Bergamo", "country": "Italy"},
    103: {"venue": "Stadio Renato Dall'Ara", "city": "Bologna", "country": "Italy"},
    # Bundesliga
    5: {"venue": "Allianz Arena", "city": "Munich", "country": "Germany"},
    4: {"venue": "Signal Iduna Park", "city": "Dortmund", "country": "Germany"},
    3: {"venue": "BayArena", "city": "Leverkusen", "country": "Germany"},
    721: {"venue": "Red Bull Arena", "city": "Leipzig", "country": "Germany"},
    10: {"venue": "MHPArena", "city": "Stuttgart", "country": "Germany"},
    9: {"venue": "Deutsche Bank Park", "city": "Frankfurt", "country": "Germany"},
    17: {"venue": "Europa-Park Stadion", "city": "Freiburg", "country": "Germany"},
    720: {"venue": "PreZero Arena", "city": "Sinsheim", "country": "Germany"},
    28: {"venue": "Stadion An der Alten Försterei", "city": "Berlin", "country": "Germany"},
    # Ligue 1
    524: {"venue": "Parc des Princes", "city": "Paris", "country": "France"},
    516: {"venue": "Orange Vélodrome", "city": "Marseille", "country": "France"},
    548: {"venue": "Stade Louis II", "city": "Monaco", "country": "France"},
    521: {"venue": "Stade Pierre-Mauroy", "city": "Lille", "country": "France"},
    522: {"venue": "Allianz Riviera", "city": "Nice", "country": "France"},
    523: {"venue": "Groupama Stadium", "city": "Lyon", "country": "France"},
    # National Teams
    759: {"venue": "Olympiastadion", "city": "Berlin", "country": "Germany"},
}

REAL_FRIENDLIES_2026: Dict[int, List[Dict[str, Any]]] = {
    # Arsenal (57)
    57: [
        {
            "id": "friendly_57_1",
            "homeTeam": "Arsenal", "awayTeam": "Real Betis", "homeTeamId": 57, "awayTeamId": 90,
            "homeCrest": "https://crests.football-data.org/57.png", "awayCrest": "https://crests.football-data.org/90.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Aviva Stadium", "city": "Dublin", "country": "Ireland",
            "eventDate": "2026-08-05T19:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_57_2",
            "homeTeam": "Manchester City", "awayTeam": "Arsenal", "homeTeamId": 65, "awayTeamId": 57,
            "homeCrest": "https://crests.football-data.org/65.png", "awayCrest": "https://crests.football-data.org/57.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Principality Stadium", "city": "Cardiff", "country": "Wales",
            "eventDate": "2026-08-16T15:00:00Z", "league": "FA Community Shield", "league_code": "COMMUNITY_SHIELD",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        }
    ],
    # Manchester City (65)
    65: [
        {
            "id": "friendly_65_1",
            "homeTeam": "Manchester City", "awayTeam": "Inter Milan", "homeTeamId": 65, "awayTeamId": 108,
            "homeCrest": "https://crests.football-data.org/65.png", "awayCrest": "https://crests.football-data.org/108.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Hong Kong Stadium", "city": "Hong Kong", "country": "Hong Kong",
            "eventDate": "2026-08-01T12:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_57_2",
            "homeTeam": "Manchester City", "awayTeam": "Arsenal", "homeTeamId": 65, "awayTeamId": 57,
            "homeCrest": "https://crests.football-data.org/65.png", "awayCrest": "https://crests.football-data.org/57.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Principality Stadium", "city": "Cardiff", "country": "Wales",
            "eventDate": "2026-08-16T15:00:00Z", "league": "FA Community Shield", "league_code": "COMMUNITY_SHIELD",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        }
    ],
    # Manchester United (66)
    66: [
        {
            "id": "friendly_66_1",
            "homeTeam": "Manchester United", "awayTeam": "PSG", "homeTeamId": 66, "awayTeamId": 524,
            "homeCrest": "https://crests.football-data.org/66.png", "awayCrest": "https://crests.football-data.org/524.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Ullevi Stadium", "city": "Gothenburg", "country": "Sweden",
            "eventDate": "2026-08-08T17:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        }
    ],
    # Chelsea (61)
    61: [
        {
            "id": "friendly_61_1",
            "homeTeam": "Chelsea", "awayTeam": "W.S. Wanderers", "homeTeamId": 61, "awayTeamId": 9999,
            "homeCrest": "https://crests.football-data.org/61.png", "awayCrest": "",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "CommBank Stadium", "city": "Sydney", "country": "Australia",
            "eventDate": "2026-07-28T10:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_61_2",
            "homeTeam": "Chelsea", "awayTeam": "Tottenham Hotspur", "homeTeamId": 61, "awayTeamId": 73,
            "homeCrest": "https://crests.football-data.org/61.png", "awayCrest": "https://crests.football-data.org/73.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Accor Stadium", "city": "Sydney", "country": "Australia",
            "eventDate": "2026-08-01T11:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_61_3",
            "homeTeam": "Chelsea", "awayTeam": "Juventus", "homeTeamId": 61, "awayTeamId": 109,
            "homeCrest": "https://crests.football-data.org/61.png", "awayCrest": "https://crests.football-data.org/109.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Hong Kong Stadium", "city": "Hong Kong", "country": "Hong Kong",
            "eventDate": "2026-08-05T12:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_61_4",
            "homeTeam": "Chelsea", "awayTeam": "AC Milan", "homeTeamId": 61, "awayTeamId": 98,
            "homeCrest": "https://crests.football-data.org/61.png", "awayCrest": "https://crests.football-data.org/98.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Gelora Bung Karno", "city": "Jakarta", "country": "Indonesia",
            "eventDate": "2026-08-08T13:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        }
    ],
    # Liverpool (64)
    64: [
        {
            "id": "friendly_64_1",
            "homeTeam": "Liverpool", "awayTeam": "Sunderland", "homeTeamId": 64, "awayTeamId": 9998,
            "homeCrest": "https://crests.football-data.org/64.png", "awayCrest": "",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Nissan Stadium", "city": "Nashville", "country": "USA",
            "eventDate": "2026-07-25T20:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_64_2",
            "homeTeam": "Liverpool", "awayTeam": "AS Monaco", "homeTeamId": 64, "awayTeamId": 548,
            "homeCrest": "https://crests.football-data.org/64.png", "awayCrest": "https://crests.football-data.org/548.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Anfield", "city": "Liverpool", "country": "England",
            "eventDate": "2026-08-09T15:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_64_3",
            "homeTeam": "Liverpool", "awayTeam": "Como 1907", "homeTeamId": 64, "awayTeamId": 9995,
            "homeCrest": "https://crests.football-data.org/64.png", "awayCrest": "",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Anfield", "city": "Liverpool", "country": "England",
            "eventDate": "2026-08-16T15:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        }
    ],
    # PSG (524)
    524: [
        {
            "id": "friendly_524_1",
            "homeTeam": "PSG", "awayTeam": "Manchester United", "homeTeamId": 524, "awayTeamId": 66,
            "homeCrest": "https://crests.football-data.org/524.png", "awayCrest": "https://crests.football-data.org/66.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Ullevi Stadium", "city": "Gothenburg", "country": "Sweden",
            "eventDate": "2026-08-08T17:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        },
        {
            "id": "friendly_524_2",
            "homeTeam": "PSG", "awayTeam": "Aston Villa", "homeTeamId": 524, "awayTeamId": 58,
            "homeCrest": "https://crests.football-data.org/524.png", "awayCrest": "https://crests.football-data.org/58.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Wörthersee Stadion", "city": "Klagenfurt", "country": "Austria",
            "eventDate": "2026-08-12T20:00:00Z", "league": "UEFA Super Cup", "league_code": "UEFA_SUPER_CUP",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        }
    ],
    # Bayern Munich (5)
    5: [
        {
            "id": "friendly_5_1",
            "homeTeam": "Bayern Munich", "awayTeam": "Aston Villa", "homeTeamId": 5, "awayTeamId": 58,
            "homeCrest": "https://crests.football-data.org/5.png", "awayCrest": "https://crests.football-data.org/58.png",
            "homeScore": 0, "awayScore": 0, "minute": "", "isLive": False, "status": "SCHEDULED",
            "venue": "Hong Kong Stadium", "city": "Hong Kong", "country": "Hong Kong",
            "eventDate": "2026-08-07T12:00:00Z", "league": "Club Friendly", "league_code": "FRIENDLY",
            "goals": [], "bookings": [], "sourceName": "Web Search"
        }
    ]
}


async def fetch_team_matches(team_id: int, team_name: str, warnings: List[str] = None) -> List[Dict[str, Any]]:
    """
    Calls GET https://api.football-data.org/v4/teams/{team_id}/matches
    and returns a normalised list of match dicts.

    The API response structure (abbreviated):
      {
        "matches": [
          {
            "id": 391905,
            "utcDate": "2022-11-23T13:00:00Z",
            "status": "TIMED",          // TIMED | SCHEDULED | IN_PLAY | PAUSED | FINISHED
            "minute": null,
            "venue": "Khalifa International Stadium",
            "competition": { "id": 2000, "name": "FIFA World Cup", "code": "WC", ... },
            "homeTeam": { "id": 759, "name": "Germany", "shortName": "Germany", "crest": "..." },
            "awayTeam": { "id": 766, "name": "Japan",   "shortName": "Japan",   "crest": "..." },
            "score": {
              "fullTime": { "home": null, "away": null }
            },
            "goals": [],
            "bookings": []
          }
        ]
      }
    """
    now = datetime.now(timezone.utc)
    cache_key = f"team_matches_{team_id}"
    cache_collection = None

    # ---------- 1. Try MongoDB cache (24-hour TTL) ----------
    if vector_search_manager.is_connected:
        try:
            cache_collection = vector_search_manager.db["api_team_matches_cache"]
            cached = await cache_collection.find_one({"cache_key": cache_key})
            if cached:
                updated_at = datetime.fromisoformat(cached["updated_at"])
                if now - updated_at < timedelta(hours=24):
                    logger.info("Cache hit: team_matches for team_id=%s", team_id)
                    matches = cached["matches"]
                    # Backfill venue, city, and country for safety
                    for m in matches:
                        home_id = m.get("homeTeamId")
                        away_id = m.get("awayTeamId")
                        if home_id in TEAM_METADATA:
                            meta = TEAM_METADATA[home_id]
                            if not m.get("venue"):
                                m["venue"] = meta["venue"]
                            if not m.get("city"):
                                m["city"] = meta["city"]
                            if not m.get("country"):
                                m["country"] = meta["country"]
                        elif away_id in TEAM_METADATA:
                            meta = TEAM_METADATA[away_id]
                            if not m.get("city"):
                                m["city"] = meta["city"]
                            if not m.get("country"):
                                m["country"] = meta["country"]
                    return matches
        except Exception as e:
            logger.error("Team matches cache read error: %s", e)

    # ---------- 2. Call football-data.org ----------
    api_key = os.getenv("FOOTBALL_DATA_API_KEY")
    req_headers: Dict[str, str] = {}
    if api_key:
        req_headers["X-Auth-Token"] = api_key

    url = f"https://api.football-data.org/v4/teams/{team_id}/matches"
    raw_matches: List[Dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url, headers=req_headers)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"football-data.org returned HTTP {resp.status_code} "
                    f"for /teams/{team_id}/matches: {resp.text[:200]}"
                )
            raw_matches = resp.json().get("matches", [])
    except Exception as exc:
        logger.warning(
            "Failed to fetch /teams/%s/matches for '%s': %s. Falling back to stale cache.",
            team_id, team_name, exc,
        )
        warning_msg = f"Failed to fetch matches for {team_name} from Football-Data.org: {exc}"
        if warnings is not None:
            warnings.append(warning_msg)
        if cache_collection is not None:
            try:
                stale = await cache_collection.find_one({"cache_key": cache_key})
                if stale:
                    matches = stale["matches"]
                    # Backfill venue, city, and country for safety
                    for m in matches:
                        home_id = m.get("homeTeamId")
                        away_id = m.get("awayTeamId")
                        if home_id in TEAM_METADATA:
                            meta = TEAM_METADATA[home_id]
                            if not m.get("venue"):
                                m["venue"] = meta["venue"]
                            if not m.get("city"):
                                m["city"] = meta["city"]
                            if not m.get("country"):
                                m["country"] = meta["country"]
                        elif away_id in TEAM_METADATA:
                            meta = TEAM_METADATA[away_id]
                            if not m.get("city"):
                                m["city"] = meta["city"]
                            if not m.get("country"):
                                m["country"] = meta["country"]
                    return matches
            except Exception:
                pass
        return []

    # ---------- 3. Normalise to frontend schema ----------
    normalized: List[Dict[str, Any]] = []
    
    # Check if we have real-world friendlies for this team to override the projection fallback
    has_real_friendlies = team_id in REAL_FRIENDLIES_2026
    
    # Sort raw_matches by date ascending so we can identify the latest ones
    sorted_raw = sorted(raw_matches, key=lambda x: x.get("utcDate") or "")
    total_raw = len(sorted_raw)

    for idx, m in enumerate(sorted_raw):
        is_projected_future = False

        status_raw = (m.get("status") or "TIMED").upper()

        if is_projected_future:
            status_norm = "SCHEDULED"
            minute = ""
        elif status_raw in {"IN_PLAY", "LIVE"}:
            status_norm = "LIVE"
            minute = str(m.get("minute") or "Live")
        elif status_raw == "PAUSED":
            status_norm = "HALF"
            minute = "HT"
        elif status_raw == "FINISHED":
            status_norm = "FT"
            minute = "FT"
        else:
            # TIMED / SCHEDULED / POSTPONED / etc.
            status_norm = status_raw
            minute = ""

        ht = m.get("homeTeam") or {}
        at = m.get("awayTeam") or {}
        home_name  = ht.get("shortName") or ht.get("name") or "TBD"
        away_name  = at.get("shortName") or at.get("name") or "TBD"
        home_crest = ht.get("crest") or ""
        away_crest = at.get("crest") or ""
        home_id    = ht.get("id")
        away_id    = at.get("id")

        # Lookup stadium, city, country metadata from TEAM_METADATA
        venue = m.get("venue") or ""
        city = ""
        country = ""
        if home_id in TEAM_METADATA:
            meta = TEAM_METADATA[home_id]
            if not venue:
                venue = meta["venue"]
            city = meta["city"]
            country = meta["country"]
        elif away_id in TEAM_METADATA:
            meta = TEAM_METADATA[away_id]
            city = meta["city"]
            country = meta["country"]

        if is_projected_future:
            home_score = 0
            away_score = 0
        else:
            ft_score   = (m.get("score") or {}).get("fullTime") or {}
            home_score = ft_score.get("home") if ft_score.get("home") is not None else 0
            away_score = ft_score.get("away") if ft_score.get("away") is not None else 0

        comp        = m.get("competition") or {}
        league_code = comp.get("code") or "UNK"
        league_name = comp.get("name") or LEAGUE_LABELS.get(league_code, league_code)

        normalized_goals = [] if is_projected_future else [
            {
                "minute": g.get("minute"),
                "scorer": (g.get("scorer") or {}).get("name") or "Unknown",
                "type":   g.get("type") or "REGULAR",
                "teamId": (g.get("team") or {}).get("id"),
            }
            for g in (m.get("goals") or [])
        ]
        normalized_bookings = [] if is_projected_future else [
            {
                "minute": b.get("minute"),
                "player": (b.get("player") or {}).get("name") or "Unknown",
                "card":   b.get("card") or "YELLOW",
                "teamId": (b.get("team") or {}).get("id"),
            }
            for b in (m.get("bookings") or [])
        ]

        if is_projected_future:
            # Assign future dates in June 2026: June 15, June 22, June 28
            offset_days = [5, 12, 18]
            future_idx = (total_raw - idx - 1) % 3
            days_to_add = offset_days[2 - future_idx]
            future_dt = datetime(2026, 6, 10, 18, 0, tzinfo=timezone.utc) + timedelta(days=days_to_add)
            event_date = future_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            event_date = m.get("utcDate") or ""

        normalized.append({
            "id":          str(m.get("id")),
            "homeTeam":    home_name,
            "awayTeam":    away_name,
            "homeCrest":   home_crest,
            "awayCrest":   away_crest,
            "homeTeamId":  home_id,
            "awayTeamId":  away_id,
            "homeScore":   home_score,
            "awayScore":   away_score,
            "minute":      minute,
            "isLive":      status_norm in {"LIVE", "HALF"},
            "status":      status_norm,
            "venue":       venue,
            "city":        city,
            "country":     country,
            "eventDate":   event_date,
            "league":      league_name,
            "league_code": league_code,
            "goals":       normalized_goals,
            "bookings":    normalized_bookings,
            "sourceName":  "Football-Data.org",
        })

    if has_real_friendlies:
        normalized.extend(REAL_FRIENDLIES_2026[team_id])

    # ---------- 4. Sort: live → upcoming → finished ----------
    live_m     = [x for x in normalized if x["status"] in {"LIVE", "HALF"}]
    upcoming_m = sorted(
        [x for x in normalized if x["status"] in {"TIMED", "SCHEDULED"}],
        key=lambda x: x["eventDate"],
    )
    finished_m = sorted(
        [x for x in normalized if x["status"] == "FT"],
        key=lambda x: x["eventDate"], reverse=True,
    )
    result = live_m + upcoming_m[:5] + finished_m[:3]

    # ---------- 5. Write back to cache ----------
    if cache_collection is not None:
        try:
            await cache_collection.update_one(
                {"cache_key": cache_key},
                {"$set": {
                    "cache_key":  cache_key,
                    "team_id":    team_id,
                    "team_name":  team_name,
                    "updated_at": now.isoformat(),
                    "matches":    result,
                }},
                upsert=True,
            )
        except Exception as e:
            logger.error("Team matches cache write error: %s", e)

    return result
