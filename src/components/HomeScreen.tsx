import React, { useState, useEffect } from 'react';
import {
  Settings,
  Wifi,
  Calendar,
  Clock,
  Tv,
  Clapperboard,
  Monitor,
  Smartphone,
  Star,
  ChevronRight,
  Play,
  Flame,
  Home,
  Film,
  Sparkles,
  Trophy,
  LogOut,
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
  onLogout?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  config,
  username,
  viewMode = 'tv',
  onChangeViewMode,
  onNavigate,
  onPlayStream,
  onOpenSettings,
  onOpenSpeedTest,
  onOpenFavorites,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState<string>('13:45');
  const [dateStr, setDateStr] = useState<string>('Mié, 03 Nov. 2026');
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [recentSeries, setRecentSeries] = useState<any[]>([]);

  // 1. Fetch Recently Added Movies & Series
  useEffect(() => {
    async function loadRecent() {
      try {
        const session = iptvApi.getSavedSession();
        if (!session) return;
        
        const vodCats = await iptvApi.getCategories('vod', session.username);
        if (vodCats && vodCats.length > 0) {
          const list = await iptvApi.getStreams('vod', session.username, vodCats[0].category_id);
          setRecentMovies(list.slice(0, 12));
        }

        const seriesCats = await iptvApi.getCategories('series', session.username);
        if (seriesCats && seriesCats.length > 0) {
          const sList = await iptvApi.getStreams('series', session.username, seriesCats[0].category_id);
          setRecentSeries(sList.slice(0, 12));
        }
      } catch (e) {
        console.warn('Failed to load recent content for home:', e);
      }
    }
    loadRecent();
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
            <img
              src="/logo.png"
              alt="CALIX TV"
              className="h-12 sm:h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]"
            />
            <div>
              <span className="text-[10px] font-bold text-cyan-400 tracking-wider">
                Móvil • Tu Servicio Digital
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Pill (Celular y Android TV) */}
            {onChangeViewMode && (
              <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-xl p-0.5 text-[11px] font-bold">
                <button
                  onClick={() => onChangeViewMode('mobile')}
                  className="px-2.5 py-1 rounded-lg flex items-center gap-1 transition bg-cyan-500 text-black shadow font-black"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Celular</span>
                </button>
                <button
                  onClick={() => onChangeViewMode('tv')}
                  className="px-2.5 py-1 rounded-lg flex items-center gap-1 transition text-zinc-400 hover:text-white"
                >
                  <Tv className="w-3 h-3" />
                  <span>Android TV</span>
                </button>
              </div>
            )}

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

            {/* 2. Eventos Deportivos (Al lado de TV en vivo) */}
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
        <div className="my-1.5 space-y-1.5">
          <div className="flex items-center justify-between px-1">
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

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
            {recentMovies.length > 0 ? (
              recentMovies.map((movie) => (
                <div
                  key={movie.stream_id}
                  onClick={() => onPlayStream({
                    streamId: movie.stream_id,
                    title: movie.name,
                    url: iptvApi.buildStreamUrl('movie', movie.stream_id, movie.container_extension || 'mp4', username),
                    type: 'movie',
                    poster: movie.stream_icon,
                    category: movie.category_id
                  })}
                  className="w-20 sm:w-22 shrink-0 aspect-[2/3] rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 relative shadow-sm active:scale-95 transition cursor-pointer group"
                >
                  <img
                    src={movie.stream_icon}
                    alt={movie.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-1">
                    <span className="text-[9px] font-bold text-white leading-tight line-clamp-2">
                      {movie.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-20 sm:w-22 shrink-0 aspect-[2/3] rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>

        {/* Bloque 2: Series Recién Agregadas */}
        <div className="my-1.5 space-y-1.5">
          <div className="flex items-center justify-between px-1">
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

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
            {recentSeries.length > 0 ? (
              recentSeries.map((series) => (
                <div
                  key={series.series_id}
                  onClick={() => onNavigate('series')}
                  className="w-20 sm:w-22 shrink-0 aspect-[2/3] rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 relative shadow-sm active:scale-95 transition cursor-pointer group"
                >
                  <img
                    src={series.cover}
                    alt={series.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-1">
                    <span className="text-[9px] font-bold text-white leading-tight line-clamp-2">
                      {series.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-20 sm:w-22 shrink-0 aspect-[2/3] rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />
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
      className={`flex-1 flex flex-col justify-between w-full ${
        isWeb ? 'min-h-screen overflow-y-auto pb-8' : 'h-screen max-h-screen overflow-hidden'
      } bg-[#02050e] text-white p-3 sm:p-5 select-none relative`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP BAR: Logo CALIX TV (Izq) | Mode Switcher + Fecha + Hora + Ajustes (Der) */}
      <div className="flex items-center justify-between w-full z-20 pb-1">
        {/* Top Left: CALIX TV Branding */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="CALIX TV"
            className="h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-bold text-cyan-400 tracking-wider">
              {isWeb ? 'Versión Web • PC' : 'Tu Servicio Digital'}
            </span>
          </div>
        </div>

        {/* Top Right: Device Switcher (3 Versiones) | Date | Clock | Settings */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mode Switcher */}
          {onChangeViewMode && (
            <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-xl p-0.5 text-xs font-bold">
              <button
                onClick={() => onChangeViewMode('mobile')}
                className="px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition text-zinc-400 hover:text-white"
                title="Cambiar a Modo Celular"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Celular</span>
              </button>
              <button
                onClick={() => onChangeViewMode('tv')}
                className="px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition bg-cyan-500 text-black font-black shadow"
                title="Modo Android TV Activo"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Android TV</span>
              </button>
            </div>
          )}

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
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          )}

          {/* Wifi Signal Indicator */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: RECIÉN AGREGADOS (PELÍCULAS Y SERIES) */}
      <div className="flex-1 flex flex-col justify-center gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-3 sm:p-4 shadow-xl relative z-10 my-1.5 min-h-0 overflow-y-auto scrollbar-none">
        {/* BLOQUE 1: PELÍCULAS RECIÉN AGREGADAS */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-rose-900/40">
            <div className="flex items-center gap-2 text-rose-500 font-extrabold text-xs sm:text-sm tracking-wider uppercase">
              <Flame className="w-4 h-4 fill-rose-500" />
              <span>PELÍCULAS RECIÉN AGREGADAS</span>
            </div>
            <button
              onClick={() => onNavigate('movies')}
              className="tv-focusable px-2.5 py-1 bg-rose-950/50 text-rose-300 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer rounded-lg border border-rose-800/40 transition"
            >
              <span>Ver Catálogo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {recentMovies.length > 0 ? (
              recentMovies.slice(0, 10).map((movie) => (
                <div
                  key={movie.stream_id}
                  onClick={() => onPlayStream({
                    streamId: movie.stream_id,
                    title: movie.name,
                    url: iptvApi.buildStreamUrl('movie', movie.stream_id, movie.container_extension || 'mp4', username),
                    type: 'movie',
                    poster: movie.stream_icon,
                    category: movie.category_id
                  })}
                  className="tv-focusable group relative h-28 sm:h-32 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-cyan-400 bg-zinc-900 transition-all duration-300 shadow-md cursor-pointer flex flex-col"
                >
                  <img
                    src={movie.stream_icon}
                    alt={movie.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <span className="text-[10px] font-black text-white leading-tight uppercase tracking-tight drop-shadow line-clamp-2">
                      {movie.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 sm:h-32 aspect-[2/3] shrink-0 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>

        {/* BLOQUE 2: SERIES RECIÉN AGREGADAS */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between pb-1.5 border-b border-purple-900/40">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-xs sm:text-sm tracking-wider uppercase">
              <Clapperboard className="w-4 h-4 text-purple-400" />
              <span>SERIES RECIÉN AGREGADAS</span>
            </div>
            <button
              onClick={() => onNavigate('series')}
              className="tv-focusable px-2.5 py-1 bg-purple-950/50 text-purple-300 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer rounded-lg border border-purple-800/40 transition"
            >
              <span>Ver Catálogo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {recentSeries.length > 0 ? (
              recentSeries.slice(0, 10).map((series) => (
                <div
                  key={series.series_id}
                  onClick={() => onNavigate('series')}
                  className="tv-focusable group relative h-28 sm:h-32 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-purple-400 bg-zinc-900 transition-all duration-300 shadow-md cursor-pointer flex flex-col"
                >
                  <img
                    src={series.cover}
                    alt={series.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <span className="text-[10px] font-black text-white leading-tight uppercase tracking-tight drop-shadow line-clamp-2">
                      {series.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 sm:h-32 aspect-[2/3] shrink-0 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION: Centered 4 High-Contrast Neon-Glow Buttons (TV EN VIVO, EVENTOS DEPORTIVOS, PELÍCULAS, SERIES) */}
      <div className="flex justify-center items-center gap-3 sm:gap-5 max-w-5xl mx-auto w-full z-20 pt-2">
        {/* 1. TV EN VIVO */}
        <button
          onClick={() => onNavigate('live')}
          className="tv-focusable flex-1 max-w-[220px] group relative flex flex-col items-center justify-center py-3.5 sm:py-4 px-3 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-600 via-blue-700 to-cyan-700 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:shadow-[0_0_35px_rgba(6,182,212,0.9)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-blue-950/80 border border-cyan-300 flex items-center justify-center mb-1.5 shadow-inner group-hover:bg-cyan-900">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow text-center">
            TV EN VIVO
          </span>
        </button>

        {/* 2. EVENTOS DEPORTIVOS */}
        <button
          onClick={() => onNavigate('events')}
          className="tv-focusable flex-1 max-w-[220px] group relative flex flex-col items-center justify-center py-3.5 sm:py-4 px-3 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-600 via-orange-700 to-amber-900 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.8)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-amber-950/80 border border-amber-300 flex items-center justify-center mb-1.5 shadow-inner group-hover:bg-amber-900">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 stroke-[2.5]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow text-center leading-tight">
            EVENTOS DEPORTIVOS
          </span>
        </button>

        {/* 3. PELÍCULAS */}
        <button
          onClick={() => onNavigate('movies')}
          className="tv-focusable flex-1 max-w-[220px] group relative flex flex-col items-center justify-center py-3.5 sm:py-4 px-3 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 border border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-blue-950/80 border border-blue-300/80 flex items-center justify-center mb-1.5 shadow-inner group-hover:bg-blue-900">
            <Film className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow text-center">
            PELÍCULAS
          </span>
        </button>

        {/* 4. SERIES */}
        <button
          onClick={() => onNavigate('series')}
          className="tv-focusable flex-1 max-w-[220px] group relative flex flex-col items-center justify-center py-3.5 sm:py-4 px-3 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-purple-800 via-indigo-900 to-purple-950 border border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:border-purple-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-purple-950/80 border border-purple-300/80 flex items-center justify-center mb-1.5 shadow-inner group-hover:bg-purple-900">
            <Clapperboard className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow text-center">
            SERIES
          </span>
        </button>
      </div>
    </div>
  );
};
