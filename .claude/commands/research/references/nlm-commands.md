---
name: nlm-commands
description: Quick reference for the NotebookLM MCP/CLI commands used by the research skill.
---

# NotebookLM MCP/CLI Quick Reference

> A condensed list of the MCP tools and CLI commands used by the research skill.
> MCP prefix: `mcp__notebooklm-mcp__`

---

## 1. Auth

### MCP: refresh_auth

```
mcp__notebooklm-mcp__refresh_auth()
```

Attempts to refresh using stored tokens. On failure, run the CLI `nlm login`.

### MCP: save_auth_tokens

```
mcp__notebooklm-mcp__save_auth_tokens(
  cookies="..."
)
```

Cookie-based auth save. Fallback when `nlm login` fails.

### CLI: nlm login

```bash
nlm login              # Browser-based auth (recommended)
nlm login --check      # Verify auth status (used by subcommand gates)
nlm login switch <profile>  # Switch accounts
```

---

## 2. Notebooks

### notebook_create

```
mcp__notebooklm-mcp__notebook_create(title="Research: <topic> - <date>")
```

Returns: `{ notebook_id: "..." }`

### notebook_list

```
mcp__notebooklm-mcp__notebook_list(max_results=100)
```

Returns: list of notebooks `[{ notebook_id, title, created_at }]`

### notebook_get

```
mcp__notebooklm-mcp__notebook_get(notebook_id="...")
```

Returns: notebook details (sources, source count, ...)

### notebook_query

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id="...",
  query="Summarize the top 5 key insights.",
  conversation_id="...",   # optional: continue a conversation
  source_ids=["..."],      # optional: scope to specific sources
  timeout=120              # optional: response wait time in seconds (default 120)
)
```

Returns: AI response text + conversation_id (for follow-ups)

### notebook_describe

```
mcp__notebooklm-mcp__notebook_describe(notebook_id="...")
```

Returns: notebook description/summary

### notebook_rename

```
mcp__notebooklm-mcp__notebook_rename(notebook_id="...", new_title="New title")
```

### notebook_delete

```
mcp__notebooklm-mcp__notebook_delete(notebook_id="...", confirm=true)
```

---

## 3. Sources

### source_add

**URL source:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="url",
  url="https://youtube.com/watch?v=...",
  wait=true    # wait for processing to complete (recommended)
)
```

**Bulk URL add:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="url",
  urls=["https://url1.com", "https://url2.com"],
  wait=true,
  wait_timeout=120    # default 120 seconds for source processing
)
```

**Text source:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="text",
  text="source body...",
  title="source title"
)
```

**Google Drive source:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="drive",
  document_id="...",
  doc_type="doc"          # optional: "doc" | "slides" | "sheets" | "pdf" (default "doc")
)
```

**File source:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="file",
  file_path="/path/to/file.pdf"
)
```

### source_get_content

```
mcp__notebooklm-mcp__source_get_content(source_id="...")
```

Returns: the full text content of the source.

### source_describe

```
mcp__notebooklm-mcp__source_describe(source_id="...")
```

Returns: source summary/description.

### source_rename

```
mcp__notebooklm-mcp__source_rename(notebook_id="...", source_id="...", new_title="New title")
```

### source_delete

```
mcp__notebooklm-mcp__source_delete(source_id="...", confirm=true)
```

### source_list_drive / source_sync_drive

```
mcp__notebooklm-mcp__source_list_drive(notebook_id="...")
mcp__notebooklm-mcp__source_sync_drive(source_ids=["..."], confirm=true)
```

List and sync Drive sources.

---

## 4. Chat configuration

### chat_configure

```
mcp__notebooklm-mcp__chat_configure(
  notebook_id="...",
  goal="custom",
  custom_prompt="Act as a research analyst and extract the key insights.",
  response_length="longer"    # "default" | "longer" | "shorter"
)
```

`goal` options: `"default"`, `"learning_guide"`, `"custom"`

---

## 5. Notes

### note (CRUD)

```
mcp__notebooklm-mcp__note(
  notebook_id="...",
  action="create",       # "create" | "list" | "update" | "delete"
  note_id="...",          # required for update/delete
  title="Note title",
  content="Note content",
  confirm=true            # required for delete
)
```

---

## 6. Studio

### studio_create

**Report:**
```
mcp__notebooklm-mcp__studio_create(
  notebook_id="...",
  artifact_type="report",
  confirm=true
)
```

**Mind map:**
```
mcp__notebooklm-mcp__studio_create(
  notebook_id="...",
  artifact_type="mind_map",
  confirm=true
)
```

**Audio (podcast):**
```
mcp__notebooklm-mcp__studio_create(
  notebook_id="...",
  artifact_type="audio",
  confirm=true
)
```

Other artifact_type values: `"video"`, `"infographic"`, `"slides"`, `"quiz"`, `"flashcards"`

### studio_create key options

