from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.schemas.competitions_schema import (
    CompetitionsResponse,
    CompetitionTeamsResponse,
    TeamDetailedResponse
)
from app.schemas.standings_schema import CompetitionStandingsResponse
from app.services.competitions_service import competitions_service

router = APIRouter(
    prefix="/api/v1/competitions",
    tags=["competitions"]
)

teams_router = APIRouter(
    prefix="/api/v1/teams",
    tags=["teams"]
)

@router.get("/", response_model=CompetitionsResponse)
async def get_competitions(
    code: Optional[str] = Query(None, description="Filter competitions by league code (e.g. PL, CL, ELC)")
):
    """
    Fetch competitions data from football-data.org via CompetitionsService.
    Supports local filtering by league code.
    Does not provide any mock fallbacks in case of error.
    """
    try:
        return await competitions_service.fetch_competitions(code=code)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch competitions: {exc}"
        )

@router.get("/{code}/teams", response_model=CompetitionTeamsResponse)
async def get_competition_teams(code: str):
    """
    Fetch teams in a specific competition from football-data.org.
    Caches response in MongoDB for 10 days.
    """
    try:
        return await competitions_service.fetch_competition_teams(code=code)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch competition teams for '{code}': {exc}"
        )

@router.get("/{code}/standings", response_model=CompetitionStandingsResponse)
async def get_competition_standings(code: str):
    """
    Fetch standings for a specific competition from football-data.org.
    Caches response in MongoDB for 1 day.
    """
    try:
        return await competitions_service.fetch_competition_standings(code=code)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch standings for '{code}': {exc}"
        )

@teams_router.get("/directory/all", response_model=dict)
async def get_teams_directory():
    """
    Return a rich directory of teams with crests, clubColors, venue, founded year, flags, etc.
    This eliminates hardcoded crest mappings in the frontend.
    """
    try:
        return await competitions_service.get_teams_directory()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch teams directory: {exc}")

@teams_router.get("/by-name/{team_name}", response_model=TeamDetailedResponse)
async def get_team_by_name(team_name: str):
    """
    Fetch detailed team info by team name (lazy loading from frontend).
    Returns crest, area flag, clubColors, venue, coach, and squad list.
    """
    try:
        return await competitions_service.fetch_team_by_name(team_name=team_name)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail=f"Failed to fetch team info for {team_name}: {exc}")

@teams_router.get("/{team_id}", response_model=TeamDetailedResponse)
async def get_team_squad(team_id: int):
    """
    Fetch detailed team information and players squad list from football-data.org.
    Caches response in MongoDB for 10 days.
    """
    try:
        return await competitions_service.fetch_team_squad(team_id=team_id)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch squad for team {team_id}: {exc}"
        )
