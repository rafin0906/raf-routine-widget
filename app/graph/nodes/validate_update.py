"""
Node: validate_update

Checks the LLM's structured output before it reaches any JSON-writing
node.  Catches invalid categories, mismatched operations, unknown
course IDs, unparseable dates, and low-confidence guesses.

If critical errors are found the category is downgraded to ``irrelevant``
so no data file gets modified.
"""

from __future__ import annotations

from datetime import datetime

from app.graph.state import WorkflowState

_VALID_CATEGORIES = {
    "important_notice",
    "weekly_highlight",
    "class_event_update",
    "irrelevant",
}

_CATEGORY_OPS: dict[str, set[str]] = {
    "important_notice": {"add"},
    "weekly_highlight": {"add"},
    "class_event_update": {
        "cancel_class",
        "add_extra_class",
        "change_room",
        "change_time",
        "change_teacher",
        "replace_class",
    },
    "irrelevant": {"ignore"},
}


def validate_update(state: WorkflowState) -> dict:
    """Validate the LLM result; downgrade to irrelevant on failures."""
    llm_result: dict = dict(state.get("llm_result") or {})
    errors: list[str] = []

    category = llm_result.get("category", "")
    operation = llm_result.get("operation", "")
    confidence = llm_result.get("confidence", 0.0)
    data = llm_result.get("data", {})
    courses = state.get("courses_lookup", {}).get("courses", {})

    # 1. Category must be one of the four allowed values
    if category not in _VALID_CATEGORIES:
        errors.append(f"Invalid category: {category}")
        llm_result["category"] = "irrelevant"
        llm_result["operation"] = "ignore"

    # 2. Operation must match the category
    allowed_ops = _CATEGORY_OPS.get(llm_result["category"], set())
    if llm_result.get("operation") not in allowed_ops:
        errors.append(
            f"Operation '{operation}' invalid for "
            f"category '{llm_result['category']}'"
        )
        # Auto-correct
        if llm_result["category"] == "irrelevant":
            llm_result["operation"] = "ignore"

    # 3. Low confidence → irrelevant
    if confidence < 0.5:
        errors.append(
            f"Confidence too low ({confidence:.2f}), downgrading to irrelevant"
        )
        llm_result["category"] = "irrelevant"
        llm_result["operation"] = "ignore"

    # 4. Course IDs must exist in courses.json
    if llm_result["category"] in ("weekly_highlight", "class_event_update"):
        course_ids = data.get("courseIds") or data.get("targetCourseIds") or []
        for cid in course_ids:
            if cid not in courses:
                errors.append(f"Unknown course ID: {cid}")

    # 5. Date must be parseable
    date_str = data.get("date")
    if date_str and llm_result["category"] != "irrelevant":
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except (ValueError, TypeError):
            errors.append(f"Invalid date format: {date_str}")

    if errors:
        print(f"[validate] Issues: {errors}")

    return {
        "llm_result": llm_result,
        "validation_errors": errors,
    }
