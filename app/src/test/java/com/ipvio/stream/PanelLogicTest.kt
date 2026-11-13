package com.ipvio.stream

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PanelLogicTest {
    @Test fun projectIdMustLookLikeFirebaseId() {
        assertTrue(PanelLogic.validProject("calix-panel-1a2b3"))
        assertFalse(PanelLogic.validProject(""))
        assertFalse(PanelLogic.validProject("TU_PROYECTO"))
        assertFalse(PanelLogic.validProject("a/b"))
        assertFalse(PanelLogic.validProject("abc"))
    }

    @Test fun unwrapReadsTheJsonField() {
        val doc = """{"name":"x","fields":{"json":{"stringValue":"{\"main\":\"https://s:1\"}"},"version":{"integerValue":"3"}}}"""
        assertEquals("https://s:1", PanelLogic.unwrap(doc)?.optString("main"))
        assertNull(PanelLogic.unwrap("{}"))
        assertNull(PanelLogic.unwrap("not json"))
        assertNull(PanelLogic.unwrap("""{"fields":{"json":{"stringValue":"oops"}}}"""))
    }

    @Test fun backupServerOnlyWhenSwitchedOn() {
        val s = JSONObject("""{"main":"https://a","backup":"https://b","useBackup":false}""")
        assertEquals("https://a", PanelLogic.toConfig(null, s, null, "2026-11-13")!!.getString("serverUrl"))
        s.put("useBackup", true)
        assertEquals("https://b", PanelLogic.toConfig(null, s, null, "2026-11-13")!!.getString("serverUrl"))
        s.put("backup", "")
        assertEquals("https://a", PanelLogic.toConfig(null, s, null, "2026-11-13")!!.getString("serverUrl"))
    }

    @Test fun expiredAnnouncementIsSwitchedOff() {
        val n = JSONObject("""{"active":true,"id":"a1","title":"T","text":"X","expires":"2026-11-12"}""")
        assertFalse(PanelLogic.toConfig(null, null, n, "2026-11-13")!!.getJSONObject("announcement").getBoolean("enabled"))
        assertTrue(PanelLogic.toConfig(null, null, n, "2026-11-12")!!.getJSONObject("announcement").getBoolean("enabled"))
        n.put("expires", "")
        assertTrue(PanelLogic.toConfig(null, null, n, "2030-01-01")!!.getJSONObject("announcement").getBoolean("enabled"))
        n.put("active", false)
        assertFalse(PanelLogic.toConfig(null, null, n, "2026-11-13")!!.getJSONObject("announcement").getBoolean("enabled"))
    }

    @Test fun nothingReadableMeansNoConfig() {
        assertNull(PanelLogic.toConfig(null, null, null, "2026-11-13"))
        assertNotNull(PanelLogic.toConfig(JSONObject("""{"name":"Calix TV"}"""), null, null, "2026-11-13"))
    }

    @Test fun heartbeatHasOnlyTheAllowedFields() {
        val f = JSONObject(PanelLogic.heartbeatBody("1.3.12", "weird", "", 5L)).getJSONObject("fields")
        assertEquals(setOf("version", "mode", "lastError", "ts"), f.keys().asSequence().toSet())
        assertEquals("mobile", f.getJSONObject("mode").getString("stringValue"))
        assertEquals("5", f.getJSONObject("ts").getString("integerValue"))
        assertTrue(PanelLogic.deviceUrl("calix-panel-1a2b3", "abc").contains("updateMask.fieldPaths=lastError"))
    }
}
