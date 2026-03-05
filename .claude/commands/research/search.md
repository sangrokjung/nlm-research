# Research Search - YouTube 검색

> 비유: 도서관에서 키워드 카드로 관련 자료를 찾는 단계. 서가(YouTube)에서 관련 영상을 검색한다.

## 실행 절차

### 1. 키워드 추출

`$ARGUMENTS`에서 `search` 이후의 텍스트를 키워드로 사용한다.

- 키워드가 비어있으면 사용자에게 질문: "어떤 주제로 검색할까요? 키워드를 입력해주세요."
- 키워드가 있으면 바로 검색 진행.

### 2. 옵션 파싱

키워드에서 아래 옵션 플래그를 분리한다:

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-n <숫자>` | 검색 결과 수 | 10 |
| `-d` | 최신순 정렬 | 비활성 |
| `--json` | JSON 형식으로 출력 | 비활성 |

옵션 플래그를 제거한 나머지가 실제 검색 키워드이다.

### 3. 검색 실행 및 저장

검색을 실행하고 결과를 메타데이터와 함께 JSON으로 저장한다.

```bash
mkdir -p ~/research-output
python3 ~/.claude/commands/research/scripts/youtube_search.py "<키워드>" -n <결과수> --json > /tmp/search_raw.json
```

최신순 정렬이 지정되면 `-d` 플래그를 추가한다.

검색 결과를 메타데이터로 래핑하여 저장한다:

```bash
python3 -c "
import json, datetime
with open('/tmp/search_raw.json') as f:
    results = json.load(f)
wrapped = {
    'searched_at': datetime.datetime.now().isoformat(),
    'keyword': '<키워드>',
    'options': {'count': <결과수>, 'sort_by_date': <true|false>},
    'results': results
}
with open('$HOME/research-output/last_search.json', 'w') as f:
    json.dump(wrapped, f, ensure_ascii=False, indent=2)
"
```

검색 결과 JSON을 파싱하여 표시용 목록도 생성한다 (별도 실행 불필요).

### 4. 결과 표시

검색 결과를 번호 목록으로 정리하여 표시한다:

```
## YouTube 검색 결과: "<키워드>"

1. [영상 제목] - 채널명 (조회수, 업로드일)
   URL: https://youtube.com/watch?v=...

2. [영상 제목] - 채널명 (조회수, 업로드일)
   URL: https://youtube.com/watch?v=...
...
```

### 5. 다음 단계 안내

결과 표시 후 안내:

```
다음 단계: `/research collect` 를 실행하여 선택한 영상을 NotebookLM에 수집하세요.
```
