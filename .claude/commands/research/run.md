# Research Run - One-stop Research Pipeline

> Analogy: instead of walking between five library counters (search, collect, analyze, export, status), do everything at one "one-stop service desk".

## Usage

```
/research run <topic> [options]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `<topic>` | **required** | Search keyword |
| `--auto` | false | Run without confirmation prompts |
| `--preset <name>` | default | Preset (see below) |
| `--top <N>` | preset-specific | Use the top N videos |
| `--notebook <id>` | (create new) | Add to an existing notebook |
| `--lang <code>` | en | Artifact language (BCP-47: en, ko, ja, ...) |
| `--drive <url-or-id>` | (none) | Collect a Google Drive file alongside the YouTube sources |
| `--organize` | false | After collect, auto-label the sources (`/research organize <id> auto`) |

## Parsing

Parse the text after `run` in `$ARGUMENTS`.

1. Check for `--auto` → set `auto_mode`
2. Extract `--preset <name>` → default `default`
3. Extract `--top <N>` → fall back to preset default
4. Extract `--notebook <id>` → otherwise create a new notebook
5. The remainder is the `<topic>` (search keyword)
6. Extract `--lang <code>` → default `en`
7. Extract `--drive <url-or-id>` → if absent, no Drive source is collected
8. Check for `--organize` → if set, auto-label sources after collect

If the topic is empty, error: "Please provide a topic. Example: `/research run AI agent trends`."

## Preset configuration

| Preset | top | chat_configure | Artifacts | Outputs |
|--------|-----|----------------|-----------|---------|
| `default` | 5 | goal="custom", custom_prompt="Act as a research analyst and extract the key insights." | report | report.md |
| `trend-report` | 5 | goal="custom", custom_prompt="Act as a trend analyst. Trace how the trend evolved over time, analyze the current market state, and project the future outlook. Include a past → present → future timeline view." with `-d` enabled by default | report | report.md |
| `competitor` | 5 | goal="custom", custom_prompt="Act as a competitive analyst and analyze through the SWOT lens." | report | report.md |
| `learning` | 3 | goal="learning_guide" | report + audio + quiz | report.md + podcast.mp3 + quiz.json |
| `deep-dive` | 10 | goal="custom", custom_prompt="Act as a deep-dive research analyst and analyze the topic exhaustively from every angle." + research_start | report | report.md |
| `presentation` | 5 | goal="custom", custom_prompt="Act as a presentation expert and structure the key points into a slide outline." | report + slides | report.md + slides.pptx |
| `study-pack` | 5 | goal="learning_guide" | report + audio + flashcards + mind_map + quiz | report.md + podcast.mp3 + flashcards.json + mindmap.json + quiz.json |
| `explainer` | 5 | goal="custom", custom_prompt="Act as a research analyst and extract the key insights." | report + video (explainer) | report.md + video.mp4 |
| `visual-report` | 5 | goal="custom", custom_prompt="Act as a research analyst and extract the key insights." | report + infographic + mind_map + data_table | report.md + infographic.png + mindmap.json + datatable.csv |

Invalid preset error: "Invalid preset. Allowed: default, trend-report, competitor, learning, deep-dive, presentation, study-pack, explainer, visual-report"

## Interactive mode (default, no --auto)

Execute MCP calls directly for each step. Confirmation prompts happen exactly twice.

### Step 1: Search

```
██░░░░░░░░░░░░░░░░░░ 10% [Step 1/4] Search
```

1. Run `python3 ~/.claude/commands/research/scripts/youtube_search.py "<topic>" -n <top> --json --save-urls ~/research-output/<topic>/source_urls.json > ~/research-output/last_search.json`
   - For the `trend-report` preset, add `-d` (newest-first) by default to capture trend movement over time.
   - `<topic>` in the path is the topic with spaces replaced by hyphens (same folder the export step uses). `--save-urls` writes a `{normalized title → watch URL}` sidecar (merge-only) so source links resolve to the real videos in the GUI Sources tab.
2. Parse the JSON and render a numbered list:
   ```
   ## YouTube search results: "<topic>"

   1. [video title] - channel (views, upload date)
      URL: https://youtube.com/watch?v=...
   2. ...
   ```
3. **Confirmation [1/2]**: "Pick video numbers to collect (e.g. 1,3,5 or all):"
   - If numbers are given, collect only those videos.
   - `all` collects the top `top` videos.
   - Cancel aborts the pipeline.

### Step 2: Collect

```
█████████░░░░░░░░░░░ 45% [Step 2/4] Collect
```

**Auth refresh**: call `mcp__notebooklm-mcp__refresh_auth()` first.

1. Acquire a notebook:
   - If `--notebook <id>` is set, use that notebook.
   - Otherwise, get the date with `date '+%Y-%m-%d'`, then:
     `mcp__notebooklm-mcp__notebook_create(title="Research: <topic> - <date>")`
2. Add sources (bulk → single fallback):
   ```
   mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", urls=[...], wait=true)
   ```
   On failure, add each URL individually:
   ```
   mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", url="<URL>", wait=true)
   ```
2a. **Add the Drive source** (when `--drive` is set):
   - Extract the document ID from the URL using the `/d/<ID>/` pattern.
   - Auto-detect `doc_type` from the URL (`document/` → doc, `presentation/` → slides, `spreadsheets/` → sheets, `drive.google.com/file/` → pdf).
   ```
   mcp__notebooklm-mcp__source_add(notebook_id, source_type="drive", document_id="<ID>", doc_type="<detected type>")
   ```
   On failure, tell the user to check the Drive file's sharing settings and continue with the YouTube sources only (Tier 2 Degraded).
3. Report the result to the user (success / failure counts, including the Drive source).
4. Save `~/research-output/last_session.json`:
   ```json
   {
     "notebook_id": "<id>",
     "topic": "<topic>",
     "created_at": "<ISO8601>",
     "updated_at": "<ISO8601>",
     "status": "collecting",
     "source_count": <N>,
     "urls": ["<url1>", "<url2>"],
     "artifacts": [],
     "preset": "<preset>"
   }
   ```
5. Append a session record to `~/research-output/research_sessions.jsonl`.
6. **Confirmation [2/2]**: "Collection complete. Continue automatically through analysis + export? (yes/no)"
   - yes → Step 3 and Step 4 run without further prompts
   - no → summarize intermediate results and stop

### Step 3: Analyze

```
█████████████████░░░ 85% [Step 3/4] Analyze
```

**Auth refresh**: call `mcp__notebooklm-mcp__refresh_auth()` first.

1. `mcp__notebooklm-mcp__chat_configure(notebook_id, goal=<preset>, custom_prompt=<preset>, response_length="longer")`
2. `mcp__notebooklm-mcp__notebook_query(notebook_id, query=<preset-specific question>)`
3. Save the Q&A result as a note:
   `mcp__notebooklm-mcp__note(notebook_id, action="create", title="<topic> - Key insights", content=<result>)`
4. Create preset-specific artifact(s) (see Auto-routing section):
   `mcp__notebooklm-mcp__studio_create(notebook_id, artifact_type=<preset>, language=<lang>, confirm=true)`
5. Poll `mcp__notebooklm-mcp__studio_status(notebook_id)` (5-second interval, max 300s)
6. On completion, continue to Step 4 (if Step 2 confirmation was yes).

### Step 4: Export

```
████████████████████ 100% [Step 4/4] Export
```

**Auth refresh**: call `mcp__notebooklm-mcp__refresh_auth()` first.

1. `mkdir -p ~/research-output/<topic>/` (replace spaces with hyphens)
2. Download artifacts per preset:
   `mcp__notebooklm-mcp__download_artifact(notebook_id, artifact_type=<preset>, output_path="~/research-output/<topic>/...")`
3. Save the Q&A result to `~/research-output/<topic>/<topic>_analysis.md` (Write tool).
4. Update `~/research-output/last_session.json` (status: "exported").
5. Print the completion summary.

## Auto mode (--auto)

Run the entire pipeline sequentially without any confirmation. Apply the preset defaults.

### Auto sequence

1. **Search**: run `python3 ~/.claude/commands/research/scripts/youtube_search.py "<topic>" -n <top> --json --save-urls ~/research-output/<topic>/source_urls.json` → extract the top `top` URLs (the `--save-urls` sidecar — topic spaces→hyphens — lets the GUI Sources tab link to the real videos)
2. **Auth refresh**: call `mcp__notebooklm-mcp__refresh_auth()`
3. **Collect**:
   - `mcp__notebooklm-mcp__notebook_create(title="Research: <topic> - <date>")`
   - `mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", urls=[...], wait=true)`
   - Save `~/research-output/last_session.json`
   - Append to `~/research-output/research_sessions.jsonl`
