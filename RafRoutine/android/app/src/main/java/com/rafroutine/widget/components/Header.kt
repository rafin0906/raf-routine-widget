package com.rafroutine.widget.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.rafroutine.R
import com.rafroutine.widget.theme.WidgetTokens

/**
 * Top header that sits directly on the gradient (no card), so it uses the dark
 * on-gradient text tones. Left: logo + "Raf Routine" + AI pill + pulse dot +
 * relative-updated. Right: "Sat, Jun 27 · Wk 14".
 */
@Composable
fun Header(dateLabel: String, weekLabel: String, updatedText: String) {
    // The outer Row keeps just two children — the left cluster and the date —
    // because a Glance Row renders at most 10 direct children. The left items
    // are nested in their own (weighted) Row so the date is never dropped.
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = GlanceModifier.defaultWeight(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Logo mark in a soft box.
            Box(
                modifier = GlanceModifier
                    .width(22.dp)
                    .height(22.dp)
                    .background(ImageProvider(R.drawable.bg_logo)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    provider = ImageProvider(R.drawable.ic_logo),
                    contentDescription = null,
                    modifier = GlanceModifier.width(14.dp).height(14.dp),
                    colorFilter = androidx.glance.ColorFilter.tint(
                        ColorProvider(WidgetTokens.OnGradientDark)
                    )
                )
            }

            Spacer(GlanceModifier.width(7.dp))

            Text(
                text = "Raf Routine",
                maxLines = 1,
                style = TextStyle(
                    color = ColorProvider(WidgetTokens.OnGradientDark),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            )

            Spacer(GlanceModifier.width(6.dp))

            // "AI" pill
            Box(
                modifier = GlanceModifier
                    .background(ImageProvider(R.drawable.bg_ai_pill))
                    .padding(horizontal = 5.dp, vertical = 1.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "AI",
                    maxLines = 1,
                    style = labelStyle(WidgetTokens.OnGradientDark, size = 8)
                )
            }

            Spacer(GlanceModifier.width(8.dp))

            // Green pulse dot + updated text
            Dot(WidgetTokens.Green, size = 6)
            Spacer(GlanceModifier.width(4.dp))
            Text(
                text = updatedText,
                maxLines = 1,
                style = TextStyle(
                    color = ColorProvider(WidgetTokens.OnGradientSoft),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Medium
                )
            )
        }

        // Date · week, pinned to the far right.
        Text(
            text = "$dateLabel · $weekLabel",
            maxLines = 1,
            style = TextStyle(
                color = ColorProvider(WidgetTokens.OnGradientDark),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}
