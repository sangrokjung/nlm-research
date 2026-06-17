# Research Collect - Source Collection

Add sources to NotebookLM to build the research notebook.

## Usage
- `/research collect <URL1> <URL2> ...` — add the given URLs to a notebook
- `/research collect` — choose from the most recent `search` results

## Procedure

### Step 1: Parse arguments

Parse the text after `collect` in `$ARGUMENTS`.
- If URLs are present, use them as the collection targets.
- If no URLs, read `~/research-output/last_search.json` for prior search results.
  - JSON shape: `{ searched_at, keyword, options, results: [...] }` — read the `results` field.
  - If the file exists: render the `results` array as a numbered list and ask the user to pick.
  - If the file is missing: print "No search results found. Enter URLs directly or run `/research search` first."

### Step 2: Acquire a notebook

1. Call `mcp__notebooklm-mcp__notebook_list` to enumerate existing notebooks.
2. Present the user with a choice:
   - Use one of the existing notebooks
   - Create a new notebook
3. When creating a new notebook:
   - Confirm the topic with the user
   - Get today's date via `date '+%Y-%m-%d'`
   - Create with `mcp__notebooklm-mcp__notebook_create(title="Research: <topic> - <date>")`

### Step 3: Add sources

Once the source list is finalized, detect the type of each item:

**Type detection:**
- Local file path (starts with `/`, `~/`, or `./`): `source_type="file"`
- Google Drive URL (contains `docs.google.com` or `drive.google.com`): `source_type="drive"`
- Google Drive document ID (alphanumeric + hyphen + underscore, single token ≥ 25 chars): `source_type="drive"`
- YouTube URL (contains `youtube.com` or `youtu.be`): `source_type="url"`
- Any other web URL (starts with `http://` or `https://`): `source_type="url"`

**Add by type:**

1. **YouTube / web URL**: try bulk add first → fall back to one-at-a-time
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="url", urls=["<URL1>", "<URL2>"], wait=true)
   ```
   Single-URL fallback:
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="url", url="<URL>", wait=true)
   ```

2. **Google Drive**: extract the document ID from the URL, auto-detect `doc_type`, and add it
   - URL pattern: `/d/<ID>/` — extract `<ID>`
   - If a raw document ID was given, use it as-is
   - **`doc_type` auto-detection**:
     - `docs.google.com/document/` → `doc`
     - `docs.google.com/presentation/` → `slides`
     - `docs.google.com/spreadsheets/` → `sheets`
     - `drive.google.com/file/` → `pdf`
     - Raw ID with no URL → default to `doc` and confirm the type with the user
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="drive", document_id="<ID>", doc_type="<detected type>")
   ```
   On failure, tell the user: "Change the Drive file sharing setting to 'Anyone with the link — Viewer'."

3. **Local file**: add each file sequentially
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="file", file_path="<path>")
   ```
   **18 supported file types** (nlm v0.7.2): PDF, TXT, MD, DOCX, CSV, EPUB, MP3, M4A, WAV, AAC, OGG, OPUS, MP4, JPG, JPEG, PNG, GIF, WEBP. (Image/video sources also feed Studio's visual-crop pipeline for on-screen aids in Video Overviews.)

4. Report success/failure of each add to the user.

### Step 4: Text source (optional)

Ask the user whether they also want to add a text source.
If yes:
```
mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="text", text="<content>", title="<title>")
```

### Step 5: Verify sources

Verify the final source count with `mcp__notebooklm-mcp__notebook_get(notebook_id=...)` and report to the user.

### Step 5.5: Save last_session

Save the current session to `~/research-output/last_session.json`. Downstream commands (analyze, export, status) auto-load `notebook_id` from this file when none is given.

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
  "preset": "default",
  "stages": {
    "collect": {
      "completed_at": "<ISO8601>",
      "source_count": <success count>,
      "failed_urls": ["<failed URLs>"]
    }
  }
}
```

Use the Write tool to save the JSON file. `stages.collect.completed_at` is the moment source addition finished, `source_count` is successful sources, and `failed_urls` is the list of URLs that failed.

### Step 6: Session log

Once source addition finishes (including partial success), record the session immediately.

**When to record**: right after source addition, before the Step 5 verification check.
**Partial failure**: if at least one source succeeded, record the session.

Append the session info to `~/research-output/research_sessions.jsonl`.

```bash
mkdir -p ~/research-output
```

JSONL line format:
```json
{"notebook_id": "<id>", "topic": "<topic>", "created_at": "<ISO8601>", "updated_at": "<ISO8601>", "status": "collecting", "source_count": <success count>, "urls": ["<only the successful URLs>"], "artifacts": [], "preset": "default"}
```

Get the current timestamp with `date '+%Y-%m-%dT%H:%M:%S'`, then append the line using `echo` or `python3`.

**Failed-only record**: if every URL failed, still append a record with empty `urls` for debugging.

### Step 6.5: Offer to auto-label (optional)

If the notebook now has **5+ sources**, offer: "Auto-label these sources into themes? (yes/no)"
- yes → run `mcp__notebooklm-mcp__label(notebook_id, action="auto")` (or `nlm label auto <id>`), then show the labels. See `organize.md`.
- no → continue.

### Step 7: Next-step hint

After collection completes:
```
Source collection complete.

| Field | Value |
|-------|-------|
| Notebook ID | <notebook_id> |
| Topic | <topic> |
| Sources | <N> |

Next: run `/research analyze <notebook-id>` — or `/research organize <id>` to label sources, `/research media <id> --type ...` for rich artifacts.
```

## Notes

- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen)
- Always use the `date` command for timestamps (no mental arithmetic)
- On error, report clearly and move on to the next URL
- Always confirm with the user before creating/selecting a notebook
