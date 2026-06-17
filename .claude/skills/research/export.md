# Research Export - Result Export

> Analogy: gathering the reading notes from the books we borrowed from the research library and bringing them to our own desk (local files).

## Usage
- `/research export` — export results for the most recent notebook
- `/research export <notebook-id>` — export results for a specific notebook
- `/research export <notebook-id> --to-docs` — export to Google Docs
- `/research export <notebook-id> --to-sheets` — export to Google Sheets

## Procedure

### Step 1: Determine the notebook ID

Parse the text after `export` in `$ARGUMENTS`.

- If a notebook-id is provided, use that notebook.
- Otherwise:
  1. If `~/research-output/last_session.json` exists, auto-load notebook_id from it.
     "Using the most recent session's notebook: <topic> (<first 8 chars of notebook_id>)"
  2. If no file, call `mcp__notebooklm-mcp__notebook_list()` and let the user pick.

### Step 2: Extract source text (optional)

Ask whether the user wants source text.

If yes:
1. List sources with `mcp__notebooklm-mcp__notebook_get(notebook_id=<id>)`
2. For each source:
   ```
   mcp__notebooklm-mcp__source_get_content(source_id=<source_id>)
   ```
3. Format the extracted text as Markdown

### Step 3: Synthesis Q&A (run only if no existing notes)

First check whether notes already exist:

```
mcp__notebooklm-mcp__note(action="list", notebook_id=<id>)
```

- **If notes exist**: load them and treat their content as the Q&A result.
  "Found <N> existing notes. Reusing prior analysis instead of re-querying."
- **If no notes**: extract key insights via `notebook_query`:

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="Synthesize all sources and capture the key findings, trends, and actionable insights."
)
```

Format the result as Markdown.

### Step 4: List artifacts

```
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)
```

Show the completed artifacts to the user:

```
## Generated artifacts

| Type | Status | Created |
|------|--------|---------|
| report | completed | ... |
| audio | completed | ... |
```

### Step 5: Run the export

Make sure the output directory exists:

```bash
mkdir -p ~/research-output/<topic>/
```
(Convert spaces in `<topic>` to hyphens.)

Download the artifacts the user picked.

Prefer MCP `download_artifact`. Fall back to the `nlm download` CLI on failure.

**Primary: MCP tool**
```
mcp__notebooklm-mcp__download_artifact(
  notebook_id=<id>,
  artifact_type="report",
  output_path="~/research-output/<topic>/<topic>_report.md"
)
```

```
mcp__notebooklm-mcp__download_artifact(
  notebook_id=<id>,
  artifact_type="audio",
  output_path="~/research-output/<topic>/<topic>_podcast.mp3"
)
```

**Google Docs/Sheets export (`--to-docs`, `--to-sheets` options):**

If the user supplies `--to-docs` or `--to-sheets`:
```
mcp__notebooklm-mcp__export_artifact(
  notebook_id=<id>,
  artifact_id=<artifact_id>,
  export_type="docs",      # --to-docs
  title="<topic> research report"
)
```

```
mcp__notebooklm-mcp__export_artifact(
  notebook_id=<id>,
  artifact_id=<artifact_id>,
  export_type="sheets",    # --to-sheets (for Data Table)
  title="<topic> data"
)
```

After the export, show the resulting Google Docs/Sheets URL.

**All artifact types** (MCP `download_artifact(artifact_type=...)` or `nlm download <kind>`):

| Artifact | `artifact_type` | `nlm download` kind | File |
|----------|-----------------|---------------------|------|
| Report | `report` | `report` | `.md` |
| Podcast | `audio` | `audio` | `.mp3` |
| Slides | `slides` | `slide-deck` | `.pptx` |
| Quiz | `quiz` | `quiz` | `.json` |
| Video Overview | `video` | `video` | `.mp4` |
| Flashcards | `flashcards` | `flashcards` | `.json` |
| Mind map | `mind_map` | `mind-map` | `.json` |
| Infographic | `infographic` | `infographic` | `.png` |
| Data table | `data_table` | `data-table` | `.csv` |

**Secondary: CLI fallback (when MCP fails)**
```bash
nlm download report      <notebook-id> -o ~/research-output/<topic>/<topic>_report.md
nlm download audio       <notebook-id> -o ~/research-output/<topic>/<topic>_podcast.mp3
nlm download slide-deck  <notebook-id> -o ~/research-output/<topic>/<topic>_slides.pptx
nlm download quiz        <notebook-id> -o ~/research-output/<topic>/<topic>_quiz.json
nlm download video       <notebook-id> -o ~/research-output/<topic>/<topic>_video.mp4
nlm download flashcards  <notebook-id> -o ~/research-output/<topic>/<topic>_flashcards.json
nlm download infographic <notebook-id> -o ~/research-output/<topic>/<topic>_infographic.png
nlm download data-table  <notebook-id> -o ~/research-output/<topic>/<topic>_datatable.csv
# nlm download mind-map fails on nlm v0.7.2 (known bug) — the mind map still generates in NotebookLM
```

**Top-level `nlm export` CLI** (alternative to MCP `export_artifact` for Docs/Sheets):
```bash
nlm export to-docs   <notebook-id> <report-artifact-id>     --title "<topic> report"
nlm export to-sheets <notebook-id> <data-table-artifact-id> --title "<topic> data"
```
For richer sharing (public link / invite), use `/research share <notebook-id>` (see `share.md`).

### Step 6: Save the Q&A as a Markdown file

Save the synthesis Q&A from Step 3 to a file.

Use the Write tool to create `~/research-output/<topic>/<topic>_analysis.md`:

```markdown
# <topic> - Research Analysis

> Generated: <date '+%Y-%m-%d'>
> Notebook ID: <notebook-id>
> Sources: <N>

## Key findings and insights

<synthesis Q&A result>

## Sources

1. <source title> - <URL>
2. ...
```

### Step 7: Final summary

**File distinctions:**
- `_report.md`: the **original briefing document** generated by NotebookLM (via `download_artifact`)
- `_analysis.md`: an **analysis write-up Claude assembled** from Step 3's Q&A (includes the source list and insights)

After export completes, summarize the result:

```
## Export complete

| File | Path | Description |
|------|------|-------------|
| Analysis report | ~/research-output/<topic>/<topic>_analysis.md | Claude-authored (built from the Q&A) |
| Briefing document | ~/research-output/<topic>/<topic>_report.md | NotebookLM original |
| Podcast | ~/research-output/<topic>/<topic>_podcast.mp3 | Audio summary |

To use these outputs as input for a content pipeline, feed them in directly.
```

## Notes

- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen)
- Always get the date via the `date` command (no mental arithmetic)
- Create the output directory `~/research-output/<topic>/` with `mkdir -p`
- On download failure, fall back to the CLI
- Replace spaces in the topic with hyphens for filenames
- On error, report clearly and move on to the next artifact
