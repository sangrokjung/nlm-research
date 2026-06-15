#!/usr/bin/env python3
"""Launch the research GUI: start the local server and open the browser.

    python gui/run.py            # http://127.0.0.1:8765

localhost-bound by design (ADR-0012). Requires: pip install -r gui/requirements.txt
"""
from __future__ import annotations

import threading
import webbrowser

import uvicorn

from backend import config


def _open_browser() -> None:
    webbrowser.open(f"http://{config.HOST}:{config.PORT}")


def main() -> None:
    print(f"Research GUI -> http://{config.HOST}:{config.PORT}  (Ctrl+C to stop)")
    threading.Timer(1.2, _open_browser).start()
    uvicorn.run("backend.app:app", host=config.HOST, port=config.PORT, reload=False)


if __name__ == "__main__":
    main()
