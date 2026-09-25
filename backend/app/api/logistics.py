from fastapi import APIRouter, HTTPException, Query

from app.schemas.logistics_schema import (
    AgentActionLogRequest,
    FanProfile,
    IncidentEscalationRequest,
    InventoryUpdateRequest,
    ToolActionResponse,
)
from app.services.logistics_service import logistics_service

router = APIRouter(
    prefix="/api/v1/logistics",
    tags=["logistics"],
)


@router.get("/fans/{fan_id}", response_model=FanProfile)
async def get_fan_profile(fan_id: str):
    try:
        return logistics_service.get_fan_profile(fan_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/transport/options")
async def get_transport_options(
    fan_id: str = Query(...),
    venue_id: str = Query(...),
):
    try:
        return logistics_service.get_transport_options(fan_id=fan_id, venue_id=venue_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/inventory/update", response_model=ToolActionResponse)
async def update_inventory(request: InventoryUpdateRequest):
    try:
        return logistics_service.update_inventory(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/incidents/escalate", response_model=ToolActionResponse)
async def escalate_incident(request: IncidentEscalationRequest):
    try:
        return logistics_service.escalate_incident(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/action-log")
async def log_agent_action(request: AgentActionLogRequest):
    return logistics_service.log_agent_action(request)


@router.get("/state")
async def get_logistics_state():
    return logistics_service.get_state_snapshot()


@router.get("/stays")
async def get_stadium_stays(
    stadium: str,
    accommodation_type: str = "all",
    max_price: float = None,
    min_rating: float = None,
    required_amenities: str = None,
    sort_by: str = "price",
    check_in: str = None,
    check_out: str = None
):
    from app.mcp.stay_mcp_client import StayMCPClient
    client = StayMCPClient()
    try:
        await client.connect()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not connect to stays service: {exc}")
        
    try:
        amenities = []
        if required_amenities:
            amenities = [a.strip() for a in required_amenities.split(",") if a.strip()]
            
        arguments = {
            "stadium": stadium,
            "accommodation_type": accommodation_type,
            "sort_by": sort_by
        }
        if max_price is not None:
            arguments["max_price"] = max_price
        if min_rating is not None:
            arguments["min_rating"] = min_rating
        if amenities:
            arguments["required_amenities"] = amenities
        if check_in:
            arguments["check_in"] = check_in
        if check_out:
            arguments["check_out"] = check_out
            
        res = await client.call_tool("search_stays", arguments)
        return res
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        await client.disconnect()


@router.get("/directions")
async def get_route_directions(
    origin: str,
    destination: str,
    mode: str = "transit"
):
    from app.mcp.stay_mcp_client import StayMCPClient
    client = StayMCPClient()
    try:
        await client.connect()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not connect to route service: {exc}")
        
    try:
        arguments = {
            "origin": origin,
            "destination": destination,
            "mode": mode
        }
        res = await client.call_tool("get_directions", arguments)
        return res
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        await client.disconnect()

