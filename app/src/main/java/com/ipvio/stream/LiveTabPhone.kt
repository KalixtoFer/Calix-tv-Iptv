package com.ipvio.stream

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Live TV for phone mode (touch, Netflix-like): category chips on top, a start page with rows of channel cards,
 * a vertical channel list with "now on" and a search field that opens the normal keyboard with one tap.
 * The TV version ([LiveTab]) is untouched. Not part of this first version: own channel lists, multi view,
 * recordings, playlist switcher (use the TV screen or the settings for those).
 */
@OptIn(ExperimentalFoundationApi::class, ExperimentalComposeUiApi::class)
@Composable
fun LiveTabPhone(live: List<Item>, groups: Map<String, List<Item>>, favs: List<Item>, onOpen: (Item) -> Unit) {
    val ctx = LocalContext.current
    CatFavs.init(ctx)
    HiddenCats.init(ctx)
    val genres = remember(live) { LiveGenre.split(live) }
    val favCats = CatFavs.list.filter { it in groups && it !in HiddenCats.list }
    val otherCats = groups.keys.filter { it !in favCats && it !in HiddenCats.list }

    // Chips: key, label, raw (provider category names are never translated)
    val chips = ArrayList<Triple<String, String, Boolean>>()
    chips.add(Triple("HOME", "Start", false))
    chips.add(Triple(FAV_CAT, "Favoriten", false))
    chips.add(Triple("ALL", "Alle Sender", false))
    genres.keys.forEach { chips.add(Triple(it, LiveGenre.byKey(it)?.label ?: it, false)) }
    favCats.forEach { chips.add(Triple(it, it, true)) }
    otherCats.forEach { chips.add(Triple(it, it, true)) }

    var sel by remember { mutableStateOf(LiveMemory.sel(ctx)?.takeIf { k -> chips.any { it.first == k } } ?: "HOME") }
    val cur = if (chips.any { it.first == sel }) sel else "ALL"
    var searching by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var menuFor by remember { mutableStateOf<Item?>(null) }

    val results by produceState(emptyList<Item>(), live, query, searching) {
        value = if (!searching || query.isBlank()) emptyList()
        else withContext(Dispatchers.Default) { ChannelSearch.filter(live, query) }
    }
    val showResults = searching && query.isNotBlank()
    val list: List<Item> = when {
        showResults -> results
        cur == FAV_CAT -> favs
        cur == "ALL" -> live
        LiveGenre.isGenreKey(cur) -> genres[cur].orEmpty()
        else -> groups[cur].orEmpty()
    }

    fun open(ch: Item, from: List<Item>, key: String) {
        ZapContext.list = from
        ZapContext.key = key
        LiveMemory.setSel(ctx, cur)
        onOpen(ch)
    }

    val searchReq = remember { FocusRequester() }
    val kb = LocalSoftwareKeyboardController.current
    LaunchedEffect(searching) {
        if (searching) { delay(80); runCatching { searchReq.requestFocus() }; kb?.show() }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(top = 10.dp)) {
            if (searching) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        Modifier.weight(1f).height(44.dp).clip(RoundedCornerShape(50)).background(Color(0x1FFFFFFF)).padding(horizontal = 18.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        if (query.isEmpty()) Text("Sendername eingeben", color = Muted, fontSize = 15.sp, maxLines = 1)
                        BasicTextField(
                            value = query, onValueChange = { query = it.take(40) }, singleLine = true,
                            textStyle = TextStyle(color = Color.White, fontSize = 16.sp),
                            cursorBrush = SolidColor(Color.White),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { kb?.hide() }),
                            modifier = Modifier.fillMaxWidth().focusRequester(searchReq)
                        )
                    }
                    PhoneChip("Abbrechen", false, false, null) { searching = false; query = ""; kb?.hide() }
                }
            } else {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    LazyRow(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(chips, key = { it.first }) { (k, label, raw) -> PhoneChip(label, k == cur, raw, null) { sel = k } }
                    }
                    Box(Modifier.padding(horizontal = 12.dp)) { PhoneChip("Sender suchen", false, false, AIcon.Edit) { searching = true } }
                }
            }
            Box(Modifier.height(8.dp))
            if (cur == "HOME" && !showResults && !searching) {
                PhoneLiveHome(live, genres, favs, { ch, from -> open(ch, from, "ALL") }, { menuFor = it })
            } else if (list.isEmpty()) {
                EmptyState(
                    if (cur == FAV_CAT && !showResults) AIcon.Heart else AIcon.Live,
                    if (showResults) "Keine Treffer" else if (cur == FAV_CAT) "Noch keine Favoriten" else "Keine Sender",
                    ""
                )
            } else {
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    itemsIndexed(list, key = { i, c -> c.id + "#" + i }, contentType = { _, _ -> "ch" }) { _, ch ->
                        PhoneChannelRow(ch, { open(ch, list, if (showResults) "ALL" else cur) }, { menuFor = ch })
                    }
                }
            }
        }
        menuFor?.let { m -> ChannelMenu(m, null, null) { menuFor = null } }
    }
}

