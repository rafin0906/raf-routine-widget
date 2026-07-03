package com.rafroutine.widget.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.background
import androidx.glance.unit.ColorProvider
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
import com.rafroutine.R
import com.rafroutine.widget.model.ClassItem
import com.rafroutine.widget.model.LiveState
import com.rafroutine.widget.theme.WidgetTokens

/**
 * "Today" card: a header with the class count + done count, then one row per
 * class. Each row has a status indicator, mono start time, the class name, and
 * a DONE/LIVE/SOON status chip. Done rows are slightly dimmed.
 */
@Composable
fun TodayList(
    timeline: List<ClassItem>,
    statuses: List<LiveState.Status>,
    modifier: GlanceModifier = GlanceModifier
) {
    val doneCount = statuses.count { it == LiveState.Status.DONE }

    Column(modifier = cardModifier(modifier)) {
        // Header
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = "Today", maxLines = 1, style = titleStyle(WidgetTokens.TextTitle, size = 11))
            Spacer(GlanceModifier.defaultWeight())
            Text(
                text = "${timeline.size} CLASSES · $doneCount DONE",
                maxLines = 1,
                style = labelStyle(WidgetTokens.Muted, size = 7)
            )
        }

        Spacer(GlanceModifier.height(6.dp))

        // Per-row top padding instead of interleaved Spacers keeps the direct
        // child count under Glance's 10-children-per-Column limit (which would
        // otherwise drop the last class once the timeline grows).
        timeline.forEachIndexed { i, item ->
            val status = statuses.getOrElse(i) { LiveState.Status.UPCOMING }
            ClassRow(item, status, topPadding = if (i == 0) 0.dp else 5.dp)
        }
    }
}

@Composable
private fun ClassRow(
    item: ClassItem,
    status: LiveState.Status,
    topPadding: androidx.compose.ui.unit.Dp
) {
    val dimmed = status == LiveState.Status.DONE
    val nameColor = if (dimmed) WidgetTokens.Muted else WidgetTokens.TextBody
    val timeColor = if (dimmed) WidgetTokens.Grey else WidgetTokens.Secondary

    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(top = topPadding),
        verticalAlignment = Alignment.CenterVertically
    ) {
        StatusIndicator(status)
        Spacer(GlanceModifier.width(7.dp))

        Text(
            text = item.start,
            maxLines = 1,
            modifier = GlanceModifier.width(34.dp),
            style = monoStyle(timeColor, size = 9)
        )
        Spacer(GlanceModifier.width(6.dp))

        Text(
            text = item.name,
            maxLines = 1,
            modifier = GlanceModifier.defaultWeight(),
            style = bodyStyle(nameColor, size = 10)
        )
        Spacer(GlanceModifier.width(6.dp))

        Text(
            text = LiveState.statusText(status),
            maxLines = 1,
            style = labelStyle(LiveState.statusColor(status), size = 7)
        )
    }
}

/**
 * Status indicator:
 *  - DONE: green ring with a check icon
 *  - RUNNING: solid green dot
 *  - UPCOMING: hollow grey dot
 */
@Composable
private fun StatusIndicator(status: LiveState.Status) {
    when (status) {
        LiveState.Status.DONE -> {
            Box(
                modifier = GlanceModifier
                    .width(12.dp)
                    .height(12.dp)
                    .background(ImageProvider(R.drawable.bg_ring_green)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    provider = ImageProvider(R.drawable.ic_check),
                    contentDescription = null,
                    modifier = GlanceModifier.width(8.dp).height(8.dp),
                    colorFilter = androidx.glance.ColorFilter.tint(
                        ColorProvider(WidgetTokens.Green)
                    )
                )
            }
        }
        LiveState.Status.RUNNING -> {
            Box(
                modifier = GlanceModifier.width(12.dp).height(12.dp),
                contentAlignment = Alignment.Center
            ) {
                Dot(WidgetTokens.Green, size = 8)
            }
        }
        LiveState.Status.UPCOMING -> {
            Box(
                modifier = GlanceModifier
                    .width(12.dp)
                    .height(12.dp),
                contentAlignment = Alignment.Center
            ) {
                // Hollow grey dot = a small ring drawable.
                Box(
                    modifier = GlanceModifier
                        .width(8.dp)
                        .height(8.dp)
                        .background(ImageProvider(R.drawable.bg_ring_grey))
                ) {}
            }
        }
    }
}
