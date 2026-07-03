package com.rafroutine.widget.model

import androidx.compose.ui.graphics.Color
import com.rafroutine.widget.theme.WidgetTokens
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.TextStyle
import java.util.Locale

/**
 * Pure, side-effect-free logic for deriving the widget's "live" state from the
 * timeline and the current clock. Uses java.time (safe on minSdk 26+).
 */
object LiveState {

    enum class Status { DONE, RUNNING, UPCOMING }

    /** Parse "HH:mm" to a LocalTime, or null on bad input. */
    fun parseTime(hhmm: String): LocalTime? = try {
        val parts = hhmm.split(":")
        if (parts.size != 2) null
        else LocalTime.of(parts[0].trim().toInt(), parts[1].trim().toInt())
    } catch (t: Throwable) {
        null
    }

    /** Status of each class relative to [now], index-aligned with [timeline]. */
    fun statuses(timeline: List<ClassItem>, now: LocalTime): List<Status> =
        timeline.map { item ->
            val start = parseTime(item.start)
            val end = parseTime(item.end)
            when {
                start == null || end == null -> Status.UPCOMING
                !now.isBefore(start) && now.isBefore(end) -> Status.RUNNING
                !now.isBefore(end) -> Status.DONE
                else -> Status.UPCOMING
            }
        }

    /** Index of the currently-running class, or -1 if none. */
    fun nowIndex(timeline: List<ClassItem>, now: LocalTime): Int =
        statuses(timeline, now).indexOfFirst { it == Status.RUNNING }

    /** Index of the next upcoming class (earliest start after [now]), or -1. */
    fun nextIndex(timeline: List<ClassItem>, now: LocalTime): Int {
        var best = -1
        var bestStart: LocalTime? = null
        timeline.forEachIndexed { i, item ->
            val start = parseTime(item.start) ?: return@forEachIndexed
            if (start.isAfter(now)) {
                // Copy to an immutable local: Kotlin can't smart-cast a `var`
                // captured by this lambda, so `bestStart.isBefore(...)` directly
                // would not compile.
                val current = bestStart
                if (current == null || start.isBefore(current)) {
                    bestStart = start
                    best = i
                }
            }
        }
        return best
    }

    /**
     * Progress of a running class as (percent 0..100, minutes left).
     * If the class isn't actually running at [now], returns (0, 0).
     */
    fun progress(running: ClassItem, now: LocalTime): Pair<Int, Int> {
        val start = parseTime(running.start) ?: return 0 to 0
        val end = parseTime(running.end) ?: return 0 to 0
        val total = minutesBetween(start, end)
        if (total <= 0) return 0 to 0
        val elapsed = minutesBetween(start, now).coerceIn(0, total)
        val pct = ((elapsed.toDouble() / total) * 100).toInt().coerceIn(0, 100)
        val minsLeft = (total - elapsed).coerceAtLeast(0)
        return pct to minsLeft
    }

    /** Short status label for the Today list. */
    fun statusText(status: Status): String = when (status) {
        Status.DONE -> "DONE"
        Status.RUNNING -> "LIVE"
        Status.UPCOMING -> "SOON"
    }

    /** Status color for the Today list / indicators (matches each row's dot). */
    fun statusColor(status: Status): Color = when (status) {
        Status.DONE -> WidgetTokens.Green      // green check -> green DONE
        Status.RUNNING -> WidgetTokens.Green   // green dot   -> green LIVE
        Status.UPCOMING -> WidgetTokens.Muted  // grey dot    -> grey SOON
    }

    /** "Sat, Jun 27" style date label. */
    fun dateLabel(today: LocalDate): String {
        val dow = today.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
        val month = today.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
        return "$dow, $month ${today.dayOfMonth}"
    }

    /** "Updated 5 min ago" / "Updated just now" / "Updated 2h ago". */
    fun relativeUpdated(updatedAt: Long, nowMs: Long): String {
        val deltaMs = (nowMs - updatedAt).coerceAtLeast(0)
        val mins = deltaMs / 60000L
        return when {
            mins < 1 -> "Updated just now"
            mins < 60 -> "Updated $mins min ago"
            else -> {
                val hours = mins / 60
                "Updated ${hours}h ago"
            }
        }
    }

    /** "in 1h 30m" / "in 45m" / "now" until [start]. */
    fun untilLabel(start: LocalTime, now: LocalTime): String {
        val mins = minutesBetween(now, start)
        if (mins <= 0) return "now"
        return "in " + hm(mins)
    }

    /** "2h 30m" / "45m" duration of a class. */
    fun durationLabel(start: LocalTime, end: LocalTime): String {
        val mins = minutesBetween(start, end).coerceAtLeast(0)
        return hm(mins)
    }

    // ----- helpers -----

    /** Whole minutes from [a] to [b] within the same day (can be negative). */
    private fun minutesBetween(a: LocalTime, b: LocalTime): Int =
        (b.toSecondOfDay() - a.toSecondOfDay()) / 60

    /** Format a minute count as "Xh Ym" / "Ym" / "Xh". */
    private fun hm(totalMins: Int): String {
        val h = totalMins / 60
        val m = totalMins % 60
        return when {
            h > 0 && m > 0 -> "${h}h ${m}m"
            h > 0 -> "${h}h"
            else -> "${m}m"
        }
    }
}
