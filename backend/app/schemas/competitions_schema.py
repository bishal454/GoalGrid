from typing import List, Optional
from pydantic import BaseModel

class Area(BaseModel):
    id: int
    name: str
    code: str
    flag: Optional[str] = None

class SeasonWinner(BaseModel):
    id: int
    name: str
    shortName: Optional[str] = None
    tla: Optional[str] = None
    crest: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    founded: Optional[int] = None
    clubColors: Optional[str] = None
    venue: Optional[str] = None
    lastUpdated: Optional[str] = None

class Season(BaseModel):
    id: int
    startDate: str
    endDate: str
    currentMatchday: Optional[int] = None
    winner: Optional[SeasonWinner] = None
    stages: Optional[List[str]] = None

class Competition(BaseModel):
    id: int
    area: Area
    name: str
    code: str
    type: str
    emblem: Optional[str] = None
    currentSeason: Optional[Season] = None
    seasons: Optional[List[Season]] = None

class CompetitionsResponse(BaseModel):
    count: int
    filters: dict
    competitions: List[Competition]


class Player(BaseModel):
    id: int
    name: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    position: Optional[str] = None
    dateOfBirth: Optional[str] = None
    nationality: Optional[str] = None
    shirtNumber: Optional[int] = None
    marketValue: Optional[int] = None
    contract: Optional[dict] = None


class Coach(BaseModel):
    id: Optional[int] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    name: Optional[str] = None
    dateOfBirth: Optional[str] = None
    nationality: Optional[str] = None
    contract: Optional[dict] = None


class TeamBasic(BaseModel):
    id: int
    name: str
    shortName: Optional[str] = None
    tla: Optional[str] = None
    crest: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    founded: Optional[int] = None
    clubColors: Optional[str] = None
    venue: Optional[str] = None
    area: Optional[dict] = None
    runningCompetitions: Optional[List[dict]] = None
    coach: Optional[Coach] = None
    lastUpdated: Optional[str] = None


class TeamDetailedResponse(BaseModel):
    id: int
    name: str
    shortName: Optional[str] = None
    tla: Optional[str] = None
    crest: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    founded: Optional[int] = None
    clubColors: Optional[str] = None
    venue: Optional[str] = None
    area: Optional[dict] = None
    runningCompetitions: Optional[List[dict]] = None
    coach: Optional[Coach] = None
    squad: List[Player]
    staff: Optional[List[dict]] = None
    lastUpdated: Optional[str] = None


class CompetitionTeamsResponse(BaseModel):
    count: int
    filters: dict
    competition: dict
    season: dict
    teams: List[TeamBasic]

