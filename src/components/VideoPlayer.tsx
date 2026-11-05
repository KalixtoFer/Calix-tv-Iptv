import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  SkipForward,
  SkipBack,
  Tv,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export interface VideoPlayerProps {
  url: string;
  title: string;
  subtitle?: string;
  type?: 'live' | 'movie' | 'episode';
  poster?: string;
  autoPlay?: boolean;
  onClose?: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  className?: string;
  isMiniPlayer?: boolean;
  onExpand?: () => void;
}

const getExt = (u: string): string => {
  const m = u.split('?')[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
};

const describeMediaError = (code: number | undefined, ext: string): string => {
  const webUnfriendly = ['mkv', 'avi', 'ts', 'wmv', 'flv', 'mpg', 'mpeg'];
  switch (code) {
    case 2: return 'Error de red al descargar el video. Puede ser el servidor (límite de conexiones, bloqueo) o tu conexión.';
    case 3: return 'El dispositivo no pudo decodificar el video (códec no soportado, por ejemplo HEVC/H.265).';
    case 4:
      if (webUnfriendly.includes(ext)) return `El motor web de este dispositivo no reproduce el formato .${ext} (o su códec de video/audio). Probá abrirlo en otro reproductor (VLC / MX Player).`;
      return 'No se pudo abrir el archivo: formato o códec no soportado, o el servidor rechazó la solicitud (401/403/404).';
    default: return 'No se pudo reproducir este contenido.';
  }
};

const describeHlsError = (httpCode: number | undefined): string => {
  if (httpCode === 401 || httpCode === 403) return 'El servidor rechazó la solicitud (credenciales, límite de conexiones o bloqueo).';
  if (httpCode === 404) return 'El canal o la URL no existe en el servidor.';
  if (httpCode && httpCode >= 500) return 'El servidor IPTV respondió con error interno.';
  return 'No se pudo cargar la señal. En el navegador suele ser bloqueo CORS o contenido mixto (http dentro de https); en el celular, revisá la conexión.';
};

type AspectRatioMode = 'cover' | 'contain' | 'fill' | 'scale-down';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title,
  subtitle,
  type = 'live',
  poster,
  autoPlay = true,
  onClose,
  onNextChannel,
  onPrevChannel,
  onTimeUpdate,
  initialTime = 0,
  className = '',
  isMiniPlayer = false,
  onExpand,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('contain');
  const [qualityText, setQualityText] = useState<string>('FHD 1080p');
  const [zapFeedback, setZapFeedback] = useState<'next' | 'prev' | null>(null);
  const [errorDetail, setErrorDetail] = useState<string>('');
  const retryCountRef = useRef<number>(0);

  const touchStartY = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isMiniPlayer) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isMiniPlayer]);

  useEffect(() => {
    bumpControls();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [bumpControls]);

  // Video source loading via HLS.js or Native
  const loadStream = useCallback(() => {
    const video = videoRef.current;
    if (!video || !url || url.trim() === '') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(null);
    setErrorDetail('');
    retryCountRef.current = 0;

    // Clean up previous HLS instance safely
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
      video.pause();
    } catch {
      // Ignore pause error on uninitialized media
    }

    const isHlsStream =
      url.includes('.m3u8') ||
      url.includes('m3u8') ||
      url.includes('/live/') ||
      type === 'live';

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        capLevelToPlayerSize: true,
        initialLiveManifestSize: 1,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        setHasError(null);
        if (data.levels && data.levels.length > 0) {
          // Default to a medium level for faster initial buffer if available
          const startLevel = Math.floor(data.levels.length / 2);
          hls.startLevel = startLevel;
          
          const maxLevel = data.levels[data.levels.length - 1];
          if (maxLevel.height) {
            setQualityText(maxLevel.height >= 1080 ? 'FHD 1080p' : `${maxLevel.height}p`);
          }
        }
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay policies require user interaction or muted playback
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        const httpCode: number | undefined = (data as any).response?.code;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCountRef.current < 3) { retryCountRef.current += 1; hls.startLoad(); return; }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retryCountRef.current < 3) { retryCountRef.current += 1; hls.recoverMediaError(); return; }
        hls.destroy(); hlsRef.current = null;
        setIsLoading(false);
        setHasError('Señal no disponible o canal temporalmente fuera de línea.');
        setErrorDetail(describeHlsError(httpCode));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS Native HLS
      video.src = url;
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    } else {
      // Native MP4 / WebM / TS / MKV VOD stream
      video.src = url;
      video.load();
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    }

    if (initialTime > 0) {
      video.currentTime = initialTime;
    }
  }, [url, autoPlay, initialTime, type]);

  useEffect(() => {
    loadStream();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadStream]);

  // Video listeners
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    if (onTimeUpdate) onTimeUpdate(cur, dur);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    bumpControls();
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    bumpControls();
  };

  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const handleSeek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    bumpControls();
  };

  const handleSliderSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const target = parseFloat(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
    bumpControls();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFull = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFull);
      if (isCurrentlyFull) {
        ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
      } else {
        ScreenOrientation.unlock().catch(() => {});
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Ensure we unlock when component unmounts
      ScreenOrientation.unlock().catch(() => {});
    };
  }, []);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(console.error);
    } else {
      document.exitFullscreen?.().catch(console.error);
    }
    bumpControls();
  };

  const cycleAspectRatio = () => {
    const modes: AspectRatioMode[] = ['contain', 'cover', 'fill'];
    const next = modes[(modes.indexOf(aspectRatio) + 1) % modes.length];
    setAspectRatio(next);
    bumpControls();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiped up -> Next
        setZapFeedback('next');
        if (onNextChannel) onNextChannel();
      } else {
        // Swiped down -> Prev
        setZapFeedback('prev');
        if (onPrevChannel) onPrevChannel();
      }
      setTimeout(() => setZapFeedback(null), 800);
    } else {
      bumpControls();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpControls}
      onClick={isMiniPlayer && onExpand ? onExpand : bumpControls}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative group bg-black overflow-hidden flex items-center justify-center select-none ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
          setHasError(null);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          const v = videoRef.current;
          if (url && url.trim() !== '') {
            // Attempt HLS fallback if URL is not .m3u8 and HLS is supported
            if (!url.includes('.m3u8') && Hls.isSupported() && !hlsRef.current) {
              const hlsUrl = url.replace(/\.[a-zA-Z0-9]+$/, '.m3u8');
              console.log('Attempting HLS fallback for VOD:', hlsUrl);
              const hls = new Hls({ enableWorker: true });
              hlsRef.current = hls;
              hls.loadSource(hlsUrl);
              if (v) hls.attachMedia(v);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setHasError(null);
                v?.play().catch(() => {});
              });
              hls.on(Hls.Events.ERROR, () => {
                setHasError('No se pudo reproducir este título. Verifique el servidor o su conexión.');
              });
              return;
            }
            setHasError('Señal no disponible o canal temporalmente fuera de línea.');
          }
        }}
        className={`w-full h-full transition-all duration-200 ${
          aspectRatio === 'contain'
            ? 'object-contain'
            : aspectRatio === 'cover'
            ? 'object-cover'
            : 'object-fill'
        }`}
      />

      {/* Zap Feedback Overlay */}
      {zapFeedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="bg-black/60 backdrop-blur-xl p-6 rounded-full border border-white/20 animate-bounce">
            {zapFeedback === 'next' ? (
              <div className="flex flex-col items-center">
                <ChevronRight className="w-12 h-12 text-rose-500 rotate-90" />
                <span className="text-[10px] font-black text-rose-500 uppercase mt-1">Siguiente</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ChevronLeft className="w-12 h-12 text-rose-500 rotate-90" />
                <span className="text-[10px] font-black text-rose-500 uppercase mt-1">Anterior</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none z-20">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-3 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
          <span className="text-sm font-semibold tracking-wide text-zinc-300">Conectando señal...</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-center p-6 z-20">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h4 className="text-base font-bold text-white mb-1">Señal no disponible temporalmente</h4>
          <p className="text-xs text-zinc-400 max-w-md mb-4">{hasError}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadStream();
            }}
            className="tv-focusable px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reintentar Señal
          </button>
        </div>
      )}

      {/* Mini Player Overlay Header */}
      {isMiniPlayer && (
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-white truncate max-w-[140px]">{title}</span>
          </div>
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="pointer-events-auto p-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-md shadow-md text-xs flex items-center gap-1 cursor-pointer"
              title="Expandir a pantalla completa"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Full Player Controls Overlay */}
      {!isMiniPlayer && (
        <div
          className={`absolute inset-0 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/30 to-black/80 transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Top Bar: Title & Channel Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="tv-focusable p-2.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Cerrar / Volver"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  {type === 'live' && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[11px] font-extrabold rounded-md flex items-center gap-1 uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" /> EN VIVO
                    </span>
                  )}
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-wide truncate max-w-sm sm:max-w-md">
                    {title}
                  </h3>
                </div>
                {subtitle && <p className="text-xs text-zinc-400 truncate max-w-md mt-0.5">{subtitle}</p>}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-zinc-900/90 border border-zinc-700 text-cyan-400 text-xs font-mono font-bold rounded-lg shadow-inner">
                {qualityText}
              </span>
              <span className="hidden sm:inline-block px-2.5 py-1 bg-zinc-900/90 border border-zinc-700 text-zinc-300 text-xs font-mono rounded-lg">
                60 FPS
              </span>
              <button
                onClick={cycleAspectRatio}
                className="tv-focusable px-2.5 py-1 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 rounded-lg flex items-center gap-1 cursor-pointer"
                title="Cambiar relación de aspecto"
              >
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span className="capitalize text-[11px] font-medium">{aspectRatio}</span>
              </button>
            </div>
          </div>

          {/* Center Play Indicator for Click */}
          <div className="flex items-center justify-center gap-6">
            {type === 'live' && onPrevChannel && (
              <button
                onClick={onPrevChannel}
                className="tv-focusable p-3 bg-zinc-900/80 hover:bg-cyan-500 hover:text-black text-white rounded-full transition transform active:scale-95 cursor-pointer shadow-lg"
                title="Canal Anterior (CH-)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <button
              onClick={handlePlayPause}
              className="tv-focusable p-4 sm:p-5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full transition transform active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.6)] cursor-pointer"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-0.5" />}
            </button>

            {type === 'live' && onNextChannel && (
              <button
                onClick={onNextChannel}
                className="tv-focusable p-3 bg-zinc-900/80 hover:bg-cyan-500 hover:text-black text-white rounded-full transition transform active:scale-95 cursor-pointer shadow-lg"
                title="Canal Siguiente (CH+)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar: Timeline (if VOD) + Controls */}
          <div className="space-y-3">
            {/* Scrubber slider for Movies / Series episodes */}
            {type !== 'live' && duration > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={1}
                  value={currentTime}
                  onChange={handleSliderSeek}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className="tv-focusable text-zinc-300 hover:text-cyan-400 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                {type !== 'live' && (
                  <>
                    <button
                      onClick={() => handleSeek(-10)}
                      className="tv-focusable text-zinc-400 hover:text-white transition text-xs flex items-center gap-1 cursor-pointer"
                      title="-10 segundos"
                    >
                      <SkipBack className="w-4 h-4" /> 10s
                    </button>
                    <button
                      onClick={() => handleSeek(10)}
                      className="tv-focusable text-zinc-400 hover:text-white transition text-xs flex items-center gap-1 cursor-pointer"
                      title="+10 segundos"
                    >
                      <SkipForward className="w-4 h-4" /> 10s
                    </button>
                  </>
                )}

                {/* Volume slider */}
                <div className="flex items-center gap-2 group/vol ml-2">
                  <button
                    onClick={handleToggleMute}
                    className="tv-focusable text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>

              {/* Right action buttons */}
              <div className="flex items-center gap-3">
                {type === 'live' && (
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ZAPPING: CH+ / CH-</span>
                  </div>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="tv-focusable p-1.5 text-zinc-300 hover:text-cyan-400 transition cursor-pointer"
                  title="Pantalla Completa (F)"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
