package com.rafroutine.widget.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.unit.ColorProvider

/**
 * Design tokens for the Raf Routine widget, transcribed from the approved
 * design. Plain Compose [Color]s plus Glance [ColorProvider]s for places that
 * need them, and a few dp constants.
 */
object WidgetTokens {

    // ----- Gradient stops (top -> bottom) -----
    val GradientTop = Color(0xFFCDD3C6)
    val GradientMid = Color(0xFFE3A672)
    val GradientBottom = Color(0xFFE25E15)

    // ----- Cards -----
    val CardBg = Color(0xB80C0E13)      // #0c0e13 @ ~72% alpha
    val CardBorder = Color(0x14FFFFFF)  // white ~8%
    val BadgeBg = Color(0x14FFFFFF)
    val BadgeBorder = Color(0x1AFFFFFF)

    // ----- Text -----
    val TextTitle = Color(0xFFF1F4F9)
    val TextBody = Color(0xFFDBE1EC)
    val Muted = Color(0xFF828B9C)       // muted / mono
    val Secondary = Color(0xFFAAB0BD)
    val OnGradientDark = Color(0xFF211D16)
    val OnGradientSoft = Color(0xFF4A4233)

    // ----- Accents -----
    val Green = Color(0xFF34D399)
    val GreenText = Color(0xFF6EE7B7)
    val Red = Color(0xFFFB7185)
    val RedStrong = Color(0xFFF43F5E)
    val Amber = Color(0xFFF5A623)
    val Grey = Color(0xFF5B6478)

    // ----- Urgency dot map -----
    val DotRed = Color(0xFFF43F5E)
    val DotAmber = Color(0xFFF5A623)
    val DotGrey = Color(0xFF5B6478)

    // Translucent white used for progress-bar track and hairlines.
    val White10 = Color(0x1AFFFFFF)

    // ----- Glance ColorProviders (for APIs that require them) -----
    val GreenProvider = ColorProvider(Green)
    val White10Provider = ColorProvider(White10)

    // ----- dp constants -----
    val WidgetPadding = 15.dp
    val CardRadius = 13.dp
    val CardPadding = 11.dp
    val ColumnGap = 8.dp
    val RightColumnWidth = 200.dp
    val SectionGap = 11.dp
}
