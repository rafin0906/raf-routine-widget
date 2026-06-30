/**
 * WidgetPreview — an in-app reproduction of the Glance home-screen widget at
 * roughly a 2:1 aspect ratio. It is driven purely by the `routine` prop and a
 * `now` clock, re-deriving live state on every render via routineEngine.
 *
 * No external libraries: only React Native core components. The "gradient"
 * surface is faked with 6 absolutely-positioned equal-height color bands using
 * the design's gradient stops, clipped under the content.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {Routine} from '../types/routine';
import {tokens, urgencyColor} from '../theme/tokens';
import {
  computeLiveState,
  dateLabel,
  durationLabel,
  parseHHmm,
  relativeUpdated,
  statusLabel,
  untilLabel,
} from '../services/routineEngine';
import Pill from './Pill';

export interface WidgetPreviewProps {
  routine: Routine;
  now: Date;
}

function WidgetPreview({routine, now}: WidgetPreviewProps): React.JSX.Element {
  const live = computeLiveState(routine, now);

  return (
    <View style={styles.frame}>
      <GradientBackground />
      <View style={styles.content}>
        <Header routine={routine} now={now} />
        <View style={styles.body}>
          <View style={styles.leftColumn}>
            <NowNextRow routine={routine} now={now} live={live} />
            <TodayCard routine={routine} live={live} />
          </View>
          <View style={styles.rightColumn}>
            <ImportantCard routine={routine} />
            <HighlightsCard routine={routine} />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Gradient surface (faked with stacked bands)                         */
/* ------------------------------------------------------------------ */

