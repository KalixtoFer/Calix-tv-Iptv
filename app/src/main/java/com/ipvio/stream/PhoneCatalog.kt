package com.ipvio.stream

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Pure parts of the phone catalog (no Android), unit-tested in `CatalogLogicTest`. */
object CatalogLogic {
    const val SORT_DEFAULT = 0
    const val SORT_AZ = 1
    const val SORT_YEAR = 2
    const val SORTS = 3

    /** All words of [query] appear in [title] (case-insensitive); an empty query matches everything. */
    fun matches(title: String, query: String): Boolean {
        val words = query.lowercase().split(' ').filter { it.isNotEmpty() }
        if (words.isEmpty()) return true
        val t = title.lowercase()
        return words.all { it in t }
    }

    fun nextSort(mode: Int): Int = (mode + 1) % SORTS

    fun <T> sort(list: List<T>, mode: Int, title: (T) -> String, year: (T) -> Int?): List<T> = when (mode) {
        SORT_AZ -> list.sortedBy { title(it).lowercase() }
        SORT_YEAR -> list.sortedByDescending { year(it) ?: 0 }
        else -> list
    }
}

/** One entry of the category column: key (empty = all), label, number of titles, raw = provider name (never translated). */
class CatEntry(val key: String, val label: String, val count: Int, val raw: Boolean)

