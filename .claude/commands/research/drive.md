# Research Drive - Google Drive 소스 관리

NotebookLM 노트북에 Google Drive 파일을 추가하고 동기화합니다.

## 사용법

```
/research drive list [notebook-id]       # 노트북의 Drive 소스 목록 조회
/research drive sync [notebook-id]       # Drive 소스 동기화 (최신 내용 반영)
/research drive add <url-or-id>          # Drive 파일을 노트북에 추가
```

## 인자 파싱

$ARGUMENTS에서 "drive" 이후의 내용을 파싱한다.
- 두 번째 단어가 `list` / `sync` / `add`이면 해당 액션 실행
- 두 번째 단어가 없으면 `list` 동작 수행

---

## 액션 1: list

노트북에 연결된 Google Drive 소스 목록과 동기화 상태를 표시한다.

### 실행 절차

1. **노트북 ID 확인**
   - $ARGUMENTS에 notebook-id가 있으면 사용
   - 없으면 `~/research-output/last_session.json`에서 `notebook_id` 로드
   - 파일도 없으면 사용자에게 notebook-id 입력 요청

2. **Drive 소스 목록 조회**
   ```
   mcp__notebooklm-mcp__source_list_drive(notebook_id="...")
   ```

3. **결과 표시**
   ```
   ## Google Drive 소스 목록: <notebook-id>

   | # | 제목 | 유형 | 상태 | 마지막 동기화 |
   |---|------|------|------|-------------|
   | 1 | 기획서_2026.docx | doc | synced | 2026-03-10 |
   | 2 | 발표자료.pptx | slides | outdated | 2026-03-01 |
   ```
   - Drive 소스가 없으면: "이 노트북에 연결된 Drive 소스가 없습니다. `/research drive add <url>`로 추가하세요."

4. **다음 단계 안내**
   - outdated 소스가 있으면: "동기화가 필요한 소스가 있습니다. `/research drive sync <notebook-id>`를 실행하세요."

---

## 액션 2: sync

노트북의 Drive 소스를 최신 내용으로 동기화한다.

### 실행 절차

1. **노트북 ID 확인** (list와 동일)

2. **Drive 소스 목록 조회**
   ```
   mcp__notebooklm-mcp__source_list_drive(notebook_id="...")
   ```
   - Drive 소스가 없으면: "동기화할 Drive 소스가 없습니다." 안내 후 중단

3. **동기화 대상 선택**
   - 모든 source_id 목록을 추출
   - 사용자에게 확인: "Drive 소스 N개를 동기화합니다. 계속할까요? (예/아니오)"
   - 아니오 → 중단

4. **동기화 실행**
   ```
   mcp__notebooklm-mcp__source_sync_drive(
     source_ids=["<id1>", "<id2>", ...],
     confirm=true
   )
   ```

5. **결과 보고**
   ```
   Drive 소스 동기화 완료

   | 소스 | 결과 |
   |------|------|
   | 기획서_2026.docx | ✓ 동기화됨 |
   | 발표자료.pptx | ✓ 동기화됨 |
   ```

6. **last_session.json 업데이트** — `updated_at` 갱신 (Write 도구)

---

## 액션 3: add

Google Drive 파일을 노트북 소스로 추가한다.

### 지원 입력 형식

| 입력 | 예시 |
|------|------|
| Google Docs URL | `https://docs.google.com/document/d/<ID>/edit` |
| Google Slides URL | `https://docs.google.com/presentation/d/<ID>/edit` |
| Google Sheets URL | `https://docs.google.com/spreadsheets/d/<ID>/edit` |
| Google Drive 파일 URL | `https://drive.google.com/file/d/<ID>/view` |
| 문서 ID 직접 입력 | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms` |

### doc_type 자동 감지

URL 패턴으로 doc_type을 자동 결정한다:

| URL 패턴 | doc_type |
|----------|----------|
| `docs.google.com/document/` | `doc` |
| `docs.google.com/presentation/` | `slides` |
| `docs.google.com/spreadsheets/` | `sheets` |
| `drive.google.com/file/` | `pdf` (기본값, 파일 확장자로 재판단) |
| ID 직접 입력 | `doc` (기본값, 사용자에게 유형 확인) |

### 실행 절차

1. **입력 파싱** — `add` 이후 텍스트를 URL 또는 ID로 추출
   - 입력이 없으면: "Drive URL 또는 문서 ID를 입력하세요." 안내 후 중단

2. **문서 ID 추출**
   - URL인 경우: `/d/<ID>/` 패턴에서 ID 추출
   - ID 직접 입력: 그대로 사용

3. **doc_type 결정** — 위 자동 감지 규칙 적용
   - `drive.google.com/file/` 또는 ID 직접 입력이면 사용자에게 유형 확인:
     "파일 유형을 선택하세요: (1) doc  (2) slides  (3) sheets  (4) pdf"

4. **노트북 확보**
   - `~/research-output/last_session.json`에서 notebook_id 로드 시도
   - 없으면 `mcp__notebooklm-mcp__notebook_list`로 목록 표시 → 사용자 선택
   - 새 노트북 생성 옵션도 제공

5. **소스 추가**
   ```
   mcp__notebooklm-mcp__source_add(
     notebook_id="...",
     source_type="drive",
     document_id="<추출된 ID>",
     doc_type="<감지된 유형>"
   )
   ```

6. **결과 확인**
   ```
   mcp__notebooklm-mcp__notebook_get(notebook_id="...")
   ```

7. **결과 보고**
   ```
   Drive 소스 추가 완료

   | 항목 | 값 |
   |------|-----|
   | 문서 ID | <id> |
   | 유형 | <doc_type> |
   | 노트북 | <notebook_id> |
   | 총 소스 수 | <N>개 |

   다음 단계: `/research analyze <notebook-id>`를 실행하세요.
   ```

8. **last_session.json 업데이트** — source_count, updated_at 갱신

---

## 에러 처리

| 에러 | 대응 |
|------|------|
| Drive 소스 없음 (list/sync) | 안내 메시지 출력 후 종료 |
| 잘못된 URL 형식 | "올바른 Google Drive URL 또는 문서 ID를 입력하세요." |
| ID 추출 실패 | URL에서 `/d/<ID>/` 패턴을 찾을 수 없음 → 사용자에게 ID 직접 입력 요청 |
| source_add 실패 | Drive 파일 공유 설정 확인 안내 ("파일이 '링크가 있는 모든 사용자' 공유 설정인지 확인하세요") |
| sync 실패 | 실패한 소스만 보고, 나머지는 계속 진행 |

## 주의사항

- Drive 파일은 반드시 "링크가 있는 모든 사용자에게 보기 권한" 공유 설정 필요
- `source_sync_drive`는 소스 처리 시간이 있으므로 완료까지 대기
- 날짜 계산은 반드시 `date` 명령어 사용
- MCP 도구 접두사: `mcp__notebooklm-mcp__` (하이픈 포함)