4. **Auth refresh**: call `mcp__notebooklm-mcp__refresh_auth()`
5. **Analyze**:
   - `mcp__notebooklm-mcp__chat_configure(notebook_id, goal=<preset>, custom_prompt=<preset>)`
   - `mcp__notebooklm-mcp__notebook_query(notebook_id, query=<preset-specific question>)`
   - `mcp__notebooklm-mcp__studio_create(notebook_id, artifact_type=<preset>, language=<lang>, confirm=true)`
   - Poll `mcp__notebooklm-mcp__studio_status(notebook_id)` (5s interval, max 300s)
   - Save Q&A via `mcp__notebooklm-mcp__note(notebook_id, action="create", title="<topic> - Key insights", content=<result>)`
6. **Auth refresh**: call `mcp__notebooklm-mcp__refresh_auth()`
7. **Export**:
   - `mkdir -p ~/research-output/<topic>/`
   - `mcp__notebooklm-mcp__download_artifact(notebook_id, artifact_type=<preset>, output_path="~/research-output/<topic>/...")`
   - Save Q&A as `~/research-output/<topic>/<topic>_analysis.md`
   - Update `~/research-output/last_session.json` (status: "exported")

### Preset auto-routing

**default / competitor:**
```
chat_configure(goal="custom", custom_prompt=<preset-specific>)
→ notebook_query("Summarize the top 5 key insights in a structured format.")
→ studio_create(artifact_type="report", confirm=true)
→ poll studio_status
→ download_artifact(artifact_type="report")
```

