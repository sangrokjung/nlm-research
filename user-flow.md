# User Flow — `/research` skill

> `/research` has two front-ends over one pipeline (ADR-0012): the **conversational
> CLI** inside Claude Code (`/research <subcommand> …` → results + a next-step hint),
> and a **local web GUI** (a Preact workspace SPA, ADR-0014) that drives the same flow
> visually. §1–§7 map the CLI journeys; §8 maps the GUI. Both share `~/research-output/` state, so a session
> started in one shows up in the other. For architecture/decisions see
> [`architecture.md`](architecture.md); for the upgrade work see [`backlog.md`](backlog.md).

---

## 1. Interaction model

Every subcommand follows the same UX contract:

```
user types  ──▶  auth gate  ──▶  do work (MCP / CLI / script)  ──▶  render result  ──▶  next-step hint
/research X      (except           (with 3-tier                    (table/list/         "Run /research Y …"
                  search)           error handling)                 file paths)
```

- **Auth gate** runs on every subcommand except `search` (ADR-0011). On expiry it self-heals via `refresh_auth`; only a hard failure interrupts the user with "run `nlm login`".
- **Confirmations** appear only in interactive `run` mode and before irreversible/outbound actions (sharing, deletes). `--auto` and `-y` suppress them.
- **Next-step hint** is always the last line, making the flow self-guiding.

---

## 2. Top-level command map

```
/research
│
├── (no args) / status ──▶ session dashboard (notebooks, sources, labels, artifacts, share)
│
├── search   ──▶ find YouTube videos                        [no auth]
├── collect  ──▶ add sources to a notebook
├── analyze  ──▶ Q&A + generate report / artifacts
├── export   ──▶ download artifacts to ~/research-output/
├── drive    ──▶ list / sync / add Google Drive sources
│
├── run      ──▶ search → collect → analyze → export (one shot)
│
├── media    ──▶ on-demand video / flashcards / mindmap / infographic / datatable   (new)
├── organize ──▶ source labels: auto / list / move / rename …  (manage in NotebookLM) (new)
└── share    ──▶ public link / invite / export to Docs · Sheets (new)
```

---

## 3. Primary journey — the one-shot pipeline (`run`)

### 3a. Interactive mode (default)

```
/research run "AI agent trends 2026" --preset study-pack
        │
        ▼
 ┌─────────────┐   shows 10 results, numbered
 │  SEARCH     │──────────────────────────────────┐
 └─────────────┘                                   ▼
                                       ❓ "Which videos? (e.g. 1,3,5 or 'all')"
        │  user picks                               │
        ▼                                           │
 ┌─────────────┐  source_add(wait=true)            │
 │  COLLECT    │  ◀────────────────────────────────┘
 └─────────────┘  reports N sources added
        │
        ▼
              ❓ "Proceed to analyze + export with preset 'study-pack'? (y/n)"
        │  y
        ▼
 ┌─────────────┐  chat_configure → notebook_query → studio_create(×N)
 │  ANALYZE    │  fast-track: prints inferred format, generates, polls studio_status
 └─────────────┘
        │
        ▼
 ┌─────────────┐  download_artifact → ~/research-output/ai-agent-trends-2026/
 │  EXPORT     │
 └─────────────┘
        │
        ▼
 ✅ Summary: notebook URL + file paths + per-step timing
 → hint: "Run /research media <id> --type video, or /research share <id> docs"
```

### 3b. Auto mode (`--auto`)

```
/research run "<topic>" --preset <name> --auto
        │   no confirmations — top-N videos auto-selected, full sequence runs
        ▼
 SEARCH → COLLECT → ANALYZE → EXPORT  ──▶  ✅ Summary (same as above)
```

**Decision points removed in `--auto`:** video selection (uses `--top`, default per preset) and the analyze/export confirmation.

---

## 4. Step-by-step (manual) journey

Each subcommand is independently usable and hands off via its hint:

```
/research search "<kw>"      ──▶ numbered results        ──▶ hint: /research collect
/research collect <urls…>    ──▶ "N sources added"       ──▶ hint: /research analyze <id>
        └─(optional)─▶ ❓ "Auto-label these sources now? (y/n)"  → /research organize <id> auto
/research analyze <id>       ──▶ ❓ pick analysis type    ──▶ hint: /research export <id>
        type menu: Q&A · report · video · flashcards · mindmap · infographic · datatable
/research export <id>        ──▶ file paths              ──▶ hint: /research share <id>
```

---

## 5. New subcommand flows (v0.7.2)

### 5a. `media` — generate a rich artifact on demand

```
/research media <id> --type video --format explainer
        │   resolves <id> from last_session.json if omitted
        ▼
 prints one-line inferred plan  (fast-track, ADR-0009)
   e.g. "Generating Video Overview · explainer · auto_select style · en"
        │
        ▼
 studio_create ──▶ poll studio_status (pending→in_progress→completed)
        │
        ▼
 download_artifact ──▶ ~/research-output/<topic>/<topic>_video.mp4
 → hint: "Run /research share <id> public to share it"
```

`--type all` fans out across video + flashcards + mindmap + infographic + datatable, downloading each as it completes (Tier-2 degrade: a failed artifact is skipped, the rest continue).

### 5b. `organize` — manage sources inside NotebookLM

