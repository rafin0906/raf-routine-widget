package com.rafroutine.widget.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.cornerRadius
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.width
import androidx.glance.text.Text
import com.rafroutine.widget.model.ClassItem
import com.rafroutine.widget.theme.WidgetTokens

/**
 * "NOW" card showing the running class with a progress bar, or an empty state.
 *
 * @param running the running class, or null if nothing is live.
 * @param pct progress percent 0..100 (ignored when [running] is null).
 * @param minsLeft minutes remaining (ignored when [running] is null).
 */
@Composable
fun NowCard(
    running: ClassItem?,
    pct: Int,
    minsLeft: Int,
    modifier: GlanceModifier = GlanceModifier
) {
    Column(modifier = cardModifier(modifier)) {
        // Label row: NOW (green) + time range
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = "NOW", maxLines = 1, style = labelStyle(WidgetTokens.GreenText, size = 8))
            if (running != null) {
                Spacer(GlanceModifier.width(6.dp))
                Text(
                    text = "${running.start} – ${running.end}",
                    maxLines = 1,
                    style = monoStyle(WidgetTokens.Muted, size = 8)
                )
            }
        }

        Spacer(GlanceModifier.height(4.dp))

        if (running == null) {
            Text(
                text = "No class right now",
                maxLines = 1,
                style = titleStyle(WidgetTokens.TextTitle, size = 13)
            )
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "Enjoy the break",
                maxLines = 1,
                style = bodyStyle(WidgetTokens.Secondary, size = 9)
            )
        } else {
            Text(
                text = running.name,
                maxLines = 1,
                style = titleStyle(WidgetTokens.TextTitle, size = 13)
            )
            Spacer(GlanceModifier.height(2.dp))
            Text(
                text = "${running.code} · ${running.room}",
                maxLines = 1,
                style = bodyStyle(WidgetTokens.Secondary, size = 9)
            )

            Spacer(GlanceModifier.height(7.dp))

            // Progress bar
            LinearProgressIndicator(
                progress = pct / 100f,
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .cornerRadius(2.dp),
                color = WidgetTokens.GreenProvider,
                backgroundColor = WidgetTokens.White10Provider
            )

            Spacer(GlanceModifier.height(4.dp))

            Text(
                text = "$pct% · ${minsLeft}m left",
                maxLines = 1,
                style = monoStyle(WidgetTokens.GreenText, size = 8, bold = true)
            )
        }
    }
}
