from __future__ import annotations

import asyncio
import os
from typing import Optional

from models.gemini_client import ask_gemini
from models.ollama_client import ask_ollama


class AIRouterError(RuntimeError):
    pass


async def ask_ai(
    message: str,
    language: str = "hindi",
    history: Optional[list[dict]] = None,
    farmer: Optional[dict] = None,
    price_info: Optional[str] = None,
) -> dict:
    ai_mode = os.getenv("AI_MODE", "ollama").lower().strip()
    attempts = ["ollama", "gemini"] if ai_mode == "ollama" else ["gemini", "ollama"]
    failures: list[str] = []

    for provider in attempts:
        try:
            if provider == "ollama":
                payload = await ask_ollama(message, language, history, farmer, price_info)
                return {
                    "ai_used": "ollama",
                    "reply": payload["reply"],
                    "suggestions": payload.get("suggestions", []),
                    "offline_capable": True,
                }

            payload = await asyncio.to_thread(
                ask_gemini,
                message,
                language,
                history,
                farmer,
                price_info,
            )
            return {
                "ai_used": "gemini",
                "reply": payload["reply"],
                "suggestions": payload.get("suggestions", []),
                "offline_capable": False,
            }
        except Exception as exc:
            detail = str(exc) or exc.__class__.__name__
            failures.append(f"{provider}: {detail}")
            print(f"AI provider fallback: {provider} failed - {detail}")

    raise AIRouterError("; ".join(failures) or "No AI provider available.")
