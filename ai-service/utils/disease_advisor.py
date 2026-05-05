from __future__ import annotations

import asyncio
import os
from typing import Any

from models.gemini_client import ask_gemini
from models.ollama_client import ask_ollama


LANGUAGE_NAMES = {
    "hindi": "Hindi",
    "punjabi": "Punjabi",
    "pahadi": "Pahadi/Himachali Hindi",
    "english": "English",
}


def _normalize_language(language: str | None) -> str:
    language = (language or "hindi").lower().strip()
    return language if language in LANGUAGE_NAMES else "hindi"


def _fallback_advice(disease_data: dict[str, Any], language: str) -> str:
    disease = disease_data.get("disease_name_hindi") or disease_data.get("disease_name") or "bimari"
    organic = (disease_data.get("treatment") or {}).get("organic") or "Neem tel ya bio-fungicide ka halka spray karein."

    if language == "english":
        return (
            f"{disease} is suspected. Remove badly affected leaves, avoid overhead watering, "
            f"and start with this safer remedy: {organic} If symptoms spread, ask a local agriculture officer."
        )

    if language == "punjabi":
        return (
            f"{disease} ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਬਿਮਾਰ ਪੱਤੇ ਹਟਾਓ, ਉੱਪਰੋਂ ਪਾਣੀ ਨਾ ਪਾਓ, "
            f"ਅਤੇ ਪਹਿਲਾਂ ਇਹ ਉਪਾਇ ਕਰੋ: {organic} ਜੇ ਬਿਮਾਰੀ ਵਧੇ ਤਾਂ ਖੇਤੀ ਅਧਿਕਾਰੀ ਨੂੰ ਦਿਖਾਓ।"
        )

    return (
        f"{disease} ki sambhavna hai. Zyada bimar pattiyan hatao, upar se paani dena kam karo, "
        f"aur pehle yeh upay karo: {organic} Agar 3-4 din mein sudhar na dikhe to krishi adhikari se baat karein."
    )


def _build_prompt(disease_data: dict[str, Any], farmer_context: dict[str, Any], language: str) -> str:
    treatment = disease_data.get("treatment") or {}
    return f"""
You are AgroSaathi, a crop disease advisor for Indian farmers.
Reply in {LANGUAGE_NAMES.get(language, "Hindi")} using short, farmer-friendly language.

Crop: {farmer_context.get("crop_type") or disease_data.get("crop_type") or "not provided"}
Location: {farmer_context.get("location") or disease_data.get("location") or "not provided"}
Disease: {disease_data.get("disease_name") or "not identified"}
Local disease name: {disease_data.get("disease_name_hindi") or "not available"}
Confidence: {disease_data.get("confidence") or 0}%
Description: {disease_data.get("description") or "not available"}
Organic treatment: {treatment.get("organic") or "not available"}
Chemical treatment: {treatment.get("chemical") or "not available"}
Prevention: {treatment.get("prevention") or "not available"}

Give:
1. What this means in one simple sentence.
2. What the farmer should do today.
3. One safety note for chemical use.
4. When to ask a local agriculture expert.

Keep it under 90 words. Do not invent certainty beyond the confidence.
"""


async def _ask_with_preferred_model(prompt: str, language: str, farmer_context: dict[str, Any]) -> dict[str, Any]:
    ai_mode = os.getenv("AI_MODE", "ollama").lower().strip()

    if ai_mode == "ollama":
        try:
            payload = await ask_ollama(prompt, language=language, farmer=farmer_context)
            return {"reply": payload.get("reply", ""), "ai_used": "ollama"}
        except Exception:
            payload = await asyncio.to_thread(ask_gemini, prompt, language, None, farmer_context)
            return {"reply": payload.get("reply", ""), "ai_used": "gemini"}

    try:
        payload = await asyncio.to_thread(ask_gemini, prompt, language, None, farmer_context)
        return {"reply": payload.get("reply", ""), "ai_used": "gemini"}
    except Exception:
        payload = await ask_ollama(prompt, language=language, farmer=farmer_context)
        return {"reply": payload.get("reply", ""), "ai_used": "ollama"}


async def enhance_diagnosis(
    disease_data: dict[str, Any],
    farmer_context: dict[str, Any] | None = None,
    language: str = "hindi",
) -> dict[str, str]:
    language = _normalize_language(language)
    farmer_context = farmer_context or {}
    prompt = _build_prompt(disease_data, farmer_context, language)

    try:
        payload = await _ask_with_preferred_model(prompt, language, farmer_context)
        reply = (payload.get("reply") or "").strip()
        if reply:
            return {
                "advice": reply,
                "ai_used": payload.get("ai_used") or "unknown",
            }
    except Exception as exc:
        print(f"Disease advice AI fallback used: {exc}")

    return {
        "advice": _fallback_advice(disease_data, language),
        "ai_used": "fallback",
    }
