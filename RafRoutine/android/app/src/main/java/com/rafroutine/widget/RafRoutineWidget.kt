package com.rafroutine.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.ImageProvider
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import com.rafroutine.R
import com.rafroutine.data.RoutineRepository
import com.rafroutine.widget.components.Header
import com.rafroutine.widget.components.HighlightsCard
import com.rafroutine.widget.components.ImportantCard
import com.rafroutine.widget.components.TodayList
import com.rafroutine.widget.model.LiveState
import com.rafroutine.widget.model.Routine
import com.rafroutine.widget.model.RoutineParser
import com.rafroutine.widget.theme.WidgetTokens
import java.time.LocalDate
import java.time.LocalTime

/**
 * The Raf Routine home-screen widget. Reads the shared-contract JSON from
 * DataStore, parses it (falling back to canonical sample data), then renders
 * the full glanceable layout.
 */
class RafRoutineWidget : GlanceAppWidget() {

    // Exact so LocalSize reports the real widget size and the layout re-derives
    // its column split whenever the user resizes the widget.
    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val stored = RoutineRepository.read(context)
        val routine = RoutineParser.parse(stored) ?: RoutineParser.sample()

        provideContent {
            WidgetRoot(routine)
        }
    }

    @Composable
    private fun WidgetRoot(routine: Routine) {
        // Compute all live state once, here, from the current clock.
        val now = LocalTime.now()
        val today = LocalDate.now()
        val nowMs = System.currentTimeMillis()

        val statuses = LiveState.statuses(routine.timeline, now)
        val nowIdx = LiveState.nowIndex(routine.timeline, now)

        val running = routine.timeline.getOrNull(nowIdx)

        val (pct, minsLeft) = if (running != null) {
            LiveState.progress(running, now)
        } else 0 to 0

        val dateLabel = LiveState.dateLabel(today)
        val updatedText = LiveState.relativeUpdated(routine.meta.updatedAt, nowMs)

        // Right column width tracks the reference proportion (~32% of the
        // content width, matching the design's 280 / ~860 split) instead of a
        // fixed dp, so both columns stay balanced at any widget size. Clamped so
        // it never starves the left column or gets too wide to be readable.
        val size = LocalSize.current
        val contentWidth = size.width - WidgetTokens.WidgetPadding * 2 - WidgetTokens.SectionGap
        val rightColumnWidth = (contentWidth * 0.34f).coerceIn(120.dp, 210.dp)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ImageProvider(R.drawable.widget_background))
                .padding(WidgetTokens.WidgetPadding)
        ) {
            Column(modifier = GlanceModifier.fillMaxSize()) {
                Header(
                    dateLabel = dateLabel,
                    weekLabel = routine.meta.weekLabel,
                    updatedText = updatedText
                )

                Spacer(GlanceModifier.height(10.dp))

                Row(modifier = GlanceModifier.fillMaxSize()) {
                    // ----- Left column: the Today list now owns the full height.
                    // The NOW/NEXT hero cards were removed; the running class's
                    // progress moved onto its row in the list. fillMaxHeight only
                    // (not fillMaxSize) so it doesn't swallow the whole Row and
                    // collapse the right column; the split is defaultWeight (left)
                    // + fixed width (right).
                    TodayList(
                        timeline = routine.timeline,
                        statuses = statuses,
                        runningIndex = nowIdx,
                        progressPct = pct,
                        minsLeft = minsLeft,
                        modifier = GlanceModifier.defaultWeight().fillMaxHeight()
                    )

                    Spacer(GlanceModifier.width(WidgetTokens.SectionGap))

                    // ----- Right column: Important + Highlights -----
                    // Both cards get a weighted (bounded) height so their inner
                    // LazyColumns have a fixed viewport to scroll within. A
                    // wrap-content card would give the lazy list no bounds.
                    Column(modifier = GlanceModifier.width(rightColumnWidth).fillMaxHeight()) {
                        ImportantCard(
                            items = routine.important,
                            modifier = GlanceModifier.fillMaxWidth().defaultWeight()
                        )

                        Spacer(GlanceModifier.height(8.dp))

                        HighlightsCard(
                            items = routine.highlights,
                            modifier = GlanceModifier.fillMaxWidth().defaultWeight()
                        )
                    }
                }
            }
        }
    }
}
