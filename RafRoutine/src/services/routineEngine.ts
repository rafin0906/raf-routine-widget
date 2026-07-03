/**
 * routineEngine — pure functions that compute LIVE state from the device clock.
 *
 * Everything here is deterministic given (routine, now). No side effects, no
 * storage, no native calls — so it is trivially testable.
 */

import type {Routine} from '../types/routine';
import type {Tokens} from '../theme/tokens';

export type Status = 'done' | 'running' | 'upcoming';

export interface LiveState {
  /** Status per timeline item, aligned by index. */
  statuses: Status[];
  /** Index of the currently running class, or null if none. */
  nowIndex: number | null;
  /** Index of the next upcoming class, or null if none remain. */
  nextIndex: number | null;
  /** Progress through the running class, 0-100. 0 when nowIndex is null. */
  progressPct: number;
  /** Whole minutes left in the running class. 0 when nowIndex is null. */
  minsLeft: number;
  /** Number of classes already finished. */
  doneCount: number;
}

const MS_PER_MIN = 60 * 1000;

/**
 * Parse an "HH:mm" string into a concrete Date on the same calendar day as
 * `base`. Seconds and milliseconds are zeroed.
 */
export function parseHHmm(time: string, base: Date): Date {
  const [hStr, mStr] = time.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  const result = new Date(base);
  result.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return result;
}

/**
 * Compute the full live state of a routine relative to `now`.
 *
 * - running: now in [start, end)
 * - done:    now >= end
 * - upcoming: now < start
 */
export function computeLiveState(routine: Routine, now: Date): LiveState {
  const statuses: Status[] = [];
  let nowIndex: number | null = null;
  let nextIndex: number | null = null;
  let doneCount = 0;

  routine.timeline.forEach((item, index) => {
    const start = parseHHmm(item.start, now);
    const end = parseHHmm(item.end, now);

    let status: Status;
    if (now.getTime() >= end.getTime()) {
      status = 'done';
      doneCount += 1;
    } else if (now.getTime() >= start.getTime()) {
      status = 'running';
      if (nowIndex === null) {
        nowIndex = index;
      }
    } else {
      status = 'upcoming';
      if (nextIndex === null) {
        nextIndex = index;
      }
    }
    statuses.push(status);
  });

  let progressPct = 0;
  let minsLeft = 0;

  if (nowIndex !== null) {
    const current = routine.timeline[nowIndex];
    const start = parseHHmm(current.start, now);
    const end = parseHHmm(current.end, now);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    if (total > 0) {
      progressPct = clamp(Math.round((elapsed / total) * 100), 0, 100);
    }
    minsLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / MS_PER_MIN));
  }

  return {statuses, nowIndex, nextIndex, progressPct, minsLeft, doneCount};
}

/** Short label for a status, as shown in the "Today" list. */
export function statusLabel(s: Status): 'DONE' | 'LIVE' | 'SOON' {
  switch (s) {
    case 'done':
      return 'DONE';
    case 'running':
      return 'LIVE';
    case 'upcoming':
      return 'SOON';
  }
}

/** Color for a status label / dot, resolved from theme tokens. */
export function statusColor(s: Status, tokens: Tokens): string {
  switch (s) {
    case 'done':
      return tokens.accent.green;
    case 'running':
      return tokens.accent.green;
    case 'upcoming':
      return tokens.text.muted;
  }
}

/** e.g. "Sat, Jun 27". */
export function dateLabel(now: Date): string {
  return now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Relative "Updated …" line.
 * "Updated just now" / "Updated 5 min ago" / "Updated 1 hr ago".
 */
export function relativeUpdated(updatedAt: number, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - updatedAt);
  const mins = Math.floor(diffMs / MS_PER_MIN);

  if (mins < 1) {
    return 'Updated just now';
  }
  if (mins < 60) {
    return `Updated ${mins} min ago`;
  }
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs} hr ago`;
}

/** "in 1h 30m" or "in 45m". Clamps to "now" if start is in the past. */
export function untilLabel(start: Date, now: Date): string {
  const diffMs = Math.max(0, start.getTime() - now.getTime());
  const mins = Math.round(diffMs / MS_PER_MIN);
  if (mins <= 0) {
    return 'now';
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `in ${hrs}h ${remMins}m`;
  }
  return `in ${remMins}m`;
}

/** "2h 30m" / "45m". */
export function durationLabel(start: Date, end: Date): string {
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const mins = Math.round(diffMs / MS_PER_MIN);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}h ${remMins}m`;
  }
  return `${remMins}m`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
