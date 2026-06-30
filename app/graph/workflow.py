"""
LangGraph workflow — the full message-processing pipeline.

Graph structure
---------------
::

    load_new_messages
        ↓
    [has messages?]──no──→ END
        │yes
        ↓
    pop_next_message ←──────────────────────┐
        ↓                                   │
    llm_extract_update                      │
        ↓                                   │
    validate_update                         │
        ↓                                   │
    [route_by_category]                     │
     ├─ irrelevant      → mark_processed ──→│
     ├─ weekly_highlight → update_highlights → mark_processed ──→│
     ├─ class_event      → update_class_events → mark_processed ──→│
     └─ important_notice → update_notices → mark_processed ──→│
                                            │
    [more messages?]──yes───────────────────┘
        │no
        ↓
       END
"""

from langgraph.graph import END, StateGraph

from app.graph.nodes.load_new_messages import load_new_messages
from app.graph.nodes.llm_extract_update import llm_extract_update
from app.graph.nodes.mark_processed import mark_processed
from app.graph.nodes.update_class_events import update_class_events
from app.graph.nodes.update_highlights import update_highlights
from app.graph.nodes.update_important_notices import update_important_notices
from app.graph.nodes.validate_update import validate_update
from app.graph.state import WorkflowState


# ─── Helper nodes ────────────────────────────────────────────────────


def _pop_next_message(state: WorkflowState) -> dict:
    """Pop the first message from raw_messages into current_message."""
    messages = list(state["raw_messages"])
    if messages:
        current = messages.pop(0)
        return {
            "current_message": current,
            "raw_messages": messages,
            "llm_result": None,
            "validation_errors": [],
        }
    return {"current_message": {}, "raw_messages": []}


# ─── Conditional edges ───────────────────────────────────────────────


def _has_messages(state: WorkflowState) -> str:
    return "process" if state.get("raw_messages") else "end"


def _route_by_category(state: WorkflowState) -> str:
    llm_result = state.get("llm_result") or {}
    category = llm_result.get("category", "irrelevant")

    # If validation failed critically, skip the update
    errors = state.get("validation_errors", [])
    if errors and llm_result.get("category") == "irrelevant":
        return "mark_processed"

    routing = {
        "weekly_highlight": "update_highlights",
        "class_event_update": "update_class_events",
        "important_notice": "update_important_notices",
    }
    return routing.get(category, "mark_processed")


def _check_more(state: WorkflowState) -> str:
    return "pop_next" if state.get("raw_messages") else "end"


# ─── Build the graph ─────────────────────────────────────────────────


def _build() -> StateGraph:
    g = StateGraph(WorkflowState)

    # Nodes
    g.add_node("load_new_messages", load_new_messages)
    g.add_node("pop_next_message", _pop_next_message)
    g.add_node("llm_extract_update", llm_extract_update)
    g.add_node("validate_update", validate_update)
    g.add_node("update_highlights", update_highlights)
    g.add_node("update_class_events", update_class_events)
    g.add_node("update_important_notices", update_important_notices)
    g.add_node("mark_processed", mark_processed)

    # Entry
    g.set_entry_point("load_new_messages")

    # load → has messages?
    g.add_conditional_edges(
        "load_new_messages",
        _has_messages,
        {"process": "pop_next_message", "end": END},
    )

    # pop → llm → validate
    g.add_edge("pop_next_message", "llm_extract_update")
    g.add_edge("llm_extract_update", "validate_update")

    # validate → route
    g.add_conditional_edges(
        "validate_update",
        _route_by_category,
        {
            "update_highlights": "update_highlights",
            "update_class_events": "update_class_events",
            "update_important_notices": "update_important_notices",
            "mark_processed": "mark_processed",
        },
    )

    # update nodes → mark_processed
    g.add_edge("update_highlights", "mark_processed")
    g.add_edge("update_class_events", "mark_processed")
    g.add_edge("update_important_notices", "mark_processed")

    # mark_processed → loop or end
    g.add_conditional_edges(
        "mark_processed",
        _check_more,
        {"pop_next": "pop_next_message", "end": END},
    )

    return g


# ─── Singleton compiled graph ────────────────────────────────────────

_compiled = None


def _get_graph():
    global _compiled  # noqa: PLW0603
    if _compiled is None:
        _compiled = _build().compile()
    return _compiled


def run_workflow() -> dict:
    """Execute the full LangGraph pipeline and return the final state."""
    graph = _get_graph()
    initial: WorkflowState = {
        "raw_messages": [],
        "current_message": {},
        "llm_result": None,
        "validation_errors": [],
        "updates_applied": [],
        "courses_lookup": {},
        "class_events_lookup": [],
    }
    result = graph.invoke(initial)
    applied = result.get("updates_applied", [])
    print(f"[workflow] Finished — {len(applied)} update(s) applied")
    return result
