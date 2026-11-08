import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, Star, Tv, Play, X, RefreshCw, BarChart3, Info } from 'lucide-react';
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

/* ------------------------------ Tarjeta de partido Compacta ------------------------------ */
interface CardProps {
  ev: SportEvent;
  channels: any[];
  favs: string[];
  onFav: (t: SportTeam, sport: string) => void;
  onPlayChannel: (ch: any) => void;
  onStats: (ev: SportEvent) => void;
  onFind: (ev: SportEvent) => void;
}

const TeamRow = React.memo(({ t, ev, fav, onFav }: { t: SportTeam; ev: SportEvent; fav: boolean; onFav: () => void }) => (
  <div className="flex items-center gap-2 py-0.5">
    {t.logo ? (
      <img src={t.logo} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />
    ) : (
      <div className="w-5 h-5 rounded-full bg-[#1c2128] shrink-0" />
    )}
    <span className="flex-1 min-w-0 truncate text-[13px] font-bold text-[#f2f5f9]">{t.name}</span>
    {ev.state !== 'pre' && (
      <span className="text-sm font-black tabular-nums w-6 text-right text-[#f2f5f9]">
        {t.score}
      </span>
    )}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFav();
      }}
      className="tv-focusable p-1 rounded-md cursor-pointer hover:bg-white/10 transition-colors ml-1"
    >
      <Star className={`w-3.5 h-3.5 ${fav ? 'fill-[#00c2e0] text-[#00c2e0]' : 'text-[#4a5568]'}`} />
    </button>
  </div>
));

