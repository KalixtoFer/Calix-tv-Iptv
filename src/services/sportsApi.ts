import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface SportTeam {
  id: string;
  name: string;
  short: string;
  logo: string;
  score: string;
  record: string;
}

export interface SportEvent {
  id: string; // único en la app: liga + id de ESPN
  rawId: string;
  sport: string;
  league: string;
  leagueName: string;
  state: 'pre' | 'in' | 'post';
  statusText: string;
  start: number;
  venue: string;
  home: SportTeam;
  away: SportTeam;
}

export const LEAGUES = [
  { sport: 'soccer', id: 'arg.1', name: 'Liga Profesional' },
  { sport: 'soccer', id: 'conmebol.libertadores', name: 'Libertadores' },
  { sport: 'soccer', id: 'conmebol.sudamericana', name: 'Sudamericana' },
  { sport: 'soccer', id: 'uefa.champions', name: 'Champions League' },
  { sport: 'soccer', id: 'uefa.europa', name: 'Europa League' },
  { sport: 'soccer', id: 'eng.1', name: 'Premier League' },
  { sport: 'soccer', id: 'eng.2', name: 'Championship' },
  { sport: 'soccer', id: 'esp.1', name: 'La Liga' },
  { sport: 'soccer', id: 'ita.1', name: 'Serie A' },
  { sport: 'soccer', id: 'ger.1', name: 'Bundesliga' },
  { sport: 'soccer', id: 'fra.1', name: 'Ligue 1' },
  { sport: 'soccer', id: 'bra.1', name: 'Brasileirão' },
  { sport: 'soccer', id: 'usa.1', name: 'MLS' },
  { sport: 'soccer', id: 'mex.1', name: 'Liga MX' },
  { sport: 'basketball', id: 'nba', name: 'NBA' },
  { sport: 'football', id: 'nfl', name: 'NFL' },
  { sport: 'baseball', id: 'mlb', name: 'MLB' },
  { sport: 'hockey', id: 'nhl', name: 'NHL' },
];

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// En el APK se usa el plugin HTTP nativo CapacitorHttp (sin CORS); en la web fetch con fallback opcional.
export async function httpGetJson(url: string): Promise<{ status: number; data: any; durationMs: number }> {
  const startTime = Date.now();
  if (Capacitor.isNativePlatform()) {
    try {
      const r = await CapacitorHttp.get({ url, connectTimeout: 8000, readTimeout: 10000 });
      const durationMs = Date.now() - startTime;
      const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return { status: r.status, data, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error(`[EVENTOS] Error nativo CapacitorHttp en ${url} (${durationMs}ms):`, err.message || err);
      throw err;
    }
  }

  // En versión Web
  try {
    const r = await fetch(url);
    const durationMs = Date.now() - startTime;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return { status: r.status, data, durationMs };
  } catch (webErr: any) {
    // Respaldo exclusivamente web: nunca depender de /api/ en el APK
    try {
      const proxyUrl = `/api/sports/proxy?url=${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyUrl);
      const durationMs = Date.now() - startTime;
      if (proxyRes.ok) {
        return { status: proxyRes.status, data: await proxyRes.json(), durationMs };
      }
    } catch {}
    throw webErr;
  }
}

async function getJson(url: string): Promise<any> {
  try {
    const res = await httpGetJson(url);
    const count = res.data?.events?.length || 0;
    console.log(`[EVENTOS] URL consultada: ${url} | Código: ${res.status} | Partidos recibidos: ${count} (${res.durationMs}ms)`);
    return res.data;
  } catch (err: any) {
    console.error(`[EVENTOS] Excepción consultando URL: ${url} | Error: ${err.message || err}`);
    throw err;
  }
}

const mkTeam = (c: any): SportTeam => ({
  id: String(c?.team?.id ?? c?.id ?? ''),
  name: c?.team?.displayName || c?.team?.name || '',
  short: c?.team?.shortDisplayName || c?.team?.abbreviation || c?.team?.displayName || '',
  logo: c?.team?.logo || '',
  score: c?.score !== undefined && c?.score !== null ? String(c.score) : '',
  record: c?.records?.[0]?.summary || '',
});

export function parseScoreboard(json: any, league: { sport: string; id: string; name: string }): SportEvent[] {
  const out: SportEvent[] = [];
  for (const e of json?.events || []) {
    const comp = e?.competitions?.[0];
    const comps = comp?.competitors || [];
    if (comps.length !== 2) continue; // solo deportes de dos equipos
    const homeRaw = comps.find((c: any) => c.homeAway === 'home') || comps[0];
    const awayRaw = comps.find((c: any) => c.homeAway === 'away') || comps[1];
    const st = e?.status || comp?.status || {};
    const t = st.type || {};
    const state: 'pre' | 'in' | 'post' = t.state === 'in' ? 'in' : t.state === 'post' ? 'post' : 'pre';
    let statusText = '';
    if (state === 'in') {
      statusText = t.name === 'STATUS_HALFTIME' ? 'Descanso' : league.sport === 'soccer' ? st.displayClock || t.shortDetail || 'En juego' : t.shortDetail || st.displayClock || 'En juego';
    } else if (state === 'post') {
      statusText = 'Final';
    } else if (t.name === 'STATUS_POSTPONED') {
      statusText = 'Postergado';
    } else if (t.name === 'STATUS_CANCELED') {
      statusText = 'Cancelado';
    }
    out.push({
      id: `${league.id}:${e.id}`,
      rawId: String(e.id),
      sport: league.sport,
      league: league.id,
      leagueName: league.name,
      state,
      statusText,
      start: Date.parse(e.date) || 0,
      venue: comp?.venue?.fullName || '',
      home: mkTeam(homeRaw),
      away: mkTeam(awayRaw),
    });
  }
  return out;
}

export async function fetchAllEvents(): Promise<{ events: SportEvent[]; failed: number }> {
  console.log(`[EVENTOS] Iniciando consulta de marcadores deportivos (${LEAGUES.length} ligas)...`);
  const results = await Promise.allSettled(
    LEAGUES.map(async (l) => parseScoreboard(await getJson(`${BASE}/${l.sport}/${l.id}/scoreboard`), l))
  );
  const events: SportEvent[] = [];
  let failed = 0;
  results.forEach((r) => (r.status === 'fulfilled' ? events.push(...r.value) : failed++));
  const rank = { in: 0, pre: 1, post: 2 } as const;
  events.sort((a, b) => rank[a.state] - rank[b.state] || (a.state === 'post' ? b.start - a.start : a.start - b.start));
  console.log(`[EVENTOS] Consulta de red completada: ${events.length} partidos recibidos en total (${failed} ligas fallaron)`);
  return { events, failed };
}

export interface StatRow {
  label: string;
  home: string;
  away: string;
}

export async function fetchStats(ev: SportEvent): Promise<StatRow[]> {
  const j = await getJson(`${BASE}/${ev.sport}/${ev.league}/summary?event=${ev.rawId}`);
  const teams: any[] = j?.boxscore?.teams || [];
  const h = teams.find((t) => String(t?.team?.id) === ev.home.id);
  const a = teams.find((t) => String(t?.team?.id) === ev.away.id);
  if (!h || !a) return [];
  const aMap = new Map<string, string>((a.statistics || []).map((s: any) => [s.name, s.displayValue]));
  return (h.statistics || [])
    .filter((s: any) => aMap.has(s.name))
    .slice(0, 12)
    .map((s: any) => ({ label: s.label || s.name, home: String(s.displayValue), away: String(aMap.get(s.name)) }));
}

/* ---------- Relacionar partidos con canales de tu servidor (por nombre) ---------- */
const STOP = new Set(['fc', 'cf', 'sc', 'ac', 'as', 'cd', 'ca', 'club', 'de', 'la', 'el', 'los', 'las', 'the', 'and', 'vs']);
export const norm = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
const tokens = (t: SportTeam) =>
  [...new Set(norm(t.name).split(' ').concat(norm(t.short).split(' ')))].filter((w) => w.length >= 3 && !STOP.has(w));

export interface ChannelIndexItem {
  ch: any;
  n: string;
}
export const buildChannelIndex = (list: any[]): ChannelIndexItem[] =>
  list.map((ch) => ({ ch, n: ' ' + norm(ch.name) + ' ' }));

export function findChannels(ev: SportEvent, idx: ChannelIndexItem[], max = 3): any[] {
  const th = tokens(ev.home);
  const ta = tokens(ev.away);
  if (!th.length && !ta.length) return [];
  const res: any[] = [];
  
  // 1. Coincidencia completa: ambos equipos en el nombre del canal
  for (const { ch, n } of idx) {
    if (th.length && ta.length && th.some((t) => n.includes(' ' + t)) && ta.some((t) => n.includes(' ' + t))) {
      res.push(ch);
      if (res.length >= max) return res;
    }
  }

  // 2. Si no hubo coincidencia de ambos, buscar canales con 'vs' o 'v' que contengan al menos un equipo
  if (res.length === 0) {
    for (const { ch, n } of idx) {
      const hasVersus = n.includes(' vs ') || n.includes(' v ') || n.includes(' contra ');
      if (hasVersus && (th.some((t) => n.includes(' ' + t)) || ta.some((t) => n.includes(' ' + t)))) {
        res.push(ch);
        if (res.length >= max) break;
      }
    }
  }

  return res;
}
