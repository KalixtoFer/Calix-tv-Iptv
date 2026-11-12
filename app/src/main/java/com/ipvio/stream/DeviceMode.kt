package com.ipvio.stream

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

/**
 * Which device the app runs on, chosen by the user on the first start (see [DevicePicker]).
 * Stored in its own preferences file; it is device-specific, so it is deliberately not part of the backup.
 */
object DeviceMode {
    private const val PREFS = "ipvio_device"
    private const val KEY = "mode"

    private var loaded = false
    private var hardware = false

    /** [DeviceLogic.PHONE], [DeviceLogic.TV] or null while not chosen. Compose state, so screens update on change. */
    var mode by mutableStateOf<String?>(null)
        private set

    /** Phone mode without a Context (for layout code): the choice, else what the hardware looked like at [init]. Reads Compose state. */
    val phoneNow: Boolean get() = DeviceLogic.isPhone(mode, hardware)

    fun init(c: Context) {
        if (loaded) return
        loaded = true
        hardware = MobilePrefs.hardwareMobile(c)
        mode =DeviceLogic.valid(c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null))
    }

    fun needsChoice(c: Context): Boolean { init(c); return DeviceLogic.needsChoice(mode) }

    fun set(c: Context, v: String) {
        val ok = DeviceLogic.valid(v) ?: return
        loaded = true
        mode = ok
        c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, ok).apply()
    }

    /** Phone mode on? Choice first, hardware as fallback (see [DeviceLogic.isPhone]). */
    fun isPhone(c: Context): Boolean { init(c); return DeviceLogic.isPhone(mode, MobilePrefs.hardwareMobile(c)) }

    /** The Activity behind a Compose context, if any. */
    fun activityOf(c: Context): Activity? = generateSequence(c) { (it as? ContextWrapper)?.baseContext }.filterIsInstance<Activity>().firstOrNull()
}

/**
 * First-start screen: "Which device will you use the app on?" Two big cards, usable with touch and with a remote.
 * The card that matches the hardware gets the focus first.
 */
@Composable
fun DevicePicker(suggested: String, onPick: (String) -> Unit) {
    val first = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        delay(150)
        repeat(8) { if (runCatching { first.requestFocus() }.getOrDefault(false)) return@LaunchedEffect; delay(80) }
    }
    Box(Modifier.fillMaxSize().background(Bg), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(32.dp)) {
            Text("Auf welchem Gerät nutzt du die App?", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center)
            Row(horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                DeviceCard(
                    "Handy / Tablet", "Bedienung mit dem Finger", AIcon.Phone,
                    if (suggested == DeviceLogic.PHONE) Modifier.focusRequester(first) else Modifier
                ) { onPick(DeviceLogic.PHONE) }
                DeviceCard(
                    "Fernseher / TV-Box", "Bedienung mit der Fernbedienung", AIcon.Live,
                    if (suggested == DeviceLogic.TV) Modifier.focusRequester(first) else Modifier
                ) { onPick(DeviceLogic.TV) }
            }
            Text("Du kannst das später in den Einstellungen ändern.", color = Muted, fontSize = 15.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun DeviceCard(label: String, desc: String, icon: AIcon, modifier: Modifier, onClick: () -> Unit) {
    var f by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(DS.RadiusL)
    Column(
        modifier.width(280.dp).clip(shape)
            .onFocusChanged { f = it.isFocused }
            .background(if (f) Accent2 else Surf2)
            .border(3.dp, if (f) Color.White else DS.Overlay2, shape)
            .clickable(onClick = onClick)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AppIcon(icon, if (f) Color.Black else Color.White, size = 56.dp)
        Text(label, color = if (f) Color.Black else Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Text(desc, color = if (f) Color.Black else Muted, fontSize = 15.sp, textAlign = TextAlign.Center)
    }
}