/** "Movies · Categories": white title, accent second part. */
@Composable
internal fun CatTitle(first: String, second: String) {
    Row(Modifier.padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.width(4.dp).height(26.dp).clip(RoundedCornerShape(50)).background(Accent2))
        Text(first, color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
        Text("·", color = Muted, fontSize = 22.sp)
        Text(second, color = Accent2, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
}

/** Pill button (filter, sort, view). */
@Composable
internal fun CatChip(label: String, icon: AIcon?, raw: Boolean = false, onClick: () -> Unit) {
    val shape = RoundedCornerShape(50)
    Row(
        Modifier.clip(shape).background(Color(0x1A22D3EE)).border(1.dp, Color(0x5522D3EE), shape).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        if (icon != null) AppIcon(icon, Accent2, size = 16.dp)
        Text(label, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, raw = raw)
    }
}

@Composable
internal fun CatChipRow(content: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) { content() }
}

/** Always-visible search field (device keyboard on tap). */
@Composable
internal fun CatSearchField(value: String, hint: String, onChange: (String) -> Unit) {
    val shape = RoundedCornerShape(50)
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp).height(46.dp).clip(shape).background(Color(0x14FFFFFF)).border(1.dp, Color(0x3322D3EE), shape).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        MenuIcon(MenuLogic.SEARCH, Accent2, Modifier.size(20.dp))
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (value.isEmpty()) Text(hint, color = Muted, fontSize = 15.sp, maxLines = 1)
            BasicTextField(
                value = value, onValueChange = { onChange(it.take(60)) }, singleLine = true,
                textStyle = TextStyle(color = Color.White, fontSize = 16.sp), cursorBrush = SolidColor(Color.White),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

/** Vertical category list on the left; the chosen one is a filled blue pill. */
@Composable
internal fun CatSideList(entries: List<CatEntry>, selected: String, onSelect: (String) -> Unit, modifier: Modifier) {
    LazyColumn(modifier, contentPadding = PaddingValues(start = 12.dp, end = 6.dp, top = 6.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items(entries, key = { it.key }) { e ->
            val on = e.key == selected
            val shape = RoundedCornerShape(12.dp)
            Row(
                Modifier.fillMaxWidth().clip(shape)
                    .background(if (on) Brush.horizontalGradient(listOf(Color(0xFF22D3EE), Color(0xFF2563EB))) else Brush.horizontalGradient(listOf(Color(0x14FFFFFF), Color(0x14FFFFFF))))
                    .clickable { onSelect(e.key) }.padding(horizontal = 10.dp, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(e.label, color = if (on) Color.White else Color(0xFFCBD5E1), fontSize = 13.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis, raw = e.raw, modifier = Modifier.weight(1f))
                Text(e.count.toString(), color = if (on) Color.White else Muted, fontSize = 11.sp, maxLines = 1, raw = true)
            }
        }
    }
}

/**
 * Movies / Series for the phone (design: title, chips, search, category column on the left, poster grid on the right).
 * [genres] is the automatic genre grouping (same object as [provider] when it is not available), [provider] the categories of the playlist.
 */
@Composable
fun PhoneCatalog(noun: String, all: List<Item>, genres: Map<String, List<Item>>, provider: Map<String, List<Item>>, onOpen: (Item) -> Unit, onSearch: () -> Unit) {
    val hasGenres = genres.isNotEmpty() && genres !== provider
    var useProvider by rememberSaveable(noun) { mutableStateOf(!hasGenres) }
    var sel by rememberSaveable(noun) { mutableStateOf("") }
    var sort by rememberSaveable(noun) { mutableIntStateOf(CatalogLogic.SORT_DEFAULT) }
    var query by rememberSaveable(noun) { mutableStateOf("") }
    val groups = if (useProvider || !hasGenres) provider else genres
    val cur = if (sel.isNotEmpty() && sel in groups) sel else ""
    val base = if (cur.isEmpty()) all else groups[cur].orEmpty()

    val shown by produceState(emptyList<Item>(), base, sort, query) {
        value = withContext(Dispatchers.Default) {
            val f = if (query.isBlank()) base else (if (cur.isEmpty()) all else base).filter { CatalogLogic.matches(it.title, query) }
            CatalogLogic.sort(f, sort, { it.title }, { it.year }).take(900)
        }
    }
    val entries = remember(groups, all.size) {
        listOf(CatEntry("", "Alle", all.size, false)) + groups.map { (k, l) -> CatEntry(k, k, l.size, true) }
    }
    val sortLabel = when (sort) { CatalogLogic.SORT_AZ -> "A–Z"; CatalogLogic.SORT_YEAR -> "Jahr"; else -> "Standard" }

    Column(Modifier.fillMaxSize()) {
        PhoneLogoBar(onSearch)
        CatTitle(noun, "Kategorien")
        CatChipRow {
            if (hasGenres) CatChip(if (useProvider) "Anbieter-Kategorien" else "Auto-Genres", AIcon.Categories) { useProvider = !useProvider; sel = "" }
            CatChip(sortLabel, AIcon.Sliders, raw = sort == CatalogLogic.SORT_AZ) { sort = CatalogLogic.nextSort(sort) }
        }
        CatSearchField(query, "Titel suchen") { query = it }
        Row(Modifier.fillMaxSize()) {
            CatSideList(entries, cur, { sel = it; query = "" }, Modifier.width(112.dp).fillMaxHeight())
            if (shown.isEmpty()) {
                Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                    Text(if (query.isBlank()) "Keine Titel in deiner Playlist" else "Keine Treffer", color = Muted, fontSize = 15.sp)
                }
            } else LazyVerticalGrid(
                GridCells.Fixed(3), Modifier.weight(1f).fillMaxHeight(),
                contentPadding = PaddingValues(start = 6.dp, end = 12.dp, top = 6.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(shown, key = { it.id }, contentType = { "poster" }) { CatalogPoster(it) { onOpen(it) } }
            }
        }
    }
}

@Composable
private fun CatalogPoster(item: Item, onClick: () -> Unit) {
    val m = rememberMeta(item)
    val img = m?.poster?.let { cardPoster(it) } ?: item.logo
    val q = qualityOf(item)
    Column(Modifier.clickable(onClick = onClick), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(
            Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(RoundedCornerShape(10.dp)).background(Brush.linearGradient(listOf(colorFor(item).copy(alpha = .75f), Surf2))),
            contentAlignment = Alignment.Center
        ) {
            if (img != null) AsyncImage(img, item.title, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            else Text(raw = true, text = item.title.take(2).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
            if (!q.isNullOrBlank()) Text(
                raw = true, text = q.uppercase(), color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1,
                modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).clip(RoundedCornerShape(5.dp)).background(Color(0xCC0891B2)).padding(horizontal = 5.dp, vertical = 2.dp)
            )
        }
        Text(raw = true, text = item.title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
        item.year?.let { Text(raw = true, text = it.toString(), color = Accent2, fontSize = 11.sp, maxLines = 1) }
    }
}
