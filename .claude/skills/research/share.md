# Research Share - Publish, collaborate, export

Share a NotebookLM notebook (public link / invite) and export its artifacts to
Google Docs / Sheets.

## Usage

```
/research share [notebook-id] status                 # show sharing status + collaborators
/research share [notebook-id] public | private       # toggle public-link access
/research share [notebook-id] invite <email> [--role viewer|editor]
/research share [notebook-id] docs                   # export the Report artifact → Google Docs
/research share [notebook-id] sheets                 # export the Data Table artifact → Google Sheets
```
Default action (no second word) is `status`.

## Argument parsing

Parse the text after `share` in `$ARGUMENTS`.
- `notebook-id`: first bare token, else load from `~/research-output/last_session.json`; if missing, `mcp__notebooklm-mcp__notebook_list` and let the user pick.
- Action defaults to `status`.

> **Outbound actions confirm first.** `public` and `invite` publish the notebook —
> ask "This shares the notebook (<action>). Continue? (yes/no)" before running
> (skip the prompt only in an `--auto` pipeline).

---

## Actions

| Action | MCP / CLI |
|--------|-----------|
| `status` | `mcp__notebooklm-mcp__notebook_share_status(notebook_id)` · `nlm share status <nb>` |
| `public` | `mcp__notebooklm-mcp__notebook_share_public(notebook_id, confirm=true)` · `nlm share public <nb>` |
| `private` | `nlm share private <nb>` |
| `invite` | `mcp__notebooklm-mcp__notebook_share_invite(notebook_id, email, role)` · `nlm share invite <nb> <email> --role <role>` |
| `docs` | find the completed `report` artifact id (`studio_status`), then `mcp__notebooklm-mcp__export_artifact(notebook_id, artifact_id, export_type="docs", title=...)` · `nlm export to-docs <nb> <artifact-id> --title "..."` |
| `sheets` | find the completed `data_table` artifact id, then `export_artifact(..., export_type="sheets")` · `nlm export to-sheets <nb> <artifact-id> --title "..."` |

---

## Procedure

1. Call `mcp__notebooklm-mcp__refresh_auth()` first.
2. Resolve the notebook (see argument parsing).
3. For `docs`/`sheets`: list artifacts via `mcp__notebooklm-mcp__studio_status(notebook_id)`, pick the completed `report` (docs) or `data_table` (sheets) artifact id. If none exists, tell the user to generate it first (`/research analyze` or `/research media --type datatable`).
4. For `public`/`invite`: confirm (outbound) unless `--auto`.
5. Run the action; **report the returned link / Doc URL / status table** verbatim.
6. **Update `last_session.json`** — refresh `updated_at` (and record the share/export).

---

## Error handling (3-tier)

| Tier | Case | Response |
|------|------|----------|
| 1 | Auth expired | `refresh_auth()` → else `nlm login` |
| 2 | `docs`/`sheets` with no matching artifact | "No completed report/data-table to export — generate it first." |
| 2 | Public sharing rejected (`INVALID_ARGUMENT`) | Some accounts/notebooks can't enable public links via the API — tell the user to set sharing in the NotebookLM web UI |
| 3 | Notebook not found | Abort with the notebook-id guidance |

## Notes

- Exported Docs/Sheets land in the authenticated Google account's Drive; they are
  **private to the owner** by default. To share, open in Docs/Sheets → Share →
  "Anyone with the link". (The skill cannot set Drive permissions.)
- Reuses the same "Anyone with the link — Viewer" guidance as `/research drive`.
- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen).
