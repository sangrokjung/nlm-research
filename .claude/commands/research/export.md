# Research Export - 결과 추출

> 비유: 리서치 도서관에서 빌린 책들의 독서 노트를 정리하여 자기 책상(로컬 파일)으로 가져오는 단계.

## 사용법
- `/research export` — 최근 노트북의 결과를 내보내기
- `/research export <notebook-id>` — 특정 노트북 결과 내보내기
- `/research export <notebook-id> --to-docs` — Google Docs로 내보내기
- `/research export <notebook-id> --to-sheets` — Google Sheets로 내보내기

## 실행 절차

### 1단계: 노트북 ID 확인

$ARGUMENTS에서 "export" 이후의 내용을 파싱하세요.

- notebook-id가 있으면 해당 노트북 사용
- 없으면:
  1. `~/research-output/last_session.json` 파일이 존재하면 자동으로 notebook_id를 로드한다.
     "마지막 세션의 노트북을 사용합니다: <topic> (<notebook_id 앞 8자리>)"
  2. 파일이 없으면 `mcp__notebooklm-mcp__notebook_list()`로 목록을 조회하여 사용자에게 선택 요청

### 2단계: 소스 원문 추출 (선택)

사용자에게 소스 원문이 필요한지 확인합니다.

필요한 경우:
1. `mcp__notebooklm-mcp__notebook_get(notebook_id=<id>)`로 소스 목록 확인
2. 각 소스에 대해:
   ```
   mcp__notebooklm-mcp__source_get_content(source_id=<source_id>)
   ```
3. 추출된 원문을 마크다운으로 정리

### 3단계: 종합 Q&A (기존 노트 확인 후 조건부 실행)

먼저 기존 노트가 있는지 확인합니다:

```
mcp__notebooklm-mcp__note(action="list", notebook_id=<id>)
```

- **노트가 있으면**: 기존 노트 내용을 로드하여 Q&A 결과로 사용합니다.
  "기존 노트 <N>개를 발견했습니다. 새로 질의하지 않고 기존 분석을 사용합니다."
- **노트가 없으면**: notebook_query로 핵심 인사이트를 추출합니다:

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id=<id>,
  query="모든 소스를 종합하여 핵심 발견, 트렌드, 실행 가능한 인사이트를 정리해주세요"
)
```

결과를 마크다운 형식으로 정리합니다.

### 4단계: 아티팩트 목록 조회

```
mcp__notebooklm-mcp__studio_status(notebook_id=<id>)
```

완료된 아티팩트 목록을 사용자에게 표시합니다:

```
## 생성된 아티팩트

| 유형 | 상태 | 생성일 |
|------|------|--------|
| report | completed | ... |
| audio | completed | ... |
```

### 5단계: 내보내기 실행

출력 디렉토리를 확보합니다:

```bash
mkdir -p ~/research-output/<주제>/
```
(<주제>의 공백은 하이픈으로 변환)

사용자가 선택한 아티팩트를 다운로드합니다:

MCP `download_artifact`를 우선 사용한다. 실패 시 CLI `nlm download`로 fallback한다.

**1차: MCP 도구**
```
mcp__notebooklm-mcp__download_artifact(
  notebook_id=<id>,
  artifact_type="report",
  output_path="~/research-output/<주제>/<주제>_report.md"
)
```

```
mcp__notebooklm-mcp__download_artifact(
  notebook_id=<id>,
  artifact_type="audio",
  output_path="~/research-output/<주제>/<주제>_podcast.mp3"
)
```

**Google Docs/Sheets 내보내기 (--to-docs, --to-sheets 옵션):**

사용자가 `--to-docs` 또는 `--to-sheets` 옵션을 지정한 경우:
```
mcp__notebooklm-mcp__export_artifact(
  notebook_id=<id>,
  artifact_id=<artifact_id>,
  export_type="docs",      # --to-docs
  title="<주제> 리서치 리포트"
)
```

```
mcp__notebooklm-mcp__export_artifact(
  notebook_id=<id>,
  artifact_id=<artifact_id>,
  export_type="sheets",    # --to-sheets (Data Table용)
  title="<주제> 데이터"
)
```

내보내기 완료 후 Google Docs/Sheets URL을 표시한다.

**2차: CLI fallback (MCP 실패 시)**
```bash
nlm download report <notebook-id> --output ~/research-output/<주제>/<주제>_report.md
nlm download audio <notebook-id> --output ~/research-output/<주제>/<주제>_podcast.mp3
nlm download slide-deck <notebook-id> --output ~/research-output/<주제>/<주제>_slides.pptx --format pptx
nlm download quiz <notebook-id> --output ~/research-output/<주제>/<주제>_quiz.json --format json
```

### 6단계: Q&A 결과 마크다운 저장

3단계에서 수행한 종합 Q&A 결과를 파일로 저장합니다.

Write 도구로 `~/research-output/<주제>/<주제>_analysis.md` 파일을 생성합니다:

```markdown
# <주제> - 리서치 분석 결과

> 생성일: <date '+%Y-%m-%d'>
> 노트북 ID: <notebook-id>
> 소스 수: <N>개

## 핵심 발견 및 인사이트

<종합 Q&A 결과>

## 소스 목록

1. <소스 제목> - <URL>
2. ...
```

### 7단계: 결과 안내

**파일 구분:**
- `_report.md`: NotebookLM이 생성한 **원본 브리핑 문서** (download_artifact로 다운로드)
- `_analysis.md`: 3단계 종합 Q&A 결과를 기반으로 **Claude가 정리한 분석 리포트** (소스 목록, 인사이트 포함)

내보내기 완료 후 결과를 안내합니다:

```
## 내보내기 완료

| 파일 | 경로 | 설명 |
|------|------|------|
| 분석 리포트 | ~/research-output/<주제>/<주제>_analysis.md | Claude 정리 (Q&A 기반) |
| 브리핑 문서 | ~/research-output/<주제>/<주제>_report.md | NotebookLM 원본 |
| 팟캐스트 | ~/research-output/<주제>/<주제>_podcast.mp3 | 오디오 요약 |

이 결과물을 콘텐츠로 활용하려면 content-pipeline에 입력할 수 있습니다.
```

## 주의사항

- MCP 도구 접두사: `mcp__notebooklm-mcp__` (하이픈 포함)
- 날짜는 반드시 `date` 명령어로 가져올 것 (암산 금지)
- 출력 디렉토리 `~/research-output/<주제>/`가 없으면 `mkdir -p`로 생성
- 다운로드 실패 시 CLI fallback 시도
- 주제명에 공백이 있으면 하이픈으로 변환하여 파일명에 사용
- 에러 발생 시 사용자에게 명확히 보고하고 다음 아티팩트로 진행
