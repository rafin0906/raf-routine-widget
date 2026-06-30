"""
Node: mark_processed

Records the current message as processed in ``processed_messages.json``
so it is never re-sent to the LLM.
"""

import hashlib

from app.graph.state import WorkflowState
from app.services.message_service import mark_message_processed as _mark


def mark_processed(state: WorkflowState) -> dict:
    current = state.get("current_message", {})
    llm_result = state.get("llm_result") or {}

    msg_id = current.get("messageId", "")
    msg_text = current.get("text", "")
    msg_hash = hashlib.sha256(msg_text.encode("utf-8")).hexdigest()[:32]

    category = llm_result.get("category", "irrelevant")
    summary = llm_result.get("summary", "")

    _mark(msg_id, msg_hash, category, summary)

    print(f"[processed] {msg_id[:12]}… as {category}")

    # Return empty dict — updates_applied is only written by update nodes
    return {}
