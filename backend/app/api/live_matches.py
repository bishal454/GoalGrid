from fastapi import APIRouter, HTTPException, Query
from app.services.live_match_services import live_match_services
from app.schemas.live_matches_schema import LiveMatchFeedResponse
from app.db.vector_search import vector_search_manager
from app.services.team_matches_helper import fetch_team_matches, TEAM_ID_MAP

import asyncio

router = APIRouter(
    prefix="/api/v1/live-matches",
    tags=["live-matches"],
)

from datetime import datetime, timedelta, timezone
import random

TEAM_CRESTS = {
    "Arsenal": "https://crests.football-data.org/57.png",
    "Chelsea": "https://crests.football-data.org/61.png",
    "Liverpool": "https://crests.football-data.org/64.png",
    "Manchester City": "https://crests.football-data.org/65.png",
    "Man City": "https://crests.football-data.org/65.png",
    "Manchester United": "https://crests.football-data.org/66.png",
    "Tottenham Hotspur": "https://crests.football-data.org/73.png",
    "Aston Villa": "https://crests.football-data.org/58.png",
    "Newcastle United": "https://crests.football-data.org/67.png",
    "Real Madrid CF": "https://crests.football-data.org/86.png",
    "Real Madrid": "https://crests.football-data.org/86.png",
    "FC Barcelona": "https://crests.football-data.org/81.png",
    "Barcelona": "https://crests.football-data.org/81.png",
    "Club Atlético de Madrid": "https://crests.football-data.org/78.png",
    "Atletico Madrid": "https://crests.football-data.org/78.png",
    "Paris Saint-Germain FC": "https://crests.football-data.org/524.png",
    "PSG": "https://crests.football-data.org/524.png",
    "Paris Saint-Germain": "https://crests.football-data.org/524.png",
    "Bayern Munich": "https://crests.football-data.org/5.png",
    "FC Bayern München": "https://crests.football-data.org/5.png",
    "Germany": "https://crests.football-data.org/759.svg",
}

@router.get("/feed", response_model=LiveMatchFeedResponse)
async def get_live_match_feed(league: str = Query("PL")):
    """
    Retrieve current or recently completed match scores from football-data.org.
    """
    try:
        return await live_match_services.get_live_matches(league=league)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/teams")
async def get_league_teams(league: str = Query("PL")):
    """
    Retrieve the list of active teams for the selected league.
    """
    try:
        return await live_match_services.get_teams_by_league(league=league)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/match/{match_id}")
async def get_match_detail(match_id: str):
    """
    Retrieve detailed statistics, lineups, and events for a specific match.
    """
    try:
        return await live_match_services.get_match_detail(match_id)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/followed-upcoming")
