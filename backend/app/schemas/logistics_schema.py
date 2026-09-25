from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class FanProfile(BaseModel):
    fan_id: str
    name: str
    current_location: str
    ticket_id: str
    venue_id: str
    budget_usd: int
    accessibility_needs: List[str] = []
    preferred_modes: List[str] = []

class VenueProfile(BaseModel):
    venue_id: str
    name: str
    city: str
    emergency_access_routes: List[str]
    fan_ingress_peak: str
    capacity: int

class TransportOption(BaseModel):
    option_id: str
    venue_id: str
    mode: str
    origin_area: str
    eta_minutes: int
    cost_usd: int
    risk: str
    availability: str

class InventoryItem(BaseModel):
    venue_id: str
    item: str
    quantity: int
    reorder_threshold: int

class InventoryUpdateRequest(BaseModel):
    venue_id: str
    item: str
    delta: int
    reason: str
    approved: bool = False

class IncidentEscalationRequest(BaseModel):
    venue_id: str
    severity: str = Field(..., pattern="^(Critical|High|Medium|Low)$")
    category: str
    description: str
    owner: str
    approved: bool = False

class AgentActionLogRequest(BaseModel):
    action_type: str
    summary: str
    actor: str
    metadata: Optional[Dict[str, Any]] = None

class ToolActionResponse(BaseModel):
    status: str
    approval_required: bool = False
    message: str
    data: Dict[str, Any] = {}
