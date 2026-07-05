/**
 * WidgetPreview — a faithful, data-driven reproduction of the "Raf Routine"
 * home-screen widget.
 *
 * The reference design is a large 2:1 landscape surface (900 × 432 "design
 * units"). Rather than re-flow that dense layout into a tiny phone-width box —
 * which clipped the right-hand column (Important / Weekly Highlights) off the
 * bottom — we build the widget at its native size and scale the whole canvas
 * down to the available width with a single transform. Every proportion,
 * spacing value and font size therefore matches the reference exactly, and
 * nothing is cropped.
 *
 * All live values (now/next, progress, statuses, "updated" line) are still
 * derived from the `routine` prop and the `now` clock via routineEngine.
 *
 * No external libraries: only React Native core. The vertical gradient is
 * approximated with interpolated horizontal bands; icons are drawn with Views.
 */

import React, {useState} from 'react';
import {LayoutChangeEvent, ScrollView, StyleSheet, Text, View} from 'react-native';

import type {Routine, Urgency} from '../types/routine';
import {tokens} from '../theme/tokens';
import {
  computeLiveState,
  dateLabel,
  relativeUpdated,
  statusLabel,
} from '../services/routineEngine';

/* Native design canvas (from the reference). */
const DESIGN_W = 900;
const DESIGN_H = 432;

export interface WidgetPreviewProps {
  routine: Routine;
  now: Date;
}

