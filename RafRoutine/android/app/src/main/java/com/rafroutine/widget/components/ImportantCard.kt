package com.rafroutine.widget.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.itemsIndexed
import androidx.glance.unit.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.Text
import com.rafroutine.R
import com.rafroutine.widget.model.ImportantItem
import com.rafroutine.widget.model.urgencyColor
import com.rafroutine.widget.theme.WidgetTokens

/**
 * "Important" card: a bell icon + red-ish "Important" header (fixed), then a
 * scrollable list of notices (urgency dot + bold title + mono sub-line). The
 * LazyColumn scrolls when there are more notices than fit.
 */
@Composable
fun ImportantCard(
    items: List<ImportantItem>,
    modifier: GlanceModifier = GlanceModifier
) {
    Column(modifier = cardModifier(modifier)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(
                provider = ImageProvider(R.drawable.ic_bell),
                contentDescription = null,
                modifier = GlanceModifier.width(11.dp).height(11.dp),
                colorFilter = androidx.glance.ColorFilter.tint(ColorProvider(WidgetTokens.Red))
            )
            Spacer(GlanceModifier.width(5.dp))
            Text(text = "Important", maxLines = 1, style = titleStyle(WidgetTokens.Red, size = 11))
        }

        Spacer(GlanceModifier.height(6.dp))

        LazyColumn(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
            itemsIndexed(items) { i, item ->
                ImportantRow(item, topPadding = if (i == 0) 0.dp else 6.dp)
            }
        }
    }
}

@Composable
private fun ImportantRow(item: ImportantItem, topPadding: Dp) {
    Row(
        modifier = GlanceModifier.fillMaxWidth().padding(top = topPadding),
        verticalAlignment = Alignment.Top
    ) {
        // Dot nudged down a touch to align with the title baseline.
        Column {
            Spacer(GlanceModifier.height(3.dp))
            Dot(urgencyColor(item.urgency), size = 6)
        }
        Spacer(GlanceModifier.width(7.dp))
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = item.title,
                maxLines = 1,
                style = titleStyle(WidgetTokens.TextTitle, size = 10)
            )
            Spacer(GlanceModifier.height(1.dp))
            Text(
                text = item.sub,
                maxLines = 1,
                style = monoStyle(WidgetTokens.Muted, size = 8)
            )
        }
    }
}
