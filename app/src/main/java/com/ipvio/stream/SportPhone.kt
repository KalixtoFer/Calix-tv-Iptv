package com.ipvio.stream

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Game as a card for the phone (portrait): status on top (LIVE badge with the minute, start time or final),
 * then one line per team with logo, name and score. The TV row ([MatchRow]) is too wide for a portrait screen.
 */
@Composable
internal fun PhoneMatchCard(g: SportData.Game, hasChan: Boolean, chan: String? = null, onClick: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    val live = statusKind(g) == 1
    Column(
        Modifier.fillMaxWidth().padding(vertical = 3.dp).clip(shape).background(Color(0x14FFFFFF)).border(1.dp, if (live) PT.Live.copy(alpha = .45f) else Color(0x1FFFFFFF), shape)
            .clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (live) Text(
                raw = true, text = "LIVE", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1,
                modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(PT.Live).padding(horizontal = 7.dp, vertical = 3.dp)
            )
            Text(
                raw = true, text = statusText(g), color = if (live) PT.Live else Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false)
            )
            Spacer(Modifier.weight(1f))
            if (hasChan) AppIcon(AIcon.Play, Accent2, size = 18.dp)
            if (SportHubFavs.isFavGame(g)) AppIcon(AIcon.Star, DS.Gold, size = 18.dp)
        }
        if (g.solo) {
            Text(
                raw = true, text = listOf(g.title, g.note).filter { it.isNotBlank() }.joinToString(" · "),
                color = Tok.TextHi, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis
            )
            g.field.firstOrNull()?.let {
                Text(raw = true, text = "1. " + it.name + (if (it.value.isNotBlank()) "  " + it.value else ""), color = Muted, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        } else {
            PhoneTeamLine(g.home, g.state)
            PhoneTeamLine(g.away, g.state)
        }
        if (!chan.isNullOrBlank()) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            AppIcon(AIcon.Live, Accent2, size = 16.dp)
            Text(raw = true, text = chan, color = Accent2, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun PhoneTeamLine(t: SportData.Team, state: Int) {
    val dim = state == 2 && !t.winner
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        TeamLogo(t.logo, t.abbr, 28.dp)
        Text(
            raw = true, text = t.name, color = if (dim) Muted else Tok.TextHi, fontSize = 16.sp,
            fontWeight = if (state == 2 && t.winner) FontWeight.ExtraBold else FontWeight.SemiBold,
            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f)
        )
        if (!t.score.isNullOrBlank()) Text(
            raw = true, text = t.score, color = if (dim) Muted else Tok.TextHi, fontSize = if (t.score.length > 8) 13.sp else 20.sp,
            fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.End, maxLines = 2, modifier = Modifier.widthIn(max = 150.dp)
        )
    }
}