@Composable
private fun PhoneChip(label: String, selected: Boolean, raw: Boolean, icon: AIcon?, onClick: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(if (selected) Color.White else Color(0x1FFFFFFF))
            .clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        if (icon != null) AppIcon(icon, if (selected) Color.Black else Color.White, size = 16.dp)
        Text(label, color = if (selected) Color.Black else Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, raw = raw)
    }
}

/** Start page: last watched, favorites and a row of channel cards per genre (like the TV start page, smaller cards). */
@Composable
private fun PhoneLiveHome(live: List<Item>, genres: Map<String, List<Item>>, favs: List<Item>, onOpen: (Item, List<Item>) -> Unit, onMenu: (Item) -> Unit) {
    val byId = remember(live) { live.associateBy { it.id } }
    val recent = remember(live, History.ids.size) { History.ids.mapNotNull { byId[it] }.take(24) }
    val rows = ArrayList<Pair<String, List<Item>>>()
    if (recent.isNotEmpty()) rows.add("Zuletzt gesehen" to recent)
    if (favs.isNotEmpty()) rows.add("Favoriten" to favs.take(40))
    for ((k, l) in genres) rows.add((LiveGenre.byKey(k)?.label ?: k) to l.take(40))
    if (rows.isEmpty()) rows.add("Alle Sender" to live.take(40))
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        itemsIndexed(rows, key = { _, r -> r.first }) { _, r ->
            Column {
                Text(r.first, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 14.dp, top = 8.dp, bottom = 8.dp))
                LazyRow(contentPadding = PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    itemsIndexed(r.second, key = { i, c -> c.id + "#" + i }) { _, c -> PhoneChannelCard(c, { onOpen(c, r.second) }, { onMenu(c) }) }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun PhoneChannelCard(item: Item, onClick: () -> Unit, onLong: () -> Unit) {
    Column(Modifier.width(148.dp).combinedClickable(onClick = onClick, onLongClick = onLong), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(10.dp)).background(Surf2), contentAlignment = Alignment.Center) {
            if (item.logo != null) AsyncImage(item.logo, null, Modifier.fillMaxSize().padding(14.dp), contentScale = ContentScale.Fit)
            else Text(raw = true, text = item.title.take(2).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
        }
        Text(raw = true, text = item.title, color = Color.White, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
    Row(
        Modifier.fillMaxWidth().height(72.dp).clip(RoundedCornerShape(DS.RadiusM)).background(Color(0x0FFFFFFF))
            .combinedClickable(onClick = onClick, onLongClick = onLong).padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(Modifier.size(52.dp).clip(RoundedCornerShape(DS.RadiusS)).background(DS.Overlay2), contentAlignment = Alignment.Center) {
            if (item.logo != null) AsyncImage(item.logo, null, Modifier.fillMaxSize().padding(6.dp), contentScale = ContentScale.Fit)
            else Text(raw = true, text = item.title.take(2).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(raw = true, text = item.title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (nowE != null) {
                val frac = ((System.currentTimeMillis() / 1000 - nowE.start).toFloat() / (nowE.end - nowE.start)).coerceIn(0f, 1f)
                Text(raw = true, text = "${hhmm(nowE.start)}–${hhmm(nowE.end)}  ${nowE.title}", color = Accent2, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Box(Modifier.fillMaxWidth().height(3.dp).clip(RoundedCornerShape(50)).background(DS.Overlay3)) {
                    Box(Modifier.fillMaxWidth(frac).fillMaxHeight().background(Accent2))
                }
            } else Text(raw = true, text = item.group, color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (Library.isFav(item.id)) AppIcon(AIcon.Star, DS.Gold, size = 18.dp)
    }
}
