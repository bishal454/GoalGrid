import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import httpx
from fastapi import HTTPException

from app.db.vector_search import vector_search_manager
from app.services.competitions_service import competitions_service

logger = logging.getLogger("offside_ai.live_match_services")

# Map client codes to football-data.org codes
FOOTBALL_DATA_LEAGUE_MAP = {
    "eng.1": "PL",
    "esp.1": "PD",
    "ita.1": "SA",
    "ger.1": "BL1",
    "fra.1": "FL1",
    "usa.1": "MLS",
    "uefa.champions": "CL",
    "PL": "PL",
    "PD": "PD",
    "SA": "SA",
    "BL1": "BL1",
    "FL1": "FL1",
    "CL": "CL",
    "WC": "WC",
    "ELC": "ELC",
    "DED": "DED",
    "PPL": "PPL",
    "CLI": "CLI",
    "MLS": "MLS"
}

LEAGUE_LABELS = {
    "PL": "Premier League",
    "PD": "LaLiga",
    "SA": "Serie A",
    "BL1": "Bundesliga",
    "FL1": "Ligue 1",
    "CL": "Champions League",
    "WC": "FIFA World Cup",
    "ELC": "Championship",
    "DED": "Eredivisie",
    "PPL": "Primeira Liga",
    "CLI": "Copa Libertadores",
    "MLS": "Major League Soccer"
}

DEFAULT_SEASONS = {
    "WC": 2022,
    "PL": 2025,
    "PD": 2025,
    "SA": 2025,
    "BL1": 2025,
    "FL1": 2025,
    "CL": 2025,
    "ELC": 2025,
    "DED": 2025,
    "PPL": 2025,
    "CLI": 2025,
    "MLS": 2025
}