```
/research organize <id>            (default action: auto)
        │
        ▼
 label auto ──▶ AI groups sources into themed labels
        │
        ▼
 prints the resulting label tree:
   📁 Agentic frameworks (4)   📁 Market/Investment (3)   📁 Tooling (2)
 → hint: "/research organize <id> move <source> <label> to adjust,
          or /research organize <id> list to review"

 other actions: list · reorganize · create <name> · rename <old> <new>
                · emoji <label> <emoji> · move <source> <label> · delete <label>
```

This is the "manage within NotebookLM" surface (ADR-0010) — changes persist in the NotebookLM web UI.

### 5c. `share` — publish / collaborate / export

```
/research share <id> public        ──▶ ⚠️ confirm (outbound) ──▶ returns public link
/research share <id> invite a@b.co ──▶ ⚠️ confirm           ──▶ invite sent
/research share <id> docs          ──▶ export_artifact(docs)  ──▶ Google Doc URL
/research share <id> sheets        ──▶ export_artifact(sheets)──▶ Google Sheet URL
```

Outbound actions always confirm first (unless `-y`), consistent with publishing safety.

---

## 6. Status dashboard journey

```
/research            (or /research status)
        │
        ▼
 reads research_sessions.jsonl + live MCP (notebook_get, studio_status, labels, share)
        │
        ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Notebook │ Topic            │ Sources │ Labels │ Artifacts        │ Shared │
 ├──────────┼──────────────────┼─────────┼────────┼──────────────────┼────────┤
 │ 8bf3dc8c │ AI agent trends  │ 5       │ 3      │ report,video ✓   │ link   │
 └──────────────────────────────────────────────────────────────────────────┘
 → contextual hints per row (e.g. "no artifacts yet → /research analyze")
 options: /research status <id> (detail) · --clean (prune deleted notebooks)
```

---

## 7. Error-path UX (how failures surface to the user)

| Tier | What the user sees | Example |
|------|--------------------|---------|
| **1 — auto-recover** | A brief notice, then work continues | "Auth refreshed." / "Skipped 1 private video, continuing." |
| **2 — degraded** | Result + what was dropped | "4/5 artifacts done; infographic failed — retry with /research media <id> --type infographic." |
| **3 — fatal** | Clear stop + the exact remedy | "Not authenticated. Run `nlm login`, then retry." / "0 sources collected — nothing to analyze." |

Auth states (v0.7.x): `stale` → prompts re-login; `unverified` (transient network) → retries silently before bothering the user.

---

## 8. GUI user flow (workspace SPA — ADR-0014)

The GUI is a Preact SPA at `localhost`; its backend shells out to `nlm` and
`youtube_search.py` (ADR-0012, ADR-0013). It is **not** a mirror of the CLI
stepper — it's a notebook **workspace**: a sidebar of notebooks on the left, a
tabbed workspace on the right, and a guided "New research" run.

### 8a. Launch & layout

```
$ python gui/run.py            opens http://127.0.0.1:8765
        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │  /research                                      [☾/☀]   [auth ●]   │  ← topbar: theme + auth pill
 ├───────────────┬──────────────────────────────────────────────────┤
 │ + New research│  AI agent trends 2026                              │
 │               │  ┌Sources │ Artifacts │ Labels │ Share┐           │
 │ NOTEBOOKS     │  │ 📄 Jeff Su — vid                    │           │
 │ ▸AI trends (5)│  │ 📄 IBM — vid                        │           │
 │  NLM tips (3) │  │ 📄 a16z — vid     [+ add source]    │           │
 │  …            │  └─────────────────────────────────────┘           │
 └───────────────┴──────────────────────────────────────────────────┘
 auth pill: green = ok · amber = verifying (re-checks 8s) · red = re-login
 theme: ☾/☀ toggles light/dark (system default, saved to localStorage)
```

### 8b. New research (the guided run)

```
sidebar "+ New research"
        ▼
 form: topic · preset (default/trend-report/study-pack/explainer/visual-report) · #videos · lang
        │  "Run pipeline"
        ▼
 live log streams over SSE:
   [search] N videos → [collect] sources ready → [analyze] report + Q&A → [media] … → [done]
        ▼
 notebooks refresh; route jumps to the new notebook's workspace (Sources tab)
```

### 8c. Notebook workspace tabs (lazy-loaded per tab)

```
SOURCES   ▸ list sources · "+ add source" (paste URL/YouTube) → adds & refreshes
ARTIFACTS ▸ pick type (report/video/flashcards/mindmap/infographic/datatable) ▸ "Generate"
            → SSE log → artifact cards (status badge); failed/undownloaded → Retry
LABELS    ▸ "Auto-label" → themed label chips with source counts · Refresh
SHARE     ▸ Status · Make public/private · Invite (email) · Export → Docs/Sheets
            ⚠️ outbound actions confirm first
```

Every action maps to a backend endpoint that shells out to `nlm` — the GUI never
invents capabilities the CLI lacks, so the two front-ends stay behavior-identical.

### 8d. Error-path UX (GUI)

| Tier | GUI behavior |
|------|--------------|
| 1 — auto-recover | inline spinner + small note ("auth refreshed", "1 source skipped"); flow continues |
| 2 — degraded | artifact card flips to "failed" with a **Retry** button; siblings unaffected |
| 3 — fatal | blocking banner with the exact remedy (e.g. "Run `nlm login`") + a **Recheck** button |

The GUI never invents capabilities the CLI lacks — every action maps to an `nlm`
command, so CLI and GUI stay behavior-identical.
