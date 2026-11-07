import React, { useState, useEffect, useMemo } from 'react';
import {
  Clapperboard,
  Search,
  Star,
  Play,
  ArrowLeft,
  Filter,
  Layers,
  Clock,
  ChevronRight,
  X,
  ListVideo,
  ChevronDown,
} from 'lucide-react';
import { SeriesCategory, SeriesItem, SeriesDetails, Episode } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface SeriesScreenProps {
  username: string;
  initialSeries?: SeriesItem | null;
  onClearInitialSeries?: () => void;
  onBack: () => void;
  onPlayStream: (stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'episode';
    poster?: string;
    category?: string;
  }) => void;
}

export const SeriesScreen: React.FC<SeriesScreenProps> = ({
  username,
  initialSeries,
  onClearInitialSeries,
  onBack,
  onPlayStream,
}) => {
  const [categories, setCategories] = useState<SeriesCategory[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [seriesDetails, setSeriesDetails] = useState<SeriesDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(36);

  // 1. Load categories first, then initial series batch
  useEffect(() => {
    let isMounted = true;
    async function initSeriesCatalog() {
      setIsLoading(true);
      try {
        const cats = await iptvApi.getCategories('series', username);
        if (!isMounted) return;
        setCategories(cats);

        const initialCatId = cats.length > 0 ? cats[0].category_id : 'all';
        setSelectedCategoryId(initialCatId);

        const initialSeries = await iptvApi.getStreams('series', username, initialCatId);
        if (isMounted) {
          setSeriesList(initialSeries);
        }
      } catch (err) {
        console.error('Error loading Series:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSeriesCatalog();
    return () => {
      isMounted = false;
    };
  }, [username]);

  // 2. Select category with lazy cached fetching
  const handleSelectCategory = async (catId: string) => {
    if (catId === selectedCategoryId && !searchQuery) return;
    setSelectedCategoryId(catId);
    setDisplayLimit(36);
    setIsLoading(true);

    try {
      const list = await iptvApi.getStreams('series', username, catId);
      setSeriesList(list);
    } catch (err) {
      console.error('Error switching series category:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load series details when a series is clicked
  const handleOpenSeries = async (series: SeriesItem) => {
    setSelectedSeries(series);
    setIsLoadingDetails(true);
    setSelectedSeason(1);

    try {
      const details = await iptvApi.getSeriesInfo(series.series_id, username);
      setSeriesDetails(details);
    } catch (err) {
      console.error('Error fetching series info:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // If a specific series was selected from the main Home menu, open its detail modal immediately
  useEffect(() => {
    if (initialSeries) {
      handleOpenSeries(initialSeries);
    }
  }, [initialSeries]);

  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.genre && s.genre.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryId === 'all' || !selectedCategoryId || String(s.category_id) === String(selectedCategoryId);

      return matchesSearch && matchesCat;
    });
  }, [seriesList, searchQuery, selectedCategoryId]);

  const visibleSeries = useMemo(() => {
    return filteredSeries.slice(0, displayLimit);
  }, [filteredSeries, displayLimit]);

  const handlePlayEpisode = (episode: Episode) => {
    onPlayStream({
      streamId: episode.id,
      title: `${selectedSeries?.name} - T${selectedSeason}E${episode.episode_num}: ${episode.title}`,
      url:
        episode.stream_url ||
        iptvApi.buildStreamUrl('episode', episode.id, episode.container_extension || 'mp4', username),
      type: 'episode',
      poster: episode.info?.movie_image || selectedSeries?.cover,
      category: selectedSeries?.category_id,
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
            <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Clapperboard className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              Series & Temporadas
            </h2>
            <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
              {filteredSeries.length} Series
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar serie, género, director..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400 transition"
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="shrink-0 md:col-span-3 lg:col-span-2 bg-zinc-950/60 border-b md:border-b-0 md:border-r border-zinc-800/80 flex flex-col md:h-full overflow-hidden">
          <div className="hidden md:flex p-3 border-b border-zinc-800 items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
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
                  ? 'bg-indigo-600 text-white font-extrabold shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
              }`}
            >
              <span>⭐ TODAS LAS SERIES</span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`tv-focusable shrink-0 md:shrink md:w-full whitespace-nowrap md:whitespace-normal text-left px-3.5 py-1.5 md:px-3 md:py-2 rounded-full md:rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-extrabold shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                      : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <span className="truncate">{cat.category_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Series Poster Grid */}
        <div className="md:col-span-9 lg:col-span-10 bg-[#08090d] flex-1 overflow-y-auto p-3 sm:p-6 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-sm">
              <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Cargando catálogo de series...</span>
            </div>
          ) : visibleSeries.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 text-sm">
              No hay series disponibles en esta categoría.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                {visibleSeries.map((series) => (
                  <div
                    key={series.series_id}
                    onClick={() => handleOpenSeries(series)}
                    className="tv-focusable group relative bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg hover:border-indigo-400 transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    {/* Poster */}
                    <div className="aspect-[2/3] w-full bg-zinc-950 relative overflow-hidden">
                      {series.cover ? (
                        <img
                          src={series.cover}
                          alt={series.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <Clapperboard className="w-12 h-12" />
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 z-10">
                        {series.rating && (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/75 text-amber-400 font-mono text-[11px] font-extrabold flex items-center gap-0.5 border border-amber-500/40">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {series.rating}
                          </span>
                        )}
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="p-3 bg-indigo-600 text-white rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)] transform scale-75 group-hover:scale-100 transition-transform">
                          <ListVideo className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    {/* Series Info */}
                    <div className="p-1.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {series.name}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                        <span className="truncate max-w-[120px]">{series.genre || 'Serie'}</span>
                        <span>{series.releaseDate?.slice(0, 4) || '2025'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {filteredSeries.length > displayLimit && (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 36)}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>Cargar Más Series (+36)</span>
                  </button>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Mostrando {visibleSeries.length} de {filteredSeries.length} series disponibles
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Series Episodes Browser Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 rounded-xl bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800">
                  {selectedSeries.cover && (
                    <img
                      src={selectedSeries.cover}
                      alt={selectedSeries.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    {selectedSeries.name}
                  </h3>
                  <p className="text-xs text-indigo-400 font-semibold">
                    {selectedSeries.genre || 'Temporadas Completas en HD/4K'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedSeries(null);
                  setSeriesDetails(null);
                  onClearInitialSeries?.();
                }}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400 text-sm">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <span>Obteniendo temporadas y capítulos...</span>
                </div>
              ) : (
                <>
                  {/* Season Selector Tabs */}
                  {seriesDetails?.seasons && seriesDetails.seasons.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {seriesDetails.seasons.map((season) => (
                        <button
                          key={season.season_number}
                          onClick={() => setSelectedSeason(season.season_number)}
                          className={`tv-focusable px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            selectedSeason === season.season_number
                              ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                          }`}
                        >
                          Temporada {season.season_number} ({season.episode_count || 'EPs'})
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Episodes List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Episodios Disponibles
                    </h4>

                    {seriesDetails?.episodes &&
                    seriesDetails.episodes[String(selectedSeason)] &&
                    seriesDetails.episodes[String(selectedSeason)].length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {seriesDetails.episodes[String(selectedSeason)].map((ep) => (
                          <div
                            key={ep.id}
                            onClick={() => handlePlayEpisode(ep)}
                            className="tv-focusable group flex items-center gap-3 p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl hover:border-indigo-400 transition cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 font-mono font-bold flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                              {ep.episode_num}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-indigo-300 transition">
                                {ep.title || `Capítulo ${ep.episode_num}`}
                              </h5>
                              <p className="text-[11px] text-zinc-400 font-mono">
                                Calidad HD • Audio Latino
                              </p>
                            </div>
                            <Play className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-zinc-500 text-xs">
                        No hay episodios cargados para esta temporada.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
