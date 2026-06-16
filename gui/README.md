# Research GUI (local web app)

A browser front-end that drives the same `/research` pipeline as the CLI skill,
for people who prefer clicking to typing. It is an **alternative driver**, not a
replacement: the CLI remains the canonical pipeline, and both share the same
`~/research-output/` state (ADR-0012 / ADR-0013 in [`../architecture.md`](../architecture.md)).

> **Status:** redesigned as a **workspace SPA** (ADR-0014). A left sidebar lists
> notebooks; selecting one opens a workspace with **Sources / Artifacts / Labels /
> Share** tabs. **"+ New research"** runs the full pipeline (one streaming job) and
> lands in the new notebook. Light/dark theme with a toggle. Long stages stream live
> progress over SSE. Flows in [`../user-flow.md`](../user-flow.md) → §8; tracked in
> [`../backlog.md`](../backlog.md) → Epic 7.
>
> Known `nlm` v0.7.2 limitation: `nlm download mind-map` fails (the mind map still
> generates and is visible in NotebookLM; report/flashcards/infographic/data-table/
> video downloads work). The Artifacts tab shows a completed artifact with a Retry
> rather than a false success.

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
│   ├── app.py             # FastAPI routes + jobs/SSE + notebook sub-resources (+ static mount)
│   ├── jobs.py            # in-memory job runner for SSE streaming
│   ├── nlm_runner.py      # thin subprocess wrapper over nlm + youtube_search.py
│   ├── sessions.py        # ~/research-output state shared with the CLI
│   └── config.py          # paths / host / port (repo-anchored, localhost-bound)
└── frontend/              # Preact + htm SPA, no build step (ADR-0014)
    ├── index.html         # mounts #app; sets theme; loads src/app.js as a module
    ├── styles.css         # design tokens + light/dark via [data-theme]
    └── src/
        ├── app.js         # shell + hash router (#/new, #/nb/:id/:tab)
        ├── api.js         # fetch + runJob() (POST job + EventSource)
        ├── store.js       # observable store (auth, notebooks, theme) + useStore hook
        ├── components/    # Topbar · Sidebar · Tabs · ProgressLog · ArtifactCard
        └── views/         # NewResearch · Workspace · {Sources,Artifacts,Labels,Share}Tab
```

**Stack:** Preact + `htm` + hooks — components and state with **no build step / no
npm**, consistent with ADR-0013. The framework is **vendored locally** under
`gui/frontend/vendor/` (pinned `preact@10.19.3` / `htm@3.1.1`) and wired via an
**import map** in `index.html`, so the GUI runs **fully offline** — no runtime CDN.
To update versions, re-download the `*.module.js` files from unpkg.

## Endpoints (current)

| Method | Path | Backed by |
|--------|------|-----------|
| GET | `/api/health` | — |
| GET | `/api/auth` | `nlm login --check` |
| POST | `/api/search` | `youtube_search.py --json` |
| GET | `/api/notebooks` | `nlm notebook list --json` |
| POST | `/api/collect` | `nlm notebook create` (if new) + `nlm source add … --wait` |
| POST | `/api/analyze` | `nlm report create` + `nlm query notebook --json` + poll + `nlm download report` |
| POST | `/api/media` | `nlm <video\|flashcards\|mindmap\|infographic\|data-table> create` + poll + `nlm download` |
| POST | `/api/organize` | `nlm label auto\|list\|move --json` |
| POST | `/api/share` | `nlm share status\|public\|private\|invite` · `nlm export to-docs\|to-sheets` |
| POST | `/api/jobs/{run\|collect\|analyze\|media}` | start a background job → `{job_id}` |
| GET | `/api/jobs/{job_id}/stream` | SSE progress stream (`started`/`progress`/`done`/`error`) |
| GET | `/api/notebook/{id}/sources` | `nlm source list --json` (Sources tab) |
| GET | `/api/notebook/{id}/artifacts` | `nlm studio status` (Artifacts tab) |
| GET | `/api/notebook/{id}/labels` | `nlm label list --json` (Labels tab) |
| GET | `/api/notebook/{id}/share` | `nlm share status` (Share tab) |
| POST | `/api/notebook/{id}/sources` | `nlm source add … --wait` (add to existing notebook) |

`run` is the **one-click pipeline** (search → collect → analyze → preset artifacts),
the GUI equivalent of `/research run <topic> --preset <name> --auto`. Presets:
`default`, `trend-report`, `study-pack` (+flashcards +mindmap), `explainer` (+video),
`visual-report` (+infographic +mindmap +datatable).

Run / Collect / Analyze / Media execute as background **jobs** that stream progress
over Server-Sent Events; the frontend (`src/api.js` `runJob()`) uses `EventSource`
to show a live log. The plain synchronous `POST /api/{collect,analyze,media}`
endpoints still exist for scripting. Run/Collect also write
`~/research-output/last_session.json` (and append `research_sessions.jsonl`) so the
CLI's `/research status` sees GUI sessions.

## UI flows

- **New research** (sidebar "+ New") → topic + preset + count → streamed run → lands in the notebook workspace.
- **Workspace tabs** (lazy-loaded): **Sources** (list + add), **Artifacts** (generate report/media + Retry), **Labels** (auto-label chips), **Share** (public/invite + export Docs/Sheets).
- **Theme** toggle (☾/☀) in the topbar; defaults to system preference, persisted in `localStorage`.

See [`../user-flow.md`](../user-flow.md) §8 for the full flow maps.
