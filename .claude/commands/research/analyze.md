# Research Analyze - NotebookLM Analysis

> Analogy: analyzing collected materials in the lab. Read the books (sources) gathered from the library, summarize them, and extract insights.

## Procedure

### 1. Determine the notebook ID

Use the text after `analyze` in `$ARGUMENTS` as the notebook-id.

- If notebook-id is empty:
  1. If `~/research-output/last_session.json` exists, auto-load notebook_id from it.
     "Using the most recent session's notebook: <topic> (<first 8 chars of notebook_id>)"
  2. If no file, ask: "Which notebook should I analyze? Please provide a notebook-id."
- If notebook-id is provided, validate it:

```
mcp__notebooklm-mcp__notebook_get(notebook_id)
```

- On failure: "Notebook not found. Run `/research status` to list your notebooks." Then abort.

### 1.5. Preset auto-routing

When called from the upper pipeline (run.md) with preset info, skip the analysis-type prompt and execute automatically.

Preset payload format:
```
Preset: <preset_name>
Analysis type: <1-5>
chat_configure: goal=<value>, custom_prompt=<value>
Artifacts: <report | report+audio | report+quiz, ...>
```

Per-preset mapping:
| Preset | Analysis type | Steps |
|--------|---------------|-------|
| default | 1 (Q&A) + 2 (report) | chat_configure → notebook_query → studio_create(report) |
| trend-report | 1 (Q&A) + 2 (report) | chat_configure → notebook_query → studio_create(report) |
| competitor | 1 (Q&A) + 2 (report) | chat_configure → notebook_query → studio_create(report) |
| learning | 1 (Q&A) + 2 (report) + 4 (podcast) | chat_configure → notebook_query → studio_create(report) + studio_create(audio) |
| deep-dive | 5 (web research) + 1 (Q&A) + 2 (report) | research_start → research_import → chat_configure → notebook_query → studio_create(report) |
| presentation | 1 (Q&A) + 2 (report) + slides | chat_configure → notebook_query → studio_create(report) + studio_create(slides) |

If no preset payload is provided, fall through to Step 2 (analysis type selection).

### 2. Choose analysis type

Ask the user to choose the analysis type:

```
## Choose an analysis type:

| # | Type | Description |
|---|------|-------------|
| 1 | Summary Q&A | Immediate response, supports follow-up questions |
| 2 | Briefing report | Briefing Doc style document |
| 3 | Mind map | Visualize topic structure |
| 4 | Podcast | Conversational audio |
| 5 | Web research | Auto-discover additional sources |

Enter a number, or pick "auto" to let me decide.
```

### 3. Execute by type

#### Type 1 - Summary Q&A

Confirm the user's question. If absent, use the default.

```
mcp__notebooklm-mcp__chat_configure(
  notebook_id,
  goal="custom",
  custom_prompt="Act as a research analyst and extract the key insights.",
  response_length="longer"
)
```

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id,
  query="<user's question or default: Summarize the top 5 key insights in a structured format.>",
  source_ids=["<specific source IDs>"]  # optional: scope the query to specific sources
)
```

- If the user asks to limit the analysis to specific sources, call `notebook_get` to list them, capture the selection, and pass it via `source_ids`. Omitting the parameter analyses every source.
- Display the result.
- Auto-save the Q&A as a note:
  ```
  mcp__notebooklm-mcp__note(
    notebook_id,
    action="create",
    title="<topic> - Key insights",
    content=<Q&A result text>
  )
  ```
- Ask whether the user has a follow-up question.
- For follow-ups, keep the `conversation_id` to continue the thread:

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id,
  query="<follow-up question>",
  conversation_id="<conversation_id from the previous response>"
)
```

- Loop until the user ends the thread.

#### Type 2 - Briefing report

```
mcp__notebooklm-mcp__studio_create(
  notebook_id,
  artifact_type="report",
  confirm=true
)
```

Poll until completion:

```
mcp__notebooklm-mcp__studio_status(notebook_id)
```

