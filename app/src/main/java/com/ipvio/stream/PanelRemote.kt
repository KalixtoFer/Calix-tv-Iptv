package com.ipvio.stream

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Web panel connection (Firebase / Firestore over plain HTTPS, no extra library). The project id comes from calix.properties
 * (`firebase=`); empty means "no panel", and everything keeps working with the GitHub file or the built-in defaults.
 * The app only reads `config/*` and writes its own diagnostics row `devices/<id>` (version, mode, last error). No secrets.
 */
object PanelRemote {
    private val project: String get() = BuildConfig.CALIX_FIREBASE_PROJECT
    val enabled: Boolean get() = PanelLogic.validProject(project)

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences("calix_remote", Context.MODE_PRIVATE)

    /** One panel section (e.g. "update"), null when the panel is off, unreachable or the section does not exist. Blocking: call off the main thread. */
    fun fetch(id: String): JSONObject? {
        if (!enabled) return null
        val req = Request.Builder().url(PanelLogic.docUrl(project, id)).header("Cache-Control", "no-cache").build()
        return runCatching { Net.base.newCall(req).execute().use { r -> if (r.isSuccessful) PanelLogic.unwrap(r.body?.string().orEmpty()) else null } }.getOrNull()
    }

    /** The settings from the panel in the shape [RemoteConfig] reads, or null (then the caller keeps what it has). */
    suspend fun config(): JSONObject? = withContext(Dispatchers.IO) {
        if (!enabled) return@withContext null
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        PanelLogic.toConfig(fetch("brand"), fetch("servers"), fetch("notices"), today)
    }

    /** Diagnostics for the panel: app version, phone or TV, last error. Fire and forget; failures stay invisible. */
    suspend fun heartbeat(c: Context, lastError: String = "") = withContext(Dispatchers.IO) {
        if (!enabled) return@withContext
        runCatching {
            val p = prefs(c)
            val id = p.getString("did", null) ?: UUID.randomUUID().toString().also { p.edit().putString("did", it).apply() }
            val body = PanelLogic.heartbeatBody(AppUpdate.currentName(c), if (DeviceMode.isPhone(c)) "mobile" else "tv", lastError, System.currentTimeMillis())
            val req = Request.Builder().url(PanelLogic.deviceUrl(project, id)).patch(body.toRequestBody("application/json".toMediaType())).build()
            Net.base.newCall(req).execute().close()
        }
    }
}
