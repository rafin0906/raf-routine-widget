/**
 * WidgetBridge — typed wrapper over the native `RafRoutineWidget` module
 * implemented by GM-2 (Android Kotlin/Glance).
 *
 * Native module contract (GM-2 implements these EXACT names):
 *   - updateRoutine(json: string): Promise<void>
 *   - getRoutine(): Promise<string>   // returns "" if none
 *   - refreshWidget(): Promise<void>
 *
 * The module may be undefined when running on a platform/build where it is not
 * present. Every method guards against that: it logs a warning and resolves
 * (never throws), so the JS app stays usable in development.
 */

import {NativeModules} from 'react-native';

import type {Routine} from '../types/routine';

interface RafRoutineWidgetModule {
  updateRoutine(json: string): Promise<void>;
  getRoutine(): Promise<string>;
  refreshWidget(): Promise<void>;
}

const nativeModule: RafRoutineWidgetModule | undefined = (
  NativeModules as {RafRoutineWidget?: RafRoutineWidgetModule}
).RafRoutineWidget;

/** True when the native widget module is linked and available. */
export function isWidgetBridgeAvailable(): boolean {
  return nativeModule != null;
}

function warnMissing(method: string): void {
  console.warn(
    `[WidgetBridge] NativeModules.RafRoutineWidget.${method} is unavailable; ` +
      'resolving as a no-op. (Native widget module not linked on this build.)',
  );
}

/** Send a serialized routine JSON string to the native widget. */
export async function updateRoutine(json: string): Promise<void> {
  if (!nativeModule) {
    warnMissing('updateRoutine');
    return;
  }
  await nativeModule.updateRoutine(json);
}

/** Read the routine JSON string held natively. Returns "" if none / missing. */
export async function getRoutine(): Promise<string> {
  if (!nativeModule) {
    warnMissing('getRoutine');
    return '';
  }
  return nativeModule.getRoutine();
}

/** Ask the native side to redraw the home-screen widget. */
export async function refreshWidget(): Promise<void> {
  if (!nativeModule) {
    warnMissing('refreshWidget');
    return;
  }
  await nativeModule.refreshWidget();
}

/**
 * Convenience: serialize a Routine, push it to the widget, and refresh.
 * Resolves cleanly even when the native module is missing.
 */
export async function pushRoutine(routine: Routine): Promise<void> {
  const json = JSON.stringify(routine);
  await updateRoutine(json);
  await refreshWidget();
}

export const WidgetBridge = {
  isWidgetBridgeAvailable,
  updateRoutine,
  getRoutine,
  refreshWidget,
  pushRoutine,
};

export default WidgetBridge;
