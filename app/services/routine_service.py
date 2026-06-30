"""
Routine service — computes widget-ready data from the raw JSON files.

Handles day mapping for the Bangladeshi academic week (Sat–Wed active,
Thu–Fri off) and merges date-scoped overrides from ``class_events.json``
to produce a dynamic daily schedule.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import (
    CLASS_EVENTS_FILE,
    HIGHLIGHTS_FILE,
    IMPORTANT_NOTICES_FILE,
    TIMEZONE,
)
from app.services.json_store import read_json

_tz = ZoneInfo(TIMEZONE)

# Python weekday() → Bangladeshi academic day name
_DAY_MAP: dict[int, str] = {
    5: "saturday",
    6: "sunday",
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
}


def _today_day_name() -> str:
    return _DAY_MAP[datetime.now(_tz).weekday()]


def _today_date_str() -> str:
    return datetime.now(_tz).strftime("%Y-%m-%d")


# ─── Classes ─────────────────────────────────────────────────────────


def get_today_classes() -> list[dict]:
    """
    Return today's class schedule with date-scoped overrides applied.

    Overrides are stored under the ``"overrides"`` key inside
    ``class_events.json`` and carry an ``overrideDate`` field so they
    only apply to a single calendar day.
    """
    data = read_json(CLASS_EVENTS_FILE)
    events = data.get("classEvents", [])
    overrides = data.get("overrides", [])

    today_day = _today_day_name()
    today_date = _today_date_str()

    # Base events for today's weekday
    base_events = [e for e in events if e.get("day") == today_day]

    # Filter overrides for today's calendar date
    today_overrides = [o for o in overrides if o.get("overrideDate") == today_date]

    # Categorise overrides
    cancelled_ids: set[str] = set()
    extra_classes: list[dict] = []
    modifications: dict[str, dict] = {}

    for ovr in today_overrides:
        op = ovr.get("operation")
        target_id = ovr.get("targetEventId")

        if op == "cancel_class" and target_id:
            cancelled_ids.add(target_id)
        elif op == "add_extra_class":
            extra_data = ovr.get("data", {})
            if extra_data:
                extra_classes.append(extra_data)
        elif op in ("change_room", "change_time", "change_teacher") and target_id:
            if target_id not in modifications:
                modifications[target_id] = {}
            modifications[target_id].update(ovr.get("data", {}))

    # Merge
    result: list[dict] = []
    for event in base_events:
        eid = event["id"]
        copy = dict(event)
        if eid in cancelled_ids:
            copy["status"] = "cancelled"
        if eid in modifications:
            copy.update(modifications[eid])
        result.append(copy)

    result.extend(extra_classes)
    result.sort(key=lambda e: e.get("slotStart", 99))
    return result


def get_current_class() -> dict | None:
    """Return the class that is currently in session, or ``None``."""
    now = datetime.now(_tz)
    cur = now.strftime("%H:%M")
    for cls in get_today_classes():
        if cls.get("status") == "cancelled":
            continue
        if cls.get("start", "") <= cur <= cls.get("end", ""):
            return cls
    return None


def get_next_class() -> dict | None:
    """Return the next upcoming class for today, or ``None``."""
    now = datetime.now(_tz)
    cur = now.strftime("%H:%M")
    for cls in get_today_classes():
        if cls.get("status") == "cancelled":
            continue
        if cls.get("start", "") > cur:
            return cls
    return None


# ─── Notices ─────────────────────────────────────────────────────────


def get_active_notices() -> list[dict]:
    """Return notices whose ``showUntil`` has not yet passed."""
    data = read_json(IMPORTANT_NOTICES_FILE)
    notices = data.get("importantNotices", [])
    now = datetime.now(_tz)

    active: list[dict] = []
    for notice in notices:
        show_until = notice.get("showUntil")
        if show_until:
            try:
                until_dt = datetime.fromisoformat(show_until)
                if until_dt > now:
                    active.append(notice)
            except (ValueError, TypeError):
                active.append(notice)
        else:
            active.append(notice)
    return active


# ─── Highlights ──────────────────────────────────────────────────────


def get_weekly_highlights() -> list[dict]:
    """Return the weekly highlights list (already capped at MAX_HIGHLIGHTS)."""
    data = read_json(HIGHLIGHTS_FILE)
    return data.get("weeklyHighlights", [])


# ─── Widget aggregate ───────────────────────────────────────────────


def get_widget_state() -> dict:
    """Single payload combining everything the Android widget needs."""
    now = datetime.now(_tz)
    return {
        "todayClasses": get_today_classes(),
        "currentClass": get_current_class(),
        "nextClass": get_next_class(),
        "importantNotices": get_active_notices(),
        "weeklyHighlights": get_weekly_highlights(),
        "lastUpdated": now.isoformat(),
        "today": now.strftime("%A, %B %d, %Y"),
        "currentTime": now.strftime("%I:%M %p"),
    }
