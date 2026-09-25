from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.agent_service import agent_service

router = APIRouter(
    prefix="/api/v1/agent",
    tags=["agent"],
)

class AgentChatRequest(BaseModel):
    email: str
    query: str
    lodging: str | None = None

class AgentPlanRequest(BaseModel):
    email: str
    prompt: str

@router.post("/chat")
async def chat_with_agent(req: AgentChatRequest):
    try:
        response = await agent_service.run_chat(req.email, req.query, req.lodging)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plan")
async def plan_journey_with_ai(req: AgentPlanRequest):
    try:
        response = await agent_service.run_planning(req.email, req.prompt)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

