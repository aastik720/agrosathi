from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any


class QuotaExceeded(RuntimeError):
    pass


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
STATE_FILE = DATA_DIR / "plantid_quota.json"


def _limits() -> tuple[int, int]:
    daily_limit = int(os.getenv("PLANTID_DAILY_LIMIT", "100"))
    warning_at = int(os.getenv("PLANTID_WARNING_AT", "95"))
    return daily_limit, warning_at


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _fresh_state() -> dict[str, Any]:
    return {"date": _today(), "count": 0}


def _read_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return _fresh_state()

    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return _fresh_state()

    if data.get("date") != _today():
        return _fresh_state()

    return {
        "date": data.get("date") or _today(),
        "count": int(data.get("count") or 0),
    }


def _write_state(state: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def get_quota_status() -> dict[str, Any]:
    daily_limit, warning_at = _limits()
    state = _read_state()
    count = int(state.get("count") or 0)

    return {
        "date": state["date"],
        "count": count,
        "limit": daily_limit,
        "remaining": max(daily_limit - count, 0),
        "warning": count >= warning_at,
        "blocked": count >= daily_limit,
    }


def ensure_quota_available() -> dict[str, Any]:
    status = get_quota_status()
    if status["blocked"]:
        raise QuotaExceeded("Aaj ke liye scan limit poori ho gayi. Kal dobara koshish karein.")
    return status


def increment_quota() -> dict[str, Any]:
    state = _read_state()
    state["count"] = int(state.get("count") or 0) + 1
    _write_state(state)
    return get_quota_status()
