import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Search,
  Star,
  Play,
  ArrowLeft,
  Clock,
  Calendar,
  X,
  Filter,
  Flame,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { VodCategory, VodStream } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface MoviesScreenProps {
  username: string;
  onBack: () => void;
  onPlayStream: (stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'movie';
    poster?: string;
    category?: string;
  }) => void;
}

export const MoviesScreen: React.FC<MoviesScreenProps> = ({
  username,
  onBack,
  onPlayStream,
}) => {
  const [categories, setCategories] = useState<VodCategory[]>([]);
  const [movies, setMovies] = useState<VodStream[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeMovieModal, setActiveMovieModal] = useState<VodStream | null>(null);
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(36);

  // 1. Load categories first, then load initial category stream batch
  useEffect(() => {
    let isMounted = true;
    async function initCatalog() {
      setIsLoading(true);
      try {
        const cats = await iptvApi.getCategories('vod', username);
        if (!isMounted) return;
        setCategories(cats);

        const initialCatId = cats.length > 0 ? cats[0].category_id : 'all';
        setSelectedCategoryId(initialCatId);

        const initialMovies = await iptvApi.getStreams('vod', username, initialCatId);
        if (isMounted) {
          setMovies(initialMovies);
        }
      } catch (err) {
        console.error('Error loading VOD:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    const favs = iptvApi.getFavorites().filter((f) => f.type === 'vod');
    setFavoritesList(favs.map((f) => String(f.id)));

    initCatalog();
    return () => {
      isMounted = false;
    };
  }, [username]);

  // 2. Category selection with cached lazy loading
  const handleSelectCategory = async (catId: string) => {
    if (catId === selectedCategoryId && !searchQuery) return;
    setSelectedCategoryId(catId);
    setDisplayLimit(36);
    setIsLoading(true);

    try {
      const catMovies = await iptvApi.getStreams('vod', username, catId);
      setMovies(catMovies);
    } catch (err) {
      console.error('Error switching movie category:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.genre && m.genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.director && m.director.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategoryId === 'all' || !selectedCategoryId || String(m.category_id) === String(selectedCategoryId);

      const matchesFav = !showOnlyFavorites || favoritesList.includes(String(m.stream_id));

      return matchesSearch && matchesCategory && matchesFav;
    });
  }, [movies, searchQuery, selectedCategoryId, showOnlyFavorites, favoritesList]);

  // Paginated visible slice so mobile browser never freezes
  const visibleMovies = useMemo(() => {
    return filteredMovies.slice(0, displayLimit);
  }, [filteredMovies, displayLimit]);

  const handleToggleFavorite = (movie: VodStream) => {
    iptvApi.toggleFavorite({
      id: movie.stream_id,
      type: 'vod',
      name: movie.name,
      icon: movie.stream_icon,
    });
    setFavoritesList((prev) =>
      prev.includes(String(movie.stream_id))
        ? prev.filter((id) => id !== String(movie.stream_id))
        : [...prev, String(movie.stream_id)]
    );
  };

  const handlePlayMovie = (movie: VodStream) => {
    setActiveMovieModal(null);
    onPlayStream({
      streamId: movie.stream_id,
      title: movie.name,
      url:
        movie.stream_url ||
        iptvApi.buildStreamUrl('movie', movie.stream_id, movie.container_extension || 'mp4', username),
      type: 'movie',
      poster: movie.stream_icon,
      category: movie.category_id,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#08090d] text-zinc-100 select-none">
      {/* Top Header */}
      <div className="px-3 py-2 md:px-4 md:py-2.5 bg-zinc-950/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="tv-focusable p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Volver</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              Películas VOD
            </h2>
            <span className="text-xs font-mono text-amber-400 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
              {filteredMovies.length} Títulos
            </span>
          </div>
        </div>

        {/* Search & Favorites */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar título, actor, director..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <button
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            className={`tv-focusable px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              showOnlyFavorites
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-black' : ''}`} />
            <span className="hidden sm:inline">Favoritos</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="shrink-0 md:col-span-3 lg:col-span-2 bg-zinc-950/60 border-b md:border-b-0 md:border-r border-zinc-800/80 flex flex-col md:h-full overflow-hidden">
          <div className="hidden md:flex p-3 border-b border-zinc-800 items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Categorías</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              {categories.length}
            </span>
          </div>

          <div className="flex flex-row md:flex-col flex-1 gap-2 md:gap-0 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto p-2 md:space-y-1 scrollbar-thin">
            <button
              onClick={() => handleSelectCategory('all')}
              className={`tv-focusable shrink-0 md:shrink md:w-full whitespace-nowrap md:whitespace-normal text-left px-3.5 py-1.5 md:px-3 md:py-2 rounded-full md:rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                selectedCategoryId === 'all'
                  ? 'bg-amber-500 text-black font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
              }`}
            >
              <span>⭐ TODAS LAS PELÍCULAS</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`tv-focusable shrink-0 md:shrink md:w-full whitespace-nowrap md:whitespace-normal text-left px-3.5 py-1.5 md:px-3 md:py-2 rounded-full md:rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500 text-black font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <span className="truncate">{cat.category_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Poster Grid */}
        <div className="md:col-span-9 lg:col-span-10 bg-[#08090d] flex-1 overflow-y-auto p-3 sm:p-6 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-sm">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Cargando catálogo de películas sin cortes...</span>
            </div>
          ) : visibleMovies.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 text-sm">
              No hay películas disponibles en esta categoría.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {visibleMovies.map((movie) => {
                  const isFav = favoritesList.includes(String(movie.stream_id));
                  return (
                    <div
                      key={movie.stream_id}
                      onClick={() => setActiveMovieModal(movie)}
                      className="tv-focusable group relative bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg hover:border-amber-400 transition-all duration-300 flex flex-col cursor-pointer"
                    >
                      {/* Poster Image */}
                      <div className="aspect-[2/3] w-full bg-zinc-950 relative overflow-hidden">
                        {movie.stream_icon ? (
                          <img
                            src={movie.stream_icon}
                            alt={movie.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <Film className="w-12 h-12" />
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 z-10">
                          {movie.rating && (
                            <span className="px-1.5 py-0.5 rounded-md bg-black/75 text-amber-400 font-mono text-[11px] font-extrabold flex items-center gap-0.5 border border-amber-500/40">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {movie.rating}
                            </span>
                          )}
                        </div>

                        {/* Quality Tag: solo si el título lo indica */}
                        {/(4k|uhd)/i.test(movie.name || '') && (
                          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-black font-mono text-[9px] sm:text-[10px] font-extrabold">
                              4K UHD
                            </span>
                          </div>
                        )}

                        {/* Hover Overlay Play Icon */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="p-3 bg-amber-500 text-black rounded-full shadow-[0_0_20px_rgba(245,158,11,0.6)] transform scale-75 group-hover:scale-100 transition-transform">
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Movie Info */}
                      <div className="p-1.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1">
                        <h4 className="text-[11px] leading-tight sm:text-sm font-bold text-white line-clamp-2 sm:truncate group-hover:text-amber-300 transition-colors">
                          {movie.name}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span>{movie.year || ''}</span>
                          <span className="hidden sm:inline">{movie.duration || ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button (Virtual pagination prevents freeze) */}
              {filteredMovies.length > displayLimit && (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 36)}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>Cargar Más Películas (+36)</span>
                  </button>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Mostrando {visibleMovies.length} de {filteredMovies.length} títulos disponibles
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Movie Details Modal */}
      {activeMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            <button
              onClick={() => setActiveMovieModal(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/60 hover:bg-zinc-800 rounded-full text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="md:w-5/12 aspect-[2/3] md:aspect-auto bg-zinc-900 relative">
              {activeMovieModal.stream_icon ? (
                <img
                  src={activeMovieModal.stream_icon}
                  alt={activeMovieModal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Film className="w-16 h-16" />
                </div>
              )}
            </div>

            <div className="p-6 md:w-7/12 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                    Película
                  </span>
                  {activeMovieModal.rating && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-400 text-xs font-bold flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {activeMovieModal.rating}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 font-mono">
                    {activeMovieModal.year || '2025'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white leading-tight">
                  {activeMovieModal.name}
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4">
                  {activeMovieModal.plot ||
                    'Disfruta de esta película en máxima resolución con audio original y doblaje latino sin cortes.'}
                </p>

                {activeMovieModal.cast && (
                  <div className="text-xs text-zinc-500">
                    <span className="text-zinc-400 font-bold">Reparto: </span>
                    {activeMovieModal.cast}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handlePlayMovie(activeMovieModal)}
                  className="tv-focusable flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>REPRODUCIR AHORA</span>
                </button>

                <button
                  onClick={() => handleToggleFavorite(activeMovieModal)}
                  className={`tv-focusable p-3 rounded-xl border transition cursor-pointer ${
                    favoritesList.includes(String(activeMovieModal.stream_id))
                      ? 'bg-amber-950 border-amber-700 text-amber-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                  title="Añadir a Favoritos"
                >
                  <Star
                    className={`w-5 h-5 ${
                      favoritesList.includes(String(activeMovieModal.stream_id))
                        ? 'fill-amber-400'
                        : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
