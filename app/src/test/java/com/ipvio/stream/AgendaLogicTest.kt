package com.ipvio.stream

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AgendaLogicTest {
    @Test fun eventFolderNames() {
        assertTrue(AgendaLogic.isEventGroup("⭐EVENTOS DEPORTIVOS⭐"))
        assertTrue(AgendaLogic.isEventGroup("eventos ppv"))
        assertFalse(AgendaLogic.isEventGroup("TV ARGENTINA"))
    }

    @Test fun timeIsFoundInTitle() {
        assertEquals("21:30", AgendaLogic.timeText("Boca vs River 21:30 ESPN"))
        assertEquals("09:05", AgendaLogic.timeText("Liga 9.05 Partido"))
        assertNull(AgendaLogic.timeOf("Boca vs River"))
        assertNull(AgendaLogic.timeOf("Canal 2025"))
    }

    @Test fun titlesWithTimeComeFirstInTimeOrder() {
        val sorted = listOf("Zeta", "B 22:00", "A 18:30").sortedWith(compareBy({ AgendaLogic.sortKey(it).first }, { AgendaLogic.sortKey(it).second }))
        assertEquals(listOf("A 18:30", "B 22:00", "Zeta"), sorted)
    }
}
