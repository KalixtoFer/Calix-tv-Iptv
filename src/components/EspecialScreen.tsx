import React, { useState, useEffect } from 'react';
import {
  Flame,
  ArrowLeft,
  Tv,
  Trophy,
  Play,
  Calendar,
  Clock,
  Radio,
  Star,
} from 'lucide-react';
import { LiveStream } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface EspecialScreenProps {
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

export const EspecialScreen: React.FC<EspecialScreenProps> = ({
  username,
  onBack,
  onPlayStream,
}) => {
  const [specialStreams, setSpecialStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSpecials() {
      setIsLoading(true);
      const streams = await iptvApi.getStreams('live', username, 'all');
      if (isMounted) {
        const specials = streams.filter(
          (s) =>
            s.name.toLowerCase().includes('ppv') ||
            s.name.toLowerCase().includes('ufc') ||
            s.name.toLowerCase().includes('24/7') ||
            s.name.toLowerCase().includes('especial') ||
            s.category_id === '8'
        );
        setSpecialStreams(specials.length > 0 ? specials : streams.slice(0, 6));
        setIsLoading(false);
      }
    }
    loadSpecials();
    return () => {
      isMounted = false;
    };
  }, [username]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-[#08090d] text-zinc-100 select-none">
      {/* Top Header */}
      <div className="px-4 py-2.5 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between">
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
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
              5. Eventos Especiales & PPV
            </h2>
            <span className="text-xs font-mono text-rose-400 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
              Exclusivo VIP
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Featured Big PPV Card */}
        <div className="relative rounded-3xl overflow-hidden border border-rose-500/40 bg-gradient-to-r from-rose-950/60 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-[0_0_35px_rgba(244,63,94,0.2)]">
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-rose-600 text-white font-mono text-xs font-black rounded-md uppercase tracking-wider animate-pulse">
                EVENTO DESTACADO
              </span>
              <span className="text-xs text-rose-300 font-semibold">Señal 4K HDR Multi-Cámara</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              UFC PPV: Campeonato Mundial Peso Pesado
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300">
              Transmisión exclusiva con relatos en español e inglés sin interrupciones comerciales.
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  const ufc = specialStreams.find((s) => s.name.includes('UFC')) || specialStreams[0];
                  if (ufc) {
                    onPlayStream({
                      streamId: ufc.stream_id,
                      title: ufc.name,
                      url: ufc.stream_url || iptvApi.buildStreamUrl('live', ufc.stream_id, 'm3u8', username),
                      type: 'live',
                      poster: ufc.stream_icon,
                    });
                  }
                }}
                className="tv-focusable px-6 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm rounded-xl shadow-[0_0_25px_rgba(244,63,94,0.6)] flex items-center gap-2 cursor-pointer transition transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Sintonizar Señal Principal [OK]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Specials Grid */}
        <div>
          <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-rose-400" /> Transmisiones Especiales Disponibles
          </h4>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-xs">
              <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mb-2" />
              Cargando señales especiales...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {specialStreams.map((stream) => (
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
                  className="tv-focusable group bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden hover:border-rose-400 transition cursor-pointer shadow-lg p-3 space-y-3"
                >
                  <div className="aspect-video w-full rounded-xl bg-zinc-950 overflow-hidden relative">
                    <img
                      src={stream.stream_icon}
                      alt={stream.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-extrabold rounded">
                      PPV 4K
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 bg-rose-600 text-white rounded-full shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-rose-300">
                      {stream.name}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {stream.current_program || 'Cobertura completa en vivo'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
