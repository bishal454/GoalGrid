from typing import List, Optional, Any
from pydantic import BaseModel

class GoalDetail(BaseModel):
    minute: Optional[int] = None
    scorer: str
    type: str
    teamId: Optional[int] = None

class BookingDetail(BaseModel):
    minute: Optional[int] = None
    player: str
    card: str
    teamId: Optional[int] = None

class LiveMatchDocument(BaseModel):
    id: str
    homeTeam: str
    awayTeam: str
    homeCrest: Optional[str] = ""
    awayCrest: Optional[str] = ""
    homeScore: int
    awayScore: int
    minute: str
    isLive: bool
    status: str
    events: List[str]
    sourceName: str
    sourceUrl: str
    league: Optional[str] = ""
    venue: Optional[str] = ""
    eventDate: Optional[str] = ""
    goals: Optional[List[GoalDetail]] = []
    bookings: Optional[List[BookingDetail]] = []
    homeTeamId: Optional[int] = None
    awayTeamId: Optional[int] = None

class LiveMatchFeedResponse(BaseModel):
    matches: List[LiveMatchDocument]
    retrieved_at: str
    league: str
    league_label: str


# --- Detailed Match Response Schemas ---

class AreaSchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    flag: Optional[str] = None

class CompetitionSchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    emblem: Optional[str] = None

class CoachSchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    nationality: Optional[str] = None

class PlayerSchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    position: Optional[str] = None
    shirtNumber: Optional[int] = None

class StatisticsSchema(BaseModel):
    corner_kicks: Optional[int] = 0
    free_kicks: Optional[int] = 0
    goal_kicks: Optional[int] = 0
    offsides: Optional[int] = 0
    fouls: Optional[int] = 0
    ball_possession: Optional[int] = 50
    saves: Optional[int] = 0
    throw_ins: Optional[int] = 0
    shots: Optional[int] = 0
    shots_on_goal: Optional[int] = 0
    shots_off_goal: Optional[int] = 0
    yellow_cards: Optional[int] = 0
    yellow_red_cards: Optional[int] = 0
    red_cards: Optional[int] = 0

class TeamDetailSchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    shortName: Optional[str] = None
    tla: Optional[str] = None
    crest: Optional[str] = None
    coach: Optional[CoachSchema] = None
    formation: Optional[str] = None
    lineup: Optional[List[PlayerSchema]] = []
    bench: Optional[List[PlayerSchema]] = []
    statistics: Optional[StatisticsSchema] = None

class ScoreTimeSchema(BaseModel):
    home: Optional[int] = 0
    away: Optional[int] = 0

class ScoreSchema(BaseModel):
    winner: Optional[str] = None
    duration: Optional[str] = None
    fullTime: Optional[ScoreTimeSchema] = None
    halfTime: Optional[ScoreTimeSchema] = None

class TeamSummarySchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None

class ScorerSummarySchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None

class AssistSummarySchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None

class GoalSchema(BaseModel):
    minute: Optional[int] = None
    injuryTime: Optional[int] = None
    type: Optional[str] = "REGULAR"
    team: Optional[TeamSummarySchema] = None
    scorer: Optional[ScorerSummarySchema] = None
    assist: Optional[AssistSummarySchema] = None
    score: Optional[ScoreTimeSchema] = None

class BookingSchema(BaseModel):
    minute: Optional[int] = None
    team: Optional[TeamSummarySchema] = None
    player: Optional[ScorerSummarySchema] = None
    card: Optional[str] = "YELLOW"

class SubstitutionSchema(BaseModel):
    minute: Optional[int] = None
    team: Optional[TeamSummarySchema] = None
    playerOut: Optional[ScorerSummarySchema] = None
    playerIn: Optional[ScorerSummarySchema] = None

class RefereeSchema(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[str] = None
    nationality: Optional[str] = None

class SeasonSchema(BaseModel):
    id: Optional[int] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    currentMatchday: Optional[int] = None
    winner: Any = None
    stages: Optional[List[str]] = []

class OddsSchema(BaseModel):
    homeWin: Optional[float] = None
    draw: Optional[float] = None
    awayWin: Optional[float] = None

class MatchDetailResponseSchema(BaseModel):
    id: Any
    utcDate: Optional[str] = None
    status: Optional[str] = None
    minute: Optional[int] = None
    injuryTime: Optional[int] = None
    attendance: Optional[int] = None
    venue: Optional[str] = None
    matchday: Optional[int] = None
    stage: Optional[str] = None
    competition: Optional[CompetitionSchema] = None
    homeTeam: Optional[TeamDetailSchema] = None
    awayTeam: Optional[TeamDetailSchema] = None
    score: Optional[ScoreSchema] = None
    goals: Optional[List[GoalSchema]] = []
    bookings: Optional[List[BookingSchema]] = []
    substitutions: Optional[List[SubstitutionSchema]] = []
    referees: Optional[List[RefereeSchema]] = []
    season: Optional[SeasonSchema] = None
    odds: Optional[OddsSchema] = None
