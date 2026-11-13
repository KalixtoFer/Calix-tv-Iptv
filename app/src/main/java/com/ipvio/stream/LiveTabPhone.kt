package com.ipvio.stream

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Live TV for the phone (design: title, chips, search, category column on the left, channel cards on the right).
 * Categories are the playlist's own (favorite ones first) plus "All" and "Favorites"; the card number is the position in the shown list.
 * Tap = watch, long press = channel menu. The TV version ([LiveTab]) is untouched. Not part of this version: the picture-in-picture preview.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun LiveTabPhone(live: List<Item>, groups: Map<String, List<Item>>, favs: List<Item>, onOpen: (Item) -> Unit) {
    val ctx = LocalContext.current
    CatFavs.init(ctx)
    HiddenCats.init(ctx)
    val favCats = CatFavs.list.filter { it in groups && it !in HiddenCats.list }
    val otherCats = groups.keys.filter { it !in favCats && it !in HiddenCats.list }
    val entries = remember(live, groups, favs.size, favCats, otherCats) {
        ArrayList<CatEntry>().apply {
            add(CatEntry("ALL", "Alle Sender", live.size, false))
            add(CatEntry(FAV_CAT, "Favoriten", favs.size, false))
            (favCats + otherCats).forEach { add(CatEntry(it, it, groups[it]?.size ?: 0, true)) }
        }
    }
    var sel by remember { mutableStateOf(LiveMemory.sel(ctx)?.takeIf { k -> k == "ALL" || k == FAV_CAT || k in groups } ?: "ALL") }
    val cur = if (entries.any { it.key == sel }) sel else "ALL"
    var query by rememberSaveable { mutableStateOf("") }
    var byName by rememberSaveable { mutableStateOf(false) }
    var mosaic by rememberSaveable { mutableStateOf(true) }
    var menuFor by remember { mutableStateOf<Item?>(null) }

    val base: List<Item> = when (cur) { FAV_CAT -> favs; "ALL" -> live; else -> groups[cur].orEmpty() }
    val list by produceState(emptyList<Item>(), base, live, query, byName) {
        value = withContext(Dispatchers.Default) {
            val q = query.trim()
            val l = when {
                q.isEmpty() -> base
                q.all { it.isDigit() } && q.length <= 4 -> listOfNotNull(live.getOrNull(q.toInt() - 1)) + ChannelSearch.filter(live, q)
                else -> ChannelSearch.filter(live, q)
            }.distinctBy { it.id }
            if (byName) l.sortedBy { it.title.lowercase() } else l
        }
    }
    val title = when { query.isNotBlank() -> "Suchergebnisse"; cur == "ALL" -> "Alle Sender"; cur == FAV_CAT -> "Favoriten"; else -> cur }

    fun open(ch: Item) {
        ZapContext.list = list
        ZapContext.key = if (query.isNotBlank()) "ALL" else cur
        LiveMemory.setSel(ctx, cur)
        onOpen(ch)
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            PhoneLogoBar { }
            CatTitle("Live TV", "Sender")
            CatChipRow {
                CatChip(if (byName) "A–Z" else "Nach Nummer", AIcon.Sliders, raw = byName) { byName = !byName }
                CatChip(if (mosaic) "Mosaik" else "Liste", if (mosaic) AIcon.Grid else AIcon.Lists) { mosaic = !mosaic }
            }
            CatSearchField(query, "Sender nach Nummer oder Name suchen") { query = it }
            Row(Modifier.fillMaxSize()) {
                CatSideList(entries, cur, { sel = it; query = "" }, Modifier.width(112.dp).fillMaxHeight())
                Column(Modifier.weight(1f).fillMaxHeight()) {
                    Row(Modifier.fillMaxWidth().padding(start = 6.dp, end = 12.dp, top = 8.dp, bottom = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(title.uppercase(), color = Accent2, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, raw = cur != "ALL" && cur != FAV_CAT && query.isBlank(), modifier = Modifier.weight(1f))
                        if (list.isNotEmpty()) Text("1 - ${list.size}", color = Muted, fontSize = 12.sp, maxLines = 1, raw = true)
                    }
                    if (list.isEmpty()) {
                        EmptyState(
                            if (cur == FAV_CAT && query.isBlank()) AIcon.Heart else AIcon.Live,
                            if (query.isNotBlank()) "Keine Treffer" else if (cur == FAV_CAT) "Noch keine Favoriten" else "Keine Sender", ""
                        )
                    } else if (mosaic) {
                        LazyVerticalGrid(
                            GridCells.Fixed(2), Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 6.dp, end = 12.dp, bottom = 24.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            itemsIndexed(list, key = { i, c -> c.id + "#" + i }, contentType = { _, _ -> "ch" }) { i, ch ->
                                ChannelTile(ch, i + 1, { open(ch) }, { menuFor = ch })
                            }
                        }
                    } else {
                        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 6.dp, end = 12.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            itemsIndexed(list, key = { i, c -> c.id + "#" + i }, contentType = { _, _ -> "ch" }) { _, ch -> PhoneChannelRow(ch, { open(ch) }, { menuFor = ch }) }
                        }
                    }
                }
            }
        }
        menuFor?.let { m -> ChannelMenu(m, null, null) { menuFor = null } }
    }
}

