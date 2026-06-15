# Research Skill — NotebookLM v0.7.2 Upgrade Backlog

**Target:** `nlm` / `notebooklm-mcp` **v0.7.2** (installed, latest).
**Goal:** Upgrade the `/research` skill from the report + audio + slides + quiz
pipeline to full Studio-artifact coverage, plus a "manage-within-NotebookLM"
layer (source labels, sharing, on-demand media generation).

**Approach:** Incremental — keep the current router/orchestrator architecture
(`SKILL.md` routes to subcommand `.md` files), add new subcommands, extend
existing ones. Mirror every change to the legacy `.claude/commands/research/`
tree (per `CLAUDE.md`).

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done
**Priority:** P1 = core upgrade · P2 = management layer · P3 = nice-to-have / future

Plan reference: `~/.claude/plans/abundant-plotting-journal.md`

---

## Epic 1 — New Studio artifact types (P1)

Wire the artifact types the installed tool supports but no preset/command produces:
Video Overviews, Flashcards, Mind Maps, Infographics, Data Tables.

- [ ] **`media.md`** — NEW subcommand for on-demand rich artifacts
  `/research media [notebook-id] --type <video|flashcards|mindmap|infographic|datatable|all> [--format <explainer|brief|cinematic>] [--style <...>] [--focus "..."] [--lang <code>]`
  - Resolve notebook from `last_session.json` when omitted
  - `studio_create(artifact_type=...)` → poll `studio_status` → `download_artifact` to `~/research-output/<topic>/`
  - Fast-track prompting (infer format/style, one-line notice, no questionnaire)
  - Video defaults `format=explainer`, `style=auto_select`; `cinematic` brief via `--focus`/`focus_prompt`
- [ ] **`analyze.md`** — add video / flashcards / mindmap / infographic / datatable to the analysis-type menu and the new presets' routing
- [ ] **`export.md`** — add `download_artifact` + `nlm download` cases for `video`, `flashcards`, `mind-map`, `infographic`, `data-table`
- [ ] **`run.md`** — new presets: `study-pack`, `explainer`, `visual-report` (see table below)
- [ ] Confirm exact `studio_create` `artifact_type` strings and `download` formats against `nlm --ai` before wiring

### New presets

| Preset | Artifacts produced |
|--------|--------------------|
| `study-pack` | report + podcast (audio) + flashcards + mind map + quiz |
| `explainer` | report + Video Overview (explainer format) |
| `visual-report` | report + infographic + mind map + data table |

---

## Epic 2 — Manage within NotebookLM (P2)

The "easy way to manage within NotebookLM" surface: organize a notebook's
sources into themed groups *inside* NotebookLM, and see it all at a glance.

- [ ] **`organize.md`** — NEW subcommand for source labels
  `/research organize [notebook-id] [auto|list|reorganize|create <name>|rename <old> <new>|emoji <label> <emoji>|move <source> <label>|delete <label>]`
  - Default action `auto` → AI-generated thematic labels
  - Backed by the `label` MCP tool (verify exact name at edit time) with `nlm label …` CLI fallback
- [ ] **`collect.md`** — advertise the 18 supported source file types (PDF/TXT/MD/DOCX/CSV/EPUB/MP3/M4A/WAV/AAC/OGG/OPUS/MP4/JPG/JPEG/PNG/GIF/WEBP); offer post-collect auto-label
- [ ] **`status.md`** — surface source labels, new artifact types, and share status → becomes the at-a-glance management dashboard
- [ ] **`run.md`** — optional `--organize` flag to auto-label sources after collect

---

## Epic 3 — Sharing & export (P2)

- [ ] **`share.md`** — NEW subcommand
  `/research share [notebook-id] [public | invite <email> | docs | sheets]`
  - `public`/`invite` → `nlm share public|invite` (or share MCP tool)
  - `docs`/`sheets` → `export_artifact(export_type="docs"|"sheets")` with `nlm export` CLI fallback
  - Reminds about "Anyone with the link" requirement (consistent with `drive.md`)
- [ ] **`export.md`** — add `nlm export` CLI fallback + cross-link to `/research share`

---

## Epic 4 — Docs & config (P1)

- [ ] **`references/nlm-commands.md`** → update to v0.7.2: `label` tool/CLI, `share`, top-level `export`, `nlm download {video,flashcards,mind-map,infographic,data-table}`, cinematic video format, fast-track note, split auth states (`stale` vs `unverified` / `error_reason`), and a "future: batch/cross/pipeline" pointer
- [ ] **`references/workflow-examples.md`** — add 4 examples: Video Overview, study-pack, organize-by-label, share/export
- [ ] **`SKILL.md`** — add `media`/`organize`/`share` routing rows (auth-gated); document the 3 new presets; note "works with nlm v0.7.2+"
- [ ] **`DESIGN.md`** — update architecture diagram + phase status
- [ ] **`CLAUDE.md`** (project) — update preset table, Output Files list, subcommand list, prereqs (nlm ≥ 0.7.2, `nlm doctor`)
- [ ] **`.claude/rules/research-pipeline.md`** — add label + share notes; note new auth states
- [ ] **`.claude/settings.json`** — verify only (no edit): `Bash(nlm:*)` + `mcp__notebooklm-mcp__*` already cover all new calls
- [ ] **Mirror** every change to `.claude/commands/research/` (legacy compatibility tree)

---

## Epic 5 — Suggested / future (P3)

- [ ] **Version floor + health check** — add `nlm ≥ 0.7.2` to prereqs; surface `nlm doctor` in `status.md`
- [ ] **`nlm skill install claude-code`** — reference in prereqs so the skill and the tool's own expert guidance stay aligned
- [ ] **Auth states** — update Tier-1 error-handling docs for v0.7.x (`stale` vs `unverified`, `error_reason`) so transient network blips aren't treated as full auth failure
- [ ] **Sample outputs** — add a video/flashcards/infographic example under `samples/` (matches `samples/AI-agent-trends-2026/`)
- [ ] **Long-lived MCP** — note conversation-cache env vars (`NOTEBOOKLM_CONVERSATION_TURNS_PER_NOTEBOOK`, etc.) for long-running servers
- [ ] **Multi-notebook ops** — future epic: `batch` / `cross` / `pipeline` / `tag` workflows across notebooks

---

## Verification (run after implementation)

1. **Static** — `/research` (no args) and `/research status` still route; `SKILL.md` lists media/organize/share + new presets
2. **Media** — `/research media <id> --type mindmap` and `--type video --format explainer` generate + download to `~/research-output/<topic>/`
3. **Organize** — `/research organize <id> auto` then `list` shows AI labels; verify in NotebookLM web UI
4. **Share** — `/research share <id> docs` exports a report to Google Docs; `public` returns a link
5. **End-to-end** — `/research run <topic> --preset study-pack --auto` produces report + podcast + flashcards + mind map + quiz
6. **Mirror parity** — diff `.claude/skills/research/` vs `.claude/commands/research/`; no drift
7. **Permissions** — no new permission prompts
```
