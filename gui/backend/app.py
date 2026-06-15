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
    download,
    download_report,
    find_artifact_id,
    list_notebooks,
    nlm,
    nlm_json,
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


class MediaRequest(BaseModel):
    notebook_id: str
    type: str  # video | flashcards | mindmap | infographic | datatable
    topic: str | None = None
    language: str = "en"
    download: bool = True
    # type-specific (all optional; sensible defaults applied)
    format: str | None = None       # video: explainer|brief|cinematic
    style: str | None = None        # video/infographic visual style
    focus: str | None = None
    difficulty: str | None = None   # flashcards: easy|medium|hard
    title: str | None = None        # mindmap
    orientation: str | None = None  # infographic
    detail: str | None = None       # infographic
    description: str | None = None  # datatable (required content hint)


class OrganizeRequest(BaseModel):
    notebook_id: str
    action: str = "auto"            # auto | list | move
    source_id: str | None = None
    label_id: str | None = None


class ShareRequest(BaseModel):
    notebook_id: str
    action: str                     # status | public | private | invite | docs | sheets
    email: str | None = None
    role: str = "viewer"
    title: str | None = None
    topic: str | None = None


# media type -> (studio artifact type, download kind, file ext)
_MEDIA = {
    "video": ("video", "video", "mp4"),
    "flashcards": ("flashcards", "flashcards", "json"),
    "mindmap": ("mind_map", "mind-map", "json"),
    "infographic": ("infographic", "infographic", "png"),
    "datatable": ("data_table", "data-table", "csv"),
}


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


def _media_argv(req: MediaRequest) -> list[str]:
    nb, t = req.notebook_id, req.type
    if t == "video":
        argv = ["video", "create", nb, "--format", req.format or "explainer",
                "--style", req.style or "auto_select", "--language", req.language, "-y"]
        if req.focus:
            argv += ["--focus", req.focus]
        return argv
    if t == "flashcards":
        argv = ["flashcards", "create", nb, "--difficulty", req.difficulty or "medium", "-y"]
        if req.focus:
            argv += ["--focus", req.focus]
        return argv
    if t == "mindmap":
        return ["mindmap", "create", nb, "--title", req.title or "Mind Map", "-y"]
    if t == "infographic":
        argv = ["infographic", "create", nb, "--orientation", req.orientation or "landscape",
                "--detail", req.detail or "standard", "--style", req.style or "auto_select",
                "--language", req.language, "-y"]
        if req.focus:
            argv += ["--focus", req.focus]
        return argv
    if t == "datatable":
        desc = req.description or "Key facts and comparisons drawn from the sources"
        return ["data-table", "create", nb, desc, "--language", req.language, "-y"]
    raise HTTPException(status_code=400, detail=f"unknown media type: {t}")


@app.post("/api/media")
def media(req: MediaRequest) -> dict:
    """Generate a rich Studio artifact (video/flashcards/mindmap/infographic/datatable)."""
    if req.type not in _MEDIA:
        raise HTTPException(status_code=400, detail=f"unknown media type: {req.type}")
    studio_type, dl_kind, ext = _MEDIA[req.type]

    create = nlm(*_media_argv(req), timeout=900)
    result: dict = {"type": req.type, "create_ok": create["ok"],
                    "detail": create["stdout"] or create["stderr"]}
    if not create["ok"]:
        return result

    # Video generation is the slowest; give it a longer ceiling.
    max_wait = 600 if req.type == "video" else 360
    waited = wait_for_artifact(req.notebook_id, studio_type, max_wait=max_wait)
    result["artifact_status"] = waited["status"]

    if req.download and waited["status"] == "completed":
        topic = req.topic or "research"
        out = sessions.topic_dir(topic) / f"{sessions.slug(topic)}_{req.type}.{ext}"
        dl = download(dl_kind, req.notebook_id, str(out))
        result["downloaded"] = str(out) if dl["ok"] else None
        result["download_detail"] = dl["stdout"] or dl["stderr"]
    return result


@app.post("/api/organize")
def organize(req: OrganizeRequest) -> dict:
    """Source labels — the manage-within-NotebookLM surface (ADR-0010)."""
    nb, action = req.notebook_id, (req.action or "auto")
    if action in ("auto", "list"):
        # auto needs 5+ sources; if labels exist it just returns them.
        data = nlm_json("label", action, nb, "--json", timeout=180)
        labels = data.get("labels", data) if isinstance(data, dict) else data
        return {"action": action, "labels": labels}
    if action == "move":
        if not (req.source_id and req.label_id):
            raise HTTPException(status_code=400, detail="move requires source_id and label_id")
        res = nlm("label", "move", nb, req.source_id, req.label_id, "--json")
        return {"action": action, "ok": res["ok"], "detail": res["stdout"] or res["stderr"]}
    raise HTTPException(status_code=400, detail=f"unsupported organize action: {action}")


@app.post("/api/share")
def share(req: ShareRequest) -> dict:
    """Publish / collaborate / export to Google Docs · Sheets."""
    nb, action = req.notebook_id, req.action
    if action == "status":
        res = nlm("share", "status", nb)
        return {"action": action, "ok": res["ok"], "detail": res["stdout"] or res["stderr"]}
    if action in ("public", "private"):
        res = nlm("share", action, nb)
        return {"action": action, "ok": res["ok"], "detail": res["stdout"] or res["stderr"]}
    if action == "invite":
        if not req.email:
            raise HTTPException(status_code=400, detail="invite requires email")
        res = nlm("share", "invite", nb, req.email, "--role", req.role)
        return {"action": action, "ok": res["ok"], "detail": res["stdout"] or res["stderr"]}
    if action in ("docs", "sheets"):
        artifact_type = "report" if action == "docs" else "data_table"
        artifact_id = find_artifact_id(nb, artifact_type)
        if not artifact_id:
            raise HTTPException(status_code=400,
                                detail=f"no completed {artifact_type} artifact to export")
        sub = "to-docs" if action == "docs" else "to-sheets"
        title = req.title or req.topic or ("Report" if action == "docs" else "Data Table")
        res = nlm("export", sub, nb, artifact_id, "--title", title)
        return {"action": action, "ok": res["ok"], "detail": res["stdout"] or res["stderr"]}
    raise HTTPException(status_code=400, detail=f"unsupported share action: {action}")


# Serve the frontend last so /api/* routes take precedence over the static mount.
app.mount("/", StaticFiles(directory=str(config.FRONTEND_DIR), html=True), name="frontend")
