package com.ipvio.stream

/**
 * Device choice (phone/tablet or TV/TV box), pure parts without Android so they can be unit-tested.
 * The stored value comes from the first-start screen ([DevicePicker]); see [DeviceMode].
 */
object DeviceLogic {
    const val PHONE = "phone"
    const val TV = "tv"

    /** Only the two known values count; anything else (null, empty, unknown) means "not chosen yet". */
    fun valid(stored: String?): String? = stored?.takeIf { it == PHONE || it == TV }

    /** True until the user has chosen a device. */
    fun needsChoice(stored: String?): Boolean = valid(stored) == null

    /**
     * Automatic choice from the hardware, or null when it is not clear (then the first-start screen asks).
     * TV hardware (Leanback / Fire TV) = TV; otherwise a touch screen = phone/tablet; neither (generic TV box) = ask.
     */
    fun auto(hardwareTv: Boolean, hardwareTouch: Boolean): String? = when {
        hardwareTv -> TV
        hardwareTouch -> PHONE
        else -> null
    }

    /** Value the first-start screen highlights: what the hardware looks like (touch without Leanback = phone). */
    fun suggested(hardwareMobile: Boolean): String = if (hardwareMobile) PHONE else TV

    /** Phone mode on? The user's choice wins; without a choice the hardware decides (previous behaviour). */
    fun isPhone(stored: String?, hardwareMobile: Boolean): Boolean = when (valid(stored)) {
        PHONE -> true
        TV -> false
        else -> hardwareMobile
    }
}