async def get_followed_upcoming_matches(email: str = Query(...)):
    """
    Returns upcoming / recent matches for the user's followed teams.

    Strategy:
      1. Resolve the user's followed_teams list from MongoDB or the in-memory store.
      2. Map each team name to its football-data.org team ID via TEAM_ID_MAP.
      3. Call GET /v4/teams/{id}/matches concurrently for each team.
      4. Merge, de-duplicate by match id, and return sorted results.

    Falls back gracefully: teams whose ID is unknown are silently skipped.
    """
    email = email.strip().lower()

    # ── 1. Resolve followed teams ──────────────────────────────────────────────
    followed_teams: list = []

    if vector_search_manager.db is not None:
        try:
            users_col = vector_search_manager.db["users"]
            user = await users_col.find_one({"email": email})
            if user:
                followed_teams = user.get("followed_teams", [])
        except Exception:
            pass

    # If we do not have a user profile, return an empty result set.
    if not followed_teams:
        return {"matches": [], "followed_teams": []}

    # ── 2. Map team names to IDs ───────────────────────────────────────────────
    # Build a deduplicated list of (team_name, team_id) pairs we can actually query
    teams_to_query: list = []
    for team in followed_teams:
        team_id = TEAM_ID_MAP.get(team)
        if team_id:
            teams_to_query.append((team, team_id))
        else:
            # Fuzzy fallback: try lowercase partial match in the map
            lower = team.lower()
            for mapped_name, mapped_id in TEAM_ID_MAP.items():
                if lower in mapped_name.lower() or mapped_name.lower() in lower:
                    teams_to_query.append((team, mapped_id))
                    break
            # If still not found, log and skip silently

    if not teams_to_query:
        # No mappable teams — return empty gracefully
        return {"matches": [], "followed_teams": followed_teams}

    # ── 3. Sequential fetch for all teams with cache-miss delay ────────────────
    results_per_team = []
    for tname, tid in teams_to_query:
        is_cached = False
        if vector_search_manager.is_connected:
            try:
                cache_col = vector_search_manager.db["api_team_matches_cache"]
                cached = await cache_col.find_one({"cache_key": f"team_matches_{tid}"})
                if cached:
                    updated_at = datetime.fromisoformat(cached["updated_at"])
                    if datetime.now(timezone.utc) - updated_at < timedelta(hours=24):
                        is_cached = True
            except Exception:
                pass
        
        try:
            res = await fetch_team_matches(tid, tname)
            results_per_team.append(res)
        except Exception:
            results_per_team.append([])
            
        # Add delay on cache miss to avoid 429 rate limit
        if not is_cached:
            await asyncio.sleep(1.5)

    # ── 3b. Fetch future matches from schedule database ───────────────────────
    db_schedules = []
    try:
        db_schedules = await vector_search_manager.get_all_schedules()
    except Exception as e:
        pass

    followed_lower = [t.lower() for t in followed_teams]
    mapped_db_matches = []
    for s in db_schedules:
        home = s.get("home_team", "Home Team")
        away = s.get("away_team", "Away Team")
        if any(t in home.lower() or t in away.lower() for t in followed_lower):
            # Parse date/time to ISO-8601 string for sorting
            try:
                dt = datetime.strptime(f"{s.get('date')} {s.get('time')}", "%d %B %Y %H:%M")
                iso_date = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                iso_date = ""

            home_crest = TEAM_CRESTS.get(home) or ""
            away_crest = TEAM_CRESTS.get(away) or ""
            if not home_crest:
                for k, v in TEAM_CRESTS.items():
                    if k.lower() in home.lower() or home.lower() in k.lower():
                        home_crest = v
                        break
            if not away_crest:
                for k, v in TEAM_CRESTS.items():
                    if k.lower() in away.lower() or away.lower() in k.lower():
                        away_crest = v
                        break

            mapped_db_matches.append({
                "id": f"sched_{s.get('match_no')}",
                "homeTeam": home,
                "awayTeam": away,
                "homeCrest": home_crest,
                "awayCrest": away_crest,
                "homeScore": 0,
                "awayScore": 0,
                "minute": "",
                "isLive": False,
                "status": "SCHEDULED",
                "venue": s.get("venue") or "",
                "eventDate": iso_date or s.get("date") or "",
                "league": s.get("stage") or "Club Match",
                "league_code": "CL",
                "sourceName": "Schedule Database"
            })

    # ── 4. Merge & deduplicate ─────────────────────────────────────────────────
    seen_ids: set = set()
    merged: list = []

    # Blend DB scheduled matches first
    for match in mapped_db_matches:
        mid = match.get("id", "")
        if mid not in seen_ids:
            seen_ids.add(mid)
            merged.append(match)

    for team_matches in results_per_team:
        if isinstance(team_matches, Exception):
            continue
        for match in team_matches:
            mid = match.get("id", "")
            if mid not in seen_ids:
                seen_ids.add(mid)
                merged.append(match)

    # Sort overall: LIVE first, then UPCOMING (soonest), then FT (most recent)
    live_m     = [x for x in merged if x.get("status") in {"LIVE", "HALF"}]
    upcoming_m = sorted(
        [x for x in merged if x.get("status") in {"TIMED", "SCHEDULED"}],
        key=lambda x: x.get("eventDate", ""),
    )
    
    finished_m = sorted(
        [x for x in merged if x.get("status") == "FT"],
        key=lambda x: x.get("eventDate", ""), reverse=True,
    )

    final = live_m + upcoming_m + finished_m[:6]

    return {"matches": final, "followed_teams": followed_teams}
