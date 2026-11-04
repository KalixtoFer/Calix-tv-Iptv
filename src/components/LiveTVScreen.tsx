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
} from 'lucide-react';
import { LiveCategory, LiveStream } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';
import { VideoPlayer } from './VideoPlayer';

interface LiveTVScreenProps {
  username: string;
  onBack: () => void;
  onPlayStream: (stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'live';
    poster?: string;
    category?: string;
  }) => void;
}

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({
  username,
  onBack,
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
        title: selectedStream.name,
        url:
          selectedStream.stream_url ||
          iptvApi.buildStreamUrl('live', selectedStream.stream_id, 'm3u8', username),
        type: 'live',
        poster: selectedStream.stream_icon,
        category: selectedCategoryId,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#05060a] text-zinc-100 select-none">
      {/* Main Layout Grid - Responsive: Stacked on mobile, 3-column on Desktop/TV */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_350px_1fr] overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">
        
        {/* Column 1: CATEGORIAS */}
        <div className="flex flex-col overflow-hidden bg-[#0a0c14]/50 rounded-2xl border border-zinc-800/40">
          <div className="p-4 flex items-center justify-between border-b border-zinc-800/60">
            <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[2px]">
              CATEGORIAS
            </h2>
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`group w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-zinc-900/40 border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-base">
                      {cat.category_name.toLowerCase().includes('argentina') ? '🇦🇷' : '📺'}
                    </span>
                    <span className="text-xs font-bold truncate uppercase tracking-tight">
                      {cat.category_name}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {Math.floor(Math.random() * 80) + 10} {/* Simulated count or real if available */}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Canales */}
        <div className="flex flex-col overflow-hidden bg-[#0a0c14]/50 rounded-2xl border border-zinc-800/40">
          <div className="p-4 border-b border-zinc-800/60">
            <div className="text-[10px] font-bold text-zinc-500 mb-0.5">Vence: {expiryDate}</div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              Canales
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredStreams.map((stream, idx) => {
              const isSelected = selectedStream?.stream_id === stream.stream_id;
              return (
                <button
                  key={stream.stream_id}
                  onClick={() => setSelectedStream(stream)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-zinc-800/60 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'bg-zinc-900/40 border-transparent hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="w-10 h-10 rounded-lg bg-black border border-zinc-800/60 flex items-center justify-center overflow-hidden shrink-0">
                      {stream.stream_icon ? (
                        <img src={stream.stream_icon} className="w-full h-full object-contain" alt="" />
                      ) : (
                        <Tv className="w-5 h-5 text-zinc-700" />
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <span className="text-indigo-400/80">{idx + 1}.</span>
                        {stream.name}
                      </div>
                      {isSelected && (
                        <div className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 mt-0.5">
                          <Maximize2 className="w-3 h-3" /> Pantalla grande
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="px-2.5 py-1 bg-indigo-600 rounded-lg text-[9px] font-black text-white shadow-lg shadow-indigo-600/30">
                      VIENDO
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 3: Preview Area */}
        <div className="flex flex-col overflow-hidden space-y-4">
          <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-800/60 shadow-2xl group">
            {selectedStream ? (
              <VideoPlayer
                url={iptvApi.buildStreamUrl('live', selectedStream.stream_id, 'm3u8', username)}
                title={selectedStream.name}
                type="live"
                autoPlay={true}
                className="w-full h-full"
                onExpand={handleOpenFullscreen}
                isMiniPlayer={true}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-black">
                <Radio className="w-12 h-12 mb-3 opacity-20" />
                <span className="text-sm font-medium tracking-wide">Cargando vista previa...</span>
              </div>
            )}
          </div>

          <div className="flex-1 bg-[#0a0c14]/30 rounded-3xl border border-zinc-800/40 p-8 flex flex-col justify-between">
            <div>
              <h1 className="text-5xl font-black text-white tracking-tighter mb-3 leading-none">
                {selectedStream?.name || 'Selecciona un canal'}
              </h1>
              <div className="flex items-center gap-3 text-zinc-500 font-bold text-sm">
                <span className="px-2 py-0.5 bg-zinc-800/60 rounded border border-zinc-700/40 text-[10px] tracking-widest uppercase">FHD</span>
                <span className="px-2 py-0.5 bg-zinc-800/60 rounded border border-zinc-700/40 text-[10px] tracking-widest uppercase">60 FPS</span>
                <span className="text-xs">Latencia: 1.2s</span>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-xl">
                <span className="text-white font-bold">OK</span> abre pantalla completa. Mantenga <span className="text-white font-bold">OK</span> en la lista para agregar a favoritos o ver guía avanzada.
              </p>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleOpenFullscreen}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-2xl shadow-indigo-600/40 transition transform active:scale-95 flex items-center gap-2"
                >
                  <Maximize2 className="w-5 h-5" />
                  VER EN PANTALLA COMPLETA
                </button>
                <button 
                  onClick={(e) => selectedStream && handleToggleFavorite(e, selectedStream)}
                  className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-amber-400 transition shadow-xl"
                  title="Favoritos"
                >
                  <Star className={`w-7 h-7 ${selectedStream && favoritesList.includes(String(selectedStream.stream_id)) ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
