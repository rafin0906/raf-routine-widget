/**
 * Design tokens from the approved "Raf Routine" design.
 * Use these across the preview UI — do not hardcode colors elsewhere.
 */

import {Platform} from 'react-native';
import type {Urgency} from '../types/routine';

export const tokens = {
  /** App screen background. */
  screenBg: '#0a0c10',

  /** Surface gradient stops, ordered top -> bottom. */
  gradient: [
    '#cdd3c6',
    '#d6c2a4',
    '#e3a672',
    '#e8884a',
    '#e7702b',
    '#e25e15',
  ] as const,

  card: {
    bg: 'rgba(12,14,19,0.72)',
    border: 'rgba(255,255,255,0.08)',
    radius: 13,
  },

  text: {
    title: '#f1f4f9',
    body: '#dbe1ec',
    muted: '#828b9c',
    secondary: '#aab0bd',
    onGradientDark: '#211d16',
    onGradientSoft: '#4a4233',
  },

  accent: {
    green: '#34d399',
    greenText: '#6ee7b7',
    red: '#fb7185',
    redStrong: '#f43f5e',
    amber: '#f5a623',
    grey: '#5b6478',
    warm: '#e7702b',
    importantTitle: '#fb8a99',
  },

  urgencyDot: {
    red: '#f43f5e',
    amber: '#f5a623',
    grey: '#5b6478',
  } as Record<Urgency, string>,

  /** Cross-platform monospace font family. */
  mono: Platform.select({
    android: 'monospace',
    ios: 'Menlo',
    default: 'monospace',
  }) as string,
} as const;

export type Tokens = typeof tokens;

/** Resolve an urgency value to its dot color. */
export function urgencyColor(urgency: Urgency): string {
  return tokens.urgencyDot[urgency];
}
