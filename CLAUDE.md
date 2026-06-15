# NLM Research

End-to-end research pipeline: YouTube search → NotebookLM AI analysis → auto-generated podcast / slides / report.

## Required Tools

| Tool | Install | Purpose |
|------|---------|---------|
| Claude Code | [Official guide](https://docs.anthropic.com/claude-code) | AI assistant |
| nlm | `uv tool install notebooklm-mcp-cli` | NotebookLM CLI + MCP server |
| yt-dlp | `pip install yt-dlp` | YouTube search |

## MCP Server Configuration

The NotebookLM MCP server is required to use NotebookLM's AI podcast, slides, and report generation features.

This repo ships a project-scope MCP config (`.mcp.json`), so running `claude` inside the repo directory connects the `notebooklm-mcp` server automatically (first run shows a trust prompt). The `mcp__notebooklm-mcp__*` permission is also pre-allowed in `.claude/settings.json`.

To register manually:

```bash
claude mcp add -s project notebooklm-mcp -- nlm mcp
```

## Core Commands

```bash
/research run AI agent trends --auto           # One-stop automated research
/research run React 19 --preset learning       # Learning mode (podcast + quiz)
/research run market outlook --preset presentation # Presentation mode (slides)
/research search AI agents                      # YouTube search only
/research status                                # Show current session
```

## Authentication

```bash
nlm login         # Connect Google account (one-time)
nlm login --check # Verify auth status
```

## Output Directory

Saved automatically under `~/research-output/<topic>/`.

## Language

All skill prompts, queries, and generated artifacts default to English (BCP-47 `en`). Pass `--lang <code>` (e.g. `--lang ko`) to switch the output language for a single run.
