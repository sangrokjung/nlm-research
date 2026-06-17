# Research Media - On-demand Studio artifacts

Generate rich NotebookLM Studio artifacts (Video Overview, Flashcards, Mind Map,
Infographic, Data Table) from an existing notebook, then download them.

## Usage

```
/research media [notebook-id] --type <video|flashcards|mindmap|infographic|datatable|all>
                              [--format <explainer|brief|cinematic>]   # video only
                              [--style <...>] [--focus "..."] [--lang <code>]
```

## Argument parsing

Parse the text after `media` in `$ARGUMENTS`.
- `notebook-id`: the first bare token, if present. Otherwise load `notebook_id` from `~/research-output/last_session.json`; if missing, list with `mcp__notebooklm-mcp__notebook_list` and let the user pick.
- `--type`: required. `all` fans out across video + flashcards + mindmap + infographic + datatable.
- `--format`: video only — `explainer` (default), `brief`, or `cinematic`.
- `--style`: visual style for video/infographic (default `auto_select`).
- `--focus`: focus topic / creative direction. For `cinematic` video this is the full steering prompt.
- `--lang`: BCP-47 output language (default `en`).

## Type → artifact mapping

| `--type` | `studio_create` artifact_type | download kind | file |
|----------|-------------------------------|---------------|------|
| `video` | `video` | `video` | `.mp4` |
| `flashcards` | `flashcards` | `flashcards` | `.json` |
| `mindmap` | `mind_map` | `mind-map` | `.json` |
| `infographic` | `infographic` | `infographic` | `.png` |
| `datatable` | `data_table` | `data-table` | `.csv` |

---

## Procedure

1. **Auth gate** already passed via the router. Call `mcp__notebooklm-mcp__refresh_auth()` first.

2. **Resolve the notebook** (see argument parsing). Confirm it has sources via `mcp__notebooklm-mcp__notebook_get(notebook_id)`; if 0 sources, abort with guidance to `/research collect` first.

3. **Fast-track prompt** (v0.7.0): do **not** run an intake questionnaire. Infer format/style from context, print a one-line notice, and generate immediately. Explicit flags override the inference.
   - e.g. `Generating Video Overview · explainer · auto_select · en`

4. **Generate** for each requested type:
   ```
   mcp__notebooklm-mcp__studio_create(
     notebook_id="...",
     artifact_type="<mapped>",
     language="<lang>",
     # video:        video_format=<format>, visual_style=<style>, focus_prompt=<focus>
     # infographic:  orientation=landscape, detail_level=standard, infographic_style=<style>
     # flashcards:   difficulty=medium
     # data_table:   description=<focus or "key facts and comparisons">
     confirm=true
   )
   ```

5. **Poll** `mcp__notebooklm-mcp__studio_status(notebook_id)` every 6s (max 600s for video, 360s otherwise) until the artifact is `completed` or `failed`.

6. **Download** to the topic folder:
   ```
   mkdir -p ~/research-output/<topic>/    # topic = spaces → hyphens
   mcp__notebooklm-mcp__download_artifact(notebook_id, artifact_type="<mapped>", output_path="~/research-output/<topic>/<topic>_<type>.<ext>")
   ```
   CLI fallback: `nlm download <kind> <notebook-id> -o ~/research-output/<topic>/<topic>_<type>.<ext>`

7. **Report**:
   ```
   Media generated

   | Type | Status | File |
   |------|--------|------|
   | video | completed | ~/research-output/<topic>/<topic>_video.mp4 |

   Next: /research share <notebook-id> to publish, or /research export to grab everything.
   ```

8. **Update `last_session.json`** — append to `artifacts` and refresh `updated_at`.

---

## Error handling (3-tier)

| Tier | Case | Response |
|------|------|----------|
| 1 | Auth expired | `refresh_auth()`; if it fails, tell the user to run `nlm login` |
| 1 | Studio job `failed` | Retry once; then try a different artifact type |
| 2 | One type in `--type all` fails | Skip it, continue the rest, report which failed |
| 2 | **`mind-map` download fails** | Known `nlm` v0.7.2 bug — the mind map still generates and is visible in NotebookLM; report "generated (download unavailable for mind maps in this nlm version)" |
| 3 | 0 sources | Abort: "Collect sources first with `/research collect`." |

## Notes

- Video is the slowest artifact; allow up to 10 minutes.
- `cinematic` video: pass the full creative brief via `--focus`.
- Always use the `date` command for the topic-folder timestamp (no mental arithmetic).
- MCP tool prefix: `mcp__notebooklm-mcp__` (with hyphen).
