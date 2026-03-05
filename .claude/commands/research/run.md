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

## 인자 파싱

`$ARGUMENTS`에서 `run` 이후의 텍스트를 파싱한다.

1. `--auto` 플래그 존재 여부 확인 → `auto_mode` 결정
2. `--preset <name>` 추출 → 없으면 `default`
3. `--top <N>` 추출 → 없으면 프리셋 기본값
4. `--notebook <id>` 추출 → 없으면 신규 생성
5. 나머지 텍스트 → `<주제>` (검색 키워드)

주제가 비어있으면 에러: "주제를 입력해주세요. 예: `/research run AI 에이전트 트렌드`"

## 프리셋 설정

| 프리셋 | top | chat_configure | 아티팩트 | 출력 |
|--------|-----|----------------|---------|------|
| `default` | 5 | goal="custom", custom_prompt="리서치 분석가로서 핵심 인사이트를 도출하세요" | report | report.md |
| `trend-report` | 5 | goal="custom", custom_prompt="트렌드 분석가로서 시장 동향과 미래 전망을 분석하세요" | report | report.md |
| `competitor` | 5 | goal="custom", custom_prompt="경쟁 분석가로서 SWOT 관점에서 분석하세요" | report | report.md |
| `learning` | 3 | goal="learning_guide" | report + audio | report.md + podcast.mp3 |
| `deep-dive` | 10 | goal="custom", custom_prompt="심층 리서치 분석가로서 모든 각도에서 철저히 분석하세요" + research_start | report | report.md |

잘못된 프리셋 지정 시 에러: "잘못된 프리셋입니다. 사용 가능: default, trend-report, competitor, learning, deep-dive"

## 인증 확인

파이프라인 시작 전 인증을 확인한다:

```bash
nlm login --check
```

- 실패 시: "NotebookLM 인증이 필요합니다. `nlm login`을 실행해주세요." 안내 후 중단.

## 대화형 모드 (기본, --auto 미지정)

각 단계 사이에 사용자 확인을 받으며 진행한다. 각 서브커맨드 .md 파일의 지침을 따르되, notebook_id 등 데이터를 자동으로 전달한다.

### Step 1: 검색 (search)

```
████░░░░░░░░░░░░░░░░ 25% [Step 1/4] 검색 (search)
```

1. 이 디렉토리의 `search.md`를 읽고 지침을 따른다.
2. 주제를 키워드로 사용하여 검색 실행.
3. 옵션: `-n`은 프리셋의 `top` 값 사용, `-d` (최신순) 활성화.
4. 검색 결과를 사용자에게 표시한다.
5. **사용자 확인**: "수집할 영상 번호를 선택하세요 (예: 1,3,5 또는 all):"
   - 사용자가 번호를 선택하면 해당 영상만 수집 대상으로 결정.
   - `all` 선택 시 상위 `top`개 전체.
   - 취소 시 파이프라인 중단.

### Step 2: 수집 (collect)

```
████████░░░░░░░░░░░░ 50% [Step 2/4] 수집 (collect)
```

**인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 선제 호출.

1. 이 디렉토리의 `collect.md`를 읽고 지침을 따른다.
2. Step 1에서 선택된 URL 목록을 전달한다.
3. `--notebook <id>` 옵션이 있으면 기존 노트북 사용, 없으면 새로 생성한다.
4. 수집 완료 후 notebook_id를 저장한다.
5. **사용자 확인**: "수집 완료. 분석을 진행할까요? (예/아니오)"
   - 아니오 시 중간 결과 요약 후 중단.

### Step 3: 분석 (analyze)

```
████████████░░░░░░░░ 75% [Step 3/4] 분석 (analyze)
```

**인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 선제 호출.

1. 이 디렉토리의 `analyze.md`를 읽고 지침을 따른다.
2. 프리셋의 `chat_configure` 설정을 적용한다.
3. 프리셋별 분석 실행:
   - `default`, `trend-report`, `competitor`: Q&A 분석 + report 생성
   - `learning`: Q&A 분석 + report + audio 생성
   - `deep-dive`: research_start 실행 후 Q&A 분석 + report 생성
4. studio_create 후 studio_status로 완료까지 폴링한다.
5. **사용자 확인**: "분석 완료. 내보내기를 진행할까요? (예/아니오)"
   - 아니오 시 중간 결과 요약 후 중단.

