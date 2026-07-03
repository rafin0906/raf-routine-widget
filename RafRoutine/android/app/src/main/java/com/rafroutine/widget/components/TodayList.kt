package com.rafroutine.widget.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.ColorFilter
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.itemsIndexed
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.Text
import androidx.glance.unit.ColorProvider
import com.rafroutine.R
import com.rafroutine.widget.model.ClassItem
import com.rafroutine.widget.model.LiveState
import com.rafroutine.widget.theme.WidgetTokens

/**
 * "Today" card — now the sole occupant of the left column. A compact header
 * (class count + done count) sits above the schedule; every class then takes an
 * equal share of the remaining height (flex:1) so the list fills the card with
 * no trailing gap. Rows are separated by a hairline divider.
 *
 * Each row shows: status indicator · monospace time range · class name (bold)
 * with a muted meta line (course code · room), and a right-aligned DONE/LIVE/
 * SOON label. The live class also carries its running progress on the meta line
 * (e.g. "CSE 2213 · Room 5208 · 57% · 39m left"), recomputed on each refresh.
 */
@Composable
fun TodayList(
    timeline: List<ClassItem>,
    statuses: List<LiveState.Status>,
    runningIndex: Int,
    progressPct: Int,
    minsLeft: Int,
    modifier: GlanceModifier = GlanceModifier
) {
    val doneCount = statuses.count { it == LiveState.Status.DONE }

    Column(modifier = cardModifier(modifier)) {
        // Header
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = "Today", maxLines = 1, style = titleStyle(WidgetTokens.TextTitle, size = 12))
            Spacer(GlanceModifier.defaultWeight())
            Text(
                text = "${timeline.size} CLASSES · $doneCount DONE",
                maxLines = 1,
                style = labelStyle(WidgetTokens.Muted, size = 8)
            )
        }

        Spacer(GlanceModifier.height(8.dp))

        // Scrollable schedule: a Glance LazyColumn becomes a real scrolling list
        // in the widget, so the routine can hold more classes than fit at once.
        // Rows are content-height (they no longer stretch to fill) and scroll,
        // separated by hairline dividers.
        LazyColumn(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
            itemsIndexed(timeline) { i, item ->
                val status = statuses.getOrElse(i) { LiveState.Status.UPCOMING }
                val isRunning = i == runningIndex && status == LiveState.Status.RUNNING
                ClassRow(
                    item = item,
                    status = status,
                    showDivider = i != 0,
                    meta = buildMeta(item, isRunning, progressPct, minsLeft)
                )
            }
        }
    }
}

/**
 * Meta line for a row. For the live class, progress leads so it is never the
 * part that gets clipped on a narrow widget; course code + room follow.
 *   running -> "57% · 39m left · CSE 2213 · Room 5208"
 *   other   -> "CSE 2213 · Room 5208"
 */
private fun buildMeta(
    item: ClassItem,
    isRunning: Boolean,
    progressPct: Int,
    minsLeft: Int
): String {
    val codeRoom = listOf(item.code, item.room).filter { it.isNotBlank() }.joinToString(" · ")
    if (!isRunning) return codeRoom
    val progress = "$progressPct% · ${minsLeft}m left"
    return if (codeRoom.isEmpty()) progress else "$progress · $codeRoom"
}

@Composable
private fun ClassRow(
    item: ClassItem,
    status: LiveState.Status,
    showDivider: Boolean,
    meta: String
) {
    val dimmed = status == LiveState.Status.DONE
    val nameColor = if (dimmed) WidgetTokens.Muted else WidgetTokens.TextTitle
    val timeColor = if (dimmed) WidgetTokens.Grey else WidgetTokens.Secondary
    val metaColor = if (dimmed) WidgetTokens.Grey else WidgetTokens.Muted

    Column(modifier = GlanceModifier.fillMaxWidth()) {
        // Hairline divider between rows (not above the first).
        if (showDivider) {
            Box(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(WidgetTokens.White10)
            ) {}
        }

        // Two lines. A phone widget's left column is only ~180dp wide, so a big
        // name + time range + meta + label cannot share one line without the name
        // collapsing to a single letter. Stacking keeps the name prominent.
        Column(modifier = GlanceModifier.fillMaxWidth().padding(vertical = 7.dp)) {
            // Line 1: indicator · class name · status label
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusIndicator(status)
                Spacer(GlanceModifier.width(9.dp))
                Text(
                    text = item.name,
                    maxLines = 1,
                    modifier = GlanceModifier.defaultWeight(),
                    style = titleStyle(nameColor, size = 16)
                )
                Spacer(GlanceModifier.width(6.dp))
                Text(
                    text = LiveState.statusText(status),
                    maxLines = 1,
                    style = labelStyle(LiveState.statusColor(status), size = 9)
                )
            }

            Spacer(GlanceModifier.height(3.dp))

            // Line 2: monospace time range · course code · room (· progress)
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${item.start} – ${item.end}",
                    maxLines = 1,
                    style = monoStyle(timeColor, size = 13)
                )
                Spacer(GlanceModifier.width(8.dp))
                Text(
                    text = meta,
                    maxLines = 1,
                    modifier = GlanceModifier.defaultWeight(),
                    style = monoStyle(metaColor, size = 10)
                )
            }
        }
    }
}

/**
 * Status indicator:
 *  - DONE: green ring with a check icon
 *  - RUNNING: solid green dot (Glance can't animate a pulse)
 *  - UPCOMING: hollow grey dot
 */
@Composable
private fun StatusIndicator(status: LiveState.Status) {
    when (status) {
        LiveState.Status.DONE -> {
            Box(
                modifier = GlanceModifier
                    .width(14.dp)
                    .height(14.dp)
                    .background(ImageProvider(R.drawable.bg_ring_green)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    provider = ImageProvider(R.drawable.ic_check),
                    contentDescription = null,
                    modifier = GlanceModifier.width(9.dp).height(9.dp),
                    colorFilter = ColorFilter.tint(ColorProvider(WidgetTokens.Green))
                )
            }
        }
        LiveState.Status.RUNNING -> {
            Box(
                modifier = GlanceModifier.width(14.dp).height(14.dp),
                contentAlignment = Alignment.Center
            ) {
                Dot(WidgetTokens.Green, size = 10)
            }
        }
        LiveState.Status.UPCOMING -> {
            Box(
                modifier = GlanceModifier.width(14.dp).height(14.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = GlanceModifier
                        .width(9.dp)
                        .height(9.dp)
                        .background(ImageProvider(R.drawable.bg_ring_grey))
                ) {}
            }
        }
    }
}
