# Research Drive - Google Drive Source Management

Add and sync Google Drive files as NotebookLM sources.

## Usage

```
/research drive list [notebook-id]       # List Drive sources for the notebook
/research drive sync [notebook-id]       # Sync Drive sources (pull latest content)
/research drive add <url-or-id>          # Add a Drive file to the notebook
```

## Argument parsing

Parse the text after `drive` in `$ARGUMENTS`.
- If the second word is `list` / `sync` / `add`, run the matching action.
- If no second word, default to `list`.

---

## Action 1: list

Show the Drive sources connected to the notebook along with their sync state.

### Procedure

1. **Determine the notebook ID**
   - Use the notebook-id from `$ARGUMENTS` if present.
   - Otherwise, load `notebook_id` from `~/research-output/last_session.json`.
   - If that file is missing, ask the user to enter a notebook-id.

2. **List Drive sources**
   ```
   mcp__notebooklm-mcp__source_list_drive(notebook_id="...")
   ```

3. **Render the result**
   ```
   ## Google Drive sources: <notebook-id>

   | # | Title | Type | Status | Last synced |
   |---|-------|------|--------|-------------|
   | 1 | plan_2026.docx | doc | synced | 2026-03-10 |
   | 2 | deck.pptx | slides | outdated | 2026-03-01 |
   ```
   - If no Drive sources are connected: "No Drive sources connected to this notebook. Add one with `/research drive add <url>`."

4. **Next-step hint**
   - If any source is outdated: "Some sources need syncing. Run `/research drive sync <notebook-id>`."

---

## Action 2: sync

Sync the notebook's Drive sources with the latest content.

### Procedure

1. **Determine the notebook ID** (same as `list`).

2. **List Drive sources**
   ```
   mcp__notebooklm-mcp__source_list_drive(notebook_id="...")
   ```
   - If none exist: "No Drive sources to sync." Abort.

3. **Pick sources to sync**
   - Collect every `source_id`.
   - Ask the user: "Sync N Drive sources. Continue? (yes/no)"
   - no → abort.

4. **Run the sync**
   ```
   mcp__notebooklm-mcp__source_sync_drive(
     source_ids=["<id1>", "<id2>", ...],
     confirm=true
   )
   ```

5. **Report the result**
   ```
   Drive source sync complete

   | Source | Result |
   |--------|--------|
   | plan_2026.docx | ✓ synced |
   | deck.pptx | ✓ synced |
   ```

6. **Update `last_session.json`** — refresh `updated_at` (Write tool).

---

## Action 3: add

Add a Google Drive file to the notebook as a source.

### Supported input formats

| Input | Example |
|-------|---------|
| Google Docs URL | `https://docs.google.com/document/d/<ID>/edit` |
| Google Slides URL | `https://docs.google.com/presentation/d/<ID>/edit` |
| Google Sheets URL | `https://docs.google.com/spreadsheets/d/<ID>/edit` |
| Google Drive file URL | `https://drive.google.com/file/d/<ID>/view` |
| Raw document ID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms` |

### `doc_type` auto-detection

Determine `doc_type` from the URL pattern:

| URL pattern | doc_type |
|-------------|----------|
| `docs.google.com/document/` | `doc` |
| `docs.google.com/presentation/` | `slides` |
| `docs.google.com/spreadsheets/` | `sheets` |
| `drive.google.com/file/` | `pdf` (default; refine by file extension when known) |
| Raw ID with no URL | `doc` (default; confirm the type with the user) |

### Procedure

1. **Parse the input** — extract a URL or ID from the text after `add`.
   - If no input was given: "Please provide a Drive URL or document ID." Abort.

2. **Extract the document ID**
   - For URLs: extract the ID using the `/d/<ID>/` pattern.
   - For raw IDs: use them as-is.

3. **Determine `doc_type`** — apply the auto-detection rules above.
   - For `drive.google.com/file/` URLs or raw IDs, confirm with the user:
     "Pick the file type: (1) doc  (2) slides  (3) sheets  (4) pdf"

4. **Acquire a notebook**
   - Try to load `notebook_id` from `~/research-output/last_session.json`.
   - If absent, list with `mcp__notebooklm-mcp__notebook_list` and let the user pick.
   - Offer "create a new notebook" as an option.

5. **Add the source**
   ```
   mcp__notebooklm-mcp__source_add(
     notebook_id="...",
     source_type="drive",
     document_id="<extracted ID>",
     doc_type="<detected type>"
   )
   ```

6. **Verify**
   ```
   mcp__notebooklm-mcp__notebook_get(notebook_id="...")
   ```

7. **Report the result**
   ```
   Drive source added

   | Field | Value |
   |-------|-------|
   | Document ID | <id> |
   | Type | <doc_type> |
   | Notebook | <notebook_id> |
   | Total sources | <N> |

   Next: run `/research analyze <notebook-id>`.
   ```

8. **Update `last_session.json`** — refresh `source_count` and `updated_at`.

---

## Error handling

| Error | Response |
|-------|----------|
| No Drive sources (list/sync) | Print a notice and exit |
| Invalid URL format | "Please enter a valid Google Drive URL or document ID." |
| ID extraction failed | Couldn't find `/d/<ID>/` in the URL → ask the user to enter the ID directly |
| `source_add` failed | Tell the user to check the Drive file's sharing setting ("Make sure the file is set to 'Anyone with the link' for viewing.") |
| Sync failed for some sources | Report just the failed ones; continue with the rest |

## Notes

- Drive files must be shared with "Anyone with the link — Viewer" enabled.
- `source_sync_drive` can take a moment; wait for completion.
- Always use the `date` command for timestamps (no mental arithmetic).
- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen).
