<!-- hero banner -->
<p align="center">
  <img src="assets/hero-banner.png" alt="NLM Research" width="100%">
</p>

<p align="center">
  <a href="https://docs.anthropic.com/claude-code"><img src="https://img.shields.io/badge/Claude_Code-Skill-7C3AED?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude Code"></a>
  <a href="https://notebooklm.google.com"><img src="https://img.shields.io/badge/Google-NotebookLM-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="NotebookLM"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" alt="License: MIT"></a>
</p>

<p align="center">
  <strong>궁금한 주제를 입력하면, YouTube 영상을 찾아서 AI가 팟캐스트·슬라이드·리포트로 만들어드립니다</strong>
</p>

<p align="center">
  <strong>한국어</strong> | <a href="README.md">English</a>
</p>

---

# NLM Research

궁금한 주제를 입력하면, YouTube에서 관련 영상을 찾아 AI가 자동으로 분석해서 다양한 콘텐츠로 만들어주는 도구입니다.

## 이런 걸 만들 수 있어요

| 콘텐츠 | 설명 | 이럴 때 좋아요 |
|--------|------|---------------|
| 🎧 **AI 팟캐스트** | 두 AI 진행자가 대화하듯 설명하는 오디오 파일(.mp3) | 출퇴근길에 들으면 새 기술을 자연스럽게 익힐 수 있어요 |
| 📊 **브리핑 리포트** | 핵심만 깔끔하게 정리한 문서(.md) | 회의 전 5분 읽기에 딱이에요 |
| 🎬 **프레젠테이션 슬라이드** | 발표용 슬라이드(.pptx) 자동 생성 | 발표 준비 시간을 대폭 줄여줘요 |
| 🧠 **마인드맵** | 주제 간 관계를 한눈에 보여주는 시각 자료 | 복잡한 주제의 전체 그림을 빠르게 파악할 때 |
| 💬 **AI 질의응답** | 수집한 자료를 바탕으로 궁금한 점을 바로 물어볼 수 있어요 | 긴 영상 볼 시간 없을 때, 핵심만 빠르게 |
| 🌐 **웹 리서치** | AI가 관련 자료를 인터넷에서 자동으로 더 찾아줘요 | 더 넓은 관점이 필요할 때 |

> 이 모든 걸 **명령어 한 줄**로 자동으로 만들어줍니다.
> 궁금한 주제만 입력하면, YouTube에서 영상을 찾고, AI가 분석하고, 원하는 형태로 만들어서 내 컴퓨터에 저장합니다.

## 이렇게 쓰면 돼요 — 시작하기

### 1단계: 설치하기

이 도구들을 깔아야 해요. 각각이 하는 역할이 다릅니다.

