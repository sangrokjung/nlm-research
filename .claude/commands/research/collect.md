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
  - JSON 구조: `{ searched_at, keyword, options, results: [...] }` — 검색 결과는 `results` 필드에서 읽는다.
  - 파일이 존재하면: `results` 배열을 번호 목록으로 표시하고 사용자에게 번호를 선택하게 한다.
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

### 3단계: 소스 추가

수집할 소스 목록이 확정되면, 각 항목의 유형을 감지한다:

**소스 유형 감지:**
- 로컬 파일 경로 (`/`, `~/`, `./`로 시작): `source_type="file"`
- Google Drive URL (`docs.google.com`, `drive.google.com` 포함): `source_type="drive"`
- Google Drive 문서 ID (영숫자+하이픈+언더스코어, 25자 이상의 단일 문자열): `source_type="drive"`
- YouTube URL (`youtube.com`, `youtu.be` 포함): `source_type="url"`
- 기타 웹 URL (`http://`, `https://`로 시작): `source_type="url"`

**유형별 추가:**

1. **YouTube/웹 URL**: 벌크 추가 시도 → 실패 시 단건 fallback
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="url", urls=["<URL1>", "<URL2>"], wait=true)
   ```
   단건 fallback:
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="url", url="<URL>", wait=true)
   ```

2. **Google Drive**: URL에서 문서 ID를 추출하여 추가
   - URL 패턴: `docs.google.com/document/d/<ID>/...` 또는 `drive.google.com/file/d/<ID>/...`에서 `<ID>` 부분 추출
   - 문서 ID가 직접 입력된 경우 그대로 사용
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="drive", document_id="<ID>")
   ```

3. **로컬 파일**: 각 파일을 순차 추가
   ```
   mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="file", file_path="<경로>")
   ```

4. 각 추가 결과(성공/실패)를 사용자에게 보고합니다.

### 4단계: 텍스트 소스 (선택)

사용자가 텍스트 소스도 추가하고 싶은지 확인합니다.
원하면:
```
mcp__notebooklm-mcp__source_add(notebook_id=..., source_type="text", text="<내용>", title="<제목>")
```

### 5단계: 소스 확인

`mcp__notebooklm-mcp__notebook_get(notebook_id=...)`으로 최종 소스 수를 확인하고 사용자에게 보고합니다.

### 5.5단계: last_session 저장

현재 세션 정보를 `~/research-output/last_session.json`에 저장한다. 이 파일은 후속 커맨드(analyze, export, status)에서 notebook_id 미지정 시 자동으로 참조된다.

```json
{
  "notebook_id": "<id>",
  "topic": "<주제>",
  "created_at": "<ISO8601>",
  "updated_at": "<ISO8601>",
  "status": "collecting",
  "source_count": <N>,
  "urls": ["<url1>", "<url2>"],
  "artifacts": [],
  "preset": "default",
  "stages": {
    "collect": {
      "completed_at": "<ISO8601>",
      "source_count": <성공 수>,
      "failed_urls": ["<실패한 URL들>"]
    }
  }
}
```

Write 도구로 JSON 파일을 저장한다. `stages.collect.completed_at`은 소스 추가 완료 시점, `source_count`는 성공한 소스 수, `failed_urls`는 실패한 URL 목록이다.

### 6단계: 세션 기록

소스 추가가 완료되면 (부분 성공 포함) 즉시 세션을 기록한다.

**기록 시점**: 소스 추가 직후 (5단계 소스 확인 전)
**부분 실패**: 일부 URL이 실패해도 성공한 소스가 1개 이상이면 기록한다.

`~/research-output/research_sessions.jsonl`에 세션 정보를 append합니다.

```bash
mkdir -p ~/research-output
```

기록할 JSON 형식:
```json
{"notebook_id": "<id>", "topic": "<주제>", "created_at": "<ISO8601>", "updated_at": "<ISO8601>", "status": "collecting", "source_count": <성공 수>, "urls": ["<성공한 url만>"], "artifacts": [], "preset": "default"}
```

Bash로 `date '+%Y-%m-%dT%H:%M:%S'`를 실행하여 현재 시각을 가져온 후, echo 또는 python3으로 JSONL 파일에 한 줄 append합니다.

**실패 기록**: 모든 URL이 실패한 경우에도 빈 urls로 기록하여 디버깅에 활용한다.

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
