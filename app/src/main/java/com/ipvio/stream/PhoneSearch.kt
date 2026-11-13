package com.ipvio.stream

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Search for the phone (portrait): a normal text field with the device keyboard, filter chips, hits as a 3-column poster grid
 * (movies, series) and rows (channels). The TV search screen (own keyboard on the left, hits on the right) does not fit a portrait screen.
 * Uses the same index and the same query/filter state as [SearchScreen].
 */
@Composable
fun PhoneSearchScreen(onOpen: (Item) -> Unit) {
    val ctx = LocalContext.current
    val all = PlaylistStore.channels
    val index by produceState(SearchCache.get(all), all) { value = withContext(Dispatchers.Default) { SearchCache.build(all) } }
    val q = SearchState.query.trim()
    val none = Triple(emptyList<Item>(), emptyList<Item>(), emptyList<Item>())
    val found by produceState("" to none, q, index) {
        val idx = index ?: return@produceState
        if (q.length < 2) { value = q to none; return@produceState }
        delay(250)
        value = q to withContext(Dispatchers.Default) { idx.find(q) }
    }
    val searching = q.length >= 2 && found.first != q
    val (m0, s0, l0) = if (q.length < 2 || searching) none else found.second
    val fl = SearchState.filter
    val movies = if (fl == 0 || fl == 1) remember(m0) { PlaylistLogic.firstPerKey(m0) { it.mk + "|" + it.lang } } else emptyList()
    val series = if (fl == 0 || fl == 2) s0 else emptyList()
    val live = when (fl) { 0, 3 -> l0; 4 -> l0.filter { SearchSport.isSport(it) }; else -> emptyList() }
    val byId = index?.byId.orEmpty()
    val hist = History.ids.mapNotNull { byId[it] }.filter { it.kind != Kind.LIVE }.take(12)
    val recent = AppSettings.searchHistory.toList().take(8)
    val keep: (Item) -> Unit = { AppSettings.addSearch(ctx, q.ifBlank { it.title }); onOpen(it) }

    Column(Modifier.fillMaxSize().background(Bg)) {
        // Text field
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp).height(50.dp).clip(RoundedCornerShape(50))
                .background(Color(0x1FFFFFFF)).border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(50)).padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MenuIcon(MenuLogic.SEARCH, Muted, Modifier.size(22.dp))
            Box(Modifier.weight(1f)) {
                if (SearchState.query.isEmpty()) Text("Filme, Serien oder Sender suchen…", color = Muted, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                BasicTextField(
                    value = SearchState.query, onValueChange = { SearchState.query = it.take(60) }, singleLine = true,
                    textStyle = TextStyle(color = Color.White, fontSize = 16.sp), cursorBrush = SolidColor(Color.White),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { q.takeIf { it.length >= 2 }?.let { AppSettings.addSearch(ctx, it) } }),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            if (SearchState.query.isNotEmpty()) AppIcon(AIcon.Close, Color.White, Modifier.clickable { SearchState.query = "" }.padding(4.dp), 22.dp)
        }
        // Filters
        val labels = listOf("Alle", "Filme", "Serien", "Live TV", "Sport")
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(labels.size) { i ->
                val on = SearchState.filter == i
                Text(
                    labels[i], color = if (on) Color.Black else Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) Color.White else Color(0x1FFFFFFF))
                        .clickable { SearchState.filter = i }.padding(horizontal = 16.dp, vertical = 9.dp)
                )
            }
        }
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(bottom = 24.dp)) {
            if (q.length < 2) {
                if (recent.isNotEmpty()) {
                    item { PhoneSearchTitle("Letzte Suchen") }
                    item {
                        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(recent) { term ->
                                Text(
                                    term, raw = true, color = Color.White, fontSize = 14.sp, maxLines = 1,
                                    modifier = Modifier.clip(RoundedCornerShape(50)).border(1.dp, Color(0x40FFFFFF), RoundedCornerShape(50))
                                        .clickable { SearchState.query = term }.padding(horizontal = 14.dp, vertical = 8.dp)
                                )
                            }
                        }
                    }
                }
                if (hist.isNotEmpty()) {
                    item { PhoneSearchTitle("Zuletzt geschaut") }
                    phoneGrid(hist, "h", onOpen)
                }
                if (recent.isEmpty() && hist.isEmpty()) item {
                    Text("Tippe oben einen Titel oder Sender ein.", color = Muted, fontSize = 15.sp, modifier = Modifier.padding(24.dp))
                }
            } else if (searching) {
                item { Text("Suche …", color = Muted, fontSize = 15.sp, modifier = Modifier.padding(24.dp)) }
            } else if (movies.isEmpty() && series.isEmpty() && live.isEmpty()) {
                item { Text("Keine Treffer", color = Muted, fontSize = 15.sp, modifier = Modifier.padding(24.dp)) }
            } else {
                if (movies.isNotEmpty()) { item { PhoneSearchTitle("Filme") }; phoneGrid(movies.take(60), "m", keep) }
                if (series.isNotEmpty()) { item { PhoneSearchTitle("Serien") }; phoneGrid(series.take(60), "s", keep) }
                if (live.isNotEmpty()) {
                    item { PhoneSearchTitle("Live TV") }
                    items(live.take(60), key = { "l" + it.id }) { ch ->
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp).clip(RoundedCornerShape(DS.RadiusM)).background(Color(0x14FFFFFF))
                                .clickable { ZapContext.list = live; ZapContext.key = "ALL"; keep(ch) }.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(Modifier.size(width = 56.dp, height = 44.dp).clip(RoundedCornerShape(DS.RadiusS)).background(Color(0xFF0E1A33)), contentAlignment = Alignment.Center) {
                                if (ch.logo != null) AsyncImage(ch.logo, null, Modifier.fillMaxSize().padding(5.dp), contentScale = ContentScale.Fit)
                                else Text(raw = true, text = ch.title.take(2).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            Column(Modifier.weight(1f)) {
                                Text(raw = true, text = ch.title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(raw = true, text = ch.group, color = Muted, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PhoneSearchTitle(text: String) {
    Text(text, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 8.dp))
}

/** Poster grid, 3 per row, inside a LazyColumn. */
private fun androidx.compose.foundation.lazy.LazyListScope.phoneGrid(list: List<Item>, key: String, onOpen: (Item) -> Unit) {
    val rows = list.chunked(3)
    items(rows.size, key = { i -> key + i + rows[i].first().id }) { i ->
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            rows[i].forEach { PhoneSearchPoster(it, Modifier.weight(1f)) { onOpen(it) } }
            repeat(3 - rows[i].size) { Spacer(Modifier.weight(1f)) }
        }
    }
}

@Composable
private fun PhoneSearchPoster(item: Item, modifier: Modifier, onClick: () -> Unit) {
    val m = rememberMeta(item)
    val img = m?.poster?.let { cardPoster(it) } ?: item.logo
    Column(modifier.clickable(onClick = onClick), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(
            Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(RoundedCornerShape(10.dp)).background(Brush.linearGradient(listOf(colorFor(item).copy(alpha = .75f), Surf2))),
            contentAlignment = Alignment.Center
        ) {
            if (img != null) AsyncImage(img, item.title, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            else Text(raw = true, text = item.title.take(2).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
        }
        Text(raw = true, text = item.title, color = Color.White, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}
