package com.rafroutine.widget.model

import androidx.compose.ui.graphics.Color
import com.rafroutine.widget.theme.WidgetTokens

/**
 * Kotlin mirror of the SHARED CONTRACT JSON stored in DataStore under
 * "routine_json". GM-1 (React Native side) writes the identical shape.
 */

/** A single class on today's timeline. start/end are "HH:mm" 24h strings. */
data class ClassItem(
    val id: String,
    val name: String,
    val code: String,
    val room: String,
    val start: String,
    val end: String
)

/** An "Important" notice (cancellations, deadlines, ...). */
data class ImportantItem(
    val title: String,
    val sub: String,
    val urgency: String
)

/** A weekly highlight (tests, quizzes, assignments, finals, ...). */
data class HighlightItem(
    val tag: String,
    val type: String,
    val course: String,
    val urgency: String,
    val graded: Boolean
)

/** Metadata block. */
data class RoutineMeta(
    val weekLabel: String,
    val updatedAt: Long
)

/** The full routine document. */
data class Routine(
    val meta: RoutineMeta,
    val timeline: List<ClassItem>,
    val important: List<ImportantItem>,
    val highlights: List<HighlightItem>
)

/**
 * Map an urgency token ("red" | "amber" | "grey") to its dot color.
 * Unknown values fall back to grey.
 */
fun urgencyColor(urgency: String): Color = when (urgency.lowercase()) {
    "red" -> WidgetTokens.DotRed
    "amber" -> WidgetTokens.DotAmber
    else -> WidgetTokens.DotGrey
}
