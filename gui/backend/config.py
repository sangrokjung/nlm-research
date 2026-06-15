"""Configuration and path resolution for the research GUI backend.

Everything is anchored to the repo root so the GUI works from a fresh checkout,
and bound to localhost by design (ADR-0012: GUI is a local web app only).
"""
from pathlib import Path

# gui/backend/config.py -> parents[0]=backend, [1]=gui, [2]=repo root
REPO_ROOT = Path(__file__).resolve().parents[2]

# Reuse the exact script the CLI skill uses (ADR-0013: drive via nlm + scripts).
YOUTUBE_SEARCH = REPO_ROOT / ".claude" / "skills" / "research" / "scripts" / "youtube_search.py"

# Shared state with the CLI front-end, so sessions interoperate (ADR-0003).
OUTPUT_DIR = Path.home() / "research-output"

FRONTEND_DIR = REPO_ROOT / "gui" / "frontend"

# localhost-bind only; do not expose externally.
HOST = "127.0.0.1"
PORT = 8765
