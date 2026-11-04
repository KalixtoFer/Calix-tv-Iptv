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
  const [displayLimit, setDisplayLimit] = useState<number>(50);

  // Load categories and initial streams for first category
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
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
    setDisplayLimit(50);
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
        stream.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (stream.current_program && stream.current_program.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategoryId === 'all' || String(stream.category_id) === String(selectedCategoryId);

      const matchesFav = !showOnlyFavorites || favoritesList.includes(String(stream.stream_id));

      return matchesSearch && matchesCategory && matchesFav;
    });
  }, [streams, searchQuery, selectedCategoryId, showOnlyFavorites, favoritesList]);

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

  // Zapping
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
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#08090d] text-zinc-100 select-none">
      {/* Sub-header Navigation & Search */}
      <div className="px-4 py-2.5 bg-zinc-950/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="tv-focusable p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Tv className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              1. Televisión En Vivo
            </h2>
            <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              {filteredStreams.length} Canales
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar canal o programa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <button
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            className={`tv-focusable px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showOnlyFavorites
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Favoritos</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Categories, Center Channels, Right Live Preview */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Column 1: Categories Sidebar (2.5 cols) */}
        <div className="md:col-span-3 lg:col-span-2 bg-[#090b10] border-r border-zinc-800/80 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" /> Categorías
            </span>
            <span className="text-[11px] font-mono text-zinc-400">{categories.length + 1}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`tv-focusable w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
              }`}
            >
              <span>TODOS LOS CANALES</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedCategoryId === 'all' ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                {streams.length}
              </span>
            </button>

            <button
              onClick={() => handleSelectCategory('all')}
              className={`tv-focusable w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer truncate ${
                selectedCategoryId === 'all'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
              }`}
            >
              <span>⭐ TODOS LOS CANALES</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`tv-focusable w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer truncate ${
                    isSelected
                      ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <span className="truncate">{cat.category_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Channels List / Grid (4.5 cols) */}
        <div className="md:col-span-4 lg:col-span-5 bg-[#0b0d14] border-r border-zinc-800/80 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold">Listado de Señales</span>
            <span className="font-mono text-cyan-400">{filteredStreams.length} encontradas</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-xs">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
                Cargando guía de canales...
              </div>
            ) : filteredStreams.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No se encontraron canales en esta categoría.
              </div>
            ) : (
              filteredStreams.map((stream, idx) => {
                const isSelected = selectedStream?.stream_id === stream.stream_id;
                const isFav = favoritesList.includes(String(stream.stream_id));

                return (
                  <div
                    key={stream.stream_id || idx}
                    onClick={() => setSelectedStream(stream)}
                    className={`tv-focusable group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      {/* Channel Number */}
                      <span className="w-7 text-right font-mono text-xs font-bold text-zinc-400 group-hover:text-cyan-400">
                        {stream.num || idx + 1}
                      </span>

                      {/* Channel Icon */}
                      <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                        {stream.stream_icon ? (
                          <img
                            src={stream.stream_icon}
                            alt={stream.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Tv className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>

                      {/* Channel Name & Current EPG Show */}
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold truncate group-hover:text-white">
                            {stream.name}
                          </h4>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{stream.current_program || 'Programación en vivo 24/7'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions: Favorite */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={(e) => handleToggleFavorite(e, stream)}
                        className="tv-focusable p-1.5 text-zinc-400 hover:text-amber-400 transition cursor-pointer"
                        title="Favorito"
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Live Preview & EPG Info (5 cols) */}
        <div className="md:col-span-5 lg:col-span-5 bg-[#07080c] flex flex-col overflow-hidden">
          {selectedStream ? (
            <div className="flex-1 flex flex-col justify-between p-4 space-y-4 overflow-y-auto">
              {/* Active Player Box */}
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative">
                <VideoPlayer
                  url={
                    selectedStream.stream_url ||
                    iptvApi.buildStreamUrl('live', selectedStream.stream_id, 'm3u8', username)
                  }
                  title={selectedStream.name}
                  subtitle={selectedStream.current_program}
                  poster={selectedStream.stream_icon}
                  type="live"
                  autoPlay={true}
                  onNextChannel={handleNextChannel}
                  onPrevChannel={handlePrevChannel}
                  className="w-full h-full"
                  onExpand={handleOpenFullscreen}
                />
              </div>

              {/* Channel Meta & Quick Actions */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 bg-rose-950 border border-rose-800 text-rose-300 font-mono text-[10px] font-bold rounded">
                      SEÑAL EN DIRECTO
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1">
                      {selectedStream.name}
                    </h3>
                  </div>

                  <button
                    onClick={handleOpenFullscreen}
                    className="tv-focusable px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 cursor-pointer transition transform active:scale-95"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Pantalla Completa [OK]</span>
                  </button>
                </div>

                {/* EPG Timeline Card */}
                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Guía Electrónica (EPG)
                  </div>

                  <div className="border-l-2 border-cyan-500 pl-2.5 py-0.5">
                    <div className="text-xs font-bold text-white">
                      Ahora: {selectedStream.current_program || 'Emisión Continua en Calidad HD'}
                    </div>
                    <div className="w-full bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-cyan-400 h-full w-2/3 rounded-full" />
                    </div>
                  </div>

                  <div className="border-l-2 border-zinc-700 pl-2.5 py-0.5">
                    <div className="text-xs font-medium text-zinc-400">
                      Siguiente: {selectedStream.next_program || 'Espacio Publicitario / Noticiero Central'}
                    </div>
                  </div>
                </div>

                {/* Zapping navigation buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handlePrevChannel}
                    className="tv-focusable py-2 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-bold text-zinc-200 rounded-xl flex items-center justify-center gap-1 border border-zinc-700/60 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Canal Anterior (CH-)
                  </button>
                  <button
                    onClick={handleNextChannel}
                    className="tv-focusable py-2 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-bold text-zinc-200 rounded-xl flex items-center justify-center gap-1 border border-zinc-700/60 cursor-pointer"
                  >
                    Canal Siguiente (CH+) <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <Tv className="w-16 h-16 text-zinc-700 mb-3" />
              <p className="text-sm font-semibold">Selecciona un canal para sintonizar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
