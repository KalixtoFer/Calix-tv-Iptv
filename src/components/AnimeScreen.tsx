import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  ArrowLeft,
  Tv,
  Clapperboard,
  Play,
  Star,
  Flame,
} from 'lucide-react';
import { LiveStream, SeriesItem } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface AnimeScreenProps {
  username: string;
  onBack: () => void;
  onPlayStream: (stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'live' | 'episode' | 'movie';
    poster?: string;
    category?: string;
  }) => void;
}

export const AnimeScreen: React.FC<AnimeScreenProps> = ({
  username,
  onBack,
  onPlayStream,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'series'>('live');
  const [animeLiveStreams, setAnimeLiveStreams] = useState<LiveStream[]>([]);
  const [animeSeries, setAnimeSeries] = useState<SeriesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAnimeData() {
      setIsLoading(true);
      try {
        const [liveCats, seriesCats] = await Promise.all([
          iptvApi.getCategories('live', username),
          iptvApi.getCategories('series', username),
        ]);

        const animeLiveCat = liveCats.find((c) => c.category_name.toLowerCase().includes('anime')) || liveCats[0];
        const animeSeriesCat = seriesCats.find((c) => c.category_name.toLowerCase().includes('anime')) || seriesCats[0];

        const [liveList, seriesList] = await Promise.all([
          animeLiveCat ? iptvApi.getStreams('live', username, animeLiveCat.category_id) : Promise.resolve([]),
          animeSeriesCat ? iptvApi.getStreams('series', username, animeSeriesCat.category_id) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setAnimeLiveStreams(liveList);
          setAnimeSeries(seriesList);
        }
      } catch (err) {
        console.error('Error loading Anime:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAnimeData();
    return () => {
      isMounted = false;
    };
  }, [username]);

  const filteredLive = animeLiveStreams.filter(
    (s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSeries = animeSeries.filter(
    (s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              4. Anime 24/7 & Series
            </h2>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Audio Dual & Sub
            </span>
          </div>
        </div>

        {/* Tab Switcher & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={() => setActiveTab('live')}
              className={`tv-focusable px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Canales 24/7
            </button>
            <button
              onClick={() => setActiveTab('series')}
              className={`tv-focusable px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'series'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Series Anime
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-36 sm:w-48 bg-zinc-900 border border-zinc-700 text-xs pl-9 pr-3 py-1.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 transition"
            />
          </div>
        </div>
      </div>

      {/* Anime Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-sm">
            <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
            Cargando catálogo de anime...
          </div>
        ) : activeTab === 'live' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Tv className="w-4 h-4" /> Emisiones de Anime en Directo
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredLive.map((stream) => (
                <div
                  key={stream.stream_id}
                  onClick={() =>
                    onPlayStream({
                      streamId: stream.stream_id,
                      title: stream.name,
                      url:
                        stream.stream_url ||
                        iptvApi.buildStreamUrl('live', stream.stream_id, 'm3u8', username),
                      type: 'live',
                      poster: stream.stream_icon,
                    })
                  }
                  className="tv-focusable group bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden hover:border-emerald-400 transition cursor-pointer shadow-lg p-3 space-y-3"
                >
                  <div className="aspect-video w-full rounded-xl bg-zinc-950 overflow-hidden relative">
                    <img
                      src={stream.stream_icon}
                      alt={stream.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-extrabold rounded">
                      24/7 EN VIVO
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-emerald-500 text-black rounded-full shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-300">
                      {stream.name}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {stream.current_program || 'Maratón continuo de episodios'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Clapperboard className="w-4 h-4" /> Series Anime Completas
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredSeries.map((series) => (
                <div
                  key={series.series_id}
                  onClick={() =>
                    onPlayStream({
                      streamId: series.series_id,
                      title: `${series.name} - Temporada Completa`,
                      url: iptvApi.buildStreamUrl('episode', series.series_id, 'mp4', username),
                      type: 'episode',
                      poster: series.cover,
                    })
                  }
                  className="tv-focusable group bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden hover:border-emerald-400 transition cursor-pointer shadow-lg"
                >
                  <div className="aspect-[2/3] w-full bg-zinc-950 overflow-hidden relative">
                    <img
                      src={series.cover}
                      alt={series.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 text-amber-400 font-mono text-[11px] font-bold rounded flex items-center gap-0.5 border border-amber-500/40">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {series.rating || '9.6'}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-emerald-500 text-black rounded-full shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-300">
                      {series.name}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {series.genre || 'Acción, Shonen'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