class LiveMatchService:
    async def get_live_matches(self, league: str) -> Dict[str, Any]:
        """
        Fetch matches from football-data.org.
        Caches results in MongoDB (completed: 10 days, ongoing: 1 hour).
        """
        code = FOOTBALL_DATA_LEAGUE_MAP.get(league, "PL")
        
        cache_collection = None
        cached_data = None
        now = datetime.now(timezone.utc)

        # 1. Try to read from MongoDB cache
        if vector_search_manager.is_connected:
            try:
                cache_collection = vector_search_manager.db["api_football_data_matches_cache"]
                cache_doc = await cache_collection.find_one({"type": "matches_cache", "code": code})
                if cache_doc:
                    updated_at = datetime.fromisoformat(cache_doc["updated_at"])
                    # WC historical matches are constant (10 days TTL), active league matches (1 hour TTL)
                    ttl_hours = 240 if code == "WC" else 1
                    if now - updated_at < timedelta(hours=ttl_hours):
                        # Self-healing: if cache matches don't contain unfolding goals lists, force a fresh fetch
                        test_matches = cache_doc["data"].get("matches", [])
                        if not test_matches or "goals" in test_matches[0]:
                            cached_data = cache_doc["data"]
            except Exception as e:
                logger.error("Failed to query matches cache from MongoDB: %s", e)

        # 2. Fetch from external API if cache is stale or missing
        if not cached_data:
            api_key = os.getenv("FOOTBALL_DATA_API_KEY")
            headers = {"X-Unfold-Goals": "true"}
            if api_key:
                headers["X-Auth-Token"] = api_key

            season = DEFAULT_SEASONS.get(code)
            url = f"https://api.football-data.org/v4/competitions/{code}/matches"
            if season:
                url += f"?season={season}"

            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    response = await client.get(url, headers=headers)
                    if response.status_code != 200:
                        raise Exception(f"API-Football-Data error: status_code={response.status_code} {response.text}")
                    payload = response.json()
                    cached_data = payload

                    # Write new data to cache in MongoDB
                    if cache_collection is not None:
                        await cache_collection.update_one(
                            {"type": "matches_cache", "code": code},
                            {
                                "$set": {
                                    "updated_at": now.isoformat(),
                                    "data": cached_data
                                }
                            },
                            upsert=True
                        )
                except Exception as exc:
                    logger.warning("Failed to fetch matches for league %s: %s. Initiating fallback.", code, exc)
                    
                    # Try retrieving expired cache from DB first
                    fallback_doc = None
                    if cache_collection is not None:
                        try:
                            fallback_doc = await cache_collection.find_one({"type": "matches_cache", "code": code})
                        except Exception as cache_err:
                            logger.error("Failed to query expired cache: %s", cache_err)
                    
                    if fallback_doc:
                        logger.info("Serving expired cache for league %s as fallback.", code)
                        cached_data = fallback_doc["data"]
                    else:
                        raise HTTPException(
                            status_code=502,
                            detail=f"Unable to retrieve live match data for league {code}."
                        )

        # 3. Normalize matches to standard schema
        matches_list = cached_data.get("matches", [])
        normalized_matches = []
        for m in matches_list:
            status_raw = m.get("status")
            
            # Map statuses
            is_live = status_raw in {"LIVE", "IN_PLAY", "PAUSED"}
            if status_raw in {"LIVE", "IN_PLAY"}:
                status = "LIVE"
                minute = "Live"
            elif status_raw == "PAUSED":
                status = "HALF"
                minute = "Halftime"
            elif status_raw == "FINISHED":
                status = "FT"
                minute = "FT"
            else:
                status = "SCHEDULED"
                minute = "0'"

            home_team = m.get("homeTeam", {}).get("shortName") or m.get("homeTeam", {}).get("name") or "Home Team"
            away_team = m.get("awayTeam", {}).get("shortName") or m.get("awayTeam", {}).get("name") or "Away Team"

            score_data = m.get("score", {})
            full_time = score_data.get("fullTime", {})
            home_score = full_time.get("home") if full_time.get("home") is not None else 0
            away_score = full_time.get("away") if full_time.get("away") is not None else 0

            home_crest = m.get("homeTeam", {}).get("crest") or ""
            away_crest = m.get("awayTeam", {}).get("crest") or ""

            goals_list = m.get("goals") or []
            bookings_list = m.get("bookings") or []

            normalized_goals = []
            for g in goals_list:
                normalized_goals.append({
                    "minute": g.get("minute"),
                    "scorer": g.get("scorer", {}).get("name") or "Unknown",
                    "type": g.get("type") or "REGULAR",
                    "teamId": g.get("team", {}).get("id")
                })

            normalized_bookings = []
            for b in bookings_list:
                normalized_bookings.append({
                    "minute": b.get("minute"),
                    "player": b.get("player", {}).get("name") or "Unknown",
                    "card": b.get("card") or "YELLOW",
                    "teamId": b.get("team", {}).get("id")
                })

            normalized_matches.append({
                "id": str(m.get("id")),
                "homeTeam": home_team,
                "awayTeam": away_team,
                "homeCrest": home_crest,
                "awayCrest": away_crest,
                "homeScore": home_score,
                "awayScore": away_score,
                "minute": minute,
                "isLive": is_live,
                "status": status,
                "events": [],
                "goals": normalized_goals,
                "bookings": normalized_bookings,
                "homeTeamId": m.get("homeTeam", {}).get("id"),
                "awayTeamId": m.get("awayTeam", {}).get("id"),
                "sourceName": "Football-Data.org",
                "sourceUrl": f"https://api.football-data.org/v4/competitions/{code}/matches",
                "league": LEAGUE_LABELS.get(code, code),
                "venue": m.get("venue") or "",
                "eventDate": m.get("utcDate") or ""
            })

        # Rank matches: Live first, then recently finished (limit to last 8), then scheduled next 5
        live_matches = [m for m in normalized_matches if m["status"] in {"LIVE", "HALF"}]
        finished_matches = [m for m in normalized_matches if m["status"] == "FT"]
        scheduled_matches = [m for m in normalized_matches if m["status"] == "SCHEDULED"]

        finished_matches.sort(key=lambda x: x["eventDate"], reverse=True)
        scheduled_matches.sort(key=lambda x: x["eventDate"], reverse=False)

        results = []
        results.extend(live_matches)
        results.extend(finished_matches[:8])

        if len(results) < 5:
            results.extend(scheduled_matches[:5])

        return {
            "matches": results[:10],
            "retrieved_at": now.isoformat(),
            "league": code,
            "league_label": LEAGUE_LABELS.get(code, code)
        }

    async def get_teams_by_league(self, league: str) -> List[Dict[str, Any]]:
        """
        Retrieves active teams participating in a league using competitions service.
        """
        code = FOOTBALL_DATA_LEAGUE_MAP.get(league, "PL")
        data = await competitions_service.fetch_competition_teams(code)
        teams = data.get("teams", [])
        mapped = []
        for t in teams:
            mapped.append({
                "name": t.get("shortName") or t.get("name") or "TBD",
                "info": f"{t.get('venue') or 'Stadium'} - {LEAGUE_LABELS.get(code, 'League')}",
                "category": league
            })
        return mapped

    async def get_match_detail(self, match_id: str) -> Dict[str, Any]:
        """
        Fetch details for a specific match from football-data.org/v4/matches/{match_id}.
        Caches results in MongoDB.
        """
        now = datetime.now(timezone.utc)
        
        # 2. Try MongoDB cache for details
        cache_collection = None
        cached_doc = None
        if vector_search_manager.is_connected:
            try:
                cache_collection = vector_search_manager.db["api_football_data_match_detail_cache"]
                cached_doc = await cache_collection.find_one({"id": str(match_id)})
                if cached_doc:
                    updated_at = datetime.fromisoformat(cached_doc["updated_at"])
                    status = cached_doc.get("status", "FINISHED")
                    ttl_seconds = 864000 if status == "FINISHED" else (3600 if status == "SCHEDULED" else 30)
                    if (now - updated_at).total_seconds() < ttl_seconds:
                        return self._enrich_match_detail(cached_doc["payload"])
            except Exception as e:
                logger.error("Failed to query match detail cache: %s", e)

        # 3. Fetch from API
        api_key = os.getenv("FOOTBALL_DATA_API_KEY")
        headers = {}
        if api_key:
            headers["X-Auth-Token"] = api_key

        url = f"https://api.football-data.org/v4/matches/{match_id}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    payload = response.json()
                    
                    # Validate against MatchDetailResponseSchema Pydantic model
                    from app.schemas.live_matches_schema import MatchDetailResponseSchema
                    match_detail_obj = MatchDetailResponseSchema.model_validate(payload)
                    validated_payload = match_detail_obj.model_dump()
                    
                    enriched_payload = self._enrich_match_detail(validated_payload)
                    if cache_collection is not None:
                        await cache_collection.update_one(
                            {"id": str(match_id)},
                            {
                                "$set": {
                                    "updated_at": now.isoformat(),
                                    "status": enriched_payload.get("status", "FINISHED"),
                                    "payload": enriched_payload
                                }
                            },
                            upsert=True
                        )
                    return enriched_payload
            except Exception as exc:
                logger.warning("Failed to fetch match detail from API: %s.", exc)

        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve match details for match_id {match_id}."
        )

    def _get_fallback_roster(self, team_name: str, formation: str, seed_val: int, is_home: bool) -> tuple[list[dict], list[dict]]:
        import random
        rng = random.Random(seed_val + (100 if is_home else 200))
        
        first_names = ["John", "David", "Lucas", "Marc", "Alex", "James", "Robert", "Thomas", "Daniel", "Paul", "Luka", "Mateo", "Pierre", "Antoine", "Marco", "Giovanni", "Diego", "Carlos"]
        last_names = ["Smith", "Jones", "Silva", "Garcia", "Müller", "Schneider", "Martin", "Dubois", "Rossi", "Bianchi", "Fernandez", "Gomez", "Kovacic", "Sato", "Kim", "O'Connor"]
        
        positions = []
        if formation == "4-4-2":
            positions = [
                "Goalkeeper",
                "Right-Back", "Centre-Back", "Centre-Back", "Left-Back",
                "Right Winger", "Central Midfield", "Central Midfield", "Left Winger",
                "Centre-Forward", "Centre-Forward"
            ]
        elif formation == "4-2-3-1":
            positions = [
                "Goalkeeper",
                "Right-Back", "Centre-Back", "Centre-Back", "Left-Back",
                "Defensive Midfield", "Defensive Midfield",
                "Right Winger", "Attacking Midfield", "Left Winger",
                "Centre-Forward"
            ]
        elif formation == "3-5-2":
            positions = [
                "Goalkeeper",
                "Centre-Back", "Centre-Back", "Centre-Back",
                "Right Wing-Back", "Left Wing-Back", "Defensive Midfield", "Central Midfield", "Central Midfield",
                "Second Striker", "Centre-Forward"
            ]
        else: # Default 4-3-3
            positions = [
                "Goalkeeper",
                "Right-Back", "Centre-Back", "Centre-Back", "Left-Back",
                "Defensive Midfield", "Central Midfield", "Central Midfield",
                "Right Winger", "Centre-Forward", "Left Winger"
            ]
            
        lineup = []
        for idx, pos in enumerate(positions):
            shirt = 1 if idx == 0 else (idx + 1 if pos != "Goalkeeper" else 1)
            if idx > 0 and shirt == 1:
                shirt = idx + 1
            
            p_id = (2000 if is_home else 3000) + idx
            p_name = f"{rng.choice(first_names)} {rng.choice(last_names)}"
            lineup.append({
                "id": p_id,
                "name": p_name,
                "position": pos,
                "shirtNumber": shirt
            })
            
        bench = []
        bench_positions = ["Goalkeeper", "Centre-Back", "Left-Back", "Central Midfield", "Attacking Midfield", "Left Winger", "Centre-Forward"]
        for idx, pos in enumerate(bench_positions):
            shirt = 12 + idx
            p_id = (4000 if is_home else 5000) + idx
            p_name = f"{rng.choice(first_names)} {rng.choice(last_names)}"
            bench.append({
                "id": p_id,
                "name": p_name,
                "position": pos,
                "shirtNumber": shirt
            })
            
        return lineup, bench

    def _enrich_match_detail(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return payload

        import random
        match_id_str = str(payload.get("id", "0"))
        try:
            match_seed = int(match_id_str)
        except:
            match_seed = sum(ord(c) for c in match_id_str)
            
        rng = random.Random(match_seed)

        rosters = {
            "liverpool": {
                "coach": "Arne Slot",
                "formation": "4-3-3",
                "lineup": [
                    {"id": 1001, "name": "Alisson Becker", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1002, "name": "Trent Alexander-Arnold", "position": "Right-Back", "shirtNumber": 66},
                    {"id": 1003, "name": "Virgil van Dijk", "position": "Centre-Back", "shirtNumber": 4},
                    {"id": 1004, "name": "Ibrahima Konaté", "position": "Centre-Back", "shirtNumber": 5},
                    {"id": 1005, "name": "Andrew Robertson", "position": "Left-Back", "shirtNumber": 26},
                    {"id": 1006, "name": "Alexis Mac Allister", "position": "Central Midfield", "shirtNumber": 10},
                    {"id": 1007, "name": "Dominik Szoboszlai", "position": "Central Midfield", "shirtNumber": 8},
                    {"id": 1008, "name": "Ryan Gravenberch", "position": "Central Midfield", "shirtNumber": 38},
                    {"id": 1009, "name": "Mohamed Salah", "position": "Right Winger", "shirtNumber": 11},
                    {"id": 1010, "name": "Luis Díaz", "position": "Left Winger", "shirtNumber": 7},
                    {"id": 1011, "name": "Diogo Jota", "position": "Centre-Forward", "shirtNumber": 20}
                ],
                "bench": [
                    {"id": 1012, "name": "Caoimhín Kelleher", "position": "Goalkeeper", "shirtNumber": 62},
                    {"id": 1013, "name": "Joe Gomez", "position": "Centre-Back", "shirtNumber": 2},
                    {"id": 1014, "name": "Jarell Quansah", "position": "Centre-Back", "shirtNumber": 78},
                    {"id": 1015, "name": "Curtis Jones", "position": "Central Midfield", "shirtNumber": 17},
                    {"id": 1016, "name": "Wataru Endo", "position": "Defensive Midfield", "shirtNumber": 3},
                    {"id": 1017, "name": "Cody Gakpo", "position": "Left Winger", "shirtNumber": 18},
                    {"id": 1018, "name": "Darwin Núñez", "position": "Centre-Forward", "shirtNumber": 9}
                ]
            },
            "manchester city": {
                "coach": "Pep Guardiola",
                "formation": "4-3-3",
                "lineup": [
                    {"id": 1101, "name": "Ederson Moraes", "position": "Goalkeeper", "shirtNumber": 31},
                    {"id": 1102, "name": "Kyle Walker", "position": "Right-Back", "shirtNumber": 2},
                    {"id": 1103, "name": "Rúben Dias", "position": "Centre-Back", "shirtNumber": 3},
                    {"id": 1104, "name": "Manuel Akanji", "position": "Centre-Back", "shirtNumber": 25},
                    {"id": 1105, "name": "Josko Gvardiol", "position": "Left-Back", "shirtNumber": 24},
                    {"id": 1106, "name": "Rodri Hernández", "position": "Defensive Midfield", "shirtNumber": 16},
                    {"id": 1107, "name": "Mateo Kovacic", "position": "Central Midfield", "shirtNumber": 8},
                    {"id": 1108, "name": "Kevin De Bruyne", "position": "Attacking Midfield", "shirtNumber": 17},
                    {"id": 1109, "name": "Bernardo Silva", "position": "Right Winger", "shirtNumber": 20},
                    {"id": 1110, "name": "Phil Foden", "position": "Left Winger", "shirtNumber": 47},
                    {"id": 1111, "name": "Erling Haaland", "position": "Centre-Forward", "shirtNumber": 9}
                ],
                "bench": [
                    {"id": 1112, "name": "Stefan Ortega", "position": "Goalkeeper", "shirtNumber": 18},
                    {"id": 1113, "name": "John Stones", "position": "Centre-Back", "shirtNumber": 5},
                    {"id": 1114, "name": "Rico Lewis", "position": "Right-Back", "shirtNumber": 82},
                    {"id": 1115, "name": "Ilkay Gündogan", "position": "Central Midfield", "shirtNumber": 19},
                    {"id": 1116, "name": "Jeremy Doku", "position": "Left Winger", "shirtNumber": 11},
                    {"id": 1117, "name": "Jack Grealish", "position": "Left Winger", "shirtNumber": 10},
                    {"id": 1118, "name": "Savinho", "position": "Right Winger", "shirtNumber": 26}
                ]
            },
            "chelsea": {
                "coach": "Enzo Maresca",
                "formation": "4-2-3-1",
                "lineup": [
                    {"id": 1201, "name": "Robert Sánchez", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1202, "name": "Malo Gusto", "position": "Right-Back", "shirtNumber": 27},
                    {"id": 1203, "name": "Wesley Fofana", "position": "Centre-Back", "shirtNumber": 29},
                    {"id": 1204, "name": "Levi Colwill", "position": "Centre-Back", "shirtNumber": 6},
                    {"id": 1205, "name": "Marc Cucurella", "position": "Left-Back", "shirtNumber": 3},
                    {"id": 1206, "name": "Moisés Caicedo", "position": "Defensive Midfield", "shirtNumber": 25},
                    {"id": 1207, "name": "Enzo Fernández", "position": "Central Midfield", "shirtNumber": 8},
                    {"id": 1208, "name": "Cole Palmer", "position": "Attacking Midfield", "shirtNumber": 20},
                    {"id": 1209, "name": "Noni Madueke", "position": "Right Winger", "shirtNumber": 11},
                    {"id": 1210, "name": "Pedro Neto", "position": "Left Winger", "shirtNumber": 19},
                    {"id": 1211, "name": "Nicolas Jackson", "position": "Centre-Forward", "shirtNumber": 15}
                ],
                "bench": [
                    {"id": 1212, "name": "Filip Jørgensen", "position": "Goalkeeper", "shirtNumber": 12},
                    {"id": 1213, "name": "Tosin Adarabioyo", "position": "Centre-Back", "shirtNumber": 4},
                    {"id": 1214, "name": "Benoît Badiashile", "position": "Centre-Back", "shirtNumber": 5},
                    {"id": 1215, "name": "Roméo Lavia", "position": "Defensive Midfield", "shirtNumber": 45},
                    {"id": 1216, "name": "Mykhailo Mudryk", "position": "Left Winger", "shirtNumber": 10},
                    {"id": 1217, "name": "João Félix", "position": "Second Striker", "shirtNumber": 14},
                    {"id": 1218, "name": "Christopher Nkunku", "position": "Centre-Forward", "shirtNumber": 18}
                ]
            },
            "arsenal": {
                "coach": "Mikel Arteta",
                "formation": "4-3-3",
                "lineup": [
                    {"id": 1301, "name": "David Raya", "position": "Goalkeeper", "shirtNumber": 22},
                    {"id": 1302, "name": "Ben White", "position": "Right-Back", "shirtNumber": 4},
                    {"id": 1303, "name": "William Saliba", "position": "Centre-Back", "shirtNumber": 2},
                    {"id": 1304, "name": "Gabriel Magalhães", "position": "Centre-Back", "shirtNumber": 6},
                    {"id": 1305, "name": "Jurriën Timber", "position": "Left-Back", "shirtNumber": 12},
                    {"id": 1306, "name": "Declan Rice", "position": "Defensive Midfield", "shirtNumber": 41},
                    {"id": 1307, "name": "Thomas Partey", "position": "Central Midfield", "shirtNumber": 5},
                    {"id": 1308, "name": "Martin Ødegaard", "position": "Attacking Midfield", "shirtNumber": 8},
                    {"id": 1309, "name": "Bukayo Saka", "position": "Right Winger", "shirtNumber": 7},
                    {"id": 1310, "name": "Gabriel Martinelli", "position": "Left Winger", "shirtNumber": 11},
                    {"id": 1311, "name": "Kai Havertz", "position": "Centre-Forward", "shirtNumber": 29}
                ],
                "bench": [
                    {"id": 1312, "name": "Neto Murara", "position": "Goalkeeper", "shirtNumber": 32},
                    {"id": 1313, "name": "Jakub Kiwior", "position": "Centre-Back", "shirtNumber": 15},
                    {"id": 1314, "name": "Oleksandr Zinchenko", "position": "Left-Back", "shirtNumber": 17},
                    {"id": 1315, "name": "Riccardo Calafiori", "position": "Centre-Back", "shirtNumber": 33},
                    {"id": 1316, "name": "Jorginho Frello", "position": "Defensive Midfield", "shirtNumber": 20},
                    {"id": 1317, "name": "Gabriel Jesus", "position": "Centre-Forward", "shirtNumber": 9},
                    {"id": 1318, "name": "Leandro Trossard", "position": "Left Winger", "shirtNumber": 19}
                ]
            },
            "united": {
                "coach": "Ralf Rangnick",
                "formation": "4-2-3-1",
                "lineup": [
                    {"id": 1401, "name": "David De Gea", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1402, "name": "Diogo Dalot", "position": "Right-Back", "shirtNumber": 20},
                    {"id": 1403, "name": "Raphaël Varane", "position": "Centre-Back", "shirtNumber": 19},
                    {"id": 1404, "name": "Harry Maguire", "position": "Centre-Back", "shirtNumber": 5},
                    {"id": 1405, "name": "Luke Shaw", "position": "Left-Back", "shirtNumber": 23},
                    {"id": 1406, "name": "Paul Pogba", "position": "Central Midfield", "shirtNumber": 6},
                    {"id": 1407, "name": "Scott McTominay", "position": "Defensive Midfield", "shirtNumber": 39},
                    {"id": 1408, "name": "Bruno Fernandes", "position": "Attacking Midfield", "shirtNumber": 18},
                    {"id": 1409, "name": "Jadon Sancho", "position": "Left Winger", "shirtNumber": 25},
                    {"id": 1410, "name": "Cristiano Ronaldo", "position": "Centre-Forward", "shirtNumber": 7},
                    {"id": 1411, "name": "Marcus Rashford", "position": "Left Winger", "shirtNumber": 10}
                ],
                "bench": [
                    {"id": 1412, "name": "Dean Henderson", "position": "Goalkeeper", "shirtNumber": 26},
                    {"id": 1413, "name": "Victor Lindelöf", "position": "Centre-Back", "shirtNumber": 2},
                    {"id": 1414, "name": "Phil Jones", "position": "Centre-Back", "shirtNumber": 4},
                    {"id": 1415, "name": "Alex Telles", "position": "Left-Back", "shirtNumber": 27},
                    {"id": 1416, "name": "Aaron Wan-Bissaka", "position": "Right-Back", "shirtNumber": 29},
                    {"id": 1417, "name": "Jesse Lingard", "position": "Attacking Midfield", "shirtNumber": 14},
                    {"id": 1418, "name": "Anthony Elanga", "position": "Right Winger", "shirtNumber": 36}
                ]
            },
            "real madrid": {
                "coach": "Carlo Ancelotti",
                "formation": "4-3-3",
                "lineup": [
                    {"id": 1501, "name": "Thibaut Courtois", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1502, "name": "Dani Carvajal", "position": "Right-Back", "shirtNumber": 2},
                    {"id": 1503, "name": "Éder Militão", "position": "Centre-Back", "shirtNumber": 3},
                    {"id": 1504, "name": "Antonio Rüdiger", "position": "Centre-Back", "shirtNumber": 22},
                    {"id": 1505, "name": "Ferland Mendy", "position": "Left-Back", "shirtNumber": 23},
                    {"id": 1506, "name": "Federico Valverde", "position": "Central Midfield", "shirtNumber": 15},
                    {"id": 1507, "name": "Aurélien Tchouaméni", "position": "Defensive Midfield", "shirtNumber": 14},
                    {"id": 1508, "name": "Jude Bellingham", "position": "Attacking Midfield", "shirtNumber": 5},
                    {"id": 1509, "name": "Rodrygo Goes", "position": "Right Winger", "shirtNumber": 11},
                    {"id": 1510, "name": "Kylian Mbappé", "position": "Centre-Forward", "shirtNumber": 9},
                    {"id": 1511, "name": "Vinícius Júnior", "position": "Left Winger", "shirtNumber": 7}
                ],
                "bench": [
                    {"id": 1512, "name": "Andriy Lunin", "position": "Goalkeeper", "shirtNumber": 13},
                    {"id": 1513, "name": "Jesús Vallejo", "position": "Centre-Back", "shirtNumber": 18},
                    {"id": 1514, "name": "Fran García", "position": "Left-Back", "shirtNumber": 20},
                    {"id": 1515, "name": "Luka Modric", "position": "Central Midfield", "shirtNumber": 10},
                    {"id": 1516, "name": "Eduardo Camavinga", "position": "Central Midfield", "shirtNumber": 6},
                    {"id": 1517, "name": "Arda Güler", "position": "Attacking Midfield", "shirtNumber": 8},
                    {"id": 1518, "name": "Brahim Díaz", "position": "Right Winger", "shirtNumber": 21}
                ]
            },
            "barcelona": {
                "coach": "Hansi Flick",
                "formation": "4-2-3-1",
                "lineup": [
                    {"id": 1601, "name": "Marc-André ter Stegen", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1602, "name": "Jules Koundé", "position": "Right-Back", "shirtNumber": 23},
                    {"id": 1603, "name": "Ronald Araujo", "position": "Centre-Back", "shirtNumber": 4},
                    {"id": 1604, "name": "Pau Cubarsí", "position": "Centre-Back", "shirtNumber": 2},
                    {"id": 1605, "name": "Alejandro Balde", "position": "Left-Back", "shirtNumber": 3},
                    {"id": 1606, "name": "Pedri González", "position": "Central Midfield", "shirtNumber": 8},
                    {"id": 1607, "name": "Gavi", "position": "Central Midfield", "shirtNumber": 6},
                    {"id": 1608, "name": "Dani Olmo", "position": "Attacking Midfield", "shirtNumber": 20},
                    {"id": 1609, "name": "Lamine Yamal", "position": "Right Winger", "shirtNumber": 19},
                    {"id": 1610, "name": "Raphinha Dias", "position": "Left Winger", "shirtNumber": 11},
                    {"id": 1611, "name": "Robert Lewandowski", "position": "Centre-Forward", "shirtNumber": 9}
                ],
                "bench": [
                    {"id": 1612, "name": "Iñaki Peña", "position": "Goalkeeper", "shirtNumber": 13},
                    {"id": 1613, "name": "Iñigo Martínez", "position": "Centre-Back", "shirtNumber": 5},
                    {"id": 1614, "name": "Frenkie de Jong", "position": "Central Midfield", "shirtNumber": 21},
                    {"id": 1615, "name": "Marc Casadó", "position": "Defensive Midfield", "shirtNumber": 17},
                    {"id": 1616, "name": "Pablo Torre", "position": "Attacking Midfield", "shirtNumber": 14},
                    {"id": 1617, "name": "Ansu Fati", "position": "Left Winger", "shirtNumber": 10},
                    {"id": 1618, "name": "Pau Víctor", "position": "Centre-Forward", "shirtNumber": 18}
                ]
            },
            "bayern": {
                "coach": "Vincent Kompany",
                "formation": "4-2-3-1",
                "lineup": [
                    {"id": 1701, "name": "Manuel Neuer", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1702, "name": "Joshua Kimmich", "position": "Right-Back", "shirtNumber": 6},
                    {"id": 1703, "name": "Dayot Upamecano", "position": "Centre-Back", "shirtNumber": 2},
                    {"id": 1704, "name": "Kim Min-jae", "position": "Centre-Back", "shirtNumber": 3},
                    {"id": 1705, "name": "Alphonso Davies", "position": "Left-Back", "shirtNumber": 19},
                    {"id": 1706, "name": "Aleksandar Pavlovic", "position": "Central Midfield", "shirtNumber": 45},
                    {"id": 1707, "name": "João Palhinha", "position": "Central Midfield", "shirtNumber": 16},
                    {"id": 1708, "name": "Jamal Musiala", "position": "Attacking Midfield", "shirtNumber": 42},
                    {"id": 1709, "name": "Leroy Sané", "position": "Right Winger", "shirtNumber": 10},
                    {"id": 1710, "name": "Michael Olise", "position": "Left Winger", "shirtNumber": 17},
                    {"id": 1711, "name": "Harry Kane", "position": "Centre-Forward", "shirtNumber": 9}
                ],
                "bench": [
                    {"id": 1712, "name": "Sven Ulreich", "position": "Goalkeeper", "shirtNumber": 26},
                    {"id": 1713, "name": "Eric Dier", "position": "Centre-Back", "shirtNumber": 15},
                    {"id": 1714, "name": "Raphaël Guerreiro", "position": "Left-Back", "shirtNumber": 22},
                    {"id": 1715, "name": "Leon Goretzka", "position": "Central Midfield", "shirtNumber": 8},
                    {"id": 1716, "name": "Thomas Müller", "position": "Attacking Midfield", "shirtNumber": 25},
                    {"id": 1717, "name": "Serge Gnabry", "position": "Right Winger", "shirtNumber": 7},
                    {"id": 1718, "name": "Kingsley Coman", "position": "Left Winger", "shirtNumber": 11}
                ]
            },
            "atletico": {
                "coach": "Diego Simeone",
                "formation": "3-5-2",
                "lineup": [
                    {"id": 1801, "name": "Jan Oblak", "position": "Goalkeeper", "shirtNumber": 13},
                    {"id": 1802, "name": "Axel Witsel", "position": "Centre-Back", "shirtNumber": 20},
                    {"id": 1803, "name": "José María Giménez", "position": "Centre-Back", "shirtNumber": 2},
                    {"id": 1804, "name": "Robin Le Normand", "position": "Centre-Back", "shirtNumber": 3},
                    {"id": 1805, "name": "Marcos Llorente", "position": "Right Wing-Back", "shirtNumber": 14},
                    {"id": 1806, "name": "Reinildo Mandava", "position": "Left Wing-Back", "shirtNumber": 23},
                    {"id": 1807, "name": "Koke Resurrección", "position": "Defensive Midfield", "shirtNumber": 6},
                    {"id": 1808, "name": "Rodrigo De Paul", "position": "Central Midfield", "shirtNumber": 5},
                    {"id": 1809, "name": "Conor Gallagher", "position": "Central Midfield", "shirtNumber": 8},
                    {"id": 1810, "name": "Antoine Griezmann", "position": "Second Striker", "shirtNumber": 7},
                    {"id": 1811, "name": "Julián Álvarez", "position": "Centre-Forward", "shirtNumber": 19}
                ],
                "bench": [
                    {"id": 1812, "name": "Juan Musso", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1813, "name": "Clément Lenglet", "position": "Centre-Back", "shirtNumber": 15},
                    {"id": 1814, "name": "Nahuel Molina", "position": "Right Wing-Back", "shirtNumber": 16},
                    {"id": 1815, "name": "Rodrigo Riquelme", "position": "Left Wing-Back", "shirtNumber": 24},
                    {"id": 1816, "name": "Alexander Sørloth", "position": "Centre-Forward", "shirtNumber": 9},
                    {"id": 1817, "name": "Ángel Correa", "position": "Centre-Forward", "shirtNumber": 10},
                    {"id": 1818, "name": "Giuliano Simeone", "position": "Right Winger", "shirtNumber": 21}
                ]
            },
            "villarreal": {
                "coach": "Marcelino García Toral",
                "formation": "4-4-2",
                "lineup": [
                    {"id": 1901, "name": "Diego Conde", "position": "Goalkeeper", "shirtNumber": 13},
                    {"id": 1902, "name": "Logan Costa", "position": "Centre-Back", "shirtNumber": 2},
                    {"id": 1903, "name": "Raúl Albiol", "position": "Centre-Back", "shirtNumber": 3},
                    {"id": 1904, "name": "Kiko Femenía", "position": "Right-Back", "shirtNumber": 17},
                    {"id": 1905, "name": "Sergi Cardona", "position": "Left-Back", "shirtNumber": 23},
                    {"id": 1906, "name": "Eric Bailly", "position": "Centre-Back", "shirtNumber": 4},
                    {"id": 1907, "name": "Dani Parejo", "position": "Central Midfield", "shirtNumber": 10},
                    {"id": 1908, "name": "Pape Gueye", "position": "Central Midfield", "shirtNumber": 18},
                    {"id": 1909, "name": "Álex Baena", "position": "Left Midfielder", "shirtNumber": 16},
                    {"id": 1910, "name": "Ayoze Pérez", "position": "Centre-Forward", "shirtNumber": 22},
                    {"id": 1911, "name": "Gerard Moreno", "position": "Centre-Forward", "shirtNumber": 9}
                ],
                "bench": [
                    {"id": 1912, "name": "Luiz Júnior", "position": "Goalkeeper", "shirtNumber": 1},
                    {"id": 1913, "name": "Willy Kambwala", "position": "Centre-Back", "shirtNumber": 5},
                    {"id": 1914, "name": "Manu Trigueros", "position": "Central Midfield", "shirtNumber": 14},
                    {"id": 1915, "name": "Ramón Terrats", "position": "Central Midfield", "shirtNumber": 20},
                    {"id": 1916, "name": "Nicolas Pépé", "position": "Right Winger", "shirtNumber": 19},
                    {"id": 1917, "name": "Thierno Barry", "position": "Centre-Forward", "shirtNumber": 11},
                    {"id": 1918, "name": "Yéremi Pino", "position": "Right Winger", "shirtNumber": 7}
                ]
            },
            "southampton": {
                "coach": "Ralph Hasenhüttl",
                "formation": "4-4-2",
                "lineup": [
                    {"id": 3401, "name": "Fraser Forster", "position": "Goalkeeper", "shirtNumber": 44},
                    {"id": 3402, "name": "Kyle Walker-Peters", "position": "Right-Back", "shirtNumber": 2},
                    {"id": 3403, "name": "Jan Bednarek", "position": "Centre-Back", "shirtNumber": 35},
                    {"id": 3404, "name": "Mohammed Salisu", "position": "Centre-Back", "shirtNumber": 22},
                    {"id": 3405, "name": "Romain Perraud", "position": "Left-Back", "shirtNumber": 15},
                    {"id": 3406, "name": "Stuart Armstrong", "position": "Central Midfield", "shirtNumber": 17},
                    {"id": 3407, "name": "James Ward-Prowse", "position": "Central Midfield", "shirtNumber": 8},
                    {"id": 3408, "name": "Oriol Romeu", "position": "Defensive Midfield", "shirtNumber": 6},
                    {"id": 3409, "name": "Mohamed Elyounoussi", "position": "Left Winger", "shirtNumber": 24},
                    {"id": 3410, "name": "Che Adams", "position": "Centre-Forward", "shirtNumber": 10},
                    {"id": 3411, "name": "Armando Broja", "position": "Centre-Forward", "shirtNumber": 18}
                ],
                "bench": [
                    {"id": 3412, "name": "Willy Caballero", "position": "Goalkeeper", "shirtNumber": 13},
                    {"id": 3413, "name": "Jack Stephens", "position": "Centre-Back", "shirtNumber": 5},
                    {"id": 3414, "name": "Yan Valery", "position": "Right-Back", "shirtNumber": 43},
                    {"id": 3415, "name": "Moussa Djénepo", "position": "Left Winger", "shirtNumber": 19},
                    {"id": 3416, "name": "William Smallbone", "position": "Central Midfield", "shirtNumber": 20},
                    {"id": 3417, "name": "Ibrahima Diallo", "position": "Defensive Midfield", "shirtNumber": 27},
                    {"id": 3418, "name": "Valentino Livramento", "position": "Right-Back", "shirtNumber": 21}
                ]
            }
        }

        def get_team_data(team_name: str, is_home: bool) -> tuple:
            team_lower = team_name.lower()
            for key, data in rosters.items():
                if key in team_lower:
                    return data["formation"], data["coach"], [dict(p) for p in data["lineup"]], [dict(p) for p in data["bench"]]
            
            avail_formations = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2"]
            team_seed = sum(ord(c) for c in team_name) + (1 if is_home else 2)
            form_idx = team_seed % len(avail_formations)
            formation = avail_formations[form_idx]
            
            coach_first = ["Enzo", "Marcelo", "Jurgen", "Thomas", "Pep", "Carlo", "Diego", "Ruben", "Hansi", "Arne", "Graham", "Kieran"]
            coach_last = ["Maresca", "Arteta", "Amorim", "Kompany", "Flick", "Slot", "Simeone", "Ancelotti", "Guardiola", "Klopp", "Potter", "McKenna"]
            temp_rng = random.Random(team_seed)
            coach = f"{temp_rng.choice(coach_first)} {temp_rng.choice(coach_last)}"
            
            lineup, bench = self._get_fallback_roster(team_name, formation, match_seed, is_home)
            return formation, coach, lineup, bench

        # Enrich homeTeam
        home_team_payload = payload.setdefault("homeTeam", {})
        home_name = home_team_payload.get("name") or "Home Team"
        home_form, home_coach, home_lineup, home_bench = get_team_data(home_name, True)
        
        if not home_team_payload.get("formation"):
            home_team_payload["formation"] = home_form
        if not home_team_payload.get("coach") or not home_team_payload.get("coach", {}).get("name"):
            home_team_payload["coach"] = {"id": 101, "name": home_coach, "nationality": ""}
        if not home_team_payload.get("lineup"):
            home_team_payload["lineup"] = home_lineup
        if not home_team_payload.get("bench"):
            home_team_payload["bench"] = home_bench
            
        if not home_team_payload.get("statistics"):
            home_shots = rng.randint(8, 20)
            home_sog = rng.randint(3, max(4, home_shots - 2))
            home_possession = rng.randint(40, 60)
            home_fouls = rng.randint(7, 15)
            home_corners = rng.randint(2, 9)
            home_offsides = rng.randint(0, 4)
            home_yellow = rng.randint(0, 4)
            home_red = 0 if rng.random() > 0.1 else 1
            
            home_team_payload["statistics"] = {
                "shots": home_shots,
                "shots_on_goal": home_sog,
                "ball_possession": home_possession,
                "passes": int(home_possession * 8.5),
                "pass_accuracy": rng.randint(82, 92),
                "fouls": home_fouls,
                "yellow_cards": home_yellow,
                "red_cards": home_red,
                "offsides": home_offsides,
                "corner_kicks": home_corners,
                "free_kicks": rng.randint(8, 18),
                "goal_kicks": rng.randint(5, 12),
                "saves": rng.randint(2, 7)
            }

        # Enrich awayTeam
        away_team_payload = payload.setdefault("awayTeam", {})
        away_name = away_team_payload.get("name") or "Away Team"
        away_form, away_coach, away_lineup, away_bench = get_team_data(away_name, False)
        
        if not away_team_payload.get("formation"):
            away_team_payload["formation"] = away_form
        if not away_team_payload.get("coach") or not away_team_payload.get("coach", {}).get("name"):
            away_team_payload["coach"] = {"id": 102, "name": away_coach, "nationality": ""}
        if not away_team_payload.get("lineup"):
            away_team_payload["lineup"] = away_lineup
        if not away_team_payload.get("bench"):
            away_team_payload["bench"] = away_bench

        home_stats = home_team_payload["statistics"]
        home_possession = home_stats["ball_possession"]
        home_sog = home_stats["shots_on_goal"]
        
        if not away_team_payload.get("statistics"):
            away_shots = rng.randint(8, 20)
            away_sog = rng.randint(3, max(4, away_shots - 2))
            away_possession = 100 - home_possession
            away_fouls = rng.randint(7, 15)
            away_corners = rng.randint(2, 9)
            away_offsides = rng.randint(0, 4)
            away_yellow = rng.randint(0, 4)
            away_red = 0 if rng.random() > 0.1 else 1
            
            away_team_payload["statistics"] = {
                "shots": away_shots,
                "shots_on_goal": away_sog,
                "ball_possession": away_possession,
                "passes": int(away_possession * 8.5),
                "pass_accuracy": rng.randint(82, 92),
                "fouls": away_fouls,
                "yellow_cards": away_yellow,
                "red_cards": away_red,
                "offsides": away_offsides,
                "corner_kicks": away_corners,
                "free_kicks": rng.randint(8, 18),
                "goal_kicks": rng.randint(5, 12),
                "saves": home_sog
            }
            home_stats["saves"] = away_sog

        # Enrich goals, bookings, subs if empty
        score_data = payload.setdefault("score", {})
        full_time = score_data.setdefault("fullTime", {})
        home_score = full_time.get("home") if full_time.get("home") is not None else 0
        away_score = full_time.get("away") if full_time.get("away") is not None else 0
        
        if payload.get("score", {}).get("fullTime", {}).get("home") is None:
            full_time["home"] = home_score
        if payload.get("score", {}).get("fullTime", {}).get("away") is None:
            full_time["away"] = away_score

        if (home_score > 0 or away_score > 0) and not payload.get("goals"):
            goals = []
            home_lineup_players = home_team_payload.get("lineup", [])
            away_lineup_players = away_team_payload.get("lineup", [])
            
            goal_minutes = sorted([rng.randint(5, 89) for _ in range(home_score + away_score)])
            
            home_count = 0
            away_count = 0
            for minute in goal_minutes:
                if home_count < home_score and (away_count >= away_score or rng.choice([True, False])):
                    scorer_player = rng.choice(home_lineup_players) if home_lineup_players else {"name": "Player H"}
                    assist_player = rng.choice(home_lineup_players) if home_lineup_players else None
                    if assist_player and assist_player["id"] == scorer_player["id"]:
                        assist_player = None
                    home_count += 1
                    goals.append({
                        "minute": minute,
                        "injuryTime": None,
                        "type": "REGULAR",
                        "team": {"id": home_team_payload.get("id", 1), "name": home_name},
                        "scorer": {"id": scorer_player.get("id"), "name": scorer_player.get("name")},
                        "assist": {"id": assist_player.get("id"), "name": assist_player.get("name")} if assist_player else None,
                        "score": {"home": home_count, "away": away_count}
                    })
                else:
                    scorer_player = rng.choice(away_lineup_players) if away_lineup_players else {"name": "Player A"}
                    assist_player = rng.choice(away_lineup_players) if away_lineup_players else None
                    if assist_player and assist_player["id"] == scorer_player["id"]:
                        assist_player = None
                    away_count += 1
                    goals.append({
                        "minute": minute,
                        "injuryTime": None,
                        "type": "REGULAR",
                        "team": {"id": away_team_payload.get("id", 2), "name": away_name},
                        "scorer": {"id": scorer_player.get("id"), "name": scorer_player.get("name")},
                        "assist": {"id": assist_player.get("id"), "name": assist_player.get("name")} if assist_player else None,
                        "score": {"home": home_count, "away": away_count}
                    })
            payload["goals"] = goals

        if not payload.get("bookings"):
            bookings = []
            home_lineup_players = home_team_payload.get("lineup", [])
            away_lineup_players = away_team_payload.get("lineup", [])
            
            num_bookings = rng.randint(2, 6)
            booking_minutes = sorted([rng.randint(10, 90) for _ in range(num_bookings)])
            
            for minute in booking_minutes:
                is_home = rng.choice([True, False])
                team_payload = home_team_payload if is_home else away_team_payload
                team_players = home_lineup_players if is_home else away_lineup_players
                
                if team_players:
                    player = rng.choice(team_players)
                    bookings.append({
                        "minute": minute,
                        "team": {"id": team_payload.get("id", 1 if is_home else 2), "name": team_payload.get("name")},
                        "player": {"id": player.get("id"), "name": player.get("name")},
                        "card": "YELLOW" if rng.random() > 0.1 else "RED"
                    })
            payload["bookings"] = bookings

        if not payload.get("substitutions"):
            subs = []
            home_lineup_players = home_team_payload.get("lineup", [])
            home_bench_players = home_team_payload.get("bench", [])
            away_lineup_players = away_team_payload.get("lineup", [])
            away_bench_players = away_team_payload.get("bench", [])
            
            num_subs = rng.randint(2, 5)
            sub_minutes = sorted([rng.randint(55, 88) for _ in range(num_subs)])
            
            for minute in sub_minutes:
                is_home = rng.choice([True, False])
                team_payload = home_team_payload if is_home else away_team_payload
                lineup_players = home_lineup_players if is_home else away_lineup_players
                bench_players = home_bench_players if is_home else away_bench_players
                
                if lineup_players and bench_players:
                    player_out = rng.choice(lineup_players)
                    player_in = rng.choice(bench_players)
                    
                    subs.append({
                        "minute": minute,
                        "team": {"id": team_payload.get("id", 1 if is_home else 2), "name": team_payload.get("name")},
                        "playerOut": {"id": player_out.get("id"), "name": player_out.get("name")},
                        "playerIn": {"id": player_in.get("id"), "name": player_in.get("name")}
                    })
            payload["substitutions"] = subs

        return payload


live_match_services = LiveMatchService()
