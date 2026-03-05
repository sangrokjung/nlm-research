# Research Run - 원스톱 리서치 파이프라인

> 비유: 도서관 5개 창구(검색, 수집, 분석, 내보내기, 상태)를 따로 돌아다니지 않고, "원스톱 접수 창구"에서 한 번에 처리.

## 사용법

```
/research run <주제> [옵션]
```

| 인자 | 기본값 | 설명 |
|------|--------|------|
| `<주제>` | **필수** | 검색 키워드 |
| `--auto` | false | 사용자 확인 없이 자동 실행 |
| `--preset <name>` | default | 프리셋 선택 (아래 참조) |
| `--top <N>` | 프리셋별 | 상위 N개 영상 선택 |
| `--notebook <id>` | (신규 생성) | 기존 노트북에 이어서 |
| `--lang <code>` | ko | 아티팩트 언어 (BCP-47: ko, en, ja 등) |

## 인자 파싱

`$ARGUMENTS`에서 `run` 이후의 텍스트를 파싱한다.

1. `--auto` 플래그 존재 여부 확인 → `auto_mode` 결정
2. `--preset <name>` 추출 → 없으면 `default`
3. `--top <N>` 추출 → 없으면 프리셋 기본값
4. `--notebook <id>` 추출 → 없으면 신규 생성
5. 나머지 텍스트 → `<주제>` (검색 키워드)
6. `--lang <code>` 추출 → 없으면 `ko`

주제가 비어있으면 에러: "주제를 입력해주세요. 예: `/research run AI 에이전트 트렌드`"

## 프리셋 설정

| 프리셋 | top | chat_configure | 아티팩트 | 출력 |
|--------|-----|----------------|---------|------|
| `default` | 5 | goal="custom", custom_prompt="리서치 분석가로서 핵심 인사이트를 도출하세요" | report | report.md |
| `trend-report` | 5 | goal="custom", custom_prompt="트렌드 분석가로서 시간 순서대로 트렌드 변화를 추적하고, 시장 동향과 미래 전망을 분석하세요. 과거→현재→미래 시계열 관점을 포함하세요", `-d` 기본 활성화 | report | report.md |
| `competitor` | 5 | goal="custom", custom_prompt="경쟁 분석가로서 SWOT 관점에서 분석하세요" | report | report.md |
| `learning` | 3 | goal="learning_guide" | report + audio + quiz | report.md + podcast.mp3 + quiz.json |
| `deep-dive` | 10 | goal="custom", custom_prompt="심층 리서치 분석가로서 모든 각도에서 철저히 분석하세요" + research_start | report | report.md |
| `presentation` | 5 | goal="custom", custom_prompt="프레젠테이션 전문가로서 핵심 포인트를 슬라이드로 구조화하세요" | report + slides | report.md + slides.pptx |

잘못된 프리셋 지정 시 에러: "잘못된 프리셋입니다. 사용 가능: default, trend-report, competitor, learning, deep-dive, presentation"

## 대화형 모드 (기본, --auto 미지정)

각 단계에서 직접 MCP 호출을 실행한다. 사용자 확인은 2회만 수행한다.

### Step 1: 검색 (search)

```
██░░░░░░░░░░░░░░░░░░ 10% [Step 1/4] 검색 (search)
```

1. `python3 ~/.claude/commands/research/scripts/youtube_search.py "<주제>" -n <top> -d --json > ~/research-output/last_search.json` 실행
   - `trend-report` 프리셋: `-d` (최신순) 기본 활성화 (시계열 트렌드 분석을 위해 최신 영상 우선)
2. 검색 결과 JSON을 파싱하여 번호 목록으로 표시:
   ```
   ## YouTube 검색 결과: "<주제>"

   1. [영상 제목] - 채널명 (조회수, 업로드일)
      URL: https://youtube.com/watch?v=...
   2. ...
   ```