- While polling, display "Generating the briefing report..." as progress feedback.
- Call `studio_status` to check; if not done, wait ~15 seconds and check again.
- Display the result on completion.

#### Type 3 - Mind map

```
mcp__notebooklm-mcp__studio_create(
  notebook_id,
  artifact_type="mind_map",
  confirm=true
)
```

Poll until completion:

```
mcp__notebooklm-mcp__studio_status(notebook_id)
```

- Display "Generating the mind map..." while polling.
- Check via `studio_status`; if not done, wait ~15 seconds and check again.
- Display the result on completion.

#### Type 4 - Podcast

```
mcp__notebooklm-mcp__studio_create(
  notebook_id,
  artifact_type="audio",
  confirm=true
)
```

Poll until completion:

```
mcp__notebooklm-mcp__studio_status(notebook_id)
```

- Display "Generating the podcast... (this can take a few minutes)" while polling.
- Check via `studio_status`; if not done, wait ~30 seconds and check again.
- Display the result on completion.

#### Type 5 - Web research

Confirm the research topic. If absent, derive it from the notebook title.

```
mcp__notebooklm-mcp__research_start(
  notebook_id,
  query="<topic>",
  source="web",
  mode="fast"
)
```

Poll until completion:

```
mcp__notebooklm-mcp__research_status(notebook_id)
```

- Display "Web research in progress..." while polling.
- Call `research_status`; if not done, wait ~15 seconds and check again.

On completion, display the discovered sources and let the user pick which to import:

```
mcp__notebooklm-mcp__research_import(
  notebook_id,
  task_id=<task_id returned from research_status>,
  source_indices=[<numbers selected by the user>]
)
```

### 4. Default analysis (when "auto" is chosen)

If the user picks "auto" instead of a specific type, run the following sequence:

1. Q&A analysis (top 5 key insights):

```
mcp__notebooklm-mcp__chat_configure(
  notebook_id,
  goal="custom",
  custom_prompt="Act as a research analyst and extract the key insights.",
  response_length="longer"
)
mcp__notebooklm-mcp__notebook_query(
  notebook_id,
  query="Summarize the top 5 key insights in a structured format."
)
```

1.5. Auto-save the Q&A as a note:
   ```
   mcp__notebooklm-mcp__note(notebook_id, action="create", title="<topic> - Key insights", content=<result>)
   ```

2. After displaying the result, ask: "Would you also like a briefing report? (yes/no)"
   - "yes" → run `studio_create(report)`
   - "no" → move to the next-step hint

### 5. Display results and additional analysis

After displaying analysis results, ask whether the user wants additional analysis:

```
Would you like another analysis? (pick another type, or say "no" to stop)
```

- "yes" or a type number → return to Step 2 (analysis type selection).
- "no" → print the next-step hint.

### 5.5. Update the session

When analysis completes, add the `analyze` entry to `~/research-output/last_session.json`'s `stages`.

1. Read `~/research-output/last_session.json`.
2. Add/update the `stages.analyze` field:
   ```json
   {
     "stages": {
       "analyze": {
         "completed_at": "<ISO8601>",
         "types_used": [<analysis type numbers used>],
         "artifacts_created": ["<artifact types created: report, audio, ...>"]
       }
     }
   }
   ```
3. Set `status` from `"analyzing"` → `"analyzed"` and refresh `updated_at`.
4. Save the file with the Write tool.

### 6. Next-step hint

```
Next: run `/research export <notebook-id>` to export the results.
```

## Error handling

| Situation | Response |
|-----------|----------|
| studio creation failed | Check source count/size and prompt for retry. "There may be too few or too large sources. Please verify them." |
| Polling timeout (>300s / 5 minutes) | "Generation is taking longer than expected. Check back later with `/research status`." |
| Rate limit | Wait 2 seconds and retry. After 3 failures, abort with guidance. |
| Notebook missing | "Notebook not found. Run `/research status` to list your notebooks." |
