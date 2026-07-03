package com.rafroutine.bridge

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import androidx.glance.appwidget.updateAll
import com.rafroutine.data.RoutineRepository
import com.rafroutine.widget.RafRoutineWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Native bridge that lets the React Native JS layer push routine data into the
 * widget's DataStore and trigger widget refreshes.
 *
 * GM-1 calls these via `NativeModules.RafRoutineWidget`.
 */
class RafRoutineModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    // All persistence / Glance updateAll work happens off the main thread.
    private val scope = CoroutineScope(Dispatchers.IO)

    override fun getName(): String = MODULE_NAME

    /** Persist [json] to DataStore, then refresh every placed widget. */
    @ReactMethod
    fun updateRoutine(json: String, promise: Promise) {
        scope.launch {
            try {
                RoutineRepository.write(reactContext, json)
                RafRoutineWidget().updateAll(reactContext)
                promise.resolve(null)
            } catch (t: Throwable) {
                promise.reject(ERR_UPDATE, t)
            }
        }
    }

    /** Resolve the stored routine JSON string, or "" if nothing has been written. */
    @ReactMethod
    fun getRoutine(promise: Promise) {
        scope.launch {
            try {
                val stored = RoutineRepository.read(reactContext)
                promise.resolve(stored ?: "")
            } catch (t: Throwable) {
                promise.reject(ERR_READ, t)
            }
        }
    }

    /** Refresh every placed widget without changing the stored data. */
    @ReactMethod
    fun refreshWidget(promise: Promise) {
        scope.launch {
            try {
                RafRoutineWidget().updateAll(reactContext)
                promise.resolve(null)
            } catch (t: Throwable) {
                promise.reject(ERR_REFRESH, t)
            }
        }
    }

    companion object {
        const val MODULE_NAME = "RafRoutineWidget"
        private const val ERR_UPDATE = "RAF_UPDATE_ERROR"
        private const val ERR_READ = "RAF_READ_ERROR"
        private const val ERR_REFRESH = "RAF_REFRESH_ERROR"
    }
}
