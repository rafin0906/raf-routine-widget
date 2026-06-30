"""
Message service — new-message detection and processed-message tracking.

Uses a SHA-256 hash of (group_name + message_text) as a deterministic
message ID so the same raw text always maps to the same ID.
"""

import hashlib
from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import (
    MESSAGE_HISTORY_FILE,
    PROCESSED_MESSAGES_FILE,
    TIMEZONE,
)
from app.services.json_store import read_json, write_json

_tz = ZoneInfo(TIMEZONE)


def _generate_message_id(group_name: str, text: str) -> str:
    """Deterministic ID from group name + raw text."""
    content = f"{group_name}::{text}"
    return "wa-" + hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]


def get_processed_ids() -> set[str]:
    """Return the set of message IDs already processed by the LLM."""
    data = read_json(PROCESSED_MESSAGES_FILE)
    return {msg["messageId"] for msg in data.get("processedMessages", [])}


def get_unprocessed_messages() -> list[dict]:
    """
    Compare ``message_history.json`` against ``processed_messages.json``.

    Returns a list of structured dicts for every message that has NOT
    yet been sent through the LangGraph workflow.
    """
    history = read_json(MESSAGE_HISTORY_FILE)
    processed_ids = get_processed_ids()

    unprocessed: list[dict] = []
    for group_name, messages in history.items():
        for text in messages:
            msg_id = _generate_message_id(group_name, text)
            if msg_id not in processed_ids:
                unprocessed.append(
                    {
                        "messageId": msg_id,
                        "text": text,
                        "groupName": group_name,
                        "scrapedAt": datetime.now(_tz).isoformat(),
                    }
                )
    return unprocessed


def mark_message_processed(
    message_id: str,
    message_hash: str,
    category: str,
    result_summary: str,
) -> None:
    """Append a record to ``processed_messages.json``."""
    data = read_json(PROCESSED_MESSAGES_FILE)
    if "processedMessages" not in data:
        data["processedMessages"] = []

    data["processedMessages"].append(
        {
            "messageId": message_id,
            "messageHash": message_hash,
            "processedAt": datetime.now(_tz).isoformat(),
            "category": category,
            "result": result_summary,
        }
    )
    write_json(PROCESSED_MESSAGES_FILE, data)
