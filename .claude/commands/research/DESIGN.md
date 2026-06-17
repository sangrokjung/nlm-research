# Research Pipeline - Integrated System Design

> Design document for unifying YouTube search + NotebookLM analysis into a single `/research` skill.
> Analogy: automate the entire research workflow — searching the catalog (search), pulling books onto a cart (collect), reading and analyzing (analyze), and writing the summary notes (export) — done by the librarian agent end-to-end.

---

## 1. Folder layout

```
~/.claude/commands/research/
├── DESIGN.md                        # System design
├── SKILL.md                         # Main router (subcommand dispatch, ~100 lines)
├── run.md                           # /research run <topic> (one-stop pipeline)
├── search.md                        # /research search <keyword>
├── collect.md                       # /research collect <urls|keyword>
├── analyze.md                       # /research analyze <notebook-id>
├── export.md                        # /research export <notebook-id>
├── status.md                        # /research status [notebook-id]
├── drive.md                         # /research drive list|sync|add
├── media.md                         # /research media <id> --type ... (v0.7.2 Studio artifacts)
├── organize.md                      # /research organize <id> (source labels, v0.7.2)
├── share.md                         # /research share <id> (public/invite/export, v0.7.2)
├── scripts/
│   └── youtube_search.py            # yt-dlp wrapper (--save-urls writes the source-URL sidecar)
└── references/
    ├── nlm-commands.md              # Core MCP/CLI reference
    └── workflow-examples.md         # Real-world usage scenarios
```

### Design principles (from Task #1 research)

