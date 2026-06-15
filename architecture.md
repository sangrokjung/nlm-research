# Architecture — nlm-research (`/research` skill)

> System-level architecture and decision log for the `/research` Claude Code skill.
> For the detailed per-file design, see [`.claude/skills/research/DESIGN.md`](.claude/skills/research/DESIGN.md).
> For the in-flight NotebookLM v0.7.2 upgrade, see [`backlog.md`](backlog.md).

---

## 1. Overview

`/research` is a Claude Code **skill implemented entirely as Markdown prompt files** — there is no compiled application. A router prompt (`SKILL.md`) parses the first word of `$ARGUMENTS` and delegates to a subcommand prompt that instructs Claude how to call NotebookLM MCP tools, the `nlm` CLI, and local scripts.

The system automates a research pipeline:

```
YouTube search ──▶ NotebookLM collection ──▶ AI analysis ──▶ Studio artifacts ──▶ export
   (yt-dlp)          (MCP source_add)        (MCP query)     (MCP studio_create)   (nlm download)
```

### Quality attributes (what the architecture optimizes for)

| Attribute | How it is achieved |
|-----------|--------------------|
| **Editability** | Behavior lives in prose prompts, not code — changes are doc edits |
| **Resilience** | 3-tier error handling; MCP-first with CLI fallback; auth auto-refresh |
| **Low latency status** | Local JSONL cache mirrors cloud state for fast reads |
| **Composability** | Each subcommand works standalone or via the `run` orchestrator |
| **Determinism of routing** | Single router with an explicit dispatch table |

---

## 2. Component model

```
┌─────────────────────────────────────────────────────────────────────┐
│  Claude Code (agent runtime)                                          │
│                                                                       │
│   SKILL.md  ── router / auth gate ──┐                                 │
│                                     ▼                                 │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────┐           │
│   │ search   │ collect  │ analyze  │ export   │ status   │  existing │
│   ├──────────┼──────────┼──────────┼──────────┼──────────┤           │
│   │ run (orchestrates the above inline)        │ drive    │           │
│   ├──────────┬──────────┬──────────────────────┴──────────┤           │
│   │ media    │ organize │ share          (planned — v0.7.2)│  new     │
│   └──────────┴──────────┴───────────────────────────────-─┘           │
│         │            │            │                                   │
└─────────┼────────────┼────────────┼───────────────────────────────────┘
          │ scripts    │ MCP         │ CLI
          ▼            ▼             ▼
   youtube_search.py  notebooklm-mcp (stdio)   nlm  (download/export/share/label)
       (yt-dlp)            │                          │
                          ▼                          ▼
                   ┌──────────────────────────────────────┐
                   │  Google NotebookLM (cloud)            │
                   └──────────────────────────────────────┘

   Local state:  ~/research-output/last_session.json
                 ~/research-output/research_sessions.jsonl
                 ~/research-output/<topic>/<artifacts>
```

### Layers

1. **Router / orchestration** — `SKILL.md` (dispatch + auth gate), `run.md` (end-to-end pipeline).
2. **Subcommands** — one prompt per verb; each owns its MCP/CLI call sequence and error handling.
3. **Integration** — NotebookLM MCP server (`mcp__notebooklm-mcp__*`), `nlm` CLI, `youtube_search.py`.
4. **State** — NotebookLM cloud (system of record) + local JSONL/JSON cache (fast reads).

---

## 3. Cross-cutting concerns

- **Authentication** — every subcommand except `search` runs `nlm login --check`; on failure tries `refresh_auth()`, then falls back to guiding the user through `nlm login`. (v0.7.x splits status into `stale` vs `unverified` — see ADR-0011.)
- **Error handling** — 3 tiers: auto-recover → degrade → fatal-stop. See DESIGN.md §4 and `.claude/rules/research-pipeline.md`.
- **State sync** — writes go to the cloud first; the local cache is updated immediately after, including on partial success.
- **Language** — output defaults to English (BCP-47 `en`); `--lang <code>` overrides per run.
- **Output layout** — `~/research-output/<topic>/` (spaces → hyphens), auto-created.

---

## 4. Architecture Decision Records (ADRs)

Format: each record has **Status**, **Context**, **Decision**, **Consequences**. Records are append-only; a superseded decision is marked and linked, never deleted.

---

### ADR-0001 — Markdown-prompt router architecture
**Status:** Accepted

**Context.** The pipeline needs to be quick to change and readable by non-programmers, and Claude Code natively executes skills defined as Markdown. A compiled CLI would add a build/release loop and put logic out of reach of prose edits.

**Decision.** Implement the whole skill as Markdown prompt files. `SKILL.md` is a thin router that parses the first word of `$ARGUMENTS` and delegates to a per-verb subcommand file. Each subcommand stays under a ~500-line cap; heavyweight detail lives in `references/` (progressive disclosure).

