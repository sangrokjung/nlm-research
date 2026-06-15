# Research Pipeline Rules

## MCP tool prefix
- NotebookLM MCP: `mcp__notebooklm-mcp__` (note the hyphen)

## Auth refresh
- Call `refresh_auth()` before each of collect / analyze / export
- On failure, instruct the user to run `nlm login`

## 3-tier error handling
- Tier 1 (Fixable): AUTH_EXPIRED → refresh_auth, SOURCE_FAILED → skip URL, RATE_LIMITED → wait 5s and retry
- Tier 2 (Degraded): partial failure → continue with the successful sources, report the failures
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
