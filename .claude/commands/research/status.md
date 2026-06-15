# Research Status - Session Overview

Show the current state of research sessions.

## Usage
- `/research status` — overall session overview
- `/research status <notebook-id>` — detailed view for a specific notebook
- `/research status --clean` — clean up session records for deleted notebooks

## Procedure

### Step 1: Check the session file

Read `~/research-output/research_sessions.jsonl`.

- If the file is missing or empty:
  ```
  ## Welcome to the Research Pipeline!

  No research sessions yet.

  ### One-time setup
  1. Install nlm CLI: `uv tool install notebooklm-mcp-cli` (or `pip install notebooklm-mcp-cli`)
  2. Authenticate: `nlm login` (sign in via your browser)
  3. Install yt-dlp: `pip install yt-dlp` (for YouTube search)

  ### Quick Start
  /research run AI agent trends --auto       # One-stop automated pipeline
  /research run AI agents --preset learning  # Generate learning materials
  /research run AI agents --preset presentation  # Generate a presentation
  /research search AI agents                 # Search only first

  ### Preset guide
  | Preset | Description | Artifacts |
  |--------|-------------|-----------|
  | default | Core-insights report | report |
  | trend-report | Trends / future outlook | report |
  | competitor | SWOT competitor analysis | report |
  | learning | Learning guide | report + audio |
  | deep-dive | Deep analysis (web research included) | report |
  | presentation | Presentation deck | report + slides |
  ```
  Then exit.

### Step 2: Decide the target

Check for a notebook-id in the text after `status` in `$ARGUMENTS`.
- If a notebook-id is given: query that notebook only.
- Otherwise: list every session in the JSONL file.

### Step 2.5: System info

Call `mcp__notebooklm-mcp__server_info()` to display the MCP server version:
```
NLM MCP server: v<version>
```

For detailed notebook queries, also call `mcp__notebooklm-mcp__notebook_describe(notebook_id=...)` to grab the AI summary. Show this in Step 4's detail view under "AI summary".

### Step 3: Fetch notebook info

For each target notebook, run:

1. `mcp__notebooklm-mcp__notebook_get(notebook_id=...)` — notebook details (source count, etc.)
2. `mcp__notebooklm-mcp__studio_status(notebook_id=...)` — artifact state (if any)

Run in parallel for multiple notebooks.

For MCP-failed notebooks, distinguish two cases:
- Transient API error: "Lookup failed — please retry shortly."
- Notebook deleted (NOT_FOUND): "This notebook was deleted from NotebookLM."

### Step 4: Print the summary table

Overall view:
```
## Research session overview

| Notebook | Topic | Sources | Status | Artifacts | Last updated |
|----------|-------|---------|--------|-----------|--------------|
| <first 8 chars..> | <topic> | <N> | <status> | <artifacts summary> | <updated_at> |
```

Detailed view (when a notebook-id is provided):
```
## Notebook detail: <topic>

### AI summary
> <render notebook_describe output as a blockquote>

- **Notebook ID**: <full id>
- **Created**: <date>
- **Status**: <status> (collecting/analyzing/exported)
- **Preset**: <preset>
- **Sources**: <N>
- **Artifacts**: <artifacts array detail>
- **Artifact status**: <status detail>
- **Collected URLs**:
  1. <url1>
  2. <url2>
```

### Step 5: Next-step hint

Suggest the next step based on the current status:
- Sources only, not yet analyzed: "Run `/research analyze <notebook-id>`."
- Analysis complete: "Run `/research export <notebook-id>` to export the results."

## --clean option

When `--clean` is set, call `mcp__notebooklm-mcp__notebook_get(notebook_id)` for each session in sessions.jsonl.
- If it returns NOT_FOUND: remove the line from the JSONL.
- If it succeeds: keep the line.

Report the cleanup result:
```
M of N sessions removed (notebook deleted from NotebookLM)
```

## Notes

- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen)
- Each line in the JSONL file is an independent JSON object
- Format dates for humans (YYYY-MM-DD)
- For long notebook IDs, show only the first 8 chars in tables
