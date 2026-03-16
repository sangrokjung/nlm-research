#!/usr/bin/env python3
"""YouTube 검색 + 자막 추출 스크립트 - yt-dlp 기반"""

import subprocess
import json
import argparse
import shutil
import sys
import tempfile
import os
import re


def extract_subtitle(url: str, langs: str = "ko,en", text_only: bool = False, sub_format: str = "srt") -> str:
    """YouTube 영상에서 자막을 추출하여 반환"""
    if not shutil.which("yt-dlp"):
        print("오류: yt-dlp가 설치되어 있지 않습니다.", file=sys.stderr)
        print("설치 방법: brew install yt-dlp 또는 pip install yt-dlp", file=sys.stderr)
        sys.exit(1)

    with tempfile.TemporaryDirectory() as tmpdir:
        output_template = os.path.join(tmpdir, "sub")
        cmd = [
            "yt-dlp",
            "--write-subs",
            "--write-auto-subs",
            "--sub-langs", langs,
            "--sub-format", sub_format,
            "--skip-download",
            "--quiet",
            "--no-warnings",
            "-o", output_template,
            url,
        ]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        except subprocess.TimeoutExpired:
            print("오류: 자막 다운로드 시간 초과 (60초).", file=sys.stderr)
            sys.exit(1)

        if proc.returncode != 0:
            print(f"오류: yt-dlp 자막 추출 실패\n{proc.stderr}", file=sys.stderr)
            sys.exit(1)

        # 다운로드된 자막 파일 찾기 (언어 우선순위: langs 순서)
        sub_file = None
        for lang in langs.split(","):
            lang = lang.strip()
            for ext in [sub_format, "vtt", "srt"]:
                candidate = os.path.join(tmpdir, f"sub.{lang}.{ext}")
                if os.path.exists(candidate):
                    sub_file = candidate
                    break
            if sub_file:
                break

        if not sub_file:
            # 아무 자막 파일이나 찾기
            for f in os.listdir(tmpdir):
                if f.endswith((".srt", ".vtt", ".ass", ".lrc")):
                    sub_file = os.path.join(tmpdir, f)
                    break

        if not sub_file:
            print("오류: 사용 가능한 자막이 없습니다.", file=sys.stderr)
            sys.exit(1)

        with open(sub_file, encoding="utf-8") as f:
            content = f.read()

        if text_only:
            # SRT/VTT 타임스탬프 및 메타데이터 제거, 텍스트만 추출
            lines = content.split("\n")
            text_lines = []
            for line in lines:
                line = line.strip()
                # SRT 시퀀스 번호 건너뛰기
                if re.match(r"^\d+$", line):
                    continue
                # SRT/VTT 타임스탬프 건너뛰기
                if re.match(r"^\d{2}:\d{2}[:\.]", line):
                    continue
                # VTT 헤더 건너뛰기
                if line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
                    continue
                # HTML 태그 제거
                line = re.sub(r"<[^>]+>", "", line)
                # 빈 줄 건너뛰기
                if not line:
                    continue
                # 중복 줄 제거 (VTT 자동자막 특성)
                if text_lines and line == text_lines[-1]:
                    continue
                text_lines.append(line)
            return "\n".join(text_lines)

        return content


def list_subtitles(url: str) -> str:
    """YouTube 영상의 사용 가능한 자막 목록 반환"""
    if not shutil.which("yt-dlp"):
        print("오류: yt-dlp가 설치되어 있지 않습니다.", file=sys.stderr)
        sys.exit(1)

    cmd = ["yt-dlp", "--list-subs", "--skip-download", "--quiet", url]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        print("오류: 자막 목록 조회 시간 초과.", file=sys.stderr)
        sys.exit(1)

    return proc.stdout


