/**
 * widgetStateAdapter — maps the backend `/api/widget-state` payload into the
 * app's canonical `Routine` shape.
 *
 * The backend and the app were designed with different field names and value
 * semantics. This module is the SINGLE place that reconciles them, so the rest
 * of the app only ever deals with the `Routine` type. If the backend contract
 * changes, this is the only file that needs to change.
 *
 * Backend shape (see app/services/routine_service.py::get_widget_state):
 *   todayClasses[]   { id, displayTitle, courseIds[], rooms[], teachers[],
 *                      start, end, status, slotStart }
 *   importantNotices[] { title, description, type, priority, isPinned }
 *   weeklyHighlights[] { title, label, type, courseIds[], date, day,
 *                        priority, isGraded }
 *   lastUpdated      ISO-8601 string
 */

import type {
  ClassItem,
  HighlightItem,
  ImportantItem,
  Routine,
  Urgency,
} from '../types/routine';

// ─── Backend payload types (partial; only fields we consume) ──────────

export interface BackendClass {
  id?: string;
  displayTitle?: string;
  courseIds?: string[];
  rooms?: string[];
  teachers?: string[];
  start?: string;
  end?: string;
  status?: string;
  slotStart?: number | null;
}

export interface BackendNotice {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  isPinned?: boolean;
}

export interface BackendHighlight {
  title?: string;
  label?: string;
  type?: string;
  courseIds?: string[];
  date?: string;
  day?: string;
  priority?: string;
  isGraded?: boolean;
}

export interface WidgetStatePayload {
  todayClasses?: BackendClass[];
  importantNotices?: BackendNotice[];
  weeklyHighlights?: BackendHighlight[];
  lastUpdated?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const DAY_ABBR: Record<string, string> = {
  saturday: 'SAT',
  sunday: 'SUN',
  monday: 'MON',
  tuesday: 'TUE',
  wednesday: 'WED',
  thursday: 'THU',
  friday: 'FRI',
};

/** Map backend priority (`high`/`medium`/`low`) to the app's urgency palette. */
function priorityToUrgency(priority?: string): Urgency {
  switch ((priority ?? '').toLowerCase()) {
    case 'high':
      return 'red';
    case 'medium':
      return 'amber';
    default:
      return 'grey';
  }
}

/** Join a string list with " / ", or return `fallback` when empty/missing. */
function joinOr(list: string[] | undefined, fallback: string): string {
  if (!list || list.length === 0) {
    return fallback;
  }
  return list.join(' / ');
}

/** Build a highlight tag like "TUE 30" from the backend day + ISO date. */
function buildTag(h: BackendHighlight): string {
  const key = (h.day ?? '').toLowerCase();
  const abbr = DAY_ABBR[key] ?? key.slice(0, 3).toUpperCase();

  let dayOfMonth = '';
  if (h.date) {
    const parts = h.date.split('-');
    if (parts.length === 3) {
      const n = Number(parts[2]);
      if (Number.isFinite(n)) {
        dayOfMonth = String(n).padStart(2, '0');
      }
    }
  }

  const tag = [abbr, dayOfMonth].filter(Boolean).join(' ');
  return tag || (h.label ?? h.type ?? '—').toUpperCase();
}

/** ISO week-of-year label like "Wk 27". Falls back to "This Week". */
function weekLabel(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    return 'This Week';
  }
  // ISO 8601 week number.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `Wk ${week}`;
}

// ─── Item mappers ─────────────────────────────────────────────────────

function mapClass(c: BackendClass): ClassItem {
  return {
    id: c.id ?? `${c.start ?? ''}-${c.displayTitle ?? 'class'}`,
    name: c.displayTitle ?? 'Class',
    code: joinOr(c.courseIds, ''),
    room: joinOr(c.rooms, ''),
    start: c.start ?? '00:00',
    end: c.end ?? '00:00',
  };
}

function mapNotice(n: BackendNotice): ImportantItem {
  return {
    title: n.title ?? 'Notice',
    sub: n.description ?? n.type ?? '',
    urgency: priorityToUrgency(n.priority),
  };
}

function mapHighlight(h: BackendHighlight): HighlightItem {
  return {
    tag: buildTag(h),
    type: (h.label ?? h.type ?? '').toUpperCase(),
    course: joinOr(h.courseIds, h.title ?? ''),
    urgency: priorityToUrgency(h.priority),
    graded: Boolean(h.isGraded),
  };
}

// ─── Public entry point ───────────────────────────────────────────────

/**
 * Convert a `/api/widget-state` payload into a `Routine`.
 *
 * - Cancelled classes are dropped (the app has no cancelled-row rendering).
 * - Classes are ordered by start time so the timeline reads top-to-bottom.
 * - Any missing section yields an empty list rather than throwing.
 */
export function widgetStateToRoutine(payload: WidgetStatePayload): Routine {
  const timeline = (payload.todayClasses ?? [])
    .filter(c => c.status !== 'cancelled')
    .map(mapClass)
    .sort((a, b) => a.start.localeCompare(b.start));

  const updatedAt = payload.lastUpdated
    ? Date.parse(payload.lastUpdated) || Date.now()
    : Date.now();

  return {
    meta: {
      weekLabel: weekLabel(payload.lastUpdated),
      updatedAt,
    },
    timeline,
    important: (payload.importantNotices ?? []).map(mapNotice),
    highlights: (payload.weeklyHighlights ?? []).map(mapHighlight),
  };
}