function WidgetPreview({routine, now}: WidgetPreviewProps): React.JSX.Element {
  // Measured width of our slot; scale = measured / design width.
  const [containerW, setContainerW] = useState(0);
  const scale = containerW > 0 ? containerW / DESIGN_W : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerW) {
      setContainerW(w);
    }
  };

  const live = computeLiveState(routine, now);

  return (
    <View style={styles.slot} onLayout={onLayout}>
      {scale > 0 ? (
        <View style={[styles.canvasWrap, {height: DESIGN_H * scale}]}>
          <View style={[styles.canvas, {transform: [{scale}]}]}>
            <GradientBackground />
            <View style={styles.content}>
              <Header routine={routine} now={now} />
              <View style={styles.body}>
                <View style={styles.leftColumn}>
                  <TodayCard routine={routine} live={live} />
                </View>
                <View style={styles.rightColumn}>
                  <ImportantCard routine={routine} />
                  <HighlightsCard routine={routine} />
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Gradient surface (interpolated horizontal bands)                    */
/* ------------------------------------------------------------------ */

type Stop = {p: number; c: string};

const GRADIENT_STOPS: Stop[] = [
  {p: 0, c: '#cdd3c6'},
  {p: 0.24, c: '#d6c2a4'},
  {p: 0.46, c: '#e3a672'},
  {p: 0.64, c: '#e8884a'},
  {p: 0.82, c: '#e7702b'},
  {p: 1, c: '#e25e15'},
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorAt(t: number): string {
  for (let i = 1; i < GRADIENT_STOPS.length; i++) {
    const a = GRADIENT_STOPS[i - 1];
    const b = GRADIENT_STOPS[i];
    if (t <= b.p) {
      const local = (t - a.p) / (b.p - a.p);
      const [ar, ag, ab] = hexToRgb(a.c);
      const [br, bg, bb] = hexToRgb(b.c);
      const r = Math.round(ar + (br - ar) * local);
      const g = Math.round(ag + (bg - ag) * local);
      const bl = Math.round(ab + (bb - ab) * local);
      return `rgb(${r},${g},${bl})`;
    }
  }
  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1].c;
}

const BAND_COUNT = 36;
const GRADIENT_BANDS = Array.from({length: BAND_COUNT}, (_, i) =>
  colorAt((i + 0.5) / BAND_COUNT),
);

function GradientBackground(): React.JSX.Element {
  return (
    <View style={styles.gradientWrap} pointerEvents="none">
      {GRADIENT_BANDS.map((color, index) => (
        <View
          key={`${color}-${index}`}
          style={[styles.gradientBand, {backgroundColor: color}]}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Small drawn icons                                                   */
/* ------------------------------------------------------------------ */

/** The brand mark: two crossed elliptical rings inside a dark rounded box. */
function LogoMark(): React.JSX.Element {
  return (
    <View style={styles.logoBox}>
      <View style={[styles.logoRing, styles.logoRingA]} />
      <View style={[styles.logoRing, styles.logoRingB]} />
      <View style={styles.logoBolt} />
    </View>
  );
}

/** A live status dot with a soft static halo ring. */
function PulseDot({
  color,
  size,
  ring,
}: {
  color: string;
  size: number;
  ring: string;
}): React.JSX.Element {
  return (
    <View style={{width: size, height: size}}>
      <View
        style={{
          position: 'absolute',
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          borderRadius: (size + 6) / 2,
          borderWidth: 1,
          borderColor: ring,
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** A thin red bell outline, drawn with Views. */
function BellIcon(): React.JSX.Element {
  return (
    <View style={styles.bellWrap}>
      <View style={styles.bellDome} />
      <View style={styles.bellRim} />
      <View style={styles.bellClapper} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Header({
  routine,
  now,
}: {
  routine: Routine;
  now: Date;
}): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <LogoMark />
        <Text style={styles.brand}>Raf Routine</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
        <View style={styles.updatedWrap}>
          <PulseDot color="#1f9d57" size={7} ring="#1f9d57" />
          <Text style={styles.updated} numberOfLines={1}>
            {relativeUpdated(routine.meta.updatedAt, now)}
          </Text>
        </View>
      </View>
      <Text style={styles.headerRight} numberOfLines={1}>
        <Text style={styles.headerRightStrong}>{dateLabel(now)}</Text>
        {' · '}
        {routine.meta.weekLabel}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* NOW + NEXT                                                          */
/* ------------------------------------------------------------------ */

interface LiveProp {
  live: ReturnType<typeof computeLiveState>;
}

/* ------------------------------------------------------------------ */
/* Today list — sole occupant of the left column                       */
/* ------------------------------------------------------------------ */

function TodayCard({
  routine,
  live,
}: {
  routine: Routine;
} & LiveProp): React.JSX.Element {
  const total = routine.timeline.length;
  return (
    <View style={[styles.card, styles.todayCard]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.cardHeaderMeta}>
          {total} CLASSES · {live.doneCount} DONE
        </Text>
      </View>
      <View style={styles.todayList}>
        {routine.timeline.map((item, index) => {
          const status = live.statuses[index];
          const isDone = status === 'done';
          const isRunning = status === 'running';
          const label = statusLabel(status);
          const labelColor = status === 'upcoming' ? '#6b7588' : '#34d399';

          const nameColor = isDone ? '#828b9c' : '#eef1f6';
          const timeColor = isDone ? '#5b6478' : '#aab0bd';
          const metaColor = isDone ? '#5b6478' : '#828b9c';

          const codeRoom = [item.code, item.room].filter(Boolean).join(' · ');
          // Live class leads with progress so it never gets clipped first.
          const meta = isRunning
            ? `${live.progressPct}% · ${live.minsLeft}m left${
                codeRoom ? ' · ' + codeRoom : ''
              }`
            : codeRoom;

          return (
            <View
              key={item.id}
              style={[
                styles.todayRow,
                index > 0 ? styles.todayRowDivider : null,
              ]}>
              {/* Line 1: indicator · class name · status label */}
              <View style={styles.todayLine1}>
                <View style={styles.todayDotCol}>
                  <StatusDot status={status} />
                </View>
                <View style={styles.todayNameScrollerWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    style={styles.todayNameScroller}
                    contentContainerStyle={styles.todayNameScrollerContent}>
                    <Text style={[styles.todayName, {color: nameColor}]}>
                      {item.name}
                    </Text>
                  </ScrollView>
                  <ScrollEdgeFades />
                </View>
                <Text style={[styles.todayStatus, {color: labelColor}]}>
                  {label}
                </Text>
              </View>
              {/* Line 2: time range · code · room (· progress) */}
              <View style={styles.todayLine2}>
                <Text style={[styles.todayTimeRange, {color: timeColor}]}>
                  {item.start} – {item.end}
                </Text>
                <View style={styles.todayMetaScrollerWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    style={styles.todayMetaScroller}
                    contentContainerStyle={styles.todayMetaScrollerContent}>
                    <Text style={[styles.todayMeta, {color: metaColor}]}>
                      {meta}
                    </Text>
                  </ScrollView>
                  <ScrollEdgeFades />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatusDot({status}: {status: string}): React.JSX.Element {
  if (status === 'done') {
    return (
      <View style={styles.dotDone}>
        <Text style={styles.checkGlyph}>✓</Text>
      </View>
    );
  }
  if (status === 'running') {
    return <PulseDot color="#34d399" size={10} ring="#34d399" />;
  }
  return <View style={styles.dotUpcoming} />;
}

function ScrollEdgeFades(): React.JSX.Element {
  return (
    <View pointerEvents="none" style={styles.todayFadeOverlay}>
      <View style={styles.todayFadeLeft}>
        <View style={[styles.todayFadeSlice, styles.todayFadeSliceStrong]} />
        <View style={[styles.todayFadeSlice, styles.todayFadeSliceMid]} />
        <View style={[styles.todayFadeSlice, styles.todayFadeSliceSoft]} />
      </View>
      <View style={styles.todayFadeRight}>
        <View style={[styles.todayFadeSlice, styles.todayFadeSliceSoft]} />
        <View style={[styles.todayFadeSlice, styles.todayFadeSliceMid]} />
        <View style={[styles.todayFadeSlice, styles.todayFadeSliceStrong]} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Important                                                           */
/* ------------------------------------------------------------------ */

const URGENCY_GLOW: Record<Urgency, string> = {
  red: 'rgba(244,63,94,0.8)',
  amber: 'rgba(245,166,35,0.7)',
  grey: 'rgba(91,100,120,0.5)',
};

function ImportantCard({routine}: {routine: Routine}): React.JSX.Element {
  return (
    <View style={[styles.card, styles.importantCard]}>
      <View style={styles.importantHeader}>
        <BellIcon />
        <Text style={styles.importantTitle}>Important</Text>
      </View>
      <View style={styles.importantList}>
        {routine.important.map((item, index) => (
          <View key={`${item.title}-${index}`} style={styles.importantRow}>
            <View
              style={[
                styles.urgencyDotLg,
                {
                  backgroundColor: tokens.urgencyDot[item.urgency],
                  shadowColor: URGENCY_GLOW[item.urgency],
                },
              ]}
            />
            <View style={styles.importantTextWrap}>
              <Text style={styles.importantItemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.importantSub} numberOfLines={1}>
                {item.sub}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Weekly Highlights                                                   */
/* ------------------------------------------------------------------ */

function HighlightsCard({routine}: {routine: Routine}): React.JSX.Element {
  return (
    <View style={[styles.card, styles.highlightsCard]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Weekly Highlights</Text>
        <Text style={styles.cardHeaderMeta}>GRADED</Text>
      </View>
      <View style={styles.highlightList}>
        {routine.highlights.map((item, index) => (
          <View key={`${item.tag}-${index}`} style={styles.highlightRow}>
            <Text style={styles.highlightTag}>{item.tag}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.type}</Text>
            </View>
            <Text style={styles.highlightCourse} numberOfLines={1}>
              {item.course}
            </Text>
            <View
              style={[
                styles.urgencyDotSm,
                {
                  backgroundColor: tokens.urgencyDot[item.urgency],
                  shadowColor: URGENCY_GLOW[item.urgency],
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles (values are in reference "design units")                     */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  slot: {
    width: '100%',
  },
  canvasWrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DESIGN_W,
    height: DESIGN_H,
    padding: 15,
    borderRadius: 24,
    overflow: 'hidden',
    transformOrigin: 'top left',
    backgroundColor: GRADIENT_STOPS[0].c,
  },

  gradientWrap: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  gradientBand: {
    flex: 1,
    width: '100%',
  },

  content: {
    flex: 1,
    zIndex: 1,
    flexDirection: 'column',
    gap: 11,
  },

  /* ---- Header ---- */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 1,
  },
  logoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#16181f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    position: 'absolute',
    width: 20,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.9,
  },
  logoRingA: {
    borderColor: '#ffb380',
    transform: [{rotate: '45deg'}],
  },
  logoRingB: {
    borderColor: '#ff8a3d',
    opacity: 0.9,
    transform: [{rotate: '-45deg'}],
  },
  logoBolt: {
    width: 3,
    height: 8,
    backgroundColor: '#ffd0aa',
    borderRadius: 1,
    transform: [{skewX: '-12deg'}],
  },
  brand: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#211d16',
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(30,22,12,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(30,22,12,0.18)',
  },
  aiBadgeText: {
    fontFamily: tokens.mono,
    fontWeight: '600',
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#3a3024',
  },
  updatedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 5,
    flexShrink: 1,
  },
  updated: {
    fontSize: 11,
    color: '#4a4233',
    flexShrink: 1,
  },
  headerRight: {
    fontFamily: tokens.mono,
    fontSize: 11,
    color: '#4a4233',
    letterSpacing: 0.2,
  },
  headerRightStrong: {
    fontWeight: '600',
    color: '#211d16',
  },

  /* ---- Body ---- */
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 11,
    minHeight: 0,
  },
  leftColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 11,
    minHeight: 0,
  },
  rightColumn: {
    width: 280,
    flexDirection: 'column',
    gap: 11,
    minHeight: 0,
  },

  /* ---- Shared card ---- */
  card: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(12,14,19,0.72)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: '#eef1f6',
  },
  cardHeaderMeta: {
    fontFamily: tokens.mono,
    fontSize: 8.5,
    color: '#828b9c',
    letterSpacing: 0.4,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kicker: {
    fontFamily: tokens.mono,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  monoTime: {
    fontFamily: tokens.mono,
    fontSize: 10,
    color: '#c8d2e0',
  },
  clockGlyph: {
    fontSize: 10,
    color: '#9aa3b5',
  },
  className: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 15,
    color: '#f1f4f9',
  },
  classMeta: {
    fontFamily: tokens.mono,
    fontSize: 9.5,
    color: '#828b9c',
    marginTop: 3,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#828b9c',
    marginTop: 4,
  },

  /* ---- NOW / NEXT ---- */
  nowNextRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  nowCard: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(12,14,19,0.74)',
  },
  nextCard: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(12,14,19,0.62)',
    borderColor: 'rgba(255,255,255,0.07)',
  },
  arrowCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3a2c1c',
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#34d399',
  },
  progressLabel: {
    fontFamily: tokens.mono,
    fontSize: 9.5,
    color: '#aab0bd',
  },
  nextRange: {
    fontFamily: tokens.mono,
    fontSize: 10,
    color: '#c8d2e0',
  },
  nextFoot: {
    fontFamily: tokens.mono,
    fontSize: 9.5,
    color: '#aab0bd',
    marginTop: 5,
  },

  /* ---- Today ---- */
  todayCard: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(12,14,19,0.7)',
  },
  todayList: {
    flex: 1,
    flexDirection: 'column',
  },
  todayRow: {
    flex: 1,
    justifyContent: 'center',
  },
  todayRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
  },
  todayLine1: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayLine2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  todayDotCol: {
    width: 15,
    alignItems: 'center',
  },
  todayNameScrollerWrap: {
    flex: 1,
    marginLeft: 8,
    marginRight: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  todayNameScroller: {
    flex: 1,
  },
  todayNameScrollerContent: {
    minWidth: '100%',
  },
  todayName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: '#eef1f6',
    paddingRight: 16,
  },
  todayStatus: {
    fontFamily: tokens.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  todayTimeRange: {
    fontFamily: tokens.mono,
    fontSize: 12,
    color: '#aab0bd',
    marginRight: 8,
  },
  todayMetaScrollerWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  todayMetaScroller: {
    flex: 1,
  },
  todayMetaScrollerContent: {
    minWidth: '100%',
  },
  todayMeta: {
    fontFamily: tokens.mono,
    fontSize: 10,
    color: '#828b9c',
    paddingRight: 16,
  },
  todayFadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todayFadeLeft: {
    width: 14,
    flexDirection: 'row',
  },
  todayFadeRight: {
    width: 14,
    flexDirection: 'row',
  },
  todayFadeSlice: {
    flex: 1,
    backgroundColor: 'rgba(12,14,19,0.7)',
  },
  todayFadeSliceStrong: {
    opacity: 0.92,
  },
  todayFadeSliceMid: {
    opacity: 0.56,
  },
  todayFadeSliceSoft: {
    opacity: 0.22,
  },
  dotDone: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: 'rgba(52,211,153,0.18)',
    borderWidth: 1.2,
    borderColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotUpcoming: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0c0e13',
    borderWidth: 1.6,
    borderColor: '#5a6273',
  },
  checkGlyph: {
    color: '#34d399',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
  },

  /* ---- Important ---- */
  importantCard: {
    flexGrow: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  importantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  importantTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: '#fb8a99',
  },
  importantList: {
    flexDirection: 'column',
    gap: 7,
  },
  importantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  importantTextWrap: {
    flex: 1,
  },
  importantItemTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: '#eef1f6',
  },
  importantSub: {
    fontFamily: tokens.mono,
    fontSize: 9,
    color: '#828b9c',
    marginTop: 1,
  },

  /* ---- Weekly Highlights ---- */
  highlightsCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(12,14,19,0.7)',
  },
  highlightList: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightTag: {
    fontFamily: tokens.mono,
    fontSize: 9,
    fontWeight: '600',
    color: '#aab0bd',
    width: 34,
    letterSpacing: 0.2,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeBadgeText: {
    fontFamily: tokens.mono,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#d4dae6',
  },
  highlightCourse: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: '#dbe1ec',
  },

  /* ---- Urgency dots (shared) ---- */
  urgencyDotLg: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 3,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 3.5,
  },
  urgencyDotSm: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 3,
  },

  /* ---- Bell icon ---- */
  bellWrap: {
    width: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDome: {
    width: 9,
    height: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    borderWidth: 1.4,
    borderColor: '#fb7185',
    borderBottomWidth: 0,
  },
  bellRim: {
    width: 12,
    height: 1.4,
    borderRadius: 1,
    backgroundColor: '#fb7185',
    marginTop: -0.4,
  },
  bellClapper: {
    width: 2.6,
    height: 2.6,
    borderRadius: 1.3,
    backgroundColor: '#fb7185',
    marginTop: 0.5,
  },
});

export default WidgetPreview;
