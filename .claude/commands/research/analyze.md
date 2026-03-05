# Research Analyze - NotebookLM 분석

> 비유: 수집한 자료를 연구실에서 분석하는 단계. 도서관에서 모은 책(소스)을 읽고, 요약하고, 인사이트를 뽑아낸다.

## 실행 절차

### 1. 노트북 ID 확인

`$ARGUMENTS`에서 `analyze` 이후의 텍스트를 notebook-id로 사용한다.

- notebook-id가 비어있으면 사용자에게 질문: "어떤 노트북을 분석할까요? notebook-id를 입력해주세요."
- notebook-id가 있으면 유효성 확인:

```
mcp__notebooklm-mcp__notebook_get(notebook_id)
```

- 실패 시: "노트북을 찾을 수 없습니다. `/research status`로 노트북 목록을 확인해주세요." 안내 후 중단.

### 2. 분석 유형 선택

사용자에게 분석 유형을 확인한다:

```
## 분석 유형을 선택하세요:

| 번호 | 유형 | 설명 |
|------|------|------|
| 1 | 요약 질문 (Q&A) | 즉시 응답, 대화 이어가기 가능 |
| 2 | 브리핑 리포트 | Briefing Doc 형식 문서 생성 |
| 3 | 마인드맵 | 주제 구조 시각화 |
| 4 | 팟캐스트 | 대화형 오디오 생성 |
| 5 | 웹 리서치 | 추가 소스 자동 발견 |

번호를 입력하거나, "알아서 해"를 선택하세요.
```

### 3. 유형별 실행

#### 1번 - 요약 질문 (Q&A)

사용자에게 질문을 확인한다. 질문이 없으면 기본 질문을 사용한다.

```
mcp__notebooklm-mcp__chat_configure(
  notebook_id,
  goal="custom",
  custom_prompt="리서치 분석가로서 핵심 인사이트를 도출하세요",
  response_length="longer"
)
```

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id,
  query="<사용자 질문 또는 기본: 핵심 인사이트 5가지를 구조화하여 요약해주세요>"
)
```

- 결과를 표시한 후, 후속 질문 여부를 확인한다.
- 후속 질문 시 `conversation_id`를 유지하여 대화를 이어간다:

```
mcp__notebooklm-mcp__notebook_query(
  notebook_id,
  query="<후속 질문>",
  conversation_id="<이전 응답의 conversation_id>"
)
```

- 사용자가 종료할 때까지 반복 가능.

#### 2번 - 브리핑 리포트

```
mcp__notebooklm-mcp__studio_create(
  notebook_id,
  artifact_type="report",
  confirm=true
)
```

생성 완료까지 폴링:

```
mcp__notebooklm-mcp__studio_status(notebook_id)
```

- 폴링 중 "브리핑 리포트를 생성하고 있습니다..." 진행 안내를 표시한다.
- `studio_status`를 호출하여 상태를 확인한다. 완료되지 않았으면 약 15초 후 다시 확인한다.
- 완료되면 결과를 표시한다.

#### 3번 - 마인드맵

```
mcp__notebooklm-mcp__studio_create(
  notebook_id,
  artifact_type="mind_map",
  confirm=true
)
```

생성 완료까지 폴링:

```
mcp__notebooklm-mcp__studio_status(notebook_id)
```

- 폴링 중 "마인드맵을 생성하고 있습니다..." 진행 안내를 표시한다.
- `studio_status`를 호출하여 상태를 확인한다. 완료되지 않았으면 약 15초 후 다시 확인한다.
- 완료되면 결과를 표시한다.

#### 4번 - 팟캐스트

```
mcp__notebooklm-mcp__studio_create(
  notebook_id,
  artifact_type="audio",
  confirm=true
)
```

생성 완료까지 폴링:

```
mcp__notebooklm-mcp__studio_status(notebook_id)
```

- 폴링 중 "팟캐스트를 생성하고 있습니다... (수 분 소요될 수 있습니다)" 진행 안내를 표시한다.
- `studio_status`를 호출하여 상태를 확인한다. 완료되지 않았으면 약 30초 후 다시 확인한다.
- 완료되면 결과를 표시한다.

#### 5번 - 웹 리서치

사용자에게 리서치 주제를 확인한다. 주제가 없으면 노트북 제목을 기반으로 한다.

```
mcp__notebooklm-mcp__research_start(
  notebook_id,
  query="<주제>",
  source="web",
  mode="fast"
)
```

완료까지 폴링:

```
mcp__notebooklm-mcp__research_status(notebook_id)
```

- 폴링 중 "웹 리서치를 진행하고 있습니다..." 진행 안내를 표시한다.
- `studio_status`를 호출하여 상태를 확인한다. 완료되지 않았으면 약 15초 후 다시 확인한다.

완료되면 발견된 소스 목록을 표시하고, 가져올 소스를 사용자에게 선택받는다:

```
mcp__notebooklm-mcp__research_import(
  notebook_id,
  task_id=<research_status에서 받은 task_id>,
  source_indices=[<사용자가 선택한 번호들>]
)
```

### 4. 기본 분석 ("알아서 해" 선택 시)

사용자가 유형을 선택하지 않고 "알아서 해"를 선택한 경우, 아래 순서로 실행한다:

1. Q&A 분석 (핵심 인사이트 5가지):

```
mcp__notebooklm-mcp__chat_configure(
  notebook_id,
  goal="custom",
  custom_prompt="리서치 분석가로서 핵심 인사이트를 도출하세요",
  response_length="longer"
)
mcp__notebooklm-mcp__notebook_query(
  notebook_id,
  query="핵심 인사이트 5가지를 구조화하여 요약해주세요"
)
```

2. 결과 표시 후 사용자에게 확인:
   "브리핑 리포트도 생성할까요? (예/아니오)"
   - "예" 시: studio_create(report) 실행
   - "아니오" 시: 다음 단계 안내로 이동

### 5. 결과 표시 및 추가 분석

분석 결과를 표시한 후, 추가 분석 여부를 확인한다:

```
추가 분석이 필요하신가요? (다른 유형 선택 가능, 종료하려면 "아니오")
```

- "예" 또는 유형 번호 입력 시: 2단계(분석 유형 선택)로 돌아간다.
- "아니오" 시: 다음 단계를 안내한다.

### 6. 다음 단계 안내

```
다음 단계: `/research export <notebook-id>` 를 실행하여 분석 결과를 내보내세요.
```

## 에러 처리

| 에러 상황 | 대응 |
|-----------|------|
| studio 생성 실패 | 소스 수/크기를 확인하고 재시도를 안내한다. "소스가 너무 적거나 클 수 있습니다. 소스를 확인해주세요." |
| 폴링 타임아웃 (5분(300초) 초과) | "생성이 예상보다 오래 걸리고 있습니다. `/research status`로 나중에 확인해주세요." |
| Rate limit | 2초 간격으로 대기 후 재시도한다. 3회 실패 시 중단하고 안내한다. |
| 노트북 없음 | "노트북을 찾을 수 없습니다. `/research status`로 노트북 목록을 확인해주세요." |
