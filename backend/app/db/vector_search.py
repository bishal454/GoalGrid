import os
import logging
import math
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("offside_ai.vector_search")

# Environment configurations
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "offside_ai")
APP_MODE = os.getenv("APP_MODE", "club")
COLLECTION_NAME = "club_2026_schedule" if APP_MODE == "club" else "fifa_2026_schedule"


class VectorSearchManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        self.is_connected = False
        
        if MONGODB_URI:
            try:
                self.client = AsyncIOMotorClient(MONGODB_URI)
                self.db = self.client[DB_NAME]
                self.collection = self.db[COLLECTION_NAME]
                self.is_connected = True
                logger.info("Successfully initialized MongoDB Atlas connection.")
            except Exception as e:
                logger.error("Error initializing MongoDB Client: %s. MongoDB connection unavailable.", e)
        else:
            logger.info("MONGODB_URI not provided. MongoDB connection unavailable.")

    async def search_similar_schedules(self, query_vector: List[float], query_text: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Executes a vector search query against MongoDB Atlas Vector Search.
        """
        if self.is_connected and query_vector:
            try:
                # MongoDB Atlas Vector Search Aggregation Pipeline
                pipeline = [
                    {
                        "$vectorSearch": {
                            "index": "vector_index", # Atlas Vector Search Index Name
                            "path": "embedding",
                            "queryVector": query_vector,
                            "numCandidates": limit * 10,
                            "limit": limit
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "match_no": 1,
                            "stage": 1,
                            "date": 1,
                            "time": 1,
                            "home_team": 1,
                            "away_team": 1,
                            "venue": 1,
                            "city": 1,
                            "country": 1,
                            "score": {"$meta": "vectorSearchScore"}
                        }
                    }
                ]
                cursor = self.collection.aggregate(pipeline)
                results = await cursor.to_list(length=limit)
                if results:
                    return results
            except Exception as e:
                logger.error(f"MongoDB Vector Search aggregation failed: {e}.")
                raise RuntimeError("MongoDB Vector Search aggregation failed.")

        raise RuntimeError("MongoDB is not connected; schedule similarity search is unavailable.")

    async def get_all_schedules(self) -> List[Dict[str, Any]]:
        """
        Returns all schedule data for the listing view.
        """
        if not self.is_connected:
            raise RuntimeError("MongoDB is not connected; schedule feed is unavailable.")

        try:
            cursor = self.collection.find({}, {"_id": 0, "embedding": 0})
            results = await cursor.to_list(length=100)
            return results
        except Exception as e:
            logger.error(f"Failed to fetch schedules from MongoDB: {e}")
            raise RuntimeError("Failed to fetch schedules from MongoDB.")

vector_search_manager = VectorSearchManager()
