---
name: research
description: End-to-end research pipeline. YouTube search -> NotebookLM collection/analysis -> result export, unified into one workflow: keyword-based video search, source collection, AI analysis, result export.
argument-hint: <run|search|collect|analyze|export|status|drive|media|organize|share> [options]
allowed-tools: Read, Write, Edit, Bash(python3:*), Bash(nlm:*), Bash(date:*), Bash(mkdir:*), Bash(ln:*), mcp__notebooklm-mcp__*
user-invocable: true
---

> Works with `nlm` / `notebooklm-mcp` **v0.7.2+**.

# Research Pipeline Router

> Analogy: a library reference desk. When the researcher (user) makes a request (command), route them to the correct service window (subcommand).

Parse the first word of `$ARGUMENTS` and dispatch to the matching subcommand.

## Routing rules

1. If the first word is `run`:
   - After the auth gate passes, read `run.md` in this directory and follow its instructions.
   - Pass the remaining text after `run` as options.

2. If `$ARGUMENTS` is empty or the first word is `status`:
   - Read `status.md` in this directory and follow its instructions.

3. If the first word is `search`:
   - Read `search.md` in this directory and follow its instructions.
   - Pass the remaining text after `search` as the keyword.

4. If the first word is `collect`:
   - After the auth gate passes, read `collect.md` in this directory and follow its instructions.
   - Pass the remaining text after `collect` as options.

5. If the first word is `analyze`:
   - After the auth gate passes, read `analyze.md` in this directory and follow its instructions.
   - Pass the remaining text after `analyze` as options.

6. If the first word is `export`:
   - After the auth gate passes, read `export.md` in this directory and follow its instructions.
   - Pass the remaining text after `export` as options.

7. If the first word is `drive`:
   - After the auth gate passes, read `drive.md` in this directory and follow its instructions.
   - Pass the remaining text after `drive` as options.

8. If the first word is `media`:
   - After the auth gate passes, read `media.md` in this directory and follow its instructions.
   - Pass the remaining text after `media` as options.

9. If the first word is `organize`:
   - After the auth gate passes, read `organize.md` in this directory and follow its instructions.
   - Pass the remaining text after `organize` as options.

10. If the first word is `share`:
   - After the auth gate passes, read `share.md` in this directory and follow its instructions.
   - Pass the remaining text after `share` as options.

11. Otherwise:
   - Print the usage notes below.

## Auth gate

For every subcommand that calls MCP (run, collect, analyze, export, drive, media, organize, share — `search` is exempt), verify NotebookLM auth before running:

```bash
nlm login --check
```

- On failure: print "NotebookLM authentication required. Please run `nlm login`." and abort.
- On success: proceed with the subcommand.

**`status` is conditional**: only verify auth when MCP calls are needed. Skip auth when only reading the session file (`last_session.json`).

## Usage

```
/research run AI agent trends    # One-stop pipeline (interactive)
/research run AI --auto          # One-stop pipeline (automatic)
/research                        # Show status
/research status                 # Show status
/research search AI agents       # YouTube search
/research collect                # Collect search results into NotebookLM
/research analyze                # Analyze with NotebookLM
/research export                 # Export analysis results
/research drive list             # List Drive sources
/research drive sync             # Sync Drive sources
/research drive add <url>        # Add a Drive file
/research media <id> --type video    # Generate a Studio artifact (video/flashcards/mindmap/infographic/datatable)
/research organize <id> auto     # AI-label the notebook's sources (manage within NotebookLM)
/research share <id> docs        # Public link / invite / export to Docs · Sheets
```

| Subcommand | Description |
|------------|-------------|
| `run <topic> [--auto] [--preset <name>]` | One-stop pipeline (search → collect → analyze → export) |
| `status` | Research pipeline status (in-flight research, notebook state) |
| `search <keyword>` | Search YouTube videos by keyword and show the list |
| `collect` | Add discovered videos to a NotebookLM notebook as sources |
| `analyze` | Run AI analysis on the collected sources in NotebookLM |
| `export` | Export analysis results to files |
| `drive <list\|sync\|add>` | Manage Google Drive sources (list / sync / add) |
| `media <id> --type <...>` | Generate a Studio artifact: video · flashcards · mindmap · infographic · datatable |
| `organize <id> [auto\|list\|move\|…]` | Source labels — organize sources inside NotebookLM |
| `share <id> [status\|public\|invite\|docs\|sheets]` | Publish / collaborate / export to Google Docs · Sheets |

### Presets (`run --preset`)

| Preset | Output |
|--------|--------|
| `default` | report + Q&A |
| `trend-report` | report (newest-first search) |
| `competitor` | SWOT report |
| `learning` | report + podcast + quiz |
| `presentation` | report + slides |
| `deep-dive` | report (+ web sources) |
| `study-pack` | report + podcast + flashcards + mind map + quiz |
| `explainer` | report + Video Overview |
| `visual-report` | report + infographic + mind map + data table |
