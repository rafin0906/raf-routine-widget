/**
 * Raf Routine — SHARED CONTRACT (single source of truth).
 *
 * GM-2 (native Android Kotlin/Glance) builds to this identical shape.
 * Do not deviate from these field names or value semantics.
 */

export type Urgency = 'red' | 'amber' | 'grey';

export interface ClassItem {
  id: string;
  name: string;
  code: string;
  room: string;
  /** "HH:mm" 24h */
  start: string;
  /** "HH:mm" 24h */
  end: string;
}

export interface ImportantItem {
  title: string;
  sub: string;
  urgency: Urgency;
}

export interface HighlightItem {
  tag: string;
  type: string;
  course: string;
  urgency: Urgency;
  graded: boolean;
}

export interface RoutineMeta {
  weekLabel: string;
  /** epoch ms */
  updatedAt: number;
}

export interface Routine {
  meta: RoutineMeta;
  timeline: ClassItem[];
  important: ImportantItem[];
  highlights: HighlightItem[];
}
