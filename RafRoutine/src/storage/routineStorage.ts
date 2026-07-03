/**
 * routineStorage — AsyncStorage wrapper for the locally-held routine.
 *
 * The app is the source of truth in Phase 1: it seeds sample data, persists
 * edits, and pushes to the native widget separately via WidgetBridge.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {Routine} from '../types/routine';
import {buildSampleRoutine} from '../data/sampleRoutine';

const KEY = 'raf_routine.v1';

/** Read the stored routine, or null if nothing valid is stored. */
export async function getRoutine(): Promise<Routine | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Routine;
  } catch (err) {
    console.warn('[routineStorage] failed to read routine:', err);
    return null;
  }
}

/** Persist the routine. */
export async function saveRoutine(r: Routine): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(r));
  } catch (err) {
    console.warn('[routineStorage] failed to save routine:', err);
  }
}

/**
 * Return the stored routine, or seed fresh sample data and return that if the
 * store is empty.
 */
export async function seedIfEmpty(): Promise<Routine> {
  const existing = await getRoutine();
  if (existing) {
    return existing;
  }
  const seeded = buildSampleRoutine();
  await saveRoutine(seeded);
  return seeded;
}

/** Overwrite storage with fresh sample data and return it. */
export async function resetToSample(): Promise<Routine> {
  const sample = buildSampleRoutine();
  await saveRoutine(sample);
  return sample;
}
