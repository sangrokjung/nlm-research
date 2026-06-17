# Research Pipeline Rules

## MCP tool prefix
- NotebookLM MCP: `mcp__notebooklm-mcp__` (note the hyphen)

## Auth refresh
- Call `refresh_auth()` before each of collect / analyze / export / media / organize / share
- On failure, instruct the user to run `nlm login`
- v0.7.x auth states: `stale` = genuine expiry (prompt re-login), `unverified` = transient network blip (retry before bothering the user)

## Studio artifacts (v0.7.2)
- `studio_create(artifact_type=...)` then poll `studio_status` until `completed`/`failed` before downloading (report/video/etc. generation is async)
- artifact_type values: report, audio, video, slides, quiz, flashcards, mind_map, infographic, data_table
- Known bug: `nlm download mind-map` fails on v0.7.2 — the mind map still generates; report it as completed-but-not-downloaded

## Source labels & sharing
- Organize sources with the `label` tool / `nlm label` (auto needs 5+ sources); `move` is additive
- Share via `nlm share public|invite|status` / `notebook_share_*`; export with `nlm export to-docs|to-sheets` / `export_artifact`
- Public/invite are outbound — confirm first unless in `--auto`. Exported Docs/Sheets are owner-private until shared in Google.

## 3-tier error handling
- Tier 1 (Fixable): AUTH_EXPIRED → refresh_auth, SOURCE_FAILED → skip URL, RATE_LIMITED → wait 5s and retry, STUDIO_FAILED → retry once
- Tier 2 (Degraded): partial failure → continue with the successful sources/artifacts, report the failures
- Tier 3 (Fatal): full auth failure or 0 sources collected → abort with guidance

## Date handling
- Never do date/time arithmetic in your head. Use the `date` command.

## Output path
- `~/research-output/<topic>/` (replace spaces with hyphens)
- Auto-create with `mkdir -p`

## Language
- Default output language is English (BCP-47 `en`)
- All preset prompts, default Q&A queries, and note titles are written in English
- Pass `--lang <code>` to override per run
