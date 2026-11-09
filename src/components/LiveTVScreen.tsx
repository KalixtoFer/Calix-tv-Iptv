import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Star,
  Tv,
  Radio,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Clock,
  Sparkles,
  ArrowLeft,
  Filter,
  Home,
  Play as PlayIcon,
  Users,
  User as UserIcon,
  Heart,
  Trophy,
  Film,
  Clapperboard,
  Settings,
  LogOut,
} from 'lucide-react';
import { ActiveSection, DeviceViewMode, LiveCategory, LiveStream } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';
import { VideoPlayer } from './VideoPlayer';

interface LiveTVScreenProps {
  username: string;
  viewMode: DeviceViewMode;
  onBack: () => void;
  onNavigate?: (section: ActiveSection) => void;
  onOpenSettings?: () => void;
  onPlayStream: (stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'live';
    poster?: string;
    category?: string;
    channels?: LiveStream[];
    initialChannelIndex?: number;
  }) => void;
}

const adjustTime = (text: string | undefined): string => {
  if (!text) return '';
  
  // 1. Match HH:MM, HH.MM, or HHhMM (e.g. 18:30, 18.30, 18h30, 08:15)
  let result = text.replace(/\b([0-1]?\d|2[0-3])[:.hH]([0-5]\d)\b/g, (match, hh, mm) => {
    let h = parseInt(hh, 10);
    h = (h + 2) % 24;
    const sep = match.includes(':') ? ':' : match.includes('.') ? '.' : 'h';
    return `${h.toString().padStart(2, '0')}${sep}${mm}`;
  });

  // 2. Match isolated hours followed by hs / hrs / h (e.g. 18hs, 18 hs, 18hrs)
  result = result.replace(/\b([0-1]?\d|2[0-3])\s*(hs|hrs|h)\b/gi, (match, hh, unit) => {
    let h = parseInt(hh, 10);
    h = (h + 2) % 24;
    return `${h.toString().padStart(2, '0')} ${unit}`;
  });

  return result;
};

const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('deporte') || name.includes('sport') || name.includes('futbol') || name.includes('fútbol')) return '⚽';
  if (name.includes('noticia') || name.includes('news')) return '📰';
  if (name.includes('cine') || name.includes('pelicula') || name.includes('película') || name.includes('movie') || name.includes('hbo')) return '🎬';
  if (name.includes('infantil') || name.includes('kid') || name.includes('dibujo') || name.includes('animac') || name.includes('disney')) return '🧸';
  if (name.includes('musica') || name.includes('música') || name.includes('music')) return '🎵';
  if (name.includes('documental') || name.includes('docu') || name.includes('cultura')) return '🌍';
  if (name.includes('serie')) return '📺';
  if (name.includes('variedad') || name.includes('entretenimiento')) return '✨';
  if (name.includes('premium') || name.includes('vip')) return '👑';
  return '📁';
};

interface ChannelRowProps {
  stream: LiveStream;
  index: number;
  isPlaying: boolean;
  isFavorite: boolean;
  onSelect: (stream: LiveStream) => void;
  onToggleFavorite: (e: React.MouseEvent, stream: LiveStream) => void;
}

