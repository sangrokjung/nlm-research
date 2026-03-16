# Research Pipeline 통합 시스템 기획서

> YouTube 검색 + NotebookLM 분석을 하나의 `/research` 스킬로 통합하는 설계 문서.
> 비유: 도서관에서 책을 검색(search)하고, 필요한 책을 서가에 모으고(collect), 읽고 분석하고(analyze), 요약 노트를 작성(export)하는 전체 리서치 프로세스를 자동화.

---

## 1. 폴더 구조

```
~/.claude/commands/research/
├── DESIGN.md                        # 시스템 기획서
├── SKILL.md                        # 메인 라우터 (서브커맨드 분배, ~100줄)
├── run.md                          # /research run <주제> (원스톱 파이프라인)
├── search.md                       # /research search <키워드>
├── collect.md                      # /research collect <urls|keyword>
├── analyze.md                      # /research analyze <notebook-id>
├── export.md                       # /research export <notebook-id>
├── status.md                       # /research status [notebook-id]
├── scripts/
│   └── youtube_search.py           # 기존 youtube-search 스크립트 심볼릭 링크
└── references/
    ├── nlm-commands.md             # NotebookLM MCP/CLI 핵심 명령어 레퍼런스
    └── workflow-examples.md        # 실제 사용 시나리오 예시
```

### 설계 원칙 (Task #1 조사 결과 반영)

