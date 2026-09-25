"""
run.py — Custom uvicorn launcher for Offside AI backend.

WHY THIS EXISTS:
  On Windows, asyncio.create_subprocess_exec requires ProactorEventLoop.
  Uvicorn uses SelectorEventLoop by default.  Setting the loop policy inside
  app/main.py is too late because uvicorn has already created the event loop
  before it imports the application module.

  This launcher sets WindowsProactorEventLoopPolicy BEFORE calling
  uvicorn.run(), ensuring the event loop created by asyncio.run() inside
  uvicorn is a ProactorEventLoop.

USAGE (from the backend/ directory):
  python run.py
"""

import sys
import asyncio

# ── Set Windows event loop policy BEFORE uvicorn creates any event loop ───────
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
# ─────────────────────────────────────────────────────────────────────────────

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        reload_dirs=["app"],
    )
