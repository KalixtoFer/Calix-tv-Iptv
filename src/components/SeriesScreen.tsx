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
} from 'lucide-react';
import { SeriesCategory, SeriesItem, SeriesDetails, Episode } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface SeriesScreenProps {
  username: string;
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
  onBack,
  onPlayStream,
}) => {
  const [categories, setCategories] = useState<SeriesCategory[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [seriesDetails, setSeriesDetails] = useState<SeriesDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const [cats, series] = await Promise.all([
        iptvApi.getCategories('series', username),
        iptvApi.getStreams('series', username, 'all'),
      ]);

      if (isMounted) {
        setCategories(cats);
        setSeriesList(series);
        setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [username]);

  // Load series details when a series is clicked
  const handleOpenSeries = async (series: SeriesItem) => {
    setSelectedSeries(series);
    setIsLoadingDetails(true);
    setSelectedSeason(1);

    const details = await iptvApi.getSeriesInfo(series.series_id, username);
    setSeriesDetails(details);
    setIsLoadingDetails(false);
  };

  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.genre && s.genre.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryId === 'all' || String(s.category_id) === String(selectedCategoryId);

      return matchesSearch && matchesCat;
    });
  }, [seriesList, searchQuery, selectedCategoryId]);

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

  const currentEpisodes: Episode[] =
    seriesDetails?.episodes && seriesDetails.episodes[String(selectedSeason)]
      ? seriesDetails.episodes[String(selectedSeason)]
      : [];

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
            <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
              <Clapperboard className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              2. Series & Temporadas
            </h2>
            <span className="text-xs font-mono text-purple-400 font-bold bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
              {filteredSeries.length} Series
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="md:col-span-3 lg:col-span-2 bg-[#090b10] border-r border-zinc-800/80 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-400" /> Categorías
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`tv-focusable w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
              }`}
            >
              <span>TODAS LAS SERIES</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20">
                {seriesList.length}
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
                      ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
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
        <div className="md:col-span-9 lg:col-span-10 bg-[#08090d] flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-sm">
              <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
              Cargando catálogo de series...
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 text-sm">
              No hay series disponibles con los filtros actuales.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
              {filteredSeries.map((series) => (
                <div
                  key={series.series_id}
                  onClick={() => handleOpenSeries(series)}
                  className="tv-focusable group relative bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg hover:border-purple-400 transition-all duration-300 flex flex-col cursor-pointer"
                >
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

                    {series.rating && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 font-mono text-[11px] font-extrabold flex items-center gap-0.5 border border-amber-500/40">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {series.rating}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 z-10">
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-mono text-[10px] font-extrabold">
                        SERIE
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-purple-600 text-white rounded-full shadow-[0_0_20px_rgba(168,85,247,0.6)] transform scale-75 group-hover:scale-100 transition-transform">
                        <ListVideo className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {series.name}
                    </h4>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {series.releaseDate || 'Temporadas completas'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Series Detail & Episodes Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header Backdrop */}
            <div className="relative p-5 sm:p-6 border-b border-zinc-800 flex items-start justify-between bg-gradient-to-r from-purple-950/40 to-zinc-900/40">
              <div className="flex items-start gap-4">
                <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-zinc-900 border border-zinc-700 overflow-hidden shrink-0 shadow-md">
                  <img
                    src={selectedSeries.cover}
                    alt={selectedSeries.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-950 border border-purple-700 text-purple-300 text-xs font-bold rounded">
                      SERIE COMPLETA
                    </span>
                    {selectedSeries.rating && (
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-bold font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {selectedSeries.rating}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-white">
                    {selectedSeries.name}
                  </h3>
                  <p className="text-xs text-zinc-300 line-clamp-2 max-w-xl">
                    {selectedSeries.plot ||
                      'Una emocionante serie repleta de giros dramáticos y aventuras inolvidables.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSeries(null)}
                className="tv-focusable p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seasons Bar */}
            <div className="px-6 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-2 shrink-0">
                Temporadas:
              </span>
              {seriesDetails?.seasons && seriesDetails.seasons.length > 0 ? (
                seriesDetails.seasons.map((s) => (
                  <button
                    key={s.season_number}
                    onClick={() => setSelectedSeason(s.season_number)}
                    className={`tv-focusable px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedSeason === s.season_number
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Temporada {s.season_number}
                  </button>
                ))
              ) : (
                <button className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold">
                  Temporada 1
                </button>
              )}
            </div>

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-[#08090d]">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-xs">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2" />
                  Cargando episodios de la temporada...
                </div>
              ) : currentEpisodes.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  No hay episodios disponibles para esta temporada.
                </div>
              ) : (
                currentEpisodes.map((ep) => (
                  <div
                    key={ep.id}
                    onClick={() => handlePlayEpisode(ep)}
                    className="tv-focusable group flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-400 hover:bg-zinc-800/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-700/60 text-purple-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        E{ep.episode_num}
                      </div>

                      <div className="overflow-hidden flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300">
                          {ep.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {ep.info?.plot || 'Reproducir episodio completo en alta definición'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
                        {ep.info?.duration || '48 min'}
                      </span>
                      <button className="p-2 bg-purple-600 text-white rounded-xl group-hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
