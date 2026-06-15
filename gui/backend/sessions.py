"""Local session state shared with the CLI front-end (ADR-0003).

Writes the same ~/research-output/ files the skill uses so a GUI-started session
shows up in `/research status` and vice versa.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def slug(topic: str) -> str:
    return (topic or "research").strip().replace(" ", "-")


def topic_dir(topic: str) -> Path:
    path = config.OUTPUT_DIR / slug(topic)
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_last_session(data: dict[str, Any]) -> None:
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (config.OUTPUT_DIR / "last_session.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def append_session(data: dict[str, Any]) -> None:
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(config.OUTPUT_DIR / "research_sessions.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(data, ensure_ascii=False) + "\n")


def read_last_session() -> dict[str, Any]:
    path = config.OUTPUT_DIR / "last_session.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
