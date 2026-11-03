import React, { useState, useEffect } from 'react';
import {
  Settings,
  Wifi,
  Calendar,
  Clock,
  Tv,
  Clapperboard,
  Monitor,
  Star,
  ChevronRight,
  Play,
  Flame,
} from 'lucide-react';
import { ActiveSection, CentralizedConfig } from '../types/iptv';

interface HomeScreenProps {
  config: CentralizedConfig;
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
  onNavigate,
  onPlayStream,
  onOpenSettings,
  onOpenSpeedTest,
  onOpenFavorites,
}) => {
  const [timeStr, setTimeStr] = useState<string>('13:45');
  const [dateStr, setDateStr] = useState<string>('Mié, 03 Nov. 2026');

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

  const featuredMovies = [
    {
      id: 'm1',
      title: 'AVENGERS ENDGAME',
      imageUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'm2',
      title: 'DEADPOOL & WOLVERINE',
      imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'm3',
      title: 'TOP GUN MAVERICK',
      imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'm4',
      title: 'JURASSIC WORLD EL RENACER',
      imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleOpenLiveStream = () => {
    const featured = config.featuredStream;
    onPlayStream({
      streamId: featured?.streamId || 'demo-live-1',
      title: featured?.name || 'Fútbol En Vivo HD',
      url: featured?.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'live',
      poster: featured?.poster,
      category: 'Deportes En Vivo',
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between w-full h-screen max-h-screen bg-[#02050e] text-white p-3 sm:p-5 select-none overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* ========================================================
          1. TOP BAR: Logo CALIX TV (Izq) | Fecha + Hora + Ajustes + Wifi (Der)
         ======================================================== */}
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
              Tu Servicio Digital
            </span>
          </div>
        </div>

        {/* Top Right: Date Pill | Clock | Settings Gear | Wifi Signal */}
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

          {/* Admin Settings Gear Button (⚙️) */}
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

      {/* ========================================================
          2. MIDDLE SECTION: EN VIVO Banner (Left) + PELÍCULAS DESTACADAS Grid (Right)
         ======================================================== */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4 flex-1 my-2 z-10 min-h-0">
        {/* Left Card: EN VIVO - FÚTBOL SIN CORTES (approx 7 cols) */}
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

        {/* Right Section: PELÍCULAS DESTACADAS (approx 5 cols) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between bg-zinc-950/80 border border-cyan-900/50 rounded-3xl p-3.5 sm:p-4 shadow-xl relative">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm sm:text-base tracking-wide uppercase">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-white">PELÍCULAS DESTACADAS</span>
            </div>
            <ChevronRight className="w-5 h-5 text-cyan-400" />
          </div>

          {/* 2x2 Movie Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 mt-2.5">
            {featuredMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => onNavigate('movies')}
                className="tv-focusable relative rounded-2xl overflow-hidden border border-zinc-800 hover:border-cyan-400 transition-all duration-300 group cursor-pointer bg-zinc-900 shadow-md min-h-[100px] flex items-end p-2.5"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${movie.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                <span className="relative z-10 text-[11px] font-black text-white tracking-tight uppercase leading-tight drop-shadow">
                  {movie.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          3. BOTTOM NAVIGATION BAR (5 Glowing Glass Buttons)
         ======================================================== */}
      <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 w-full z-20 pt-1">
        {/* 1. TV EN VIVO */}
        <button
          onClick={() => onNavigate('live')}
          className="tv-focusable group py-3 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-cyan-950 via-zinc-900 to-black border-2 border-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] text-white flex flex-col items-center justify-center cursor-pointer transition transform active:scale-95"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center mb-1 text-cyan-300 group-hover:scale-110 transition-transform">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow">
            TV EN VIVO
          </span>
        </button>

        {/* 2. PELÍCULAS */}
        <button
          onClick={() => onNavigate('movies')}
          className="tv-focusable group py-3 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-blue-950 via-zinc-900 to-black border border-blue-600/70 hover:border-blue-400 shadow-lg text-white flex flex-col items-center justify-center cursor-pointer transition transform active:scale-95"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-1 text-blue-300 group-hover:scale-110 transition-transform">
            <Clapperboard className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow">
            PELÍCULAS
          </span>
        </button>

        {/* 3. SERIES */}
        <button
          onClick={() => onNavigate('series')}
          className="tv-focusable group py-3 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-indigo-950 via-zinc-900 to-black border border-indigo-600/70 hover:border-indigo-400 shadow-lg text-white flex flex-col items-center justify-center cursor-pointer transition transform active:scale-95"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/20 border border-indigo-400 flex items-center justify-center mb-1 text-indigo-300 group-hover:scale-110 transition-transform">
            <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow">
            SERIES
          </span>
        </button>

        {/* 4. ANIME */}
        <button
          onClick={() => onNavigate('anime')}
          className="tv-focusable group py-3 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-purple-950 via-zinc-900 to-black border border-purple-600/70 hover:border-purple-400 shadow-lg text-white flex flex-col items-center justify-center cursor-pointer transition transform active:scale-95"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center mb-1 text-purple-300 group-hover:scale-110 transition-transform overflow-hidden">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
          </div>
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow">
            ANIME
          </span>
        </button>

        {/* 5. ESPECIALES */}
        <button
          onClick={() => onNavigate('especial')}
          className="tv-focusable group py-3 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-amber-950 via-zinc-900 to-black border border-amber-600/70 hover:border-amber-400 shadow-lg text-white flex flex-col items-center justify-center cursor-pointer transition transform active:scale-95"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center mb-1 text-amber-300 group-hover:scale-110 transition-transform">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 text-amber-400" />
          </div>
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow">
            ESPECIALES
          </span>
        </button>
      </div>
    </div>
  );
};
