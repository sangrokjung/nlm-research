<!-- hero banner -->
<p align="center">
  <img src="assets/hero-banner.png" alt="NLM Research - YouTube + NotebookLM AI Research Automation" width="100%">
</p>

<p align="center">
  <a href="https://docs.anthropic.com/claude-code"><img src="https://img.shields.io/badge/Claude_Code-Skill-7C3AED?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude Code"></a>
  <a href="https://notebooklm.google.com"><img src="https://img.shields.io/badge/Google-NotebookLM-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="NotebookLM"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" alt="License: MIT"></a>
</p>

<p align="center">
  <strong>키워드 하나로 YouTube 영상 검색 → Google NotebookLM AI 분석 → 마크다운 리포트 자동 생성</strong>
</p>

<p align="center">
  <strong>한국어</strong> | <a href="README_EN.md">English</a>
</p>

---

# NLM Research

Claude Code 슬래시 명령어(`/research`)로 동작하는 자동 리서치 파이프라인입니다.
YouTube에서 영상을 검색하고, Google NotebookLM에 수집하여 AI가 분석한 뒤, 마크다운 리포트로 내보냅니다.

## ✨ 주요 특징

- 🔍 **원스톱 파이프라인** — 키워드 입력 하나로 검색 → 수집 → 분석 → 내보내기까지 자동 실행
- 🎯 **6개 프리셋** — 트렌드 분석, 경쟁사 SWOT, 학습 자료, 심층 분석, 프레젠테이션 등 용도별 최적화
- 🤖 **대화형 / 자동 모드** — 단계마다 확인받는 대화형 모드와 `--auto` 플래그로 완전 자동 실행
- 🛡️ **3-Tier 에러 처리** — 인증 만료 자동 복구, 부분 실패 시 계속 진행, 치명적 오류만 중단
- 📦 **다양한 결과물** — 마크다운 리포트, AI 팟캐스트(mp3), 퀴즈(json), 슬라이드(pptx)

## 🏗️ 아키텍처

<p align="center">
  <img src="assets/architecture.png" alt="NLM Research Architecture" width="100%">
</p>

```
사용자 입력 (키워드)
    │
    ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Search  │ ──▶ │ Collect  │ ──▶ │ Analyze  │ ──▶ │  Export  │
│ YouTube  │     │ NLM 수집  │     │ NLM 분석  │     │ 파일 저장  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
  yt-dlp          MCP API          MCP API        MCP + CLI
```

| 구성 요소 | 역할 |
|-----------|------|
| **Claude Code** | 스킬 실행 엔진 (슬래시 명령어 `/research`) |
| **yt-dlp** | YouTube 영상 검색 |
| **NotebookLM MCP** (v0.3.19) | 노트북 생성, 소스 수집, AI 분석, 아티팩트 생성 |
| **nlm CLI** (v0.3.19) | 인증, 아티팩트 다운로드 |

## 🚀 빠른 시작

### 사전 요구사항