3. **사용자 확인 [1/2]**: "수집할 영상 번호를 선택하세요 (예: 1,3,5 또는 all):"
   - 사용자가 번호를 선택하면 해당 영상만 수집 대상으로 결정.
   - `all` 선택 시 상위 `top`개 전체.
   - 취소 시 파이프라인 중단.

### Step 2: 수집 (collect)

```
█████████░░░░░░░░░░░ 45% [Step 2/4] 수집 (collect)
```

**인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 선제 호출.

1. 노트북 확보:
   - `--notebook <id>` 옵션이 있으면 기존 노트북 사용
   - 없으면 `date '+%Y-%m-%d'`로 날짜를 가져온 후:
     `mcp__notebooklm-mcp__notebook_create(title="리서치: <주제> - <날짜>")`
2. 소스 추가 (벌크 → 단건 fallback):
   ```
   mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", urls=[...], wait=true)
   ```
   실패 시 각 URL을 단건으로 추가:
   ```
   mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", url="<URL>", wait=true)
   ```
3. 수집 결과를 사용자에게 보고 (성공/실패 수).
4. `~/research-output/last_session.json` 저장:
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
     "preset": "<preset>"
   }
   ```
5. `~/research-output/research_sessions.jsonl`에 세션 기록 append.
6. **사용자 확인 [2/2]**: "수집 완료. 분석 + 내보내기까지 자동으로 진행할까요? (예/아니오)"
   - 예 → Step 3 + Step 4를 확인 없이 자동 진행
   - 아니오 → 중간 결과 요약 후 중단

### Step 3: 분석 (analyze)

```
█████████████████░░░ 85% [Step 3/4] 분석 (analyze)
```

**인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 선제 호출.

1. `mcp__notebooklm-mcp__chat_configure(notebook_id, goal=<프리셋>, custom_prompt=<프리셋>, response_length="longer")`
2. `mcp__notebooklm-mcp__notebook_query(notebook_id, query=<프리셋별 질문>)`
3. Q&A 결과를 노트로 저장:
   `mcp__notebooklm-mcp__note(notebook_id, action="create", title="<주제> 핵심 인사이트", content=<결과>)`
4. 프리셋별 아티팩트 생성 (프리셋별 자동 분기 섹션 참조):
   `mcp__notebooklm-mcp__studio_create(notebook_id, artifact_type=<프리셋별>, language=<lang>, confirm=true)`
5. `mcp__notebooklm-mcp__studio_status(notebook_id)` 폴링 (5초 간격, 최대 300초)
6. 완료 후 자동으로 Step 4로 진행 (Step 2에서 승인된 경우).

### Step 4: 내보내기 (export)

```
████████████████████ 100% [Step 4/4] 내보내기 (export)
```

**인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 선제 호출.

1. `mkdir -p ~/research-output/<주제>/` (공백은 하이픈 변환)
2. 프리셋에 따라 아티팩트 다운로드:
   `mcp__notebooklm-mcp__download_artifact(notebook_id, artifact_type=<프리셋별>, output_path="~/research-output/<주제>/...")`
3. Q&A 결과를 `~/research-output/<주제>/<주제>_analysis.md`로 저장 (Write 도구).
4. `~/research-output/last_session.json` 업데이트 (status: "exported").
5. 완료 요약 출력.

## 자동 모드 (--auto)

사용자 확인 없이 전체 파이프라인을 순차 실행한다. 프리셋 기본값을 적용한다.

### 자동 실행 시퀀스

1. **검색**: `python3 ~/.claude/commands/research/scripts/youtube_search.py "<주제>" -n <top> -d --json` 실행 → 상위 `top`개 URL 추출
2. **인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 호출
3. **수집**:
   - `mcp__notebooklm-mcp__notebook_create(title="리서치: <주제> - <날짜>")`
   - `mcp__notebooklm-mcp__source_add(notebook_id, source_type="url", urls=[...], wait=true)`
   - `~/research-output/last_session.json` 저장
   - `~/research-output/research_sessions.jsonl`에 세션 기록
4. **인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 호출
5. **분석**:
   - `mcp__notebooklm-mcp__chat_configure(notebook_id, goal=<프리셋>, custom_prompt=<프리셋>)`
   - `mcp__notebooklm-mcp__notebook_query(notebook_id, query=<프리셋별 질문>)`
   - `mcp__notebooklm-mcp__studio_create(notebook_id, artifact_type=<프리셋별>, language=<lang>, confirm=true)`
   - `mcp__notebooklm-mcp__studio_status(notebook_id)` 폴링 (5초 간격, 최대 300초)
   - Q&A 결과를 `mcp__notebooklm-mcp__note(notebook_id, action="create", title="<주제> 핵심 인사이트", content=<결과>)`로 저장
6. **인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 호출
7. **내보내기**:
   - `mkdir -p ~/research-output/<주제>/`
   - `mcp__notebooklm-mcp__download_artifact(notebook_id, artifact_type=<프리셋별>, output_path="~/research-output/<주제>/...")`
   - Q&A 결과를 `~/research-output/<주제>/<주제>_analysis.md`로 저장
   - `~/research-output/last_session.json` 업데이트 (status: "exported")

### 프리셋별 자동 분기

**default / competitor:**
```
chat_configure(goal="custom", custom_prompt=<프리셋별>)
→ notebook_query("핵심 인사이트 5가지를 구조화하여 요약해주세요")
→ studio_create(artifact_type="report", confirm=true)
→ studio_status 폴링
→ download_artifact(artifact_type="report")
```

**trend-report:**
```
chat_configure(goal="custom", custom_prompt="트렌드 분석가로서 시간 순서대로 트렌드 변화를 추적하고...")
→ notebook_query("이 주제의 트렌드를 시계열로 분석하고, 과거 동향/현재 상태/미래 전망을 구조화해주세요")
→ studio_create(artifact_type="report", confirm=true)
→ studio_status 폴링
→ download_artifact(artifact_type="report")
```
검색 시 `-d` (최신순) 기본 활성화: 시간 흐름에 따른 트렌드 변화 포착.

**learning:**
```
chat_configure(goal="learning_guide")
→ notebook_query("이 주제의 핵심 개념을 학습 순서대로 정리해주세요")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="audio", confirm=true)
→ studio_create(artifact_type="quiz", question_count=5, confirm=true)
→ studio_status 폴링 (report + audio + quiz)
→ download_artifact(artifact_type="report")
→ download_artifact(artifact_type="audio")
→ download_artifact(artifact_type="quiz", output_format="json")
```

**presentation:**
```
chat_configure(goal="custom", custom_prompt="프레젠테이션 전문가로서...")
→ notebook_query("핵심 포인트를 슬라이드 구조로 정리해주세요")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="slides", slide_format="detailed_deck", confirm=true)
→ studio_status 폴링 (report + slides)
→ download_artifact(artifact_type="report")
→ download_artifact(artifact_type="slides", slide_deck_format="pptx")
```

**deep-dive:**
```
chat_configure(goal="custom", custom_prompt="심층 리서치 분석가로서...")
→ research_start(notebook_id, query=<주제>, source="web", mode="fast")
→ research_status 폴링
→ research_import(notebook_id, task_id=..., source_indices=전체)
→ notebook_query("모든 소스를 종합하여 심층 분석해주세요")
→ studio_create(artifact_type="report", confirm=true)
→ studio_status 폴링
→ download_artifact(artifact_type="report")
```

## 에러 처리 (3-tier)

**우선순위**: run.md의 3-tier 에러 처리가 최상위 규칙이다. 서브커맨드(.md) 파일의 에러 처리는 독립 실행(`/research analyze` 등) 시에만 적용된다.

### Tier 1: Fixable (자동 복구)

| 에러 | 대응 |
|------|------|
| AUTH_EXPIRED | `mcp__notebooklm-mcp__refresh_auth()` 호출하여 자동 갱신 |
| SOURCE_FAILED (개별) | 해당 URL 건너뛰고 다음 URL 진행, 실패 목록 기록 |
| RATE_LIMITED | 5초 대기 후 재시도 (최대 3회) |

### Tier 2: Degraded (부분 진행)

| 에러 | 대응 |
|------|------|
| 수집 부분 실패 | 성공한 소스만으로 분석 진행. 실패 건수 보고 |
| STUDIO_FAILED | 해당 아티팩트 생성 건너뛰고 다음 진행. Q&A 결과는 유지 |
| research_start 실패 | deep-dive 프리셋에서 웹 리서치 건너뛰고 기존 소스만으로 분석 |

### Tier 3: Fatal (중단)

| 에러 | 대응 |
|------|------|
| 인증 완전 실패 | refresh_auth 실패 + nlm login 안내 후 중단 |
| 수집 0건 | "소스를 수집하지 못했습니다. 검색 키워드를 변경해보세요." 중단 |
| 노트북 생성 실패 | NotebookLM 서비스 상태 확인 안내 후 중단 |

## 프로그레스 표시

각 단계 전환 시 프로그레스 바를 출력한다 (가중치 반영):

```
██░░░░░░░░░░░░░░░░░░ 10% [Step 1/4] 검색 (search)
█████████░░░░░░░░░░░ 45% [Step 2/4] 수집 (collect)
█████████████████░░░ 85% [Step 3/4] 분석 (analyze)
████████████████████ 100% [Step 4/4] 내보내기 (export)
```

자동 모드에서도 동일한 가중치의 프로그레스 바를 출력한다.

## 완료 요약

파이프라인 완료 시 ASCII 박스로 결과를 요약한다. 각 단계의 시작/종료 시각을 기록하여 소요시간(초)을 계산한다:

```
┌─────────────────────────────────────────────────┐
│  Research Pipeline Complete                      │
├──────────┬────────┬──────────────────────────────┤
│ Step     │ Status │ Detail                       │
├──────────┼────────┼──────────────────────────────┤
│ Search   │ DONE   │ 10개 검색 (12s)               │
│ Collect  │ DONE   │ 5개 수집 (45s)                │
│ Analyze  │ DONE   │ Q&A + report (120s)           │
│ Export   │ DONE   │ ~/research-output/<주제>/ (8s) │
├──────────┴────────┴──────────────────────────────┤
│ Total: 185s                                       │
│ NLM: https://notebooklm.google.com/notebook/<id> │
│ Output Files:                                    │
│  - ~/research-output/<주제>_report.md            │
│  - ~/research-output/<주제>_analysis.md          │
└─────────────────────────────────────────────────┘
```

Tier 2 에러가 있었던 경우 실패 항목도 포함:

```
│ Warnings:                                        │
│  - 2개 URL 수집 실패 (건너뜀)                      │
│  - audio 생성 실패 (건너뜀)                        │
```

## 오케스트레이션 구조

**run.md = 직접 오케스트레이션** (각 Step의 MCP 호출을 직접 기술). 서브커맨드 .md = 독립 실행 전용 (`/research search`, `/research collect` 등 개별 사용 시).

## 주의사항

- MCP 도구 접두사: `mcp__notebooklm-mcp__` (하이픈 포함)
- 날짜 계산은 반드시 `date` 명령어 사용 (암산 금지)
- 인증 갱신은 collect/analyze/export 각 단계 시작 전 선제 호출
- 출력 디렉토리: `~/research-output/` (없으면 `mkdir -p`로 자동 생성)
- 주제명에 공백이 있으면 하이픈으로 변환하여 파일명에 사용
- `--auto` 모드에서도 에러 3-tier 규칙은 동일하게 적용
- deep-dive 프리셋의 research_start는 시간이 오래 걸릴 수 있음 (1-3분)