- **Skill name**: `research` (favor concision, see Task #2 proposal)
- **500-line cap**: each subcommand `.md` stays under 500 lines. Move heavyweight references into `references/` (progressive disclosure).
- **Hybrid pattern** (Task #2 analysis): router (SKILL.md) + scripts (scripts/) + references (references/).

### Symlink strategy

```bash
ln -s ~/.claude/commands/youtube-search/scripts/youtube_search.py \
      ~/.claude/commands/research/scripts/youtube_search.py
```

The existing `youtube-search` skill remains standalone-usable. `research` is the higher-level wrapper.

---

## 2. Per-file responsibility and content summary

### 2.1 SKILL.md (main router)

```yaml
---
name: research
description: End-to-end research pipeline. YouTube search -> NotebookLM collection/analysis -> result export, unified into one workflow.
argument-hint: <run|search|collect|analyze|export|status> [options]
allowed-tools: Read, Write, Edit, Bash(python3:*), Bash(nlm:*), Bash(date:*), Bash(mkdir:*), Bash(ln:*), mcp__notebooklm-mcp__*
user-invocable: true
---
```

**Role**: parse the first word of `$ARGUMENTS` and route to the matching subcommand `.md`. Mirrors the content-pipeline router pattern.

**Routing table**:

| First word | Target | Notes |
|------------|--------|-------|
| `run` | `run.md` | One-stop pipeline (search→collect→analyze→export) |
| (empty) / `status` | `status.md` | Current session status |
| `search` | `search.md` | YouTube keyword search |
| `collect` | `collect.md` | Push search results into NotebookLM |
| `analyze` | `analyze.md` | Request NotebookLM analysis |
| `export` | `export.md` | Export analysis results |
| anything else | print usage | |

**Auth gate (all subcommands except `search`)**:
```bash
nlm login --check
```
On failure: try `mcp__notebooklm-mcp__refresh_auth()`. If that also fails, instruct the user to run `nlm login` and abort.

### 2.2 search.md (YouTube search)

**Role**: search YouTube by keyword and display results.

**Procedure**:
1. Extract the keyword from `$ARGUMENTS` (text after `search`)
2. If empty, ask the user
3. Run `python3 scripts/youtube_search.py "<keyword>" -n <count>`
4. Render the results as a numbered list (title, channel, views, length, URL)
5. **Next-step hint**: "Run `/research collect` to push these into NotebookLM."

**Option pass-through**:
- `-n <number>`: result count (default 10)
- `-d`: newest first
- `--json`: JSON output

**MCP tools**: none (only the youtube_search.py script).

### 2.3 collect.md (source collection)

**Role**: add YouTube URLs, web URLs, or local files to a NotebookLM notebook as sources.

**Procedure**:
1. **Acquire a notebook**
   - List existing notebooks via `mcp__notebooklm-mcp__notebook_list`
   - If none fit, create a new one: `mcp__notebooklm-mcp__notebook_create(title="<topic>")`
2. **Add URL sources**
   - Use URLs from `$ARGUMENTS` if present
   - Otherwise let the user pick numbers from the most recent `search` results
   - For each URL: `mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", url="<URL>", wait=true)`
   - **`wait=true` is mandatory**: wait for source processing so that later analyze calls can succeed (Task #3)
   - **Bulk-add fallback**: if a bulk add fails, fall back to one URL at a time (Task #3 error handling)
3. **Add text source (optional)**
   - `mcp__notebooklm-mcp__source_add(notebook_id, source_type="text", text="...", title="...")`
4. **Verify**: confirm the source count via `mcp__notebooklm-mcp__notebook_get(notebook_id)`
4.5. **Save last_session**: write `~/research-output/last_session.json` (downstream commands auto-reference it)
5. **Session log**: append session info to `~/research-output/research_sessions.jsonl` immediately after source addition (including partial success)
   ```json
   {"notebook_id": "...", "topic": "...", "created_at": "...", "updated_at": "...", "status": "collecting", "source_count": 5, "urls": ["..."], "artifacts": [], "preset": "default"}
   ```
6. **Next-step hint**: "Run `/research analyze <notebook-id>` to start analysis."

**MCP tools**:
- `mcp__notebooklm-mcp__notebook_list`
- `mcp__notebooklm-mcp__notebook_create`
- `mcp__notebooklm-mcp__source_add` (wait=true)
- `mcp__notebooklm-mcp__notebook_get`

### 2.4 analyze.md (request analysis)

**Role**: use NotebookLM's AI features to analyze/summarize the collected sources.

**Procedure**:
1. Determine the notebook ID (from `$ARGUMENTS` or by asking)
2. **Chat configuration (prerequisite)**: `mcp__notebooklm-mcp__chat_configure(notebook_id, goal="custom", custom_prompt="Act as a research analyst...")` (Task #3)
3. **Pick an analysis type** (ask the user):

| Type | MCP call | Notes |
|------|----------|-------|
| Summary Q&A | `notebook_query(notebook_id, query="...")` | Immediate response; supports follow-ups via `conversation_id` |
| Report | `studio_create(notebook_id, artifact_type="report", report_format="Briefing Doc", confirm=True)` | Briefing Doc / Study Guide / Blog Post |
| Mind map | `studio_create(notebook_id, artifact_type="mind_map", confirm=True)` | Visualize topic structure |
| Podcast | `studio_create(notebook_id, artifact_type="audio", audio_format="deep_dive", confirm=True)` | In-depth conversational analysis |
| Web research | `research_start(notebook_id, query="...", source="web", mode="fast")` | Auto-discover additional sources (Phase 3) |

4. **Poll for completion**: `mcp__notebooklm-mcp__studio_status(notebook_id)` → wait for `completed`
5. Display results
6. Ask whether to run more analysis (can loop)
7. **Next-step hint**: "Run `/research export <notebook-id>` to export the results."

**Default analysis sequence (when the user picks "auto")**:
```
chat_configure(goal="custom", custom_prompt="Act as a research analyst and extract the key insights.")
notebook_query → "Summarize the top 5 key insights in a structured format."
studio_create(report, report_format="Briefing Doc") → briefing document
```

**MCP tools**:
- `mcp__notebooklm-mcp__chat_configure` (prerequisite)
- `mcp__notebooklm-mcp__notebook_query` (interactive)
- `mcp__notebooklm-mcp__studio_create` (content generation)
- `mcp__notebooklm-mcp__studio_status` (progress polling)
- `mcp__notebooklm-mcp__research_start` (Phase 3: source discovery)
- `mcp__notebooklm-mcp__research_status` (Phase 3: research polling)
- `mcp__notebooklm-mcp__research_import` (Phase 3: import discovered sources)

### 2.5 export.md (export results)

**Role**: export NotebookLM analysis results to local files (Markdown / JSON).

**Procedure**:
1. Determine the notebook ID
2. **Extract source text (optional)**: `mcp__notebooklm-mcp__source_get_content(source_id)` → each source's text content (Task #3)
3. **Synthesis Q&A**: `mcp__notebooklm-mcp__notebook_query(notebook_id, query="Synthesize all sources...")` (Task #3)
4. **List artifacts**: `mcp__notebooklm-mcp__studio_status(notebook_id)`
5. Have the user pick artifacts to export
6. **Run the export**:
   - Report: `nlm download report <notebook-id> --output ~/research-output/<topic>_report.md`
   - Audio: `nlm download audio <notebook-id> --output ~/research-output/<topic>_podcast.mp3`
   - Quiz: `nlm download quiz <notebook-id> --output ~/research-output/<topic>_quiz.json --format json`
   - Slides: `nlm download slide-deck <notebook-id> --output ~/research-output/<topic>_slides.pptx --format pptx`
7. **Save the Q&A result as Markdown**: organize the query output from analyze/export and write it to a file
8. Report the resulting file paths

**Output directory**: `~/research-output/<topic>/` (per-topic subdirectory, auto-create with `mkdir -p`).
**Google Docs/Sheets**: use `export_artifact` with `--to-docs`, `--to-sheets`.

**MCP tools**:
- `mcp__notebooklm-mcp__source_get_content` (raw source text)
- `mcp__notebooklm-mcp__notebook_query` (synthesis)
- `mcp__notebooklm-mcp__studio_status` (artifact list)
- `mcp__notebooklm-mcp__download_artifact` (file download)
- `mcp__notebooklm-mcp__export_artifact` (Google Docs/Sheets export)

### 2.7 run.md (one-stop pipeline)

**Role**: orchestrate search → collect → analyze → export in a single command.

**Procedure**:
1. Parse arguments: `<topic>`, `--auto`, `--preset`, `--top`, `--notebook`, `--lang`
2. Six presets: default, trend-report, competitor, learning, deep-dive, presentation
3. Interactive mode (default): two confirmations (pick videos after search, approve analyze+export after collect)
4. Auto mode (`--auto`): run the entire sequence directly (no prompts)
5. Auth refresh: pre-call `refresh_auth` before collect/analyze/export
6. 3-tier error handling: Fixable (auto-recover) / Degraded (partial) / Fatal (abort)
7. Progress weights: 10/35/40/15% (search/collect/analyze/export)
8. Completion summary: per-step elapsed time + NLM web URL

**Direct orchestration**: run.md describes the MCP calls per step inline. Subcommand `.md` files are for standalone use (`/research search`, `/research collect`).

**MCP tools**: each subcommand's tools + `mcp__notebooklm-mcp__refresh_auth`.

### 2.6 status.md (session status)

**Role**: show the overall state of the current research sessions at a glance.

**Procedure**:
1. **Read local session file**: `~/research-output/research_sessions.jsonl`
   - If missing, show the Quick Start onboarding guide
2. **System info**: `mcp__notebooklm-mcp__server_info()` to display the MCP server version
3. If a notebook-id is given, only that one; otherwise, all sessions
4. Notebook info:
   - Source count: `mcp__notebooklm-mcp__notebook_get(notebook_id)`
   - Artifact status: `mcp__notebooklm-mcp__studio_status(notebook_id)`
   - Notebook summary: `mcp__notebooklm-mcp__notebook_describe(notebook_id)` (in detailed view)
5. Print the summary table (extended sessions.jsonl schema: status, updated_at, artifacts):

```markdown
## Research Pipeline Status

| Notebook | Topic | Sources | Status | Artifacts | Last updated |
|----------|-------|---------|--------|-----------|--------------|
| abc12345 | AI Trends 2026 | 12 | analyzing | report: completed | 2026-03-05 |
| def67890 | Competitor analysis | 5 | collecting | - | 2026-03-04 |
```

**Extras**:
- `--clean` option: auto-prune sessions for NOT_FOUND notebooks

**MCP tools**:
- `mcp__notebooklm-mcp__server_info` (version)
- `mcp__notebooklm-mcp__notebook_list`
- `mcp__notebooklm-mcp__notebook_get`
- `mcp__notebooklm-mcp__notebook_describe` (detail view)
- `mcp__notebooklm-mcp__studio_status`

---

## 3. MCP integration flow

### Per-subcommand MCP tools (key subset of 30 available tools)

```
search ──── (no MCP, just youtube_search.py)
  │
  ▼
collect ─── notebook_list ──→ notebook_create ──→ source_add(wait=true) ──→ notebook_get
  │            (list)            (create if absent)  (add URLs sequentially)     (verify)
  ▼
analyze ─── chat_configure ──→ notebook_query ──→ studio_create ──→ studio_status
  │         (set analyst role)   (Q&A)              (report/mind map)  (poll progress)
  ▼
export ──── source_get_content ──→ notebook_query ──→ studio_status ──→ download_artifact
  │         (raw text)              (synthesis)         (artifact list)  (file download)
  ▼
status ──── notebook_list ──→ notebook_get ──→ studio_status
            (overall list)      (source count)   (artifact status)
```

### MCP vs CLI selection

| Situation | Choice | Rationale |
|-----------|--------|-----------|
| Notebook/source CRUD | MCP first (`mcp__notebooklm-mcp__*`) | Simpler tool calls, supports `wait=true` |
| Download / export | CLI (`nlm download`) | Richer format/path options |
| Alias management (Phase 2) | CLI (`nlm alias`) | MCP has no alias tools |
| Auth | MCP `refresh_auth` → CLI `nlm login` | Auto-refresh first, then manual fallback |
| Research (source discovery) | MCP `research_start` + CLI polling | Start via MCP, long polls via CLI |
| Config / profile | CLI (`nlm config`, `nlm login switch`) | MCP has no config tools |

### Full MCP tool catalog (30 tools, Task #3 mapping)

| Category | Tools | Used by | Phase |
|----------|-------|---------|-------|
| **Auth** | `refresh_auth`, `save_auth_tokens` | all (gate) | MVP |
| **Notebook** | `notebook_list`, `notebook_create`, `notebook_get`, `notebook_describe`, `notebook_query`, `notebook_rename`, `notebook_delete` | collect, analyze, status | MVP |
| **Source** | `source_add`, `source_list_drive`, `source_describe`, `source_get_content`, `source_rename`, `source_sync_drive`, `source_delete` | collect, export | MVP~P2 |
| **Chat** | `chat_configure`, `note` (CRUD) | analyze | MVP |
| **Studio** | `studio_create`, `studio_status`, `studio_revise`, `studio_delete`, `download_artifact`, `export_artifact` | analyze, export | P2 |
| **Research** | `research_start`, `research_status`, `research_import` | analyze (extended) | P3 |
| **Sharing** | `notebook_share_status`, `notebook_share_public`, `notebook_share_invite` | (unused) | - |
| **Misc** | `server_info` | status (version) | P2 |

---

## 4. Error-handling strategy (Task #3 design)

### 4.1 Auth expiration (most common)

```
1st: try mcp__notebooklm-mcp__refresh_auth() automatically
2nd: on failure → instruct user to run `nlm login`, abort
```
- Session lifetime: ~20 minutes. Long analyze/export jobs may need a mid-run refresh.
- Subcommands run a pre-check via `nlm login --check`.

### 4.2 Source add failure (collect)

```
1st: source_add(wait=true) per URL fails → skip the URL and continue
2nd: bulk add fully fails → retry single URLs sequentially
3rd: an individual URL keeps failing → show the failed-URL list to the user
```
- YouTube URLs may fail if videos are private/deleted.
- Web URLs may fail when sites block (robots.txt).

### 4.3 Quota exceeded (notebook/source limits)

```
1st: 50-source limit per notebook → suggest splitting by topic
2nd: total notebook limit → guide pruning unused notebooks
```

### 4.4 Studio failure (studio_create)

```
1st: studio_status shows `failed` → verify source count/size, retry
2nd: retry fails → suggest a different artifact_type
```

### 4.5 Rate limiting

```
source operations: 2-second interval
studio creation: 5-second interval
research: 2-second interval
query: 2-second interval
```

---

## 5. Usage scenarios

Detailed scenarios and command sequences are in `references/workflow-examples.md`.

| Scenario | Flow | Preset |
|----------|------|--------|
| AI trend research | search → collect → analyze(Q&A+report) → export | `trend-report` |
| Competitor product analysis | collect(direct URLs) → analyze(SWOT) → export | `competitor` |
| Learning materials | collect → analyze(report+audio) → export | `learning` |
| One-stop auto run | `/research run <topic> --auto --preset <name>` | any preset |

---

## 6. Implementation phases

### Phase 1-2: complete

Phase 1 (MVP: SKILL.md, run.md, search.md, collect.md, analyze.md, status.md) and Phase 2 (export.md, references/, studio_create extensions) are done.

### Phase 3: advanced features — complete

- [x] NLM research feature wired up for auto source discovery / collection (deep-dive preset)
- [x] Multiple content types (quiz, slides, video, flashcards, mind_map, infographic, data_table)
- [x] Workflow examples + troubleshooting docs complete

### Phase 4: v0.7.2 parity — complete

Targets `nlm`/`notebooklm-mcp` v0.7.2. Brings the skill to parity with the GUI:

- [x] `media.md` — on-demand Studio artifacts (video/flashcards/mindmap/infographic/datatable) via `studio_create` → poll → download
- [x] `organize.md` — source labels (`label` tool / `nlm label`); manage-within-NotebookLM
- [x] `share.md` — public link / invite / export to Google Docs · Sheets
- [x] New presets: `study-pack`, `explainer`, `visual-report` (run.md + analyze.md)
- [x] `export.md` download cases for all artifact types + `nlm export` CLI
- [x] `collect.md` advertises 18 source file types + optional post-collect auto-label
- [x] `status.md` surfaces labels + share status; auth states (`stale`/`unverified`)
- [x] `youtube_search.py --save-urls` writes the source-URL sidecar (real links recovery)

**Known limitation:** `nlm download mind-map` fails on v0.7.2 (upstream bug); the mind map still generates. Degrades gracefully.

**Future (not yet wired):** multi-notebook `batch` / `cross` / `pipeline` / `tag`.

---

## 7. Design decisions

### 7.1 Session management (hybrid)

- **Cloud**: NotebookLM notebooks (primary data)
- **Local cache**:
  - `~/research-output/research_sessions.jsonl` — full session history (extended schema: status, updated_at, artifacts, preset)
  - `~/research-output/last_session.json` — quick reference to the most recent session (analyze/export/status auto-load notebook_id from it)
- The local file gives us fast status reads without hitting the NLM API.

#### last_session.json schema

```json
{
  "notebook_id": "string",
  "topic": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "status": "collecting|analyzing|exported",
  "source_count": 0,
  "urls": [],
  "artifacts": [{"type": "report", "status": "completed"}],
  "preset": "default"
}
```

### 7.2 MCP wildcard

`allowed-tools` uses the `mcp__notebooklm-mcp__*` wildcard (Task #2 proposal). All 30 tools are authorized via namespace instead of listing each one.

### 7.3 Relationship to existing skills

| Skill | Relationship |
|-------|--------------|
| `youtube-search` | `research`'s `search` wraps it. Standalone use remains possible. |
| `youtube-downloader` | Separate (video download is out of scope for research) |
| `content-pipeline` | Separate. `research` outputs can feed into content-pipeline (integration possible) |
| `nlm-skill` | `research` uses NLM tools internally. `nlm-skill` stays as a general reference. |

### 7.4 content-pipeline integration point

`research`'s export outputs (`~/research-output/*.md`) can be passed to content-pipeline's `add` input.
Post-Phase 3, consider a `/research export --to-pipeline` option.

---

## 8. references/ contents

### 8.1 nlm-commands.md

A quick-reference for the MCP tools `research` uses. Rather than copying the 600-line SKILL.md, summarize key parameters (progressive disclosure).

Contents:
- Auth: `refresh_auth`, `nlm login`
- Notebook: `notebook_create`, `notebook_list`, `notebook_get`, `notebook_query` parameters
- Source: `source_add` (parameters per source_type, wait option)
- Chat: `chat_configure` (goal, custom_prompt, response_length)
- Studio: `studio_create` (options per artifact_type), `studio_status`, `download_artifact`
- Research: `research_start`, `research_status`, `research_import`
- Error codes + remediation summary

### 8.2 workflow-examples.md

Copy-paste-ready command sequences for each scenario. Five scenarios:
1. Trend research (search → collect → analyze → export)
2. Competitor analysis (direct URL collection → SWOT analysis)
3. Learning materials (Study Guide + podcast)
4. Deep research (research_start for source discovery)
5. Error responses (auth expiry, source failure, rate limit)

---

## Appendix A: content-pipeline pattern comparison

| Item | content-pipeline | research |
|------|------------------|----------|
| Router | SKILL.md + `$ARGUMENTS` parsing | same |
| Subcommands | status, add, advance, review | search, collect, analyze, export, status |
| Data store | jsonl (local) | NotebookLM (cloud) + jsonl (local cache) |
| Script | pipeline_utils.py | youtube_search.py (symlink) |
| External integration | none | NotebookLM MCP (30 tools) + CLI |
| State management | local jsonl only | hybrid (NLM API + local jsonl) |
| Error handling | simple (local I/O) | composite (auth, network, rate, quota) |

## Appendix B: MCP tool prefix

MCP tool name pattern: `mcp__notebooklm-mcp__*`.
The same wildcard is used in `allowed-tools`.
