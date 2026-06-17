# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A Claude Code skill that automates a research pipeline: YouTube search → NotebookLM collection/analysis → file export. The entry point is the `/research` slash command, implemented as a set of markdown prompt files in `.claude/skills/research/` (with a legacy mirror in `.claude/commands/research/`).

## Prerequisites

```bash
claude --version          # Claude Code CLI
nlm --version             # NotebookLM CLI + MCP (>= 0.7.2): uv tool install notebooklm-mcp-cli  (or  pip install notebooklm-mcp-cli)
yt-dlp --version          # YouTube search: pip install yt-dlp
nlm login                 # Authenticate Google account (run once)
nlm doctor                # Optional: diagnose install/auth issues
# nlm skill install claude-code   # Optional: install nlm's own expert guide so it stays in sync
```

The MCP server (`notebooklm-mcp`) is configured in `.mcp.json` at project scope, so running `claude` inside this repo directory connects it automatically. The first run shows a trust prompt. `.claude/settings.json` also pre-allows the `mcp__notebooklm-mcp__*` permission.

To register manually:
```bash
claude mcp add -s project notebooklm-mcp -- nlm mcp
```

> **Long-lived MCP servers**: bound the conversation cache with
> `NOTEBOOKLM_CONVERSATION_TURNS_PER_NOTEBOOK` / `CONVERSATION_MAX_NOTEBOOKS` /
> `CONVERSATION_MAX_CHARS_PER_TURN`, or run `nlm mcp --stateless`. See
> `references/nlm-commands.md` §16.
>
> **Multi-notebook ops** (`nlm batch` / `cross` / `pipeline` / `tag`) are available via
> the CLI today — see `references/nlm-commands.md` §15. Dedicated `/research`
> subcommands for them are a future epic.

## Running the Research Pipeline

```bash
# Full automated pipeline
/research run <topic> --auto

# Full pipeline with preset
/research run <topic> --preset <presentation|learning|trend-report|competitor|deep-dive|study-pack|explainer|visual-report> --auto

# Step-by-step manual execution
/research search <keywords>          # Search YouTube (uses yt-dlp)
/research collect                    # Add videos to a NotebookLM notebook
/research analyze <notebook-id>      # Run AI analysis
/research export <notebook-id>       # Download artifacts to ~/research-output/
/research status                     # View current session state

# Studio artifacts, source labels, sharing (v0.7.2)
/research media <notebook-id> --type <video|flashcards|mindmap|infographic|datatable|all>
/research organize <notebook-id> [auto|list|move <src> <label>|rename <old> <new>|delete <label>]
/research share <notebook-id> [status|public|private|invite <email>|docs|sheets]
```

## Running the Drive Subcommand

```bash
/research drive list [notebook-id]        # List Drive sources + sync status
/research drive sync [notebook-id]        # Re-sync outdated Drive sources
/research drive add <drive-url-or-id>     # Add a Drive doc/slides/sheets/pdf

# Drive + YouTube together in one pipeline
/research run <topic> --drive <url-or-id> --auto
```

> Drive files must have "Anyone with the link" view permission enabled.

## Architecture

### Command Routing

`SKILL.md` is the router — it parses the first word of `$ARGUMENTS` and delegates to the corresponding subcommand `.md` file. Each subcommand file is a prompt that tells Claude how to call MCP tools and shell commands.

```
SKILL.md (router)
├── run.md        — Orchestrates the full pipeline directly (does NOT delegate to other .md files)
├── search.md     — Calls youtube_search.py script
├── collect.md    — Calls NotebookLM MCP to create notebooks and add sources
├── analyze.md    — Calls NotebookLM MCP for Q&A, reports, audio, slides, quiz
├── export.md     — Calls nlm CLI to download artifacts to ~/research-output/
├── status.md     — Reads local session files + NotebookLM MCP (sources/artifacts/labels/share)
├── drive.md      — Google Drive source management (list/sync/add)
├── media.md      — On-demand Studio artifacts (video/flashcards/mindmap/infographic/datatable)
├── organize.md   — Source labels (manage within NotebookLM)
├── share.md      — Public link / invite / export to Google Docs · Sheets
└── scripts/
    └── youtube_search.py   — yt-dlp wrapper (--save-urls writes a source-URL sidecar)
```

