from typing import List, Optional
from pydantic import BaseModel
from app.schemas.competitions_schema import TeamBasic

class TeamStandingItem(BaseModel):
    position: int
    team: TeamBasic
    playedGames: int
    form: Optional[str] = None
    won: int
    draw: int
    lost: int
    points: int
    goalsFor: int
    goalsAgainst: int
    goalDifference: int

class StandingsGroup(BaseModel):
    stage: str
    type: str
    group: Optional[str] = None
    table: List[TeamStandingItem]

class CompetitionStandingsResponse(BaseModel):
    filters: dict
    competition: dict
    season: dict
    standings: List[StandingsGroup]
