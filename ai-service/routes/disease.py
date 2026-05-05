from __future__ import annotations

import base64
import os
import re
from io import BytesIO
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel, Field

from utils.disease_advisor import enhance_diagnosis
from utils.quota_manager import QuotaExceeded, ensure_quota_available, get_quota_status, increment_quota

router = APIRouter()

PLANTID_ENDPOINT = "https://api.plant.id/v3/health_assessment"


class DiseaseAnalyzeRequest(BaseModel):
    image_base64: str = Field(..., min_length=20)
    crop_type: str | None = None
    location: str | None = None
    language: str = "hindi"
    farmer_context: dict[str, Any] = {}


def _extract_base64(data_url: str) -> tuple[str, str]:
    match = re.match(r"^data:(image/(?:jpeg|png|webp));base64,(.+)$", data_url or "", re.DOTALL)
    if not match:
        raise HTTPException(status_code=400, detail="Sirf JPG, PNG, ya WebP photo bhejein.")

    return match.group(1), match.group(2).strip()


def _verify_image(image_base64: str) -> None:
    try:
        raw_bytes = base64.b64decode(image_base64, validate=True)
        Image.open(BytesIO(raw_bytes)).verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Photo clear image format mein nahi hai.") from exc


def _first(items: Any) -> dict[str, Any]:
    return items[0] if isinstance(items, list) and items and isinstance(items[0], dict) else {}


def _join_treatment(value: Any, fallback: str) -> str:
    if isinstance(value, list):
        clean_items = [str(item).strip() for item in value if str(item).strip()]
        return " ".join(clean_items) or fallback

    if isinstance(value, str) and value.strip():
        return value.strip()

    return fallback


