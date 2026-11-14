package com.ipvio.stream

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** A big navigation tile of the TV start page: either one of the menu areas ([tab]) or a drawn icon ([icon]). */
class TvTile(val label: String, val tab: Int?, val icon: AIcon?, val c1: Color, val accent: Color, val onClick: () -> Unit)

/**
 * TV start page (design: top bar with logo, date, time, bell and settings; big featured picture on the left, featured movies on the right,
 * five big tiles at the bottom). Everything else of the old start page (rows) follows below and is unchanged.
 */
@Composable
fun TvHome(
    featured: List<Item>, movies: List<Item>, tiles: List<TvTile>,
    onOpen: (Item) -> Unit, onSearch: () -> Unit, onSettings: () -> Unit,
    onReminder: (Reminder) -> Unit, onNewEpisode: (String) -> Unit
) {
    Column(Modifier.fillMaxWidth().padding(start = dpx(38), end = dpx(36), top = dpx(14)), verticalArrangement = Arrangement.spacedBy(dpx(16))) {
        TvTopBar(onSearch, onSettings, onReminder, onNewEpisode)
        Row(Modifier.fillMaxWidth().height(dpx(380)), horizontalArrangement = Arrangement.spacedBy(dpx(18))) {
            TvBanner(featured, onOpen, Modifier.weight(1.9f).fillMaxHeight())
            TvFeaturedMovies(movies.take(4), onOpen, Modifier.weight(1f).fillMaxHeight())
        }
        Row(Modifier.fillMaxWidth().height(dpx(118)), horizontalArrangement = Arrangement.spacedBy(dpx(16))) {
            tiles.forEachIndexed { i, t -> TvTileCard(t, if (i == 0) ContentFocus.req else null, Modifier.weight(1f).fillMaxHeight()) }
        }
    }
}

@Composable
private fun TvTopBar(onSearch: () -> Unit, onSettings: () -> Unit, onReminder: (Reminder) -> Unit, onNewEpisode: (String) -> Unit) {
    val now by produceState(System.currentTimeMillis()) {
        while (true) { value = System.currentTimeMillis(); delay(20_000) }
    }
    val date = remember(now / 60_000) { SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault()).format(Date(now)).replaceFirstChar { it.uppercase() } }
    val time = remember(now / 60_000) { SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(now)) }
    Row(Modifier.fillMaxWidth().height(dpx(64)), verticalAlignment = Alignment.CenterVertically) {
        BrandLogo(Modifier.width(dpx(210)))
        Spacer(Modifier.weight(1f))
        if (General.showClock) {
            Text(date, color = Color.White, fontSize = spx(20), fontWeight = FontWeight.SemiBold, maxLines = 1, raw = true)
            Spacer(Modifier.width(dpx(22)))
            Text(time, color = Color.White, fontSize = spx(26), fontWeight = FontWeight.Bold, maxLines = 1, raw = true)
            Spacer(Modifier.width(dpx(22)))
        }
        TvIconButton(AIcon.Dot, true, onSearch)
        Spacer(Modifier.width(dpx(10)))
        BellButton(onReminder, onNewEpisode)
        Spacer(Modifier.width(dpx(10)))
        TvIconButton(AIcon.Gear, false, onSettings)
    }
}

/** Round icon button; [search] draws the menu's search icon instead of [icon]. */
@Composable
private fun TvIconButton(icon: AIcon, search: Boolean, onClick: () -> Unit) {
    var f by remember { mutableStateOf(false) }
    Box(
        Modifier.size(dpx(46)).clip(CircleShape).background(if (f) DS.FocusFill else Color(0x33FFFFFF))
            .onFocusChanged { f = it.isFocused }.trackFocus().clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        val c = if (f) DS.FocusInk else Color.White
        if (search) MenuIcon(MenuLogic.SEARCH, c, Modifier.size(dpx(24))) else AppIcon(icon, c, size = dpx(24))
    }
}