**trend-report:**
```
chat_configure(goal="custom", custom_prompt="Act as a trend analyst. Trace how the trend evolved over time...")
→ notebook_query("Analyze this topic as a timeline and structure past trends, current state, and future outlook.")
→ studio_create(artifact_type="report", confirm=true)
→ poll studio_status
→ download_artifact(artifact_type="report")
```
Search adds `-d` (newest first) by default to capture how the trend moves over time.

**learning:**
```
chat_configure(goal="learning_guide")
→ notebook_query("Organize the core concepts of this topic in a learning order.")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="audio", confirm=true)
→ studio_create(artifact_type="quiz", question_count=5, confirm=true)
→ poll studio_status (report + audio + quiz)
→ download_artifact(artifact_type="report")
→ download_artifact(artifact_type="audio")
→ download_artifact(artifact_type="quiz", output_format="json")
```

**presentation:**
```
chat_configure(goal="custom", custom_prompt="Act as a presentation expert...")
→ notebook_query("Organize the key points into a slide structure.")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="slides", slide_format="detailed_deck", confirm=true)
→ poll studio_status (report + slides)
→ download_artifact(artifact_type="report")
→ download_artifact(artifact_type="slides", slide_deck_format="pptx")
```

**deep-dive:**
```
chat_configure(goal="custom", custom_prompt="Act as a deep-dive research analyst...")
→ research_start(notebook_id, query=<topic>, source="web", mode="fast")
→ poll research_status
→ research_import(notebook_id, task_id=..., source_indices=all)
→ notebook_query("Synthesize every source and produce a deep analysis.")
→ studio_create(artifact_type="report", confirm=true)
→ poll studio_status
→ download_artifact(artifact_type="report")
```

**study-pack:**
```
chat_configure(goal="learning_guide")
→ notebook_query("Organize the core concepts of this topic in a learning order.")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="audio", confirm=true)
→ studio_create(artifact_type="flashcards", difficulty="medium", confirm=true)
→ studio_create(artifact_type="mind_map", confirm=true)
→ studio_create(artifact_type="quiz", question_count=5, confirm=true)
→ poll studio_status (report + audio + flashcards + mind_map + quiz)
→ download_artifact for each (mind_map download may fail on nlm v0.7.2 — keep going)
```

