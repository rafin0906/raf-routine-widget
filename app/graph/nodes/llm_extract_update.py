"""
Node: llm_extract_update

Calls the Groq-hosted Llama 3.3 70B model via LangChain to classify
a single WhatsApp message and extract structured data.

The LLM is **never** given direct file-write access.  It only returns
a Pydantic-validated JSON object; Python code in later nodes decides
whether and how to update the JSON database.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from zoneinfo import ZoneInfo

# pyrefly: ignore [missing-import]
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.config import LLM_MODEL, LLM_TEMPERATURE, TIMEZONE
from app.graph.state import WorkflowState

_tz = ZoneInfo(TIMEZONE)


# ─── Pydantic schema for structured output ───────────────────────────

class LLMClassificationResult(BaseModel):
    """Structured output the LLM must conform to."""

    category: Literal[
        "important_notice",
        "weekly_highlight",
        "class_event_update",
        "irrelevant",
    ] = Field(description="Exactly one classification category")

    confidence: float = Field(
        ge=0.0, le=1.0, description="Confidence score 0–1"
    )

    operation: Literal[
        "add",
        "ignore",
        "cancel_class",
        "add_extra_class",
        "change_room",
        "change_time",
        "change_teacher",
        "replace_class",
    ] = Field(description="Database operation to perform")

    sourceMessageId: str = Field(description="ID of the source message")
    sourceMessageText: str = Field(description="Original message text")
    summary: str = Field(description="Short human-readable summary")
    data: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured payload for the update",
    )


# ─── System prompt ───────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a university class routine assistant for RUET (Rajshahi University \
of Engineering & Technology), CSE Department, 2nd Year Even Semester, \
Section C.

Classify the given WhatsApp group message into exactly ONE category and \
extract structured data.

## Available Courses
{courses_context}

## Classification Rules

### Category: weekly_highlight
Any exam, CT, quiz, lab final, viva, assignment, presentation, or \
submission-deadline notice.
Operation: "add"
data fields: title, label (CT/Quiz/ASGN/Viva/Lab Final/Presentation), \
type (ct/quiz/assignment/viva/lab_final/presentation), \
sectionId ("cse-2y-even-c"), courseIds (list), date (YYYY-MM-DD), \
day (lowercase), time (HH:MM or null), \
priority ("high" for ct/quiz/viva/lab_final, "medium" otherwise), \
status ("upcoming"), isGraded (bool).

### Category: class_event_update
Any routine change: cancel, extra class, room/time/teacher change.
Operations: "cancel_class", "add_extra_class", "change_room", \
"change_time", "change_teacher", "replace_class"
For cancel_class → data: date, day, targetCourseIds, status "cancelled", reason.
For add_extra_class → data: id, sectionId, day, date, slotStart, slotEnd, \
start (HH:MM), end (HH:MM), courseIds, displayTitle, teachers, rooms, \
eventType "extra_class", status "scheduled".
For change_room/time/teacher → data: date, day, targetCourseIds, \
changes (dict with new values).

### Category: important_notice
Useful academic / departmental / administrative / actionable notice that \
is NOT a weekly_highlight and NOT a class_event_update.
Operation: "add"
data fields: title, description, type (general_notice/fee_notice/\
registration/lab_requirement/document_submission), \
priority (high/medium/low), sectionId ("cse-2y-even-c"), \
relatedCourseIds (list or []), date (YYYY-MM-DD), \
showUntil (ISO 8601 datetime +06:00), isPinned (false), status "active".

### Category: irrelevant
Random, vague, incomplete, pinned-message notification, deleted-message \
notification, casual chat, recruitment post, reaction, club recruitment, \
forwarded unrelated content, file-attachment-only messages without \
academic context, or messages too vague to act on.
Operation: "ignore"
data: empty dict {{}}.

## Key Rules
1. "Everyone submit 40 tk fee tomorrow to CR" → important_notice. \
   "Fee is 40 tk" (no context/action) → irrelevant.
2. "~ X pinned a message" / "This message was deleted" → irrelevant.
3. Translate "tomorrow"/"কাল"/"আজ"/"today" relative to today's date.
4. Match course names to the closest course ID from the list above.
5. If unsure → irrelevant with low confidence.

## Today's Context
Date: {today_date}
Day: {today_day}
"""


# ─── Node implementation ─────────────────────────────────────────────

def llm_extract_update(state: WorkflowState) -> dict:
    """Invoke the LLM to classify the current message."""
    current = state["current_message"]
    courses_map = state.get("courses_lookup", {}).get("courses", {})

    # Build human-readable course list
    courses_ctx = "\n".join(
        f"- {cid}: {c.get('code', '')} – {c.get('title', '')} "
        f"(Short: {c.get('shortTitle', '')})"
        for cid, c in courses_map.items()
    )

    now = datetime.now(_tz)
    system_msg = _SYSTEM_PROMPT.format(
        courses_context=courses_ctx or "(no courses loaded)",
        today_date=now.strftime("%Y-%m-%d"),
        today_day=now.strftime("%A").lower(),
    )

    user_msg = (
        f"Classify this WhatsApp message:\n\n"
        f"Group: {current.get('groupName', 'Unknown')}\n"
        f"Message ID: {current.get('messageId', 'unknown')}\n"
        f"Message Text:\n{current.get('text', '')}\n\n"
        f"Return the classification result."
    )

    llm = ChatGroq(model=LLM_MODEL, temperature=LLM_TEMPERATURE)
    structured_llm = llm.with_structured_output(LLMClassificationResult)

    try:
        result: LLMClassificationResult = structured_llm.invoke(
            [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ]
        )
        print(
            f"[llm] {current.get('messageId', '?')[:12]}… → "
            f"{result.category} ({result.confidence:.2f})"
        )
        return {"llm_result": result.model_dump()}

    except Exception as exc:  # noqa: BLE001
        print(f"[llm] Classification failed: {exc}")
        return {
            "llm_result": {
                "category": "irrelevant",
                "confidence": 0.0,
                "operation": "ignore",
                "sourceMessageId": current.get("messageId", ""),
                "sourceMessageText": current.get("text", ""),
                "summary": f"LLM classification failed: {exc}",
                "data": {},
            }
        }