/** Big featured picture (changes every few seconds like the old big picture); OK opens the title. */
@Composable
private fun TvBanner(featured: List<Item>, onOpen: (Item) -> Unit, modifier: Modifier) {
    var idx by remember { mutableIntStateOf(0) }
    LaunchedEffect(featured.size, General.heroSec) {
        while (featured.size > 1 && General.heroSec > 0) { delay(General.heroSec * 1000L); idx = (idx + 1) % featured.size }
    }
    val item = featured.getOrNull(idx.coerceIn(0, (featured.size - 1).coerceAtLeast(0)))
    var f by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(dpx(20))
    Box(
        modifier.clip(shape).background(Color(0xFF0B1B3F)).clipToBounds()
            .border(if (f) 3.dp else 1.dp, if (f) Color.White else Color(0x6629C7F5), shape)
            .onFocusChanged { f = it.isFocused }.trackFocus().clickable(enabled = item != null) { item?.let(onOpen) }
    ) {
        if (item != null) {
            Crossfade(item, animationSpec = tween(900), label = "tvBanner") { c ->
                val m = rememberMeta(c)
                m?.backdrop?.let { AsyncImage(it, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
            }
            Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(0f to Color(0xE6050B1E), 0.55f to Color(0x66050B1E), 1f to Color.Transparent)))
            Column(Modifier.align(Alignment.BottomStart).padding(dpx(28)).fillMaxWidth(0.7f), verticalArrangement = Arrangement.spacedBy(dpx(8))) {
                Kicker(Lang.tr(kindLabel(item.kind)) + (qualityOf(item)?.let { q -> "  ·  " + q.uppercase() } ?: ""))
                Text(item.title, color = Color.White, fontSize = spx(40), fontWeight = FontWeight.ExtraBold, maxLines = 2, overflow = TextOverflow.Ellipsis, raw = true)
            }
        }
    }
}

/** "Featured movies": four posters in two rows. */
@Composable
private fun TvFeaturedMovies(list: List<Item>, onOpen: (Item) -> Unit, modifier: Modifier) {
    val shape = RoundedCornerShape(dpx(20))
    Column(
        modifier.clip(shape).background(Color(0x990B1B3F)).border(1.dp, Color(0x6629C7F5), shape).padding(dpx(14)),
        verticalArrangement = Arrangement.spacedBy(dpx(10))
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(dpx(8))) {
            AppIcon(AIcon.Star, Color(0xFFFFC83D), size = dpx(24))
            Text("Empfohlene Filme", color = Color.White, fontSize = spx(20), fontWeight = FontWeight.Bold, maxLines = 1, modifier = Modifier.weight(1f))
        }
        list.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(dpx(10))) {
                pair.forEach { TvPoster(it, onOpen, Modifier.weight(1f).fillMaxHeight()) }
                if (pair.size < 2) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun TvPoster(item: Item, onOpen: (Item) -> Unit, modifier: Modifier) {
    val m = rememberMeta(item)
    val img = m?.backdrop ?: m?.poster?.let { cardPoster(it) } ?: item.logo
    var f by remember { mutableStateOf(false) }
    val s by animateFloatAsState(if (f) focusScale(1.05f) else 1f, label = "tvPoster")
    val shape = RoundedCornerShape(dpx(12))
    Box(
        modifier.graphicsLayer { scaleX = s; scaleY = s }.clip(shape).background(Brush.linearGradient(listOf(colorFor(item).copy(alpha = .75f), Surf2)))
            .border(if (f) 3.dp else 1.dp, if (f) Color.White else Color(0x3329C7F5), shape)
            .onFocusChanged { f = it.isFocused }.trackFocus().clickable { onOpen(item) },
        contentAlignment = Alignment.Center
    ) {
        if (img != null) AsyncImage(img, item.title, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        else Text(item.title.take(2).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, raw = true)
    }
}

@Composable
private fun TvTileCard(t: TvTile, entry: FocusRequester?, modifier: Modifier) {
    var f by remember { mutableStateOf(false) }
    val s by animateFloatAsState(if (f) focusScale(1.06f) else 1f, label = "tvTile")
    val shape = RoundedCornerShape(dpx(18))
    val base = modifier.graphicsLayer { scaleX = s; scaleY = s }.clip(shape)
        .background(Brush.verticalGradient(listOf(t.c1, Color(0xFF071230))))
        .border(if (f) 3.dp else 1.dp, if (f) Color.White else t.accent.copy(alpha = .55f), shape)
        .onFocusChanged { f = it.isFocused }
    Column(
        (if (entry != null) base.trackFocus(entry) else base.trackFocus()).clickable(onClick = t.onClick),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center
    ) {
        if (t.tab != null) MenuIcon(t.tab, t.accent, Modifier.size(dpx(46))) else if (t.icon != null) AppIcon(t.icon, t.accent, size = dpx(46))
        Text(t.label.uppercase(), color = Color.White, fontSize = spx(22), fontWeight = FontWeight.ExtraBold, maxLines = 1, modifier = Modifier.padding(top = dpx(8)))
    }
}

/** Picks the titles whose category name contains one of the [words] (case-insensitive); used for the "Anime" and "Specials" tiles. */
object TvHomeLogic {
    fun match(list: List<Item>, words: List<String>): List<Item> =
        list.filter { i -> words.any { w -> i.group.contains(w, ignoreCase = true) } }
}