**explainer:**
```
chat_configure(goal="custom", custom_prompt="Act as a research analyst and extract the key insights.")
→ notebook_query("Summarize the top 5 key insights in a structured format.")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="video", video_format="explainer", visual_style="auto_select", confirm=true)
→ poll studio_status (report + video; allow up to 10 min for video)
→ download_artifact(artifact_type="report")
→ download_artifact(artifact_type="video")
```

**visual-report:**
```
chat_configure(goal="custom", custom_prompt="Act as a research analyst and extract the key insights.")
→ notebook_query("Summarize the top 5 key insights in a structured format.")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="infographic", orientation="landscape", detail_level="standard", confirm=true)
→ studio_create(artifact_type="mind_map", confirm=true)
→ studio_create(artifact_type="data_table", description="key facts and comparisons from the sources", confirm=true)
→ poll studio_status
→ download_artifact for report / infographic / data_table (mind_map download may fail on nlm v0.7.2)
```

> **Optional `--organize`**: after collect (and before/after analyze), run `label(notebook_id, action="auto")` to AI-group the sources, then continue. Needs 5+ sources.

## Error handling (3-tier)

**Priority**: run.md's 3-tier handling is the top-level rule. The error handling in subcommand `.md` files applies only when those subcommands are run independently (`/research analyze`, etc.).

### Tier 1: Fixable (auto-recover)

| Error | Response |
|-------|----------|
| AUTH_EXPIRED | Call `mcp__notebooklm-mcp__refresh_auth()` to auto-refresh |
| SOURCE_FAILED (individual) | Skip the URL, continue, log the failure |
| RATE_LIMITED | Wait 5 seconds and retry (max 3 attempts) |

### Tier 2: Degraded (partial progress)

| Error | Response |
|-------|----------|
| Partial collection failure | Run analysis on the successful sources only. Report the failed count. |
| STUDIO_FAILED | Skip that artifact, continue. Keep the Q&A result. |
| research_start failed | For deep-dive, skip web research and run analysis on existing sources only |

### Tier 3: Fatal (abort)

| Error | Response |
|-------|----------|
| Total auth failure | refresh_auth failed → instruct to run `nlm login`, abort |
| 0 sources collected | "Could not collect any sources. Try different keywords." Abort. |
| Notebook creation failed | Tell the user to check NotebookLM status, abort |

## Progress bars

Print a progress bar at each step transition (weighted):

```
██░░░░░░░░░░░░░░░░░░ 10% [Step 1/4] Search
█████████░░░░░░░░░░░ 45% [Step 2/4] Collect
█████████████████░░░ 85% [Step 3/4] Analyze
████████████████████ 100% [Step 4/4] Export
```

Print the same weighted bars in auto mode.

## Completion summary

When the pipeline finishes, print an ASCII-box summary. Track start/end timestamps for each step to compute elapsed seconds:

```
┌─────────────────────────────────────────────────┐
│  Research Pipeline Complete                      │
├──────────┬────────┬──────────────────────────────┤
│ Step     │ Status │ Detail                       │
├──────────┼────────┼──────────────────────────────┤
│ Search   │ DONE   │ 10 results (12s)             │
│ Collect  │ DONE   │ 5 sources (45s)              │
│ Analyze  │ DONE   │ Q&A + report (120s)          │
│ Export   │ DONE   │ ~/research-output/<topic>/(8s)│
├──────────┴────────┴──────────────────────────────┤
│ Total: 185s                                       │
│ NLM: https://notebooklm.google.com/notebook/<id> │
│ Output files:                                    │
│  - ~/research-output/<topic>_report.md           │
│  - ~/research-output/<topic>_analysis.md         │
└─────────────────────────────────────────────────┘
```

When Tier 2 errors occurred, include them as warnings:

```
│ Warnings:                                        │
│  - 2 URLs failed to collect (skipped)            │
│  - audio creation failed (skipped)               │
```

## Orchestration model

**run.md = direct orchestration** (it lists each step's MCP calls directly). Subcommand `.md` files are for standalone use (`/research search`, `/research collect`, ...).

## Notes

- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen)
- Always get the date via the `date` command (no mental arithmetic)
- Refresh auth before each of collect/analyze/export
- Output directory: `~/research-output/` (auto-create with `mkdir -p`)
- Replace spaces in the topic with hyphens for filenames
- Apply the same 3-tier error rules in `--auto` mode
- `deep-dive`'s `research_start` can take a long time (1-3 minutes)
