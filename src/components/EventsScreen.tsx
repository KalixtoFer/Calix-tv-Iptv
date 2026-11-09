import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, Star, Tv, Play, X, RefreshCw, BarChart3, Info, AlertCircle } from 'lucide-react';
import { LiveStream, SeriesItem } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';
import { dbService } from '../services/db';
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
    alternateChannels?: LiveStream[];
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
  onPlayStream: (stream: any) => void;
  onStats: (ev: SportEvent) => void;
  onFind: (ev: SportEvent) => void;
}

const TeamRow = React.memo(({ t, ev, fav, isTv, onFav }: { t: SportTeam; ev: SportEvent; fav: boolean; isTv: boolean; onFav: () => void }) => (
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
    {!isTv && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onFav();
        }}
        className="p-1 rounded-md text-[#4a5568] ml-1 hover:bg-white/10 transition-colors"
      >
        <Star className={`w-3.5 h-3.5 ${fav ? 'fill-[#00c2e0] text-[#00c2e0]' : ''}`} />
      </button>
    )}
  </div>
));

const getBestChannel = (channels: any[]) => {
  if (!channels || channels.length === 0) return null;
  const priorities = ['espn', 'tyc', 'fox', 'dsports', 'tnt', 'vix', 'win', 'gol'];
  // Prioridad 1: Coincidencia exacta de prioridad en el nombre
  for (const p of priorities) {
    const found = channels.find(c => c.name.toLowerCase().includes(p));
    if (found) return found;
  }
  // Prioridad 2: Cualquier canal que tenga 'HD' o 'FHD'
  const hd = channels.find(c => c.name.toUpperCase().includes('HD'));
  if (hd) return hd;
  // Prioridad 3: El primero de la lista
  return channels[0];
};

