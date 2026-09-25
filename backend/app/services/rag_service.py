import os
import logging
from typing import Dict, Any, List
from app.db.vector_search import vector_search_manager

logger = logging.getLogger("offside_ai.rag_service")

# Try imports for Vertex AI
try:
    import vertexai
    from vertexai.generative_models import GenerativeModel
    from vertexai.language_models import TextEmbeddingModel
    HAS_VERTEX_AI = True
except Exception as e:
    logger.warning(f"Failed to import vertexai: {e}")
    HAS_VERTEX_AI = False

# Try imports for Google Generative AI (AI Studio)
try:
    import google.generativeai as genai
    HAS_GENAI = True
except Exception as e:
    logger.warning(f"Failed to import google.generativeai: {e}")
    HAS_GENAI = False

# GCP Project details
PROJECT_ID = os.getenv("GCP_PROJECT")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")

class RAGService:
    def __init__(self):
        self.vertex_initialized = False
        self.genai_initialized = False
        self.embedding_model = None
        self.llm_model = None

        # Check standard AI Studio API Key first (primary developer key)
        api_key = os.getenv("GEMINI_API_KEY")
        model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")
        if HAS_GENAI and api_key:
            try:
                genai.configure(api_key=api_key)
                self.llm_model = genai.GenerativeModel(model_name)
                self.genai_initialized = True
                logger.info(f"Successfully initialized Google AI Studio client (Gemini SDK) with model {model_name}.")
            except Exception as e:
                logger.error(f"Failed to initialize Google AI Studio client: {e}")

        # Fallback to GCP Vertex AI if AI Studio is not configured
        if not self.genai_initialized and HAS_VERTEX_AI and PROJECT_ID:
            try:
                vertexai.init(project=PROJECT_ID, location=LOCATION)
                self.embedding_model = TextEmbeddingModel.from_pretrained("text-embedding-004")
                self.llm_model = GenerativeModel(model_name)
                self.vertex_initialized = True
                logger.info("Successfully initialized GCP Vertex AI client.")
            except Exception as e:
                logger.error(f"Failed to initialize Vertex AI client: {e}. Falling back to mock RAG.")

        if not self.genai_initialized and not self.vertex_initialized:
            logger.info("GCP_PROJECT and GEMINI_API_KEY not configured. Running in Local Mock RAG Mode.")

    def _get_embedding(self, text: str) -> List[float]:
        """
        Generates 768-dimension embeddings using Vertex AI or Google AI Studio.
        """
        if self.genai_initialized:
            try:
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_query"
                )
                return result["embedding"]
            except Exception as e:
                logger.error(f"Google AI Studio embedding generation failed: {e}")

        if self.vertex_initialized and self.embedding_model:
            try:
                embeddings = self.embedding_model.get_embeddings([text])
                return embeddings[0].values
            except Exception as e:
                logger.error(f"Vertex AI embedding generation failed: {e}")
        return []

    async def answer_schedule_query(self, query: str) -> Dict[str, Any]:
        """
        Answers schedule queries using RAG (Retrieval-Augmented Generation).
        """
        # 1. Embed query
        query_vector = self._get_embedding(query)

        # 2. Retrieve top matching schedules
        retrieved_docs = await vector_search_manager.search_similar_schedules(
            query_vector=query_vector,
            query_text=query,
            limit=3
        )

        # 3. Generate response
        if (self.genai_initialized or self.vertex_initialized) and self.llm_model:
            try:
                # Build context string
                context = "\n".join([
                    f"Match {doc['match_no']}: {doc['home_team']} vs {doc['away_team']} on {doc['date']} at {doc['time']} "
                    f"({doc['venue']}, {doc['city']}, {doc['country']}) - Stage: {doc['stage']}"
                    for doc in retrieved_docs
                ])

                # Construct prompt
                from app.db.vector_search import APP_MODE
                mode_name = "Club Football Leagues" if APP_MODE == "club" else "FIFA World Cup 2026"
                prompt = (
                    f"You are the Offside AI assistant for {mode_name}.\n"
                    f"Answer the user's question about the match schedule based ONLY on the verified schedule context below.\n"
                    f"If the answer is not in the context, politely state that you do not have that schedule information.\n\n"
                    f"--- VERIFIED SCHEDULE CONTEXT ---\n{context}\n\n"
                    f"User Query: {query}\n"
                    f"AI Answer:"
                )

                response = self.llm_model.generate_content(prompt)
                model_used = "Gemini 1.5 Pro (Google AI Studio)" if self.genai_initialized else "Gemini 1.5 Pro (Vertex AI)"
                return {
                    "query": query,
                    "answer": response.text.strip(),
                    "sources": retrieved_docs,
                    "model_used": f"{model_used} - {mode_name}"
                }
            except Exception as e:
                logger.error(f"Generative AI Generation failed: {e}.")

        raise RuntimeError(
            "RAG service is unavailable. Configure GEMINI_API_KEY or GCP_PROJECT with Vertex AI credentials."
        )


rag_service = RAGService()