/** Channel card: number and quality on top, logo, name and the running program. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ChannelTile(item: Item, number: Int, onClick: () -> Unit, onLong: () -> Unit) {
    val epg by produceState(emptyList<EpgEntry>(), item.id) {
        delay(150)
        value = withContext(Dispatchers.Default) { Epg.now(item) }
    }
    val nowE = Epg.current(epg)
    val q = qualityOf(item)?.uppercase() ?: when {
        item.title.contains("4K", true) -> "4K"
        item.title.contains("FHD", true) -> "FHD"
        item.title.contains("HD", true) -> "HD"
        else -> null
    }
    val shape = RoundedCornerShape(14.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).background(Color(0x14FFFFFF)).border(1.dp, Color(0x2622D3EE), shape)
            .combinedClickable(onClick = onClick, onLongClick = onLong).padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(
                Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0x66000000)).padding(horizontal = 6.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(if (nowE != null) Color(0xFFE11D48) else Muted))
                Text(number.toString().padStart(2, '0'), color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, raw = true)
            }
            if (q != null) Text(
                q, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, raw = true,
                modifier = Modifier.clip(RoundedCornerShape(5.dp)).background(Color(0xCC0891B2)).padding(horizontal = 5.dp, vertical = 2.dp)
            )
        }
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 10f), contentAlignment = Alignment.Center) {
            if (item.logo != null) AsyncImage(item.logo, null, Modifier.fillMaxSize().padding(6.dp), contentScale = ContentScale.Fit)
            else Text(raw = true, text = item.title.take(2).uppercase(), color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
        Text(raw = true, text = item.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(raw = true, text = nowE?.title ?: item.group, color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** One channel: logo, name and what is on now with a progress bar. Tap = watch, long press = menu (favorite …). */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun PhoneChannelRow(item: Item, onClick: () -> Unit, onLong: () -> Unit) {
    val epg by produceState(emptyList<EpgEntry>(), item.id) {
        delay(150)
        value = withContext(Dispatchers.Default) { Epg.now(item) }
    }
    val nowE = Epg.current(epg)
    val shape = RoundedCornerShape(DS.RadiusM)
    // TV-guide style row: logo, running program (or channel name), time + channel, LIVE badge and progress bar
    Row(
        Modifier.fillMaxWidth().heightIn(min = 76.dp).clip(shape).background(Color(0x14FFFFFF)).border(1.dp, Color(0x1FFFFFFF), shape)
            .combinedClickable(onClick = onClick, onLongClick = onLong).padding(horizontal = 10.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(Modifier.size(width = 64.dp, height = 52.dp).clip(RoundedCornerShape(DS.RadiusS)).background(Color(0xFF0E1A33)), contentAlignment = Alignment.Center) {
            if (item.logo != null) AsyncImage(item.logo, null, Modifier.fillMaxSize().padding(6.dp), contentScale = ContentScale.Fit)
            else Text(raw = true, text = item.title.take(2).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(raw = true, text = nowE?.title ?: item.title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                raw = true, text = if (nowE != null) "${hhmm(nowE.start)} - ${hhmm(nowE.end)}  ·  ${item.title}" else item.group,
                color = Muted, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis
            )
            if (nowE != null) {
                val frac = ((System.currentTimeMillis() / 1000 - nowE.start).toFloat() / (nowE.end - nowE.start).coerceAtLeast(1)).coerceIn(0f, 1f)
                Box(Modifier.fillMaxWidth().padding(top = 2.dp).height(3.dp).clip(RoundedCornerShape(50)).background(DS.Overlay3)) {
                    Box(Modifier.fillMaxWidth(frac).fillMaxHeight().background(Accent2))
                }
            }
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            if (nowE != null) Text(
                raw = true, text = "LIVE", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1,
                modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xFFE11D48)).padding(horizontal = 7.dp, vertical = 3.dp)
            )
            if (Library.isFav(item.id)) AppIcon(AIcon.Star, DS.Gold, size = 18.dp)
        }
    }
}
