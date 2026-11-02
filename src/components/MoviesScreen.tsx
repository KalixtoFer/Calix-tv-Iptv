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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeMovieModal, setActiveMovieModal] = useState<VodStream | null>(null);
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const [cats, movList] = await Promise.all([
        iptvApi.getCategories('vod', username),
        iptvApi.getStreams('vod', username, 'all'),
      ]);

      if (isMounted) {
        setCategories(cats);
        setMovies(movList);
        setIsLoading(false);
      }
    }

    const favs = iptvApi.getFavorites().filter((f) => f.type === 'vod');
    setFavoritesList(favs.map((f) => String(f.id)));

    loadData();
    return () => {
      isMounted = false;
    };
  }, [username]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.genre && m.genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.director && m.director.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategoryId === 'all' || String(m.category_id) === String(selectedCategoryId);

      const matchesFav = !showOnlyFavorites || favoritesList.includes(String(m.stream_id));

      return matchesSearch && matchesCategory && matchesFav;
    });
  }, [movies, searchQuery, selectedCategoryId, showOnlyFavorites, favoritesList]);

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
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              3. Películas VOD
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
            className={`tv-focusable px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showOnlyFavorites
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Favoritos</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left Categories, Right Poster Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="md:col-span-3 lg:col-span-2 bg-[#090b10] border-r border-zinc-800/80 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Géneros
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`tv-focusable w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
              }`}
            >
              <span>TODAS LAS PELÍCULAS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20">
                {movies.length}
              </span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategoryId(cat.category_id)}
                  className={`tv-focusable w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer truncate ${
                    isSelected
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
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
        <div className="md:col-span-9 lg:col-span-10 bg-[#08090d] flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-sm">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              Cargando catálogo de películas...
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 text-sm">
              No hay películas disponibles con los filtros actuales.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
              {filteredMovies.map((movie) => {
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
                      <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                        {movie.rating && (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 font-mono text-[11px] font-extrabold flex items-center gap-0.5 border border-amber-500/40">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {movie.rating}
                          </span>
                        )}
                      </div>

                      {/* Quality Tag */}
                      <div className="absolute top-2 right-2 z-10">
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-black font-mono text-[10px] font-extrabold">
                          4K UHD
                        </span>
                      </div>

                      {/* Hover Overlay Play Icon */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-3 bg-amber-500 text-black rounded-full shadow-[0_0_20px_rgba(245,158,11,0.6)] transform scale-75 group-hover:scale-100 transition-transform">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Movie Info */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {movie.name}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                        <span>{movie.year || '2025'}</span>
                        <span>{movie.duration || '01:55:00'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Movie Details Modal */}
      {activeMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            {/* Close Button */}
            <button
              onClick={() => setActiveMovieModal(null)}
              className="tv-focusable absolute top-4 right-4 z-20 p-2 bg-black/70 hover:bg-zinc-800 text-white rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Poster Left */}
            <div className="md:w-5/12 aspect-[2/3] md:aspect-auto bg-zinc-900 relative">
              <img
                src={activeMovieModal.stream_icon}
                alt={activeMovieModal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent to-zinc-950" />
            </div>

            {/* Details Right */}
            <div className="md:w-7/12 p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold rounded">
                    PELÍCULA
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs font-mono rounded">
                    4K HDR
                  </span>
                  {activeMovieModal.rating && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-bold font-mono">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {activeMovieModal.rating}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeMovieModal.name}
                </h3>

                <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" /> {activeMovieModal.year || '2025'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> {activeMovieModal.duration || '2h 05m'}
                  </span>
                </div>

                {activeMovieModal.genre && (
                  <p className="text-xs text-amber-400 font-semibold mt-2">
                    Género: {activeMovieModal.genre}
                  </p>
                )}

                <p className="text-xs sm:text-sm text-zinc-300 mt-3 line-clamp-4 leading-relaxed">
                  {activeMovieModal.plot ||
                    'Una apasionante producción cinematográfica con excelente ambientación y sonido envolvente disponible en alta definición.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => handlePlayMovie(activeMovieModal)}
                  className="tv-focusable flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Reproducir Película [OK]</span>
                </button>

                <button
                  onClick={() => handleToggleFavorite(activeMovieModal)}
                  className={`tv-focusable p-3 rounded-xl border transition cursor-pointer ${
                    favoritesList.includes(String(activeMovieModal.stream_id))
                      ? 'bg-amber-950 border-amber-500 text-amber-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="Favorito"
                >
                  <Star className={`w-5 h-5 ${favoritesList.includes(String(activeMovieModal.stream_id)) ? 'fill-amber-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
