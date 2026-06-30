"""
LangGraph workflow state definition.

Each node receives the full state and returns a partial dict of updates.
Fields annotated with ``operator.add`` accumulate across nodes instead of
being replaced.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict


class WorkflowState(TypedDict):
    # Messages still waiting to be processed (popped one-by-one)
    raw_messages: list[dict]

    # The single message currently being processed
    current_message: dict

    # Structured output from the LLM for the current message
    llm_result: dict | None

    # Validation issues found (reset per message)
    validation_errors: list[str]

    # Accumulates a record of every DB update made in this run
    updates_applied: Annotated[list[dict], operator.add]

    # Reference data loaded once at the start
    courses_lookup: dict
    class_events_lookup: list[dict]
