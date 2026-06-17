"""Local session state shared with the CLI front-end (ADR-0003).

Writes the same ~/research-output/ files the skill uses so a GUI-started session
shows up in `/research status` and vice versa.
"""
from __future__ import annotations

import json
import re
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


# --- Source-URL sidecar (recover real video links nlm doesn't return) -------

def norm_title(title: str) -> str:
    """Normalize a source title for keying: lowercase, trim, collapse whitespace."""
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def _source_urls_path(topic: str) -> Path:
    return config.OUTPUT_DIR / slug(topic) / "source_urls.json"


def write_source_urls(topic: str, mapping: dict[str, str]) -> None:
    """Merge {normalized title -> url} into the per-topic sidecar (never clobbers
    other entries; creates the file if absent)."""
    if not mapping:
        return
    path = _source_urls_path(topic)
    existing: dict[str, Any] = {}
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing = {}
    existing.update(mapping)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")


def read_source_urls(topic: str) -> dict[str, str]:
    path = _source_urls_path(topic)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def topic_for_notebook(notebook_id: str) -> str | None:
    """Resolve a notebook's topic from the session files (last_session first, then
    the most recent matching record in research_sessions.jsonl)."""
    last = read_last_session()
    if last.get("notebook_id") == notebook_id and last.get("topic"):
        return last["topic"]
    path = config.OUTPUT_DIR / "research_sessions.jsonl"
    if not path.exists():
        return None
    found = None
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("notebook_id") == notebook_id and rec.get("topic"):
                found = rec["topic"]  # keep scanning so the latest wins
    except OSError:
        return found
    return found