const ChannelRow = React.memo<ChannelRowProps>(({
  stream,
  index,
  isPlaying,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  const [imgError, setImgError] = useState(false);
  const title = adjustTime(stream.name);
  const epgRaw = stream.current_program;
  const epgProgram = adjustTime(epgRaw);
  const hasEpg = Boolean(
    epgProgram &&
    epgProgram.trim() !== '' &&
    !epgProgram.toLowerCase().includes('no información') &&
    !epgProgram.toLowerCase().includes('sin información')
  );

  return (
    <div
      onClick={() => onSelect(stream)}
      className={`channel-row flex items-center gap-3 p-2.5 mb-2.5 rounded-2xl bg-[#08101d]/90 border transition-all cursor-pointer select-none ${
        isPlaying
          ? 'playing border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] bg-cyan-950/30'
          : 'border-cyan-500/20 hover:border-cyan-500/50 hover:bg-[#0d1728]'
      }`}
    >
      {/* Red rounded logo container matching reference design */}
      <div className="w-14 h-11 shrink-0 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 border border-red-400/40 shadow-md flex items-center justify-center p-1 overflow-hidden">
        {stream.stream_icon && !imgError ? (
          <img
            src={stream.stream_icon}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          <Tv className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Channel info */}
      <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
        <div className="text-sm font-extrabold text-white truncate leading-snug tracking-tight">
          {index + 1}. {title}
        </div>
        <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
          {hasEpg ? epgProgram : 'No información'}
        </div>
      </div>

      {/* Vertical divider line */}
      <div className="w-[1px] h-7 bg-zinc-800/80 my-auto shrink-0" />

      {/* Favorite Heart button */}
      <button
        type="button"
        onClick={(e) => onToggleFavorite(e, stream)}
        className="shrink-0 p-1.5 text-zinc-400 hover:text-white active:scale-125 transition-transform"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            isFavorite ? 'fill-rose-500 text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        />
      </button>

      {/* Cyan Circular Play Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(stream);
        }}
        className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(6,182,212,0.6)] shrink-0 active:scale-90 transition-transform"
        aria-label="Reproducir canal"
      >
        <PlayIcon className="w-4 h-4 fill-white translate-x-0.5" />
      </button>
    </div>
  );
});

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({
  username,
  viewMode,
  onBack,
  onNavigate,
  onOpenSettings,
  onPlayStream,
}) => {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [expiryDate, setExpiryDate] = useState<string>('Ilimitado');
  const [previewStream, setPreviewStream] = useState<LiveStream | null>(null);
  const [debouncedStream, setDebouncedStream] = useState<LiveStream | null>(null);

  const chipsRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() =>
    new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(
        new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectCategoryChip = async (catId: string) => {
    if (catId === 'favorites') {
      setShowOnlyFavorites(true);
      chipsRefs.current['favorites']?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      try {
        const allStreams = await iptvApi.getStreams('live', username, 'all');
        if (allStreams && allStreams.length > 0) {
          setStreams(allStreams);
          const firstFav = allStreams.find((s) => favoritesList.includes(String(s.stream_id)));
          if (firstFav && (!selectedStream || !favoritesList.includes(String(selectedStream.stream_id)))) {
            setSelectedStream(firstFav);
          }
        }
      } catch (err) {
        console.error('Error loading streams for favorites:', err);
      }
      return;
    }
    setShowOnlyFavorites(false);
    handleSelectCategory(catId);
    chipsRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // Debounce preview updates to avoid spamming the server
  useEffect(() => {
    if (viewMode === 'mobile') return;
    const timer = setTimeout(() => {
      setDebouncedStream(previewStream);
    }, 550);
    return () => clearTimeout(timer);
  }, [previewStream, viewMode]);

  const handleChannelFocus = (stream: LiveStream) => {
    setPreviewStream(stream);
  };

  // Load categories and initial streams for first category
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const savedSession = iptvApi.getSavedSession();
        if (savedSession?.authResponse.user_info.exp_date) {
          const date = new Date(parseInt(savedSession.authResponse.user_info.exp_date, 10) * 1000);
          setExpiryDate(date.toLocaleDateString('es-ES'));
        }

        const cats = await iptvApi.getCategories('live', username);
        if (!isMounted) return;
        setCategories(cats);

        const initialCat = cats.length > 0 ? cats[0].category_id : 'all';
        setSelectedCategoryId(initialCat);

        const strList = await iptvApi.getStreams('live', username, initialCat);
        if (isMounted) {
          setStreams(strList);
          if (strList.length > 0) {
            setSelectedStream(strList[0]);
          }
        }
      } catch (err) {
        console.error('Error loading Live TV:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    // Load favorites
    const favs = iptvApi.getFavorites().filter((f) => f.type === 'live');
    setFavoritesList(favs.map((f) => String(f.id)));

    loadData();
    return () => {
      isMounted = false;
    };
  }, [username]);

  const handleSelectCategory = async (catId: string) => {
    if (catId === selectedCategoryId && !searchQuery) return;
    setSelectedCategoryId(catId);
    setIsLoading(true);
    try {
      const list = await iptvApi.getStreams('live', username, catId);
      setStreams(list);
      if (list.length > 0) {
        setSelectedStream(list[0]);
      }
    } catch (err) {
      console.error('Error switching TV category:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered streams
  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => {
      const matchesSearch =
        !searchQuery ||
        stream.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFav = !showOnlyFavorites || favoritesList.includes(String(stream.stream_id));

      return matchesSearch && matchesFav;
    });
  }, [streams, searchQuery, showOnlyFavorites, favoritesList]);

  // Toggle favorite
  const handleToggleFavorite = (e: React.MouseEvent, stream: LiveStream) => {
    e.stopPropagation();
    iptvApi.toggleFavorite({
      id: stream.stream_id,
      type: 'live',
      name: stream.name,
      icon: stream.stream_icon,
    });
    setFavoritesList((prev) =>
      prev.includes(String(stream.stream_id))
        ? prev.filter((id) => id !== String(stream.stream_id))
        : [...prev, String(stream.stream_id)]
    );
  };

  const handleNextChannel = () => {
    if (!selectedStream || filteredStreams.length === 0) return;
    const currentIndex = filteredStreams.findIndex((s) => s.stream_id === selectedStream.stream_id);
    const nextIndex = (currentIndex + 1) % filteredStreams.length;
    setSelectedStream(filteredStreams[nextIndex]);
  };

  const handlePrevChannel = () => {
    if (!selectedStream || filteredStreams.length === 0) return;
    const currentIndex = filteredStreams.findIndex((s) => s.stream_id === selectedStream.stream_id);
    const prevIndex = (currentIndex - 1 + filteredStreams.length) % filteredStreams.length;
    setSelectedStream(filteredStreams[prevIndex]);
  };

  const handleOpenFullscreen = () => {
    if (selectedStream) {
      onPlayStream({
        streamId: selectedStream.stream_id,
        title: adjustTime(selectedStream.name),
        url:
          selectedStream.stream_url ||
          iptvApi.buildStreamUrl('live', selectedStream.stream_id, 'm3u8', username),
        type: 'live',
        poster: selectedStream.stream_icon,
        category: selectedCategoryId,
        channels: filteredStreams,
        initialChannelIndex: filteredStreams.findIndex((s) => s.stream_id === selectedStream.stream_id),
      });
    }
  };

  if (viewMode === 'mobile') {
    return (
      <div className="live-screen mobile-mode">
        {/* 1) CABECERA COMPACTA (Matching reference image /public/assets/aistudio/image_9df75803.png) */}
        <header className="app-header px-3 py-2 bg-[#040812] border-b border-cyan-500/20 flex items-center justify-between shadow-lg">
          {/* Logo & Username */}
          <div className="flex items-center gap-2">
            <div className="h-10 px-2 rounded-xl bg-[#071224] border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] flex items-center justify-center">
              <img
                src="/logo.png"
                alt="CALIX TV"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <span className="text-[10px] font-extrabold bg-cyan-950/80 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-600/40">
                  1.0
                </span>
              </div>
              <span className="text-[11px] font-bold text-zinc-300 font-mono tracking-tight">
                @{username || 'DEMO0091'}
              </span>
            </div>
          </div>

          {/* Clock Pill Badge */}
          <div className="px-3 py-1 rounded-full bg-[#081528] border border-cyan-500/40 flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.35)]">
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
              <Clock className="w-3 h-3 text-cyan-300" />
            </div>
            <span className="text-xs font-mono font-extrabold text-cyan-300 tracking-wider">
              {currentTimeStr}
            </span>
          </div>

          {/* Right Action Icons: Signal, Settings, Logout */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="p-2 rounded-xl bg-[#091528] border border-cyan-500/40 text-cyan-400 hover:text-white active:scale-95 transition-transform"
              title="Señal digital"
            >
              <Radio className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-[#091528] border border-cyan-500/40 text-cyan-300 hover:text-white active:scale-95 transition-transform cursor-pointer"
              title="Ajustes"
            >
              <Settings className="w-4 h-4 text-cyan-300" />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-rose-950/90 border border-rose-700/80 text-rose-400 hover:text-rose-200 active:scale-95 transition-transform cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.3)]"
              title="Salir"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </header>

        {/* 2) REPRODUCTOR FIJO (STICKY 16:9) */}
        <div className="player-box">
          {selectedStream ? (
            <>
              <VideoPlayer
                url={iptvApi.buildStreamUrl('live', selectedStream.stream_id, 'm3u8', username)}
                title={adjustTime(selectedStream.name)}
                type="live"
                autoPlay={true}
                className="w-full h-full"
                onExpand={handleOpenFullscreen}
                onNextChannel={handleNextChannel}
                onPrevChannel={handlePrevChannel}
                isMiniPlayer={false}
              />
              <button
                type="button"
                onClick={handleOpenFullscreen}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md z-20 border border-white/15 active:scale-95 transition-all"
                title="Pantalla completa"
                aria-label="Pantalla completa"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#070913] text-zinc-400 gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <span className="text-xs font-bold tracking-widest uppercase text-cyan-300/80 animate-pulse">
                Conectando señal...
              </span>
            </div>
          )}
        </div>

        {/* 3) FILA HORIZONTAL DE CARPETAS (CHIPS) */}
        <div className="chips custom-scrollbar">
          <button
            type="button"
            ref={(el) => {
              chipsRefs.current['favorites'] = el;
            }}
            onClick={() => handleSelectCategoryChip('favorites')}
            className={`chip ${showOnlyFavorites ? 'active' : ''}`}
          >
            <span>⭐</span>
            <span>Favoritos</span>
            {favoritesList.length > 0 && (
              <span className="text-[11px] opacity-75 font-mono">({favoritesList.length})</span>
            )}
          </button>

          {categories.map((cat) => {
            const isCatActive = !showOnlyFavorites && selectedCategoryId === cat.category_id;
            return (
              <button
                key={cat.category_id}
                type="button"
                ref={(el) => {
                  chipsRefs.current[cat.category_id] = el;
                }}
                onClick={() => handleSelectCategoryChip(cat.category_id)}
                className={`chip ${isCatActive ? 'active' : ''}`}
              >
                <span>{getCategoryIcon(cat.category_name)}</span>
                <span>{cat.managedName || cat.category_name}</span>
              </button>
            );
          })}
        </div>

        {/* 4) LISTA DE CANALES */}
        <div className="channel-list custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-medium">Cargando canales...</span>
            </div>
          ) : filteredStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-sm gap-2">
              <span>{showOnlyFavorites ? 'No tienes canales favoritos aún' : 'No se encontraron canales'}</span>
            </div>
          ) : (
            filteredStreams.map((stream, idx) => (
              <ChannelRow
                key={stream.stream_id}
                stream={stream}
                index={idx}
                isPlaying={selectedStream?.stream_id === stream.stream_id}
                isFavorite={favoritesList.includes(String(stream.stream_id))}
                onSelect={setSelectedStream}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          )}
        </div>

        {/* 5) BARRA DE NAVEGACIÓN INFERIOR FIJA */}
        <nav className="bottom-nav">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate('home');
              else onBack();
            }}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Inicio</span>
          </button>

          <button
            type="button"
            className="active"
          >
            <Tv className="w-5 h-5 mb-0.5" />
            <span>TV en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('events')}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span>Eventos</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('movies')}
          >
            <Film className="w-5 h-5 mb-0.5" />
            <span>Películas</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('series')}
          >
            <Clapperboard className="w-5 h-5 mb-0.5" />
            <span>Series</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings?.()}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span>Ajustes</span>
          </button>
        </nav>
      </div>
    );
  }

  // ANDROID TV & PC / WEB VIEW (Diseño cinematográfico 3-columnas)
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#05060a] text-zinc-100 select-none">
      {/* 3-Column Grid Layout */}
      <div className="flex-1 grid grid-cols-[22%_34%_1fr] overflow-hidden p-3 gap-3">
        
        {/* COL 1: CATEGORÍAS (~22%) */}
        <div data-focus-zone="categories" className="flex flex-col overflow-hidden bg-[#0c0e18]/90 rounded-2xl border border-zinc-800/50 shadow-2xl">
          <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
            <h2 className="text-[10px] font-black text-cyan-400 uppercase tracking-[3px]">Categorías</h2>
            <span className="text-[10px] text-zinc-500 font-mono font-bold bg-zinc-900 px-1.5 py-0.5 rounded">
              {categories.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {categories.map((cat, catIdx) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  tabIndex={0}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' && catIdx === 0) {
                      e.preventDefault();
                      const topBtn = document.querySelector<HTMLElement>('.top-nav-btn');
                      topBtn?.focus();
                    }
                  }}
                  className={`tv-focusable group w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center justify-between border outline-none cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                      : 'bg-zinc-900/30 border-transparent text-zinc-500 hover:text-zinc-300'
                  } focus:ring-2 focus:ring-cyan-500 focus:bg-cyan-500/20`}
                >
                  <span className="text-[11px] font-black truncate uppercase tracking-tight">
                    {cat.managedName || cat.category_name}
                  </span>
                  {cat.isPinned && <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* COL 2: LISTA DE CANALES (~34%) */}
        <div data-focus-zone="channels" className="flex flex-col overflow-hidden bg-[#0c0e18]/90 rounded-2xl border border-zinc-800/50 shadow-2xl">
          <div className="px-4 py-3 border-b border-zinc-800/40 flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black text-white uppercase tracking-[2px]">Canales</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">En Vivo</span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">
              {filteredStreams.length} señales • Expira: {expiryDate}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-30">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-widest">Sincronizando...</span>
              </div>
            ) : filteredStreams.length === 0 ? (
              <div className="text-center py-20 text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">Vacío</div>
            ) : filteredStreams.map((stream, idx) => {
              const isSelected = selectedStream?.stream_id === stream.stream_id;
              const isBeingPreviewed = debouncedStream?.stream_id === stream.stream_id;
              
              return (
                <button
                  key={stream.stream_id}
                  tabIndex={0}
                  onFocus={() => handleChannelFocus(stream)}
                  onMouseEnter={() => handleChannelFocus(stream)}
                  onClick={() => {
                     setSelectedStream(stream);
                     if (isSelected) handleOpenFullscreen();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' && idx === 0) {
                      e.preventDefault();
                      const topBtn = document.querySelector<HTMLElement>('.top-nav-btn');
                      topBtn?.focus();
                    }
                  }}
                  className={`tv-focusable w-full text-left p-2 rounded-xl transition-all flex items-center gap-3 border outline-none cursor-pointer group ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40'
                      : 'bg-transparent border-transparent text-zinc-400'
                  } focus:ring-2 focus:ring-cyan-500 focus:bg-cyan-500/20`}
                >
                  <span className="text-[10px] font-mono font-bold text-zinc-600 w-6 text-right shrink-0">
                    {idx + 1}
                  </span>

                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 border border-zinc-800 shadow-lg">
                    {stream.stream_icon ? (
                      <img src={stream.stream_icon} className="w-full h-full object-contain p-1" alt="" />
                    ) : (
                      <Tv className="w-5 h-5 text-zinc-300" />
                    )}
                  </div>

                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-2">
                       <h4 className={`text-xs font-black truncate uppercase tracking-tight ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                         {adjustTime(stream.name)}
                       </h4>
                       {isBeingPreviewed && (
                          <span className="text-[8px] font-black bg-cyan-500 text-black px-1 rounded-sm animate-pulse shrink-0">VIENDO</span>
                       )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold truncate">
                      {stream.current_program ? adjustTime(stream.current_program) : 'En emisión en vivo'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COL 3: VISTA PREVIA (~44%) */}
        <div className="flex flex-col overflow-hidden gap-3 h-full">
          {/* Player Container */}
          <div className="flex-1 relative bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col group min-h-0">
            {debouncedStream ? (
              <VideoPlayer
                key={debouncedStream.stream_id}
                url={
                  debouncedStream.stream_url ||
                  iptvApi.buildStreamUrl('live', debouncedStream.stream_id, 'm3u8', username)
                }
                title={adjustTime(debouncedStream.name)}
                type="live"
                autoPlay={true}
                className="w-full h-full"
                onExpand={handleOpenFullscreen}
                isMiniPlayer={true}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-[#08090d]">
                <div className="relative">
                   <Radio className="w-16 h-16 mb-4 opacity-10" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500/80 rounded-full animate-spin" />
                   </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[4px] opacity-30 text-center px-10">
                   Sintonizando señal digital...
                </span>
              </div>
            )}
            
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
            <div className="absolute top-4 left-5 z-10 flex items-center gap-2">
               <div className="px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Vista Previa</span>
               </div>
            </div>
          </div>

          {/* Detailed Info Card */}
          <div className="shrink-0 bg-[#0c0e18]/95 rounded-2xl border border-zinc-800/50 p-4 sm:p-5 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/5 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="flex items-start justify-between gap-4">
              <div className="overflow-hidden flex-1">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate leading-none uppercase">
                  {adjustTime(previewStream?.name) || 'Calix TV Pro'}
                </h1>
                <div className="flex items-center gap-3 text-zinc-500 font-bold mt-2.5">
                  <span className="px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 text-[10px] tracking-wider text-zinc-400">4K / UHD SUPPORT</span>
                  <span className="px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 text-[10px] tracking-wider text-zinc-400">DUAL AUDIO</span>
                  <div className="flex items-center gap-2 text-[10px] text-cyan-400/80 bg-cyan-500/5 px-2 py-0.5 rounded-lg">
                    <Tv className="w-3 h-3" />
                    <span className="uppercase tracking-tighter">Categoría: {categories.find(c => c.category_id === selectedCategoryId)?.managedName || 'Canales'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button 
                onClick={handleOpenFullscreen}
                className="tv-focusable px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-black font-black text-[11px] rounded-xl shadow-xl shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-2.5 outline-none focus:ring-4 focus:ring-cyan-500/30"
              >
                <Maximize2 className="w-4 h-4 stroke-[3]" />
                <span className="uppercase tracking-widest">Abrir Pantalla Completa</span>
              </button>
              
              <button 
                onClick={(e) => previewStream && handleToggleFavorite(e, previewStream)}
                className={`tv-focusable p-3 rounded-xl transition-all shadow-lg outline-none focus:ring-4 focus:ring-white/10 ${
                  previewStream && favoritesList.includes(String(previewStream.stream_id))
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                }`}
                title="Favoritos"
              >
                <Star className={`w-5 h-5 ${previewStream && favoritesList.includes(String(previewStream.stream_id)) ? 'fill-amber-500' : ''}`} />
              </button>

              <div className="ml-auto text-right">
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Navegación TV</p>
                 <p className="text-[9px] text-zinc-600 font-medium mt-0.5">OK abre pantalla completa · Mantené OK para favoritos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
