# NLM Research

YouTube 검색 + Google NotebookLM AI 분석을 결합한 자동 리서치 시스템.
Claude Code 슬래시 명령어(`/research`)로 동작한다.

---

## 시스템 개요

### 무엇을 하는가

키워드 하나를 입력하면, YouTube에서 관련 영상을 검색하고, Google NotebookLM에 소스로 수집하여 AI가 분석한 뒤, 마크다운 리포트로 내보낸다.

### 아키텍처

```
사용자 입력 (키워드)
    │
    ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Search  │ ──▶ │ Collect  │ ──▶ │ Analyze  │ ──▶ │  Export  │
│ YouTube  │     │ NLM 수집  │     │ NLM 분석  │     │ 파일 저장  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
  yt-dlp          MCP API          MCP API        MCP + CLI
                notebook_create   chat_configure  download_artifact
                source_add        notebook_query
                                  studio_create
```

`/research run`은 직접 오케스트레이션 방식으로 각 Step의 MCP 호출을 직접 수행한다. 개별 서브커맨드(`/research search`, `/research collect` 등)는 독립 실행 전용이다.

### 기술 스택

| 구성 요소 | 역할 |
|-----------|------|
| Claude Code | 스킬 실행 엔진 (슬래시 명령어) |
| yt-dlp | YouTube 검색 (python 스크립트) |
| NotebookLM MCP | 노트북 생성, 소스 수집, AI 분석, 아티팩트 생성 |
| nlm CLI | 인증, 다운로드 |

### 폴더 구조

```
~/nlm-research/
├── README.md                           # 이 파일
├── .claude/commands/research/
│   ├── SKILL.md                        # 라우터 (서브커맨드 분배)
│   ├── DESIGN.md                       # 시스템 설계 문서
│   ├── run.md                          # 원스톱 파이프라인 (직접 오케스트레이션)
│   ├── search.md                       # YouTube 검색
│   ├── collect.md                      # NotebookLM 소스 수집
│   ├── analyze.md                      # AI 분석 (Q&A, 리포트, 팟캐스트 등)
│   ├── export.md                       # 결과 파일 내보내기
│   ├── status.md                       # 세션 현황 조회
│   ├── scripts/
│   │   └── youtube_search.py → (symlink)  # YouTube 검색 스크립트
│   └── references/
│       ├── nlm-commands.md             # NotebookLM MCP/CLI 레퍼런스
│       └── workflow-examples.md        # 실전 시나리오 예시
└── ~/research-output/                  # 결과물 저장 (자동 생성)
    ├── <주제>/                         # 주제별 디렉토리
    │   ├── <주제>_report.md
    │   ├── <주제>_analysis.md
    │   └── <주제>_podcast.mp3
    ├── last_session.json               # 마지막 세션 참조
    └── research_sessions.jsonl         # 세션 히스토리
```

---

## 사전 요구사항

