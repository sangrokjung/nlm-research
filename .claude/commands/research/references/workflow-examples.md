# Research Workflow Examples

> 5가지 실전 시나리오별 명령어 시퀀스. 복사-붙여넣기 가능.
> MCP 접두사: `mcp__notebooklm-mcp__`

---

## 시나리오 1: 트렌드 리서치

사업 기획을 위해 최신 트렌드를 조사하고 요약 리포트를 생성.

### 전체 플로우: search -> collect -> analyze -> export

```bash
# 1. YouTube 검색
/research search AI agent 2026 trends -n 15
```

```
# 2. 검색 결과를 NotebookLM에 수집
/research collect
# → 번호 선택 (예: 1, 3, 5, 8, 12)
# → 자동: notebook_create + source_add x5
```

```
# 3. AI 분석
/research analyze <notebook-id>
# → chat_configure(goal="custom", custom_prompt="리서치 분석가로서...")
# → notebook_query("핵심 인사이트 5가지를 구조화하여 요약")
# → studio_create(artifact_type="report")
```

```
# 4. 결과 내보내기
/research export <notebook-id>
# → ~/research-output/<주제>_analysis.md
# → ~/research-output/<주제>_report.md
```

### MCP 호출 시퀀스 (수동 실행 시)

```
# 인증 확인
nlm login --check

# 노트북 생성
mcp__notebooklm-mcp__notebook_create(title="리서치: AI Agent Trends - 2026-03-05")

# 소스 추가 (URL별 순차)
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="https://youtube.com/watch?v=xxx", wait=true)
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="https://youtube.com/watch?v=yyy", wait=true)

# 분석 설정
mcp__notebooklm-mcp__chat_configure(notebook_id=<id>, goal="custom", custom_prompt="리서치 분석가로서 핵심 인사이트를 도출하세요")

# Q&A
mcp__notebooklm-mcp__notebook_query(notebook_id=<id>, query="모든 소스를 종합하여 핵심 발견, 트렌드, 실행 가능한 인사이트를 정리해주세요")

# 리포트 생성
mcp__notebooklm-mcp__studio_create(notebook_id=<id>, artifact_type="report", confirm=true)
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)  # 완료까지 폴링

# 다운로드
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="report", output_path="~/research-output/ai-trends_report.md")
```

---

## 시나리오 2: 경쟁사 분석

경쟁사 제품 리뷰 영상을 수집하고 SWOT 분석.

### 전체 플로우

```bash
# 1. 검색 (선택)
/research search "competitor-X product review" -n 10

# 2. URL 직접 지정하여 수집
/research collect https://youtube.com/watch?v=abc https://youtube.com/watch?v=def https://example.com/review-article

# 3. SWOT 관점 분석
/research analyze <notebook-id>
# → SWOT 프레임워크 분석 선택
```

### MCP 호출 시퀀스

```
# 채팅 설정 (SWOT 분석가)
mcp__notebooklm-mcp__chat_configure(
  notebook_id=<id>,
  goal="custom",
  custom_prompt="경쟁 분석가로서 SWOT 프레임워크를 사용하여 분석하세요. 각 항목에 구체적 근거를 포함하세요.",
  response_length="longer"
)

# SWOT 분석 질문
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="이 제품의 강점(Strengths), 약점(Weaknesses), 기회(Opportunities), 위협(Threats)을 SWOT 프레임워크로 분석해주세요"
)

# 후속 질문 (conversation_id 재사용)
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="우리 제품과 비교하여 차별화 포인트는 무엇인가요?",
  conversation_id=<prev_conversation_id>
)
```

---

## 시나리오 3: 학습 자료 생성

기술 주제에 대한 학습 자료 (Study Guide + 팟캐스트) 자동 생성.

### 전체 플로우

```bash
# 1. URL을 이미 알고 있는 경우 바로 수집
/research collect https://youtube.com/watch?v=tutorial1 https://youtube.com/watch?v=tutorial2

# 2. 다양한 학습 자료 생성
/research analyze <notebook-id>
# → Study Guide 선택
# → 팟캐스트 생성 선택

# 3. 상태 확인
/research status

# 4. 완료 후 내보내기
/research export <notebook-id>
# → report.md + podcast.mp3 다운로드
```