**Consequences.** (+) Behavior changes are doc edits; easy to review in PRs. (+) Mirrors the established content-pipeline router pattern. (−) No compile-time checks — correctness depends on the model following prose; MCP tool/param names must be kept accurate in `references/nlm-commands.md`. (−) Logic that recurs across subcommands is duplicated in prose rather than factored into a function.

---

### ADR-0002 — MCP-first, CLI-fallback for NotebookLM
**Status:** Accepted

**Context.** NotebookLM is reachable two ways from the same install: the `notebooklm-mcp` MCP server and the `nlm` CLI. MCP gives structured tool calls (and `wait=true` semantics); the CLI gives richer download/export format and path control.

**Decision.** Use MCP as the primary interface for notebook/source/studio CRUD and queries; use the `nlm` CLI for downloads, Docs/Sheets export, sharing, labels, config, and as a fallback when an MCP call fails. Auth follows the same shape: MCP `refresh_auth` first, `nlm login` as manual fallback.

**Consequences.** (+) Best tool for each job; graceful degradation when one path breaks. (−) Two surfaces to keep documented and in sync. (−) Contributors must know which operations live where (captured in DESIGN.md §3).

---

### ADR-0003 — Hybrid state: cloud system-of-record + local JSONL cache
**Status:** Accepted

**Context.** NotebookLM holds the authoritative data, but querying it for every `status` read is slow and rate-limited. The pipeline needs fast local awareness of "what am I working on."

**Decision.** Treat NotebookLM as the system of record. Maintain a local cache: `last_session.json` (quick reference for the most recent notebook) and `research_sessions.jsonl` (append-only history). Downstream subcommands auto-load `notebook_id` from the cache. Write the cache immediately after cloud mutations, including partial success.

**Consequences.** (+) Instant `status` without API calls; resumable sessions. (−) Cache can drift from cloud (deleted notebooks) — mitigated by `status --clean`. (−) Two places represent state; the cache is advisory, never authoritative.

---

### ADR-0004 — Dual tree: `skills/` canonical, `commands/` mirror
**Status:** Accepted

**Context.** The skill originally shipped under `.claude/commands/research/`; Claude Code's skill mechanism expects `.claude/skills/research/`. Existing users/scripts may still reference the old path.

**Decision.** Keep `.claude/skills/research/` as the canonical source and `.claude/commands/research/` as a byte-for-byte mirror maintained on every change (rule recorded in CLAUDE.md).

**Consequences.** (+) Backward compatibility preserved. (−) Every edit must be applied twice; drift is a real risk → verification includes a tree diff. (Candidate for future deprecation once the legacy path is unused.)

---

### ADR-0005 — Three-tier error handling
**Status:** Accepted

**Context.** Failures span auth expiry, per-source failures, rate limits, quota, and studio-generation failures — with very different appropriate responses.

**Decision.** Classify every failure into one of three tiers: **Tier 1 (auto-recover)** — refresh auth, skip a bad source, back off and retry; **Tier 2 (degraded)** — continue with the sources/artifacts that succeeded and report the rest; **Tier 3 (fatal)** — abort with guidance (full auth failure, 0 sources, notebook-create failure).

**Consequences.** (+) Predictable, partial-progress-preserving behavior. (+) One vocabulary across all subcommands. (−) Each subcommand must map its concrete errors to a tier; the mapping is prose, not enforced.

---

### ADR-0006 — English-default output, `--lang` override
**Status:** Accepted (supersedes the earlier Korean-default prompts)

**Context.** The repo was translated to English-only; artifacts and default queries previously defaulted to Korean.

**Decision.** All prompts, default Q&A queries, note titles, and generated artifacts default to BCP-47 `en`. A single `--lang <code>` flag overrides output language per run and is passed through to `studio_create`.

**Consequences.** (+) Consistent default for a broad audience; per-run flexibility. (−) Localized runs depend on NotebookLM's language coverage per artifact type.

---

### ADR-0007 — Preset-driven pipeline
**Status:** Accepted

**Context.** Common research intents (trend report, competitor SWOT, learning pack, slide deck) each imply a specific search strategy, analysis prompt, and artifact set. Re-specifying these every run is error-prone.

**Decision.** Encode named presets (`default`, `trend-report`, `competitor`, `learning`, `presentation`, `deep-dive`) in `run.md` as a table mapping preset → search flags + `chat_configure` goal/prompt + artifact set. New intents are added as rows.

**Consequences.** (+) One flag (`--preset`) selects a whole workflow; presets are self-documenting. (−) The table is the single source of truth and must stay aligned with `analyze.md`/`export.md` and the docs.

