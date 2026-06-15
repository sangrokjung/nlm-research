#!/usr/bin/env python3
"""YouTube search + subtitle extraction script, powered by yt-dlp."""

import subprocess
import json
import argparse
import shutil
import sys
import tempfile
import os
import re


def extract_subtitle(url: str, langs: str = "en", text_only: bool = False, sub_format: str = "srt") -> str:
    """Extract subtitles from a YouTube video and return the content."""
    if not shutil.which("yt-dlp"):
        print("Error: yt-dlp is not installed.", file=sys.stderr)
        print("Install: brew install yt-dlp  (or  pip install yt-dlp)", file=sys.stderr)
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
            print("Error: subtitle download timed out (60s).", file=sys.stderr)
            sys.exit(1)

        if proc.returncode != 0:
            print(f"Error: yt-dlp subtitle extraction failed\n{proc.stderr}", file=sys.stderr)
            sys.exit(1)

        # Find the downloaded subtitle file (language priority follows `langs` order)
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
            # Fall back to any available subtitle file
            for f in os.listdir(tmpdir):
                if f.endswith((".srt", ".vtt", ".ass", ".lrc")):
                    sub_file = os.path.join(tmpdir, f)
                    break

        if not sub_file:
            print("Error: no usable subtitles available.", file=sys.stderr)
            sys.exit(1)

        with open(sub_file, encoding="utf-8") as f:
            content = f.read()

        if text_only:
            # Strip SRT/VTT timestamps and metadata, keep only text lines
            lines = content.split("\n")
            text_lines = []
            for line in lines:
                line = line.strip()
                # Skip SRT sequence numbers
                if re.match(r"^\d+$", line):
                    continue
                # Skip SRT/VTT timestamps
                if re.match(r"^\d{2}:\d{2}[:\.]", line):
                    continue
                # Skip VTT headers
                if line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
                    continue
                # Strip HTML tags
                line = re.sub(r"<[^>]+>", "", line)
                # Skip blank lines
                if not line:
                    continue
                # Drop consecutive duplicates (common in VTT auto-captions)
                if text_lines and line == text_lines[-1]:
                    continue
                text_lines.append(line)
            return "\n".join(text_lines)

        return content


def list_subtitles(url: str) -> str:
    """Return the list of available subtitles for a YouTube video."""
    if not shutil.which("yt-dlp"):
        print("Error: yt-dlp is not installed.", file=sys.stderr)
        sys.exit(1)

    cmd = ["yt-dlp", "--list-subs", "--skip-download", "--quiet", url]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        print("Error: subtitle list lookup timed out.", file=sys.stderr)
        sys.exit(1)

    return proc.stdout


def search_youtube(query: str, max_results: int = 10, sort_by_date: bool = False) -> list[dict]:
    """Search YouTube for a keyword and return video metadata."""
    if not shutil.which("yt-dlp"):
        print("Error: yt-dlp is not installed.", file=sys.stderr)
        print("Install: brew install yt-dlp  (or  pip install yt-dlp)", file=sys.stderr)
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
        print("Error: search timed out (120s). Check your network connection.", file=sys.stderr)
        sys.exit(1)

    if proc.returncode != 0 and not proc.stdout.strip():
        print(f"Error: yt-dlp failed\n{proc.stderr}", file=sys.stderr)
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
        print(f"No results found for '{query}'.", file=sys.stderr)

    # Newest-first sorting (ytsearchdate is unreliable, so post-sort here)
    if sort_by_date and results:
        results.sort(key=lambda x: x.get("upload_date", ""), reverse=True)

    return results


def format_views(views) -> str:
    """Format the view count into a human-friendly string."""
    if not isinstance(views, int):
        return str(views)
    if views >= 1_000_000:
        return f"{views / 1_000_000:.1f}M"
    if views >= 1_000:
        return f"{views / 1_000:.1f}K"
    return f"{views:,}"


def format_duration(seconds) -> str:
    """Format seconds as 'minutes:seconds'."""
    if not seconds:
        return "0:00"
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def main():
    parser = argparse.ArgumentParser(description="YouTube search + subtitle extraction (yt-dlp powered)")

    parser.add_argument("query", nargs="?", help="Search keyword or a video URL")
    parser.add_argument("-n", "--num", type=int, default=10, help="Number of results (default: 10)")
    parser.add_argument("-d", "--date", action="store_true", help="Sort by newest first")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--urls-only", action="store_true", help="Print only the URLs (useful for pasting into NotebookLM)")

    # Subtitle extraction
    parser.add_argument("--subtitle", action="store_true", help="Subtitle extraction mode")
    parser.add_argument("--sub-langs", default="en", help="Subtitle languages (default: en)")
    parser.add_argument("--sub-format", default="srt", choices=["srt", "vtt", "ass", "lrc"], help="Subtitle format (default: srt)")
    parser.add_argument("--text-only", action="store_true", help="Strip timestamps, output text only")
    parser.add_argument("--list-subs", action="store_true", help="List available subtitle tracks")

    args = parser.parse_args()

    if not args.query:
        parser.print_help()
        sys.exit(1)

    # List available subtitles
    if args.list_subs:
        result = list_subtitles(args.query)
        print(result)
        sys.exit(0)

    # Subtitle extraction
    if args.subtitle:
        result = extract_subtitle(
            url=args.query,
            langs=args.sub_langs,
            text_only=args.text_only,
            sub_format=args.sub_format,
        )
        print(result)
        sys.exit(0)

    # Search mode
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
            print(f"    Channel: {r['channel']}")
            print(f"    Views: {format_views(r['views'])} | Length: {format_duration(r['duration'])}")
            print(f"    Date: {date_str}")
            print(f"    URL: {r['url']}")


if __name__ == "__main__":
    main()
