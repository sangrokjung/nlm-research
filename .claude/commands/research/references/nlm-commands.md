# NotebookLM MCP/CLI 퀵 레퍼런스

> research 스킬에서 사용하는 MCP 도구와 CLI 명령어 요약.
> MCP 접두사: `mcp__notebooklm-mcp__`

---

## 1. 인증

### MCP: refresh_auth

```
mcp__notebooklm-mcp__refresh_auth()
```

저장된 토큰으로 자동 갱신 시도. 실패 시 CLI `nlm login` 필요.

### MCP: save_auth_tokens

```
mcp__notebooklm-mcp__save_auth_tokens(
  cookies="..."
)
```

Cookie 기반 인증 저장. `nlm login` CLI 실패 시 fallback.

### CLI: nlm login

```bash
nlm login              # 브라우저 인증 (권장)
nlm login --check      # 인증 상태 확인 (서브커맨드 게이트에서 사용)
nlm login switch <profile>  # 계정 전환
```

---

## 2. 노트북

### notebook_create

```
mcp__notebooklm-mcp__notebook_create(title="리서치: <주제> - <날짜>")
```

반환: `{ notebook_id: "..." }`

### notebook_list

```
mcp__notebooklm-mcp__notebook_list(max_results=100)
```

반환: 노트북 배열 `[{ notebook_id, title, created_at }]`

### notebook_get

```
mcp__notebooklm-mcp__notebook_get(notebook_id="...")
```

반환: 노트북 상세 (소스 목록, 소스 수 포함)

### notebook_query

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id="...",
  query="핵심 인사이트 5가지를 정리해주세요",
  conversation_id="...",   # 선택: 대화 이어가기
  source_ids=["..."],      # 선택: 특정 소스만 대상
  timeout=120              # 선택: 응답 대기 시간 (초, 기본 120)
)
```

반환: AI 응답 텍스트 + conversation_id (후속 질문용)

### notebook_describe

```
mcp__notebooklm-mcp__notebook_describe(notebook_id="...")
```

반환: 노트북 설명/요약

### notebook_rename

```
mcp__notebooklm-mcp__notebook_rename(notebook_id="...", new_title="새 제목")
```

### notebook_delete

```
mcp__notebooklm-mcp__notebook_delete(notebook_id="...", confirm=true)
```

---

## 3. 소스

### source_add

**URL 소스:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="url",
  url="https://youtube.com/watch?v=...",
  wait=true    # 처리 완료까지 대기 (권장)
)
```

**벌크 URL 추가:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="url",
  urls=["https://url1.com", "https://url2.com"],
  wait=true,
  wait_timeout=120    # 기본 120초, 소스 처리 대기 시간
)
```

**텍스트 소스:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="text",
  text="소스 내용...",
  title="소스 제목"
)
```

