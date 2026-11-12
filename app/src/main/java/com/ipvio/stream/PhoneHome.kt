package com.ipvio.stream

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Start page for phone mode (portrait): big picture with logo, search, title, info and two buttons, then the quick tiles
 * (3 per row). The rows below are the normal ones, which scroll sideways with the finger. The TV start page is untouched.
 */
@Composable
fun PhoneHomeTop(featured: List<Item>, tiles: List<QuickTile>, onOpen: (Item) -> Unit, onPlay: (Item) -> Unit, onSearch: () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        PhoneHero(featured, onOpen, onPlay, onSearch)
        PhoneTiles(tiles)
    }
}

@Composable
private fun PhoneHero(featured: List<Item>, onOpen: (Item) -> Unit, onPlay: (Item) -> Unit, onSearch: () -> Unit) {
    var idx by remember { mutableIntStateOf(0) }
    LaunchedEffect(featured.size, General.heroSec) {
        while (featured.size > 1 && General.heroSec > 0) { delay(General.heroSec * 1000L); idx = (idx + 1) % featured.size }
    }
    val item = featured.getOrNull(idx.coerceIn(0, (featured.size - 1).coerceAtLeast(0)))
    Box(Modifier.fillMaxWidth().height(if (item != null) 470.dp else 72.dp).background(Bg).clipToBounds()) {
        if (item != null) {
            Crossfade(item, animationSpec = tween(900), label = "phoneHeroBg") { c ->
                val m = rememberMeta(c)
                m?.backdrop?.let { AsyncImage(it, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop, alignment = Alignment.TopCenter) }
            }
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Bg.copy(alpha = .65f), 0.2f to Color.Transparent, 0.45f to Color.Transparent, 0.8f to Bg.copy(alpha = .9f), 1f to Bg)))
        }
        // Top bar: logo left, search right
        Row(Modifier.align(Alignment.TopStart).fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            BrandLogo(Modifier.width(112.dp))
            Spacer(Modifier.weight(1f))
            MenuIcon(MenuLogic.SEARCH, Color.White, Modifier.clip(CircleShape).clickable(onClick = onSearch).padding(10.dp).size(26.dp))
        }
        if (item != null) Column(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(start = 18.dp, end = 18.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Crossfade(item, animationSpec = tween(500), label = "phoneHeroText") { c ->
                val m = rememberFullMeta(c, rememberMeta(c))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Kicker(Lang.tr(kindLabel(c.kind)) + (qualityOf(c)?.let { q -> "  ·  " + q.uppercase() } ?: ""))
                    Text(raw = true, text = c.title, color = Tok.TextHi, fontSize = 34.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    HeroMetaLine(c, m, dots = false)
                    m?.overview?.takeIf { it.isNotBlank() }?.let {
                        Text(raw = true, text = TitleText.short(it, 160), color = Tok.TextMid, fontSize = 14.sp, lineHeight = 19.sp, maxLines = 3)
                    }
                }
            }
            Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                HeroButton("Jetzt ansehen", AIcon.Play, true, Modifier, 46) { onPlay(item) }
                HeroButton("Mehr Infos", AIcon.Info, false, Modifier, 46) { onOpen(item) }
            }
        }
    }
}

@Composable
private fun PhoneTiles(tiles: List<QuickTile>) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        tiles.chunked(3).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { t -> PhoneTile(t, Modifier.weight(1f)) }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun PhoneTile(t: QuickTile, modifier: Modifier) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier.height(70.dp).clip(shape).background(Brush.linearGradient(listOf(t.c1, t.c2)))
            .border(1.dp, t.iconColor.copy(alpha = .55f), shape).clickable(onClick = t.onClick).padding(horizontal = 10.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        MenuIcon(t.icon, t.iconColor, Modifier.size(24.dp))
        Column(Modifier.weight(1f)) {
            Text(t.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(t.sub, color = Color(0xCCFFFFFF), fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** "Live TV" block of the phone start page: channel cards two per row with the running program. */
@Composable
fun PhoneLiveGrid(title: String, list: List<Item>, onOpen: (Item) -> Unit, onAll: () -> Unit) {
    if (list.isEmpty()) return
    Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.width(4.dp).height(22.dp).clip(RoundedCornerShape(50)).background(Accent2))
                Text(title, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
            Row(Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onAll).padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Alle Sender", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                AppIcon(AIcon.Right, Color.White, size = 18.dp)
            }
        }
        list.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                pair.forEach { ch ->
                    PhoneLiveCard(ch, Modifier.weight(1f)) { ZapContext.list = list; ZapContext.key = "ALL"; onOpen(ch) }
                }
                if (pair.size < 2) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun PhoneLiveCard(item: Item, modifier: Modifier, onClick: () -> Unit) {
    val epg by produceState(emptyList<EpgEntry>(), item.id) {
        delay(200)
        value = withContext(Dispatchers.Default) { Epg.now(item) }
    }
    val nowE = Epg.current(epg)
    val shape = RoundedCornerShape(14.dp)
    Column(
        modifier.clip(shape).background(Color(0x14FFFFFF)).border(1.dp, Color(0x26FFFFFF), shape).clickable(onClick = onClick).padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)).background(Color.White.copy(alpha = .92f)), contentAlignment = Alignment.Center) {
                if (item.logo != null) AsyncImage(item.logo, null, Modifier.fillMaxSize().padding(4.dp), contentScale = ContentScale.Fit)
                else Text(raw = true, text = item.title.take(2).uppercase(), color = Color.Black, fontWeight = FontWeight.Bold)
            }
            Text(raw = true, text = item.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(Color(0xFF22C55E)))
            Text(raw = true, text = if (nowE != null) "Live · ${hhmm(nowE.start)}–${hhmm(nowE.end)}" else "Live", color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}