| artifact_type | Option | Values |
|---------------|--------|--------|
| audio | audio_format | "deep_dive" \| "brief" \| "critique" \| "debate" |
| audio | audio_length | "short" \| "default" \| "long" |
| video | video_format | "explainer" \| "brief" |
| video | visual_style | "auto_select" \| "classic" \| "whiteboard" \| "kawaii" \| "colorful" \| "modern" \| "retro" \| "minimalist" \| "bold" |
| infographic | orientation | "portrait" \| "landscape" |
| infographic | detail_level | "simple" \| "detailed" |
| infographic | infographic_style | "timeline" \| "comparison" \| "flowchart" \| "hierarchy" \| "statistics" \| "process" \| "geographic" \| "listicle" \| "mixed" |
| report | report_format | "Briefing Doc" \| "Study Guide" \| "Blog Post" \| "Create Your Own" |
| report | custom_prompt | user-supplied prompt |
| slide_deck | slide_format | "detailed_deck" \| "presenter_slides" |
| slide_deck | slide_length | integer (slide count) |
| data_table | description | table description (required) |
| mind_map | title | mind-map title |
| quiz | question_count | integer (default 2) |
| quiz/flashcards | difficulty | "easy" \| "medium" \| "hard" |

Common options: `language` (BCP-47 code, default "en"), `focus_prompt` (focus topic), `source_ids` (specific sources only)

### studio_status

```
mcp__notebooklm-mcp__studio_status(notebook_id="...")
```

Returns: artifact array `[{ type, status, created_at }]`
status: `"pending"` | `"in_progress"` | `"completed"` | `"failed"`

Polling required after creation. 5-second interval is recommended.

### rename (rename artifact)
```
mcp__notebooklm-mcp__studio_status(
  notebook_id="...",
  action="rename",
  artifact_id="...",
  new_title="New name"
)
```

### studio_revise

```
mcp__notebooklm-mcp__studio_revise(
  notebook_id="...",
  artifact_id="...",
  slide_instructions=[{"slide": 3, "instruction": "Add a data chart"}],
  confirm=true
)
```

Edits individual slides in an existing deck. Creates a new artifact; the original is preserved.

### studio_delete

```
mcp__notebooklm-mcp__studio_delete(notebook_id="...", artifact_id="...", confirm=true)
```

### download_artifact

```
mcp__notebooklm-mcp__download_artifact(
  notebook_id="...",
  artifact_type="report",
  artifact_id="...",       # optional: pin to a specific instance when multiple of the same type exist
  output_path="~/research-output/my_report.md",
  output_format="markdown" # optional: "json" | "markdown" | "html" (for quiz/flashcards)
)
```

artifact_type: `"report"` | `"audio"` | `"video"` | `"slides"` | `"quiz"` | `"flashcards"` | `"mind_map"` | `"infographic"` | `"data_table"`
Options: `slide_deck_format` (`"pdf"` | `"pptx"`), `artifact_id` (when multiple of the same type), `output_format` (`"json"` | `"markdown"` | `"html"` — for quiz/flashcards)

### export_artifact

```
mcp__notebooklm-mcp__export_artifact(
  notebook_id="...",
  artifact_id="...",
  export_type="docs",   # "docs" | "sheets"
  title="Export title"   # optional: Google Docs/Sheets document title
)
```

Export to Google Docs/Sheets. Data Table → Sheets, Report → Docs.

---

## 7. Research (source discovery)

### research_start

```
mcp__notebooklm-mcp__research_start(
  query="AI agent framework comparison",
  notebook_id="...",    # optional: creates a new notebook if absent
  title="...",          # optional: title for the new notebook
  source="web",         # "web" | "drive"
  mode="fast"           # "fast" | "deep"
)
```

Returns: `{ task_id: "..." }`

### research_status

```
mcp__notebooklm-mcp__research_status(
  notebook_id="...",
  task_id="...",         # optional: poll a specific task
  poll_interval=30,      # interval seconds (default 30)
  max_wait=300,          # max wait seconds (default 300, 0 = single poll)
  compact=true,          # token-saving summary (default true)
  query="..."            # optional: fallback when task_id has changed
)
```

Returns: `{ status, results: [{ title, url, snippet }] }`

### research_import

```
mcp__notebooklm-mcp__research_import(
  notebook_id="...",
  task_id="...",
  source_indices=[0, 2, 4]    # indices of discovered sources to import
)
```

---

## 8. Error codes and remediation

| Error | Cause | Remediation |
|-------|-------|-------------|
| `AUTH_EXPIRED` | Token expired (~20 min) | `refresh_auth()` → if failed, `nlm login` |
| `AUTH_REQUIRED` | Not authenticated | Run `nlm login` |
| `SOURCE_FAILED` | URL inaccessible | Verify URL; check for private videos or blocked sites |
| `QUOTA_EXCEEDED` | More than 50 sources per notebook | Split by topic into multiple notebooks |
| `STUDIO_FAILED` | Artifact creation failed | Verify source count/size, retry, try an alternative type |
| `RATE_LIMITED` | API rate exceeded | Wait 2-5 seconds and retry |
| `NOT_FOUND` | Wrong notebook/source ID | Re-check ID via `notebook_list` |
| `NETWORK_ERROR` | Network connectivity issue | Verify connection and retry |

