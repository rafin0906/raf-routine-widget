/**
 * Canonical sample data.
 *
 * Values here MUST match GM-2's Kotlin fallback byte-for-byte.
 * `meta.updatedAt` is computed at seed time via `buildSampleRoutine()` so the
 * preview's "Updated 5 min ago" line is correct relative to "now".
 */

import type {
  ClassItem,
  HighlightItem,
  ImportantItem,
  Routine,
} from '../types/routine';

const TIMELINE: ClassItem[] = [
  {
    id: '1',
    name: 'Database Systems',
    code: 'CSE 2207',
    room: 'Room 4102',
    start: '09:50',
    end: '11:20',
  },
  {
    id: '2',
    name: 'Discrete Mathematics',
    code: 'CSE 2213',
    room: 'Room 5208',
    start: '11:30',
    end: '13:00',
  },
  {
    id: '3',
    name: 'Algorithm Analysis Lab',
    code: 'CSE 2208',
    room: 'Lab 2, CSE',
    start: '14:30',
    end: '17:00',
  },
  {
    id: '4',
    name: 'Software Engineering',
    code: 'CSE 2211',
    room: 'Room 5210',
    start: '17:10',
    end: '18:40',
  },
];

const IMPORTANT: ImportantItem[] = [
  {
    title: 'AI Lab cancelled today',
    sub: 'CSE 2206 · 14:30 freed',
    urgency: 'red',
  },
  {
    title: 'DB Assignment due',
    sub: 'Tomorrow · 11:59 PM',
    urgency: 'amber',
  },
];

const HIGHLIGHTS: HighlightItem[] = [
  {
    tag: 'MON 29',
    type: 'CT 2',
    course: 'Discrete Math',
    urgency: 'red',
    graded: true,
  },
  {
    tag: 'TUE 30',
    type: 'QUIZ',
    course: 'Algorithm Lab',
    urgency: 'red',
    graded: true,
  },
  {
    tag: 'WED 01',
    type: 'ASGN',
    course: 'Database Systems',
    urgency: 'amber',
    graded: false,
  },
  {
    tag: 'THU 02',
    type: 'VIVA',
    course: 'DB Lab Board',
    urgency: 'amber',
    graded: true,
  },
  {
    tag: 'WED 08',
    type: 'FINAL',
    course: 'Microproc. Lab',
    urgency: 'grey',
    graded: true,
  },
];

/**
 * Build a fresh sample routine. `updatedAt` is set to 5 minutes ago relative to
 * the moment this is called, so the preview shows "Updated 5 min ago".
 */
export function buildSampleRoutine(): Routine {
  return {
    meta: {
      weekLabel: 'Wk 14',
      updatedAt: Date.now() - 5 * 60 * 1000,
    },
    // Clone arrays/objects so callers can mutate without affecting the source.
    timeline: TIMELINE.map(item => ({...item})),
    important: IMPORTANT.map(item => ({...item})),
    highlights: HIGHLIGHTS.map(item => ({...item})),
  };
}

/** A plain sample routine built from the same factory. */
export const sampleRoutine: Routine = buildSampleRoutine();
