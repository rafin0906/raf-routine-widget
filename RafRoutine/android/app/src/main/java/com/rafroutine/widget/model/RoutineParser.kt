package com.rafroutine.widget.model

import org.json.JSONArray
import org.json.JSONObject

/**
 * Parses the shared-contract JSON string into a [Routine]. Designed to be
 * graceful: malformed input returns null (callers fall back to [sample]).
 */
object RoutineParser {

    /**
     * Parse [json] into a [Routine], or null if it is blank or malformed.
     * Missing optional fields default sensibly so partial payloads still render.
     */
    fun parse(json: String?): Routine? {
        if (json.isNullOrBlank()) return null
        return try {
            val root = JSONObject(json)

            val metaObj = root.optJSONObject("meta")
            val meta = RoutineMeta(
                weekLabel = metaObj?.optString("weekLabel", "") ?: "",
                updatedAt = metaObj?.optLong("updatedAt", System.currentTimeMillis())
                    ?: System.currentTimeMillis()
            )

            val timeline = parseTimeline(root.optJSONArray("timeline"))
            val important = parseImportant(root.optJSONArray("important"))
            val highlights = parseHighlights(root.optJSONArray("highlights"))

            Routine(meta, timeline, important, highlights)
        } catch (t: Throwable) {
            null
        }
    }

    private fun parseTimeline(arr: JSONArray?): List<ClassItem> {
        if (arr == null) return emptyList()
        val out = ArrayList<ClassItem>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                ClassItem(
                    id = o.optString("id", i.toString()),
                    name = o.optString("name", ""),
                    code = o.optString("code", ""),
                    room = o.optString("room", ""),
                    start = o.optString("start", ""),
                    end = o.optString("end", "")
                )
            )
        }
        return out
    }

    private fun parseImportant(arr: JSONArray?): List<ImportantItem> {
        if (arr == null) return emptyList()
        val out = ArrayList<ImportantItem>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                ImportantItem(
                    title = o.optString("title", ""),
                    sub = o.optString("sub", ""),
                    urgency = o.optString("urgency", "grey")
                )
            )
        }
        return out
    }

    private fun parseHighlights(arr: JSONArray?): List<HighlightItem> {
        if (arr == null) return emptyList()
        val out = ArrayList<HighlightItem>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                HighlightItem(
                    tag = o.optString("tag", ""),
                    type = o.optString("type", ""),
                    course = o.optString("course", ""),
                    urgency = o.optString("urgency", "grey"),
                    graded = o.optBoolean("graded", false)
                )
            )
        }
        return out
    }

    /**
     * Canonical built-in sample data — must match GM-1's fallback values.
     * meta.updatedAt is computed at access time as (now - 5 minutes).
     */
    fun sampleJson(): String {
        val updatedAt = System.currentTimeMillis() - 5 * 60 * 1000L

        val meta = JSONObject()
            .put("weekLabel", "Wk 14")
            .put("updatedAt", updatedAt)

        val timeline = JSONArray().apply {
            put(classJson("1", "Database Systems", "CSE 2207", "Room 4102", "09:50", "11:20"))
            put(classJson("2", "Discrete Mathematics", "CSE 2213", "Room 5208", "11:30", "13:00"))
            put(classJson("3", "Algorithm Analysis Lab", "CSE 2208", "Lab 2, CSE", "14:30", "17:00"))
            put(classJson("4", "Software Engineering", "CSE 2211", "Room 5210", "17:10", "18:40"))
        }

        val important = JSONArray().apply {
            put(importantJson("AI Lab cancelled today", "CSE 2206 · 14:30 freed", "red"))
            put(importantJson("DB Assignment due", "Tomorrow · 11:59 PM", "amber"))
        }

        val highlights = JSONArray().apply {
            put(highlightJson("MON 29", "CT 2", "Discrete Math", "red", true))
            put(highlightJson("TUE 30", "QUIZ", "Algorithm Lab", "red", true))
            put(highlightJson("WED 01", "ASGN", "Database Systems", "amber", false))
            put(highlightJson("THU 02", "VIVA", "DB Lab Board", "amber", true))
            put(highlightJson("WED 08", "FINAL", "Microproc. Lab", "grey", true))
        }

        return JSONObject()
            .put("meta", meta)
            .put("timeline", timeline)
            .put("important", important)
            .put("highlights", highlights)
            .toString()
    }

    /** The canonical sample as a parsed [Routine] (never null). */
    fun sample(): Routine = parse(sampleJson()) ?: Routine(
        meta = RoutineMeta("Wk 14", System.currentTimeMillis()),
        timeline = emptyList(),
        important = emptyList(),
        highlights = emptyList()
    )

    private fun classJson(
        id: String, name: String, code: String, room: String, start: String, end: String
    ): JSONObject = JSONObject()
        .put("id", id)
        .put("name", name)
        .put("code", code)
        .put("room", room)
        .put("start", start)
        .put("end", end)

    private fun importantJson(title: String, sub: String, urgency: String): JSONObject =
        JSONObject()
            .put("title", title)
            .put("sub", sub)
            .put("urgency", urgency)

    private fun highlightJson(
        tag: String, type: String, course: String, urgency: String, graded: Boolean
    ): JSONObject = JSONObject()
        .put("tag", tag)
        .put("type", type)
        .put("course", course)
        .put("urgency", urgency)
        .put("graded", graded)
}
