from typing import List, Optional

from pydantic import BaseModel, Field


class QuestionRequest(BaseModel):
    query: str = Field(..., example="When is the final match and where is it played?")


class SourceDocument(BaseModel):
    match_no: int
    stage: str
    date: str
    time: str
    home_team: str
    away_team: str
    venue: str
    city: str
    country: str


class QuestionResponse(BaseModel):
    query: str
    answer: str
    sources: List[SourceDocument]
    model_used: str


class LeagueStandingRow(BaseModel):
    position: int
    team_name: str
    short_name: Optional[str] = None
    tla: Optional[str] = None
    crest: Optional[str] = None
    played_games: int
    form: Optional[str] = None
    won: int
    draw: int
    lost: int
    points: int
    goals_for: int
    goals_against: int
    goal_difference: int


class LeagueTable(BaseModel):
    code: str
    label: str
    emblem: Optional[str] = None
    country: Optional[str] = None
    updated_at: str
    source: str
    rows: List[LeagueStandingRow]


class LeagueTablesResponse(BaseModel):
    generated_at: str
    tables: List[LeagueTable]


class JourneyMatch(BaseModel):
    id: str
    league_code: str
    league_label: str
    stage: str
    status: str
    utc_date: str
    local_date: str
    local_time: str
    home_team: str
    away_team: str
    home_crest: Optional[str] = None
    away_crest: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    source: str


class JourneyFeedResponse(BaseModel):
    generated_at: str
    scope: str
    league: Optional[str] = None
    matches: List[JourneyMatch]