### MCP 호출 시퀀스

```
# 학습 목적 설정
mcp__notebooklm-mcp__chat_configure(
  notebook_id=<id>,
  goal="learning_guide",
  response_length="longer"
)

# Study Guide 생성
mcp__notebooklm-mcp__studio_create(
  notebook_id=<id>,
  artifact_type="report",
  confirm=true
)

# 팟캐스트 생성 (병렬 가능)
mcp__notebooklm-mcp__studio_create(
  notebook_id=<id>,
  artifact_type="audio",
  confirm=true
)

# 완료 폴링 (5초 간격)
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)

# 다운로드
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="report", output_path="~/research-output/study-guide_report.md")
mcp__notebooklm-mcp__download_artifact(notebook_id=<id>, artifact_type="audio", output_path="~/research-output/study-guide_podcast.mp3")
```

---

## 시나리오 4: 딥 리서치

research_start로 웹에서 추가 소스를 자동 발견하여 깊이 있는 분석.

### 전체 플로우

```bash
# 1. 기본 소스 수집
/research collect https://youtube.com/watch?v=base-source

# 2. 딥 리서치 모드로 분석
/research analyze <notebook-id>
# → 딥 리서치 선택
# → 자동 소스 발견 + 가져오기
```

### MCP 호출 시퀀스

```
# 웹 리서치 시작
mcp__notebooklm-mcp__research_start(
  notebook_id=<id>,
  query="AI agent framework 비교 분석 2026",
  source="web",
  mode="deep"
)
# 반환: { task_id: "..." }

# 리서치 진행 상태 확인 (폴링)
mcp__notebooklm-mcp__research_status(
  notebook_id=<id>,
  task_id=<task_id>
)
# 반환: { status: "completed", results: [{ title, url, snippet }, ...] }

# 발견된 소스 중 유용한 것 가져오기
mcp__notebooklm-mcp__research_import(
  notebook_id=<id>,
  task_id=<task_id>,
  source_indices=[0, 2, 4]
)

# 이후 일반 분석 진행
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="기존 소스와 새로 발견된 소스를 종합하여 핵심 인사이트를 정리해주세요"
)
```

---

## 시나리오 5: 에러 대응

### 인증 만료

가장 빈번한 에러. 토큰 수명 약 20분.

```
# 1차: 자동 갱신 시도
mcp__notebooklm-mcp__refresh_auth()

# 2차: 실패 시 CLI 재로그인
nlm login

# 3차: CLI도 실패 시 수동 Cookie 저장
mcp__notebooklm-mcp__save_auth_tokens(
  cookies="..."
)
```

장시간 작업(analyze, export) 시 중간에 인증 만료 가능. 서브커맨드 시작 시 `nlm login --check`로 선제 확인.

### 소스 추가 실패

```
# 에러 원인별 대응

# 비공개/삭제된 YouTube 영상
# → 해당 URL 건너뛰고 다음 URL 계속 진행

# 벌크 추가 전체 실패
# → 단건씩 순차 재시도
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="<URL1>", wait=true)
mcp__notebooklm-mcp__source_add(notebook_id=<id>, source_type="url", url="<URL2>", wait=true)

# 노트북당 소스 50개 초과
# → 주제별 노트북 분할
mcp__notebooklm-mcp__notebook_create(title="리서치: <주제> Part 2")
```

### Rate Limit

```
# 권장 간격
# source_add: 2초 간격
# studio_create: 5초 간격
# research_*: 2초 간격
# notebook_query: 2초 간격

# Rate limit 에러 발생 시 5초 대기 후 재시도
```

### 스튜디오 생성 실패

```
# 1차: studio_status에서 failed 확인
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)

# 2차: 소스 수/크기 확인
mcp__notebooklm-mcp__notebook_get(notebook_id=<id>)

# 3차: 재시도
mcp__notebooklm-mcp__studio_create(notebook_id=<id>, artifact_type="report", confirm=true)

# 4차: 재시도 실패 시 대체 유형 시도
mcp__notebooklm-mcp__studio_create(notebook_id=<id>, artifact_type="mind_map", confirm=true)
```

### 네트워크 에러

```
# 연결 확인 후 동일 명령 재시도
# MCP 서버 상태 확인
mcp__notebooklm-mcp__server_info()
```
