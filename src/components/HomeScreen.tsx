import React, { useState, useEffect } from 'react';
import {
  Tv,
  Film,
  Clapperboard,
  Sparkles,
  Flame,
  Play,
  Maximize2,
  Volume2,
  VolumeX,
  Radio,
  ChevronRight,
  ChevronLeft,
  Bell,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { ActiveSection, BannerItem, CentralizedConfig } from '../types/iptv';
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
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ config, onNavigate, onPlayStream }) => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState<number>(0);
  const [isPlayerMuted, setIsPlayerMuted] = useState<boolean>(true);

  const banners = config.banners && config.banners.length > 0 ? config.banners : [];
  const featured = config.featuredStream;

  // Auto-rotate banners every 7 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const activeBanner = banners[currentBannerIndex] || {
    id: 'default',
    title: 'SUPER DOMINGO DEPORTIVO',
    subtitle: 'Disfruta de las mejores ligas del mundo en 4K UHD y 60 FPS con baja latencia.',
    badge: 'EN VIVO AHORA',
    imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    tagColor: '#06b6d4',
    actionSection: 'live',
  };

  const handleOpenFeaturedFullscreen = () => {
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
    <div className="flex-1 flex flex-col justify-between p-3 sm:p-5 lg:p-6 max-w-[1700px] w-full mx-auto space-y-4 sm:space-y-6">
      {/* Optional Broadcast Announcement */}
      {config.showAnnouncement && config.announcement && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-r from-cyan-950/60 via-zinc-900/80 to-zinc-900/40 border border-cyan-800/40 rounded-xl text-xs sm:text-sm text-cyan-200">
          <Bell className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
          <span className="font-semibold text-cyan-400">AVISO:</span>
          <span className="truncate">{config.announcement}</span>
        </div>
      )}

      {/* ========================================================
          ÁREA CENTRAL: Reproductor Destacado + Banner Promocional
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-[300px] sm:min-h-[380px] lg:min-h-[420px]">
        {/* Left: Featured Video Player (Canal de TV en Vivo) */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-950/70 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative group">
          {/* Header of featured player */}
          <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-rose-400">
                CANAL DESTACADO EN DIRECTO
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-black/60 border border-zinc-700/60 text-cyan-400 font-mono text-[11px] rounded font-bold">
                {featured?.resolution || 'FHD 1080p'}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-black/60 border border-zinc-700/60 text-zinc-300 font-mono text-[11px] rounded">
                {featured?.fps || '60 FPS'}
              </span>
            </div>
          </div>

          {/* Embedded Active Video Player */}
          <div className="flex-1 relative bg-black min-h-[220px] sm:min-h-[260px] flex items-center justify-center">
            <VideoPlayer
              url={featured?.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'}
              title={featured?.name || 'Canal En Vivo'}
              subtitle={featured?.category || 'Televisión en Vivo'}
              poster={featured?.poster}
              autoPlay={true}
              type="live"
              className="w-full h-full min-h-[220px]"
              isMiniPlayer={true}
              onExpand={handleOpenFeaturedFullscreen}
            />

            {/* Quick Action Overlay on bottom of player */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-white drop-shadow">
                  {featured?.name || 'ESPN Deportes'}
                </span>
                <span className="text-[11px] text-zinc-400 hidden sm:inline">
                  • {featured?.category || 'Deportes'}
                </span>
              </div>

              <button
                onClick={handleOpenFeaturedFullscreen}
                className="tv-focusable pointer-events-auto px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center gap-1.5 cursor-pointer transform active:scale-95 transition"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Pantalla Completa [OK]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Promotional Banner / Featured Content Card */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl flex flex-col justify-end p-5 sm:p-6 bg-zinc-950 group">
          {/* Background Poster with smooth transition */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105 group-hover:scale-110"
            style={{
              backgroundImage: `url(${activeBanner.imageUrl})`,
            }}
          />
          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08090d]/80 via-transparent to-transparent" />

          {/* Banner Indicator Dots */}
          {banners.length > 1 && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
              {banners.map((b, i) => (
                <button
                  key={b.id || i}
                  onClick={() => setCurrentBannerIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    i === currentBannerIndex
                      ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                      : 'bg-white/30 hover:bg-white/60'
                  }`}
                  title={b.title}
                />
              ))}
            </div>
          )}

          {/* Content details */}
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider text-black shadow-sm"
                style={{ backgroundColor: activeBanner.tagColor || '#06b6d4' }}
              >
                {activeBanner.badge}
              </span>
              <span className="text-xs text-zinc-300 font-medium">Recomendado del Servidor</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
              {activeBanner.title}
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 drop-shadow leading-relaxed">
              {activeBanner.subtitle}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => onNavigate(activeBanner.actionSection as ActiveSection || 'live')}
                className="tv-focusable px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-2 cursor-pointer transition transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Explorar Sección</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>

              <button
                onClick={() => onNavigate('movies')}
                className="tv-focusable px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/70 text-xs sm:text-sm font-semibold text-zinc-200 rounded-xl cursor-pointer transition"
              >
                Ver Catálogo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MENÚ INFERIOR: Los 5 Botones Grandes y Coloridos
          1. VIVO
          2. SERIES
          3. PELÍCULAS
          4. ANIME
          5. ESPECIAL
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-400">
              Menú Principal de Navegación
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
            Presiona OK o pulsa para ingresar
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. VIVO */}
          <button
            onClick={() => onNavigate('live')}
            className="tv-focusable group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-cyan-950/40 via-zinc-900/70 to-[#0c141d] border-2 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:shadow-[0_0_35px_rgba(6,182,212,0.4)] transition-all duration-300 text-left overflow-hidden cursor-pointer"
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-500/35 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-inner group-hover:scale-110 transition-transform">
                <Tv className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                EN DIRECTO
              </span>
            </div>

            <div className="mt-5 relative z-10">
              <div className="text-lg sm:text-xl font-black text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                1. VIVO
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                Deportes, Noticias y Canales
              </p>
              <div className="mt-2 text-[11px] font-mono font-semibold text-cyan-400 flex items-center gap-1">
                <span>Acceder a Canales</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* 2. SERIES */}
          <button
            onClick={() => onNavigate('series')}
            className="tv-focusable group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 via-zinc-900/70 to-[#140f1f] border-2 border-purple-500/40 hover:border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.15)] hover:shadow-[0_0_35px_rgba(168,85,247,0.4)] transition-all duration-300 text-left overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/35 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 shadow-inner group-hover:scale-110 transition-transform">
                <Clapperboard className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                TEMPORADAS
              </span>
            </div>

            <div className="mt-5 relative z-10">
              <div className="text-lg sm:text-xl font-black text-white tracking-wide group-hover:text-purple-300 transition-colors">
                2. SERIES
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                Capítulos y Series Completas
              </p>
              <div className="mt-2 text-[11px] font-mono font-semibold text-purple-400 flex items-center gap-1">
                <span>Ver Series</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* 3. PELÍCULAS */}
          <button
            onClick={() => onNavigate('movies')}
            className="tv-focusable group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-950/40 via-zinc-900/70 to-[#181309] border-2 border-amber-500/40 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:shadow-[0_0_35px_rgba(245,158,11,0.4)] transition-all duration-300 text-left overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/35 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner group-hover:scale-110 transition-transform">
                <Film className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                VOD 4K
              </span>
            </div>

            <div className="mt-5 relative z-10">
              <div className="text-lg sm:text-xl font-black text-white tracking-wide group-hover:text-amber-300 transition-colors">
                3. PELÍCULAS
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                Estrenos, Acción y Clásicos
              </p>
              <div className="mt-2 text-[11px] font-mono font-semibold text-amber-400 flex items-center gap-1">
                <span>Explorar VOD</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* 4. ANIME */}
          <button
            onClick={() => onNavigate('anime')}
            className="tv-focusable group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 via-zinc-900/70 to-[#0a1811] border-2 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all duration-300 text-left overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/35 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                24/7 DUAL
              </span>
            </div>

            <div className="mt-5 relative z-10">
              <div className="text-lg sm:text-xl font-black text-white tracking-wide group-hover:text-emerald-300 transition-colors">
                4. ANIME
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                En Emisión y Películas
              </p>
              <div className="mt-2 text-[11px] font-mono font-semibold text-emerald-400 flex items-center gap-1">
                <span>Ver Anime</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* 5. ESPECIAL */}
          <button
            onClick={() => onNavigate('especial')}
            className="tv-focusable col-span-2 sm:col-span-1 group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-rose-950/40 via-zinc-900/70 to-[#190a0f] border-2 border-rose-500/40 hover:border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.15)] hover:shadow-[0_0_35px_rgba(244,63,94,0.4)] transition-all duration-300 text-left overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/35 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-inner group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                PPV & 24/7
              </span>
            </div>

            <div className="mt-5 relative z-10">
              <div className="text-lg sm:text-xl font-black text-white tracking-wide group-hover:text-rose-300 transition-colors">
                5. ESPECIAL
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                Eventos Exclusivos & 24/7
              </p>
              <div className="mt-2 text-[11px] font-mono font-semibold text-rose-400 flex items-center gap-1">
                <span>Acceso Especial</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
