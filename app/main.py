"""
NeuraRUET — Dynamic Routine Widget API
=======================================

FastAPI server that:

* Serves widget-ready routine data from local JSON files.
* Runs an adaptive background scheduler to scrape WhatsApp groups.
* Processes new messages through a LangGraph agent.
* Exposes endpoints for manual scraping and status inspection.

Start with::

    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.scheduler import (
    get_scheduler_status,
    run_scrape_and_process,
    scheduler_loop,
    scraper_lock,
)
from app.services.routine_service import (
    get_active_notices,
    get_today_classes,
    get_weekly_highlights,
    get_widget_state,
)


# ─── Lifespan (start / stop the scheduler) ──────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(scheduler_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# ─── App ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="NeuraRUET Routine Widget API",
    description="Dynamic routine widget backend for RUET CSE 2nd Year",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ───────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Simple liveness check."""
    return {"status": "ok", "service": "NeuraRUET"}


@app.get("/api/widget-state")
async def widget_state():
    """Full widget payload: today's classes, current/next class,
    notices, highlights, and metadata."""
    return get_widget_state()


@app.get("/api/classes/today")
async def classes_today():
    """Today's class schedule with dynamic overrides applied."""
    return {"classes": get_today_classes()}


@app.get("/api/notices")
async def notices():
    """Active important notices (filtered by showUntil)."""
    return {"notices": get_active_notices()}


@app.get("/api/highlights")
async def highlights():
    """Weekly highlights (latest 4)."""
    return {"highlights": get_weekly_highlights()}


@app.post("/api/scraper/run")
async def scraper_run():
    """Manually trigger a scrape + LangGraph processing cycle.

    Returns immediately with ``already_running`` if a scrape is in
    progress; otherwise waits for the pipeline to complete."""
    if scraper_lock.locked():
        return {
            "status": "already_running",
            "message": "Scraper is currently running. Try again later.",
        }

    async with scraper_lock:
        await run_scrape_and_process()

    return {"status": "completed", "scheduler": get_scheduler_status()}


@app.get("/api/scraper/status")
async def scraper_status():
    """Scheduler and scraper status: last scrape time, next planned
    scrape, current interval, running flag, last error."""
    return get_scheduler_status()


@app.get("/api/debug-screenshot")
async def debug_screenshot():
    """Returns the last debug screenshot from Playwright to help troubleshoot login issues."""
    import os
    from fastapi.responses import FileResponse
    path = os.path.join(os.getcwd(), "error_screenshot.png")
    if os.path.exists(path):
        return FileResponse(path)
    return {"error": "No debug screenshot found. Run the scraper first."}