const EventCard = React.memo(({ ev, channels, favs, onFav, onPlayChannel, onStats, onFind }: CardProps) => {
  const live = ev.state === 'in';
  const isFav = (t: SportTeam) => favs.includes(`${ev.sport}:${t.id}`);

  return (
    <div
      onClick={() => {
        if (channels.length === 1) onPlayChannel(channels[0]);
        else if (channels.length > 1) onStats(ev); // Abrir detalle si hay múltiples opciones o stats
        else onFind(ev);
      }}
      className={`tv-focusable group relative bg-[#111418] border border-[#1c2128] rounded-xl p-2.5 cursor-pointer transition-all hover:border-[#00c2e0]/50 active:scale-[0.98] ${
        live ? 'shadow-[inset_2px_0_0_0_#ef4444]' : ''
      }`}
    >
      {/* Header: Liga y Estado */}
      <div className="flex items-center justify-between mb-1.5 border-b border-[#1c2128]/50 pb-1">
        <span className="text-[10px] font-bold text-[#8a94a3] uppercase tracking-wider truncate max-w-[70%]">
          {ev.leagueName}
        </span>
        {live ? (
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-[10px] font-black text-[#ef4444] uppercase tracking-tighter">
              {ev.statusText || 'VIVO'}
            </span>
          </div>
        ) : ev.state === 'post' ? (
          <span className="text-[10px] font-black text-[#8a94a3] uppercase tracking-tighter">
            FINAL
          </span>
        ) : (
          <span className="text-[10px] font-bold text-[#00c2e0] uppercase tracking-tighter">
            {ev.statusText || timeLabel(ev.start)}
          </span>
        )}
      </div>

      {/* Equipos y Marcador */}
      <div className="space-y-0.5">
        <TeamRow t={ev.home} ev={ev} fav={isFav(ev.home)} onFav={() => onFav(ev.home, ev.sport)} />
        <TeamRow t={ev.away} ev={ev} fav={isFav(ev.away)} onFav={() => onFav(ev.away, ev.sport)} />
      </div>

      {/* Botones de acción rápidos (solo visibles en hover o TV focus) */}
      <div className="flex items-center justify-end gap-2 mt-1.5 pt-1.5 border-t border-[#1c2128]/30 group-hover:border-[#1c2128]">
        {channels.length > 0 && (
          <div className="flex items-center gap-1 mr-auto">
             <Tv className="w-3 h-3 text-[#00c2e0]" />
             <span className="text-[9px] font-bold text-[#00c2e0]">{channels.length} {channels.length === 1 ? 'canal' : 'canales'}</span>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStats(ev);
          }}
          className="tv-focusable text-[10px] font-black text-[#00c2e0] uppercase px-2 py-0.5 rounded bg-[#00c2e0]/5 border border-transparent hover:border-[#00c2e0]/30 transition"
        >
          Detalles
        </button>
      </div>
    </div>
  );
});

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

  // Canales del servidor (para relacionar partidos)
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

  const toggleFav = useCallback((t: SportTeam, sport: string) => {
    const key = `${sport}:${t.id}`;
    setFavs((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const playChannel = useCallback((ch: any) =>
    onPlayStream({
      streamId: ch.stream_id,
      title: adjustTime(ch.name),
      url: ch.stream_url || iptvApi.buildStreamUrl('live', ch.stream_id, 'm3u8', username),
      type: 'live',
      poster: ch.stream_icon,
      category: 'Eventos',
    }), [onPlayStream, username]);

  const openStats = useCallback((ev: SportEvent) => {
    setStatsEv(ev);
    setStats(null);
    fetchStats(ev).then(setStats).catch(() => setStats([]));
  }, []);

  const findChannel = useCallback((ev: SportEvent) => {
    setQuery(ev.home.short || ev.home.name);
    setTab('channels');
  }, []);

  /* ------------------------------ Agrupación ------------------------------ */
  const groupedSections = useMemo(() => {
    let filtered = events;
    if (tab === 'live') filtered = events.filter(e => e.state === 'in');
    else if (tab === 'mine') filtered = events.filter(e => favs.includes(`${e.sport}:${e.home.id}`) || favs.includes(`${e.sport}:${e.away.id}`));

    const sections: { title: string; events: SportEvent[]; isLive?: boolean }[] = [];
    
    // Si estamos en "Hoy", separar explícitamente En Vivo, Próximos y Finalizados
    if (tab === 'today') {
      const live = filtered.filter(e => e.state === 'in');
      const upcoming = filtered.filter(e => e.state === 'pre');
      const finished = filtered.filter(e => e.state === 'post');

      if (live.length) sections.push({ title: 'EN VIVO AHORA', events: live, isLive: true });
      
      const byLeague: Record<string, SportEvent[]> = {};
      [...upcoming, ...finished].forEach(e => {
        const l = e.leagueName || 'OTRAS LIGAS';
        if (!byLeague[l]) byLeague[l] = [];
        byLeague[l].push(e);
      });

      Object.entries(byLeague)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([title, evs]) => sections.push({ title, events: evs }));
      
      return sections;
    }

    // Para "En vivo" o "Mis equipos", agrupar por liga simplemente
    const byLeague: Record<string, SportEvent[]> = {};
    filtered.forEach(e => {
      const l = e.leagueName || 'OTRAS LIGAS';
      if (!byLeague[l]) byLeague[l] = [];
      byLeague[l].push(e);
    });

    Object.entries(byLeague)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([title, evs]) => sections.push({ title, events: evs, isLive: tab === 'live' }));

    return sections;
  }, [events, tab, favs]);

  const q = norm(query);
  const channelResults = q ? allLive.filter((s) => norm(s.name).includes(q)).slice(0, 60) : sportsLive;
  const replayResults = q ? replays.filter((s) => norm(s.name).includes(q)) : replays;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'live', label: 'En vivo', count: events.filter(e => e.state === 'in').length },
    { id: 'today', label: 'Agenda' },
    { id: 'mine', label: 'Siguiendo' },
    { id: 'channels', label: 'Canales' },
  ];

  const empty = (text: string) => <p className="text-center text-sm text-[#8a94a3] py-16">{text}</p>;
  
  // Grilla responsiva optimizada
  const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3";

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#07090c] text-[#f2f5f9] select-none">
      <div className="px-4 pt-3 pb-0 border-b border-[#1c2128]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="tv-focusable hidden md:flex p-2 rounded-xl bg-[#111418] border border-[#1c2128] text-[#8a94a3] cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tight">Deportes</h2>
          <button
            onClick={() => loadScores()}
            aria-label="Actualizar"
            className="tv-focusable ml-auto p-2 rounded-xl bg-[#111418] border border-[#1c2128] text-[#8a94a3] cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-5 overflow-x-auto mt-2 no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`tv-focusable shrink-0 pb-2.5 text-xs font-black uppercase tracking-widest border-b-[3px] cursor-pointer transition ${
                tab === t.id ? 'text-[#00c2e0] border-[#00c2e0]' : 'text-[#4a5568] border-transparent'
              }`}
            >
              {t.label}
              {t.count ? <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#ef4444] text-white text-[10px] tabular-nums">{t.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
        {updated > 0 && tab !== 'channels' && (
          <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-[#4a5568] uppercase tracking-wider">
            <RefreshCw className="w-3 h-3" />
            <span>Actualizado {new Date(updated).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          </div>
        )}

        {loading && tab !== 'channels' ? (
          <div className="flex flex-col items-center py-20 text-[#8a94a3] text-xs font-bold uppercase tracking-widest gap-4">
            <div className="w-10 h-10 border-2 border-[#00c2e0] border-t-transparent rounded-full animate-spin" />
            Cargando agenda deportiva…
          </div>
        ) : allFailed && tab !== 'channels' ? (
          empty('No se pudo cargar la agenda deportiva. Revisá tu conexión y tocá actualizar.')
        ) : tab !== 'channels' ? (
          groupedSections.length === 0 ? (
            empty(tab === 'mine' ? 'Seguí a tus equipos con la estrella para ver sus partidos acá.' : 'No hay partidos disponibles.')
          ) : (
            groupedSections.map((sec) => (
              <section key={sec.title} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className={`text-[11px] font-black uppercase tracking-[2px] ${sec.isLive ? 'text-[#ef4444]' : 'text-[#8a94a3]'}`}>
                    {sec.title}
                  </h3>
                  <div className="flex-1 h-[1px] bg-[#1c2128]" />
                </div>
                <div className={gridClass}>
                  {sec.events.map((e) => (
                    <EventCard 
                      key={e.id} 
                      ev={e} 
                      channels={channelsFor[e.id] || []} 
                      favs={favs} 
                      onFav={toggleFav} 
                      onPlayChannel={playChannel} 
                      onStats={openStats} 
                      onFind={findChannel} 
                    />
                  ))}
                </div>
              </section>
            ))
          )
        ) : (
          /* Pestaña de Canales */
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#4a5568] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="BUSCAR CANAL O EQUIPO…"
                className="w-full bg-[#111418] border border-[#1c2128] rounded-xl pl-10 pr-10 py-3 text-xs font-bold uppercase tracking-wider placeholder-[#4a5568] focus:outline-none focus:border-[#00c2e0] transition-colors"
              />
              {query && (
                <button onClick={() => setQuery('')} className="tv-focusable absolute right-2 top-1/2 -translate-y-1/2 p-1.5 cursor-pointer text-[#4a5568] hover:text-white" aria-label="Borrar">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {channelResults.length === 0 ? (
              empty('No se encontraron señales.')
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-2.5">
                {channelResults.map((s) => (
                  <button
                    key={s.stream_id}
                    onClick={() => playChannel(s)}
                    className="tv-focusable flex items-center gap-3 p-2 rounded-xl bg-[#111418] border border-[#1c2128] text-left cursor-pointer hover:border-[#00c2e0] transition-all"
                  >
                    {s.stream_icon ? <img src={s.stream_icon} alt="" loading="lazy" className="w-9 h-9 object-contain rounded-lg bg-black" /> : <div className="w-9 h-9 rounded-lg bg-[#1c2128]" />}
                    <span className="flex-1 min-w-0 text-[11px] font-bold uppercase leading-tight line-clamp-2">{adjustTime(s.name)}</span>
                    <Play className="w-3.5 h-3.5 text-[#00c2e0] shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {replayResults.length > 0 && (
              <section className="space-y-2 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] text-[#8a94a3]">REPeticiones</h3>
                  <div className="flex-1 h-[1px] bg-[#1c2128]" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9 gap-2">
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
                      className="tv-focusable rounded-xl overflow-hidden bg-[#111418] border border-[#1c2128] text-left cursor-pointer hover:border-[#00c2e0] group transition-all"
                    >
                      <div className="aspect-[2/3] bg-black relative">
                        {r.cover ? <img src={r.cover} alt={r.name} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Tv /></div>}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <Play className="w-6 h-6 text-[#00c2e0] fill-current" />
                        </div>
                      </div>
                      <p className="p-1.5 text-[10px] leading-tight font-black uppercase truncate">{r.name}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalle / Estadísticas */}
      {statsEv && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setStatsEv(null)}>
          <div className="w-full max-w-lg bg-[#0b0d11] border border-[#1c2128] rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header Modal */}
            <div className="bg-[#111418] p-4 flex items-center justify-between border-b border-[#1c2128]">
               <span className="flex items-center gap-2 text-xs font-black text-[#00c2e0] uppercase tracking-[2px]">
                <BarChart3 className="w-4 h-4" /> Detalle del encuentro
               </span>
               <button onClick={() => setStatsEv(null)} className="tv-focusable p-1.5 rounded-lg hover:bg-white/5 text-[#8a94a3] cursor-pointer">
                <X className="w-5 h-5" />
               </button>
            </div>

            <div className="p-6">
              {/* Marcador Grande */}
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex-1 flex flex-col items-center gap-2">
                   {statsEv.home.logo ? <img src={statsEv.home.logo} className="w-14 h-14 object-contain" alt="" /> : <div className="w-14 h-14 rounded-full bg-[#1c2128]" />}
                   <span className="text-xs font-black uppercase text-center leading-tight">{statsEv.home.name}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <span className="text-4xl font-black tabular-nums tracking-tighter">
                    {statsEv.state === 'pre' ? 'VS' : `${statsEv.home.score} - ${statsEv.away.score}`}
                   </span>
                   {statsEv.state === 'in' && <span className="text-[10px] font-black text-[#ef4444] animate-pulse">{statsEv.statusText}</span>}
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                   {statsEv.away.logo ? <img src={statsEv.away.logo} className="w-14 h-14 object-contain" alt="" /> : <div className="w-14 h-14 rounded-full bg-[#1c2128]" />}
                   <span className="text-xs font-black uppercase text-center leading-tight">{statsEv.away.name}</span>
                </div>
              </div>
              
              <p className="text-center text-[10px] font-bold text-[#4a5568] uppercase tracking-[1px] mb-6">
                {statsEv.leagueName} {statsEv.venue ? `· ${statsEv.venue}` : ''}
              </p>

              {/* Canales Disponibles */}
              {(channelsFor[statsEv.id] || []).length > 0 && (
                <div className="mb-6 space-y-2">
                  <h4 className="text-[10px] font-black text-[#8a94a3] uppercase tracking-[2px] mb-3">Transmisión en vivo</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {(channelsFor[statsEv.id] || []).map(ch => (
                      <button 
                        key={ch.stream_id}
                        onClick={() => { playChannel(ch); setStatsEv(null); }}
                        className="tv-focusable flex items-center justify-between p-3 rounded-xl bg-[#00c2e0]/10 border border-[#00c2e0]/30 hover:bg-[#00c2e0]/20 text-left transition-colors"
                      >
                         <div className="flex items-center gap-3">
                           <Tv className="w-4 h-4 text-[#00c2e0]" />
                           <span className="text-xs font-black uppercase text-[#f2f5f9]">{adjustTime(ch.name)}</span>
                         </div>
                         <Play className="w-4 h-4 text-[#00c2e0] fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estadísticas */}
              <div>
                <h4 className="text-[10px] font-black text-[#8a94a3] uppercase tracking-[2px] mb-3">Estadísticas del partido</h4>
                {stats === null ? (
                  <div className="flex justify-center py-6"><RefreshCw className="w-6 h-6 text-[#1c2128] animate-spin" /></div>
                ) : stats.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 opacity-30">
                    <Info className="w-8 h-8" />
                    <span className="text-[10px] font-bold uppercase">Sin datos disponibles aún</span>
                  </div>
                ) : (
                  <div className="space-y-3 bg-[#111418] p-4 rounded-2xl border border-[#1c2128]">
                    {stats.map((s) => (
                      <div key={s.label} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-black">
                          <span className="text-[#f2f5f9]">{s.home}</span>
                          <span className="text-[#4a5568] uppercase tracking-tighter">{s.label}</span>
                          <span className="text-[#f2f5f9]">{s.away}</span>
                        </div>
                        <div className="flex h-1.5 bg-[#1c2128] rounded-full overflow-hidden">
                           {/* Simple bar visualization */}
                           <div className="h-full bg-[#00c2e0]" style={{ width: `${(parseInt(s.home) / (parseInt(s.home) + parseInt(s.away) || 1)) * 100}%` }} />
                           <div className="h-full bg-white/10" style={{ width: '2px' }} />
                           <div className="h-full bg-[#ef4444]" style={{ width: `${(parseInt(s.away) / (parseInt(s.home) + parseInt(s.away) || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
