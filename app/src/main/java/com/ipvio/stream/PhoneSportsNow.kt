package com.ipvio.stream

import androidx.compose.foundation.background
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay

/**
 * Today's games of the active leagues for the start page (the hub loads the same data when it is open): cached games appear at once,
 * fresh ones every two minutes while the start page is on screen. Empty when live results are switched off.
 */
@Composable
private fun rememberTodayGames(): List<SportData.Game> {
    val ctx = LocalContext.current
    remember { SportLeagues.init(ctx); SportFix.init(ctx); SportHubFavs.init(ctx) }
    val leaguesKey = SportLeagues.off.joinToString("|")
    val games by produceState(emptyList<SportData.Game>(), leaguesKey, General.sportLive) {
        if (!General.sportLive) return@produceState
        val ls = SportLeagues.enabled()
        val m = HashMap<String, List<SportData.Game>>()
        val today = SportData.ymd(0, General.zone())
        for (l in ls) SportData.peek(l, today)?.let { m[l.path] = it }
        value = m.values.flatten()
        while (true) {
            coroutineScope {
                ls.map { l -> async { l.path to SportData.fetch(l, SportData.ymd(0, General.zone()), 60_000) } }.awaitAll()
            }.forEach { (p, r) -> m[p] = r }
            value = m.values.flatten()
            delay(120_000)
        }
    }
    return games
}

/**
 * "Live sports" block of the phone start page: games running now that one of the user's channels carries (so tapping starts the stream);
 * when nothing runs, the next games of today on the user's channels. "See all" opens the Sports hub.
 */
@Composable
fun PhoneSportsNow(live: List<Item>, onAll: () -> Unit, onPlay: (Item, List<Item>) -> Unit) {
    if (!General.sportLive) return
    val games = rememberTodayGames()
    val now = System.currentTimeMillis() / 1000
    val shown = remember(games, live) {
        val withCh = games.filter { SportWatch.channels(it, live).isNotEmpty() }
        val running = withCh.filter { it.state == 1 }
        if (running.isNotEmpty()) running else withCh.filter { it.state == 0 && it.start >= now - 600 }.sortedBy { it.start }
    }.take(4)
    if (shown.isEmpty()) return
    val isLive = shown.any { it.state == 1 }
    Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.width(4.dp).height(22.dp).clip(RoundedCornerShape(50)).background(Accent2))
                Text(if (isLive) "Sport live" else "Sport heute", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            }
            Row(Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onAll).padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Alle", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                AppIcon(AIcon.Right, Color.White, size = 18.dp)
            }
        }
        shown.forEach { g ->
            val ch = SportWatch.channels(g, live)
            PhoneMatchCard(g, true, ch.take(2).joinToString(" · ") { it.title }) {
                if (ch.isNotEmpty()) onPlay(ch[0], ch) else onAll()
            }
        }
    }
}
