"""Minimal in-memory job runner for SSE progress streaming.

A long stage (collect/analyze/media) runs in a background thread and pushes
progress events onto a per-job queue; the SSE endpoint drains that queue as
`text/event-stream`. State is in-process only — fine for a single-user local app
(ADR-0012); a server restart drops in-flight jobs.
"""
from __future__ import annotations

import json
import queue
import threading
import uuid
from typing import Any, Callable

_jobs: dict[str, "queue.Queue[Any]"] = {}
_DONE = object()


def new_job() -> str:
    jid = uuid.uuid4().hex[:12]
    _jobs[jid] = queue.Queue()
    return jid


def _emit(jid: str, event: dict) -> None:
    q = _jobs.get(jid)
    if q is not None:
        q.put(event)


def run(jid: str, fn: Callable[[Callable[[dict], None]], Any]) -> None:
    """Run fn(emit) on a daemon thread, framing started/done/error events."""
    def worker() -> None:
        emit = lambda ev: _emit(jid, ev)
        try:
            emit({"type": "started"})
            result = fn(emit)
            emit({"type": "done", "result": result})
        except Exception as exc:  # surface as a stream error, not a 500
            emit({"type": "error", "error": str(exc)})
        finally:
            _emit(jid, _DONE)

    threading.Thread(target=worker, daemon=True).start()


def stream(jid: str):
    """SSE generator: yields `data: {...}` frames until the job finishes."""
    q = _jobs.get(jid)
    if q is None:
        yield 'data: {"type":"error","error":"unknown job"}\n\n'
        return
    try:
        while True:
            item = q.get()
            if item is _DONE:
                break
            yield f"data: {json.dumps(item)}\n\n"
    finally:
        _jobs.pop(jid, None)
