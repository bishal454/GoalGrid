from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.vector_search import vector_search_manager

router = APIRouter(
    prefix="/api/v1/store",
    tags=["store"],
)

class ProductListing(BaseModel):
    title: str
    description: str
    price: float
    category: str
    image_url: str
    seller_email: str

class ProductDocument(BaseModel):
    product_id: str
    title: str
    description: str
    price: float
    category: str
    image_url: str
    seller_email: str
    created_at: str
    status: str

@router.post("/products", response_model=ProductDocument)
async def list_product(req: ProductListing):
    """List a new product on the marketplace."""
    if vector_search_manager.db is None:
        raise HTTPException(
            status_code=503,
            detail="Store service is unavailable. MongoDB connection required."
        )

    product_id = f"prod_{str(uuid.uuid4())[:8].upper()}"
    created_at = datetime.now(timezone.utc).isoformat()

    product_doc = {
        "product_id": product_id,
        "title": req.title,
        "description": req.description,
        "price": req.price,
        "category": req.category,
        "image_url": req.image_url,
        "seller_email": req.seller_email.lower().strip(),
        "created_at": created_at,
        "status": "AVAILABLE"
    }

    try:
        col = vector_search_manager.db["store_products"]
        await col.insert_one({**product_doc, "_id": product_id})
        return product_doc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list product: {str(exc)}"
        )

@router.get("/products", response_model=List[ProductDocument])
async def get_products(category: Optional[str] = None, q: Optional[str] = None):
    """Fetch available products from the marketplace."""
    if vector_search_manager.db is None:
        raise HTTPException(
            status_code=503,
            detail="Store service is unavailable. MongoDB connection required."
        )

    query = {"status": "AVAILABLE"}
    
    if category and category != "All":
        query["category"] = category
        
    if q:
        # Case insensitive search in title or description
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]

    try:
        col = vector_search_manager.db["store_products"]
        cursor = col.find(query, {"_id": 0}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        
        # If the database is completely empty (first run), let's optionally seed a few default items
        if len(docs) == 0 and not category and not q:
            default_products = [
                {
                    "product_id": "prod_DEFAULT1",
                    "title": "Official Player Edition Home Kit",
                    "description": "Premium breathable fit featuring complete player name & squad number prints.",
                    "price": 89.99,
                    "category": "Jerseys",
                    "image_url": "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=500&q=80",
                    "seller_email": "official_store@offside.ai",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "status": "AVAILABLE"
                },
                {
                    "product_id": "prod_DEFAULT2",
                    "title": "Knit Team Scarf & Beanie Cap Bundle",
                    "description": "Warm double-knit winter acrylic scarf adorned with official embroidered crests.",
                    "price": 24.99,
                    "category": "Accessories",
                    "image_url": "https://images.unsplash.com/photo-1542385151-efd9000785a0?w=500&q=80",
                    "seller_email": "official_store@offside.ai",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "status": "AVAILABLE"
                },
                {
                    "product_id": "prod_DEFAULT3",
                    "title": "Official Player Edition Away Kit",
                    "description": "Striking custom away pattern with dry-fit cooling ventilation fabric.",
                    "price": 84.99,
                    "category": "Jerseys",
                    "image_url": "https://images.unsplash.com/photo-1580087433276-857c5a0d3356?w=500&q=80",
                    "seller_email": "official_store@offside.ai",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "status": "AVAILABLE"
                }
            ]
            for p in default_products:
                await col.insert_one({**p, "_id": p["product_id"]})
            docs = default_products
            
        return docs
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve products: {str(exc)}"
        )

class BuyRequest(BaseModel):
    buyer_email: str

@router.post("/buy/{product_id}")
async def buy_product(product_id: str, req: BuyRequest):
    """Mark a product as sold."""
    if vector_search_manager.db is None:
        raise HTTPException(
            status_code=503,
            detail="Store service is unavailable. MongoDB connection required."
        )

    try:
        col = vector_search_manager.db["store_products"]
        result = await col.update_one(
            {"product_id": product_id, "status": "AVAILABLE"},
            {"$set": {"status": "SOLD", "buyer_email": req.buyer_email.lower().strip()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Product not available or already sold.")
        return {"status": "success", "message": "Product purchased successfully!"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process purchase: {str(exc)}"
        )
