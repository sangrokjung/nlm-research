---
name: workflow-examples
description: Copy-paste-ready command sequences for five real-world research scenarios.
---

# Research Workflow Examples

> Five practical scenarios, each with a copy-paste-ready command sequence.
> MCP prefix: `mcp__notebooklm-mcp__`

---

## Scenario 1: Trend research

Gather the latest trends for a business strategy review and generate a summary report.

### Full flow: search -> collect -> analyze -> export

```bash
# 1. YouTube search
/research search AI agent 2026 trends -n 15
```

```
# 2. Push the search results into NotebookLM
/research collect
# → pick numbers (e.g. 1, 3, 5, 8, 12)
# → auto: notebook_create + source_add x5
```

```
# 3. AI analysis
/research analyze <notebook-id>
# → chat_configure(goal="custom", custom_prompt="Act as a research analyst...")
# → notebook_query("Summarize the top 5 key insights in a structured format.")
# → studio_create(artifact_type="report")
```

```
# 4. Export results
/research export <notebook-id>
# → ~/research-output/<topic>_analysis.md
# → ~/research-output/<topic>_report.md
```

### MCP call sequence (manual run)

```
# Verify auth
nlm login --check

# Create notebook
mcp__notebooklm-mcp__notebook_create(title="Research: AI Agent Trends - 2026-03-05")

# Add sources (per URL)
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="https://youtube.com/watch?v=xxx", wait=true)
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="https://youtube.com/watch?v=yyy", wait=true)

# Configure analysis
mcp__notebooklm-mcp__chat_configure(notebook_id=<id>, goal="custom", custom_prompt="Act as a research analyst and extract the key insights.")

# Q&A
mcp__notebooklm-mcp__notebook_query(notebook_id=<id>, query="Synthesize all sources and capture the key findings, trends, and actionable insights.")

# Generate report
mcp__notebooklm-mcp__studio_create(notebook_id=<id>, artifact_type="report", confirm=true)
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)  # poll until complete

# Download
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="report", output_path="~/research-output/ai-trends_report.md")
```

---

## Scenario 2: Competitor analysis

Collect competitor product reviews and produce a SWOT analysis.

### Full flow

```bash
# 1. Search (optional)
/research search "competitor-X product review" -n 10

# 2. Push direct URLs into the collection
/research collect https://youtube.com/watch?v=abc https://youtube.com/watch?v=def https://example.com/review-article

# 3. Run a SWOT analysis
/research analyze <notebook-id>
# → pick the SWOT framework option
```

### MCP call sequence

```
# Chat configuration (SWOT analyst)
mcp__notebooklm-mcp__chat_configure(
  notebook_id=<id>,
  goal="custom",
  custom_prompt="Act as a competitive analyst and analyze using the SWOT framework. Include concrete evidence under each item.",
  response_length="longer"
)

# SWOT prompt
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="Analyze this product's Strengths, Weaknesses, Opportunities, and Threats using the SWOT framework."
)

# Follow-up (reuse conversation_id)
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="What are the differentiation points relative to our product?",
  conversation_id=<prev_conversation_id>
)
```

---

## Scenario 3: Learning materials

Auto-generate Study Guide + podcast for a technical topic.

### Full flow

```bash
# 1. Collect already-known URLs directly
/research collect https://youtube.com/watch?v=tutorial1 https://youtube.com/watch?v=tutorial2

# 2. Generate diverse learning materials
/research analyze <notebook-id>
# → choose Study Guide
# → choose podcast

# 3. Status check
/research status

# 4. Export after completion
/research export <notebook-id>
# → downloads report.md + podcast.mp3
```

### MCP call sequence

```
# Set learning goal
mcp__notebooklm-mcp__chat_configure(
  notebook_id=<id>,
  goal="learning_guide",
  response_length="longer"
)

# Create Study Guide
mcp__notebooklm-mcp__studio_create(
  notebook_id=<id>,
  artifact_type="report",
  confirm=true
)

# Create podcast (in parallel)
mcp__notebooklm-mcp__studio_create(
  notebook_id=<id>,
  artifact_type="audio",
  confirm=true
)

# Poll until complete (5-second interval)
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)

# Download
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="report", output_path="~/research-output/study-guide_report.md")
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="audio", output_path="~/research-output/study-guide_podcast.mp3")
```

