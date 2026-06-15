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
import time
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


def _extract_id(data: Any) -> str | None:
    if isinstance(data, dict):
        return data.get("id") or data.get("notebook_id") or data.get("notebookId")
    return None


def notebook_summary(notebook_id: str) -> dict[str, Any]:
    """Find a notebook's row (with source_count) in the list output."""
    for nb in list_notebooks():
        if (nb.get("id") or nb.get("notebook_id") or nb.get("notebookId")) == notebook_id:
            return nb
    return {}


# --- Collect ---------------------------------------------------------------

def create_notebook(title: str) -> dict[str, Any]:
    data = nlm_json("notebook", "create", title, "--json", timeout=60)
    return {"notebook_id": _extract_id(data), "title": title, "raw": data}


def add_sources(notebook_id: str, urls: list[str], wait: bool = True,
                wait_timeout: int = 300) -> dict[str, Any]:
    """Add URLs/YouTube links to a notebook (bulk, with repeated flags)."""
    args = ["source", "add", notebook_id]
    for url in urls:
        if "youtube.com" in url or "youtu.be" in url:
            args += ["--youtube", url]
        else:
            args += ["--url", url]
    if wait:
        args += ["--wait", "--wait-timeout", str(wait_timeout)]
    return nlm(*args, timeout=wait_timeout + 60)


# --- Analyze ---------------------------------------------------------------

def create_report(notebook_id: str, report_format: str = "Briefing Doc",
                  language: str = "en", timeout: int = 600) -> dict[str, Any]:
    # Note: `nlm report create` returns as soon as generation STARTS (async),
    # so callers must poll wait_for_artifact() before downloading.
    return nlm("report", "create", notebook_id,
               "--format", report_format, "--language", language, "-y", timeout=timeout)


def studio_status(notebook_id: str, timeout: int = 30) -> list[dict[str, Any]]:
    """Return Studio artifacts (`nlm studio status` emits JSON)."""
    res = nlm("studio", "status", notebook_id, timeout=timeout)
    if not res["ok"]:
        return []
    try:
        data = json.loads(res["stdout"])
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return data
    return data.get("artifacts", []) if isinstance(data, dict) else []


def wait_for_artifact(notebook_id: str, artifact_type: str = "report",
                      max_wait: int = 240, interval: int = 6) -> dict[str, Any]:
    """Poll studio status until the given artifact type completes/fails/times out."""
    waited = 0
    while waited <= max_wait:
        for art in studio_status(notebook_id):
            if art.get("type") == artifact_type:
                st = art.get("status")
                if st in ("completed", "failed"):
                    return {"status": st, "id": art.get("id")}
        time.sleep(interval)
        waited += interval
    return {"status": "timeout", "id": None}


def query_notebook(notebook_id: str, question: str, timeout: int = 180) -> dict[str, Any]:
    res = nlm("query", "notebook", notebook_id, question, "--json", timeout=timeout)
    if not res["ok"]:
        raise ToolError(res["stderr"] or res["stdout"] or "query failed")
    try:
        data = json.loads(res["stdout"])
    except json.JSONDecodeError:
        return {"answer": res["stdout"], "raw": None}
    answer = None
    if isinstance(data, dict):
        answer = data.get("answer") or data.get("response") or data.get("text")
    return {"answer": answer or res["stdout"], "raw": data}


def download_report(notebook_id: str, output_path: str, timeout: int = 300) -> dict[str, Any]:
    return nlm("download", "report", notebook_id, "-o", str(output_path), timeout=timeout)
