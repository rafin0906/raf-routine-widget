# Dynamic Routine Widget Agent Architecture

## Final Dynamic Database Structure

```txt
app/db/
 ├── courses.json
 ├── class_events.json
 ├── timeslots.json
 ├── important_notices.json
 ├── highlights.json
 ├── message_history.json
 └── processed_messages.json
```

`pending_updates.json` is not needed.

## Main Workflow

```txt
WhatsApp Group
 ↓
Scraper
 ↓
message_history.json
 ↓
Detect new messages
 ↓
LLM classification + extraction
 ↓
Python validation
 ↓
Update correct JSON file
 ↓
Widget reads updated JSON
```

## LLM Output Categories

The LLM only needs to classify each new WhatsApp message into one of these 4 categories:

```txt
important_notice
weekly_highlight
class_event_update
irrelevant
```

## Category Rules

### 1. weekly_highlight

Any exam-related, graded, deadline, academic evaluation, or academic event type message will be considered `weekly_highlight`.

Examples:

```txt
Tomorrow Math CT
CSE 2205 class test on Sunday
Lab final will be held tomorrow
Viva date announced
Assignment submission deadline
Quiz notice
Presentation notice
Lab report submission deadline
```

These messages update:

```txt
app/db/highlights.json
```

Example LLM output:

```json
{
  "category": "weekly_highlight",
  "confidence": 0.92,
  "operation": "add",
  "sourceMessageId": "wa-msg-123",
  "sourceMessageText": "Tomorrow Math CT at 10 AM",
  "summary": "Math CT will be held tomorrow",
  "data": {
    "title": "Math CT",
    "label": "CT",
    "type": "ct",
    "sectionId": "cse-2y-even-c",
    "courseIds": ["MATH2213"],
    "date": "2026-06-30",
    "day": "tuesday",
    "time": "10:00",
    "priority": "high",
    "status": "upcoming",
    "isGraded": true
  }
}
```

---

### 2. class_event_update

Any routine-related change will be considered `class_event_update`.

Examples:

```txt
Today CSE 2205 class cancelled
Tomorrow extra Algorithm class at 2:30 PM
Room changed from 201 to 203
Microprocessor lab will be held in ACL Lab
Class time shifted to 11:40
No class today
Extra class assigned
Teacher changed
Class moved to another room
```

These messages update:

```txt
app/db/class_events.json
```

Possible operations:

```txt
cancel_class
add_extra_class
change_room
change_time
change_teacher
replace_class
```

Example output for class cancellation:

```json
{
  "category": "class_event_update",
  "confidence": 0.91,
  "operation": "cancel_class",
  "sourceMessageId": "wa-msg-124",
  "sourceMessageText": "Today CSE 2205 class is cancelled",
  "summary": "CSE 2205 class cancelled today",
  "data": {
    "date": "2026-06-30",
    "day": "tuesday",
    "targetCourseIds": ["CSE2205"],
    "targetClassEventIds": ["tue-c-06-cse2205"],
    "status": "cancelled",
    "reason": "WhatsApp CR notice"
  }
}
```

Example output for extra class:

```json
{
  "category": "class_event_update",
  "confidence": 0.89,
  "operation": "add_extra_class",
  "sourceMessageId": "wa-msg-125",
  "sourceMessageText": "Tomorrow extra Algorithm class at 2:30 PM",
  "summary": "Extra Algorithm Analysis class tomorrow at 2:30 PM",
  "data": {
    "id": "extra-2026-06-30-cse2201-1430",
    "sectionId": "cse-2y-even-c",
    "day": "tuesday",
    "date": "2026-06-30",
    "slotStart": 7,
    "slotEnd": 7,
    "start": "14:30",
    "end": "15:20",
    "courseIds": ["CSE2201"],
    "displayTitle": "Extra Algorithm Analysis Class",
    "teachers": ["KZN"],
    "rooms": ["Seminar"],
    "eventType": "extra_class",
    "status": "scheduled"
  }
}
```

---

### 3. important_notice

Any useful academic or departmental notice that is not a weekly highlight and not a class routine update will be considered `important_notice`.