### Step 4: 내보내기 (export)

```
████████████████████ 100% [Step 4/4] 내보내기 (export)
```

**인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 선제 호출.

1. 이 디렉토리의 `export.md`를 읽고 지침을 따른다.
2. notebook_id를 전달한다.
3. 프리셋에 따라 내보낼 아티팩트를 자동 선택한다:
   - report 프리셋: report.md + analysis.md
   - `learning` 프리셋: report.md + podcast.mp3 + analysis.md
4. 파일 저장 후 완료 요약을 출력한다.

## 자동 모드 (--auto)

사용자 확인 없이 전체 파이프라인을 순차 실행한다. 프리셋 기본값을 적용한다.

### 자동 실행 시퀀스

1. **검색**: `search.md` 지침에 따라 검색 → 상위 `top`개 자동 선택
2. **인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 호출
3. **수집**: `collect.md` 지침에 따라 노트북 생성 + 소스 추가
4. **인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 호출
5. **분석**: `analyze.md` 지침에 따라 프리셋 설정 적용 + 분석 실행
6. **인증 갱신**: `mcp__notebooklm-mcp__refresh_auth()` 호출
7. **내보내기**: `export.md` 지침에 따라 아티팩트 다운로드

### 프리셋별 자동 분기

**default / trend-report / competitor:**
```
chat_configure(goal="custom", custom_prompt=<프리셋별>)
→ notebook_query("핵심 인사이트 5가지를 구조화하여 요약해주세요")
→ studio_create(artifact_type="report", confirm=true)
→ studio_status 폴링
→ download_artifact(artifact_type="report")
```

**learning:**
```
chat_configure(goal="learning_guide")
→ notebook_query("이 주제의 핵심 개념을 학습 순서대로 정리해주세요")
→ studio_create(artifact_type="report", confirm=true)
→ studio_create(artifact_type="audio", confirm=true)
→ studio_status 폴링 (report + audio)
→ download_artifact(artifact_type="report")
→ download_artifact(artifact_type="audio")
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

각 단계 전환 시 프로그레스 바를 출력한다:

```
████░░░░░░░░░░░░░░░░ 25% [Step 1/4] 검색 (search)
████████░░░░░░░░░░░░ 50% [Step 2/4] 수집 (collect)
████████████░░░░░░░░ 75% [Step 3/4] 분석 (analyze)
████████████████████ 100% [Step 4/4] 내보내기 (export)
```

## 완료 요약

파이프라인 완료 시 ASCII 박스로 결과를 요약한다:

```
┌─────────────────────────────────────────────────┐
│  Research Pipeline Complete                      │
├──────────┬────────┬──────────────────────────────┤
│ Step     │ Status │ Detail                       │
├──────────┼────────┼──────────────────────────────┤
│ Search   │ DONE   │ 10개 검색                     │
│ Collect  │ DONE   │ 5개 수집 (notebook: abc123)   │
│ Analyze  │ DONE   │ Q&A + report                 │
│ Export   │ DONE   │ ~/research-output/<주제>_*    │
├──────────┴────────┴──────────────────────────────┤
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

## 위임 구조

**run.md는 오케스트레이터이다.** 실제 로직은 각 서브커맨드 .md에 위임한다.

- 검색 로직 → `search.md` 읽고 따른다
- 수집 로직 → `collect.md` 읽고 따른다
- 분석 로직 → `analyze.md` 읽고 따른다
- 내보내기 로직 → `export.md` 읽고 따른다

**로직 중복 금지**: run.md에 search/collect/analyze/export의 세부 로직을 복제하지 않는다. 프리셋 설정과 데이터 전달만 담당한다.

## 주의사항

- MCP 도구 접두사: `mcp__notebooklm-mcp__` (하이픈 포함)
- 날짜 계산은 반드시 `date` 명령어 사용 (암산 금지)
- 인증 갱신은 collect/analyze/export 각 단계 시작 전 선제 호출
- 출력 디렉토리: `~/research-output/` (없으면 `mkdir -p`로 자동 생성)
- 주제명에 공백이 있으면 하이픈으로 변환하여 파일명에 사용
- `--auto` 모드에서도 에러 3-tier 규칙은 동일하게 적용
- deep-dive 프리셋의 research_start는 시간이 오래 걸릴 수 있음 (1-3분)