function GradientBackground(): React.JSX.Element {
  return (
    <View style={styles.gradientWrap} pointerEvents="none">
      {tokens.gradient.map((color, index) => (
        <View
          key={`${color}-${index}`}
          style={[styles.gradientBand, {backgroundColor: color}]}
        />
      ))}
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
        <View style={styles.logoBox}>
          <Text style={styles.logoGlyph}>◇</Text>
        </View>
        <Text style={styles.brand}>Raf Routine</Text>
        <Pill
          text="AI"
          color={tokens.text.onGradientDark}
          bg="rgba(33,29,22,0.16)"
        />
        <View style={styles.pulseDot} />
        <Text style={styles.updated} numberOfLines={1}>
          {relativeUpdated(routine.meta.updatedAt, now)}
        </Text>
      </View>
      <Text style={styles.headerRight} numberOfLines={1}>
        {dateLabel(now)} · {routine.meta.weekLabel}
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

function NowNextRow({
  routine,
  now,
  live,
}: {
  routine: Routine;
  now: Date;
} & LiveProp): React.JSX.Element {
  const nowItem =
    live.nowIndex !== null ? routine.timeline[live.nowIndex] : null;
  const nextItem =
    live.nextIndex !== null ? routine.timeline[live.nextIndex] : null;

  return (
    <View style={styles.nowNextRow}>
      {/* NOW card */}
      <View style={[styles.card, styles.nowCard]}>
        <Text style={[styles.cardKicker, {color: tokens.accent.greenText}]}>
          NOW{nowItem ? ` · ${nowItem.start} – ${nowItem.end}` : ''}
        </Text>
        {nowItem ? (
          <>
            <Text style={styles.className} numberOfLines={1}>
              {nowItem.name}
            </Text>
            <Text style={styles.classMeta} numberOfLines={1}>
              {nowItem.code} · {nowItem.room}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${live.progressPct}%`},
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {live.progressPct}% · {live.minsLeft}m left
            </Text>
          </>
        ) : (
          <Text style={styles.emptyNow}>No class right now</Text>
        )}
      </View>

      <Text style={styles.arrow}>→</Text>

      {/* NEXT card */}
      <View style={[styles.card, styles.nextCard]}>
        <Text style={[styles.cardKicker, {color: tokens.text.secondary}]}>
          NEXT{nextItem ? ` · ${untilLabel(parseHHmm(nextItem.start, now), now)}` : ''}
        </Text>
        {nextItem ? (
          <>
            <Text style={styles.className} numberOfLines={1}>
              {nextItem.name}
            </Text>
            <Text style={styles.classMeta} numberOfLines={1}>
              {nextItem.code} · {nextItem.room}
            </Text>
            <Text style={styles.nextRange} numberOfLines={1}>
              {nextItem.start} – {nextItem.end}
            </Text>
            <Text style={styles.nextFoot} numberOfLines={1}>
              Upcoming ·{' '}
              {durationLabel(
                parseHHmm(nextItem.start, now),
                parseHHmm(nextItem.end, now),
              )}
            </Text>
          </>
        ) : (
          <Text style={styles.emptyNow}>No more classes</Text>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Today list                                                          */
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
      {routine.timeline.map((item, index) => {
        const status = live.statuses[index];
        const isDone = status === 'done';
        const label = statusLabel(status);
        const labelColor =
          status === 'upcoming' ? tokens.text.muted : tokens.accent.greenText;
        return (
          <View
            key={item.id}
            style={[styles.todayRow, isDone ? styles.todayRowDone : null]}>
            <StatusDot status={status} />
            <Text style={styles.todayTime}>
              {item.start}
            </Text>
            <Text style={styles.todayName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.todayStatus, {color: labelColor}]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StatusDot({status}: {status: string}): React.JSX.Element {
  if (status === 'done') {
    return (
      <View style={[styles.dotBase, styles.dotDone]}>
        <Text style={styles.checkGlyph}>✓</Text>
      </View>
    );
  }
  if (status === 'running') {
    return <View style={[styles.dotBase, styles.dotRunning]} />;
  }
  return <View style={[styles.dotBase, styles.dotUpcoming]} />;
}

/* ------------------------------------------------------------------ */
/* Important                                                           */
/* ------------------------------------------------------------------ */

function ImportantCard({routine}: {routine: Routine}): React.JSX.Element {
  return (
    <View style={[styles.card, styles.rightCard]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.bellGlyph}>◔</Text>
        <Text style={[styles.cardTitle, {color: tokens.accent.importantTitle}]}>
          Important
        </Text>
      </View>
      {routine.important.map((item, index) => (
        <View key={`${item.title}-${index}`} style={styles.importantRow}>
          <View
            style={[
              styles.urgencyDot,
              {backgroundColor: urgencyColor(item.urgency)},
            ]}
          />
          <View style={styles.importantTextWrap}>
            <Text style={styles.importantTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.importantSub} numberOfLines={1}>
              {item.sub}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Weekly Highlights                                                   */
/* ------------------------------------------------------------------ */

function HighlightsCard({routine}: {routine: Routine}): React.JSX.Element {
  return (
    <View style={[styles.card, styles.rightCard]}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Weekly Highlights</Text>
        <Text style={styles.cardHeaderMeta}>GRADED</Text>
      </View>
      {routine.highlights.map((item, index) => (
        <View key={`${item.tag}-${index}`} style={styles.highlightRow}>
          <Text style={styles.highlightTag}>{item.tag}</Text>
          <Pill
            text={item.type}
            color={tokens.text.body}
            bg="rgba(255,255,255,0.07)"
          />
          <Text style={styles.highlightCourse} numberOfLines={1}>
            {item.course}
          </Text>
          <View
            style={[
              styles.urgencyDot,
              {backgroundColor: urgencyColor(item.urgency)},
            ]}
          />
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const CARD_RADIUS = tokens.card.radius;

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: tokens.gradient[0],
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
    padding: 10,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  logoBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: tokens.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  logoGlyph: {
    color: tokens.accent.warm,
    fontSize: 11,
    fontWeight: '900',
  },
  brand: {
    color: tokens.text.onGradientDark,
    fontWeight: '800',
    fontSize: 13,
    marginRight: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.accent.green,
    marginLeft: 8,
    marginRight: 4,
  },
  updated: {
    color: tokens.text.onGradientSoft,
    fontSize: 9,
    flexShrink: 1,
  },
  headerRight: {
    color: tokens.text.onGradientDark,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
  },

  /* Body layout */
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
    marginRight: 8,
  },
  rightColumn: {
    width: '38%',
  },

  /* Cards */
  card: {
    backgroundColor: tokens.card.bg,
    borderColor: tokens.card.border,
    borderWidth: 1,
    borderRadius: CARD_RADIUS,
    padding: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    color: tokens.text.title,
    fontSize: 11,
    fontWeight: '800',
  },
  cardHeaderMeta: {
    color: tokens.text.muted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cardKicker: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  className: {
    color: tokens.text.title,
    fontSize: 12,
    fontWeight: '700',
  },
  classMeta: {
    color: tokens.text.secondary,
    fontSize: 9,
    marginTop: 1,
  },

  /* NOW / NEXT row */
  nowNextRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
  },
  nowCard: {
    flex: 1,
  },
  nextCard: {
    flex: 1,
  },
  arrow: {
    color: tokens.text.muted,
    fontSize: 14,
    fontWeight: '700',
    alignSelf: 'center',
    marginHorizontal: 5,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.accent.green,
  },
  progressLabel: {
    color: tokens.accent.greenText,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyNow: {
    color: tokens.text.muted,
    fontSize: 11,
    marginTop: 6,
  },
  nextRange: {
    color: tokens.text.body,
    fontSize: 9,
    fontFamily: tokens.mono,
    marginTop: 4,
  },
  nextFoot: {
    color: tokens.text.muted,
    fontSize: 8,
    marginTop: 2,
  },

  /* Today list */
  todayCard: {
    flex: 1,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  todayRowDone: {
    opacity: 0.6,
  },
  todayTime: {
    color: tokens.text.muted,
    fontSize: 9,
    fontFamily: tokens.mono,
    width: 38,
    marginLeft: 6,
  },
  todayName: {
    color: tokens.text.body,
    fontSize: 10,
    flex: 1,
    marginRight: 6,
  },
  todayStatus: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Status dots */
  dotBase: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: tokens.accent.green,
  },
  dotRunning: {
    backgroundColor: tokens.accent.green,
    borderWidth: 2,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  dotUpcoming: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: tokens.accent.grey,
  },
  checkGlyph: {
    color: tokens.screenBg,
    fontSize: 7,
    fontWeight: '900',
    lineHeight: 9,
  },

  /* Right column cards */
  rightCard: {
    marginBottom: 8,
  },
  bellGlyph: {
    color: tokens.accent.importantTitle,
    fontSize: 11,
    marginRight: 4,
  },
  importantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
  },
  importantTextWrap: {
    flex: 1,
  },
  importantTitle: {
    color: tokens.text.title,
    fontSize: 10,
    fontWeight: '700',
  },
  importantSub: {
    color: tokens.text.muted,
    fontSize: 8,
    fontFamily: tokens.mono,
    marginTop: 1,
  },

  /* Highlights */
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  highlightTag: {
    color: tokens.text.secondary,
    fontSize: 8,
    fontFamily: tokens.mono,
    width: 34,
    marginRight: 5,
  },
  highlightCourse: {
    color: tokens.text.body,
    fontSize: 9,
    flex: 1,
    marginLeft: 5,
    marginRight: 5,
  },

  /* Shared urgency dot */
  urgencyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 3,
    marginRight: 6,
  },
});

export default WidgetPreview;