Examples:

```txt
Everyone submit department fee tomorrow
Form fill-up notice
Registration notice
ID card notice
Admit card collection notice
Department notice
Bring lab copy tomorrow
Submit documents to CR
Meeting with advisor
```

These messages update:

```txt
app/db/important_notices.json
```

Example output:

```json
{
  "category": "important_notice",
  "confidence": 0.84,
  "operation": "add",
  "sourceMessageId": "wa-msg-126",
  "sourceMessageText": "Everyone submit department fee tomorrow",
  "summary": "Students need to submit department fee tomorrow",
  "data": {
    "title": "Submit department fee",
    "description": "Students need to submit the required department fee tomorrow.",
    "type": "general_notice",
    "priority": "medium",
    "sectionId": "cse-2y-even-c",
    "relatedCourseIds": [],
    "date": "2026-06-30",
    "showUntil": "2026-06-30T23:59:59+06:00",
    "isPinned": false,
    "status": "active"
  }
}
```

---

### 4. irrelevant

Any random, incomplete, unrelated, duplicate, system-like, or non-actionable message will be considered `irrelevant`.

Examples:

```txt
Someone pinned a message
Okay
Thanks
Fee is 40 tk
Done
Reacted to a message
Random discussion
Recruitment post
Job circular
Club recruitment
Meme or casual chat
Political discussion
Message deleted
Forwarded unrelated notice
```

These messages do not update:

```txt
class_events.json
highlights.json
important_notices.json
```

They are only saved into:

```txt
processed_messages.json
```

Example output:

```json
{
  "category": "irrelevant",
  "confidence": 0.95,
  "operation": "ignore",
  "sourceMessageId": "wa-msg-127",
  "sourceMessageText": "Fee is 40 tk",
  "summary": "Message is too vague and not enough to create a notice",
  "data": {}
}
```

## Important Distinction

A clear and actionable fee message is `important_notice`.

Example:

```txt
Everyone submit 40 tk department fee tomorrow to CR
```

This is `important_notice`.

But a vague message like:

```txt
Fee is 40 tk
```

This is `irrelevant`, because it has no clear context, no action, and no deadline.

## Final LLM Structured Output Format

```json
{
  "category": "important_notice | weekly_highlight | class_event_update | irrelevant",
  "confidence": 0.0,
  "operation": "add | ignore | cancel_class | add_extra_class | change_room | change_time | change_teacher | replace_class",
  "sourceMessageId": "wa-msg-id",
  "sourceMessageText": "original WhatsApp message",
  "summary": "short summary of the extracted update",
  "data": {}
}
```

## Final Decision Logic

```txt
If message is random, vague, unrelated, recruitment-related, pinned-message notification, or non-actionable:
→ irrelevant

Else if message is about CT, quiz, lab final, viva, assignment, presentation, exam, deadline:
→ weekly_highlight

Else if message is about class cancel, extra class, room change, time change, teacher change:
→ class_event_update

Else:
→ important_notice
```

## Important Rule

LLM will not directly edit JSON files.

LLM only returns structured output.

Python will:

```txt
1. Validate category
2. Validate operation
3. Validate date/time
4. Match course code with courses.json
5. Match class event with class_events.json if needed
6. Apply update to correct JSON file
7. If irrelevant, do not update routine/highlight/notice files
8. Save message ID into processed_messages.json
```

## Recommended LangGraph Flow

```txt
START
 ↓
load_new_messages
 ↓
dedupe_messages
 ↓
llm_extract_update
 ↓
validate_update
 ↓
route_by_category
   ├── irrelevant → mark_message_processed
   ├── weekly_highlight → update_highlights_json
   ├── class_event_update → update_class_events_json
   └── important_notice → update_important_notices_json
 ↓
mark_message_processed
 ↓
END
```

## Best LLM Setup

Use only one LLM first.

```txt
1 LLM = enough for classification + structured extraction
Python = validation + JSON writing
```

No need for multiple LLMs at the beginning.

Later, if mistakes happen, add a second reviewer node only for `class_event_update`, because class routine modification is more sensitive.
