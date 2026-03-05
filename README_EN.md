<!-- hero banner -->
<p align="center">
  <img src="assets/hero-banner.png" alt="NLM Research - YouTube + NotebookLM AI Research Automation" width="100%">
</p>

<p align="center">
  <a href="https://docs.anthropic.com/claude-code"><img src="https://img.shields.io/badge/Claude_Code-Skill-7C3AED?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude Code"></a>
  <a href="https://notebooklm.google.com"><img src="https://img.shields.io/badge/Google-NotebookLM-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="NotebookLM"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" alt="License: MIT"></a>
</p>

<p align="center">
  <strong>One keyword → YouTube video search → Google NotebookLM AI analysis → Markdown report</strong>
</p>

<p align="center">
  <a href="README.md">한국어</a> | <strong>English</strong>
</p>

---

# NLM Research

An automated research pipeline powered by Claude Code slash command (`/research`).
Searches YouTube for videos, collects them into Google NotebookLM, runs AI analysis, and exports markdown reports.

## ✨ Key Features

- 🔍 **One-stop Pipeline** — From keyword to report in a single command: search → collect → analyze → export
- 🎯 **6 Presets** — Optimized for trend analysis, competitor SWOT, learning materials, deep-dive, presentation, and more
- 🤖 **Interactive / Auto Mode** — Step-by-step confirmation or fully automated with `--auto` flag
- 🛡️ **3-Tier Error Handling** — Auto-recovery for auth expiry, graceful degradation for partial failures, abort only on fatal errors
- 📦 **Rich Outputs** — Markdown reports, AI podcasts (mp3), quizzes (json), slides (pptx)

## 🏗️ Architecture

<p align="center">
  <img src="assets/architecture.png" alt="NLM Research Architecture" width="100%">
</p>

```
User Input (keyword)
    │
    ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Search  │ ──▶ │ Collect  │ ──▶ │ Analyze  │ ──▶ │  Export  │
│ YouTube  │     │ NLM Add  │     │ NLM AI   │     │ Save File│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
  yt-dlp          MCP API          MCP API        MCP + CLI
```

| Component | Role |
|-----------|------|
| **Claude Code** | Skill execution engine (slash command `/research`) |
| **yt-dlp** | YouTube video search |
| **NotebookLM MCP** (v0.3.19) | Notebook creation, source collection, AI analysis, artifact generation |
| **nlm CLI** (v0.3.19) | Authentication, artifact download |

## 🚀 Quick Start

### Prerequisites