| 도구 | 설치 명령어 | 확인 | 비고 |
|------|-------------|------|------|
| Claude Code | [공식 설치](https://docs.anthropic.com/claude-code) | `claude --version` | 실행 엔진 |
| Deno | `curl -fsSL https://deno.land/install.sh \| sh` | `deno --version` | nlm CLI 의존성 |
| nlm | `deno install -gArf jsr:@nicholasgriffintn/notebooklm-cli` | `nlm --version` | NotebookLM CLI (v0.3.19+) |
| yt-dlp | `pip install yt-dlp` | `yt-dlp --version` | YouTube 검색 |
| NotebookLM MCP | `~/.claude.json`에 등록 | — | Claude Code에서 MCP 서버로 연결 |

### 인증 설정 (최초 1회)

```bash
nlm login
```

브라우저에서 Google 계정으로 로그인한다. 세션은 ~20분 유지되며, 만료 시 시스템이 자동 갱신을 시도한다.

---

## 사용법

이 폴더에서 Claude Code를 실행해야 `/research` 명령어가 활성화된다.

```bash
cd ~/nlm-research && claude
```

### 원스톱 실행 (추천)

#### 대화형 모드 (기본)

각 단계마다 확인을 받으며 진행한다.

```
/research run AI 에이전트 트렌드
```

실행 흐름:
1. YouTube에서 "AI 에이전트 트렌드" 검색 → 결과 표시
2. "수집할 영상 번호를 선택하세요" → 사용자 선택
3. NotebookLM에 수집 → "분석 + 내보내기까지 진행할까요?"
4. AI 분석 + 내보내기 자동 진행
5. `~/research-output/<주제>/`에 리포트 저장

#### 자동 모드

확인 없이 전체 파이프라인을 한 번에 실행한다.

```
/research run AI 에이전트 트렌드 --auto
```

### 프리셋

용도에 맞는 분석 방식을 프리셋으로 선택한다.

```
/research run <주제> --preset <프리셋명>
```

| 프리셋 | 용도 | 수집 수 | 결과물 |
|--------|------|---------|--------|
| `default` | 일반 리서치 | 5개 | report.md |
| `trend-report` | 시장 동향/트렌드 분석 | 5개 | report.md |
| `competitor` | 경쟁사 SWOT 분석 | 5개 | report.md |
| `learning` | 학습 자료 생성 | 3개 | report.md + podcast.mp3 + quiz.json |
| `deep-dive` | 심층 분석 (웹 리서치 포함) | 10개 | report.md |
| `presentation` | 프레젠테이션 자료 | 5개 | report.md + slides.pptx |

#### 프리셋 사용 예시

```
# 경쟁사 분석
/research run 경쟁사X 제품 리뷰 --preset competitor --auto

# 학습 자료 (리포트 + 팟캐스트)
/research run React 19 새로운 기능 --preset learning

# 심층 분석 (웹 리서치 추가 수집)
/research run LLM 아키텍처 비교 --preset deep-dive --auto

# 프레젠테이션 자료 (리포트 + 슬라이드)
/research run 2026 AI 시장 전망 --preset presentation --auto

# 상위 3개만 수집
/research run AI --auto --top 3
```

### 단계별 수동 실행

각 단계를 개별적으로 실행할 수도 있다.

```
/research search AI 에이전트           # 1. YouTube 검색
/research collect                     # 2. 선택한 영상을 NLM에 수집
/research analyze <notebook-id>       # 3. AI 분석
/research export <notebook-id>        # 4. 파일 내보내기
/research status                      # 현재 세션 현황
/research status --clean              # 삭제된 노트북 세션 정리
/research export <id> --to-docs       # Google Docs로 내보내기
```

### 옵션 상세

#### search 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-n <숫자>` | YouTube 검색 결과 수 (API에서 가져올 총 개수) | 10 |
| `-d` | 최신순 정렬 | 비활성 |
| `--json` | JSON 형식 출력 | 비활성 |

```
/research search AI 에이전트 -n 15 -d    # 최신 15개
```

#### run 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--auto` | 확인 없이 자동 실행 | false |
| `--preset <name>` | 프리셋 선택 | default |
| `--top <N>` | 검색 결과 중 수집할 상위 N개 (검색 수와 별개) | 프리셋별 |
| `--notebook <id>` | 기존 노트북에 추가 | 신규 생성 |
| `--lang <code>` | 아티팩트 언어 (BCP-47) | ko |

> **`-n` vs `--top` 차이**: `-n`은 search에서 YouTube API로 가져올 검색 결과 총 수, `--top`은 run에서 그 중 실제로 NotebookLM에 수집할 상위 영상 수이다. 예: `-n 15`로 15개 검색 후 `--top 3`으로 상위 3개만 수집.

---

## 결과물

결과 파일은 `~/research-output/<주제>/`에 주제별로 저장된다.

```
~/research-output/
├── <주제>/
│   ├── <주제>_report.md       # NotebookLM 브리핑 리포트
│   ├── <주제>_analysis.md     # Q&A 종합 분석 결과
│   ├── <주제>_podcast.mp3     # AI 팟캐스트 (learning)
│   ├── <주제>_quiz.json       # 퀴즈 (learning)
│   └── <주제>_slides.pptx     # 슬라이드 (presentation)
├── last_session.json           # 마지막 세션 (자동 참조용)
└── research_sessions.jsonl     # 세션 히스토리
```

| 파일 | 내용 | 프리셋 |
|------|------|--------|
| `<주제>_report.md` | NotebookLM 브리핑 리포트 | 전체 |
| `<주제>_analysis.md` | Q&A 종합 분석 결과 | 전체 |
| `<주제>_podcast.mp3` | AI 팟캐스트 | learning |
| `<주제>_quiz.json` | 학습 퀴즈 | learning |
| `<주제>_slides.pptx` | 프레젠테이션 슬라이드 | presentation |

---

## 에러 대응

| 상황 | 해결 |
|------|------|
| "NotebookLM 인증이 필요합니다" | 터미널에서 `nlm login` 실행 |
| 특정 URL 수집 실패 | 비공개/삭제 영상. 자동으로 건너뛰고 나머지 진행 |
| 리포트 생성 실패 | 소스가 너무 적거나 큼. `/research status`로 확인 |
| 전체 수집 실패 (0건) | 검색 키워드를 변경하여 재시도 |

시스템은 3단계 에러 처리를 적용한다:
- **Tier 1 (자동 복구)**: 인증 만료, 개별 URL 실패, Rate Limit
- **Tier 2 (부분 진행)**: 일부 수집 실패, 아티팩트 생성 실패
- **Tier 3 (중단)**: 인증 완전 실패, 수집 0건, 노트북 생성 불가

---

## 실전 시나리오

### 시나리오 1: 빠른 트렌드 파악

```
/research run AI 에이전트 2026 트렌드 --auto --preset trend-report
```

→ 5개 영상 자동 수집 → 트렌드 분석 리포트 → `~/research-output/` 저장. 약 3-5분.

### 시나리오 2: 경쟁사 분석

```
/research run 경쟁사X 제품 리뷰 --preset competitor
```

→ 대화형으로 진행. 영상 선택 → SWOT 분석 → 리포트.

### 시나리오 3: 기술 학습

```
/research run React 19 새로운 기능 --preset learning --auto
```

→ 학습 가이드 리포트 + AI 팟캐스트(mp3) 자동 생성.

### 시나리오 4: 기존 노트북에 추가 수집

```
/research run 추가 키워드 --notebook <기존-notebook-id>
```

→ 새 노트북 생성 없이 기존 노트북에 소스 추가 후 재분석.
