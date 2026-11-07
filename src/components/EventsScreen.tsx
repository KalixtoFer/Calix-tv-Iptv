import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, Star, Tv, Play, X, RefreshCw, BarChart3 } from 'lucide-react';
import { LiveStream, SeriesItem } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';
import {
  SportEvent,
  SportTeam,
  StatRow,
  LEAGUES,
  fetchAllEvents,
  fetchStats,
  buildChannelIndex,
  findChannels,
  norm,
} from '../services/sportsApi';

interface EventsScreenProps {
  username: string;
  onBack: () => void;
  onPlayStream: (stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'live' | 'episode' | 'movie';
    poster?: string;
    category?: string;
  }) => void;
}

// Ajusta horarios escritos en nombres de canales (Ecuador UTC-5 -> Argentina UTC-3, +2 h)
const adjustTime = (text: string | undefined): string => {
  if (!text) return '';
  let result = text.replace(/\b([0-1]?\d|2[0-3])[:.hH]([0-5]\d)\b/g, (match, hh, mm) => {
    const h = (parseInt(hh, 10) + 2) % 24;
    const sep = match.includes(':') ? ':' : match.includes('.') ? '.' : 'h';
    return `${h.toString().padStart(2, '0')}${sep}${mm}`;
  });
  result = result.replace(/\b([0-1]?\d|2[0-3])\s*(hs|hrs|h)\b/gi, (_m, hh, unit) => {
    const h = (parseInt(hh, 10) + 2) % 24;
    return `${h.toString().padStart(2, '0')} ${unit}`;
  });
  return result;
};

const FAV_KEY = 'calixtv_fav_teams';
const loadFavs = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
};

const timeLabel = (ts: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  const hm = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const same = d.toDateString() === new Date().toDateString();
  return same ? hm : `${d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })} ${hm}`;
};

type Tab = 'live' | 'today' | 'mine' | 'channels';

/* ------------------------------ Tarjeta de partido ------------------------------ */
interface CardProps {
  ev: SportEvent;
  channels: any[];
  hero?: boolean;
  favs: string[];
  onFav: (t: SportTeam, sport: string) => void;
  onPlayChannel: (ch: any) => void;
  onStats: (ev: SportEvent) => void;
  onFind: (ev: SportEvent) => void;
}

const TeamRow: React.FC<{ t: SportTeam; ev: SportEvent; big?: boolean; fav: boolean; onFav: () => void }> = ({ t, ev, big, fav, onFav }) => (
  <div className="flex items-center gap-3">
    {t.logo ? (
      <img src={t.logo} alt="" loading="lazy" className={big ? 'w-9 h-9 object-contain' : 'w-7 h-7 object-contain'} />
    ) : (
      <span className={`${big ? 'w-9 h-9' : 'w-7 h-7'} rounded-full bg-[#1c2128]`} />
    )}
    <span className={`flex-1 min-w-0 truncate font-bold ${big ? 'text-lg' : 'text-[15px]'} text-[#f2f5f9]`}>{t.name}</span>
    {t.record && ev.sport === 'soccer' && <span className="text-[11px] font-mono text-[#8a94a3]">{t.record}</span>}
    <button
      type="button"
      aria-label={fav ? 'Dejar de seguir' : 'Seguir equipo'}
      onClick={(e) => {
        e.stopPropagation();
        onFav();
      }}
      className="tv-focusable p-1 rounded-lg cursor-pointer"
    >
      <Star className={`w-4 h-4 ${fav ? 'fill-[#00c2e0] text-[#00c2e0]' : 'text-[#4a5568]'}`} />
    </button>
    {ev.state !== 'pre' && <span className={`${big ? 'text-3xl' : 'text-2xl'} font-extrabold tabular-nums w-8 text-right text-[#f2f5f9]`}>{t.score}</span>}
  </div>
);

