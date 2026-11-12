package com.ipvio.stream

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Phone and tablet (round 20). The UI is built for the TV (landscape). On the phone it is therefore
 * landscape by default (rotates with the device between both landscape positions); can be switched off under Settings > General.
 */
object MobilePrefs {
    private const val PREFS = "ipvio_mobile"
    // Phone mode is portrait by default now (rotates with the device); "landscape" forces landscape (Settings > General)
    var landscape by mutableStateOf(false)
        private set

    /** The hardware says TV: Leanback (Android TV / Google TV) or Fire TV. */
    fun hardwareTv(c: Context): Boolean {
        val pm = c.packageManager
        return pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK) || pm.hasSystemFeature("android.software.leanback_only") ||
            pm.hasSystemFeature("amazon.hardware.fire_tv")
    }

    fun hardwareTouch(c: Context): Boolean = c.packageManager.hasSystemFeature(PackageManager.FEATURE_TOUCHSCREEN)

    /** What the hardware looks like: phone/tablet instead of TV (no Leanback, touch present). */
    fun hardwareMobile(c: Context): Boolean = !hardwareTv(c) && hardwareTouch(c)

    /** Phone mode: the device the user chose on the first start; without a choice the hardware decides. */
    fun isMobile(c: Context): Boolean = DeviceMode.isPhone(c)

    fun apply(a: Activity) {
        landscape = a.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("landscape", false)
        if (!isMobile(a)) {
            // Switched to TV mode on a phone: give the rotation back (the manifest sets no fixed orientation).
            a.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            return
        }
        a.requestedOrientation = if (landscape) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }

    fun set(a: Activity, v: Boolean) {
        landscape = v
        a.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("landscape", v).apply()
        apply(a)
    }
}
