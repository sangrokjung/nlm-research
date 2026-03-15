# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A Claude Code skill that automates a research pipeline: YouTube search → NotebookLM collection/analysis → file export. The entry point is the `/research` slash command, implemented as a set of markdown prompt files in `.claude/commands/research/`.

## Prerequisites

```bash
claude --version          # Claude Code CLI
deno --version            # Required for nlm CLI
nlm --version             # NotebookLM CLI: deno install -gArf jsr:@nicholasgriffintn/notebooklm-cli
yt-dlp --version          # YouTube search: pip install yt-dlp
nlm login                 # Authenticate Google account (run once)
```

The MCP server (`notebooklm-mcp`) is configured in `.mcp.json` and runs via `/Users/srinicenthala/.local/bin/notebooklm-mcp`.

## Running the Research Pipeline

```bash
# Full automated pipeline
/research run <topic> --auto

# Full pipeline with preset
/research run <topic> --preset <presentation|learning|trend-report|competitor|deep-dive> --auto

# Step-by-step manual execution
/research search <keywords>          # Search YouTube (uses yt-dlp)
/research collect                    # Add videos to NotebookLM notebook
/research analyze <notebook-id>      # Run AI analysis
/research export <notebook-id>       # Download artifacts to ~/research-output/
/research status                     # View current session state
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

`SKILL.md` is the router — it parses the first word of `$ARGUMENTS` and delegates to the corresponding subcommand `.md` file. Each subcommand file is a prompt that instructs Claude how to call MCP tools and shell commands.

```
SKILL.md (router)
├── run.md        — Orchestrates the full pipeline directly (does NOT delegate to other .md files)
├── search.md     — Calls youtube_search.py script
├── collect.md    — Calls NotebookLM MCP to create notebooks and add sources
├── analyze.md    — Calls NotebookLM MCP for Q&A, reports, audio, slides, quiz
├── export.md     — Calls nlm CLI to download artifacts to ~/research-output/
├── status.md     — Reads local session files + NotebookLM MCP
├── drive.md      — Google Drive source management (list/sync/add)
└── scripts/
    └── youtube_search.py   — yt-dlp wrapper (symlink to original)
```

**Key design rule**: `run.md` orchestrates MCP calls directly. The subcommand `.md` files are for independent use only (e.g., `/research search`, `/research collect`).

### MCP vs CLI

| Operation | Tool |
|-----------|------|
| Notebook/source CRUD | MCP (`mcp__notebooklm-mcp__*`) |
| Download/export artifacts | CLI (`nlm download`) |
| Authentication | MCP `refresh_auth` first, then `nlm login` fallback |

### Session State

Two local files track state between commands:
- `~/research-output/last_session.json` — last session for quick reference by subsequent commands
- `~/research-output/research_sessions.jsonl` — full session history

### Authentication Gate

Before any MCP call (except `search`), run:
```bash
nlm login --check
```
On failure, try `mcp__notebooklm-mcp__refresh_auth()`, then guide user to run `nlm login`.

## Presets

| Preset | Output |
|--------|--------|
| `default` | report.md |
| `trend-report` | report.md (searches newest-first with `-d`) |
| `competitor` | SWOT report.md |
| `learning` | report.md + podcast.mp3 + quiz.json |
| `presentation` | report.md + slides.pptx |
| `deep-dive` | report.md (adds web sources via `research_start`) |

## Output Files

All output goes to `~/research-output/<topic>/`:
- `<topic>_report.md` — AI briefing document
- `<topic>_analysis.md` — Q&A deep analysis
- `<topic>_podcast.mp3` — AI audio (learning preset)
- `<topic>_quiz.json` — Quiz (learning preset)
- `<topic>_slides.pptx` — Slide deck (presentation preset)

## Error Handling Tiers

- **Tier 1 (auto-recover)**: Auth expiry → `refresh_auth`; individual source failure → skip and continue; rate limit → retry with backoff
- **Tier 2 (degraded)**: Partial source failures → continue with available sources; studio artifact failure → skip that artifact
- **Tier 3 (fatal stop)**: Auth completely broken; 0 sources collected; notebook creation failure

## Modifying the Pipeline

- To change search behavior: edit `search.md` or `scripts/youtube_search.py`
- To change analysis prompts or add new artifact types: edit `analyze.md` (and the preset table in `run.md`)
- To add a new preset: add a row to the preset table in `run.md` and document it in `SKILL.md`
- To change export format/path: edit `export.md`
- Reference docs for MCP tool parameters: `.claude/commands/research/references/nlm-commands.md`
- Workflow examples: `.claude/commands/research/references/workflow-examples.md`