const EventCard: React.FC<CardProps> = ({ ev, channels, hero, favs, onFav, onPlayChannel, onStats, onFind }) => {
  const live = ev.state === 'in';
  const isFav = (t: SportTeam) => favs.includes(`${ev.sport}:${t.id}`);
  return (
    <div
      onClick={() => (channels[0] ? onPlayChannel(channels[0]) : onFind(ev))}
      className={`tv-focusable rounded-2xl border p-3.5 space-y-3 cursor-pointer transition active:scale-[0.99] ${
        hero
          ? 'bg-gradient-to-br from-[#00c2e0]/30 via-[#1f5fff]/25 to-[#0b0d11] border-[#00c2e0]/40 shadow-[0_0_30px_rgba(0,194,224,0.15)]'
          : `bg-[#111418] border-[#1c2128] ${live ? 'border-l-4 border-l-[#00c2e0]' : ''}`
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#8a94a3] uppercase tracking-wide">{ev.leagueName}</span>
        {live ? (
          <span className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#ef4444] text-white text-[11px] font-extrabold">EN VIVO</span>
            <span className="text-sm font-bold text-[#f2f5f9]">{ev.statusText}</span>
          </span>
        ) : ev.state === 'post' ? (
          <span className="text-xs font-bold text-[#8a94a3] uppercase">Final</span>
        ) : (
          <span className="text-sm font-bold text-[#00c2e0]">{ev.statusText || timeLabel(ev.start)}</span>
        )}
      </div>

      <div className="space-y-2.5">
        <TeamRow t={ev.home} ev={ev} big={hero} fav={isFav(ev.home)} onFav={() => onFav(ev.home, ev.sport)} />
        <TeamRow t={ev.away} ev={ev} big={hero} fav={isFav(ev.away)} onFav={() => onFav(ev.away, ev.sport)} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
          {channels.length > 0 ? (
            channels.map((ch) => (
              <button
                key={ch.stream_id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayChannel(ch);
                }}
                className="tv-focusable flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-lg bg-[#00c2e0]/10 border border-[#00c2e0]/30 text-[#7fe3f2] text-xs font-semibold cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{adjustTime(ch.name)}</span>
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFind(ev);
              }}
              className="tv-focusable flex items-center gap-1.5 text-xs text-[#8a94a3] cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Sin canal asignado · buscar</span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStats(ev);
          }}
          className="tv-focusable shrink-0 text-xs font-bold text-[#00c2e0] cursor-pointer"
        >
          Estadísticas
        </button>
      </div>
    </div>
  );
};

/* --------------------------------- Pantalla --------------------------------- */
export const EventsScreen: React.FC<EventsScreenProps> = ({ username, onBack, onPlayStream }) => {
  const [tab, setTab] = useState<Tab>('live');
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [allFailed, setAllFailed] = useState(false);
  const [updated, setUpdated] = useState(0);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [allLive, setAllLive] = useState<LiveStream[]>([]);
  const [sportsLive, setSportsLive] = useState<LiveStream[]>([]);
  const [replays, setReplays] = useState<SeriesItem[]>([]);
  const [query, setQuery] = useState('');
  const [statsEv, setStatsEv] = useState<SportEvent | null>(null);
  const [stats, setStats] = useState<StatRow[] | null>(null);

  const loadScores = useCallback(async () => {
    const r = await fetchAllEvents();
    setEvents(r.events);
    setAllFailed(r.failed === LEAGUES.length);
    setUpdated(Date.now());
  }, []);

  // Marcadores: carga inicial + actualización cada 60 s
  useEffect(() => {
    let alive = true;
    loadScores().finally(() => alive && setLoading(false));
    const t = setInterval(loadScores, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [loadScores]);

  // Canales del servidor (para relacionar partidos) + lista de canales/repeticiones de eventos
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [liveCats, seriesCats, all] = await Promise.all([
          iptvApi.getCategories('live', username),
          iptvApi.getCategories('series', username),
          iptvApi.getStreams('live', username),
        ]);
        const kw = ['deporte', 'event', 'fútbol', 'futbol', 'conmebol', 'liga', 'champions', 'boxing', 'ufc', 'f1', 'motogp', 'soccer', 'sports'];
        const has = (c: any) => kw.some((k) => String(c.category_name).toLowerCase().includes(k));
        const lc = liveCats.find(has) || liveCats[0];
        const sc = seriesCats.find(has) || seriesCats[0];
        const [live, rep] = await Promise.all([
          lc ? iptvApi.getStreams('live', username, lc.category_id) : Promise.resolve([]),
          sc ? iptvApi.getStreams('series', username, sc.category_id) : Promise.resolve([]),
        ]);
        if (alive) {
          setAllLive(all);
          setSportsLive(live);
          setReplays(rep);
        }
      } catch (e) {
        console.warn('Eventos: no se pudieron cargar los canales', e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  const index = useMemo(() => buildChannelIndex(allLive.length ? allLive : sportsLive), [allLive, sportsLive]);
  const channelsFor = useMemo(() => {
    const m: Record<string, any[]> = {};
    if (index.length) for (const e of events) if (e.state !== 'post') m[e.id] = findChannels(e, index);
    return m;
  }, [events, index]);

  const toggleFav = (t: SportTeam, sport: string) => {
    const key = `${sport}:${t.id}`;
    setFavs((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const playChannel = (ch: any) =>
    onPlayStream({
      streamId: ch.stream_id,
      title: adjustTime(ch.name),
      url: ch.stream_url || iptvApi.buildStreamUrl('live', ch.stream_id, 'm3u8', username),
      type: 'live',
      poster: ch.stream_icon,
      category: 'Eventos',
    });

  const openStats = (ev: SportEvent) => {
    setStatsEv(ev);
    setStats(null);
    fetchStats(ev).then(setStats).catch(() => setStats([]));
  };

  const findChannel = (ev: SportEvent) => {
    setQuery(ev.home.short || ev.home.name);
    setTab('channels');
  };

  const liveEvents = events.filter((e) => e.state === 'in');
  const mineEvents = events.filter((e) => favs.includes(`${e.sport}:${e.home.id}`) || favs.includes(`${e.sport}:${e.away.id}`));
  const card = (ev: SportEvent, hero = false) => (
    <EventCard key={ev.id} ev={ev} hero={hero} channels={channelsFor[ev.id] || []} favs={favs} onFav={toggleFav} onPlayChannel={playChannel} onStats={openStats} onFind={findChannel} />
  );

  const q = norm(query);
  const channelResults = q ? allLive.filter((s) => norm(s.name).includes(q)).slice(0, 60) : sportsLive;
  const replayResults = q ? replays.filter((s) => norm(s.name).includes(q)) : replays;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'live', label: 'En vivo ahora', count: liveEvents.length },
    { id: 'today', label: 'Hoy' },
    { id: 'mine', label: 'Mis equipos' },
    { id: 'channels', label: 'Canales' },
  ];

  const empty = (text: string) => <p className="text-center text-sm text-[#8a94a3] py-16">{text}</p>;
  const grid = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3';

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#07090c] text-[#f2f5f9] select-none">
      <div className="px-4 pt-3 pb-0 border-b border-[#1c2128]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="tv-focusable hidden md:flex p-2 rounded-xl bg-[#111418] border border-[#1c2128] text-[#8a94a3] cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-2xl font-extrabold">Deportes</h2>
          <button
            onClick={() => loadScores()}
            aria-label="Actualizar"
            className="tv-focusable ml-auto p-2 rounded-xl bg-[#111418] border border-[#1c2128] text-[#8a94a3] cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-5 overflow-x-auto mt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`tv-focusable shrink-0 pb-2.5 text-[15px] font-bold border-b-[3px] cursor-pointer transition ${
                tab === t.id ? 'text-[#f2f5f9] border-[#00c2e0]' : 'text-[#8a94a3] border-transparent'
              }`}
            >
              {t.label}
              {t.count ? <span className="ml-1.5 text-[#ef4444]">{t.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {updated > 0 && tab !== 'channels' && (
          <p className="text-[11px] text-[#8a94a3] px-1">
            Marcadores actualizados {new Date(updated).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} · se refrescan solos cada minuto
          </p>
        )}

        {loading && tab !== 'channels' ? (
          <div className="flex flex-col items-center py-20 text-[#8a94a3] text-sm">
            <div className="w-9 h-9 border-2 border-[#00c2e0] border-t-transparent rounded-full animate-spin mb-3" />
            Cargando partidos…
          </div>
        ) : allFailed && tab !== 'channels' ? (
          empty('No se pudo cargar la agenda deportiva. Revisá tu conexión y tocá actualizar.')
        ) : tab === 'live' ? (
          liveEvents.length === 0 ? (
            empty('No hay partidos en vivo en este momento. Mirá la pestaña Hoy.')
          ) : (
            <>
              {card(liveEvents.find((e) => (channelsFor[e.id] || []).length) || liveEvents[0], true)}
              <div className="flex items-center gap-2 pt-1 text-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> En vivo ahora
              </div>
              <div className={grid}>{liveEvents.map((e) => card(e))}</div>
            </>
          )
        ) : tab === 'today' ? (
          events.length === 0 ? (
            empty('No hay partidos cargados para hoy.')
          ) : (
            (['in', 'pre', 'post'] as const).map((s) => {
              const list = events.filter((e) => e.state === s);
              if (!list.length) return null;
              return (
                <section key={s} className="space-y-2">
                  <h3 className="text-sm font-bold text-[#8a94a3] uppercase tracking-wide pt-1">{s === 'in' ? 'En vivo' : s === 'pre' ? 'Próximos' : 'Finalizados'}</h3>
                  <div className={grid}>{list.map((e) => card(e))}</div>
                </section>
              );
            })
          )
        ) : tab === 'mine' ? (
          favs.length === 0 ? (
            empty('Tocá la estrella al lado de un equipo para seguirlo. Sus partidos aparecen acá.')
          ) : mineEvents.length === 0 ? (
            empty('Tus equipos no juegan hoy.')
          ) : (
            <div className={grid}>{mineEvents.map((e) => card(e))}</div>
          )
        ) : (
          <>
            <div className="relative">
              <Search className="w-4 h-4 text-[#8a94a3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar canal o evento…"
                className="w-full bg-[#111418] border border-[#1c2128] rounded-xl pl-9 pr-9 py-2.5 text-sm placeholder-[#4a5568] focus:outline-none focus:border-[#00c2e0]"
              />
              {query && (
                <button onClick={() => setQuery('')} className="tv-focusable absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer" aria-label="Borrar">
                  <X className="w-4 h-4 text-[#8a94a3]" />
                </button>
              )}
            </div>
            {channelResults.length === 0 ? (
              empty('No se encontraron canales.')
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {channelResults.map((s) => (
                  <button
                    key={s.stream_id}
                    onClick={() => playChannel(s)}
                    className="tv-focusable flex items-center gap-3 p-2.5 rounded-xl bg-[#111418] border border-[#1c2128] text-left cursor-pointer hover:border-[#00c2e0]"
                  >
                    {s.stream_icon ? <img src={s.stream_icon} alt="" loading="lazy" className="w-10 h-10 object-contain rounded-lg bg-black" /> : <span className="w-10 h-10 rounded-lg bg-[#1c2128]" />}
                    <span className="flex-1 min-w-0 text-sm font-semibold line-clamp-2">{adjustTime(s.name)}</span>
                    <Play className="w-4 h-4 text-[#00c2e0] shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {replayResults.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-[#8a94a3] uppercase tracking-wide pt-3">Repeticiones y resúmenes</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-2">
                  {replayResults.map((r) => (
                    <button
                      key={r.series_id}
                      onClick={() =>
                        onPlayStream({
                          streamId: r.series_id,
                          title: `${r.name}`,
                          url: iptvApi.buildStreamUrl('episode', r.series_id, 'mp4', username),
                          type: 'episode',
                          poster: r.cover,
                        })
                      }
                      className="tv-focusable rounded-xl overflow-hidden bg-[#111418] border border-[#1c2128] text-left cursor-pointer hover:border-[#00c2e0]"
                    >
                      <div className="aspect-[2/3] bg-black">{r.cover && <img src={r.cover} alt={r.name} loading="lazy" className="w-full h-full object-cover" />}</div>
                      <p className="p-1.5 text-[11px] leading-tight font-bold line-clamp-2">{r.name}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {statsEv && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end md:items-center justify-center" onClick={() => setStatsEv(null)}>
          <div className="w-full md:max-w-md bg-[#111418] border border-[#1c2128] rounded-t-3xl md:rounded-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-sm font-bold text-[#00c2e0]">
                <BarChart3 className="w-4 h-4" /> Estadísticas
              </span>
              <button onClick={() => setStatsEv(null)} className="tv-focusable p-1 cursor-pointer" aria-label="Cerrar">
                <X className="w-5 h-5 text-[#8a94a3]" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 mb-1 text-center">
              <span className="flex-1 font-bold text-sm">{statsEv.home.name}</span>
              <span className="text-2xl font-extrabold tabular-nums">{statsEv.state === 'pre' ? 'vs' : `${statsEv.home.score} - ${statsEv.away.score}`}</span>
              <span className="flex-1 font-bold text-sm">{statsEv.away.name}</span>
            </div>
            <p className="text-center text-xs text-[#8a94a3] mb-4">
              {statsEv.leagueName} · {statsEv.state === 'in' ? statsEv.statusText : statsEv.state === 'post' ? 'Final' : timeLabel(statsEv.start)}
              {statsEv.venue ? ` · ${statsEv.venue}` : ''}
            </p>
            {stats === null ? (
              <p className="text-center text-sm text-[#8a94a3] py-6">Cargando…</p>
            ) : stats.length === 0 ? (
              <p className="text-center text-sm text-[#8a94a3] py-6">Todavía no hay estadísticas para este partido.</p>
            ) : (
              <div className="space-y-2.5">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="w-16 font-bold tabular-nums">{s.home}</span>
                    <span className="flex-1 text-center text-xs text-[#8a94a3]">{s.label}</span>
                    <span className="w-16 text-right font-bold tabular-nums">{s.away}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
