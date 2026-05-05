from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from models.ai_router import AIRouterError, ask_ai

router = APIRouter()


def dump_model(item: BaseModel) -> dict:
    return item.model_dump() if hasattr(item, "model_dump") else item.dict()


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = "hindi"
    history: list[ChatHistoryItem] = []
    farmer: dict = {}
    is_voice: bool = False
    session_id: Optional[str] = None


import httpx
import os
from utils.price_advisor import get_price_advice

PRICE_KEYWORDS = ["bhav", "price", "daam", "rate", "mandi", "bechna", "price", "market"]

@router.post("/message")
@router.post("/voice")
async def chat_with_farmer(request: ChatRequest):
    try:
        # Detect if it's a price query
        message_lower = request.message.lower()
        is_price_query = any(keyword in message_lower for keyword in PRICE_KEYWORDS)
        
        price_info = None
        if is_price_query:
            # Try to identify crop from profile or message
            commodity = "Apple"
            crops = request.farmer.get("crop_types", [])
            if crops and len(crops) > 0:
                commodity = crops[0]
            
            # Simple keyword matching for crop identification
            for crop in ["apple", "seb", "aloo", "potato", "wheat", "gehu", "rice", "chawal"]:
                if crop in message_lower:
                    commodity = crop.capitalize()
                    break
            
            state = request.farmer.get("location", "Himachal Pradesh").split(",")[-1].strip()
            
            # Call Node.js server for data
            async with httpx.AsyncClient() as client:
                try:
                    server_url = os.getenv("SERVER_URL", "http://localhost:5000")
                    res = await client.get(f"{server_url}/api/market/prices?commodity={commodity}&state={state}")
                    if res.status_code == 200:
                        market_data = res.json().get("records", [])
                        price_info = get_price_advice(commodity, state, market_data, language=request.language)
                except Exception as e:
                    print(f"Error fetching market data for AI: {e}")

        response = await ask_ai(
            request.message,
            language=request.language,
            history=[dump_model(item) for item in request.history],
            farmer=request.farmer,
            price_info=price_info
        )

        return {
            "mode": response["ai_used"],
            "ai_used": response["ai_used"],
            "language": request.language,
            "reply": response["reply"],
            "suggestions": response.get("suggestions", []),
            "offline_capable": response.get("offline_capable", False),
        }
    except AIRouterError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
