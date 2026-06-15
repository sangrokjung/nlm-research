"""Thin process-runner around the `nlm` CLI and youtube_search.py (ADR-0013).

The GUI never reimplements pipeline logic; it shells out to the same tools the
CLI front-end uses and parses their (preferably --json) output. Every helper
returns plain dicts/lists so the web layer can serialize them directly.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from typing import Any

from . import config

# Force UTF-8 stdio in child processes. On Windows a piped child defaults to
# cp1252 and crashes when a tool prints non-Latin-1 chars (e.g. youtube_search
# emitting "→"). These env vars make children emit UTF-8 to match our decode.
_CHILD_ENV = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}


class ToolError(RuntimeError):
    """Raised when an underlying tool is missing or fails."""


def _run(cmd: list[str], timeout: int = 180) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
            env=_CHILD_ENV,
        )
    except FileNotFoundError as exc:  # tool not on PATH
        raise ToolError(f"Command not found: {cmd[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise ToolError(f"Timed out after {timeout}s: {' '.join(cmd)}") from exc


def _nlm_path() -> str:
    path = shutil.which("nlm")
    if not path:
        raise ToolError("`nlm` CLI not found on PATH. Install: uv tool install notebooklm-mcp-cli")
    return path


def nlm(*args: str, timeout: int = 180) -> dict[str, Any]:
    """Run an arbitrary `nlm` subcommand. Returns {ok, code, stdout, stderr}."""
    proc = _run([_nlm_path(), *args], timeout=timeout)
    return {
        "ok": proc.returncode == 0,
        "code": proc.returncode,
        "stdout": proc.stdout.strip(),
        "stderr": proc.stderr.strip(),
    }


def nlm_json(*args: str, timeout: int = 180) -> Any:
    """Run an `nlm` subcommand expected to emit JSON; parse and return it."""
    result = nlm(*args, timeout=timeout)
    if not result["ok"]:
        raise ToolError(result["stderr"] or result["stdout"] or f"nlm {' '.join(args)} failed")
    try:
        return json.loads(result["stdout"])
    except json.JSONDecodeError as exc:
        raise ToolError(f"Could not parse JSON from `nlm {' '.join(args)}`") from exc


# --- High-level helpers used by the API ------------------------------------

def auth_check() -> dict[str, Any]:
    """Map `nlm login --check` to a pill state (ok / stale)."""
    try:
        result = nlm("login", "--check", timeout=30)
    except ToolError as exc:
        return {"state": "error", "authenticated": False, "detail": str(exc)}
    return {
        "state": "ok" if result["ok"] else "stale",
        "authenticated": result["ok"],
        "detail": result["stdout"] or result["stderr"],
    }


def search_youtube(query: str, num: int = 10, newest_first: bool = False) -> list[dict[str, Any]]:
    """Run the shared youtube_search.py script and return parsed results."""
    if not config.YOUTUBE_SEARCH.exists():
        raise ToolError(f"Search script missing: {config.YOUTUBE_SEARCH}")
    cmd = [sys.executable, str(config.YOUTUBE_SEARCH), query, "-n", str(num), "--json"]
    if newest_first:
        cmd.append("-d")
    proc = _run(cmd, timeout=180)
    out = proc.stdout.strip()
    if not out:
        if proc.returncode != 0:
            raise ToolError(proc.stderr.strip() or "youtube search failed")
        return []
    try:
        return json.loads(out)
    except json.JSONDecodeError as exc:
        raise ToolError("Could not parse search results JSON") from exc


def list_notebooks() -> list[dict[str, Any]]:
    """Return notebooks via `nlm notebook list --json`."""
    data = nlm_json("notebook", "list", "--json")
    # Be tolerant of either a bare list or a wrapped object.
    if isinstance(data, dict):
        return data.get("notebooks") or data.get("items") or []
    return data if isinstance(data, list) else []
