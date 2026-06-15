# Research GUI (local web app)

A browser front-end that drives the same `/research` pipeline as the CLI skill,
for people who prefer clicking to typing. It is an **alternative driver**, not a
replacement: the CLI remains the canonical pipeline, and both share the same
`~/research-output/` state (ADR-0012 / ADR-0013 in [`../architecture.md`](../architecture.md)).

> **Status:** scaffold. **Search, Collect, Analyze**, auth status, and the notebook
> dashboard are wired end-to-end. Media / Organize / Share remain stubbed pages whose
> backend returns `501` with the `nlm` command they will run. Tracked in
> [`../backlog.md`](../backlog.md) → Epic 6; flows in [`../user-flow.md`](../user-flow.md) → §8.

## How it works

```
Browser (localhost)  ──HTTP/JSON──▶  FastAPI backend  ──shells out──▶  nlm CLI
  gui/frontend/*                       gui/backend/*                   youtube_search.py
```

The backend never reimplements pipeline logic — it runs the same tools the CLI
front-end uses and parses their `--json` output (`gui/backend/nlm_runner.py`).

## Prerequisites

Same as the skill, plus the GUI's Python deps:

```bash
nlm --version            # >= 0.7.2   (uv tool install notebooklm-mcp-cli)
yt-dlp --version         # pip install yt-dlp
nlm login                # authenticate once
pip install -r gui/requirements.txt
```

## Run

```bash
python gui/run.py        # serves http://127.0.0.1:8765 and opens your browser
```

Bound to `127.0.0.1` by design — do not expose it externally.

## Layout

```
gui/
├── run.py                 # launcher (uvicorn + open browser)
├── requirements.txt
├── backend/
│   ├── app.py             # FastAPI routes (+ static mount)
│   ├── nlm_runner.py      # thin subprocess wrapper over nlm + youtube_search.py
│   └── config.py          # paths / host / port (repo-anchored, localhost-bound)
└── frontend/
    ├── index.html         # stepper nav + auth pill
    ├── style.css
    └── app.js             # Search + Dashboard wired; other pages stubbed
```

## Endpoints (current)

| Method | Path | Backed by |
|--------|------|-----------|
| GET | `/api/health` | — |
| GET | `/api/auth` | `nlm login --check` |
| POST | `/api/search` | `youtube_search.py --json` |
| GET | `/api/notebooks` | `nlm notebook list --json` |
| POST | `/api/collect` | `nlm notebook create` (if new) + `nlm source add … --wait` |
| POST | `/api/analyze` | `nlm report create` + `nlm query notebook --json` + `nlm download report` |
| POST | `/api/{media,organize,share}` | `501` stub (planned command in body) |

Collect and Analyze are **synchronous** and use `--wait` / Studio generation, so a
request can stay open for a few minutes. Progress streaming (SSE/websocket) is the
next Epic 6 item. Collect/Analyze also write `~/research-output/last_session.json`
(and append to `research_sessions.jsonl`) so the CLI's `/research status` sees them.

## Next steps (Epic 6)

Wire the stubbed stages to their `nlm` commands, stream studio progress
(SSE/websocket), and add the auth-pill `unverified` (retrying) state.
