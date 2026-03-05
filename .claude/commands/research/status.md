# Research Status - 세션 현황 조회

리서치 세션들의 현재 상태를 조회합니다.

## 사용법
- `/research status` — 전체 세션 현황
- `/research status <notebook-id>` — 특정 노트북 상세 조회

## 실행 절차

### 1단계: 세션 파일 확인

`~/research-output/research_sessions.jsonl` 파일을 읽습니다.

- 파일이 없거나 비어있으면:
  ```
  아직 리서치 세션이 없습니다. `/research search <주제>` 로 시작하세요.
  ```
  안내 후 종료합니다.

### 2단계: 대상 결정

$ARGUMENTS에서 "status" 이후에 notebook-id가 있는지 확인합니다.
- notebook-id가 있으면: 해당 노트북만 조회
- 없으면: JSONL 파일의 전체 세션을 조회

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

| 노트북 | 주제 | 현재 소스 수 | 아티팩트 | 생성일 |
|--------|------|---------|---------|--------|
| <id 앞 8자리..> | <주제> | <N>개 | <상태> | <날짜> |
```

특정 노트북 조회 시 상세 정보도 포함:
```
## 노트북 상세: <주제>

- **노트북 ID**: <full id>
- **생성일**: <날짜>
- **소스 수**: <N>개
- **아티팩트 상태**: <상태 상세>
- **수집된 URL**:
  1. <url1>
  2. <url2>
```

### 5단계: 다음 단계 안내

현재 상태에 따라 적절한 다음 단계를 안내합니다:
- 소스만 있고 분석 전: "`/research analyze <notebook-id>` 를 실행하세요"
- 분석 완료: "`/research export <notebook-id>` 로 결과를 내보내세요"

## 주의사항

- MCP 도구 접두사: `mcp__notebooklm-mcp__` (하이픈 포함)
- JSONL 파일의 각 줄은 독립적인 JSON 객체
- 날짜 표시는 사람이 읽기 쉬운 형식으로 (YYYY-MM-DD)
- 노트북 ID가 길면 테이블에서는 앞 8자리만 표시
