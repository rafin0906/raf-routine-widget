package com.rafroutine.widget.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontFamily
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.rafroutine.R
import com.rafroutine.widget.theme.WidgetTokens

/**
 * Small shared Glance helpers used across the widget components to avoid
 * repetition (card container, urgency dot, type badge, text styles).
 */

/** A rounded dark card container backed by the bg_card drawable. */
fun cardModifier(modifier: GlanceModifier = GlanceModifier): GlanceModifier =
    modifier
        .background(ImageProvider(R.drawable.bg_card))
        .padding(WidgetTokens.CardPadding)

/**
 * A small filled circle ("dot") in [color]. Rendered as a white oval drawable
 * tinted via ColorFilter, which keeps the round shape crisp on every API level
 * (a plain color background would be a rectangle).
 */
@androidx.compose.runtime.Composable
fun Dot(color: Color, size: Int = 7) {
    Image(
        provider = ImageProvider(R.drawable.bg_dot),
        contentDescription = null,
        modifier = GlanceModifier.width(size.dp).height(size.dp),
        colorFilter = ColorFilter.tint(ColorProvider(color))
    )
}

/** A small rounded "type" badge (e.g. CT 2, QUIZ, FINAL). */
@androidx.compose.runtime.Composable
fun TypeBadge(label: String) {
    Box(
        modifier = GlanceModifier
            .background(ImageProvider(R.drawable.bg_badge))
            .padding(horizontal = 5.dp, vertical = 2.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            maxLines = 1,
            style = TextStyle(
                color = ColorProvider(WidgetTokens.TextBody),
                fontSize = 8.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
        )
    }
}

// ----- Text style factories (keep call sites terse) -----

fun titleStyle(color: Color, size: Int = 12, bold: Boolean = true): TextStyle =
    TextStyle(
        color = ColorProvider(color),
        fontSize = size.sp,
        fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal
    )

fun bodyStyle(color: Color, size: Int = 10): TextStyle =
    TextStyle(
        color = ColorProvider(color),
        fontSize = size.sp,
        fontWeight = FontWeight.Normal
    )

fun monoStyle(color: Color, size: Int = 9, bold: Boolean = false): TextStyle =
    TextStyle(
        color = ColorProvider(color),
        fontSize = size.sp,
        fontWeight = if (bold) FontWeight.Medium else FontWeight.Normal,
        fontFamily = FontFamily.Monospace
    )

fun labelStyle(color: Color, size: Int = 8): TextStyle =
    TextStyle(
        color = ColorProvider(color),
        fontSize = size.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FontFamily.Monospace
    )
