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

### Published to Google Docs

The same two artifacts were exported to Google Docs:

| Doc | Link | Account |
|-----|------|---------|
| Report — *AI Strategic Briefing: The Landscape of 2026* | https://docs.google.com/document/d/1JiWMb-X6MKh-xcJjdVhG_QSIlnTq-2oSloBiY76pCQk | `srini@absolut-e.com` (via `nlm export to-docs`) |
| Analysis — *Key insights (Q&A)* | https://docs.google.com/document/d/1dqaoDQhk7LaFtnwTi7OcMlGxph8Gg85gFtyZ9gQ0jQ8 | `koushik@absolut-e.com` (via Google Drive connector) |

> Both Docs are currently **private to their owner**. To share, open each in Google
> Docs → **Share → General access → "Anyone with the link" → Viewer**. (The links
> only resolve for accounts that have been granted access.)

## NotebookLM-workflows-2026

A later run, used to validate the source-URL sidecar end-to-end (CLI `/research run`
→ real video links in the GUI Sources tab). Artifacts written to
`~/research-output/NotebookLM-workflows-2026/` (report.md, analysis.md, source_urls.json).

**Command that produced these:**
```bash
/research run NotebookLM workflows 2026 --auto
```

**Notebook:** https://notebooklm.google.com/notebook/6d72a4e7-5bca-4fa9-b4c0-69cdb99966b9
**Preset:** `default`
**Sources:** 5 YouTube videos from Jeff Su, Universe of AI, Sadie St Lawrence, Paul J Lipsky, Robert's Tech Toolbox.

### Published to Google Docs

| Doc | Link | Account |
|-----|------|---------|
| Report — *NotebookLM workflows 2026 — Briefing Doc* | https://docs.google.com/document/d/1cso3Xg-LEavNH_1l3ZJiXgktpk_1Devm4PRhpwiGX5M | `srini@absolut-e.com` (via `nlm export to-docs`) |

> Private to the owner; share via **Share → Anyone with the link → Viewer**.
