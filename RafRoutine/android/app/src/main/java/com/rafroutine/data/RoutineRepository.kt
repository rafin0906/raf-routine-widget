package com.rafroutine.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

// Single DataStore instance for the whole process, keyed by name "raf_routine".
private val Context.routineDataStore by preferencesDataStore(name = "raf_routine")

/**
 * Thin DataStore wrapper that stores the shared routine JSON contract under the
 * string key "routine_json". Both the native bridge (writer) and the Glance
 * widget (reader) go through here so there is one source of truth.
 */
object RoutineRepository {

    private val KEY_ROUTINE_JSON = stringPreferencesKey("routine_json")

    /** Persist the raw JSON contract string. */
    suspend fun write(context: Context, json: String) {
        context.routineDataStore.edit { prefs ->
            prefs[KEY_ROUTINE_JSON] = json
        }
    }

    /** Read the stored JSON string, or null if nothing has been written yet. */
    suspend fun read(context: Context): String? {
        val prefs = context.routineDataStore.data.first()
        return prefs[KEY_ROUTINE_JSON]
    }
}
