package com.ipvio.stream

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Logic of the sports agenda: the events are the channels of the playlist folders called "EVENTOS ..." (no network, no sports API). */
object AgendaLogic {
    private val TIME = Regex("""(?<!\d)([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)""")

    /** True for folder names such as "EVENTOS DEPORTIVOS" (with or without decoration). */
    fun isEventGroup(group: String): Boolean = group.contains("event", ignoreCase = true)

    /** Minutes since midnight of the first "HH:MM" in [title], or null. */
    fun timeOf(title: String): Int? = TIME.find(title)?.let { it.groupValues[1].toInt() * 60 + it.groupValues[2].toInt() }

    /** "HH:MM" text of [title] (the same time as [timeOf]), or null. */
    fun timeText(title: String): String? = timeOf(title)?.let { "%02d:%02d".format(it / 60, it % 60) }

    /** Sort key: titles with a time first (by time), the others after them (by name). */
    fun sortKey(title: String): Pair<Int, String> = (timeOf(title) ?: Int.MAX_VALUE) to title.lowercase()

    fun events(live: List<Item>): List<Item> =
        live.filter { isEventGroup(it.group) }.sortedWith(compareBy({ sortKey(it.title).first }, { sortKey(it.title).second }))
}

/** "Sports agenda" block of the phone start page: today's events of the playlist's event folders, tap = watch. */
@Composable
fun PhoneAgenda(live: List<Item>, onPlay: (Item, List<Item>) -> Unit, onAll: (String) -> Unit) {
    val events = remember(live) { AgendaLogic.events(live) }
    if (events.isEmpty()) return
    Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.width(4.dp).height(22.dp).clip(RoundedCornerShape(50)).background(Accent2))
                Text("Sportagenda", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
            if (events.size > 6) Row(
                Modifier.clip(RoundedCornerShape(50)).clickable { onAll(events.first().group) }.padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Alle", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                AppIcon(AIcon.Right, Color.White, size = 18.dp)
            }
        }
        val shape = RoundedCornerShape(14.dp)
        events.take(6).forEach { ev ->
            val t = AgendaLogic.timeText(ev.title)
            Row(
                Modifier.fillMaxWidth().clip(shape).background(Color(0x14FFFFFF)).border(1.dp, Color(0x26FFFFFF), shape)
                    .clickable { onPlay(ev, events) }.padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    t ?: "LIVE", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, raw = true,
                    modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(if (t != null) Color(0xFF2563EB) else Color(0xFFE11D48)).padding(horizontal = 8.dp, vertical = 4.dp)
                )
                Text(ev.title, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, raw = true, modifier = Modifier.weight(1f))
                AppIcon(AIcon.Play, Accent2, size = 20.dp)
            }
        }
    }
}
