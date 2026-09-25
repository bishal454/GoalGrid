from fastapi import APIRouter, HTTPException
from typing import List
from app.db.vector_search import vector_search_manager
from app.services.rag_service import rag_service
from app.schemas.schedule_schema import QuestionRequest, SourceDocument, QuestionResponse

router = APIRouter(
    prefix="/api/v1/schedule",
    tags=["schedule"]
)

@router.get("/feed", response_model=List[SourceDocument])
async def get_schedule_feed():
    """
    Get the complete FIFA 2026 World Cup schedule feed.
    """
    try:
        schedules = await vector_search_manager.get_all_schedules()
        return schedules
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask", response_model=QuestionResponse)
async def ask_schedule_question(request: QuestionRequest):
    """
    Ask a natural language question about the FIFA 2026 World Cup schedule.
    Uses RAG (Retrieval-Augmented Generation) behind the scenes.
    """
    try:
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        result = await rag_service.answer_schedule_query(request.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
