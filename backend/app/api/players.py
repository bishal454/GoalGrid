import os
import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(
    prefix="/api/v1/players",
    tags=["players"],
)

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
API_KEY = os.getenv("FOOTBALL_DATA_API_KEY", "")


async def _football_data_get(path: str) -> dict:
    """Helper to call football-data.org API."""
    headers = {"X-Auth-Token": API_KEY} if API_KEY else {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{FOOTBALL_DATA_BASE}{path}", headers=headers)
        if resp.status_code == 200:
            return resp.json()
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"football-data.org returned {resp.status_code} for {path}"
        )


@router.get("/search")
async def search_player_by_name(name: str = Query(..., description="Player name to look up")):
    """
    Search for a player by name using football-data.org.
    Returns player profile including position, nationality, current team, and shirt number.
    Falls back to a curated lookup for famous players if API key is absent.
    """
    # Famous player ID lookup (fallback if no API key or for common names)
    FAMOUS_PLAYERS: dict[str, int] = {
        "cristiano ronaldo": 44,
        "ronaldo": 44,
        "lionel messi": 617,
        "messi": 617,
        "neymar": 2747,
        "kylian mbappe": 342141,
        "mbappe": 342141,
        "erling haaland": 396517,
        "haaland": 396517,
        "kevin de bruyne": 3413,
        "de bruyne": 3413,
        "luka modric": 2714,
        "modric": 2714,
        "mohamed salah": 114166,
        "salah": 114166,
        "virgil van dijk": 3655,
        "van dijk": 3655,
        "robert lewandowski": 794,
        "lewandowski": 794,
        "harry kane": 154,
        "kane": 154,
        "vinicius junior": 462023,
        "vinicius": 462023,
        "marcus rashford": 182183,
        "rashford": 182183,
        "bukayo saka": 514000,
        "saka": 514000,
        "jude bellingham": 611803,
        "bellingham": 611803,
        "pedri": 463010,
        "gavi": 462826,
    }

    name_lower = name.strip().lower()

    # Try to find player ID from famous list
    player_id: int | None = None
    for key, pid in FAMOUS_PLAYERS.items():
        if key in name_lower or name_lower in key:
            player_id = pid
            break

    if player_id is None and API_KEY:
        # If no match from lookup and we have an API key, try searching
        # football-data.org v4 doesn't have a general person search endpoint so we
        # return a helpful placeholder
        raise HTTPException(
            status_code=404,
            detail=f"Player '{name}' not found in database. Try a famous player name like 'Messi', 'Ronaldo', 'Mbappe'."
        )

    if player_id is None:
        raise HTTPException(
            status_code=404,
            detail=f"Player '{name}' not found. Try: Messi, Ronaldo, Mbappe, Haaland, Salah, Kane, Bellingham..."
        )

    try:
        data = await _football_data_get(f"/persons/{player_id}")
        current_team = data.get("currentTeam") or {}
        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "firstName": data.get("firstName"),
            "lastName": data.get("lastName"),
            "dateOfBirth": data.get("dateOfBirth"),
            "nationality": data.get("nationality"),
            "position": data.get("position"),
            "shirtNumber": data.get("shirtNumber"),
            "currentTeam": {
                "name": current_team.get("name"),
                "shortName": current_team.get("shortName"),
                "crest": current_team.get("crest"),
                "venue": current_team.get("venue"),
                "founded": current_team.get("founded"),
                "clubColors": current_team.get("clubColors"),
            } if current_team else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch player data: {e}")


@router.get("/{player_id}")
async def get_player_by_id(player_id: int):
    """
    Fetch a player directly by their football-data.org person ID.
    """
    try:
        data = await _football_data_get(f"/persons/{player_id}")
        current_team = data.get("currentTeam") or {}
        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "firstName": data.get("firstName"),
            "lastName": data.get("lastName"),
            "dateOfBirth": data.get("dateOfBirth"),
            "nationality": data.get("nationality"),
            "position": data.get("position"),
            "shirtNumber": data.get("shirtNumber"),
            "currentTeam": {
                "name": current_team.get("name"),
                "shortName": current_team.get("shortName"),
                "crest": current_team.get("crest"),
                "venue": current_team.get("venue"),
                "founded": current_team.get("founded"),
                "clubColors": current_team.get("clubColors"),
            } if current_team else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch player {player_id}: {e}")
