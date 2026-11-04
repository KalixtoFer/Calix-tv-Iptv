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
}) => {
  const [timeStr, setTimeStr] = useState<string>('13:45');
  const [dateStr, setDateStr] = useState<string>('Mié, 03 Nov. 2026');
  const [recentMovies, setRecentMovies] = useState<any[]>([]);

  // 1. Fetch Recently Added Movies
  useEffect(() => {
    async function loadRecent() {
      try {
        const session = iptvApi.getSavedSession();
        if (!session) return;
        
        const cats = await iptvApi.getCategories('vod', session.username);
        if (cats && cats.length > 0) {
          // Fetch from the first category (usually Recently Added or All)
          const list = await iptvApi.getStreams('vod', session.username, cats[0].category_id);
          setRecentMovies(list.slice(0, 10)); // Take first 10
        }
      } catch (e) {
        console.warn('Failed to load recent movies for home:', e);
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



  const handleOpenLiveStream = () => {
    const featured = config.featuredStream;
    onPlayStream({
      streamId: featured?.streamId || 'demo-live-1',
      title: featured?.name || 'Fútbol Sin Cortes - En Vivo HD',
      url:
        featured?.streamUrl ||
        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'live',
      poster: featured?.poster,
      category: 'Deportes En Vivo',
    });
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
            <img
              src="/logo.png"
              alt="CALIX TV"
              className="h-9 sm:h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]"
            />
            <div>
              <span className="font-black text-lg tracking-tight text-white block leading-none">
                CALIX TV
              </span>
              <span className="text-[10px] font-bold text-cyan-400 tracking-wider">
                Móvil • Tu Servicio Digital
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Pill (3 Versiones: Móvil, TV, PC) */}
            {onChangeViewMode && (
              <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-xl p-0.5 text-[11px] font-bold">
                <button
                  onClick={() => onChangeViewMode('mobile')}
                  className="px-2 py-1 rounded-lg flex items-center gap-1 transition bg-cyan-500 text-black shadow font-black"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Móvil</span>
                </button>
                <button
                  onClick={() => onChangeViewMode('tv')}
                  className="px-2 py-1 rounded-lg flex items-center gap-1 transition text-zinc-400 hover:text-white"
                >
                  <Tv className="w-3 h-3" />
                  <span>TV</span>
                </button>
                <button
                  onClick={() => onChangeViewMode('web')}
                  className="px-2 py-1 rounded-lg flex items-center gap-1 transition text-zinc-400 hover:text-white"
                >
                  <Monitor className="w-3 h-3" />
                  <span>PC</span>
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
          </div>
        </div>

        {/* Hero Banner: Fútbol Sin Cortes (Mobile 16:9 proportioned) */}
        <div
          onClick={handleOpenLiveStream}
          className="my-3 rounded-2xl bg-gradient-to-r from-blue-950 via-zinc-950 to-black border border-cyan-500/70 p-4 relative overflow-hidden shadow-xl shadow-cyan-950/40 cursor-pointer active:scale-98 transition"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

          <div className="relative z-10 space-y-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black uppercase inline-flex items-center gap-1 shadow">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              ● EN VIVO
            </span>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight text-white leading-tight">
              FÚTBOL <span className="text-cyan-400">SIN CORTES</span>
            </h2>
            <p className="text-[11px] text-cyan-200 font-bold uppercase tracking-wider">
              Todos los partidos en 4K 60FPS
            </p>
            <div className="pt-1">
              <span className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-black inline-flex items-center gap-1.5 shadow-md shadow-cyan-500/30">
                <Play className="w-3.5 h-3.5 fill-black" />
                VER EN VIVO AHORA
              </span>
            </div>
          </div>
        </div>

        {/* 5 Neon Category Touch Tiles */}
        <div className="space-y-1.5 my-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
            Secciones Principales
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* 1. TV En Vivo */}
            <button
              onClick={() => onNavigate('live')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-900/80 to-cyan-950/90 border border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-3 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0">
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

            {/* 2. Películas */}
            <button
              onClick={() => onNavigate('movies')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/90 to-indigo-950/90 border border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-3 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center shrink-0">
                <Clapperboard className="w-5 h-5 text-blue-400" />
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

            {/* 3. Series */}
            <button
              onClick={() => onNavigate('series')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/90 to-purple-950/90 border border-indigo-400/80 shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center gap-3 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400 flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5 text-indigo-400" />
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

            {/* 4. Eventos Deportivos */}
            <button
              onClick={() => onNavigate('anime')}
              className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/90 to-orange-950/90 border border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-3 active:scale-95 transition text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-white block truncate uppercase">
                  EVENTOS
                </span>
                <span className="text-[10px] text-amber-300 font-semibold block truncate">
                  Agenda Deportiva
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Recently Added Movies Carousel (Horizontal swipe without distortion) */}
        <div className="my-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-rose-500" />
              Recién Agregados
            </span>
            <button
              onClick={() => onNavigate('movies')}
              className="text-[11px] font-bold text-cyan-400 flex items-center"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
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
                  className="w-28 sm:w-32 shrink-0 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative shadow-md active:scale-95 transition cursor-pointer"
                >
                  <img
                    src={movie.stream_icon}
                    alt={movie.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-1.5">
                    <span className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                      {movie.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              // Fallback skeleton or empty state
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="w-28 sm:w-32 shrink-0 aspect-[2/3] rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0d14]/95 backdrop-blur-xl border-t border-zinc-800/90 px-4 py-2 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => onNavigate('home')}
            className="flex flex-col items-center gap-0.5 text-cyan-400 font-bold text-[10px]"
          >
            <Home className="w-5 h-5" />
            <span>Inicio</span>
          </button>
          <button
            onClick={() => onNavigate('live')}
            className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-cyan-400 font-bold text-[10px]"
          >
            <Tv className="w-5 h-5" />
            <span>Canales</span>
          </button>
          <button
            onClick={() => onNavigate('movies')}
            className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-cyan-400 font-bold text-[10px]"
          >
            <Film className="w-5 h-5" />
            <span>Películas</span>
          </button>
          <button
            onClick={() => onNavigate('series')}
            className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-cyan-400 font-bold text-[10px]"
          >
            <Clapperboard className="w-5 h-5" />
            <span>Series</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-cyan-400 font-bold text-[10px]"
          >
            <Settings className="w-5 h-5" />
            <span>Ajustes</span>
          </button>
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
            <span className="font-black text-2xl sm:text-3xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-blue-400 drop-shadow">
              CALIXTV
            </span>
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
                <span className="hidden md:inline">Móvil</span>
              </button>
              <button
                onClick={() => onChangeViewMode('tv')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'tv'
                    ? 'bg-cyan-500 text-black font-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Modo Android TV Activo"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">TV</span>
              </button>
              <button
                onClick={() => onChangeViewMode('web')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition ${
                  viewMode === 'web'
                    ? 'bg-cyan-500 text-black font-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Modo PC / Navegador Activo"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">PC</span>
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

          {/* Wifi Signal Indicator */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: EN VIVO Banner (Left) + PELÍCULAS DESTACADAS Grid (Right) */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4 flex-1 my-2 z-10 min-h-0">
        {/* Left Card: EN VIVO - FÚTBOL SIN CORTES */}
        <div
          onClick={handleOpenLiveStream}
          className="tv-focusable col-span-12 lg:col-span-7 bg-gradient-to-br from-blue-950/80 via-zinc-950 to-black rounded-3xl border-2 border-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.25)] relative overflow-hidden flex flex-col justify-between p-5 sm:p-7 group cursor-pointer"
        >
          {/* Background Stadium & Trophy Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-80"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-black/70 to-transparent" />

          {/* Top Tag: ● EN VIVO */}
          <div className="relative z-10 flex items-center justify-start">
            <div className="px-3.5 py-1 bg-rose-600 text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-600/40">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>● EN VIVO</span>
            </div>
          </div>

          {/* Main Hero Text */}
          <div className="relative z-10 space-y-2 max-w-xl my-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic tracking-tight text-white leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              FÚTBOL <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-100 to-blue-400">
                SIN CORTES
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-extrabold text-cyan-200 tracking-wide uppercase drop-shadow">
              DISFRUTÁ TODOS LOS PARTIDOS EN LA MEJOR CALIDAD 4K
            </p>
          </div>

          {/* Bottom Action Prompt */}
          <div className="relative z-10 flex items-center gap-2 text-xs font-extrabold text-cyan-300">
            <div className="px-3 py-1.5 bg-cyan-950/90 border border-cyan-500/80 rounded-xl flex items-center gap-2 shadow-md">
              <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
              <span>REPRODUCIR CANAL EN VIVO</span>
            </div>
          </div>
        </div>

        {/* Right Section: RECIÉN AGREGADOS */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between bg-zinc-950/80 border border-rose-900/50 rounded-3xl p-3.5 sm:p-4 shadow-xl relative">
          <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
            <div className="flex items-center gap-2 text-rose-500 font-extrabold text-xs sm:text-sm tracking-wider uppercase">
              <Flame className="w-4 h-4 fill-rose-500" />
              <span>RECIÉN AGREGADOS</span>
            </div>
            <button
              onClick={() => onNavigate('movies')}
              className="tv-focusable text-rose-400 hover:text-rose-200 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver Catálogo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2x2 Movie Cards Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 my-2 min-h-0">
            {recentMovies.length > 0 ? (
              recentMovies.slice(0, 4).map((movie) => (
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
                  className="tv-focusable group relative rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-rose-500 bg-zinc-900 transition-all duration-300 shadow-md cursor-pointer flex flex-col"
                >
                  <img
                    src={movie.stream_icon}
                    alt={movie.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-2 sm:p-2.5">
                    <span className="text-[11px] sm:text-xs font-black text-white leading-tight uppercase tracking-wider drop-shadow line-clamp-2">
                      {movie.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION: 5 Big High-Contrast Neon-Glow Rounded Rectangles */}
      <div className="grid grid-cols-5 gap-3 sm:gap-4 z-20 pt-2">
        {/* 1. TV EN VIVO */}
        <button
          onClick={() => onNavigate('live')}
          className="tv-focusable group relative flex flex-col items-center justify-center py-3.5 sm:py-5 px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-600 via-blue-700 to-cyan-700 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:shadow-[0_0_35px_rgba(6,182,212,0.9)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-blue-950/80 border border-cyan-300 flex items-center justify-center mb-1.5 shadow-inner group-hover:bg-cyan-900">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow">
            TV EN VIVO
          </span>
        </button>

        {/* 2. PELÍCULAS */}
        <button
          onClick={() => onNavigate('movies')}
          className="tv-focusable group relative flex flex-col items-center justify-center py-3.5 sm:py-5 px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 border border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-blue-950/80 border border-blue-300/80 flex items-center justify-center mb-1.5 shadow-inner group-hover:bg-blue-900">
            <Clapperboard className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow">
            PELÍCULAS
          </span>
        </button>

        {/* 3. SERIES */}
        <button
          onClick={() => onNavigate('series')}
          className="tv-focusable group relative flex flex-col items-center justify-center py-3.5 sm:py-5 px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 border border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-blue-950/80 border border-blue-300/80 flex items-center justify-center mb-1.5 shadow-inner group-hover:bg-blue-900">
            <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow">
            SERIES
          </span>
        </button>

        {/* 4. EVENTOS */}
        <button
          onClick={() => onNavigate('anime')}
          className="tv-focusable group relative flex flex-col items-center justify-center py-3.5 sm:py-5 px-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 border border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:border-rose-400 hover:shadow-[0_0_30px_rgba(225,29,72,0.7)] hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        >
          <div className="w-10 h-8 sm:w-12 sm:h-10 rounded-xl overflow-hidden mb-1.5 flex items-center justify-center bg-blue-950 border border-blue-400/60 group-hover:border-rose-400">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 stroke-[2.5]" />
          </div>
          <span className="font-black text-xs sm:text-sm md:text-base text-white tracking-wider uppercase drop-shadow">
            EVENTOS
          </span>
        </button>
      </div>
    </div>
  );
};