**Key design rule**: `run.md` orchestrates MCP calls directly. The subcommand `.md` files are for independent use only (e.g., `/research search`, `/research collect`).

### MCP vs CLI

| Operation | Tool |
|-----------|------|
| Notebook/source CRUD | MCP (`mcp__notebooklm-mcp__*`) |
| Studio artifacts (report/video/flashcards/mindmap/infographic/data_table/audio/slides/quiz) | MCP `studio_create` → poll `studio_status` |
| Source labels | MCP `label` / CLI `nlm label` |
| Download artifacts | MCP `download_artifact` / CLI `nlm download <kind>` |
| Sharing + Docs/Sheets export | CLI `nlm share` / `nlm export` (or MCP `notebook_share_*` / `export_artifact`) |
| Authentication | MCP `refresh_auth` first, then `nlm login` fallback (v0.7.x: `stale` = expired, `unverified` = transient) |

### Session State

Two local files track state between commands:
- `~/research-output/last_session.json` — last session, used by subsequent commands as a quick reference
- `~/research-output/research_sessions.jsonl` — full session history

### Authentication Gate

Before any MCP call (except `search`), run:
```bash
nlm login --check
```
On failure, try `mcp__notebooklm-mcp__refresh_auth()`, then guide the user to run `nlm login`.

## Language

All skill prompts, default Q&A queries, note titles, and generated artifacts default to English (BCP-47 `en`). Pass `--lang <code>` (e.g. `--lang ko`) to switch the output language for a single run.

## Presets

| Preset | Output |
|--------|--------|
| `default` | report.md |
| `trend-report` | report.md (searches newest-first with `-d`) |
| `competitor` | SWOT report.md |
| `learning` | report.md + podcast.mp3 + quiz.json |
| `presentation` | report.md + slides.pptx |
| `deep-dive` | report.md (adds web sources via `research_start`) |
| `study-pack` | report.md + podcast.mp3 + flashcards.json + mindmap.json + quiz.json |
| `explainer` | report.md + video.mp4 |
| `visual-report` | report.md + infographic.png + mindmap.json + datatable.csv |

## Output Files

All output goes to `~/research-output/<topic>/`:
- `<topic>_report.md` — AI briefing document
- `<topic>_analysis.md` — Q&A deep analysis
- `<topic>_podcast.mp3` — AI audio (learning / study-pack)
- `<topic>_quiz.json` — Quiz (learning / study-pack)
- `<topic>_slides.pptx` — Slide deck (presentation preset)
- `<topic>_video.mp4` — Video Overview (explainer preset)
- `<topic>_flashcards.json` — Flashcards (study-pack)
- `<topic>_mindmap.json` — Mind map (study-pack / visual-report; download may fail on nlm v0.7.2)
- `<topic>_infographic.png` — Infographic (visual-report)
- `<topic>_datatable.csv` — Data table (visual-report)
- `source_urls.json` — sidecar mapping source titles → original video URLs (written by `--save-urls`)

## Error Handling Tiers

- **Tier 1 (auto-recover)**: Auth expiry → `refresh_auth`; individual source failure → skip and continue; rate limit → retry with backoff
- **Tier 2 (degraded)**: Partial source failures → continue with available sources; studio artifact failure → skip that artifact
- **Tier 3 (fatal stop)**: Auth completely broken; 0 sources collected; notebook creation failure

## Modifying the Pipeline

- To change search behavior: edit `search.md` or `scripts/youtube_search.py`
- To change analysis prompts or add new artifact types: edit `analyze.md` (and the preset table in `run.md`)
- To add a new preset: add a row to the preset table in `run.md` and document it in `SKILL.md`
- To change export format/path: edit `export.md`
- Reference docs for MCP tool parameters: `.claude/skills/research/references/nlm-commands.md`
- Workflow examples: `.claude/skills/research/references/workflow-examples.md`
- After editing under `.claude/skills/research/`, mirror the change to `.claude/commands/research/` (kept for backward compatibility)
