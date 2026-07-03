/**
 * routineApi — fetches live routine data from the NeuraRUET backend and adapts
 * it into the app's `Routine` shape.
 *
 * The base URL (`src/config.ts`) points at the deployed production backend.
 */

import {API_BASE_URL, API_TIMEOUT_MS} from '../config';
import type {Routine} from '../types/routine';
import {
  widgetStateToRoutine,
  type WidgetStatePayload,
} from './widgetStateAdapter';

/**
 * Fetch `/api/widget-state` and adapt it to a `Routine`.
 *
 * Rejects on network failure, timeout, or non-2xx status — callers should catch
 * and fall back to cached/sample data.
 */
export async function fetchRoutine(): Promise<Routine> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/api/widget-state`, {
      method: 'GET',
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`widget-state request failed: HTTP ${res.status}`);
    }

    const payload = (await res.json()) as WidgetStatePayload;
    return widgetStateToRoutine(payload);
  } finally {
    clearTimeout(timer);
  }
}