### Recommended rate-limit intervals

| Operation | Interval |
|-----------|----------|
| source_add | 2s |
| studio_create | 5s |
| research_* | 2s |
| notebook_query | 2s |

---

## 9. CLI commands (MCP companion)

Use these when MCP is missing the feature or the CLI is more convenient.

```bash
# Download (richer format/path options)
nlm download report <notebook-id> --output <path>
nlm download audio <notebook-id> --output <path>
nlm download slide-deck <notebook-id> --output <path> --format pptx
nlm download quiz <notebook-id> --output <path> --format json

# Alias management (no MCP equivalent)
nlm alias set <name> <notebook-id>
nlm alias get <name>
nlm alias list

# Source listing
nlm source list <notebook-id>

# Studio status
nlm studio status <notebook-id>

# Research polling (long running)
nlm research status <notebook-id> --task-id <id> --max-wait 0

# Config / profile (no MCP equivalent)
nlm config list
nlm login switch <profile>
```

---

## 10. Source labels (v0.7.2)

Organize a notebook's sources into themed labels — MCP `label` tool, `nlm label` CLI.

```
label(notebook_id, action="auto")          # nlm label auto <nb> --json   (needs 5+ sources)
label(notebook_id, action="list")          # nlm label list <nb> --json
label(action="reorganize")                 # nlm label reorganize <nb>
label(action="create", name=...)           # nlm label create <nb> <name>
label(action="rename", ...)                # nlm label rename <nb> <old> <new>
label(action="set_emoji", ...)             # nlm label emoji <nb> <label> <emoji>
label(action="move_source", source_id, label_id)  # nlm label move <nb> <source-id> <label-id>  (additive)
label(action="delete", ...)                # nlm label delete <nb> <label>   (sources kept)
```

## 11. Sharing & export (v0.7.2)

```
# Sharing (MCP notebook_share_* / nlm share)
nlm share status  <nb>
nlm share public  <nb>           # anyone with link can view (some accounts reject via API → use web UI)
nlm share private <nb>
nlm share invite  <nb> <email> --role viewer|editor

# Export an artifact to Google Docs/Sheets (MCP export_artifact / nlm export)
nlm export to-docs   <nb> <report-artifact-id>     --title "..."
nlm export to-sheets <nb> <data-table-artifact-id> --title "..."
```
Exported Docs/Sheets are **owner-private** until shared in Google Drive.

## 12. Download subcommands (v0.7.2)

`download_artifact(artifact_type=...)` or:
```
nlm download report|audio|video|slide-deck|infographic|mind-map|data-table|quiz|flashcards <nb> -o <path>
```
- `mind-map` download fails on v0.7.2 (known bug; the artifact still generates).

## 13. Video Overview formats (v0.7.0)

`studio_create(artifact_type="video", video_format="explainer|brief|cinematic", visual_style=..., focus_prompt=...)`.
For `cinematic`, pass the full creative brief via `focus_prompt` (`--focus` on the CLI).

## 14. Auth states (v0.7.x)

`refresh_auth` / `nlm login --check` distinguish:
- `stale` — genuine expiry/load failure → prompt the user to run `nlm login`.
- `unverified` — transient network error → retry before bothering the user.

## 15. Multi-notebook operations (v0.7.2 — CLI)

Available via the `nlm` CLI (no dedicated `/research` subcommand yet; invoke directly):

```
# Batch across notebooks
nlm batch query      <nb1> <nb2> … "<question>"     # same question to many notebooks
nlm batch add-source <nb1> <nb2> … --url <url>      # same source to many notebooks
nlm batch create     "<title1>" "<title2>" …        # create several notebooks
nlm batch studio     <nb1> <nb2> … --type <artifact>  # generate artifacts across notebooks
nlm batch delete     <nb1> <nb2> …                  # IRREVERSIBLE

# Cross-notebook (aggregated answer over multiple notebooks)
nlm cross query <nb1> <nb2> … "<question>"

# Pipelines (user-defined multi-step YAML workflows)
nlm pipeline list
nlm pipeline create <pipeline.yaml>
nlm pipeline run <pipeline-name> <notebook-id>

# Tags (organize whole notebooks; distinct from source labels)
nlm tag add <nb> <tag…> ;  nlm tag remove <nb> <tag…>
nlm tag list ;  nlm tag select "<query>"            # find notebooks relevant to a query
```

## 16. Long-lived MCP server tuning

When the MCP server runs for a long time (always-on), bound its conversation cache
to avoid unbounded RAM growth (env vars on the `nlm mcp` process):

```
NOTEBOOKLM_CONVERSATION_TURNS_PER_NOTEBOOK=<n>   # turns kept per notebook
CONVERSATION_MAX_NOTEBOOKS=<n>                   # notebooks kept in cache
CONVERSATION_MAX_CHARS_PER_TURN=<n>              # truncate long turns
```
- `nlm mcp --stateless` disables the conversation cache entirely.
- The server picks up new tokens immediately when `nlm login` runs externally (watches the auth files).