---

## Scenario 4: Deep research

Use `research_start` to auto-discover additional web sources for a deep analysis.

### Full flow

```bash
# 1. Collect the baseline source
/research collect https://youtube.com/watch?v=base-source

# 2. Run deep-research mode
/research analyze <notebook-id>
# → choose deep research
# → auto source discovery + import
```

### MCP call sequence

```
# Kick off web research
mcp__notebooklm-mcp__research_start(
  notebook_id=<id>,
  query="AI agent framework comparison 2026",
  source="web",
  mode="deep"
)
# Returns: { task_id: "..." }

# Poll research progress
mcp__notebooklm-mcp__research_status(
  notebook_id=<id>,
  task_id=<task_id>
)
# Returns: { status: "completed", results: [{ title, url, snippet }, ...] }

# Import the useful discoveries
mcp__notebooklm-mcp__research_import(
  notebook_id=<id>,
  task_id=<task_id>,
  source_indices=[0, 2, 4]
)

# Continue normal analysis
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="Synthesize the existing sources together with the newly discovered ones and surface the key insights."
)
```

---

## Scenario 5: Error handling

### Auth expiration

The most common error. Token lifetime is ~20 minutes.

```
# 1st: try auto-refresh
mcp__notebooklm-mcp__refresh_auth()

# 2nd: if that fails, re-login via CLI
nlm login

# 3rd: if the CLI also fails, save cookies manually
mcp__notebooklm-mcp__save_auth_tokens(
  cookies="..."
)
```

Auth can expire mid-run during long analyze/export tasks. Subcommands run `nlm login --check` up-front.

### Source add failure

```
# Per-cause responses

# Private/deleted YouTube video
# → skip the URL and continue with the rest

# Bulk add fully fails
# → retry one URL at a time
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="<URL1>", wait=true)
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="<URL2>", wait=true)

# Over 50 sources in one notebook
# → split into multiple notebooks
mcp__notebooklm-mcp__notebook_create(title="Research: <topic> Part 2")
```

### Rate limiting

```
# Recommended intervals
# source_add: 2 seconds
# studio_create: 5 seconds
# research_*: 2 seconds
# notebook_query: 2 seconds

# On rate-limit error, wait 5 seconds and retry
```

### Studio creation failure

```
# 1st: verify failed via studio_status
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)

# 2nd: check source count/size
mcp__notebooklm-mcp__notebook_get(notebook_id=<id>)

# 3rd: retry
mcp__notebooklm-mcp__studio_create(notebook_id=<id>, artifact_type="report", confirm=true)

# 4th: if it keeps failing, try a different type
mcp__notebooklm-mcp__studio_create(notebook_id=<id>, artifact_type="mind_map", confirm=true)
```

### Network errors

```
# Verify connectivity and retry the same command
# Check MCP server status
mcp__notebooklm-mcp__server_info()
```

---

## Scenario 6: Presentation deck generation

Convert research into report + slides for a presentation.

### Full flow

```bash
# One-stop run
/research run AI agent use cases --preset presentation --auto
# → search → collect → analyze(report + slides) → export(report.md + slides.pptx)
```

### MCP call sequence (manual run)

```
# Chat configuration (presentation expert)
mcp__notebooklm-mcp__chat_configure(
  notebook_id=<id>,
  goal="custom",
  custom_prompt="Act as a presentation expert and structure the key points into a slide outline.",
  response_length="longer"
)

# Q&A
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="Organize the key points into a slide structure."
)

# Create report + slides (in parallel)
mcp__notebooklm-mcp__studio_create(
  notebook_id=<id>,
  artifact_type="report",
  confirm=true
)
mcp__notebooklm-mcp__studio_create(
  notebook_id=<id>,
  artifact_type="slides",
  slide_format="detailed_deck",
  confirm=true
)

# Poll until complete (5-second interval)
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)

# Download
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="report", output_path="~/research-output/presentation_report.md")
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="slides", output_path="~/research-output/presentation_slides.pptx", slide_deck_format="pptx")
```
