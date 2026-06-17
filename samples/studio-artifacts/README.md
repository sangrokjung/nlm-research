# Studio Artifacts — sample outputs

The rich Studio artifacts (`/research media`, or the `study-pack` / `explainer` /
`visual-report` presets) are **binary or large**, so they aren't committed here —
this documents what each produces, the command that generates it, and the
real-world quirks observed on `nlm` v0.7.2 (generated live against the
`AI-agent-trends-2026` notebook `8bf3dc8c…`).

| Artifact | Generate | Download | Output | Notes (observed on v0.7.2) |
|----------|----------|----------|--------|----------------------------|
| **Video Overview** | `/research media <id> --type video --format explainer` | `nlm download video` | `.mp4` (multi-MB) | explainer / brief / cinematic; ~minutes to generate; not committed (size) |
| **Flashcards** | `/research media <id> --type flashcards` | `nlm download flashcards` | `.json` | Generates in NotebookLM, but the v0.7.2 download returns metadata with an **empty `cards` array** (`{"title": "...", "cards": []}`) — view the cards in the NotebookLM UI |
| **Infographic** | `/research media <id> --type infographic` | `nlm download infographic` | `.png` (~4–5 MB) | Single-image visual summary; landscape/portrait/square; not committed (size) |
| **Mind Map** | `/research media <id> --type mindmap` | `nlm download mind-map` | `.json` | Generates fine; **`nlm download mind-map` fails on v0.7.2** (upstream bug) — view in the NotebookLM UI |
| **Data Table** | `/research media <id> --type datatable --focus "..."` | `nlm download data-table` | `.csv` | Structured comparison table |

## Want the real files?

Generate them into `~/research-output/<topic>/`:

```bash
/research media <notebook-id> --type all          # video + flashcards + mindmap + infographic + datatable
# or a preset that bundles them:
/research run <topic> --preset visual-report --auto   # report + infographic + mind map + data table
/research run <topic> --preset study-pack --auto      # report + podcast + flashcards + mind map + quiz
/research run <topic> --preset explainer --auto       # report + video
```

Text-based sample outputs (report + Q&A) and exported Google Docs links are in the
parent [`samples/README.md`](../README.md).
