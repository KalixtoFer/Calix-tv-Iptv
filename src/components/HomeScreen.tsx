import React, { useState, useEffect } from 'react';
import {
  Settings,
  Wifi,
  Gauge,
  Star,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ActiveSection, CentralizedConfig } from '../types/iptv';
import { VideoPlayer } from './VideoPlayer';

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
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [timeStr, setTimeStr] = useState<string>('03:16');
  const [dayStr, setDayStr] = useState<string>('Jue.');
  const [dateStr, setDateStr] = useState<string>('17/10/2024');

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
      setDayStr(days[now.getDay()]);
      setDateStr(
        now.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Featured posters for right vertical slider (Teacup and movies)
  const featuredPosters = [
    {
      id: 'p1',
      title: 'TEACUP',
      subtitle: 'Serie Exclusiva 2026',
      badge: 'TOP 1',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      actionSection: 'series',
    },
    {
      id: 'p2',
      title: 'DUNE: PARTE DOS',
      subtitle: 'Estreno 4K UHD',
      badge: 'ESTRENO',
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      actionSection: 'movies',
    },
    {
      id: 'p3',
      title: 'SHINOBI DRAGON',
      subtitle: 'Anime 24/7 Dual',
      badge: 'ANIME',
      imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      actionSection: 'anime',
    },
    {
      id: 'p4',
      title: 'UFC FIGHT PASS',
      subtitle: 'Evento Mundial PPV',
      badge: 'PPV VIVO',
      imageUrl: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&w=800&q=80',
      actionSection: 'especial',
    },
    {
      id: 'p5',
      title: 'FÚTBOL DE CAMPEONES',
      subtitle: 'Transmisión 60 FPS',
      badge: 'DEPORTES',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
      actionSection: 'live',
    },
  ];

  // Auto-slide vertical poster every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % featuredPosters.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featuredPosters.length]);

  const activePoster = featuredPosters[currentSlideIndex];
  const featured = config.featuredStream;

  const handleOpenPlayerFullscreen = () => {
    if (featured) {
      onPlayStream({
        streamId: featured.streamId,
        title: featured.name,
        url: featured.streamUrl,
        type: 'live',
        poster: featured.poster,
        category: featured.category,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between w-full h-screen max-h-screen bg-[#07080a] text-zinc-100 p-4 sm:p-6 lg:p-7 select-none overflow-hidden">
      {/* ========================================================
          1. TOP BAR: Versión 1.0 a la izquierda | Logo Calix TV + Wifi + Hora + Fecha + Ajustes a la derecha
         ======================================================== */}
      <div className="flex items-center justify-between w-full pt-1 pb-3 px-1">
        {/* Top Left: Versión 1.0 (sin la palabra FLUJO) */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-zinc-300 font-mono text-xs sm:text-sm font-bold tracking-wider shadow-inner flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Versión 1.0</span>
          </div>
        </div>

        {/* Top Right: Wifi + Hora + Fecha + Ajustes + Logo Calix TV en la esquina */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Wifi Icon */}
          <Wifi className="w-5 h-5 text-white shrink-0" />

          {/* Clock: Large time + stacked Day/Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              {timeStr}
            </span>
            <div className="flex flex-col text-[10px] text-zinc-300 font-semibold leading-tight text-left">
              <span>{dayStr}</span>
              <span>{dateStr}</span>
            </div>
          </div>

          {/* Settings circular button */}
          <button
            onClick={onOpenSettings}
            className="tv-focusable w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-200 hover:text-white transition cursor-pointer shadow-md"
            title="Ajustes / Panel de Administración"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="h-7 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Logo Oficial Calix TV en la misma esquina superior derecha */}
          <div className="flex items-center pl-0.5">
            <img
              src="/logo.png"
              alt="Calix TV - Tu Servicio Digital"
              className="h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-[0_0_18px_rgba(6,182,212,0.45)] transition-transform hover:scale-105 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          2. ÁREA CENTRAL: Reproductor en Vivo (Izq) + Poster Vertical (Der)
         ======================================================== */}
      <div className="grid grid-cols-12 gap-4 lg:gap-5 flex-1 my-2 min-h-0">
        {/* Left: 16:9 Live Video Player (approx 8.5 cols) */}
        <div className="col-span-12 lg:col-span-9 flex flex-col bg-black rounded-2xl overflow-hidden border border-zinc-800/70 shadow-2xl relative group">
          {/* Active Live Video Stream */}
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <VideoPlayer
              url={featured?.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'}
              title={featured?.name || 'D GAMES 2 HD'}
              subtitle={featured?.category || 'Deportes En Vivo'}
              poster={featured?.poster}
              autoPlay={true}
              type="live"
              className="w-full h-full"
              isMiniPlayer={true}
              onExpand={handleOpenPlayerFullscreen}
            />

            {/* Top Right Channel Watermark (like "D SPORTS") */}
            <div className="absolute top-3.5 right-4 pointer-events-none z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-white font-black text-xs tracking-wider uppercase drop-shadow">
                D SPORTS
              </span>
            </div>

            {/* Bottom Overlay Bar matching the exact reference */}
            <div
              onClick={handleOpenPlayerFullscreen}
              className="tv-focusable absolute bottom-2.5 left-3 right-3 bg-black/85 backdrop-blur-md rounded-xl p-2 sm:p-2.5 border border-white/10 flex items-center justify-between text-xs cursor-pointer z-20 shadow-lg"
            >
              <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                {/* Live Green Dot + Channel Name */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide">
                    {featured?.name || 'D GAMES 2 HD'}
                  </span>
                </div>

                {/* Scoreboard / Current Program info */}
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 bg-zinc-900/90 rounded border border-zinc-700/60 text-zinc-300 font-mono text-[11px] truncate">
                  <span>CD OSORNO</span>
                  <span className="font-bold text-cyan-400">3 | 4</span>
                  <span>SANTA MARIA</span>
                  <span className="text-zinc-500">• 1st 7:58</span>
                </div>
              </div>

              {/* Bitrate / Stream Speed (1Mb/s) */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900/80 rounded border border-zinc-700 text-zinc-300 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>1Mb/s</span>
                </div>

                <div className="p-1 bg-cyan-500 text-black rounded font-bold text-[10px] hidden sm:flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  <span>OK</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Vertical Poster Slider (Teacup etc.) (approx 3.5 cols) */}
        <div
          onClick={() => onNavigate(activePoster.actionSection as ActiveSection)}
          className="tv-focusable col-span-12 lg:col-span-3 rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl relative flex flex-col justify-end p-4 bg-zinc-950 group cursor-pointer"
        >
          {/* Backdrop Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-100 group-hover:scale-105"
            style={{ backgroundImage: `url(${activePoster.imageUrl})` }}
          />
          {/* Subtle dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Poster Content */}
          <div className="relative z-10 text-center space-y-1 mb-2">
            <h3 className="text-xl sm:text-2xl font-black text-cyan-300 tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {activePoster.title}
            </h3>
            <p className="text-[11px] text-zinc-300 drop-shadow">
              {activePoster.subtitle}
            </p>
          </div>

          {/* Slider Pagination Dots (exact match: 5 dots, active one in orange) */}
          <div className="relative z-10 flex items-center justify-center gap-1.5 pt-1">
            {featuredPosters.map((_, idx) => (
              <span
                key={idx}
                className={`transition-all rounded-full ${
                  idx === currentSlideIndex
                    ? 'w-4 h-1.5 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                    : 'w-1.5 h-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          3. MENÚ INFERIOR: Los 5 Botones de Colores + 2 Botones de Utilidad
         ======================================================== */}
      <div className="flex items-center gap-3 w-full pt-1 pb-1">
        {/* Container for the 5 Main Buttons */}
        <div className="grid grid-cols-5 gap-2.5 sm:gap-3 flex-1">
          {/* 1. VIVO (Coral Red #ff5252) */}
          <button
            onClick={() => onNavigate('live')}
            className="tv-focusable group flex flex-col items-center justify-center py-3.5 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-[#ff5b5b] to-[#e63946] text-white shadow-[0_4px_20px_rgba(230,57,70,0.35)] hover:shadow-[0_0_25px_rgba(255,91,91,0.6)] cursor-pointer transition transform active:scale-95"
          >
            {/* Custom Video Projector Icon */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 48 48" className="w-full h-full fill-white drop-shadow">
                <rect x="6" y="10" width="26" height="28" rx="6" />
                <polygon points="34,18 42,12 42,36 34,30" />
                <polygon points="17,19 25,24 17,29" fill="#e63946" />
              </svg>
            </div>
            <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow-sm">
              VIVO
            </span>
          </button>

          {/* 2. SERIE (Sky Blue #29b6f6) */}
          <button
            onClick={() => onNavigate('series')}
            className="tv-focusable group flex flex-col items-center justify-center py-3.5 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-[#29b6f6] to-[#0288d1] text-white shadow-[0_4px_20px_rgba(2,136,209,0.35)] hover:shadow-[0_0_25px_rgba(41,182,246,0.6)] cursor-pointer transition transform active:scale-95"
          >
            {/* TV with "TV" text inside */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 48 48" className="w-full h-full fill-white drop-shadow">
                <rect x="6" y="10" width="36" height="26" rx="5" />
                <rect x="18" y="38" width="12" height="4" rx="2" />
                <text
                  x="24"
                  y="28"
                  textAnchor="middle"
                  fill="#0288d1"
                  fontSize="13"
                  fontWeight="900"
                  fontFamily="system-ui, sans-serif"
                >
                  TV
                </text>
              </svg>
            </div>
            <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow-sm">
              SERIE
            </span>
          </button>

          {/* 3. PELÍCULA (Turquoise Emerald #00c988) */}
          <button
            onClick={() => onNavigate('movies')}
            className="tv-focusable group flex flex-col items-center justify-center py-3.5 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-[#10b981] to-[#059669] text-white shadow-[0_4px_20px_rgba(5,150,105,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] cursor-pointer transition transform active:scale-95"
          >
            {/* Film Reel Icon */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 48 48" className="w-full h-full fill-white drop-shadow">
                <circle cx="24" cy="24" r="18" />
                <circle cx="24" cy="24" r="5" fill="#059669" />
                <circle cx="16" cy="18" r="3" fill="#059669" />
                <circle cx="32" cy="18" r="3" fill="#059669" />
                <circle cx="16" cy="30" r="3" fill="#059669" />
                <circle cx="32" cy="30" r="3" fill="#059669" />
              </svg>
            </div>
            <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow-sm">
              PELÍCULA
            </span>
          </button>

          {/* 4. ANIME (Lavender Purple #8b5cf6) */}
          <button
            onClick={() => onNavigate('anime')}
            className="tv-focusable group flex flex-col items-center justify-center py-3.5 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] text-white shadow-[0_4px_20px_rgba(109,40,217,0.35)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] cursor-pointer transition transform active:scale-95"
          >
            {/* Cute Bear/Mascot Head Icon */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 48 48" className="w-full h-full fill-white drop-shadow">
                {/* Ears */}
                <circle cx="13" cy="16" r="6" />
                <circle cx="35" cy="16" r="6" />
                {/* Head */}
                <ellipse cx="24" cy="26" rx="16" ry="14" />
                {/* Eyes & Muzzle */}
                <circle cx="19" cy="24" r="2" fill="#6d28d9" />
                <circle cx="29" cy="24" r="2" fill="#6d28d9" />
                <ellipse cx="24" cy="30" rx="4" ry="2.5" fill="#6d28d9" />
              </svg>
            </div>
            <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow-sm">
              ANIME
            </span>
          </button>

          {/* 5. ESPECIAL (Vibrant Orange #f97316) */}
          <button
            onClick={() => onNavigate('especial')}
            className="tv-focusable group flex flex-col items-center justify-center py-3.5 sm:py-4 px-2 rounded-2xl bg-gradient-to-b from-[#f97316] to-[#ea580c] text-white shadow-[0_4px_20px_rgba(234,88,12,0.35)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] cursor-pointer transition transform active:scale-95"
          >
            {/* Castle / Ribbon Badge with Star */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 48 48" className="w-full h-full fill-white drop-shadow">
                <path d="M14,10 L34,10 C36.2,10 38,11.8 38,14 L38,38 L24,31 L10,38 L10,14 C10,11.8 11.8,10 14,10 Z" />
                <polygon
                  points="24,18 26,22 30,22 27,25 28,29 24,26.5 20,29 21,25 18,22 22,22"
                  fill="#ea580c"
                />
              </svg>
            </div>
            <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow-sm">
              ESPECIAL
            </span>
          </button>
        </div>

        {/* Far Right: Stack of 2 Utility Buttons (Rocket/Speed & Favorites Star) */}
        <div className="flex flex-col gap-2 shrink-0">
          {/* Top: Speed / Optimization */}
          <button
            onClick={onOpenSpeedTest}
            className="tv-focusable w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 flex items-center justify-center text-zinc-300 hover:text-cyan-400 transition cursor-pointer shadow-md"
            title="Prueba de Velocidad / Latencia del Servidor"
          >
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Bottom: Favorites Star */}
          <button
            onClick={onOpenFavorites}
            className="tv-focusable w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 flex items-center justify-center text-zinc-300 hover:text-amber-400 transition cursor-pointer shadow-md"
            title="Mis Favoritos"
          >
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400/20" />
          </button>
        </div>
      </div>
    </div>
  );
};
