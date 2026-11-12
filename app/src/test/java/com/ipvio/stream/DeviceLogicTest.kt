package com.ipvio.stream

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceLogicTest {
    @Test fun unknownValuesCountAsNotChosen() {
        assertNull(DeviceLogic.valid(null))
        assertNull(DeviceLogic.valid(""))
        assertNull(DeviceLogic.valid("tablet"))
        assertTrue(DeviceLogic.needsChoice(null))
        assertTrue(DeviceLogic.needsChoice("x"))
        assertFalse(DeviceLogic.needsChoice(DeviceLogic.PHONE))
        assertFalse(DeviceLogic.needsChoice(DeviceLogic.TV))
    }

    @Test fun choiceWinsOverHardware() {
        assertTrue(DeviceLogic.isPhone(DeviceLogic.PHONE, hardwareMobile = false))
        assertFalse(DeviceLogic.isPhone(DeviceLogic.TV, hardwareMobile = true))
    }

    @Test fun withoutChoiceHardwareDecides() {
        assertTrue(DeviceLogic.isPhone(null, hardwareMobile = true))
        assertFalse(DeviceLogic.isPhone(null, hardwareMobile = false))
        assertTrue(DeviceLogic.isPhone("garbage", hardwareMobile = true))
    }

    @Test fun suggestionFollowsHardware() {
        assertEquals(DeviceLogic.PHONE, DeviceLogic.suggested(true))
        assertEquals(DeviceLogic.TV, DeviceLogic.suggested(false))
    }

    @Test fun deviceTextsAreTranslated() {
        I18nCore.load(DictA, DictB, DictC, DictD, DictE, DictF, DictG, DictH, DictI, DictJ, DictK)
        assertEquals("Phone / Tablet", I18nCore.translate("Handy / Tablet", 1))
        assertEquals("TV / TV box", I18nCore.translate("Fernseher / TV-Box", 1))
        assertEquals("¿En qué dispositivo vas a usar la app?", I18nCore.translate("Auf welchem Gerät nutzt du die App?", 6))
        assertEquals("Device", I18nCore.translate("Gerät", 1))
    }
}
