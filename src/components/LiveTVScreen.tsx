import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { ActiveSection, DeviceViewMode, LiveCategory, LiveStream } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';
import { VideoPlayer } from './VideoPlayer';

interface LiveTVScreenProps {
  username: string;
  viewMode: DeviceViewMode;
  onBack: () => void;
  onNavigate?: (section: ActiveSection) => void;
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

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({
  username,
  viewMode,
  onBack,
  onNavigate,
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
      <div className="flex-1 flex flex-col h-full bg-[#05060a] text-white select-none overflow-hidden relative">
        {/* Top: Live Player - Sticky to ensure it never scrolls away */}
        <div className="w-full aspect-video bg-black shrink-0 sticky top-0 z-50 border-b border-zinc-900 shadow-2xl overflow-hidden">
          {selectedStream ? (
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
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-[#0a0c14] border-b border-zinc-800">
              <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-rose-600 animate-spin mb-3" />
              <span className="text-[10px] font-black uppercase tracking-[3px] animate-pulse">Sintonizando...</span>
            </div>
          )}
        </div>

        {/* Middle: Content with Categories and Channels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar (Narrow) */}
          <div className="w-[110px] bg-[#0c0d14] border-r border-zinc-900/50 overflow-y-auto custom-scrollbar flex flex-col py-1">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`w-full text-left px-3 py-4 flex flex-col gap-1 transition-all border-l-2 ${
                    isSelected ? 'border-rose-600 bg-rose-600/5 text-rose-500' : 'border-transparent text-zinc-500'
                  }`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-tighter leading-tight ${isSelected ? 'opacity-100' : 'opacity-80'} flex items-center gap-1`}>
                    • {cat.managedName || cat.category_name}
                    {cat.isPinned && <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />}
                  </span>
                  <span className="text-[9px] opacity-40 ml-2 font-bold">
                    {Math.floor(Math.random() * 100) + 10} canales
                  </span>
                </button>
              );
            })}
          </div>

          {/* Channels List */}
          <div className="flex-1 bg-black overflow-y-auto custom-scrollbar pb-20">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredStreams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-600 italic text-xs">
                No se encontraron canales
              </div>
            ) : (
              filteredStreams.map((stream, idx) => {
                const isSelected = selectedStream?.stream_id === stream.stream_id;
                const isFav = favoritesList.includes(String(stream.stream_id));
                return (
                  <div
                    key={stream.stream_id}
                    onClick={() => setSelectedStream(stream)}
                    className={`flex items-center p-3 border-b border-zinc-900/40 transition-colors active:bg-zinc-900/80 ${
                      isSelected ? 'bg-zinc-900/50' : ''
                    }`}
                  >
                    {/* Channel Logo */}
                    <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 mr-3.5 border border-zinc-800/30 shadow-sm">
                      {stream.stream_icon ? (
                        <img src={stream.stream_icon} className="w-full h-full object-contain p-1" alt="" />
                      ) : (
                        <Tv className="w-6 h-6 text-zinc-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5 overflow-hidden mb-0.5">
                        {isSelected && <PlayIcon className="w-3 h-3 text-rose-600 fill-rose-600 shrink-0" />}
                        <h4 className={`text-[13px] font-black tracking-tight truncate ${isSelected ? 'text-rose-500' : 'text-zinc-100'}`}>
                          {idx + 1}. {adjustTime(stream.name)}
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-bold truncate opacity-80">
                        {adjustTime(stream.current_program) || 'No información'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3.5 shrink-0">
                      <button 
                        onClick={(e) => handleToggleFavorite(e, stream)}
                        className="p-1"
                      >
                        <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-600 text-rose-600' : 'text-zinc-700'}`} />
                      </button>
                      <ChevronRight className="w-5 h-5 text-zinc-800" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ANDROID TV & PC / WEB VIEW (Diseño cinematográfico 3-columnas)
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#05060a] text-zinc-100 select-none">
      {/* 3-Column Grid Layout */}
      <div className="flex-1 grid grid-cols-[22%_34%_1fr] overflow-hidden p-3 gap-3">
        
        {/* COL 1: CATEGORÍAS (~22%) */}
        <div className="flex flex-col overflow-hidden bg-[#0c0e18]/90 rounded-2xl border border-zinc-800/50 shadow-2xl">
          <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
            <h2 className="text-[10px] font-black text-cyan-400 uppercase tracking-[3px]">Categorías</h2>
            <span className="text-[10px] text-zinc-500 font-mono font-bold bg-zinc-900 px-1.5 py-0.5 rounded">
              {categories.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => handleSelectCategory(cat.category_id)}
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
        <div className="flex flex-col overflow-hidden bg-[#0c0e18]/90 rounded-2xl border border-zinc-800/50 shadow-2xl">
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
                  onFocus={() => handleChannelFocus(stream)}
                  onMouseEnter={() => handleChannelFocus(stream)}
                  onClick={() => {
                     setSelectedStream(stream);
                     if (isSelected) handleOpenFullscreen();
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