const EventCard = React.memo(({ ev, channels, favs, onFav, onPlayStream, onStats, onFind }: CardProps) => {
  const live = ev.state === 'in';
  const isFav = (t: SportTeam) => favs.includes(`${ev.sport}:${t.id}`);
  const isTv = document.body.classList.contains('tv-overscan') || window.innerWidth > 1024;
  
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const bestChannel = useMemo(() => getBestChannel(channels), [channels]);

  const handleAction = () => {
    if (bestChannel) {
      onPlayStream({
        streamId: bestChannel.stream_id,
        title: adjustTime(bestChannel.name),
        url: bestChannel.stream_url || iptvApi.buildStreamUrl('live', bestChannel.stream_id, 'm3u8', 'demo'), // username fallback
        type: 'live',
        poster: bestChannel.stream_icon,
        category: 'Eventos',
        alternateChannels: channels,
      });
    } else if (ev.state !== 'post') {
      onFind(ev);
    } else {
      onStats(ev);
    }
  };

  const handleLongPress = () => {
    setIsLongPressing(true);
    onFav(ev.home, ev.sport); // Toggle favorite
    setTimeout(() => setIsLongPressing(false), 1200);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'OK') {
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          handleLongPress();
          timerRef.current = null;
        }, 600);
      }
    }
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'OK') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        handleAction();
      }
    }
  };

  // For touch devices (Tablet)
  const onTouchStart = () => {
    timerRef.current = setTimeout(() => {
      handleLongPress();
      timerRef.current = null;
    }, 600);
  };

  const onTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      tabIndex={0}
      onFocus={(e) => {
        if (isTv) {
          e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onTouchStart}
      onMouseUp={onTouchEnd}
      onMouseLeave={onTouchEnd}
      onClick={() => {
        if (!isTv) {
          handleAction();
        }
      }}
      className={`tv-focusable group relative bg-[#111418] border border-[#1c2128] rounded-xl p-2.5 cursor-pointer transition-all outline-none 
        focus:ring-2 focus:ring-[#00c2e0] focus:border-[#00c2e0] focus:shadow-[0_0_15px_rgba(0,194,224,0.4)]
        hover:border-[#00c2e0]/50 active:scale-[0.98] ${
        live ? 'shadow-[inset_2px_0_0_0_#ef4444]' : ''
      }`}
    >
      {isLongPressing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 rounded-xl animate-in fade-in zoom-in duration-200">
           <div className="flex flex-col items-center gap-2">
              <Star className="w-10 h-10 text-[#00c2e0] fill-[#00c2e0] animate-bounce" />
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Favorito</span>
           </div>
        </div>
      )}

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
        <TeamRow t={ev.home} ev={ev} fav={isFav(ev.home)} isTv={isTv} onFav={() => onFav(ev.home, ev.sport)} />
        <TeamRow t={ev.away} ev={ev} fav={isFav(ev.away)} isTv={isTv} onFav={() => onFav(ev.away, ev.sport)} />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#1c2128]/30 group-hover:border-[#1c2128]">
        <div className="flex items-center gap-1.5">
           {channels.length > 0 ? (
             <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/30">
                <Tv className="w-2.5 h-2.5 text-[#00c2e0]" />
                <span className="text-[9px] font-black text-[#00c2e0] uppercase">Signal OK</span>
             </div>
           ) : ev.state !== 'post' ? (
             <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                <Info className="w-2.5 h-2.5 text-zinc-500" />
                <span className="text-[9px] font-black text-zinc-500 uppercase">Sin señal</span>
             </div>
           ) : null}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStats(ev);
            }}
            className="text-[9px] font-black text-[#00c2e0] uppercase px-2 py-0.5 rounded bg-[#00c2e0]/5 border border-[#00c2e0]/20 hover:bg-[#00c2e0]/10 transition"
          >
            Detalles
          </button>
          {isTv && (
            <div className="flex items-center gap-1 opacity-40 group-focus:opacity-100 transition-opacity">
               <span className="text-[9px] font-black text-zinc-500 uppercase">OK: Play</span>
            </div>
          )}
        </div>
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
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [cacheAge, setCacheAge] = useState('');
  const [updated, setUpdated] = useState(0);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [allLive, setAllLive] = useState<LiveStream[]>([]);
  const [sportsLive, setSportsLive] = useState<LiveStream[]>([]);
  const [replays, setReplays] = useState<SeriesItem[]>([]);
  const [query, setQuery] = useState('');
  const [statsEv, setStatsEv] = useState<SportEvent | null>(null);
  const [stats, setStats] = useState<StatRow[] | null>(null);

  const loadScores = useCallback(async () => {
    setHasError(false);
    let foundInCache = false;

    // 1. Diagnóstico y lectura de caché IndexedDB: usar última respuesta guardada mientras tanto
    try {
      const cached = await dbService.getEvents();
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        foundInCache = true;
        const ageMs = Date.now() - cached.timestamp;
        const ageMin = Math.floor(ageMs / 60000);
        const ageSec = Math.floor((ageMs % 60000) / 1000);
        const ageStr = ageMin > 0 ? `${ageMin}m ${ageSec}s` : `${ageSec}s`;
        console.log(
          `[EVENTOS] Resultado obtenido de CACHÉ (IndexedDB): ${cached.data.length} partidos. Antigüedad: ${ageStr} (${Math.round(ageMs / 1000)}s)`
        );
        setEvents(cached.data);
        setUsingCache(true);
        setCacheAge(ageStr);
        setUpdated(cached.timestamp);
      }
    } catch (err) {
      console.warn('[EVENTOS] Error consultando caché IndexedDB:', err);
    }

    // 2. Consulta a la red con hasta 2 reintentos automáticos y espera creciente
    const retryDelays = [0, 1200, 2500];
    let networkSuccess = false;
    let totalNetworkFailed = 0;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        setIsRetrying(true);
        console.log(`[EVENTOS] Reintentando consulta de red (intento ${attempt + 1}/3 tras espera de ${retryDelays[attempt]}ms)...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
      }

      try {
        const r = await fetchAllEvents();
        totalNetworkFailed = r.failed;

        if (r.events.length > 0) {
          console.log(`[EVENTOS] Resultado obtenido de la RED: ${r.events.length} partidos.`);
          setEvents(r.events);
          setUsingCache(false);
          setUpdated(Date.now());
          setAllFailed(false);
          setHasError(false);
          networkSuccess = true;

          // Regla: Guardar en caché solo si la carga devolvió > 0 elementos
          await dbService.setEvents(r.events);
          break;
        } else if (r.failed < LEAGUES.length) {
          // La red respondió sin errores críticos, pero no hay eventos en juego en este momento
          console.log(`[EVENTOS] La red respondió pero no hay partidos activos en este momento (0 eventos). Se preserva la caché previa.`);
          networkSuccess = true;
          break;
        }
      } catch (err: any) {
        console.error(`[EVENTOS] Intento ${attempt + 1} fallido:`, err.message || err);
      }
    }

    setIsRetrying(false);

    // Si falló la red y no tenemos ningún evento (ni en caché)
    if (!networkSuccess && !foundInCache) {
      setAllFailed(totalNetworkFailed === LEAGUES.length);
      setHasError(true);
    }
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
        
        // Cargar canales de TODAS las categorías de deportes y eventos para encontrar coincidencias
        const matchingSportsCats = liveCats.filter(has);
        const sportsCatList = matchingSportsCats.length > 0 ? matchingSportsCats : liveCats.slice(0, 3);
        
        const sc = seriesCats.find(has) || seriesCats[0];
        const [sportsChannelsArrays, rep] = await Promise.all([
          Promise.all(sportsCatList.slice(0, 12).map((cat) => iptvApi.getStreams('live', username, cat.category_id))),
          sc ? iptvApi.getStreams('series', username, sc.category_id) : Promise.resolve([]),
        ]);

        const fetchedStreams = sportsChannelsArrays.flat();
        const sportsCatIds = new Set(matchingSportsCats.map((c: any) => String(c.category_id)));
        const allMatching = (all || []).filter((s: any) =>
          sportsCatIds.has(String(s.category_id)) ||
          has(s) ||
          kw.some((k) => String(s.category_name || s.group_title || s.name || '').toLowerCase().includes(k)) ||
          String(s.name || '').toLowerCase().includes(' vs ') ||
          String(s.name || '').toLowerCase().includes(' v ')
        );

        // Deduplicar por stream_id para tener todos los canales deportivos y de eventos disponibles
        const streamsMap = new Map<string | number, any>();
        for (const s of [...fetchedStreams, ...allMatching]) {
          if (s && s.stream_id && !streamsMap.has(s.stream_id)) {
            streamsMap.set(s.stream_id, s);
          }
        }
        const combinedSportsLive = Array.from(streamsMap.values());

        if (alive) {
          setAllLive(all || []);
          setSportsLive(combinedSportsLive.length > 0 ? combinedSportsLive : all || []);
          setReplays(rep || []);
        }
      } catch (e) {
        console.warn('Eventos: no se pudieron cargar los canales', e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  // Canales específicos de eventos y partidos del día desde el proveedor IPTV
  const todayEventChannels = useMemo(() => {
    const list = sportsLive.length > 0 ? sportsLive : allLive;
    if (!list.length) return [];

    return list.filter((s: any) => {
      const n = (s.name || '').toLowerCase();
      const cat = ((s as any).category_name || (s as any).group_title || '').toLowerCase();
      const hasMatchPattern =
        n.includes(' vs ') ||
        n.includes(' v ') ||
        /\b[0-2]?\d[:.][0-5]\d\b/.test(n) ||
        n.includes(' hs') ||
        n.includes(' hrs');
      const isEventCat =
        cat.includes('event') ||
        cat.includes('exclusiv') ||
        cat.includes('encoder') ||
        cat.includes('disney') ||
        cat.includes('netflix');
      return hasMatchPattern || isEventCat;
    });
  }, [sportsLive, allLive]);

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
          <div className="flex items-center justify-between px-1 text-[10px] font-bold text-[#4a5568] uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />
              <span>Actualizado {new Date(updated).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </div>
            {isRetrying && (
              <span className="text-cyan-400 font-mono animate-pulse flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Actualizando...
              </span>
            )}
          </div>
        )}

        {usingCache && tab !== 'channels' && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <span className="flex items-center gap-2">
              <span>📦 Mostrando datos guardados en caché (antigüedad: {cacheAge})</span>
            </span>
            {isRetrying && (
              <span className="text-[11px] font-bold text-amber-400 animate-pulse flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Actualizando en segundo plano...
              </span>
            )}
          </div>
        )}

        {loading && events.length === 0 && tab !== 'channels' ? (
          <div className="flex flex-col items-center py-20 text-[#8a94a3] text-xs font-bold uppercase tracking-widest gap-4">
            <div className="w-10 h-10 border-2 border-[#00c2e0] border-t-transparent rounded-full animate-spin" />
            Cargando agenda deportiva…
          </div>
        ) : (hasError || (allFailed && events.length === 0)) && tab !== 'channels' ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              No se pudieron cargar los eventos deportivos
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
              No pudimos conectar con los servidores de marcadores deportivos. Comprobá tu conexión o reintentá.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadScores().finally(() => setLoading(false));
              }}
              className="tv-focusable px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-cyan-300"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar</span>
            </button>
          </div>
        ) : tab !== 'channels' ? (
          tab === 'live' && groupedSections.length === 0 ? (
            /* En vivo pero sin partidos jugando en este segundo en ESPN */
            <div className="space-y-5">
              {todayEventChannels.length > 0 ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-zinc-900 border border-cyan-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                          <span>Señales de Eventos de Hoy ({todayEventChannels.length})</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          No hay partidos con marcador en vivo en este minuto. Acá tenés los canales activos de tu lista con las transmisiones de hoy:
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab('today')}
                      className="tv-focusable shrink-0 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] uppercase tracking-wider transition cursor-pointer"
                    >
                      Ver Agenda Completa
                    </button>
                  </div>

                  {/* Canales de eventos de hoy */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <h3 className="text-[11px] font-black uppercase tracking-[2px] text-cyan-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        Canales con eventos de hoy
                      </h3>
                      <div className="flex-1 h-[1px] bg-[#1c2128]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                      {todayEventChannels.map((s) => (
                        <button
                          key={s.stream_id}
                          onClick={() => playChannel(s)}
                          className="tv-focusable group flex items-center gap-3 p-2.5 rounded-xl bg-[#111418] border border-[#1c2128] text-left cursor-pointer hover:border-cyan-400 hover:bg-zinc-900 transition-all active:scale-98"
                        >
                          {s.stream_icon ? (
                            <img src={s.stream_icon} alt="" loading="lazy" className="w-10 h-10 object-contain rounded-lg bg-black border border-zinc-800 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-cyan-400">
                              <Tv className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-white uppercase leading-tight line-clamp-2 group-hover:text-cyan-300">
                              {adjustTime(s.name)}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono block mt-0.5 truncate">
                              {s.category_name || s.group_title || 'Señal de Evento'}
                            </span>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                            <Play className="w-2.5 h-2.5 fill-cyan-400" /> Ver
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Próximos partidos programados para hoy */}
                  {events.filter(e => e.state === 'pre').length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 px-1">
                        <h3 className="text-[11px] font-black uppercase tracking-[2px] text-zinc-400">
                          Próximos partidos programados ({events.filter(e => e.state === 'pre').length})
                        </h3>
                        <div className="flex-1 h-[1px] bg-[#1c2128]" />
                      </div>
                      <div className={gridClass}>
                        {events.filter(e => e.state === 'pre').slice(0, 12).map((e) => (
                          <EventCard
                            key={e.id}
                            ev={e}
                            channels={channelsFor[e.id] || []}
                            favs={favs}
                            onFav={toggleFav}
                            onPlayStream={onPlayStream}
                            onStats={openStats}
                            onFind={findChannel}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                empty('No hay partidos ni señales de eventos disponibles en este momento.')
              )}
            </div>
          ) : groupedSections.length === 0 ? (
            empty(tab === 'mine' ? 'Seguí a tus equipos con la estrella para ver sus partidos acá.' : 'No hay partidos disponibles.')
          ) : (
            <div className="space-y-6">
              {groupedSections.map((sec) => (
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
                        onPlayStream={onPlayStream} 
                        onStats={openStats} 
                        onFind={findChannel} 
                      />
                    ))}
                  </div>
                </section>
              ))}

              {/* Si estamos en En vivo y hay partidos jugando, también mostrar los canales de eventos abajo */}
              {tab === 'live' && todayEventChannels.length > 0 && (
                <section className="space-y-2 pt-2 border-t border-[#1c2128]/60">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[2px] text-cyan-400 flex items-center gap-2">
                      <Tv className="w-3.5 h-3.5 text-cyan-400" />
                      Canales de transmisión de eventos ({todayEventChannels.length})
                    </h3>
                    <div className="flex-1 h-[1px] bg-[#1c2128]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                    {todayEventChannels.slice(0, 15).map((s) => (
                      <button
                        key={s.stream_id}
                        onClick={() => playChannel(s)}
                        className="tv-focusable group flex items-center gap-3 p-2.5 rounded-xl bg-[#111418] border border-[#1c2128] text-left cursor-pointer hover:border-cyan-400 hover:bg-zinc-900 transition-all active:scale-98"
                      >
                        {s.stream_icon ? (
                          <img src={s.stream_icon} alt="" loading="lazy" className="w-10 h-10 object-contain rounded-lg bg-black border border-zinc-800 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-cyan-400">
                            <Tv className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-white uppercase leading-tight line-clamp-2 group-hover:text-cyan-300">
                            {adjustTime(s.name)}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono block mt-0.5 truncate">
                            {s.category_name || s.group_title || 'Señal de Evento'}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                          <Play className="w-2.5 h-2.5 fill-cyan-400" /> Ver
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
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
                        onClick={() => { 
                          onPlayStream({
                            streamId: ch.stream_id,
                            title: adjustTime(ch.name),
                            url: ch.stream_url || iptvApi.buildStreamUrl('live', ch.stream_id, 'm3u8', username),
                            type: 'live',
                            poster: ch.stream_icon,
                            category: 'Eventos',
                            alternateChannels: channelsFor[statsEv.id]
                          });
                          setStatsEv(null); 
                        }}
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
