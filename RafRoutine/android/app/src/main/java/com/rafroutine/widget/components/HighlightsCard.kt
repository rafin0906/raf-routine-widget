package com.rafroutine.widget.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.Text
import com.rafroutine.widget.model.HighlightItem
import com.rafroutine.widget.model.urgencyColor
import com.rafroutine.widget.theme.WidgetTokens

/**
 * "Weekly Highlights" card: header + "GRADED" caption, then one row per
 * highlight (mono tag of fixed width + type badge + course + urgency dot).
 */
@Composable
fun HighlightsCard(
    items: List<HighlightItem>,
    modifier: GlanceModifier = GlanceModifier
) {
    Column(modifier = cardModifier(modifier)) {
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Title takes the flexible space and truncates if the column is
            // narrow, so the "GRADED" caption never gets clipped mid-word.
            Text(
                text = "Weekly Highlights",
                maxLines = 1,
                modifier = GlanceModifier.defaultWeight(),
                style = titleStyle(WidgetTokens.TextTitle, size = 11)
            )
            Spacer(GlanceModifier.width(6.dp))
            Text(text = "GRADED", maxLines = 1, style = labelStyle(WidgetTokens.Muted, size = 7))
        }

        Spacer(GlanceModifier.height(6.dp))

        // Spacing is applied as per-row top padding rather than interleaved
        // Spacers. A Glance Column renders at most 10 direct children; with 5
        // rows, interleaved Spacers would push the count to 11 and silently
        // drop the last highlight.
        items.forEachIndexed { i, item ->
            HighlightRow(item, topPadding = if (i == 0) 0.dp else 5.dp)
        }
    }
}

@Composable
private fun HighlightRow(item: HighlightItem, topPadding: androidx.compose.ui.unit.Dp) {
    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(top = topPadding),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = item.tag,
            maxLines = 1,
            modifier = GlanceModifier.width(42.dp),
            style = monoStyle(WidgetTokens.Muted, size = 8, bold = true)
        )
        Spacer(GlanceModifier.width(5.dp))

        TypeBadge(item.type)
        Spacer(GlanceModifier.width(6.dp))

        Text(
            text = item.course,
            maxLines = 1,
            modifier = GlanceModifier.defaultWeight(),
            style = bodyStyle(
                if (item.graded) WidgetTokens.TextBody else WidgetTokens.Secondary,
                size = 9
            )
        )
        Spacer(GlanceModifier.width(6.dp))

        Dot(urgencyColor(item.urgency), size = 6)
    }
}
