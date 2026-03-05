---
name: research
description: YouTube 검색 -> NotebookLM 수집/분석 -> 결과 추출까지 리서치 전체 파이프라인. 키워드 기반 영상 검색, 소스 수집, AI 분석, 결과 내보내기를 하나의 워크플로우로 통합.
argument-hint: <run|search|collect|analyze|export|status> [options]
allowed-tools: Read, Write, Edit, Bash(python3:*), Bash(nlm:*), Bash(date:*), Bash(mkdir:*), Bash(ln:*), mcp__notebooklm-mcp__*
user-invocable: true
---

# Research Pipeline Router

> 비유: 도서관 사서 데스크. 연구자(사용자)가 요청(커맨드)을 하면, 해당 업무 파트(서브커맨드)로 안내한다.

$ARGUMENTS의 첫 번째 단어를 파싱하여 적절한 서브커맨드로 라우팅한다.

## 라우팅 규칙

1. 첫 단어가 `run`인 경우:
   - 인증 게이트를 통과한 후, 이 디렉토리의 `run.md`를 읽고 지침을 따른다.
   - `run` 이후의 나머지 텍스트를 옵션으로 전달한다.

2. `$ARGUMENTS`가 비어있거나 첫 단어가 `status`인 경우:
   - 이 디렉토리의 `status.md`를 읽고 지침을 따른다.

3. 첫 단어가 `search`인 경우:
   - 이 디렉토리의 `search.md`를 읽고 지침을 따른다.
   - `search` 이후의 나머지 텍스트를 키워드로 전달한다.

4. 첫 단어가 `collect`인 경우:
   - 인증 게이트를 통과한 후, 이 디렉토리의 `collect.md`를 읽고 지침을 따른다.
   - `collect` 이후의 나머지 텍스트를 옵션으로 전달한다.

5. 첫 단어가 `analyze`인 경우:
   - 인증 게이트를 통과한 후, 이 디렉토리의 `analyze.md`를 읽고 지침을 따른다.
   - `analyze` 이후의 나머지 텍스트를 옵션으로 전달한다.

6. 첫 단어가 `export`인 경우:
   - 인증 게이트를 통과한 후, 이 디렉토리의 `export.md`를 읽고 지침을 따른다.
   - `export` 이후의 나머지 텍스트를 옵션으로 전달한다.

7. 위에 해당하지 않는 경우:
   - 아래 사용법 안내를 출력한다.

## 인증 게이트

search를 제외한 모든 서브커맨드(collect, analyze, export, status)는 실행 전에 NotebookLM 인증 상태를 확인한다:

```bash
nlm login --check
```

- 인증 실패 시: "NotebookLM 인증이 필요합니다. `nlm login`을 실행해주세요." 안내 후 중단.
- 인증 성공 시: 해당 서브커맨드 진행.

## 사용법

```
/research run AI 에이전트 트렌드   # 원스톱 파이프라인 (대화형)
/research run AI --auto            # 원스톱 파이프라인 (자동)
/research                          # 현황 보기
/research status                   # 현황 보기
/research search AI 에이전트        # YouTube 검색
/research collect                  # 검색 결과를 NotebookLM에 수집
/research analyze                  # NotebookLM으로 분석
/research export                   # 분석 결과 내보내기
```

| 서브커맨드 | 설명 |
|-----------|------|
| `run <주제> [--auto] [--preset <name>]` | 원스톱 파이프라인 (search→collect→analyze→export) |
| `status` | 리서치 파이프라인 현황 (진행 중인 리서치, 노트북 상태) |
| `search <keyword>` | YouTube 영상 검색 (키워드 기반, 결과 목록 표시) |
| `collect` | 검색된 영상을 NotebookLM 노트북에 소스로 추가 |
| `analyze` | NotebookLM에서 수집된 소스 AI 분석 |
| `export` | 분석 결과를 파일로 내보내기 |
