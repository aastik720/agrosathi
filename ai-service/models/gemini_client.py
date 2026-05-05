from __future__ import annotations

import os
from typing import Optional

import google.generativeai as genai

from utils.prompts import build_messages, messages_to_text, parse_ai_response


def ask_gemini(
    prompt: str,
    language: str = "hindi",
    history: Optional[list[dict]] = None,
    farmer: Optional[dict] = None,
    price_info: Optional[str] = None,
) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key":
        raise RuntimeError("GEMINI_API_KEY is missing.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-flash-lite-latest")
    messages = build_messages(prompt, language=language, history=history, farmer=farmer, price_info=price_info)
    response = model.generate_content(messages_to_text(messages))
    return parse_ai_response(response.text.strip(), language)