| Tool | Install Command | Verify |
|------|-----------------|--------|
| Claude Code | [Official Guide](https://docs.anthropic.com/claude-code) | `claude --version` |
| Deno 2.7.3+ | `curl -fsSL https://deno.land/install.sh \| sh` | `deno --version` |
| nlm CLI v0.3.19+ | `deno install -gArf jsr:@nicholasgriffintn/notebooklm-cli` | `nlm --version` |
| yt-dlp | `pip install yt-dlp` | `yt-dlp --version` |
| NotebookLM MCP | Register MCP server in `~/.claude.json` | — |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sangrokjung/nlm-research.git
cd nlm-research

# 2. Authenticate with NotebookLM (one-time)
nlm login
# Log in with your Google account in the browser
```

### First Run

```bash
# Start Claude Code (run from this directory to activate /research command)
claude

# Fully automated run
/research run AI agent trends --auto

# Interactive run (confirm each step)
/research run AI agent trends
```

## 🎯 Presets

<p align="center">
  <img src="assets/presets-infographic.png" alt="NLM Research Presets" width="100%">
</p>

| Preset | Purpose | Sources | Output |
|--------|---------|---------|--------|
| `default` | General research | 5 | report.md |
| `trend-report` | Market trends & forecasting | 5 | report.md |
| `competitor` | Competitor SWOT analysis | 5 | report.md |
| `learning` | Learning materials | 3 | report.md + podcast.mp3 + quiz.json |
| `deep-dive` | Deep analysis (incl. web research) | 10 | report.md |
| `presentation` | Presentation materials | 5 | report.md + slides.pptx |

```bash
/research run <topic> --preset <preset-name>

# Examples
/research run competitor-X product review --preset competitor --auto
/research run React 19 new features --preset learning
```

## 🔄 Pipeline

<p align="center">
  <img src="assets/pipeline-flow.png" alt="NLM Research Pipeline Flow" width="100%">
</p>

| Step | Description | Tool |
|------|-------------|------|
| 🔍 **Search** | Search YouTube by keyword, display results | yt-dlp |
| 📚 **Collect** | Add selected videos as NotebookLM sources | MCP `source_add` |
| 🧠 **Analyze** | AI analyzes sources, generates reports/podcasts | MCP `notebook_query`, `studio_create` |
| 📤 **Export** | Download analysis results to local files | nlm CLI `download` |

## 💡 Usage Examples

### 1. Quick Trend Analysis

```bash
/research run AI agent 2026 trends --auto --preset trend-report
# → Auto-collect 5 videos → trend analysis report → saved to ~/research-output/
```

### 2. Competitor Analysis

```bash
/research run competitor-X product review --preset competitor
# → Interactive: select videos → SWOT analysis → report
```

### 3. Learning Materials

```bash
/research run React 19 new features --preset learning --auto
# → Learning guide report + AI podcast (mp3) + quiz (json)
```

### 4. Add to Existing Notebook

```bash
/research run additional keywords --notebook <existing-notebook-id>
# → Add sources to existing notebook and re-analyze
```

### 5. Step-by-step Manual Execution

```bash
/research search AI agents              # 1. YouTube search
/research collect                        # 2. Collect selected videos to NLM
/research analyze <notebook-id>          # 3. AI analysis
/research export <notebook-id>           # 4. Export files
/research status                         # Check session status
```

## ⚙️ Options

### search Options

| Option | Description | Default |
|--------|-------------|---------|
| `-n <number>` | Number of YouTube search results | 10 |
| `-d` | Sort by date (newest first) | off |
| `--json` | JSON output format | off |

```bash
/research search AI agents -n 15 -d    # Latest 15 results
```

### run Options

| Option | Description | Default |
|--------|-------------|---------|
| `--auto` | Run without confirmation prompts | false |
| `--preset <name>` | Select preset | default |
| `--top <N>` | Number of top results to collect | per preset |
| `--notebook <id>` | Add to existing notebook | create new |
| `--lang <code>` | Artifact language (BCP-47) | ko |

#### `-n` vs `--top`

- **`-n`**: Total number of **search results** fetched from YouTube API (used in `search`)
- **`--top`**: Number of **top videos to actually collect** into NotebookLM (used in `run`)

```bash
# Search 15 results, collect top 3
/research run AI -n 15 --top 3 --auto
```

## 📁 Output

Results are saved by topic under `~/research-output/<topic>/`.

```
~/research-output/
├── AI_agent_trends/
│   ├── AI_agent_trends_report.md          # NotebookLM briefing report
│   ├── AI_agent_trends_analysis.md        # Q&A comprehensive analysis
│   ├── AI_agent_trends_podcast.mp3        # AI podcast (learning)
│   ├── AI_agent_trends_quiz.json          # Quiz (learning)
│   └── AI_agent_trends_slides.pptx        # Slides (presentation)
├── last_session.json                       # Last session reference
└── research_sessions.jsonl                 # Session history
```

| File | Content | Preset |
|------|---------|--------|
| `*_report.md` | NotebookLM briefing report | All |
| `*_analysis.md` | Q&A comprehensive analysis | All |
| `*_podcast.mp3` | AI podcast | learning |
| `*_quiz.json` | Learning quiz | learning |
| `*_slides.pptx` | Presentation slides | presentation |

## 🛡️ Error Handling

<p align="center">
  <img src="assets/error-handling.png" alt="NLM Research Error Handling" width="100%">
</p>

The system applies 3-tier error handling:

| Tier | Type | Action | Examples |
|------|------|--------|----------|
| **Tier 1** | Auto Recovery (Fixable) | System resolves automatically | Auth expired → auto-refresh, Rate limit → wait & retry |
| **Tier 2** | Partial Progress (Degraded) | Skip failed items, continue | Some URL collection failures, artifact generation failure |
| **Tier 3** | Abort (Fatal) | Stop pipeline, notify user | Complete auth failure, 0 sources collected, notebook creation failure |

### Common Issues

| Situation | Solution |
|-----------|----------|
| "NotebookLM authentication required" | Run `nlm login` in terminal |
| Specific URL collection failure | Private/deleted video → auto-skip |
| Report generation failure | Too few or too many sources → check with `/research status` |
| 0 sources collected | Change search keywords and retry |

## 📂 Project Structure

```
nlm-research/
├── README.md                               # Documentation (Korean)
├── README_EN.md                            # Documentation (English)
├── assets/                                 # Documentation images
├── .claude/commands/research/
│   ├── SKILL.md                           # Router (subcommand dispatch)
│   ├── DESIGN.md                          # System design document
│   ├── run.md                             # One-stop pipeline
│   ├── search.md                          # YouTube search
│   ├── collect.md                         # NotebookLM source collection
│   ├── analyze.md                         # AI analysis
│   ├── export.md                          # Result file export
│   ├── status.md                          # Session status
│   ├── scripts/
│   │   └── youtube_search.py              # YouTube search script
│   └── references/
│       ├── nlm-commands.md                # NotebookLM MCP/CLI reference
│       └── workflow-examples.md           # Workflow scenario examples
└── ~/research-output/                     # Output directory (auto-created)
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the [MIT License](LICENSE).
