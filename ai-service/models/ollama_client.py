from __future__ import annotations

import os
from typing import Optional

import httpx

from utils.prompts import build_messages, parse_ai_response

_resolved_model = None


async def resolve_model(client: httpx.AsyncClient, ollama_url: str, preferred_model: str) -> str:
    global _resolved_model
    if _resolved_model:
        return _resolved_model

    try:
        response = await client.get(f"{ollama_url}/api/tags")
        response.raise_for_status()
        names = [item.get("name") for item in response.json().get("models", []) if item.get("name")]
        if preferred_model in names:
            _resolved_model = preferred_model
        elif names:
            _resolved_model = names[0]
            print(
                f"Warning: Ollama model '{preferred_model}' not found. "
                f"Using local model '{_resolved_model}' instead."
            )
        else:
            _resolved_model = preferred_model
    except Exception:
        _resolved_model = preferred_model

    return _resolved_model


async def ask_ollama(
    prompt: str,
    language: str = "hindi",
    history: Optional[list[dict]] = None,
    farmer: Optional[dict] = None,
    price_info: Optional[str] = None,
) -> dict:
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    messages = build_messages(prompt, language=language, history=history, farmer=farmer, price_info=price_info)

    async with httpx.AsyncClient(timeout=75) as client:
        resolved_model = await resolve_model(client, ollama_url, model)
        payload = {
            "model": resolved_model,
            "messages": messages,
            "stream": False,
        }
        response = await client.post(f"{ollama_url}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content", "").strip()
        return parse_ai_response(content, language)
