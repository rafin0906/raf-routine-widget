"""
Node: load_new_messages

Entry-point node that fetches unprocessed messages from
``message_service`` and loads reference data (courses, class events)
into the workflow state so later nodes can use them.
"""

from app.graph.state import WorkflowState
from app.services.message_service import get_unprocessed_messages
from app.services.json_store import read_json
from app.config import COURSES_FILE, CLASS_EVENTS_FILE


def load_new_messages(state: WorkflowState) -> dict:
    unprocessed = get_unprocessed_messages()
    courses = read_json(COURSES_FILE)
    class_events_data = read_json(CLASS_EVENTS_FILE)

    print(f"[workflow] Loaded {len(unprocessed)} unprocessed message(s)")

    return {
        "raw_messages": unprocessed,
        "courses_lookup": courses,
        "class_events_lookup": class_events_data.get("classEvents", []),
    }
