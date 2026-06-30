"""
Adaptive background scheduler.

Runs as a single ``asyncio.Task`` started from FastAPI's lifespan.
On every tick (default 60 s) it:

1. Calculates the required scrape interval based on the current time.
2. Checks when the last scrape completed.
3. If enough time has elapsed **and** no scrape is in progress, runs the
   full scrape → LangGraph pipeline in a thread pool.

The scraper uses ``asyncio.Lock`` so at most one scrape can run at a time.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import (
    ACTIVE_INTERVAL_MINUTES,
    CLASS_ACTIVE_END,
    CLASS_ACTIVE_START,
    CLASS_EVENTS_FILE,
    NIGHT_END,
    NIGHT_INTERVAL_MINUTES,
    NIGHT_START,
    OFF_HOUR_INTERVAL_MINUTES,
    SCHEDULER_TICK_SECONDS,
    TIMEZONE,
    TRANSITION_INTERVAL_MINUTES,
    TRANSITION_WINDOW_MINUTES,
)
from app.services.json_store import read_json

_tz = ZoneInfo(TIMEZONE)

# ─── Scheduler state (module-level singletons) ──────────────────────
scraper_lock = asyncio.Lock()

_last_scrape_time: datetime | None = None
_last_error: str | None = None
_last_processed_count: int = 0
_is_running: bool = False

# Python weekday() → academic day name (same map used in routine_service)
_DAY_MAP: dict[int, str] = {
    5: "saturday", 6: "sunday", 0: "monday",
    1: "tuesday", 2: "wednesday", 3: "thursday", 4: "friday",
}


# ─── Interval calculation ───────────────────────────────────────────

def _hm(t: str) -> int:
    """Parse ``"HH:MM"`` to minutes-since-midnight."""
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _class_transition_minutes(now: datetime) -> list[int]:
    """Return minutes-since-midnight for every class start/end today."""
    day_name = _DAY_MAP.get(now.weekday(), "")
    data = read_json(CLASS_EVENTS_FILE)
    events = [e for e in data.get("classEvents", []) if e.get("day") == day_name]

    mins: list[int] = []
    for ev in events:
        for key in ("start", "end"):
            val = ev.get(key, "")
            if val:
                mins.append(_hm(val))
    return mins


def calculate_interval(now: datetime) -> timedelta:
    """Return the ideal scrape interval for the given moment."""
    cur = now.hour * 60 + now.minute
    night_start = _hm(NIGHT_START)
    night_end = _hm(NIGHT_END)
    active_start = _hm(CLASS_ACTIVE_START)
    active_end = _hm(CLASS_ACTIVE_END)

    # Night: 23:00 – 07:00
    if cur >= night_start or cur < night_end:
        return timedelta(minutes=NIGHT_INTERVAL_MINUTES)

    # Active class hours: 07:00 – 17:00
    if active_start <= cur < active_end:
        transitions = _class_transition_minutes(now)
        for t in transitions:
            if abs(cur - t) <= TRANSITION_WINDOW_MINUTES:
                return timedelta(minutes=TRANSITION_INTERVAL_MINUTES)
        return timedelta(minutes=ACTIVE_INTERVAL_MINUTES)

    # Off hours: 17:00 – 23:00
    return timedelta(minutes=OFF_HOUR_INTERVAL_MINUTES)


# ─── Scrape + process pipeline ──────────────────────────────────────

async def run_scrape_and_process() -> None:
    """Run the scraper then the LangGraph workflow (both in threads)."""
    global _last_scrape_time, _last_error, _last_processed_count, _is_running  # noqa: PLW0603

    _is_running = True
    try:
        from app.scraper.whatsapp_scraper import scrape_recent_messages

        print("[scheduler] Starting scrape…")
        scrape_result = await asyncio.to_thread(scrape_recent_messages)

        if scrape_result.get("error"):
            _last_error = scrape_result["error"]
            print(f"[scheduler] Scrape error: {_last_error}")
            return

        print(
            f"[scheduler] Scrape done — "
            f"{scrape_result.get('totalNewMessages', 0)} new message(s)"
        )

        from app.graph.workflow import run_workflow

        result = await asyncio.to_thread(run_workflow)

        _last_scrape_time = datetime.now(_tz)
        _last_processed_count = len(result.get("updates_applied", []))
        _last_error = None

    except Exception as exc:  # noqa: BLE001
        _last_error = str(exc)
        print(f"[scheduler] Pipeline error: {exc}")
    finally:
        _is_running = False


# ─── Main loop ───────────────────────────────────────────────────────

async def scheduler_loop() -> None:
    """Background loop — started by FastAPI lifespan, runs forever."""
    global _last_scrape_time  # noqa: PLW0603

    print("[scheduler] Adaptive scheduler started")

    while True:
        await asyncio.sleep(SCHEDULER_TICK_SECONDS)

        now = datetime.now(_tz)
        interval = calculate_interval(now)

        should_scrape = (
            _last_scrape_time is None
            or (now - _last_scrape_time) >= interval
        )

        if should_scrape and not scraper_lock.locked():
            async with scraper_lock:
                await run_scrape_and_process()


# ─── Status for the API ─────────────────────────────────────────────

def get_scheduler_status() -> dict:
    now = datetime.now(_tz)
    interval = calculate_interval(now)
    next_scrape = (
        (_last_scrape_time + interval) if _last_scrape_time else now
    )
    return {
        "lastScrapeTime": _last_scrape_time.isoformat() if _last_scrape_time else None,
        "nextPlannedScrape": next_scrape.isoformat(),
        "currentIntervalMinutes": interval.total_seconds() / 60,
        "isRunning": _is_running,
        "lastProcessedCount": _last_processed_count,
        "lastError": _last_error,
    }
