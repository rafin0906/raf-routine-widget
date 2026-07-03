package com.rafroutine.widget.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.unit.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.height
import androidx.glance.layout.width
import androidx.glance.text.Text
import com.rafroutine.R
import com.rafroutine.widget.model.ClassItem
import com.rafroutine.widget.theme.WidgetTokens

/**
 * "NEXT" card showing the upcoming class with an "in 1h 30m" countdown, or an
 * empty state when nothing else is scheduled today.
 *
 * @param next the next class, or null.
 * @param untilLabel e.g. "in 1h 30m" (ignored when [next] is null).
 * @param durationLabel e.g. "2h 30m" (ignored when [next] is null).
 */
@Composable
fun NextCard(
    next: ClassItem?,
    untilLabel: String,
    durationLabel: String,
    modifier: GlanceModifier = GlanceModifier
) {
    Column(modifier = cardModifier(modifier)) {
        // Label row: NEXT + clock icon + until
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = "NEXT", maxLines = 1, style = labelStyle(WidgetTokens.Secondary, size = 8))
            if (next != null) {
                Spacer(GlanceModifier.width(6.dp))
                Image(
                    provider = ImageProvider(R.drawable.ic_clock),
                    contentDescription = null,
                    modifier = GlanceModifier.width(9.dp).height(9.dp),
                    colorFilter = androidx.glance.ColorFilter.tint(
                        ColorProvider(WidgetTokens.Muted)
                    )
                )
                Spacer(GlanceModifier.width(3.dp))
                Text(text = untilLabel, maxLines = 1, style = monoStyle(WidgetTokens.Muted, size = 8))
            }
        }

        Spacer(GlanceModifier.height(4.dp))

        if (next == null) {
            Text(
                text = "Nothing else today",
                maxLines = 1,
                style = titleStyle(WidgetTokens.TextTitle, size = 13)
            )
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "You're all done",
                maxLines = 1,
                style = bodyStyle(WidgetTokens.Secondary, size = 9)
            )
        } else {
            Text(
                text = next.name,
                maxLines = 1,
                style = titleStyle(WidgetTokens.TextTitle, size = 13)
            )
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "${next.code} · ${next.room}",
                maxLines = 1,
                style = bodyStyle(WidgetTokens.Secondary, size = 9)
            )

            Spacer(GlanceModifier.height(7.dp))

            Text(
                text = "${next.start} – ${next.end}",
                maxLines = 1,
                style = monoStyle(WidgetTokens.Secondary, size = 9)
            )
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "Upcoming · $durationLabel",
                maxLines = 1,
                style = monoStyle(WidgetTokens.Muted, size = 8)
            )
        }
    }
}