def _safe_probability(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _to_percent(probability: Any) -> int:
    return max(0, min(round(_safe_probability(probability) * 100), 100))


def _fallback_hindi_name(name: str) -> str:
    known_names = {
        "apple scab": "सेब की खाज",
        "powdery mildew": "सफेद फफूंदी",
        "late blight": "लेट ब्लाइट",
        "early blight": "अर्ली ब्लाइट",
        "leaf spot": "पत्ती धब्बा",
        "rust": "रतुआ",
        "healthy": "स्वस्थ फसल",
    }
    return known_names.get((name or "").lower(), name or "अज्ञात बीमारी")


def _parse_diagnosis(data: dict[str, Any], request: DiseaseAnalyzeRequest) -> dict[str, Any]:
    result = data.get("result") or {}
    is_plant_probability = _safe_probability((result.get("is_plant") or {}).get("probability"))
    healthy_probability = _safe_probability((result.get("is_healthy") or {}).get("probability"))

    if is_plant_probability and is_plant_probability < 0.5:
        return {
            "status": "not_plant",
            "message": "Photo mein paudha clear nahi dikh raha.",
            "disease_name": "",
            "disease_name_hindi": "",
            "confidence": _to_percent(is_plant_probability),
            "description": "Photo clear nahi thi ya fasal ka hissa pehchaan mein nahi aaya.",
            "is_healthy": False,
            "health_probability": healthy_probability,
            "health_score": 0,
            "treatment": {
                "organic": "",
                "chemical": "",
                "prevention": "Aur paas se, acchi roshni mein, bimari wali jagah ki photo lein.",
            },
            "ai_generated_advice": "Patti, tana, ya phal ko frame ke beech mein rakhkar dobara photo kheechiye.",
        }

    disease_suggestion = _first(((result.get("disease") or {}).get("suggestions") or []))
    disease_probability = _safe_probability(disease_suggestion.get("probability"))

    if healthy_probability >= 0.7 and disease_probability < 0.45:
        plant_suggestion = _first(((result.get("classification") or {}).get("suggestions") or []))
        plant_name = plant_suggestion.get("name") or request.crop_type or "Fasal"
        return {
            "status": "healthy",
            "disease_name": "",
            "disease_name_hindi": "",
            "confidence": _to_percent(healthy_probability),
            "description": f"{plant_name} abhi swasth lag rahi hai.",
            "plant_name": plant_name,
            "is_healthy": True,
            "health_probability": healthy_probability,
            "health_score": _to_percent(healthy_probability),
            "treatment": {
                "organic": "Mitti mein nami santulit rakhein aur hafte mein ek baar pattiyan dekhte rahein.",
                "chemical": "Abhi chemical spray ki zaroorat nahi dikh rahi.",
                "prevention": "Paani jama na hone dein, khet saaf rakhein, aur nayi bimari ke daag par nazar rakhein.",
            },
            "ai_generated_advice": "Fasal swasth lag rahi hai. Roz 2-3 pattiyan check karein aur mausam badalne par fungal daag par nazar rakhein.",
        }

    if not disease_suggestion:
        return {
            "status": "error",
            "message": "Bimari pehchaan nahi hui.",
            "disease_name": "",
            "disease_name_hindi": "",
            "confidence": 0,
            "description": "Photo se pakki diagnosis nahi ban paayi.",
            "is_healthy": False,
            "health_probability": healthy_probability,
            "health_score": _to_percent(healthy_probability),
            "treatment": {
                "organic": "",
                "chemical": "",
                "prevention": "Bimari wali jagah ko paas se aur bina blur ke photo lein.",
            },
            "ai_generated_advice": "Dobara photo lein. Patti ka affected hissa, acchi roshni, aur plain background best rahega.",
        }

    details = disease_suggestion.get("details") or {}
    treatment = details.get("treatment") or {}
    disease_name = disease_suggestion.get("name") or "Unknown disease"
    local_name = details.get("local_name") or _fallback_hindi_name(disease_name)
    if str(local_name).strip().lower() == str(disease_name).strip().lower():
        local_name = _fallback_hindi_name(disease_name)
    description = details.get("description") or details.get("cause") or "Is bimari se fasal ki paidavar par asar pad sakta hai."

    normalized = {
        "status": "disease_found",
        "disease_name": disease_name,
        "disease_name_hindi": local_name,
        "confidence": _to_percent(disease_suggestion.get("probability")),
        "description": description,
        "is_healthy": False,
        "health_probability": healthy_probability,
        "health_score": _to_percent(healthy_probability),
        "treatment": {
            "organic": _join_treatment(
                treatment.get("biological") or treatment.get("organic"),
                "Neem tel ya bio-fungicide ka spray label ke hisaab se karein.",
            ),
            "chemical": _join_treatment(
                treatment.get("chemical"),
                "Krishi kendra se salah lekar registered fungicide/insecticide ka istemal karein.",
            ),
            "prevention": _join_treatment(
                treatment.get("prevention"),
                "Giri hui pattiyan hatao, khet mein hawa-dari rakho, aur paani jama na hone do.",
            ),
        },
        "plant_name": request.crop_type or "",
    }
    return normalized


async def _call_plantid(image_base64: str) -> dict[str, Any]:
    plantid_key = os.getenv("PLANTID_API_KEY")
    if not plantid_key or plantid_key == "your_key":
        raise HTTPException(
            status_code=503,
            detail="Plant.id API key missing hai. ai-service/.env mein PLANTID_API_KEY add karein.",
        )

    payload = {
        "images": [image_base64],
        "health": "all",
        "language": "en",
        "details": [
            "local_name",
            "description",
            "treatment",
            "cause",
            "classification",
        ],
    }
    headers = {
        "Api-Key": plantid_key,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(PLANTID_ENDPOINT, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


@router.get("/quota")
async def disease_quota_status():
    return get_quota_status()


@router.post("/analyze")
async def analyze_disease(request: DiseaseAnalyzeRequest):
    _mime_type, image_base64 = _extract_base64(request.image_base64)
    _verify_image(image_base64)

    try:
        quota_before = ensure_quota_available()
        plantid_data = await _call_plantid(image_base64)
        quota_after = increment_quota()
        print(f"Plant.id quota used: {quota_after['count']}/{quota_after['limit']}")
    except QuotaExceeded as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        detail = "Plant.id se diagnosis nahi aa paayi. Thodi der baad dobara koshish karein."
        if status in {401, 403}:
            detail = "Plant.id API key valid nahi lag rahi. Key check karein."
        if status == 429:
            detail = "Plant.id quota ya rate limit poori ho gayi. Kal dobara koshish karein."
        raise HTTPException(status_code=502, detail=detail) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Plant.id service se connection nahi ho paaya. Internet/API key check karein.",
        ) from exc

    diagnosis = _parse_diagnosis(plantid_data, request)
    farmer_context = {
        **(request.farmer_context or {}),
        "crop_type": request.crop_type,
        "location": request.location,
    }

    if diagnosis["status"] == "disease_found":
        advice = await enhance_diagnosis(diagnosis, farmer_context, request.language)
        diagnosis["ai_generated_advice"] = advice["advice"]
        diagnosis["ai_used"] = advice["ai_used"]
    else:
        diagnosis["ai_used"] = "fallback"

    diagnosis.update(
        {
            "crop_type": request.crop_type or "",
            "location": request.location or "",
            "quota": quota_after,
            "quota_warning": quota_after.get("warning", False),
            "quota_message": "Aaj ke scan limit khatam hone wale hain" if quota_after.get("warning") else "",
            "plantid_request_allowed": not quota_before.get("blocked", False),
        }
    )

    return diagnosis