- **스킬명**: `research` (간결성 우선, Task #2 제안)
- **500줄 제한**: 각 서브커맨드 `.md`는 500줄 이내. 복잡한 레퍼런스는 `references/`로 분리 (progressive disclosure)
- **3가지 유형 하이브리드** (Task #2 분석): 라우터(SKILL.md) + 스크립트(scripts/) + 참조분리(references/)

### 심볼릭 링크 전략

```bash
ln -s ~/.claude/commands/youtube-search/scripts/youtube_search.py \
      ~/.claude/commands/research/scripts/youtube_search.py
```

기존 `youtube-search` 스킬은 독립 사용 유지. `research`는 이를 감싸는 상위 워크플로우.

---

## 2. 각 파일의 역할과 내용 요약

### 2.1 SKILL.md (메인 라우터)

```yaml
---
name: research
description: YouTube 검색 → NotebookLM 수집/분석 → 결과 추출까지 리서치 전체 파이프라인. 키워드 기반 영상 검색, 소스 수집, AI 분석, 결과 내보내기를 하나의 워크플로우로 통합.
argument-hint: <run|search|collect|analyze|export|status> [options]
allowed-tools: Read, Write, Edit, Bash(python3:*), Bash(nlm:*), Bash(date:*), Bash(mkdir:*), Bash(ln:*), mcp__notebooklm-mcp__*
user-invocable: true
---
```

**역할:** `$ARGUMENTS`의 첫 번째 단어를 파싱하여 해당 서브커맨드 `.md` 파일로 라우팅.
content-pipeline과 동일한 라우터 패턴 적용.

**라우팅 규칙:**

| 첫 번째 단어 | 라우팅 대상 | 비고 |
|---|---|---|
| `run` | `run.md` | 원스톱 파이프라인 (search→collect→analyze→export) |
| (빈 값) / `status` | `status.md` | 현재 세션 상태 조회 |
| `search` | `search.md` | YouTube 키워드 검색 |
| `collect` | `collect.md` | 검색 결과를 NotebookLM에 수집 |
| `analyze` | `analyze.md` | NotebookLM에 분석 요청 |
| `export` | `export.md` | 분석 결과 추출 |
| 그 외 | 사용법 안내 출력 | |

**인증 게이트 (모든 서브커맨드 공통, search 제외):**
```bash
nlm login --check
```
실패 시: `mcp__notebooklm-mcp__refresh_auth()` 시도 → 실패하면 `nlm login` 안내 후 중단.

### 2.2 search.md (YouTube 검색)

**역할:** 키워드로 YouTube 영상을 검색하고 결과를 표시.

**실행 절차:**
1. `$ARGUMENTS`에서 `search` 이후 텍스트를 키워드로 추출
2. 키워드가 없으면 사용자에게 질문
3. `python3 scripts/youtube_search.py "<키워드>" -n <결과수>` 실행
4. 결과를 번호 목록으로 표시 (제목, 채널, 조회수, 길이, URL)
5. **다음 단계 안내**: "이 결과를 NotebookLM에 수집하려면 `/research collect` 를 실행하세요"

**옵션 전달:**
- `-n <숫자>`: 결과 수 (기본 10)
- `-d`: 최신순 정렬
- `--json`: JSON 출력

**MCP 도구:** 없음 (youtube_search.py 스크립트만 사용)

### 2.3 collect.md (소스 수집)

**역할:** YouTube URL, 웹 URL, 로컬 파일을 NotebookLM 노트북에 소스로 추가.

**실행 절차:**
1. **노트북 확보**
   - `mcp__notebooklm-mcp__notebook_list`로 기존 노트북 조회
   - 적절한 노트북이 없으면 새로 생성: `mcp__notebooklm-mcp__notebook_create(title="<주제>")`
2. **URL 소스 추가**
   - `$ARGUMENTS`에 URL이 있으면 해당 URL 사용
   - URL이 없으면 직전 `search` 결과에서 사용자가 번호 선택
   - 각 URL에 대해: `mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", url="<URL>", wait=true)`
   - **`wait=true` 필수**: 소스 처리 완료까지 대기하여 후속 analyze에서 즉시 사용 가능 (Task #3)
   - **벌크 추가 시 fallback**: 한 번에 여러 URL 추가 실패 시 → 단건씩 순차 추가 (Task #3 에러 처리)
3. **텍스트 소스 추가 (선택)**
   - `mcp__notebooklm-mcp__source_add(notebook_id, source_type="text", text="...", title="...")`
4. **추가 확인**: `mcp__notebooklm-mcp__notebook_get(notebook_id)` 로 소스 수 확인
4.5. **last_session 저장**: `~/research-output/last_session.json`에 현재 세션 저장 (후속 커맨드에서 자동 참조)
5. **세션 기록**: 소스 추가 직후 `~/research-output/research_sessions.jsonl`에 세션 정보 append (부분 실패 포함)
   ```json
   {"notebook_id": "...", "topic": "...", "created_at": "...", "updated_at": "...", "status": "collecting", "source_count": 5, "urls": ["..."], "artifacts": [], "preset": "default"}
   ```
6. **다음 단계 안내**: "분석을 시작하려면 `/research analyze <notebook-id>` 를 실행하세요"

**MCP 도구:**
- `mcp__notebooklm-mcp__notebook_list`
- `mcp__notebooklm-mcp__notebook_create`
- `mcp__notebooklm-mcp__source_add` (wait=true)
- `mcp__notebooklm-mcp__notebook_get`

### 2.4 analyze.md (분석 요청)

**역할:** NotebookLM의 AI 기능을 활용하여 수집된 소스를 분석/요약.

**실행 절차:**
1. 노트북 ID 확인 (`$ARGUMENTS`에서 추출 또는 사용자에게 질문)
2. **채팅 설정 (선행)**: `mcp__notebooklm-mcp__chat_configure(notebook_id, goal="custom", custom_prompt="리서치 분석가로서...")` (Task #3)
3. **분석 유형 선택** (사용자에게 확인):

| 유형 | MCP 호출 | 설명 |
|------|---------|------|
| 요약 질문 | `notebook_query(notebook_id, query="...")` | 즉시 응답, 대화 이어가기 가능 (`conversation_id`) |
| 리포트 | `studio_create(notebook_id, artifact_type="report", report_format="Briefing Doc", confirm=True)` | 브리핑 문서/스터디 가이드/블로그 포스트 |
| 마인드맵 | `studio_create(notebook_id, artifact_type="mind_map", confirm=True)` | 주제 구조 시각화 |
| 팟캐스트 | `studio_create(notebook_id, artifact_type="audio", audio_format="deep_dive", confirm=True)` | 깊이 있는 대화형 분석 |
| 웹 리서치 | `research_start(notebook_id, query="...", source="web", mode="fast")` | 추가 소스 자동 발견 (Phase 3) |

4. **생성 작업 폴링**: `mcp__notebooklm-mcp__studio_status(notebook_id)` → `completed` 확인
5. 결과 표시
6. 추가 분석 여부 확인 (반복 가능)
7. **다음 단계 안내**: "결과를 파일로 내보내려면 `/research export <notebook-id>` 를 실행하세요"

**기본 분석 시퀀스 (사용자가 "알아서 해" 선택 시):**
```
chat_configure(goal="custom", custom_prompt="리서치 분석가로서 핵심 인사이트를 도출하세요")
notebook_query → "핵심 인사이트 5가지를 구조화하여 요약해주세요"
studio_create(report, report_format="Briefing Doc") → 브리핑 문서 생성
```

**MCP 도구:**
- `mcp__notebooklm-mcp__chat_configure` (선행 설정)
- `mcp__notebooklm-mcp__notebook_query` (대화형 분석)
- `mcp__notebooklm-mcp__studio_create` (콘텐츠 생성)
- `mcp__notebooklm-mcp__studio_status` (진행 폴링)
- `mcp__notebooklm-mcp__research_start` (Phase 3: 추가 소스 발견)
- `mcp__notebooklm-mcp__research_status` (Phase 3: 리서치 폴링)
- `mcp__notebooklm-mcp__research_import` (Phase 3: 발견 소스 가져오기)

### 2.5 export.md (결과 추출)

**역할:** NotebookLM 분석 결과를 로컬 파일(마크다운/JSON)로 추출.

**실행 절차:**
1. 노트북 ID 확인
2. **소스 원문 추출** (선택): `mcp__notebooklm-mcp__source_get_content(source_id)` → 각 소스의 텍스트 내용 (Task #3)
3. **종합 Q&A**: `mcp__notebooklm-mcp__notebook_query(notebook_id, query="모든 소스를 종합하여...")` (Task #3)
4. **아티팩트 목록 조회**: `mcp__notebooklm-mcp__studio_status(notebook_id)`
5. 내보낼 아티팩트 선택 (사용자 확인)
6. **내보내기 실행**:
   - 리포트: `nlm download report <notebook-id> --output ~/research-output/<주제>_report.md`
   - 오디오: `nlm download audio <notebook-id> --output ~/research-output/<주제>_podcast.mp3`
   - 퀴즈: `nlm download quiz <notebook-id> --output ~/research-output/<주제>_quiz.json --format json`
   - 슬라이드: `nlm download slide-deck <notebook-id> --output ~/research-output/<주제>_slides.pptx --format pptx`
7. **Q&A 결과 마크다운 저장**: 직전 analyze/export에서 수행한 query 결과를 정리하여 파일 저장
8. 결과 파일 경로 안내

**출력 디렉토리:** `~/research-output/<주제>/` (주제별 하위 디렉토리, 없으면 `mkdir -p`로 자동 생성)
**Google Docs/Sheets 내보내기:** `--to-docs`, `--to-sheets` 옵션으로 `export_artifact` 사용

**MCP 도구:**
- `mcp__notebooklm-mcp__source_get_content` (소스 원문)
- `mcp__notebooklm-mcp__notebook_query` (종합 분석)
- `mcp__notebooklm-mcp__studio_status` (아티팩트 조회)
- `mcp__notebooklm-mcp__download_artifact` (파일 다운로드)
- `mcp__notebooklm-mcp__export_artifact` (Google Docs/Sheets 내보내기)

### 2.7 run.md (원스톱 파이프라인)

**역할:** search → collect → analyze → export를 하나의 명령으로 순차 실행하는 오케스트레이터.

**실행 절차:**
1. 인자 파싱: `<주제>`, `--auto`, `--preset`, `--top`, `--notebook`, `--lang`
2. 프리셋 6종: default, trend-report, competitor, learning, deep-dive, presentation
3. 대화형 모드(기본): 사용자 확인 2회 (검색 후 영상 선택, 수집 후 분석+내보내기 승인)
4. 자동 모드(`--auto`): 확인 없이 전체 순차 실행 (직접 MCP 호출 시퀀스)
5. 인증 갱신: collect/analyze/export 시작 전 `refresh_auth` 선제 호출
6. 에러 3-tier: Fixable(자동복구) / Degraded(부분진행) / Fatal(중단)
7. 프로그레스 가중치: 10/35/40/15% (검색/수집/분석/내보내기)
8. 완료 요약: 단계별 소요시간 + NLM 웹 URL 표시

**직접 오케스트레이션:** run.md는 각 Step의 MCP 호출을 직접 기술한다. 서브커맨드 .md는 독립 실행 전용(`/research search`, `/research collect` 등 개별 사용 시).

**MCP 도구:** 각 서브커맨드의 MCP 도구 + `mcp__notebooklm-mcp__refresh_auth`

### 2.6 status.md (세션 상태)

**역할:** 현재 리서치 세션의 전체 상태를 한눈에 표시.

**실행 절차:**
1. **로컬 세션 파일 조회**: `~/research-output/research_sessions.jsonl` 읽기
   - 파일 없으면 Quick Start 온보딩 가이드 표시
2. **시스템 정보**: `mcp__notebooklm-mcp__server_info()`로 MCP 서버 버전 표시
3. notebook-id가 있으면 해당 노트북만, 없으면 전체 세션 표시
4. 노트북별 정보 조회:
   - 소스 수: `mcp__notebooklm-mcp__notebook_get(notebook_id)`
   - 아티팩트 상태: `mcp__notebooklm-mcp__studio_status(notebook_id)`
   - 노트북 요약: `mcp__notebooklm-mcp__notebook_describe(notebook_id)` (상세 조회 시)
5. 요약 테이블 출력 (sessions.jsonl 확장 필드: status, updated_at, artifacts 포함):

```markdown
## Research Pipeline Status

| 노트북 | 주제 | 소스 수 | 상태 | 아티팩트 | 최종 업데이트 |
|--------|------|---------|------|---------|-------------|
| abc12345 | AI 트렌드 2026 | 12 | analyzing | report: completed | 2026-03-05 |
| def67890 | 경쟁사 분석 | 5 | collecting | - | 2026-03-04 |
```

**추가 기능:**
- `--clean` 옵션: NOT_FOUND 노트북의 세션 기록 자동 정리

**MCP 도구:**
- `mcp__notebooklm-mcp__server_info` (버전 확인)
- `mcp__notebooklm-mcp__notebook_list`
- `mcp__notebooklm-mcp__notebook_get`
- `mcp__notebooklm-mcp__notebook_describe` (상세 조회)
- `mcp__notebooklm-mcp__studio_status`

---

## 3. MCP 연동 플로우

### 서브커맨드별 MCP 도구 매핑 (30개 도구 중 핵심 사용분)

```
search ──── (MCP 미사용, youtube_search.py 스크립트)
  │
  ▼
collect ─── notebook_list ──→ notebook_create ──→ source_add(wait=true) ──→ notebook_get
  │            (조회)            (없으면 생성)       (URL별 순차 추가)         (확인)
  ▼
analyze ─── chat_configure ──→ notebook_query ──→ studio_create ──→ studio_status
  │         (분석가 역할 설정)    (Q&A 분석)         (리포트/맵 등)    (진행 폴링)
  ▼
export ──── source_get_content ──→ notebook_query ──→ studio_status ──→ download_artifact
  │         (소스 원문 추출)        (종합 분석)         (아티팩트 조회)    (파일 다운로드)
  ▼
status ──── notebook_list ──→ notebook_get ──→ studio_status
            (전체 조회)         (소스 수 확인)    (아티팩트 확인)
```

### MCP vs CLI 선택 기준

| 상황 | 선택 | 이유 |
|------|------|------|
| 노트북/소스 CRUD | MCP 우선 (`mcp__notebooklm-mcp__*`) | 도구 호출이 더 간결, `wait=true` 지원 |
| 다운로드/내보내기 | CLI (`nlm download`) | CLI에 포맷/경로 옵션이 풍부 |
| alias 관리 (Phase 2) | CLI (`nlm alias`) | MCP에 alias 도구 없음 |
| 인증 | MCP `refresh_auth` → CLI `nlm login` | 자동 갱신 시도 후 수동 폴백 |
| 리서치 (소스 발견) | MCP `research_start` + CLI 폴링 | 시작은 MCP, 장시간 폴링은 CLI |
| 설정/프로필 | CLI (`nlm config`, `nlm login switch`) | MCP에 설정 도구 없음 |

### 전체 MCP 도구 카탈로그 (30개, Task #3 매핑)

| 카테고리 | 도구 | 사용 서브커맨드 | Phase |
|----------|------|---------------|-------|
| **인증** | `refresh_auth`, `save_auth_tokens` | 전체 (게이트) | MVP |
| **노트북** | `notebook_list`, `notebook_create`, `notebook_get`, `notebook_describe`, `notebook_query`, `notebook_rename`, `notebook_delete` | collect, analyze, status | MVP |
| **소스** | `source_add`, `source_list_drive`, `source_describe`, `source_get_content`, `source_rename`, `source_sync_drive`, `source_delete` | collect, export | MVP~P2 |
| **채팅** | `chat_configure`, `note` (CRUD) | analyze | MVP |
| **스튜디오** | `studio_create`, `studio_status`, `studio_revise`, `studio_delete`, `download_artifact`, `export_artifact` | analyze, export | P2 |
| **리서치** | `research_start`, `research_status`, `research_import` | analyze (확장) | P3 |
| **공유** | `notebook_share_status`, `notebook_share_public`, `notebook_share_invite` | (미사용) | - |
| **기타** | `server_info` | status (버전 확인) | P2 |

---

## 4. 에러 처리 전략 (Task #3 설계)

### 4.1 인증 만료 (가장 빈번)

```
1차: mcp__notebooklm-mcp__refresh_auth() 자동 시도
2차: 실패 시 → "nlm login 을 실행해주세요" 안내 후 중단
```
- 세션 수명: ~20분. 장시간 analyze/export 작업 시 중간 갱신 필요.
- 서브커맨드 시작 시 `nlm login --check`로 선제 확인.

### 4.2 소스 추가 실패 (collect)

```
1차: source_add(wait=true) 개별 실패 → 해당 URL 건너뛰고 계속
2차: 벌크 추가 전체 실패 → 단건씩 순차 재시도
3차: 특정 URL 반복 실패 → 사용자에게 실패 URL 목록 표시
```
- YouTube URL은 영상이 비공개/삭제된 경우 실패 가능
- 웹 URL은 사이트 차단(robots.txt)으로 실패 가능

### 4.3 할당량 초과 (notebook/source 제한)

```
1차: 노트북당 소스 50개 제한 → 주제별 노트북 분할 제안
2차: 총 노트북 수 제한 → 미사용 노트북 정리 안내
```

### 4.4 생성 실패 (studio_create)

```
1차: studio_status에서 failed 확인 → 소스 수/크기 확인 후 재시도
2차: 재시도 실패 → 대체 artifact_type 제안
```

### 4.5 Rate Limiting

```
source 작업: 2초 간격
studio 생성: 5초 간격
research: 2초 간격
query: 2초 간격
```

---

## 5. 사용 시나리오

상세 시나리오와 명령어 시퀀스는 `references/workflow-examples.md` 참조.

| 시나리오 | 핵심 플로우 | 프리셋 |
|---------|-----------|--------|
| AI 트렌드 리서치 | search → collect → analyze(Q&A+report) → export | `trend-report` |
| 경쟁사 제품 분석 | collect(URL 직접) → analyze(SWOT) → export | `competitor` |
| 기술 학습 자료 | collect → analyze(report+audio) → export | `learning` |
| 원스톱 자동 실행 | `/research run <주제> --auto --preset <name>` | 모든 프리셋 |

---

## 6. 구현 우선순위

### Phase 1-2: 완료

Phase 1 (MVP: SKILL.md, run.md, search.md, collect.md, analyze.md, status.md) 및 Phase 2 (export.md, references/, studio_create 확장) 구현 완료.

### Phase 3: 고급 기능 (현재)

| 순서 | 파일 | 내용 | 난이도 |
|------|------|------|--------|
| 10 | `analyze.md` 확장 | research_start/import (웹/드라이브 소스 발견) | High |
| 11 | `analyze.md` 확장 | quiz, flashcards, slides, video | Medium |
| 12 | `references/workflow-examples.md` | 실전 시나리오 + 에러 대응 사례 | Low |

**Phase 3 완료 기준:**
- [ ] NLM research 기능으로 자동 소스 발견/수집
- [ ] 다양한 콘텐츠 유형 생성 (퀴즈, 슬라이드, 비디오 등)
- [ ] 워크플로우 예시 + 트러블슈팅 문서 완비

---

## 7. 설계 결정 사항

### 7.1 세션 관리 (하이브리드)

- **클라우드**: NotebookLM 노트북 시스템 (주 데이터)
- **로컬 캐시**:
  - `~/research-output/research_sessions.jsonl` — 전체 세션 히스토리 (확장 스키마: status, updated_at, artifacts, preset)
  - `~/research-output/last_session.json` — 마지막 세션 빠른 참조 (analyze/export/status에서 notebook_id 자동 로드)
- 로컬 파일은 NLM API 호출 없이 빠른 status 조회를 위한 캐시 역할

#### last_session.json 스키마

```json
{
  "notebook_id": "string",
  "topic": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "status": "collecting|analyzing|exported",
  "source_count": 0,
  "urls": [],
  "artifacts": [{"type": "report", "status": "completed"}],
  "preset": "default"
}
```

### 7.2 MCP 와일드카드

`allowed-tools`에 `mcp__notebooklm-mcp__*` 와일드카드 사용 (Task #2 제안).
30개 도구를 개별 나열하지 않고 네임스페이스로 일괄 허용.

### 7.3 기존 스킬과의 관계

| 스킬 | 관계 |
|------|------|
| `youtube-search` | research의 search가 래핑. 독립 사용도 유지 |
| `youtube-downloader` | 별개 (영상 다운로드는 리서치 범위 밖) |
| `content-pipeline` | 별개. research 결과가 content-pipeline의 입력이 될 수 있음 (연동 가능) |
| `nlm-skill` | research가 NLM 도구를 내부적으로 사용. nlm-skill은 범용 가이드로 유지 |

### 7.4 content-pipeline 연동 포인트

research의 export 결과물(`~/research-output/*.md`)을 content-pipeline의 `add` 입력으로 사용할 수 있음.
Phase 3 이후 `/research export --to-pipeline` 옵션 검토 가능.

---

## 8. references/ 디렉토리 내용

### 8.1 nlm-commands.md

research에서 사용하는 MCP 도구만 추린 퀵 레퍼런스.
SKILL.md 전체(600줄)를 복사하지 않고, 핵심 파라미터만 정리 (progressive disclosure).

포함할 내용:
- 인증: `refresh_auth`, `nlm login`
- 노트북: `notebook_create`, `notebook_list`, `notebook_get`, `notebook_query` 파라미터
- 소스: `source_add` (source_type별 파라미터, wait 옵션)
- 채팅: `chat_configure` (goal, custom_prompt, response_length)
- 스튜디오: `studio_create` (artifact_type별 옵션), `studio_status`, `download_artifact`
- 리서치: `research_start`, `research_status`, `research_import`
- 에러 코드 + 해결 방법 요약

### 8.2 workflow-examples.md

시나리오별 전체 명령어 시퀀스를 복사-붙여넣기 가능한 형태로 제공.
5장의 시나리오를 포함:
1. 트렌드 리서치 (search → collect → analyze → export)
2. 경쟁사 분석 (URL 직접 수집 → SWOT 분석)
3. 학습 자료 생성 (Study Guide + 팟캐스트)
4. 딥 리서치 (research_start로 소스 자동 발견)
5. 에러 상황 대응 (인증 만료, 소스 실패, Rate limit)

---

## 부록 A: content-pipeline과의 패턴 비교

| 항목 | content-pipeline | research |
|------|-----------------|----------|
| 라우터 | SKILL.md + $ARGUMENTS 파싱 | 동일 |
| 서브커맨드 | status, add, advance, review | search, collect, analyze, export, status |
| 데이터 저장 | jsonl (로컬) | NotebookLM (클라우드) + jsonl (로컬 캐시) |
| 스크립트 | pipeline_utils.py | youtube_search.py (심볼릭 링크) |
| 외부 연동 | 없음 | NotebookLM MCP 30개 도구 + CLI |
| 상태 관리 | 로컬 jsonl 전용 | 하이브리드 (NLM API + 로컬 jsonl) |
| 에러 처리 | 단순 (로컬 I/O) | 복합 (인증, 네트워크, Rate limit, 할당량) |

## 부록 B: MCP 도구 접두사

MCP 도구명 패턴: `mcp__notebooklm-mcp__*`
`allowed-tools`에 동일한 와일드카드 패턴 사용.
