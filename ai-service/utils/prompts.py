from __future__ import annotations

import json
import re
from typing import Optional


LANGUAGE_LABELS = {
    "hindi": "Hindi",
    "punjabi": "Punjabi",
    "pahadi": "Pahadi/Himachali Hindi",
    "english": "English",
}

DEFAULT_SUGGESTIONS = {
    "hindi": [
        "इसके लिए कौन सी दवा ठीक रहेगी?",
        "क्या यह बीमारी फैल सकती है?",
        "अभी खेत में क्या करना चाहिए?",
    ],
    "punjabi": [
        "ਇਸ ਲਈ ਕਿਹੜੀ ਦਵਾਈ ਠੀਕ ਰਹੇਗੀ?",
        "ਕੀ ਇਹ ਬਿਮਾਰੀ ਫੈਲ ਸਕਦੀ ਹੈ?",
        "ਹੁਣ ਖੇਤ ਵਿੱਚ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?",
    ],
    "pahadi": [
        "इसके लेई कौनसी दवाई ठीक रहू?",
        "क्या ये बीमारी फैल सकती?",
        "अब खेत में क्या करना चाइदा?",
    ],
    "english": [
        "Which treatment should I use?",
        "Can this spread to other plants?",
        "What should I do in the field today?",
    ],
}


def normalize_language(language: Optional[str]) -> str:
    if not language:
        return "hindi"
    language = language.lower().strip()
    return language if language in LANGUAGE_LABELS else "hindi"


def fallback_suggestions(language: Optional[str]) -> list[str]:
    return DEFAULT_SUGGESTIONS.get(normalize_language(language), DEFAULT_SUGGESTIONS["hindi"])


def build_system_prompt(language: Optional[str], farmer: Optional[dict] = None, price_info: Optional[str] = None) -> str:
    language = normalize_language(language)
    farmer = farmer or {}
    crops = farmer.get("crop_types") or []
    crop_text = ", ".join(crops) if isinstance(crops, list) and crops else "not provided"
    
    price_context = f"\nREAL MARKET DATA (TRUST THIS): {price_info}" if price_info else ""

    return (
        "You are AgroSaathi, an Indian farming assistant. "
        f"Reply in {LANGUAGE_LABELS[language]} with short, simple, practical advice. "
        "Use recent history for follow-up words like 'iske'. "
        "If unsure, ask for crop, location, and symptoms. "
        "Never invent prices or diagnosis certainty. "
        f"Farmer: location={farmer.get('location') or 'unknown'}, crops={crop_text}. "
        f"{price_context}"
        '\nPrefer JSON: {"reply":"answer","suggestions":["follow up 1","follow up 2","follow up 3"]}.'
    )


def build_messages(
    message: str,
    language: Optional[str] = "hindi",
    history: Optional[list[dict]] = None,
    farmer: Optional[dict] = None,
    price_info: Optional[str] = None,
) -> list[dict]:
    messages = [{"role": "system", "content": build_system_prompt(language, farmer, price_info)}]

    for item in (history or [])[-5:]:
        role = item.get("role")
        content = str(item.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message.strip()})
    return messages


def messages_to_text(messages: list[dict]) -> str:
    labels = {"system": "System", "user": "Farmer", "assistant": "AgroSaathi"}
    return "\n\n".join(
        f"{labels.get(item['role'], item['role'])}: {item['content']}" for item in messages
    )


def _extract_json_block(text: str) -> Optional[str]:
    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        return text

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    if fenced:
        return fenced.group(1)

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]

    return None


def parse_ai_response(text: str, language: Optional[str] = "hindi") -> dict:
    clean_text = (text or "").strip()
    suggestions = fallback_suggestions(language)

    json_block = _extract_json_block(clean_text)
    if json_block:
        try:
            data = json.loads(json_block)
            reply = str(data.get("reply") or "").strip()
            model_suggestions = [
                str(item).strip()
                for item in (data.get("suggestions") or [])
                if str(item).strip()
            ][:3]
            if reply:
                return {
                    "reply": reply,
                    "suggestions": model_suggestions or suggestions[:3],
                }
        except json.JSONDecodeError:
            pass

    return {
        "reply": clean_text or "Maaf kijiye, abhi jawab nahi ban paaya. Dobara poochhein.",
        "suggestions": suggestions[:3],
    }