---

### ADR-0008 — Incremental subcommand expansion for the v0.7.2 upgrade
**Status:** Accepted

**Context.** Installed `nlm` is v0.7.2, exposing far more than the skill drives (Video Overviews, Flashcards, Mind Maps, Infographics, Data Tables, source labels, sharing, Docs/Sheets export, batch/cross/pipeline). The upgrade could either restructure the router around a richer artifact/multi-notebook model or extend the existing shape.

**Decision.** Keep the ADR-0001 router/orchestrator architecture unchanged. Add three new subcommands — `media` (on-demand rich artifacts), `organize` (source labels), `share` (sharing + export) — and extend existing subcommands and presets. Defer multi-notebook `batch`/`cross`/`pipeline` to a future epic.

**Consequences.** (+) Lower risk, consistent with the existing pattern, faster to ship. (+) New capabilities are independently usable. (−) Forgoes deeper multi-notebook orchestration for now (parked in `backlog.md` Epic 5). (−) More subcommand files to maintain and mirror (ADR-0004).

---

### ADR-0009 — Studio fast-track prompting
**Status:** Accepted

**Context.** `nlm` v0.7.0 added fast-track studio prompting: agents infer format/style from context and generate immediately, instead of walking the user through an intake questionnaire.

**Decision.** New/updated artifact generation (`media.md`, `analyze.md`, presets) emits a one-line notice of the inferred format/style and proceeds to `studio_create` without an interactive questionnaire. Explicit flags (`--format`, `--style`, `--focus`) override the inference.

**Consequences.** (+) Fewer round-trips, especially in `--auto` runs. (−) Inference can pick a non-ideal format; mitigated by explicit override flags and the post-generation report.

---

### ADR-0010 — Source labels as the "manage-within-NotebookLM" surface
**Status:** Accepted

**Context.** The user wants an easy way to manage research *inside* NotebookLM, not just produce files. `nlm label` (auto/list/reorganize/create/rename/emoji/move/delete) groups a notebook's sources thematically within NotebookLM itself.

**Decision.** Expose labels through a dedicated `organize` subcommand (default action `auto` → AI-generated thematic labels), backed by the `label` MCP tool with `nlm label` CLI fallback. Surface labels in `status.md` (dashboard view) and offer optional auto-labeling after `collect`.

**Consequences.** (+) Directly satisfies the "manage within NotebookLM" goal; organization persists in the NotebookLM UI. (−) Adds a tool dependency whose exact MCP name must be confirmed against `nlm --ai` at implementation time.

---

### ADR-0011 — Target nlm v0.7.2 as the version floor
**Status:** Accepted

**Context.** Features in this architecture (cinematic video, full download subcommands, labels, split auth states) require recent `nlm`. Older installs would fail opaquely.

**Decision.** Declare **nlm ≥ 0.7.2** as the supported floor. Document it in prereqs, surface `nlm doctor` in `status.md`, and reference `nlm skill install claude-code` so the tool's own guidance stays aligned. Update error-handling docs for the v0.7.x auth states (`stale` = genuine expiry vs `unverified` = transient network).

**Consequences.** (+) Clear failure signal for out-of-date installs; accurate auth diagnostics. (−) Users on older `nlm` must upgrade before using the new subcommands.

---

## 5. Decision index

| ADR | Title | Status |
|-----|-------|--------|
| 0001 | Markdown-prompt router architecture | Accepted |
| 0002 | MCP-first, CLI-fallback | Accepted |
| 0003 | Hybrid cloud + local JSONL state | Accepted |
| 0004 | Dual tree (skills canonical / commands mirror) | Accepted |
| 0005 | Three-tier error handling | Accepted |
| 0006 | English-default output, `--lang` override | Accepted |
| 0007 | Preset-driven pipeline | Accepted |
| 0008 | Incremental subcommand expansion (v0.7.2) | Accepted |
| 0009 | Studio fast-track prompting | Accepted |
| 0010 | Source labels as manage-within-NotebookLM surface | Accepted |
| 0011 | nlm ≥ 0.7.2 version floor | Accepted |

---

## 6. Related documents

- [`.claude/skills/research/DESIGN.md`](.claude/skills/research/DESIGN.md) — detailed per-file design, MCP flow, schemas
- [`backlog.md`](backlog.md) — v0.7.2 upgrade work tracking
- [`.claude/rules/research-pipeline.md`](.claude/rules/research-pipeline.md) — operational rules (auth, error tiers, paths)
- [`CLAUDE.md`](CLAUDE.md) — project guidance for Claude Code
- [`.claude/skills/research/references/nlm-commands.md`](.claude/skills/research/references/nlm-commands.md) — MCP/CLI command reference
