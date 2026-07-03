package com.rafroutine.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * AppWidget broadcast receiver that wires the system widget host to our
 * [RafRoutineWidget] Glance implementation.
 */
class RafRoutineWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = RafRoutineWidget()
}
