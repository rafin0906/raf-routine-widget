"""
Node: update_highlights

Appends a new highlight entry to ``highlights.json`` and trims the
list to the latest ``MAX_HIGHLIGHTS`` items (oldest dropped first).
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import HIGHLIGHTS_FILE, MAX_HIGHLIGHTS, TIMEZONE
from app.graph.state import WorkflowState
from app.services.json_store import read_json, write_json

_tz = ZoneInfo(TIMEZONE)


def update_highlights(state: WorkflowState) -> dict:
    llm_result = state["llm_result"]
    data: dict = dict(llm_result.get("data", {}))

    highlights_data = read_json(HIGHLIGHTS_FILE)
    highlights: list[dict] = highlights_data.get("weeklyHighlights", [])

    # Auto-generate ID if missing
    if "id" not in data:
        date = data.get("date", datetime.now(_tz).strftime("%Y-%m-%d"))
        course = "-".join(data.get("courseIds", ["unknown"])).lower()
        h_type = data.get("type", "unknown")
        data["id"] = f"wh-{date}-{course}-{h_type}"

    # Avoid duplicates
    existing_ids = {h["id"] for h in highlights}
    if data["id"] not in existing_ids:
        highlights.append(data)

    # Sort newest-first and keep only the latest MAX_HIGHLIGHTS
    highlights.sort(key=lambda h: h.get("date", ""), reverse=True)
    highlights = highlights[:MAX_HIGHLIGHTS]

    highlights_data["weeklyHighlights"] = highlights
    write_json(HIGHLIGHTS_FILE, highlights_data)

    print(f"[update] Highlight added: {data.get('id')}")

    return {
        "updates_applied": [
            {
                "type": "weekly_highlight",
                "id": data["id"],
                "summary": llm_result.get("summary", ""),
            }
        ]
    }
