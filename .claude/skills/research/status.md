# Research Status - 세션 현황 조회

리서치 세션들의 현재 상태를 조회합니다.

## 사용법
- `/research status` — 전체 세션 현황
- `/research status <notebook-id>` — 특정 노트북 상세 조회
- `/research status --clean` — 삭제된 노트북의 세션 기록 정리

## 실행 절차

### 1단계: 세션 파일 확인

`~/research-output/research_sessions.jsonl` 파일을 읽습니다.

- 파일이 없거나 비어있으면:
  ```
  ## Research Pipeline에 오신 것을 환영합니다!

  아직 리서치 세션이 없습니다.

  ### 사전 준비 (최초 1회)
  1. Deno 설치: `curl -fsSL https://deno.land/install.sh | sh`
  2. nlm CLI 설치: `deno install -gArf jsr:@nicholasgriffintn/notebooklm-cli`
  3. 인증: `nlm login` (브라우저에서 Google 계정 로그인)
  4. yt-dlp 설치: `pip install yt-dlp` (YouTube 검색용)

  ### Quick Start
  /research run AI 에이전트 트렌드 --auto      # 원스톱 자동 파이프라인
  /research run AI 에이전트 --preset learning   # 학습 자료 생성
  /research run AI 에이전트 --preset presentation  # 프레젠테이션 자료
  /research search AI 에이전트                  # 검색만 먼저

  ### 프리셋 안내
  | 프리셋 | 설명 | 아티팩트 |
  |--------|------|---------|
  | default | 핵심 인사이트 리포트 | report |
  | trend-report | 트렌드/미래 전망 | report |
  | competitor | SWOT 경쟁 분석 | report |
  | learning | 학습 가이드 | report + audio |
  | deep-dive | 심층 분석 (웹 리서치 포함) | report |
  | presentation | 프레젠테이션 자료 | report + slides |
  ```
  안내 후 종료합니다.

### 2단계: 대상 결정

$ARGUMENTS에서 "status" 이후에 notebook-id가 있는지 확인합니다.
- notebook-id가 있으면: 해당 노트북만 조회
- 없으면: JSONL 파일의 전체 세션을 조회

### 2.5단계: 시스템 정보

`mcp__notebooklm-mcp__server_info()`를 호출하여 MCP 서버 버전을 표시한다:
```
NLM MCP 서버: v<버전>
```

특정 노트북 상세 조회 시 `mcp__notebooklm-mcp__notebook_describe(notebook_id=...)`를 호출하여 AI 요약을 가져온다. 이 결과는 4단계의 상세 정보에서 "AI 요약" 섹션으로 표시한다.

### 3단계: 노트북 정보 조회

각 대상 노트북에 대해 다음 MCP 호출을 실행합니다:

1. `mcp__notebooklm-mcp__notebook_get(notebook_id=...)` — 노트북 상세 정보 (소스 수 등)
2. `mcp__notebooklm-mcp__studio_status(notebook_id=...)` — 아티팩트 상태 (있으면)

여러 노트북이면 병렬로 조회합니다.

에러가 발생한 노트북(MCP 조회 실패)은 다음 두 경우로 구분합니다:
- API 일시 오류: "조회 실패 - 잠시 후 다시 시도하세요"
- 노트북 삭제됨 (NOT_FOUND): "이 노트북은 NotebookLM에서 삭제되었습니다"

### 4단계: 요약 테이블 출력

전체 조회 시:
```
## 리서치 세션 현황

| 노트북 | 주제 | 소스 수 | 상태 | 아티팩트 | 최종 업데이트 |
|--------|------|---------|------|---------|-------------|
| <id 앞 8자리..> | <주제> | <N>개 | <status> | <artifacts 요약> | <updated_at> |
```

특정 노트북 조회 시 상세 정보도 포함:
```
## 노트북 상세: <주제>

### AI 요약
> <notebook_describe 결과를 인용 블록으로 표시>

- **노트북 ID**: <full id>
- **생성일**: <날짜>
- **상태**: <status> (collecting/analyzing/exported)
- **프리셋**: <preset>
- **소스 수**: <N>개
- **아티팩트**: <artifacts 배열 상세>
- **아티팩트 상태**: <상태 상세>
- **수집된 URL**:
  1. <url1>
  2. <url2>
```

### 5단계: 다음 단계 안내

현재 상태에 따라 적절한 다음 단계를 안내합니다:
- 소스만 있고 분석 전: "`/research analyze <notebook-id>` 를 실행하세요"
- 분석 완료: "`/research export <notebook-id>` 로 결과를 내보내세요"

## --clean 옵션

`--clean` 지정 시, sessions.jsonl의 각 세션에 대해 `mcp__notebooklm-mcp__notebook_get(notebook_id)`를 호출한다.
- NOT_FOUND 에러 반환 시: 해당 줄을 JSONL에서 제거한다.
- 성공 시: 유지한다.

정리 결과를 보고한다:
```
N개 세션 중 M개 삭제됨 (노트북이 NotebookLM에서 제거됨)
```

## 주의사항

- MCP 도구 접두사: `mcp__notebooklm-mcp__` (하이픈 포함)
- JSONL 파일의 각 줄은 독립적인 JSON 객체
- 날짜 표시는 사람이 읽기 쉬운 형식으로 (YYYY-MM-DD)
- 노트북 ID가 길면 테이블에서는 앞 8자리만 표시
