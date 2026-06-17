# Research Organize - Source labels (manage within NotebookLM)

AI-organize a notebook's sources into themed labels — and curate them — directly
inside NotebookLM. This is the "manage within NotebookLM" surface.

## Usage

```
/research organize [notebook-id] [auto|list|reorganize|create <name>|rename <old> <new>
                                  |emoji <label> <emoji>|move <source-id> <label-id>|delete <label>]
```
Default action (no second word) is `auto`.

## Argument parsing

Parse the text after `organize` in `$ARGUMENTS`.
- `notebook-id`: first bare token, else load from `~/research-output/last_session.json`; if missing, `mcp__notebooklm-mcp__notebook_list` and let the user pick.
- Action defaults to `auto`.

> `auto`/`list` require the notebook to have **5+ sources** (NotebookLM constraint).

---

## Actions

Backed by the **`label`** MCP tool, with `nlm label …` as CLI fallback.

| Action | MCP / CLI | Notes |
|--------|-----------|-------|
| `auto` | `label(notebook_id, action="auto")` · `nlm label auto <nb> --json` | AI-generate thematic labels (returns current labels if they already exist) |
| `list` | `label(notebook_id, action="list")` · `nlm label list <nb> --json` | List labels + their source counts |
| `reorganize` | `nlm label reorganize <nb>` | Force AI re-categorization into new labels |
| `create` | `label(action="create", name=...)` · `nlm label create <nb> <name>` | Create an empty label |
| `rename` | `label(action="rename", ...)` · `nlm label rename <nb> <old> <new>` | Rename a label |
| `emoji` | `label(action="set_emoji", ...)` · `nlm label emoji <nb> <label> <emoji>` | Set/clear a label's emoji |
| `move` | `label(action="move_source", source_id, label_id)` · `nlm label move <nb> <source-id> <label-id>` | Assign a source to a label (multi-label; additive) |
| `delete` | `label(action="delete", ...)` · `nlm label delete <nb> <label>` | Delete a label (sources are NOT deleted) |

---

## Procedure

1. Call `mcp__notebooklm-mcp__refresh_auth()` first.
2. Resolve the notebook (see argument parsing).
3. Run the requested action (default `auto`).
4. **Render labels** after `auto`/`list`/`reorganize`:
   ```
   ## Labels: <notebook-id>

   | Label | Sources |
   |-------|---------|
   | 📁 AI Agents | 3 |
   | 📁 Tooling | 2 |
   ```
   - `auto` with < 5 sources → explain the 5-source minimum and stop.
5. **Next-step hint**: "Adjust with `/research organize <id> move <source-id> <label-id>`, or review in the NotebookLM web UI."

---

## Error handling (3-tier)

| Tier | Case | Response |
|------|------|----------|
| 1 | Auth expired | `refresh_auth()` → else `nlm login` |
| 2 | `auto` needs 5+ sources | Report the minimum; suggest collecting more |
| 3 | Notebook not found | Abort with the notebook-id guidance |

## Notes

- Labels persist in the NotebookLM web UI — this organizes the notebook itself, not local files.
- `move` is additive (a source can carry multiple labels).
- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen).
