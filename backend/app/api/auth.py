import hashlib
import uuid
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.vector_search import vector_search_manager

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
)

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/signup")
async def signup(user_data: UserSignup):
    email = user_data.email.strip().lower()
    name = user_data.name.strip()
    password = user_data.password

    if not email or not name or not password:
        raise HTTPException(status_code=400, detail="Missing required signup details.")

    # 1. Store in MongoDB database
    if vector_search_manager.db is not None:
        try:
            users_col = vector_search_manager.db["users"]
            existing_user = await users_col.find_one({"email": email})
            if existing_user:
                raise HTTPException(status_code=400, detail="An account with this email already exists.")

            user_id = str(uuid.uuid4())
            hashed = hash_password(password)
            user_doc = {
                "id": user_id,
                "name": name,
                "email": email,
                "password": hashed,
            }
            await users_col.insert_one(user_doc)
            return {
                "id": user_id,
                "name": name,
                "email": email
            }
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(status_code=500, detail=f"Database error during signup: {str(exc)}")

    raise HTTPException(status_code=503, detail="Database unavailable. Signup is not available without MongoDB.")

@router.post("/login")
async def login(user_data: UserLogin):
    email = user_data.email.strip().lower()
    password = user_data.password

    # 1. Verify in MongoDB database
    if vector_search_manager.db is not None:
        try:
            users_col = vector_search_manager.db["users"]
            user = await users_col.find_one({"email": email})
            if not user:
                raise HTTPException(status_code=400, detail="Invalid email or password.")

            hashed = hash_password(password)
            if user["password"] != hashed:
                raise HTTPException(status_code=400, detail="Invalid email or password.")

            return {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(status_code=500, detail=f"Database error during login: {str(exc)}")

    raise HTTPException(status_code=503, detail="Database unavailable. Login is not available without MongoDB.")

class UserProfileUpdate(BaseModel):
    email: str
    followed_teams: List[str] = []
    favorite_players: List[str] = []
    country: str = ""
    city: str = ""
    stadium: str = ""
    street: str = ""

@router.put("/profile")
async def update_profile(profile: UserProfileUpdate):
    email = profile.email.strip().lower()

    # 1. Store profile details in MongoDB database
    if vector_search_manager.db is not None:
        try:
            users_col = vector_search_manager.db["users"]
            user = await users_col.find_one({"email": email})
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")

            await users_col.update_one(
                {"email": email},
                {"$set": {
                    "followed_teams": profile.followed_teams,
                    "favorite_players": profile.favorite_players,
                    "country": profile.country,
                    "city": profile.city,
                    "stadium": profile.stadium,
                    "street": profile.street,
                    "onboarded": True
                }}
            )
            return {"status": "success", "message": "Profile updated successfully."}
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(status_code=500, detail=f"Database error during profile update: {str(exc)}")

    raise HTTPException(status_code=503, detail="Database unavailable. Profile updates are not available without MongoDB.")

@router.get("/profile")
async def get_profile(email: str):
    email = email.strip().lower()

    if vector_search_manager.db is not None:
        try:
            users_col = vector_search_manager.db["users"]
            user = await users_col.find_one({"email": email})
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")
            return {
                "name": user.get("name", "User"),
                "followed_teams": user.get("followed_teams", []),
                "favorite_players": user.get("favorite_players", []),
                "country": user.get("country", ""),
                "city": user.get("city", ""),
                "stadium": user.get("stadium", ""),
                "street": user.get("street", ""),
                "onboarded": user.get("onboarded", False)
            }
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(status_code=500, detail=f"Database error during profile fetch: {str(exc)}")

    raise HTTPException(status_code=503, detail="Database unavailable. Profile data is not available without MongoDB.")
