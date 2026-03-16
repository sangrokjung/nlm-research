# Research Pipeline Rules

## MCP 도구 접두사
- NotebookLM MCP: `mcp__notebooklm-mcp__` (하이픈 포함)

## 인증 갱신
- collect/analyze/export 각 단계 시작 전 `refresh_auth()` 선제 호출
- 인증 실패 시 `nlm login` 안내

## 에러 처리 3-tier
- Tier 1 (Fixable): AUTH_EXPIRED → refresh_auth, SOURCE_FAILED → 건너뛰기, RATE_LIMITED → 5초 대기 재시도
- Tier 2 (Degraded): 부분 실패 → 성공 건만으로 진행, 실패 보고
- Tier 3 (Fatal): 인증 완전 실패, 수집 0건 → 중단 + 안내

## 날짜 계산
- 날짜/시간 암산 금지. `date` 명령어 사용

## 출력 경로
- `~/research-output/<주제>/` (공백은 하이픈 변환)
- `mkdir -p`로 자동 생성
