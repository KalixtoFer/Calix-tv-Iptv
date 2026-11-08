import React, { useState, useEffect } from 'react';
import {
  Settings,
  Wifi,
  Calendar,
  Clock,
  Tv,
  Clapperboard,
  Smartphone,
  ChevronRight,
  Film,
  Trophy,
  LogOut,
  Flame,
} from 'lucide-react';
import { ActiveSection, CentralizedConfig, DeviceViewMode } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface HomeScreenProps {
  config: CentralizedConfig;
  username: string;
  viewMode?: DeviceViewMode;
  onChangeViewMode?: (mode: DeviceViewMode) => void;
  onNavigate: (section: ActiveSection) => void;
  onPlayStream: (stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'live' | 'movie' | 'episode';
    poster?: string;
    category?: string;
  }) => void;
  onOpenSettings?: () => void;
  onOpenSpeedTest?: () => void;
  onOpenFavorites?: () => void;
  onOpenSeriesDetail?: (series: any) => void;
  onLogout?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  username,
  viewMode = 'tv',
  onChangeViewMode,
  onNavigate,
  onPlayStream,
  onOpenSettings,
  onOpenSeriesDetail,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState<string>('12:00');
  const [dateStr, setDateStr] = useState<string>('');
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [recentSeries, setRecentSeries] = useState<any[]>([]);

  // 1. Fetch Recently Added Movies & Series (de TODAS las categorías, ordenados por fecha)
  useEffect(() => {
    let cancelled = false;
    const byDateDesc = (field: string, alt: string) => (x: any, y: any) =>
      (Number(y[field] || y[alt]) || 0) - (Number(x[field] || x[alt]) || 0);

    async function loadRecent() {
      try {
        const session = iptvApi.getSavedSession();
        if (!session) return;

        const [vodAll, seriesAll] = await Promise.all([
          iptvApi.getStreams('vod', session.username),
          iptvApi.getStreams('series', session.username),
        ]);
        if (cancelled) return;

        // Película: campo "added". Serie: "last_modified" (o "added" si el servidor lo trae)
        if (Array.isArray(vodAll)) {
          setRecentMovies([...vodAll].sort(byDateDesc('added', 'last_modified')).slice(0, 20));
        }
        if (Array.isArray(seriesAll)) {
          setRecentSeries([...seriesAll].sort(byDateDesc('last_modified', 'added')).slice(0, 20));
        }
      } catch (e) {
        console.warn('Failed to load recent content for home:', e);
      }
    }
    loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live time ticker
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
      const days = ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'];
      const months = [
        'Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.',
        'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'
      ];
      const dayName = days[now.getDay()];
      const dayNum = String(now.getDate()).padStart(2, '0');
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();
      setDateStr(`${dayName}, ${dayNum} ${monthName} ${year}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper para fallback de carátulas caídas
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="#18181b"><rect width="100%" height="100%" fill="#18181b"/><text x="50%" y="50%" fill="#71717a" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="middle">SIN IMAGEN</text></svg>'
    );
  };

  // =========================================================================
  // 1. MOBILE SMARTPHONE VIEW (Diseño optimizado para celulares verticales/horizontales)
  // =========================================================================
  if (viewMode === 'mobile') {
    return (
      <div className="flex-1 min-h-screen bg-[#030612] text-white p-3 sm:p-4 flex flex-col pb-24 overflow-y-auto select-none relative">
        {/* Ambient Glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-80 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header Mobile */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-[#05070a] border border-zinc-800 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <img
                src="/logo_icon.png"
                alt="CALIX TV"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-cyan-400 tracking-wider">
                Móvil • Tu Servicio Digital
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-cyan-400"
              title="Ajustes"
            >
              <Settings className="w-4 h-4" />
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-300 hover:text-rose-100"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4 Neon Category Touch Tiles in 2x2 grid: TV EN VIVO, EVENTOS DEPORTIVOS, PELÍCULAS, SERIES */}
        <div className="space-y-1.5 my-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
            Secciones Principales
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. TV En Vivo */}
            <button
              onClick={() => onNavigate('live')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-900/80 to-cyan-950/90 border border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2.5 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                <Tv className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-white block truncate">
                  TV EN VIVO
                </span>
                <span className="text-[10px] text-cyan-300 font-semibold block truncate">
                  Canales 24/7
                </span>
              </div>
            </button>

            {/* 2. Eventos Deportivos */}
            <button
              onClick={() => onNavigate('events')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/90 to-orange-950/90 border border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2.5 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-white block truncate uppercase">
                  EVENTOS
                </span>
                <span className="text-[10px] text-amber-300 font-semibold block truncate">
                  Deportes en Vivo
                </span>
              </div>
            </button>

            {/* 3. Películas */}
            <button
              onClick={() => onNavigate('movies')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/90 to-indigo-950/90 border border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-2.5 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.4)]">
                <Film className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-white block truncate">
                  PELÍCULAS
                </span>
                <span className="text-[10px] text-blue-300 font-semibold block truncate">
                  Estrenos VOD
                </span>
              </div>
            </button>

            {/* 4. Series */}
            <button
              onClick={() => onNavigate('series')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/90 to-purple-950/90 border border-indigo-400/80 shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center gap-2.5 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                <Clapperboard className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-white block truncate">
                  SERIES
                </span>
                <span className="text-[10px] text-indigo-300 font-semibold block truncate">
                  Temporadas HD
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Bloque 1: Películas Recién Agregadas */}
        <div className="my-3 space-y-3">
          <div className="flex items-center justify-between px-4 sm:px-6">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              Películas Recién Agregadas
            </span>
            <button
              onClick={() => onNavigate('movies')}
              className="text-[10px] font-bold text-cyan-400 flex items-center gap-0.5 hover:text-cyan-300 transition"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto px-4 sm:px-6 pb-2 scrollbar-none snap-x snap-mandatory scroll-smooth scroll-padding-x-4">
            {recentMovies.length > 0 ? (
              recentMovies.map((movie) => (
                <div
                  key={movie.stream_id}
                  tabIndex={0}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                  onClick={() => onPlayStream({
                    streamId: movie.stream_id,
                    title: movie.name,
                    url: iptvApi.buildStreamUrl('movie', movie.stream_id, movie.container_extension || 'mp4', username),
                    type: 'movie',
                    poster: movie.stream_icon,
                    category: movie.category_id
                  })}
                  className="w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative shadow-sm active:scale-95 transition cursor-pointer group snap-center outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <img
                    src={movie.stream_icon}
                    alt={movie.name}
                    onError={handleImgError}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent flex items-end p-2">
                    <span className="text-[10px] font-black text-white leading-tight line-clamp-2 uppercase">
                      {movie.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>

        {/* Bloque 2: Series Recién Agregadas */}
        <div className="my-3 space-y-3">
          <div className="flex items-center justify-between px-4 sm:px-6">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Clapperboard className="w-3.5 h-3.5 text-purple-400" />
              Series Recién Agregadas
            </span>
            <button
              onClick={() => onNavigate('series')}
              className="text-[10px] font-bold text-purple-400 flex items-center gap-0.5 hover:text-purple-300 transition"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto px-4 sm:px-6 pb-2 scrollbar-none snap-x snap-mandatory scroll-smooth scroll-padding-x-4">
            {recentSeries.length > 0 ? (
              recentSeries.map((series) => (
                <div
                  key={series.series_id}
                  tabIndex={0}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                  onClick={() => (onOpenSeriesDetail ? onOpenSeriesDetail(series) : onNavigate('series'))}
                  className="w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative shadow-sm active:scale-95 transition cursor-pointer group snap-center outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <img
                    src={series.cover}
                    alt={series.name}
                    onError={handleImgError}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent flex items-end p-2">
                    <span className="text-[10px] font-black text-white leading-tight line-clamp-2 uppercase">
                      {series.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ANDROID TV & PC / WEB VIEW (Diseño cinematográfico 16:9 con soporte D-Pad y ratón)
  // =========================================================================
  const isWeb = viewMode === 'web';

  return (
    <div
      className={`flex-1 flex flex-col w-full ${
        isWeb ? 'min-h-screen overflow-y-auto pb-8' : 'h-screen h-[100dvh] overflow-hidden'
      } bg-[#02050e] text-white px-[3vw] box-border select-none relative`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[40vh] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[30vw] h-[30vw] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP BAR: Logo CALIX TV (Izq) | Mode Switcher + Fecha + Hora + Ajustes (Der) */}
      <div className="flex-none pt-[clamp(6px,1.5vh,16px)] pb-[1vh] flex items-center justify-between w-full z-20">
        {/* Top Left: CALIX TV Branding */}
        <div className="flex items-center gap-3">
          <div className="h-[clamp(2.5rem,7vh,3.8rem)] aspect-square rounded-2xl overflow-hidden bg-[#05070a] border-2 border-zinc-800 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <img
              src="/logo_icon.png"
              alt="CALIX TV"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[clamp(0.6rem,1.5vh,0.75rem)] font-bold text-cyan-400 tracking-wider">
              {isWeb ? 'Versión Web • PC' : 'Tu Servicio Digital'}
            </span>
          </div>
        </div>

        {/* Top Right: Date | Clock | Settings | Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Date Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-cyan-950/80 border border-cyan-800/80 rounded-xl text-xs font-semibold text-cyan-200 shadow-md">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>{dateStr}</span>
          </div>

          <div className="h-6 w-[1px] bg-cyan-900/60 hidden md:block" />

          {/* Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-lg sm:text-xl font-black font-mono tracking-wider text-white">
              {timeStr}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800" />

          {/* Admin Settings Gear Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Configuración y Administración"
            className="tv-focusable w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 hover:text-cyan-400 transition cursor-pointer shadow-lg active:scale-95"
            title="Panel de Administración"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="tv-focusable px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 border border-rose-800/80 flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-white transition cursor-pointer shadow-lg active:scale-95"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </div>

      {/* MIDDLE SECTION: RECIÉN AGREGADOS (PELÍCULAS Y SERIES) */}
      <div className="flex-1 min-h-0 flex flex-col justify-evenly bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-[1.5vw] shadow-xl relative z-10 overflow-hidden">
        {/* BLOQUE 1: PELÍCULAS RECIÉN AGREGADAS */}
        <div className="space-y-[0.8vh]">
          <div className="flex items-center justify-between px-[1vw] pt-[0.5vh] pb-[0.5vh] border-b border-rose-900/30 leading-normal">
            <div className="flex items-center gap-2 text-rose-500 font-extrabold text-[clamp(0.65rem,1.8vh,0.9rem)] tracking-wider uppercase leading-normal">
              <Flame className="w-[clamp(0.8rem,2vh,1.1rem)] h-[clamp(0.8rem,2vh,1.1rem)] fill-rose-500 shrink-0" />
              <span className="leading-normal">PELÍCULAS RECIÉN AGREGADAS</span>
            </div>
            <button
              onClick={() => onNavigate('movies')}
              className="tv-focusable px-3 py-1 bg-rose-950/50 text-rose-300 hover:text-white text-[clamp(0.6rem,1.5vh,0.75rem)] font-bold flex items-center gap-1.5 cursor-pointer rounded-lg border border-rose-800/40 transition"
            >
              <span>Catálogo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-[1.2vw] overflow-x-auto overflow-y-hidden px-[1vw] py-[0.5vh] scrollbar-none snap-x snap-mandatory scroll-smooth [scroll-padding-inline:1vw]">
            {recentMovies.length > 0 ? (
              recentMovies.slice(0, 16).map((movie) => (
                <div
                  key={movie.stream_id}
                  tabIndex={0}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                  onClick={() => onPlayStream({
                    streamId: movie.stream_id,
                    title: movie.name,
                    url: iptvApi.buildStreamUrl('movie', movie.stream_id, movie.container_extension || 'mp4', username),
                    type: 'movie',
                    poster: movie.stream_icon,
                    category: movie.category_id
                  })}
                  className="tv-focusable group relative h-[clamp(110px,20vh,220px)] aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-cyan-400 bg-zinc-900 transition-all duration-300 shadow-md cursor-pointer flex flex-col snap-center outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <img
                    src={movie.stream_icon}
                    alt={movie.name}
                    onError={handleImgError}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[clamp(0.5rem,1.4vh,0.7rem)] font-black text-white leading-tight uppercase tracking-tight drop-shadow line-clamp-2">
                      {movie.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[clamp(110px,20vh,220px)] aspect-[2/3] shrink-0 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>

        {/* BLOQUE 2: SERIES RECIÉN AGREGADAS */}
        <div className="space-y-[0.8vh]">
          <div className="flex items-center justify-between px-[1vw] pt-[0.5vh] pb-[0.5vh] border-b border-purple-900/30 leading-normal">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-[clamp(0.65rem,1.8vh,0.9rem)] tracking-wider uppercase leading-normal">
              <Clapperboard className="w-[clamp(0.8rem,2vh,1.1rem)] h-[clamp(0.8rem,2vh,1.1rem)] text-purple-400 shrink-0" />
              <span className="leading-normal">SERIES RECIÉN AGREGADAS</span>
            </div>
            <button
              onClick={() => onNavigate('series')}
              className="tv-focusable px-3 py-1 bg-purple-950/50 text-purple-300 hover:text-white text-[clamp(0.6rem,1.5vh,0.75rem)] font-bold flex items-center gap-1.5 cursor-pointer rounded-lg border border-purple-800/40 transition"
            >
              <span>Catálogo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-[1.2vw] overflow-x-auto overflow-y-hidden px-[1vw] py-[0.5vh] scrollbar-none snap-x snap-mandatory scroll-smooth [scroll-padding-inline:1vw]">
            {recentSeries.length > 0 ? (
              recentSeries.slice(0, 16).map((series) => (
                <div
                  key={series.series_id}
                  tabIndex={0}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
                  onClick={() => (onOpenSeriesDetail ? onOpenSeriesDetail(series) : onNavigate('series'))}
                  className="tv-focusable group relative h-[clamp(110px,20vh,220px)] aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-purple-400 bg-zinc-900 transition-all duration-300 shadow-md cursor-pointer flex flex-col snap-center outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <img
                    src={series.cover}
                    alt={series.name}
                    onError={handleImgError}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[clamp(0.5rem,1.4vh,0.7rem)] font-black text-white leading-tight uppercase tracking-tight drop-shadow line-clamp-2">
                      {series.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[clamp(110px,20vh,220px)] aspect-[2/3] shrink-0 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION: 4 High-Contrast Neon-Glow Buttons */}
      <div className="flex-none mt-[4vh] pb-[3vh] grid grid-cols-4 gap-[1.5vw] w-full z-20">
        {/* 1. TV EN VIVO */}
        <button
          onClick={() => onNavigate('live')}
          className="tv-focusable flex flex-col items-center justify-center py-[2vh] px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-600 via-blue-700 to-cyan-700 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] hover:scale-[1.03] transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-[clamp(1.8rem,5vh,2.6rem)] h-[clamp(1.4rem,4vh,2.2rem)] rounded-xl bg-blue-950/80 border border-cyan-300 flex items-center justify-center mb-1 shadow-inner group-hover:bg-cyan-900">
            <Tv className="w-[60%] h-[60%] text-white stroke-[2.5]" />
          </div>
          <span className="font-black text-[clamp(0.55rem,1.6vh,0.85rem)] text-white tracking-wider uppercase drop-shadow text-center leading-none">
            TV EN VIVO
          </span>
        </button>

        {/* 2. EVENTOS EN VIVO (antes "DEPORTES") */}
        <button
          onClick={() => onNavigate('events')}
          className="tv-focusable flex flex-col items-center justify-center py-[2vh] px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-600 via-orange-700 to-amber-900 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.8)] hover:scale-[1.03] transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-[clamp(1.8rem,5vh,2.6rem)] h-[clamp(1.4rem,4vh,2.2rem)] rounded-xl bg-amber-950/80 border border-amber-300 flex items-center justify-center mb-1 shadow-inner group-hover:bg-amber-900">
            <Trophy className="w-[60%] h-[60%] text-amber-300 stroke-[2.5]" />
          </div>
          <span className="font-black text-[clamp(0.55rem,1.6vh,0.85rem)] text-white tracking-wider uppercase drop-shadow text-center leading-none">
            EVENTOS EN VIVO
          </span>
        </button>

        {/* 3. PELÍCULAS */}
        <button
          onClick={() => onNavigate('movies')}
          className="tv-focusable flex flex-col items-center justify-center py-[2vh] px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 border-2 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] hover:scale-[1.03] transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-[clamp(1.8rem,5vh,2.6rem)] h-[clamp(1.4rem,4vh,2.2rem)] rounded-xl bg-blue-950/80 border border-blue-300/80 flex items-center justify-center mb-1 shadow-inner group-hover:bg-blue-900">
            <Film className="w-[60%] h-[60%] text-white stroke-[2.2]" />
          </div>
          <span className="font-black text-[clamp(0.55rem,1.6vh,0.85rem)] text-white tracking-wider uppercase drop-shadow text-center leading-none">
            PELÍCULAS
          </span>
        </button>

        {/* 4. SERIES */}
        <button
          onClick={() => onNavigate('series')}
          className="tv-focusable flex flex-col items-center justify-center py-[2vh] px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-purple-800 via-indigo-900 to-purple-950 border-2 border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:border-purple-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.7)] hover:scale-[1.03] transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-[clamp(1.8rem,5vh,2.6rem)] h-[clamp(1.4rem,4vh,2.2rem)] rounded-xl bg-purple-950/80 border border-purple-300/80 flex items-center justify-center mb-1 shadow-inner group-hover:bg-purple-900">
            <Clapperboard className="w-[60%] h-[60%] text-white stroke-[2.2]" />
          </div>
          <span className="font-black text-[clamp(0.55rem,1.6vh,0.85rem)] text-white tracking-wider uppercase drop-shadow text-center leading-none">
            SERIES
          </span>
        </button>
      </div>
    </div>
  );
};
