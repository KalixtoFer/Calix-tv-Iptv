package com.ipvio.stream

import org.json.JSONArray
import org.json.JSONObject

/**
 * Pure parts of the web panel connection (no Android), so they can be unit-tested.
 * The panel stores every section as one Firestore document `config/<id>` with the settings as JSON text in the field `json`
 * (plus `prevJson`, `version`, `updatedAt`). The app only reads; see [PanelRemote].
 */
object PanelLogic {
    /** Firebase project ids: 6 to 30 characters, lower-case letters, digits and hyphens. Anything else = panel not configured. */
    fun validProject(p: String): Boolean = Regex("[a-z][a-z0-9-]{4,28}[a-z0-9]").matches(p)

    fun docUrl(project: String, id: String): String =
        "https://firestore.googleapis.com/v1/projects/$project/databases/(default)/documents/config/$id"

    fun deviceUrl(project: String, id: String): String =
        "https://firestore.googleapis.com/v1/projects/$project/databases/(default)/documents/devices/$id" +
            listOf("version", "mode", "lastError", "ts").joinToString("&", prefix = "?") { "updateMask.fieldPaths=$it" }

    /** Firestore REST answer for one document -> the settings object inside its `json` field; null if it does not look like that. */
    fun unwrap(doc: String): JSONObject? = runCatching {
        JSONObject(JSONObject(doc).getJSONObject("fields").getJSONObject("json").getString("stringValue"))
    }.getOrNull()

    /** Body for the diagnostics heartbeat (`devices/<id>`), only the four fields the Firestore rules allow. */
    fun heartbeatBody(version: String, mode: String, lastError: String, now: Long): String {
        fun s(v: String) = JSONObject().put("stringValue", v.take(300))
        return JSONObject().put(
            "fields", JSONObject()
                .put("version", s(version)).put("mode", s(if (mode == "tv") "tv" else "mobile"))
                .put("lastError", s(lastError)).put("ts", JSONObject().put("integerValue", now.toString()))
        ).toString()
    }

    /**
     * Panel sections -> the settings object that [RemoteConfig] already understands (same shape as remote/config.json).
     * [today] is "yyyy-MM-dd"; an announcement past its "expires" date is switched off. Null when no section was readable.
     */
    fun toConfig(brand: JSONObject?, servers: JSONObject?, notices: JSONObject?, today: String): JSONObject? {
        if (brand == null && servers == null && notices == null) return null
        val out = JSONObject()
        if (brand != null) out.put("serviceName", brand.optString("name").trim().take(40))
        if (servers != null) {
            val main = servers.optString("main").trim()
            val backup = servers.optString("backup").trim()
            out.put("serverUrl", if (servers.optBoolean("useBackup", false) && backup.isNotBlank()) backup else main)
            out.put("allowCustomSources", servers.optBoolean("allowCustomSources", false))
        }
        if (notices != null) {
            val expires = notices.optString("expires").trim()
            val live = notices.optBoolean("active", false) && (expires.isEmpty() || expires >= today)
            out.put(
                "announcement", JSONObject().put("enabled", live).put("id", notices.optString("id").trim().take(60))
                    .put("title", notices.optString("title")).put("text", notices.optString("text"))
            )
            out.put("banners", notices.optJSONArray("banners") ?: JSONArray())
        }
        return out
    }
}
