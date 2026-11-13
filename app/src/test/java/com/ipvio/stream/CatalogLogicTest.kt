package com.ipvio.stream

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CatalogLogicTest {
    @Test fun matchesNeedsAllWordsIgnoringCase() {
        assertTrue(CatalogLogic.matches("The Last of Us", "last us"))
        assertTrue(CatalogLogic.matches("Carrie", "  "))
        assertFalse(CatalogLogic.matches("Carrie", "carrie 2013"))
    }

    @Test fun sortModes() {
        val l = listOf("b" to 2001, "A" to 2020, "c" to null)
        assertEquals(l, CatalogLogic.sort(l, CatalogLogic.SORT_DEFAULT, { it.first }, { it.second }))
        assertEquals(listOf("A", "b", "c"), CatalogLogic.sort(l, CatalogLogic.SORT_AZ, { it.first }, { it.second }).map { it.first })
        assertEquals(listOf("A", "b", "c"), CatalogLogic.sort(l, CatalogLogic.SORT_YEAR, { it.first }, { it.second }).map { it.first })
    }

    @Test fun sortButtonCycles() {
        assertEquals(1, CatalogLogic.nextSort(0))
        assertEquals(0, CatalogLogic.nextSort(CatalogLogic.SORTS - 1))
    }
}