def search_youtube(query: str, max_results: int = 10, sort_by_date: bool = False) -> list[dict]:
    """YouTube에서 키워드 검색하여 영상 메타데이터 반환"""
    if not shutil.which("yt-dlp"):
        print("오류: yt-dlp가 설치되어 있지 않습니다.", file=sys.stderr)
        print("설치 방법: brew install yt-dlp 또는 pip install yt-dlp", file=sys.stderr)
        sys.exit(1)

    cmd = [
        "yt-dlp",
        f"ytsearch{max_results}:{query}",
        "--dump-json",
        "--no-download",
        "--no-playlist",
        "--quiet",
        "--no-warnings",
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        print("오류: 검색 시간이 초과되었습니다 (120초). 네트워크를 확인해주세요.", file=sys.stderr)
        sys.exit(1)

    if proc.returncode != 0 and not proc.stdout.strip():
        print(f"오류: yt-dlp 실행 실패\n{proc.stderr}", file=sys.stderr)
        sys.exit(1)

    results = []
    for line in proc.stdout.strip().split("\n"):
        if not line.strip():
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        results.append({
            "title": data.get("title", ""),
            "url": f"https://youtube.com/watch?v={data.get('id', '')}",
            "channel": data.get("channel", data.get("uploader", "")),
            "views": data.get("view_count", 0),
            "duration": data.get("duration", 0),
            "upload_date": data.get("upload_date", ""),
            "description": data.get("description", "")[:200],
        })

    if not results:
        print(f"'{query}' 검색 결과가 없습니다.", file=sys.stderr)

    # 최신순 정렬 (ytsearchdate 미지원으로 후처리)
    if sort_by_date and results:
        results.sort(key=lambda x: x.get("upload_date", ""), reverse=True)

    return results


def format_views(views) -> str:
    """조회수를 읽기 좋은 형식으로 변환"""
    if not isinstance(views, int):
        return str(views)
    if views >= 10_000:
        return f"{views / 10_000:.1f}만"
    return f"{views:,}"


def format_duration(seconds) -> str:
    """초를 '분:초' 형식으로 변환"""
    if not seconds:
        return "0:00"
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def main():
    parser = argparse.ArgumentParser(description="YouTube 검색 + 자막 추출 (yt-dlp 기반)")

    parser.add_argument("query", nargs="?", help="검색 키워드 또는 영상 URL")
    parser.add_argument("-n", "--num", type=int, default=10, help="결과 수 (기본: 10)")
    parser.add_argument("-d", "--date", action="store_true", help="최신순 정렬")
    parser.add_argument("--json", action="store_true", help="JSON 출력")
    parser.add_argument("--urls-only", action="store_true", help="URL만 출력 (NotebookLM 붙여넣기용)")

    # 자막 추출
    parser.add_argument("--subtitle", action="store_true", help="자막 추출 모드")
    parser.add_argument("--sub-langs", default="ko,en", help="자막 언어 (기본: ko,en)")
    parser.add_argument("--sub-format", default="srt", choices=["srt", "vtt", "ass", "lrc"], help="자막 형식 (기본: srt)")
    parser.add_argument("--text-only", action="store_true", help="타임스탬프 제거, 텍스트만 출력")
    parser.add_argument("--list-subs", action="store_true", help="사용 가능한 자막 목록 확인")

    args = parser.parse_args()

    if not args.query:
        parser.print_help()
        sys.exit(1)

    # 자막 목록 확인 모드
    if args.list_subs:
        result = list_subtitles(args.query)
        print(result)
        sys.exit(0)

    # 자막 추출 모드
    if args.subtitle:
        result = extract_subtitle(
            url=args.query,
            langs=args.sub_langs,
            text_only=args.text_only,
            sub_format=args.sub_format,
        )
        print(result)
        sys.exit(0)

    # 검색 모드
    results = search_youtube(args.query, args.num, args.date)

    if not results:
        sys.exit(0)

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    elif args.urls_only:
        for r in results:
            print(r["url"])
    else:
        for i, r in enumerate(results, 1):
            date_str = r["upload_date"]
            if len(date_str) == 8:
                date_str = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
            print(f"\n[{i}] {r['title']}")
            print(f"    채널: {r['channel']}")
            print(f"    조회수: {format_views(r['views'])} | 길이: {format_duration(r['duration'])}")
            print(f"    날짜: {date_str}")
            print(f"    URL: {r['url']}")


if __name__ == "__main__":
    main()
