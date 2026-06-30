"""
Node: update_class_events

Stores date-scoped overrides in the ``"overrides"`` array of
``class_events.json``.  The base weekly schedule is **never**
permanently modified — overrides carry an ``overrideDate`` and are
applied at read-time by the routine service.

Supported operations
--------------------
- ``cancel_class``     – marks a base event as cancelled for one date
- ``add_extra_class``  – adds a one-off class entry for a date
- ``change_room``      – overrides the room for a date
- ``change_time``      – overrides start/end for a date
- ``change_teacher``   – overrides the teacher(s) for a date
- ``replace_class``    – cancel one event + add another for the same date
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import CLASS_EVENTS_FILE, TIMEZONE
from app.graph.state import WorkflowState
from app.services.json_store import read_json, write_json

_tz = ZoneInfo(TIMEZONE)


def _find_event_id(
    events: list[dict], day: str, target_course_ids: list[str]
) -> str | None:
    """Find the base event ID matching a day + any of the target courses."""
    for event in events:
        if event.get("day") != day:
            continue
        if any(cid in event.get("courseIds", []) for cid in target_course_ids):
            return event["id"]
    return None


def update_class_events(state: WorkflowState) -> dict:
    llm_result = state["llm_result"]
    operation = llm_result.get("operation", "")
    data: dict = dict(llm_result.get("data", {}))
    now_iso = datetime.now(_tz).isoformat()

    ce_data = read_json(CLASS_EVENTS_FILE)
    if "overrides" not in ce_data:
        ce_data["overrides"] = []

    base_events = ce_data.get("classEvents", [])
    override_date = data.get("date", datetime.now(_tz).strftime("%Y-%m-%d"))
    source_msg_id = llm_result.get("sourceMessageId", "")

    # ── cancel_class ──────────────────────────────────────────────────
    if operation == "cancel_class":
        target_cids = data.get("targetCourseIds", [])
        day = data.get("day", "")
        target_eid = (
            _find_event_id(base_events, day, target_cids)
            or (data.get("targetClassEventIds") or [None])[0]
        )
        ce_data["overrides"].append(
            {
                "id": f"override-cancel-{override_date}-{'-'.join(target_cids)}",
                "overrideDate": override_date,
                "targetEventId": target_eid,
                "operation": "cancel_class",
                "data": data,
                "sourceMessageId": source_msg_id,
                "createdAt": now_iso,
            }
        )

    # ── add_extra_class ───────────────────────────────────────────────
    elif operation == "add_extra_class":
        extra = dict(data)
        if "id" not in extra:
            cstr = "-".join(data.get("courseIds", ["extra"]))
            tstr = data.get("start", "0000").replace(":", "")
            extra["id"] = f"extra-{override_date}-{cstr}-{tstr}"

        ce_data["overrides"].append(
            {
                "id": f"override-extra-{override_date}-{'-'.join(data.get('courseIds', []))}",
                "overrideDate": override_date,
                "targetEventId": None,
                "operation": "add_extra_class",
                "data": extra,
                "sourceMessageId": source_msg_id,
                "createdAt": now_iso,
            }
        )

    # ── change_room / change_time / change_teacher ────────────────────
    elif operation in ("change_room", "change_time", "change_teacher"):
        target_cids = data.get("targetCourseIds", [])
        day = data.get("day", "")
        target_eid = _find_event_id(base_events, day, target_cids)
        changes = data.get("changes", {})

        ce_data["overrides"].append(
            {
                "id": f"override-{operation}-{override_date}-{'-'.join(target_cids)}",
                "overrideDate": override_date,
                "targetEventId": target_eid,
                "operation": operation,
                "data": changes,
                "sourceMessageId": source_msg_id,
                "createdAt": now_iso,
            }
        )

    # ── replace_class ─────────────────────────────────────────────────
    elif operation == "replace_class":
        target_cids = data.get("targetCourseIds", [])
        day = data.get("day", "")
        target_eid = _find_event_id(base_events, day, target_cids)

        # Cancel the original
        ce_data["overrides"].append(
            {
                "id": f"override-cancel-{override_date}-{'-'.join(target_cids)}",
                "overrideDate": override_date,
                "targetEventId": target_eid,
                "operation": "cancel_class",
                "data": {"status": "cancelled", "reason": "Replaced by another class"},
                "sourceMessageId": source_msg_id,
                "createdAt": now_iso,
            }
        )

        # Add the replacement
        replacement = data.get("replacement", {})
        if replacement:
            rep_cids = replacement.get("courseIds", [])
            ce_data["overrides"].append(
                {
                    "id": f"override-replace-{override_date}-{'-'.join(rep_cids)}",
                    "overrideDate": override_date,
                    "targetEventId": None,
                    "operation": "add_extra_class",
                    "data": replacement,
                    "sourceMessageId": source_msg_id,
                    "createdAt": now_iso,
                }
            )

    write_json(CLASS_EVENTS_FILE, ce_data)
    print(f"[update] Class event override: {operation} on {override_date}")

    return {
        "updates_applied": [
            {
                "type": "class_event_update",
                "operation": operation,
                "summary": llm_result.get("summary", ""),
            }
        ]
    }
