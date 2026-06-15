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

from . import config, sessions
from .nlm_runner import (
    ToolError,
    add_sources,
    auth_check,
    create_notebook,
    create_report,
    download_report,
    list_notebooks,
    notebook_summary,
    query_notebook,
    search_youtube,
    wait_for_artifact,
)

app = FastAPI(title="Research GUI", version="0.1.0")

DEFAULT_QUESTION = "Summarize the top 5 key insights in a structured format."


class SearchRequest(BaseModel):
    query: str
    num: int = 10
    newest_first: bool = False


class CollectRequest(BaseModel):
    urls: list[str]
    notebook_id: str | None = None
    topic: str | None = None
    wait: bool = True


class AnalyzeRequest(BaseModel):
    notebook_id: str
    topic: str | None = None
    report_format: str = "Briefing Doc"
    language: str = "en"
    question: str | None = DEFAULT_QUESTION
    download: bool = True


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


@app.post("/api/collect")
def collect(req: CollectRequest) -> dict:
    """Add selected videos to a notebook (creating one if needed).

    Synchronous + `--wait`, so this can take a few minutes while NotebookLM
    processes sources. Progress streaming is the Epic 6 follow-up.
    """
    if not req.urls:
        raise HTTPException(status_code=400, detail="no urls provided")

    notebook_id = req.notebook_id
    title = None
    created = False
    if not notebook_id:
        topic = (req.topic or "Research").strip()
        title = f"Research: {topic} - {sessions.today()}"
        nb = create_notebook(title)
        notebook_id = nb["notebook_id"]
        created = True
        if not notebook_id:
            raise ToolError("notebook creation did not return an id")

    add = add_sources(notebook_id, req.urls, wait=req.wait)
    summary = notebook_summary(notebook_id)

    session = {
        "notebook_id": notebook_id,
        "topic": req.topic or "",
        "title": title or summary.get("title"),
        "updated_at": sessions.now_iso(),
        "status": "collected",
        "source_count": summary.get("source_count"),
        "urls": req.urls,
        "via": "gui",
    }
    sessions.write_last_session(session)
    if created:
        sessions.append_session(session)

    return {
        "notebook_id": notebook_id,
        "created": created,
        "title": title or summary.get("title"),
        "requested": len(req.urls),
        "source_count": summary.get("source_count"),
        "add_ok": add["ok"],
        "detail": add["stdout"] or add["stderr"],
    }


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest) -> dict:
    """Generate a report, optionally run a Q&A, and optionally download the report."""
    if not req.notebook_id.strip():
        raise HTTPException(status_code=400, detail="notebook_id is required")

    result: dict = {"notebook_id": req.notebook_id}

    # Start the (async) report generation first.
    report = create_report(req.notebook_id, req.report_format, req.language)
    result["report_ok"] = report["ok"]
    result["report_detail"] = report["stdout"] or report["stderr"]

    # Run the Q&A next — it's synchronous and overlaps report generation time.
    if req.question:
        try:
            qa = query_notebook(req.notebook_id, req.question)
            result["answer"] = qa["answer"]
        except ToolError as exc:
            result["answer_error"] = str(exc)

    # Poll until the report artifact is ready, then download.
    report_done = False
    if report["ok"]:
        waited = wait_for_artifact(req.notebook_id, "report")
        result["report_status"] = waited["status"]
        report_done = waited["status"] == "completed"

    if req.download and report_done:
        topic = req.topic or "research"
        out = sessions.topic_dir(topic) / f"{sessions.slug(topic)}_report.md"
        dl = download_report(req.notebook_id, str(out))
        result["downloaded"] = str(out) if dl["ok"] else None
        result["download_detail"] = dl["stdout"] or dl["stderr"]

    last = sessions.read_last_session()
    if last.get("notebook_id") == req.notebook_id:
        last["status"] = "analyzed"
        last["updated_at"] = sessions.now_iso()
        sessions.write_last_session(last)

    return result


# --- Stubs for stages not yet wired (return 501 with the planned command) ---

_PLANNED = {
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
