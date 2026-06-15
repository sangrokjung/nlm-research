"""FastAPI app for the research GUI (ADR-0012).

Working endpoints in this scaffold: health, auth check, YouTube search, and
notebook listing. The remaining pipeline stages (collect / analyze / media /
organize / share) are stubbed with 501 + the `nlm`/CLI command they will run,
so the UI shape is complete and the wiring is obvious for the next iteration.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config
from .nlm_runner import ToolError, auth_check, list_notebooks, search_youtube

app = FastAPI(title="Research GUI", version="0.1.0")


class SearchRequest(BaseModel):
    query: str
    num: int = 10
    newest_first: bool = False


@app.exception_handler(ToolError)
async def _tool_error_handler(_request, exc: ToolError):
    return JSONResponse(status_code=502, content={"error": str(exc)})


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "research-gui", "version": app.version}


@app.get("/api/auth")
def auth() -> dict:
    """Auth pill state: ok / stale / error (ADR-0011 auth states)."""
    return auth_check()


@app.post("/api/search")
def search(req: SearchRequest) -> dict:
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query is required")
    results = search_youtube(req.query, num=req.num, newest_first=req.newest_first)
    return {"query": req.query, "count": len(results), "results": results}


@app.get("/api/notebooks")
def notebooks() -> dict:
    items = list_notebooks()
    return {"count": len(items), "notebooks": items}


# --- Stubs for stages not yet wired (return 501 with the planned command) ---

_PLANNED = {
    "collect": "nlm source add <notebook> --url <url>   (per selected video)",
    "analyze": "nlm report create <notebook>  +  nlm query <notebook>",
    "media": "nlm <video|flashcards|mindmap|infographic|data-table> create <notebook>",
    "organize": "nlm label auto <notebook>",
    "share": "nlm share public|invite <notebook>  /  nlm export docs|sheets <notebook>",
}


@app.post("/api/{stage}")
def planned_stage(stage: str) -> JSONResponse:
    if stage in _PLANNED:
        return JSONResponse(
            status_code=501,
            content={"stage": stage, "status": "planned", "command": _PLANNED[stage]},
        )
    raise HTTPException(status_code=404, detail=f"unknown stage: {stage}")


# Serve the frontend last so /api/* routes take precedence over the static mount.
app.mount("/", StaticFiles(directory=str(config.FRONTEND_DIR), html=True), name="frontend")
