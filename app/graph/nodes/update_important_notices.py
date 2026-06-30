"""
Node: update_important_notices

Appends a new notice to ``important_notices.json``, auto-generating
missing fields (id, timestamps) when the LLM omits them.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import IMPORTANT_NOTICES_FILE, TIMEZONE
from app.graph.state import WorkflowState
from app.services.json_store import read_json, write_json

_tz = ZoneInfo(TIMEZONE)


def update_important_notices(state: WorkflowState) -> dict:
    llm_result = state["llm_result"]
    data: dict = dict(llm_result.get("data", {}))

    notices_data = read_json(IMPORTANT_NOTICES_FILE)
    notices: list[dict] = notices_data.get("importantNotices", [])

    now = datetime.now(_tz)

    # ── Auto-fill missing fields ─────────────────────────────────────
    if "id" not in data:
        date = data.get("date", now.strftime("%Y-%m-%d"))
        slug = (
            data.get("title", "notice")
            .lower()
            .replace(" ", "-")[:30]
        )
        data["id"] = f"notice-{date}-{slug}"

    if "startsAt" not in data:
        data["startsAt"] = now.isoformat()

    if "endsAt" not in data:
        date_str = data.get("date", now.strftime("%Y-%m-%d"))
        data["endsAt"] = f"{date_str}T23:59:59+06:00"

    if "showUntil" not in data:
        data["showUntil"] = data.get(
            "endsAt",
            (now + timedelta(days=2)).isoformat(),
        )

    # ── Avoid duplicates ─────────────────────────────────────────────
    existing_ids = {n["id"] for n in notices}
    if data["id"] not in existing_ids:
        notices.append(data)

    notices_data["importantNotices"] = notices
    write_json(IMPORTANT_NOTICES_FILE, notices_data)

    print(f"[update] Notice added: {data.get('id')}")

    return {
        "updates_applied": [
            {
                "type": "important_notice",
                "id": data["id"],
                "summary": llm_result.get("summary", ""),
            }
        ]
    }
