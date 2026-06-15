# Research Search - YouTube Search

> Analogy: searching the library catalog by keyword. We probe the YouTube stacks for related videos.

## Procedure

### 1. Extract the keyword

Use the text after `search` in `$ARGUMENTS` as the keyword.

- If the keyword is empty, ask: "What topic should I search for? Please enter a keyword."
- If there is a keyword, proceed.

### 2. Parse options

Strip the following option flags out of the keyword:

| Option | Description | Default |
|--------|-------------|---------|
| `-n <number>` | Number of results | 10 |
| `-d` | Sort by newest first | off |
| `--json` | Emit JSON output | off |

Whatever remains after removing flags is the actual search keyword.

### 3. Run the search and persist

Run the search and save the results with metadata as JSON.

```bash
mkdir -p ~/research-output
python3 ~/.claude/commands/research/scripts/youtube_search.py "<keyword>" -n <count> --json > /tmp/search_raw.json
```

Add the `-d` flag when sort-by-date is requested.

Wrap the results with metadata before saving:

```bash
python3 -c "
import json, datetime
with open('/tmp/search_raw.json') as f:
    results = json.load(f)
wrapped = {
    'searched_at': datetime.datetime.now().isoformat(),
    'keyword': '<keyword>',
    'options': {'count': <count>, 'sort_by_date': <true|false>},
    'results': results
}
with open('$HOME/research-output/last_search.json', 'w') as f:
    json.dump(wrapped, f, ensure_ascii=False, indent=2)
"
```

Parse the JSON to render a display list (no separate command needed).

### 4. Display the results

Render the results as a numbered list:

```
## YouTube search results: "<keyword>"

1. [video title] - channel (views, upload date)
   URL: https://youtube.com/watch?v=...

2. [video title] - channel (views, upload date)
   URL: https://youtube.com/watch?v=...
...
```

### 5. Next-step hint

After displaying the results:

```
Next: run `/research collect` to push the selected videos into NotebookLM.
```
