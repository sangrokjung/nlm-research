# NLM Research

YouTube 검색 → NotebookLM AI 분석 → 팟캐스트/슬라이드/리포트 자동 생성 리서치 파이프라인.

## 필수 도구

| 도구 | 설치 | 용도 |
|------|------|------|
| Claude Code | [공식 가이드](https://docs.anthropic.com/claude-code) | AI 비서 |
| nlm | `uv tool install notebooklm-mcp-cli` | NotebookLM CLI + MCP |
| yt-dlp | `pip install yt-dlp` | YouTube 검색 |

## MCP 서버 설정

NotebookLM의 AI 팟캐스트, 슬라이드, 리포트 생성 기능을 사용하려면 MCP 서버 연결이 필요합니다.

이 레포에는 프로젝트 스코프 MCP 설정(`.mcp.json`)이 포함되어 있어, 레포 디렉토리에서 `claude`를 실행하면 자동으로 `notebooklm-mcp` 서버를 사용할 수 있습니다 (첫 실행 시 신뢰 확인 프롬프트). 추가로 `.claude/settings.json`에 `mcp__notebooklm-mcp__*` 권한이 사전 허용되어 있습니다.

수동으로 등록하려면:

```bash
claude mcp add -s project notebooklm-mcp -- nlm mcp
```

## 핵심 명령어

```bash
/research run AI 에이전트 트렌드 --auto     # 원스톱 자동 리서치
/research run React 19 --preset learning    # 학습 모드 (팟캐스트+퀴즈)
/research run 시장 전망 --preset presentation # 발표 모드 (슬라이드)
/research search AI agents                   # YouTube 검색만
/research status                             # 현재 세션 확인
```

## 인증

```bash
nlm login        # Google 계정 연결 (최초 1회)
nlm login --check # 인증 상태 확인
```

## 출력 디렉토리

`~/research-output/<주제>/` 에 자동 저장
