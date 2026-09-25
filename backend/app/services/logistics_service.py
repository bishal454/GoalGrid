import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from app.schemas.logistics_schema import (
    AgentActionLogRequest,
    FanProfile,
    IncidentEscalationRequest,
    InventoryItem,
    InventoryUpdateRequest,
    ToolActionResponse,
    TransportOption,
    VenueProfile,
)


class LogisticsService:
    def __init__(self) -> None:
        seed_path = Path(__file__).resolve().parents[1] / "data" / "logistics_seed.json"
        with seed_path.open("r", encoding="utf-8") as file:
            seed = json.load(file)

        self.fans = {item["fan_id"]: FanProfile(**item) for item in seed["fans"]}
        self.venues = {item["venue_id"]: VenueProfile(**item) for item in seed["venues"]}
        self.transport_options = [TransportOption(**item) for item in seed["transport_options"]]
        self.inventory = {
            (item["venue_id"], item["item"]): InventoryItem(**item)
            for item in seed["inventory"]
        }
        self.incidents: List[Dict[str, Any]] = []
        self.action_logs: List[Dict[str, Any]] = []

    def get_fan_profile(self, fan_id: str) -> FanProfile:
        if fan_id not in self.fans:
            raise KeyError(f"Fan profile not found: {fan_id}")
        return self.fans[fan_id]

    def get_venue_profile(self, venue_id: str) -> VenueProfile:
        if venue_id not in self.venues:
            raise KeyError(f"Venue not found: {venue_id}")
        return self.venues[venue_id]

    def get_transport_options(self, fan_id: str, venue_id: str) -> Dict[str, Any]:
        fan = self.get_fan_profile(fan_id)
        venue = self.get_venue_profile(venue_id)
        options = [
            option
            for option in self.transport_options
            if option.venue_id == venue_id and option.origin_area == fan.current_location
        ]

        ranked = sorted(
            options,
            key=lambda option: (
                option.cost_usd > fan.budget_usd,
                option.availability != "available",
                self._risk_rank(option.risk),
                option.eta_minutes,
            ),
        )

        return {
            "fan": fan.model_dump(),
            "venue": venue.model_dump(),
            "options": [option.model_dump() for option in ranked],
            "recommendation": ranked[0].model_dump() if ranked else None,
        }

    def update_inventory(self, request: InventoryUpdateRequest) -> ToolActionResponse:
        key = (request.venue_id, request.item)
        if key not in self.inventory:
            raise KeyError(f"Inventory item not found: {request.venue_id}/{request.item}")

        if not request.approved:
            return ToolActionResponse(
                status="approval_required",
                approval_required=True,
                message="Inventory updates change operational state and require user approval.",
                data={"proposed_update": request.model_dump()},
            )

        item = self.inventory[key]
        item.quantity = max(0, item.quantity + request.delta)
        self._append_action_log(
            "inventory_update",
            f"Updated {request.item} at {request.venue_id} by {request.delta}.",
            "Globus 2026",
            {"reason": request.reason, "inventory": item.model_dump()},
        )

        return ToolActionResponse(
            status="completed",
            message="Inventory update completed.",
            data={"inventory": item.model_dump()},
        )

    def escalate_incident(self, request: IncidentEscalationRequest) -> ToolActionResponse:
        self.get_venue_profile(request.venue_id)

        if not request.approved:
            return ToolActionResponse(
                status="approval_required",
                approval_required=True,
                message="Incident escalation notifies operations teams and requires user approval.",
                data={"proposed_escalation": request.model_dump()},
            )

        incident = {
            **request.model_dump(),
            "incident_id": f"incident_{len(self.incidents) + 1:03d}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "escalated",
        }
        self.incidents.append(incident)
        self._append_action_log(
            "incident_escalation",
            f"Escalated {request.severity} {request.category} incident at {request.venue_id}.",
            "Globus 2026",
            incident,
        )

        return ToolActionResponse(
            status="completed",
            message="Incident escalation completed.",
            data={"incident": incident},
        )

    def log_agent_action(self, request: AgentActionLogRequest) -> Dict[str, Any]:
        return self._append_action_log(
            request.action_type,
            request.summary,
            request.actor,
            request.metadata or {},
        )

    def get_state_snapshot(self) -> Dict[str, Any]:
        return {
            "fans": [fan.model_dump() for fan in self.fans.values()],
            "venues": [venue.model_dump() for venue in self.venues.values()],
            "inventory": [item.model_dump() for item in self.inventory.values()],
            "incidents": self.incidents,
            "action_logs": self.action_logs[-20:],
        }

    def _append_action_log(
        self,
        action_type: str,
        summary: str,
        actor: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        entry = {
            "log_id": f"log_{len(self.action_logs) + 1:03d}",
            "action_type": action_type,
            "summary": summary,
            "actor": actor,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.action_logs.append(entry)
        return entry

    def _risk_rank(self, risk: str) -> int:
        return {
            "Low": 0,
            "Medium": 1,
            "High": 2,
            "Critical": 3,
        }.get(risk, 4)


logistics_service = LogisticsService()
