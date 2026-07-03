package com.rafroutine.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.temporal.WeekFields
import java.util.Locale

/**
 * Pull the live backend widget payload and convert it into the shared routine
 * JSON contract the Glance widget already knows how to render.
 */
object BackendRoutineSync {

    private const val BACKEND_URL = "http://10.0.2.2:8000/api/widget-state"
    private const val CONNECT_TIMEOUT_MS = 4000
    private const val READ_TIMEOUT_MS = 4000

    suspend fun sync(context: Context): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            val payload = fetchPayload()
            val routineJson = mapPayloadToRoutineJson(payload)
            RoutineRepository.write(context, routineJson)
            true
        }.getOrElse {
            false
        }
    }

    private fun fetchPayload(): JSONObject {
        val conn = (URL(BACKEND_URL).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            setRequestProperty("Accept", "application/json")
        }

        return conn.useJsonObject()
    }

    private fun HttpURLConnection.useJsonObject(): JSONObject {
        try {
            connect()
            if (responseCode !in 200..299) {
                throw IllegalStateException("Backend request failed with HTTP $responseCode")
            }
            val body = inputStream.bufferedReader().use { it.readText() }
            return JSONObject(body)
        } finally {
            disconnect()
        }
    }

    private fun mapPayloadToRoutineJson(payload: JSONObject): String {
        val lastUpdated = payload.optString("lastUpdated")
        val updatedAt = lastUpdated.toEpochMillisOrNow()

        val root = JSONObject()
        root.put(
            "meta",
            JSONObject()
                .put("weekLabel", weekLabel(lastUpdated))
                .put("updatedAt", updatedAt)
        )
        root.put("timeline", mapTimeline(payload.optJSONArray("todayClasses")))
        root.put("important", mapImportant(payload.optJSONArray("importantNotices")))
        root.put("highlights", mapHighlights(payload.optJSONArray("weeklyHighlights")))
        return root.toString()
    }

    private fun mapTimeline(arr: JSONArray?): JSONArray {
        val out = JSONArray()
        if (arr == null) return out

        for (i in 0 until arr.length()) {
            val item = arr.optJSONObject(i) ?: continue
            if (item.optString("status").equals("cancelled", ignoreCase = true)) {
                continue
            }

            out.put(
                JSONObject()
                    .put("id", item.optString("id", "class-$i"))
                    .put("name", item.optString("displayTitle", "Class"))
                    .put("code", joinOr(item.optJSONArray("courseIds"), ""))
                    .put("room", joinOr(item.optJSONArray("rooms"), ""))
                    .put("start", item.optString("start", "00:00"))
                    .put("end", item.optString("end", "00:00"))
            )
        }

        return out
    }

    private fun mapImportant(arr: JSONArray?): JSONArray {
        val out = JSONArray()
        if (arr == null) return out

        for (i in 0 until arr.length()) {
            val item = arr.optJSONObject(i) ?: continue
            out.put(
                JSONObject()
                    .put("title", item.optString("title", "Notice"))
                    .put("sub", item.optString("description", item.optString("type", "")))
                    .put("urgency", priorityToUrgency(item.optString("priority")))
            )
        }

        return out
    }

    private fun mapHighlights(arr: JSONArray?): JSONArray {
        val out = JSONArray()
        if (arr == null) return out

        for (i in 0 until arr.length()) {
            val item = arr.optJSONObject(i) ?: continue
            out.put(
                JSONObject()
                    .put("tag", buildTag(item))
                    .put("type", item.optString("label", item.optString("type", "")).uppercase())
                    .put("course", joinOr(item.optJSONArray("courseIds"), item.optString("title", "")))
                    .put("urgency", priorityToUrgency(item.optString("priority")))
                    .put("graded", item.optBoolean("isGraded", false))
            )
        }

        return out
    }

    private fun buildTag(item: JSONObject): String {
        val dayAbbr = when (item.optString("day").lowercase()) {
            "saturday" -> "SAT"
            "sunday" -> "SUN"
            "monday" -> "MON"
            "tuesday" -> "TUE"
            "wednesday" -> "WED"
            "thursday" -> "THU"
            "friday" -> "FRI"
            else -> item.optString("day").take(3).uppercase()
        }

        val isoDate = item.optString("date")
        val dayOfMonth = isoDate.split("-").getOrNull(2)?.toIntOrNull()?.let {
            it.toString().padStart(2, '0')
        }.orEmpty()

        val tag = listOf(dayAbbr, dayOfMonth).filter { it.isNotBlank() }.joinToString(" ")
        return if (tag.isNotBlank()) tag else item.optString("label", item.optString("type", "—")).uppercase()
    }

    private fun joinOr(arr: JSONArray?, fallback: String): String {
        if (arr == null || arr.length() == 0) {
            return fallback
        }
        val parts = buildList {
            for (i in 0 until arr.length()) {
                val value = arr.optString(i)
                if (value.isNotBlank()) add(value)
            }
        }
        return if (parts.isEmpty()) fallback else parts.joinToString(" / ")
    }

    private fun priorityToUrgency(priority: String): String = when (priority.lowercase()) {
        "high" -> "red"
        "medium" -> "amber"
        else -> "grey"
    }

    private fun weekLabel(iso: String): String {
        val date = iso.takeIf { it.isNotBlank() }
            ?.let { runCatching { java.time.OffsetDateTime.parse(it).toLocalDate() }.getOrNull() }
            ?: LocalDate.now()
        val week = date.get(WeekFields.ISO.weekOfWeekBasedYear())
        return "Wk $week"
    }

    private fun String.toEpochMillisOrNow(): Long =
        runCatching { java.time.OffsetDateTime.parse(this).toInstant().toEpochMilli() }
            .getOrElse { System.currentTimeMillis() }
}