**Google Drive 소스:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="drive",
  document_id="...",
  doc_type="doc"          # 선택: "doc" | "slides" | "sheets" | "pdf" (기본 "doc")
)
```

**파일 소스:**
```
mcp__notebooklm-mcp__source_add(
  notebook_id="...",
  source_type="file",
  file_path="/path/to/file.pdf"
)
```

### source_get_content

```
mcp__notebooklm-mcp__source_get_content(source_id="...")
```

반환: 소스의 전체 텍스트 내용

### source_describe

```
mcp__notebooklm-mcp__source_describe(source_id="...")
```

반환: 소스 요약/설명

### source_rename

```
mcp__notebooklm-mcp__source_rename(notebook_id="...", source_id="...", new_title="새 제목")
```

### source_delete

```
mcp__notebooklm-mcp__source_delete(source_id="...", confirm=true)
```

### source_list_drive / source_sync_drive

```
mcp__notebooklm-mcp__source_list_drive(notebook_id="...")
mcp__notebooklm-mcp__source_sync_drive(source_ids=["..."], confirm=true)
```

Drive 소스 목록 조회 및 동기화.

---

## 4. 채팅 설정

### chat_configure

```
mcp__notebooklm-mcp__chat_configure(
  notebook_id="...",
  goal="custom",
  custom_prompt="리서치 분석가로서 핵심 인사이트를 도출하세요",
  response_length="longer"    # "default" | "longer" | "shorter"
)
```

goal 옵션: `"default"`, `"learning_guide"`, `"custom"`

---

## 5. 노트

### note (CRUD)

```
mcp__notebooklm-mcp__note(
  notebook_id="...",
  action="create",       # "create" | "list" | "update" | "delete"
  note_id="...",          # update/delete 시 필수
  title="노트 제목",
  content="노트 내용",
  confirm=true            # delete 시 필수
)
```

---

## 6. 스튜디오

### studio_create

**리포트:**
```
mcp__notebooklm-mcp__studio_create(
  notebook_id="...",
  artifact_type="report",
  confirm=true
)
```

**마인드맵:**
```
mcp__notebooklm-mcp__studio_create(
  notebook_id="...",
  artifact_type="mind_map",
  confirm=true
)
```

**오디오 (팟캐스트):**
```
mcp__notebooklm-mcp__studio_create(
  notebook_id="...",
  artifact_type="audio",
  confirm=true
)
```

기타 artifact_type: `"video"`, `"infographic"`, `"slides"`, `"quiz"`, `"flashcards"`

### studio_create 주요 옵션

| artifact_type | 주요 옵션 | 값 |
|---------------|----------|-----|
| audio | audio_format | "deep_dive" \| "brief" \| "critique" \| "debate" |
| audio | audio_length | "short" \| "default" \| "long" |
| video | video_format | "explainer" \| "brief" |
| video | visual_style | "auto_select" \| "classic" \| "whiteboard" \| "kawaii" \| "colorful" \| "modern" \| "retro" \| "minimalist" \| "bold" |
| infographic | orientation | "portrait" \| "landscape" |
| infographic | detail_level | "simple" \| "detailed" |
| infographic | infographic_style | "timeline" \| "comparison" \| "flowchart" \| "hierarchy" \| "statistics" \| "process" \| "geographic" \| "listicle" \| "mixed" |
| report | report_format | "Briefing Doc" \| "Study Guide" \| "Blog Post" \| "Create Your Own" |
| report | custom_prompt | 사용자 지정 프롬프트 |
| slide_deck | slide_format | "detailed_deck" \| "presenter_slides" |
| slide_deck | slide_length | 정수 (슬라이드 수) |
| data_table | description | 테이블 설명 (필수) |
| mind_map | title | 마인드맵 제목 |
| quiz | question_count | 정수 (기본 2) |
| quiz/flashcards | difficulty | "easy" \| "medium" \| "hard" |

공통 옵션: `language` (BCP-47 코드, 기본 "ko"), `focus_prompt` (집중 주제), `source_ids` (특정 소스만 사용)

### studio_status

```
mcp__notebooklm-mcp__studio_status(notebook_id="...")
```

반환: 아티팩트 배열 `[{ type, status, created_at }]`
status: `"pending"` | `"in_progress"` | `"completed"` | `"failed"`

생성 후 완료까지 폴링 필요. 5초 간격 권장.

### rename (아티팩트 이름 변경)
```
mcp__notebooklm-mcp__studio_status(
  notebook_id="...",
  action="rename",
  artifact_id="...",
  new_title="새 이름"
)
```

### studio_revise

```
mcp__notebooklm-mcp__studio_revise(
  notebook_id="...",
  artifact_id="...",
  slide_instructions=[{"slide": 3, "instruction": "데이터 차트 추가"}],
  confirm=true
)
```

기존 슬라이드 덱의 개별 슬라이드 수정. 새 아티팩트를 생성하며 원본은 유지됨.

### studio_delete

```
mcp__notebooklm-mcp__studio_delete(notebook_id="...", artifact_id="...", confirm=true)
```

### download_artifact

```
mcp__notebooklm-mcp__download_artifact(
  notebook_id="...",
  artifact_type="report",
  artifact_id="...",       # 선택: 동일 유형 아티팩트가 여러 개일 때 특정 지정
  output_path="~/research-output/my_report.md",
  output_format="markdown" # 선택: "json" | "markdown" | "html" (quiz/flashcards용)
)
```

artifact_type: `"report"` | `"audio"` | `"video"` | `"slides"` | `"quiz"` | `"flashcards"` | `"mind_map"` | `"infographic"` | `"data_table"`
옵션: `slide_deck_format` (`"pdf"` | `"pptx"`), `artifact_id` (동일 유형 복수 시), `output_format` (`"json"` | `"markdown"` | `"html"` - quiz/flashcards용)

### export_artifact

```
mcp__notebooklm-mcp__export_artifact(
  notebook_id="...",
  artifact_id="...",
  export_type="docs",   # "docs" | "sheets"
  title="내보내기 제목"   # 선택: Google Docs/Sheets 문서 제목
)
```

Google Docs/Sheets로 내보내기. Data Table → Sheets, Report → Docs.

---

## 7. 리서치 (소스 자동 발견)

### research_start

```
mcp__notebooklm-mcp__research_start(
  query="AI agent framework 비교 분석",
  notebook_id="...",    # 선택: 미제공 시 새 노트북 자동 생성
  title="...",          # 선택: 새 노트북 제목
  source="web",         # "web" | "drive"
  mode="fast"           # "fast" | "deep"
)
```

반환: `{ task_id: "..." }`

### research_status

```
mcp__notebooklm-mcp__research_status(
  notebook_id="...",
  task_id="...",         # 선택: 특정 태스크 폴링
  poll_interval=30,      # 폴링 간격 (초, 기본 30)
  max_wait=300,          # 최대 대기 (초, 기본 300, 0=단일 폴링)
  compact=true,          # 토큰 절약용 요약 (기본 true)
  query="..."            # 선택: task_id 변경 시 fallback 매칭
)
```

반환: `{ status, results: [{ title, url, snippet }] }`

### research_import

```
mcp__notebooklm-mcp__research_import(
  notebook_id="...",
  task_id="...",
  source_indices=[0, 2, 4]    # 발견된 소스 중 가져올 인덱스
)
```

---

## 8. 에러 코드 및 해결법

| 에러 | 원인 | 해결 |
|------|------|------|
| `AUTH_EXPIRED` | 토큰 만료 (~20분) | `refresh_auth()` → 실패 시 `nlm login` |
| `AUTH_REQUIRED` | 미인증 | `nlm login` 실행 |
| `SOURCE_FAILED` | URL 접근 불가 | URL 유효성 확인, 비공개 영상/차단 사이트 여부 확인 |
| `QUOTA_EXCEEDED` | 노트북당 소스 50개 초과 | 주제별 노트북 분할 |
| `STUDIO_FAILED` | 아티팩트 생성 실패 | 소스 수/크기 확인 후 재시도, 대체 유형 시도 |
| `RATE_LIMITED` | API 호출 빈도 초과 | 2~5초 대기 후 재시도 |
| `NOT_FOUND` | 노트북/소스 ID 잘못됨 | `notebook_list`로 ID 재확인 |
| `NETWORK_ERROR` | 네트워크 연결 문제 | 연결 확인 후 재시도 |

### Rate Limit 권장 간격

| 작업 유형 | 간격 |
|-----------|------|
| source_add | 2초 |
| studio_create | 5초 |
| research_* | 2초 |
| notebook_query | 2초 |

---

## 9. CLI 명령어 (MCP 보완용)

MCP에 없거나 CLI가 더 편리한 경우 사용.

```bash
# 다운로드 (포맷/경로 옵션 풍부)
nlm download report <notebook-id> --output <path>
nlm download audio <notebook-id> --output <path>
nlm download slide-deck <notebook-id> --output <path> --format pptx
nlm download quiz <notebook-id> --output <path> --format json

# Alias 관리 (MCP에 없음)
nlm alias set <name> <notebook-id>
nlm alias get <name>
nlm alias list

# 소스 목록
nlm source list <notebook-id>

# 스튜디오 상태
nlm studio status <notebook-id>

# 리서치 폴링 (장시간)
nlm research status <notebook-id> --task-id <id> --max-wait 0

# 설정/프로필 (MCP에 없음)
nlm config list
nlm login switch <profile>
```
