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

## Epic 6 — Local web GUI front-end (P3)

A browser app at `localhost` that drives the same pipeline visually (ADR-0012),
with a backend that shells out to `nlm` + `youtube_search.py` (ADR-0013). The CLI
remains the canonical pipeline; the GUI is an alternative driver over the same
`~/research-output/` state. See `user-flow.md` §8.

- [x] Decide stack specifics (FastAPI backend + no-build plain-JS UI) and a `python gui/run.py` launch entry point
- [x] Backend: thin `nlm`/`youtube_search.py` process-runner; parse `nlm --json`; `localhost`-bind only. Analyze polls `nlm studio status` until the report completes before downloading (report create is async). Live-validated Search→Collect→Analyze.
- [x] Stream progress (SSE): `POST /api/jobs/{collect|analyze|media}` + `GET /api/jobs/{id}/stream`; frontend uses EventSource for a live progress log (poll ticks emitted via wait_for_artifact on_poll). Live-validated.
- [x] Pages mirroring subcommands — Search · Collect · Analyze · **Media · Organize · Share** · Dashboard all wired (live-validated: organize list → 3 AI labels; share status; media mindmap create+poll)
- [ ] Upstream `nlm` bug: `nlm download mind-map` fails (artifact generates fine; report/flashcards/infographic/data-table/video downloads work). GUI degrades gracefully (completed + download error). Track for an nlm upgrade.
- [x] "Run preset" one-click flow (GUI equivalent of `/research run --auto`): `POST /api/jobs/run` orchestrates search→collect→analyze→preset artifacts, streaming progress. Presets: default, trend-report, study-pack, explainer, visual-report. Live-validated (default, 2 videos → report completed + Q&A).
- [x] Auth pill — ok / **unverified (amber, re-checks every 8s)** / stale (re-login) / error; classified server-side from `nlm login --check` (transient-network markers → unverified). Shared auth with the CLI ✓
- [x] Error-path UX — Tier-1/Tier-3 banners + **Tier-2 per-artifact Retry** buttons (Media page + Run-pipeline artifact rows re-run just the failed artifact)
- [x] Reuse `~/research-output/` state so CLI ⇄ GUI sessions interoperate (Collect/Analyze write last_session.json + sessions.jsonl)
- [x] Keep GUI behavior-identical to the CLI (every action maps to an `nlm` command — no GUI-only capabilities)
- [~] Docs: GUI README ✓; cross-link from `architecture.md` ✓ / `user-flow.md` ✓ / `CLAUDE.md` **pending**
- [ ] Wire remaining stages: Media, Organize, Share (→ their `nlm` commands)
- [x] Fix latent Windows cp1252 crash in `youtube_search.py` itself — `sys.stdout/stderr.reconfigure(encoding="utf-8")` at startup (both skills + commands copies). Verified via piped output. GUI's child UTF-8 env now belt-and-suspenders.

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
