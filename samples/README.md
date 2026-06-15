# Sample Outputs

End-to-end outputs from real `/research run` invocations, captured here so readers can see what the pipeline produces without running it themselves.

These are **snapshots only** — actual runs always write to `~/research-output/<topic>/`. Re-running the same topic will produce different content because YouTube search results change over time and NotebookLM responses are non-deterministic.

## AI-agent-trends-2026/

| File | Description |
|------|-------------|
| `report.md` | NotebookLM-generated Briefing Doc (English, `--language en`). Original artifact downloaded via `nlm download report`. |
| `analysis.md` | Q&A-based insights write-up assembled from the structured Q&A query (5 trends × why-it-matters × how-to-apply × supporting sources). |

**Command that produced these:**
```bash
/research run AI agent trends 2026 --auto
```

**Notebook:** https://notebooklm.google.com/notebook/8bf3dc8c-6471-4bf3-b480-c4d9a660838c
**Preset:** `default` (research analyst, response length = longer)
**Sources:** 5 YouTube videos from Jeff Su, IBM Technology, a16z, Futurepedia, Tina Huang.