| 도구 | 왜 필요한가요? | 설치 명령어 | 잘 설치됐는지 확인 |
|------|---------------|-------------|-------------------|
| **Claude Code** | AI 비서 프로그램 (이 도구의 두뇌 역할) | [공식 설치 가이드](https://docs.anthropic.com/claude-code) | `claude --version` |
| **Deno** | nlm 도구를 실행하기 위한 프로그램 | `curl -fsSL https://deno.land/install.sh \| sh` | `deno --version` |
| **nlm** | NotebookLM과 대화하기 위한 도구 | `deno install -gArf jsr:@nicholasgriffintn/notebooklm-cli` | `nlm --version` |
| **yt-dlp** | YouTube 검색을 위한 도구 | `pip install yt-dlp` | `yt-dlp --version` |

### 2단계: Google 계정 연결

NotebookLM을 사용하려면 Google 로그인이 필요해요.

```bash
nlm login
# 브라우저가 열리면 Google 계정으로 로그인하세요
```

### 3단계: 첫 번째 리서치 실행

```bash
cd nlm-research  # 이 폴더에서 실행해야 해요
claude           # AI 비서 시작

# 이제 이렇게 입력하세요:
/research run AI 에이전트 트렌드 --auto
```

`--auto`를 붙이면 중간에 물어보지 않고 자동으로 끝까지 진행해요. 빼면 단계마다 확인을 받아요.

## 상황별 활용 가이드

<p align="center">
  <img src="assets/presets-infographic.png" alt="NLM Research Presets" width="100%">
</p>

이런 상황이면 이걸 쓰세요:

### "내일 발표인데 자료가 없어요"

```bash
/research run 2026 AI 시장 전망 --preset presentation --auto
```

📊 브리핑 리포트 + 🎬 슬라이드(.pptx)가 자동으로 만들어져요

### "새 기술 빠르게 공부하고 싶어요"

```bash
/research run React 19 새로운 기능 --preset learning --auto
```

📊 학습 가이드 + 🎧 AI 팟캐스트(mp3) + 📝 퀴즈가 만들어져요

### "시장 트렌드를 파악해야 해요"

```bash
/research run AI 에이전트 2026 트렌드 --preset trend-report --auto
```

📊 트렌드 분석 브리핑 리포트가 만들어져요

### "경쟁사 분석이 필요해요"

```bash
/research run 경쟁사X 제품 리뷰 --preset competitor --auto
```

📊 SWOT 분석이 포함된 경쟁 분석 리포트가 만들어져요

### "주제를 깊이 파고들고 싶어요"

```bash
/research run LLM 아키텍처 비교 --preset deep-dive --auto
```

AI가 웹에서 추가 자료까지 찾아서 📊 심층 분석 리포트를 만들어요

### "기본 리서치만 빠르게"

```bash
/research run AI 에이전트 --auto
```

기본: 📊 브리핑 리포트 + 💬 Q&A 분석

## 자동으로 이렇게 진행돼요

<p align="center">
  <img src="assets/architecture.png" alt="NLM Research Architecture" width="100%">
</p>

도서관에서 책을 찾고 → 필요한 책을 빌려와서 → 읽고 요약하고 → 보고서로 정리하는 과정을 AI가 대신 해줍니다.

<p align="center">
  <img src="assets/pipeline-flow.png" alt="NLM Research Pipeline Flow" width="100%">
</p>

| 단계 | 하는 일 | 비유 |
|------|---------|------|
| 🔍 **검색** | YouTube에서 관련 영상을 찾아요 | 도서관에서 관련 책 찾기 |
| 📚 **수집** | 찾은 영상을 NotebookLM에 넣어요 | 책을 빌려오기 |
| 🧠 **분석** | AI가 영상 내용을 분석하고 콘텐츠를 만들어요 | 책을 읽고 요약하기 |
| 📤 **내보내기** | 만들어진 파일을 내 컴퓨터에 저장해요 | 보고서 출력하기 |

## 만들어지는 파일들

모든 결과물은 `~/research-output/<주제>/` 폴더에 자동으로 저장됩니다.

```
~/research-output/
├── AI_에이전트_트렌드/
│   ├── AI_에이전트_트렌드_report.md       # 📊 브리핑 리포트
│   ├── AI_에이전트_트렌드_analysis.md     # 💬 Q&A 종합 분석
│   ├── AI_에이전트_트렌드_podcast.mp3     # 🎧 AI 팟캐스트
│   ├── AI_에이전트_트렌드_quiz.json       # 📝 학습 퀴즈
│   └── AI_에이전트_트렌드_slides.pptx     # 🎬 프레젠테이션 슬라이드
├── last_session.json                      # 마지막 세션 정보
└── research_sessions.jsonl                # 세션 기록
```

| 파일 | 설명 | 어떤 프리셋에서 만들어지나요? |
|------|------|----------------------------|
| 📊 `*_report.md` | AI가 영상 내용을 종합 정리한 문서 | 모든 프리셋 |
| 💬 `*_analysis.md` | AI에게 질문하여 얻은 심층 분석 | 모든 프리셋 |
| 🎧 `*_podcast.mp3` | 두 AI 진행자가 대화하는 오디오 | learning |
| 📝 `*_quiz.json` | 내용 확인용 퀴즈 | learning |
| 🎬 `*_slides.pptx` | 발표용 슬라이드 | presentation |

## 더 세밀하게 조정하기

### 검색 옵션

```bash
/research search AI 에이전트 -n 15 -d    # 최신순으로 15개 검색
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-n <숫자>` | YouTube에서 가져올 검색 결과 수 | 10 |
| `-d` | 최신순 정렬 | 꺼짐 |

### 실행 옵션

```bash
/research run AI -n 15 --top 3 --auto    # 15개 검색 후 상위 3개만 수집
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--auto` | 확인 없이 자동 실행 | 꺼짐 |
| `--preset <이름>` | 프리셋 선택 | default |
| `--top <N>` | 검색 결과 중 수집할 상위 N개 | 프리셋별 다름 |
| `--notebook <id>` | 기존 노트북에 추가 수집 | 새로 만들기 |
| `--lang <코드>` | 결과물 언어 (예: ko, en) | ko |

#### `-n`과 `--top`의 차이

- **`-n`**: YouTube에서 **검색 결과를 몇 개 가져올지** (넓게 훑기)
- **`--top`**: 그중에서 **실제로 몇 개를 골라 분석할지** (좁혀서 깊게)

예를 들어 `-n 15 --top 3`이면: 15개를 검색해서 보여주고, 그중 상위 3개만 골라서 AI에게 분석을 맡겨요.

### 단계별 수동 실행

자동 실행 대신 각 단계를 직접 진행할 수도 있어요:

```bash
/research search AI 에이전트           # 1. YouTube 검색
/research collect                     # 2. 선택한 영상을 NotebookLM에 수집
/research analyze <notebook-id>       # 3. AI 분석
/research export <notebook-id>        # 4. 파일 내보내기
/research status                      # 현재 진행 상황 확인
```

## 문제가 생기면

<p align="center">
  <img src="assets/error-handling.png" alt="NLM Research Error Handling" width="100%">
</p>

대부분의 문제는 시스템이 알아서 처리합니다:

| 단계 | 상황 | 어떻게 되나요? |
|------|------|---------------|
| 🟢 **자동 해결** | 로그인이 만료됨, 요청이 너무 많음 | 시스템이 알아서 다시 시도해요 |
| 🟡 **건너뛰고 계속** | 일부 영상 수집 실패 | 실패한 것만 건너뛰고 나머지로 계속 진행해요 |
| 🔴 **멈추고 안내** | 로그인 자체가 안 됨, 영상을 하나도 못 찾음 | 멈추고 어떻게 해야 하는지 알려줘요 |

### 자주 발생하는 문제

| 상황 | 해결 방법 |
|------|----------|
| "NotebookLM 인증이 필요합니다" | 터미널에서 `nlm login` 실행 |
| 특정 영상 수집 실패 | 비공개/삭제된 영상이에요 — 자동으로 건너뜁니다 |
| 리포트가 안 만들어져요 | `/research status`로 현황 확인 후 재시도 |
| 영상을 하나도 못 찾았어요 | 검색 키워드를 바꿔서 다시 해보세요 |

## 프로젝트 구조

```
nlm-research/
├── README.md                              # English (default)
├── README_KO.md                           # 이 문서 (한국어)
├── assets/                                # 문서에 사용된 이미지
├── .claude/commands/research/
│   ├── SKILL.md                         # 명령어 분배
│   ├── DESIGN.md                        # 시스템 설계
│   ├── run.md                           # 자동 실행
│   ├── search.md                        # YouTube 검색
│   ├── collect.md                       # 영상 수집
│   ├── analyze.md                       # AI 분석
│   ├── export.md                        # 파일 내보내기
│   ├── status.md                        # 현황 조회
│   ├── scripts/
│   │   └── youtube_search.py            # YouTube 검색 스크립트
│   └── references/
│       ├── nlm-commands.md              # NotebookLM 명령어 참고
│       └── workflow-examples.md         # 활용 예시
└── ~/research-output/                   # 결과물 저장 (자동 생성)
```

## 기여

기여를 환영합니다! 다음 절차를 따라주세요:

1. 이 리포지토리를 Fork합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feat/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'feat: 멋진 기능 추가'`)
4. 브랜치에 Push합니다 (`git push origin feat/amazing-feature`)
5. Pull Request를 생성합니다

## 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE)로 배포됩니다.
