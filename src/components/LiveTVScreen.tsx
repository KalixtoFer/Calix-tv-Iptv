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
                  <span className={`text-[10px] font-black uppercase tracking-tighter leading-tight ${isSelected ? 'opacity-100' : 'opacity-80'}`}>
                    • {cat.category_name}
                  </span>
                  <span className="text-[9px] opacity-40 ml-2 font-bold">
                    {Math.floor(Math.random() * 100) + 10} canales
                  </span>
                </button>
              );
            })}
          </div>

          {/* Channels List */}
          <div className="flex-1 bg-black overflow-y-auto custom-scrollbar">
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
      {/* Main Layout Grid - 3 Columns */}
      <div className="flex-1 grid grid-cols-[300px_380px_1fr] overflow-hidden p-4 gap-4">
        
        {/* Column 1: CATEGORIAS */}
        <div className="flex flex-col overflow-hidden bg-[#0c0e18]/80 rounded-[32px] border border-zinc-800/40 shadow-2xl">
          <div className="p-6 pb-4">
            <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[3px] opacity-80">
              CATEGORIAS
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2 custom-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              const isArgentina = cat.category_name.toLowerCase().includes('argentina');
              const isDeportes = cat.category_name.toLowerCase().includes('deporte');
              const isInfantiles = cat.category_name.toLowerCase().includes('infantil');
              
              return (
                <button
                  key={cat.category_id}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`group w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                      : 'bg-zinc-900/30 border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xl shrink-0">
                      {isArgentina ? '🇦🇷' : isDeportes ? '⚽' : isInfantiles ? '🦖' : '📺'}
                    </span>
                    <span className="text-xs font-black truncate uppercase tracking-wider">
                      {cat.category_name}
                    </span>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-800/80 text-zinc-500'
                  }`}>
                    {Math.floor(Math.random() * 80) + 15}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Canales */}
        <div className="flex flex-col overflow-hidden bg-[#0c0e18]/80 rounded-[32px] border border-zinc-800/40 shadow-2xl">
          <div className="p-6 pb-4">
            <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-1 opacity-60">
              Vence: {expiryDate}
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Canales
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2.5 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Cargando señales...</span>
              </div>
            ) : filteredStreams.map((stream, idx) => {
              const isSelected = selectedStream?.stream_id === stream.stream_id;
              return (
                <button
                  key={stream.stream_id}
                  onClick={() => setSelectedStream(stream)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.2)]'
                      : 'bg-zinc-900/30 border-transparent hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-4 overflow-hidden flex-1">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-zinc-800/40 shadow-md">
                      {stream.stream_icon ? (
                        <img src={stream.stream_icon} className="w-full h-full object-contain p-1" alt="" />
                      ) : (
                        <Tv className="w-6 h-6 text-zinc-300" />
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[15px] font-black text-white truncate flex items-center gap-2">
                        <span className="text-zinc-500 font-mono text-sm">{idx + 1}.</span>
                        {adjustTime(stream.name)}
                      </div>
                      {isSelected && (
                        <div className="text-[10px] text-zinc-500 font-bold flex items-center gap-1.5 mt-1">
                          <Maximize2 className="w-3 h-3" /> [ ] Pantalla grande
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="px-3 py-1.5 bg-indigo-600 rounded-xl text-[10px] font-black text-white shadow-xl shadow-indigo-600/40 tracking-wider">
                      VIENDO
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 3: Preview & Details */}
        <div className="flex flex-col overflow-hidden gap-3 h-full">
          {/* Player Container - Enlarged to flex-1 to occupy maximum available height */}
          <div className="flex-1 relative bg-black rounded-[28px] overflow-hidden border border-zinc-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group min-h-0">
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
                isMiniPlayer={true}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-[#08090d]">
                <Radio className="w-16 h-16 mb-4 opacity-10 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[4px] opacity-40">Cargando vista previa...</span>
              </div>
            )}
          </div>

          {/* Info Card - Reduced to half size/height */}
          <div className="shrink-0 bg-[#0c0e18]/90 rounded-[24px] border border-zinc-800/40 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="overflow-hidden">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate leading-tight">
                  {adjustTime(selectedStream?.name) || 'Calix TV'}
                </h1>
                <div className="flex items-center gap-2.5 text-zinc-400 font-bold mt-1">
                  <span className="px-2.5 py-0.5 bg-zinc-800/80 rounded-md border border-zinc-700/50 text-[10px] tracking-[1px] text-zinc-200">4K UHD</span>
                  <span className="px-2.5 py-0.5 bg-zinc-800/80 rounded-md border border-zinc-700/50 text-[10px] tracking-[1px] text-zinc-200">60 FPS</span>
                  <div className="flex items-center gap-1.5 text-[11px] ml-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-zinc-400">Estable • 12ms</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-600/10 border-l-4 border-indigo-500 rounded-r-xl">
              <p className="text-zinc-300 text-xs sm:text-sm font-medium leading-normal">
                <span className="text-white font-black">OK</span> abre pantalla completa. Mantenga <span className="text-white font-black">OK</span> en la lista para agregar a favoritos o ver guía avanzada.
              </p>
            </div>
            
            <div className="flex items-center gap-3 pt-1">
              <button 
                onClick={handleOpenFullscreen}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                PANTALLA COMPLETA
              </button>
              <button 
                onClick={(e) => selectedStream && handleToggleFavorite(e, selectedStream)}
                className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-amber-400 transition-all shadow-md hover:border-amber-500/50 group cursor-pointer"
                title="Favoritos"
              >
                <Star className={`w-5 h-5 transition-transform group-hover:scale-110 ${selectedStream && favoritesList.includes(String(selectedStream.stream_id)) ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
              
              <button 
                onClick={onBack}
                className="px-5 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-black text-sm rounded-xl transition-all ml-auto cursor-pointer"
              >
                SALIR SECCIÓN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