| 도구 | 설치 명령어 | 확인 |
|------|-------------|------|
| Claude Code | [공식 설치 가이드](https://docs.anthropic.com/claude-code) | `claude --version` |
| Deno 2.7.3+ | `curl -fsSL https://deno.land/install.sh \| sh` | `deno --version` |
| nlm CLI v0.3.19+ | `deno install -gArf jsr:@nicholasgriffintn/notebooklm-cli` | `nlm --version` |
| yt-dlp | `pip install yt-dlp` | `yt-dlp --version` |
| NotebookLM MCP | `~/.claude.json`에 MCP 서버 등록 | — |

### 설치

```bash
# 1. 리포지토리 클론
git clone https://github.com/sangrokjung/nlm-research.git
cd nlm-research

# 2. NotebookLM 인증 (최초 1회)
nlm login
# 브라우저에서 Google 계정으로 로그인
```

### 첫 실행

```bash
# Claude Code 시작 (이 디렉토리에서 실행해야 /research 명령어 활성화)
claude

# 원스톱 자동 실행
/research run AI 에이전트 트렌드 --auto

# 대화형 실행 (단계마다 확인)
/research run AI 에이전트 트렌드
```

## 🎯 프리셋

<p align="center">
  <img src="assets/presets-infographic.png" alt="NLM Research Presets" width="100%">
</p>

| 프리셋 | 용도 | 수집 수 | 결과물 |
|--------|------|---------|--------|
| `default` | 일반 리서치 | 5개 | report.md |
| `trend-report` | 시장 동향 / 트렌드 분석 | 5개 | report.md |
| `competitor` | 경쟁사 SWOT 분석 | 5개 | report.md |
| `learning` | 학습 자료 생성 | 3개 | report.md + podcast.mp3 + quiz.json |
| `deep-dive` | 심층 분석 (웹 리서치 포함) | 10개 | report.md |
| `presentation` | 프레젠테이션 자료 | 5개 | report.md + slides.pptx |

```bash
/research run <주제> --preset <프리셋명>

# 예시
/research run 경쟁사X 제품 리뷰 --preset competitor --auto
/research run React 19 새로운 기능 --preset learning
```

## 🔄 파이프라인

<p align="center">
  <img src="assets/pipeline-flow.png" alt="NLM Research Pipeline Flow" width="100%">
</p>

| 단계 | 설명 | 도구 |
|------|------|------|
| 🔍 **Search** | YouTube에서 키워드 검색, 결과 목록 표시 | yt-dlp |
| 📚 **Collect** | 선택한 영상을 NotebookLM 노트북에 소스로 수집 | MCP `source_add` |
| 🧠 **Analyze** | AI가 수집된 소스를 분석, 리포트/팟캐스트 등 생성 | MCP `notebook_query`, `studio_create` |
| 📤 **Export** | 분석 결과를 로컬 파일로 다운로드 | nlm CLI `download` |

## 💡 사용 예시

### 1. 빠른 트렌드 파악

```bash
/research run AI 에이전트 2026 트렌드 --auto --preset trend-report
# → 5개 영상 자동 수집 → 트렌드 분석 리포트 → ~/research-output/ 저장
```

### 2. 경쟁사 분석

```bash
/research run 경쟁사X 제품 리뷰 --preset competitor
# → 대화형 진행: 영상 선택 → SWOT 분석 → 리포트
```

### 3. 기술 학습 자료

```bash
/research run React 19 새로운 기능 --preset learning --auto
# → 학습 가이드 리포트 + AI 팟캐스트(mp3) + 퀴즈(json) 자동 생성
```

### 4. 기존 노트북에 추가 수집

```bash
/research run 추가 키워드 --notebook <기존-notebook-id>
# → 새 노트북 생성 없이 기존 노트북에 소스 추가 후 재분석
```

### 5. 단계별 수동 실행

```bash
/research search AI 에이전트           # 1. YouTube 검색
/research collect                     # 2. 선택한 영상을 NLM에 수집
/research analyze <notebook-id>       # 3. AI 분석
/research export <notebook-id>        # 4. 파일 내보내기
/research status                      # 현재 세션 현황
```

## ⚙️ 옵션 상세

### search 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-n <숫자>` | YouTube 검색 결과 수 (API에서 가져올 총 개수) | 10 |
| `-d` | 최신순 정렬 | 비활성 |
| `--json` | JSON 형식 출력 | 비활성 |

```bash
/research search AI 에이전트 -n 15 -d    # 최신순 15개 검색
```

### run 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--auto` | 확인 없이 자동 실행 | false |
| `--preset <name>` | 프리셋 선택 | default |
| `--top <N>` | 검색 결과 중 수집할 상위 N개 | 프리셋별 |
| `--notebook <id>` | 기존 노트북에 추가 | 신규 생성 |
| `--lang <code>` | 아티팩트 언어 (BCP-47) | ko |

#### `-n` vs `--top` 차이

- **`-n`**: `search`에서 YouTube API로 가져올 **검색 결과 총 수**
- **`--top`**: `run`에서 검색 결과 중 실제로 NotebookLM에 **수집할 상위 영상 수**

```bash
# 15개 검색 후 상위 3개만 수집
/research run AI -n 15 --top 3 --auto
```

## 📁 결과물

결과 파일은 `~/research-output/<주제>/`에 주제별로 저장됩니다.

```
~/research-output/
├── AI_에이전트_트렌드/
│   ├── AI_에이전트_트렌드_report.md       # NotebookLM 브리핑 리포트
│   ├── AI_에이전트_트렌드_analysis.md     # Q&A 종합 분석 결과
│   ├── AI_에이전트_트렌드_podcast.mp3     # AI 팟캐스트 (learning)
│   ├── AI_에이전트_트렌드_quiz.json       # 퀴즈 (learning)
│   └── AI_에이전트_트렌드_slides.pptx     # 슬라이드 (presentation)
├── last_session.json                      # 마지막 세션 (자동 참조용)
└── research_sessions.jsonl                # 세션 히스토리
```

| 파일 | 내용 | 생성 프리셋 |
|------|------|------------|
| `*_report.md` | NotebookLM 브리핑 리포트 | 전체 |
| `*_analysis.md` | Q&A 종합 분석 결과 | 전체 |
| `*_podcast.mp3` | AI 팟캐스트 | learning |
| `*_quiz.json` | 학습 퀴즈 | learning |
| `*_slides.pptx` | 프레젠테이션 슬라이드 | presentation |

## 🛡️ 에러 처리

<p align="center">
  <img src="assets/error-handling.png" alt="NLM Research Error Handling" width="100%">
</p>

시스템은 3단계 에러 처리를 적용합니다:

| Tier | 유형 | 처리 방식 | 예시 |
|------|------|----------|------|
| **Tier 1** | 자동 복구 (Fixable) | 시스템이 자동으로 해결 | 인증 만료 → 자동 갱신, Rate Limit → 대기 후 재시도 |
| **Tier 2** | 부분 진행 (Degraded) | 실패 항목 건너뛰고 계속 | 일부 URL 수집 실패, 아티팩트 생성 실패 |
| **Tier 3** | 중단 (Fatal) | 파이프라인 중단 후 안내 | 인증 완전 실패, 수집 0건, 노트북 생성 불가 |

### 자주 발생하는 문제

| 상황 | 해결 방법 |
|------|----------|
| "NotebookLM 인증이 필요합니다" | 터미널에서 `nlm login` 실행 |
| 특정 URL 수집 실패 | 비공개/삭제 영상 → 자동 건너뛰기 |
| 리포트 생성 실패 | 소스가 너무 적거나 큼 → `/research status`로 확인 |
| 전체 수집 0건 | 검색 키워드를 변경하여 재시도 |

## 📂 프로젝트 구조

```
nlm-research/
├── README.md                               # 문서 (한국어)
├── README_EN.md                            # 문서 (English)
├── assets/                                 # 문서 이미지
├── .claude/commands/research/
│   ├── SKILL.md                          # 라우터 (서브커맨드 분배)
│   ├── DESIGN.md                         # 시스템 설계 문서
│   ├── run.md                            # 원스톱 파이프라인
│   ├── search.md                         # YouTube 검색
│   ├── collect.md                        # NotebookLM 소스 수집
│   ├── analyze.md                        # AI 분석
│   ├── export.md                         # 결과 파일 내보내기
│   ├── status.md                         # 세션 현황 조회
│   ├── scripts/
│   │   └── youtube_search.py             # YouTube 검색 스크립트
│   └── references/
│       ├── nlm-commands.md               # NotebookLM MCP/CLI 레퍼런스
│       └── workflow-examples.md          # 실전 시나리오 예시
└── ~/research-output/                    # 결과물 저장 (자동 생성)
```

## 🤝 기여

기여를 환영합니다! 다음 절차를 따라주세요:

1. 이 리포지토리를 Fork합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feat/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'feat: 멋진 기능 추가'`)
4. 브랜치에 Push합니다 (`git push origin feat/amazing-feature`)
5. Pull Request를 생성합니다

## 📜 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)로 배포됩니다.
