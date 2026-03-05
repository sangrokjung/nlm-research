# Research Collect - 소스 수집

NotebookLM에 소스를 수집하여 리서치 노트북을 구성합니다.

## 사용법
- `/research collect <URL1> <URL2> ...` — URL들을 노트북에 추가
- `/research collect` — 직전 search 결과에서 선택하여 추가

## 실행 절차

### 1단계: 인자 파싱

$ARGUMENTS에서 "collect" 이후의 내용을 파싱하세요.
- URL이 있으면 수집 대상으로 사용
- URL이 없으면 `~/research-output/last_search.json` 파일을 읽어 이전 검색 결과를 표시한다.
  - 파일이 존재하면: 번호 목록을 표시하고 사용자에게 번호를 선택하게 한다.
  - 파일이 없으면: "검색 결과가 없습니다. URL을 직접 입력하거나 `/research search`를 먼저 실행하세요." 안내

### 2단계: 노트북 확보

1. `mcp__notebooklm-mcp__notebook_list`로 기존 노트북 목록을 조회합니다.
2. 사용자에게 선택지를 제시합니다:
   - 기존 노트북 중 하나를 선택
   - 새 노트북 생성
3. 새 노트북 생성 시:
   - 사용자에게 주제를 확인합니다
   - `date '+%Y-%m-%d'`로 오늘 날짜를 가져옵니다
   - `mcp__notebooklm-mcp__notebook_create(title="리서치: <주제> - <날짜>")`로 생성

### 3단계: URL 소스 추가

수집할 URL 목록이 확정되면:

1. **벌크 추가 시도**: 여러 URL이 있으면 urls 파라미터로 한 번에 추가를 시도합니다.
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="url", urls=["<URL1>", "<URL2>"], wait=true)
   ```

2. **단건 fallback**: 벌크 추가가 실패하면, 각 URL을 하나씩 순차적으로 추가합니다.
   ```
   for each URL:
     mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="url", url="<URL>", wait=true)
   ```

3. 각 추가 결과(성공/실패)를 사용자에게 보고합니다.

### 4단계: 텍스트 소스 (선택)

사용자가 텍스트 소스도 추가하고 싶은지 확인합니다.
원하면:
```
mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="text", text="<내용>", title="<제목>")
```

### 5단계: 소스 확인

`mcp__notebooklm-mcp__notebook_get(notebook_id=...)`으로 최종 소스 수를 확인하고 사용자에게 보고합니다.

### 6단계: 세션 기록

`~/research-output/research_sessions.jsonl`에 세션 정보를 append합니다.

```bash
mkdir -p ~/research-output
```

기록할 JSON 형식:
```json
{"notebook_id": "<id>", "topic": "<주제>", "created_at": "<date '+%Y-%m-%dT%H:%M:%S'>", "source_count": <수>, "urls": ["<url1>", "<url2>"]}
```

Bash로 `date '+%Y-%m-%dT%H:%M:%S'`를 실행하여 현재 시각을 가져온 후, echo 또는 python3으로 JSONL 파일에 한 줄 append합니다.

### 7단계: 다음 단계 안내

수집 완료 후 안내 메시지:
```
소스 수집이 완료되었습니다.

| 항목 | 값 |
|------|-----|
| 노트북 ID | <notebook_id> |
| 주제 | <주제> |
| 소스 수 | <N>개 |

다음 단계: `/research analyze <notebook-id>` 를 실행하세요.
```

## 주의사항

- MCP 도구 접두사: `mcp__notebooklm-mcp__` (하이픈 포함)
- 날짜 계산은 반드시 `date` 명령어 사용 (암산 금지)
- 에러 발생 시 사용자에게 명확히 보고하고 다음 URL로 진행
- 노트북 선택/생성은 반드시 사용자 확인 후 진행
