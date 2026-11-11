package com.ipvio.stream

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONObject

/**
 * Calix TV: ajustes remotos editables desde el panel (carpeta remote/ del repositorio de GitHub).
 *
 * remote/config.json
 * {
 *   "serviceName": "Calix TV",
 *   "serverUrl": "http://servidor:puerto",      // servidor Xtream fijo: el usuario solo escribe usuario y clave
 *   "allowCustomSources": false,                // true = se muestra también la pantalla original (M3U / Stalker / otro servidor)
 *   "announcement": { "enabled": true, "id": "2026-11-11", "title": "...", "text": "..." },
 *   "banners": [ { "image": "https://...", "title": "...", "link": "" } ]
 * }
 *
 * Sin conexión o con el archivo roto se usa la última copia guardada y, si no hay ninguna, el servidor de calix.properties.
 */
object RemoteConfig {
    data class Banner(val image: String, val title: String, val link: String)

    var serviceName by mutableStateOf("Calix TV")
        private set
    var serverUrl by mutableStateOf("")
        private set
    var allowCustomSources by mutableStateOf(false)
        private set
    var annEnabled by mutableStateOf(false)
        private set
    var annId by mutableStateOf("")
        private set
    var annTitle by mutableStateOf("")
        private set
    var annText by mutableStateOf("")
        private set
    var banners by mutableStateOf<List<Banner>>(emptyList())
        private set
    /** "Más tarde" tocado en el aviso: queda oculto hasta el próximo inicio. */
    var annDismissed by mutableStateOf(false)

    private var inited = false
    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences("calix_remote", Context.MODE_PRIVATE)

    /** Servidor Xtream a usar: el del panel o, si no hay, el de calix.properties. Vacío = sin servidor fijo. */
    fun server(): String = serverUrl.ifBlank { BuildConfig.CALIX_DEFAULT_SERVER }.trim()

    /** true = pantalla de acceso simplificada (solo usuario y contraseña). */
    fun fixedMode(): Boolean = server().isNotBlank() && !allowCustomSources

    @Synchronized
    fun init(c: Context) {
        if (inited) return
        inited = true
        val raw = prefs(c).getString("json", "").orEmpty()
        if (raw.isNotBlank()) runCatching { applyJson(JSONObject(raw)) }
    }

    private fun applyJson(j: JSONObject) {
        serviceName = j.optString("serviceName", "Calix TV").ifBlank { "Calix TV" }.take(40)
        serverUrl = j.optString("serverUrl", "").trim().take(300)
        allowCustomSources = j.optBoolean("allowCustomSources", false)
        val a = j.optJSONObject("announcement")
        annEnabled = a != null && a.optBoolean("enabled", false)
        annId = a?.optString("id", "").orEmpty().take(60)
        annTitle = a?.optString("title", "").orEmpty().take(120)
        annText = a?.optString("text", "").orEmpty().take(1200)
        val arr = j.optJSONArray("banners")
        val list = ArrayList<Banner>()
        if (arr != null) for (i in 0 until minOf(arr.length(), 10)) {
            val o = arr.optJSONObject(i) ?: continue
            val img = o.optString("image").trim()
            if (img.startsWith("http://") || img.startsWith("https://")) list.add(Banner(img, o.optString("title").take(120), o.optString("link").trim()))
        }
        banners = list
    }

    /** Lee remote/config.json de GitHub. Los errores quedan invisibles: se sigue con la última copia guardada. */
    suspend fun refresh(c: Context) {
        val url = BuildConfig.CALIX_CONFIG_URL
        if (url.contains("TU_USUARIO")) return   // calix.properties todavía sin configurar
        withContext(Dispatchers.IO) {
            runCatching {
                val req = Request.Builder().url(url).header("User-Agent", "Calix TV").header("Cache-Control", "no-cache").build()
                Net.base.newCall(req).execute().use { r ->
                    if (!r.isSuccessful) return@use
                    val body = r.body?.string().orEmpty()
                    val j = JSONObject(body)   // si no es JSON válido lanza y no se guarda nada
                    prefs(c).edit().putString("json", body).apply()
                    withContext(Dispatchers.Main) { applyJson(j) }
                }
            }
        }
    }

    fun annSeen(c: Context): Boolean = prefs(c).getString("ann_seen", "") == annId
    fun markAnnSeen(c: Context) { prefs(c).edit().putString("ann_seen", annId).apply() }
}

/**
 * Aviso del panel: se muestra una vez por cada aviso nuevo (cambia el "id" en el panel para volver a mostrarlo).
 * Si hay banners, el primero se muestra arriba del texto.
 */
@Composable
fun AnnouncementHost() {
    val ctx = LocalContext.current
    LaunchedEffect(Unit) { RemoteConfig.refresh(ctx) }
    if (!RemoteConfig.annEnabled || RemoteConfig.annDismissed || RemoteConfig.annId.isBlank()) return
    if (RemoteConfig.annText.isBlank() && RemoteConfig.annTitle.isBlank()) return
    if (RemoteConfig.annSeen(ctx)) return
    val focus = remember { FocusRequester() }
    LaunchedEffect(RemoteConfig.annId) { delay(150); runCatching { focus.requestFocus() } }
    val close = { RemoteConfig.markAnnSeen(ctx); RemoteConfig.annDismissed = true }
    Dialog(onDismissRequest = { close() }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color(0xE6000000)), contentAlignment = Alignment.Center) {
            Column(
                Modifier.widthIn(max = 620.dp).clip(RoundedCornerShape(20.dp)).background(Tok.GlassStrong).padding(28.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                RemoteConfig.banners.firstOrNull()?.let {
                    AsyncImage(
                        model = it.image, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().height(170.dp).clip(RoundedCornerShape(14.dp))
                    )
                }
                if (RemoteConfig.annTitle.isNotBlank()) Text(RemoteConfig.annTitle, color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, raw = true)
                if (RemoteConfig.annText.isNotBlank()) Text(RemoteConfig.annText, color = Tok.TextMid, fontSize = 18.sp, lineHeight = 25.sp, raw = true)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 4.dp)) {
                    PillButton("Entendido", light = true, raw = true, modifier = Modifier.focusRequester(focus)) { close() }
                }
            }
        }
    }
}
