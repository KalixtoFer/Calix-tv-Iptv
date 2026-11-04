import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  ArrowLeft,
  Tv,
  Clapperboard,
  Play,
  Flame,
} from 'lucide-react';
import { LiveStream, SeriesItem } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface EventsScreenProps {
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

// Utility to add 2 hours to HH:mm patterns found in strings
const adjustTime = (text: string | undefined): string => {
  if (!text) return '';
  return text.replace(/(\d{1,2}):(\d{2})/g, (match, hh, mm) => {
    let h = parseInt(hh, 10);
    h = (h + 2) % 24;
    return `${h.toString().padStart(2, '0')}:${mm}`;
  });
};

export const EventsScreen: React.FC<EventsScreenProps> = ({
  username,
  onBack,
  onPlayStream,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'series'>('live');
  const [eventsLiveStreams, setEventsLiveStreams] = useState<LiveStream[]>([]);
  const [eventsVod, setEventsVod] = useState<SeriesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadEventsData() {
      setIsLoading(true);
      try {
        const [liveCats, seriesCats] = await Promise.all([
          iptvApi.getCategories('live', username),
          iptvApi.getCategories('series', username),
        ]);

        const keywords = ['deporte', 'event', 'fútbol', 'conmebol', 'liga', 'champions', 'boxing', 'ufc', 'f1', 'motogp', 'soccer', 'sports'];
        
        const eventLiveCat = liveCats.find((c) => 
          keywords.some(k => c.category_name.toLowerCase().includes(k))
        ) || liveCats[0];
        
        const eventSeriesCat = seriesCats.find((c) => 
          keywords.some(k => c.category_name.toLowerCase().includes(k))
        ) || seriesCats[0];

        const [liveList, seriesList] = await Promise.all([
          eventLiveCat ? iptvApi.getStreams('live', username, eventLiveCat.category_id) : Promise.resolve([]),
          eventSeriesCat ? iptvApi.getStreams('series', username, eventSeriesCat.category_id) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setEventsLiveStreams(liveList);
          setEventsVod(seriesList);
        }
      } catch (err) {
        console.error('Error loading Events:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEventsData();
    return () => {
      isMounted = false;
    };
  }, [username]);

  const filteredLive = eventsLiveStreams.filter(
    (s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVod = eventsVod.filter(
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
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              Eventos Deportivos del Día
            </h2>
            <span className="text-xs font-mono text-rose-400 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
              AGENDA VIP
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
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              En Vivo
            </button>
            <button
              onClick={() => setActiveTab('series')}
              className={`tv-focusable px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'series'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Grabaciones / Replays
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar evento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-36 sm:w-48 bg-zinc-900 border border-zinc-700 text-xs pl-9 pr-3 py-1.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-400 transition"
            />
          </div>
        </div>
      </div>

      {/* Events Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 text-sm">
            <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Sincronizando agenda deportiva...</span>
          </div>
        ) : activeTab === 'live' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <Tv className="w-4 h-4" /> Partidos y Eventos En Directo
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredLive.map((stream) => (
                <div
                  key={stream.stream_id}
                  onClick={() =>
                    onPlayStream({
                      streamId: stream.stream_id,
                      title: adjustTime(stream.name),
                      url:
                        stream.stream_url ||
                        iptvApi.buildStreamUrl('live', stream.stream_id, 'm3u8', username),
                      type: 'live',
                      poster: stream.stream_icon,
                    })
                  }
                  className="tv-focusable group bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden hover:border-rose-500 transition cursor-pointer shadow-lg p-3 space-y-3"
                >
                  <div className="aspect-video w-full rounded-xl bg-zinc-950 overflow-hidden relative border border-zinc-800/50">
                    <img
                      src={stream.stream_icon}
                      alt={stream.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-extrabold rounded shadow-lg">
                      LIVE VIP
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-rose-600 text-white rounded-full shadow-xl">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white truncate group-hover:text-rose-400 transition-colors">
                      {adjustTime(stream.name)}
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-bold truncate mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {adjustTime(stream.current_program) || 'Señal deportiva estable'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <Clapperboard className="w-4 h-4" /> Repeticiones y Resúmenes
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredVod.map((series) => (
                <div
                  key={series.series_id}
                  onClick={() =>
                    onPlayStream({
                      streamId: series.series_id,
                      title: `${series.name}`,
                      url: iptvApi.buildStreamUrl('episode', series.series_id, 'mp4', username),
                      type: 'episode',
                      poster: series.cover,
                    })
                  }
                  className="tv-focusable group bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden hover:border-rose-500 transition cursor-pointer shadow-lg"
                >
                  <div className="aspect-[2/3] w-full bg-zinc-950 overflow-hidden relative">
                    <img
                      src={series.cover}
                      alt={series.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 text-rose-400 font-mono text-[11px] font-bold rounded flex items-center gap-0.5 border border-rose-500/40">
                      <Flame className="w-3 h-3 fill-rose-500" />
                      HD
                    </div>
                  </div>

                  <div className="p-3">
                    <h4 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-rose-400 transition-colors">
                      {series.name}
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-bold truncate mt-0.5">
                      {series.genre || 'Fútbol, Sports'}
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
