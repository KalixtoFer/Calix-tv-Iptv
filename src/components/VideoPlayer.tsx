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
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { NativePlayer, canUseNativePlayer } from '../services/nativePlayer';

import { DeviceViewMode, LiveStream } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

const adjustTime = (text: string | undefined): string => {
  if (!text) return '';
  let result = text.replace(/\b([0-1]?\d|2[0-3])[:.hH]([0-5]\d)\b/g, (match, hh, mm) => {
    let h = parseInt(hh, 10);
    h = (h + 2) % 24;
    const sep = match.includes(':') ? ':' : match.includes('.') ? '.' : 'h';
    return `${h.toString().padStart(2, '0')}${sep}${mm}`;
  });
  result = result.replace(/\b([0-1]?\d|2[0-3])\s*(hs|hrs|h)\b/gi, (_match, hh, unit) => {
    let h = parseInt(hh, 10);
    h = (h + 2) % 24;
    return `${h.toString().padStart(2, '0')} ${unit}`;
  });
  return result;
};

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
  channels?: LiveStream[];
  initialChannelIndex?: number;
  username?: string;
  viewMode?: DeviceViewMode;
  onChannelChange?: (stream: LiveStream, index: number) => void;
  onOpenCategories?: () => void;
}

const getExt = (u: string): string => {
  const m = u.split('?')[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
};

const describeMediaError = (code: number | undefined, ext: string): string => {
  const webUnfriendly = ['mkv', 'avi', 'ts', 'wmv', 'flv', 'mpg', 'mpeg'];
  switch (code) {
    case 2:
      return 'Error de red al descargar el video. Puede ser el servidor (límite de conexiones, bloqueo) o tu conexión.';
    case 3:
      return 'El dispositivo no pudo decodificar el video (códec no soportado, por ejemplo HEVC/H.265).';
    case 4:
      if (webUnfriendly.includes(ext)) {
        return `El motor web de este dispositivo no reproduce el formato .${ext} (o su códec de video/audio). Probá abrirlo en otro reproductor (VLC / MX Player).`;
      }
      return 'No se pudo abrir el archivo: formato o códec no soportado, o el servidor rechazó la solicitud (401/403/404).';
    default:
      return 'No se pudo reproducir este contenido.';
  }
};

const describeHlsError = (httpCode: number | undefined): string => {
  if (httpCode === 401 || httpCode === 403) {
    return 'El servidor rechazó la solicitud (credenciales, límite de conexiones o bloqueo).';
  }
  if (httpCode === 404) return 'El canal o la URL no existe en el servidor.';
  if (httpCode && httpCode >= 500) return 'El servidor IPTV respondió con error interno.';
  return 'No se pudo cargar la señal. En el navegador suele ser bloqueo CORS o contenido mixto (http dentro de https); en el celular, revisá la conexión.';
};

type AspectRatioMode = 'cover' | 'contain' | 'fill' | 'scale-down';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url: urlProp,
  title: titleProp,
  subtitle,
  type = 'live',
  poster: posterProp,
  autoPlay = true,
  onClose,
  onNextChannel,
  onPrevChannel,
  onTimeUpdate,
  initialTime = 0,
  className = '',
  isMiniPlayer = false,
  onExpand,
  channels,
  initialChannelIndex,
  username,
  viewMode,
  onChannelChange,
  onOpenCategories,
}) => {
  // En el APK la URL siempre debe ser la directa al servidor IPTV (el proxy /api/iptv/stream solo existe en el servidor web)
  const baseParsedUrl = (() => {
    if (Capacitor.isNativePlatform() && urlProp.startsWith('/api/iptv/stream')) {
      try {
        return new URL(urlProp, 'http://localhost').searchParams.get('u') || urlProp;
      } catch {
        return urlProp;
      }
    }
    return urlProp;
  })();

  const [currentUrl, setCurrentUrl] = useState<string>(baseParsedUrl);
  const [activeTitle, setActiveTitle] = useState<string>(titleProp);
  const [activePoster, setActivePoster] = useState<string | undefined>(posterProp);

  useEffect(() => {
    let u = urlProp;
    if (Capacitor.isNativePlatform() && u.startsWith('/api/iptv/stream')) {
      try {
        u = new URL(u, 'http://localhost').searchParams.get('u') || u;
      } catch {}
    }
    setCurrentUrl(u);
    setActiveTitle(titleProp);
    setActivePoster(posterProp);
  }, [urlProp, titleProp, posterProp]);

  const [channelsList] = useState<LiveStream[]>(channels || []);
  const [currentIdx, setCurrentIdx] = useState<number>(initialChannelIndex ?? 0);

  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [showCategoryList, setShowCategoryList] = useState<boolean>(false);
  const [directNumberInput, setDirectNumberInput] = useState<string>('');

  const numberTimerRef = useRef<NodeJS.Timeout | null>(null);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastChannelRef = useRef<{ stream: LiveStream; index: number } | null>(null);

  const changeChannelByIndex = useCallback((targetIdx: number) => {
    if (!channelsList || channelsList.length === 0) return;
    const normIdx = (targetIdx + channelsList.length) % channelsList.length;
    const nextStream = channelsList[normIdx];

    if (channelsList[currentIdx]) {
      lastChannelRef.current = { stream: channelsList[currentIdx], index: currentIdx };
    }

    setCurrentIdx(normIdx);
    setActiveTitle(adjustTime(nextStream.name));
    setActivePoster(nextStream.stream_icon);

    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 3000);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const newU = nextStream.stream_url || iptvApi.buildStreamUrl('live', nextStream.stream_id, 'm3u8', username || 'demo');
      setCurrentUrl(newU);
      if (onChannelChange) onChannelChange(nextStream, normIdx);
    }, 300);
  }, [channelsList, currentIdx, username, onChannelChange]);

  useEffect(() => {
    if (viewMode !== 'tv' || type !== 'live') return;

    const handleKeyDown = (e: KeyboardEvent | CustomEvent) => {
      const detail = (e as CustomEvent).detail;
      const keyCode = detail?.keyCode ?? (e as KeyboardEvent).keyCode ?? (e as KeyboardEvent).which;
      const key = (e as KeyboardEvent).key;

      console.log('TV Key received:', keyCode, key);

      const isUp = keyCode === 19 || key === 'ArrowUp' || keyCode === 38;
      const isDown = keyCode === 20 || key === 'ArrowDown' || keyCode === 40;
      const isLeft = keyCode === 21 || key === 'ArrowLeft' || keyCode === 37;
      const isRight = keyCode === 22 || key === 'ArrowRight' || keyCode === 39;
      const isOk = keyCode === 23 || keyCode === 66 || key === 'Enter';
      const isBack = keyCode === 4 || key === 'Escape' || key === 'Backspace';
      const isChannelUp = keyCode === 92 || keyCode === 427 || key === 'PageUp';
      const isChannelDown = keyCode === 93 || keyCode === 428 || key === 'PageDown';
      const isRecall = keyCode === 89 || keyCode === 8;

      const numMatch = key >= '0' && key <= '9' ? parseInt(key, 10) : (keyCode >= 7 && keyCode <= 16 ? keyCode - 7 : (keyCode >= 144 && keyCode <= 153 ? keyCode - 144 : null));

      if (isUp || isChannelUp) {
        e.preventDefault();
        changeChannelByIndex(currentIdx + 1);
        return;
      }
      if (isDown || isChannelDown) {
        e.preventDefault();
        changeChannelByIndex(currentIdx - 1);
        return;
      }
      if (isLeft || isRight) {
        if (onOpenCategories) {
          e.preventDefault();
          onOpenCategories();
        }
        return;
      }
      if (isOk) {
        e.preventDefault();
        if (showOverlay) {
          setShowCategoryList((prev) => !prev);
        } else {
          setShowOverlay(true);
          setShowCategoryList(true);
          if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
          overlayTimerRef.current = setTimeout(() => {
            setShowOverlay(false);
            setShowCategoryList(false);
          }, 5000);
        }
        return;
      }
      if (isBack) {
        e.preventDefault();
        if (showCategoryList || showOverlay) {
          setShowCategoryList(false);
          setShowOverlay(false);
        } else if (onClose) {
          onClose();
        }
        return;
      }
      if (isRecall) {
        e.preventDefault();
        if (lastChannelRef.current) {
          const { stream, index } = lastChannelRef.current;
          lastChannelRef.current = { stream: channelsList[currentIdx], index: currentIdx };
          setCurrentIdx(index);
          setActiveTitle(adjustTime(stream.name));
          setActivePoster(stream.stream_icon);
          const newU = stream.stream_url || iptvApi.buildStreamUrl('live', stream.stream_id, 'm3u8', username || 'demo');
          setCurrentUrl(newU);
          setShowOverlay(true);
          setTimeout(() => setShowOverlay(false), 3000);
        }
        return;
      }
      if (numMatch !== null && numMatch >= 0 && numMatch <= 9) {
        e.preventDefault();
        const nextDigits = directNumberInput + numMatch;
        setDirectNumberInput(nextDigits);
        setShowOverlay(true);
        if (numberTimerRef.current) clearTimeout(numberTimerRef.current);
        numberTimerRef.current = setTimeout(() => {
          const chNum = parseInt(nextDigits, 10);
          setDirectNumberInput('');
          setShowOverlay(false);
          if (channelsList.length > 0) {
            const targetIdx = Math.max(0, Math.min(channelsList.length - 1, chNum - 1));
            changeChannelByIndex(targetIdx);
          }
        }, 1500);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown as EventListener);
    window.addEventListener('android-tv-key', handleKeyDown as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown as EventListener);
      window.removeEventListener('android-tv-key', handleKeyDown as EventListener);
    };
  }, [viewMode, type, currentIdx, channelsList, directNumberInput, showOverlay, showCategoryList, changeChannelByIndex, onClose, onOpenCategories, username]);

  const url = currentUrl;
  const title = activeTitle;
  const poster = activePoster;

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
  const fallbackAttemptedRef = useRef<boolean>(false);

  // Reproductor nativo (libVLC): películas y series por defecto; canales en vivo solo si se pide
  const [nativeFailed, setNativeFailed] = useState<boolean>(false);
  const [forceNative, setForceNative] = useState<boolean>(false);
  const nativeLaunchedFor = useRef<string>('');
  const nativeActive =
    canUseNativePlayer() && !isMiniPlayer && !nativeFailed && (type !== 'live' || forceNative);

  const launchNative = useCallback(async () => {
    setIsLoading(true);
    setHasError(null);
    setErrorDetail('');
    try {
      const r = await NativePlayer.play({
        url,
        title,
        startTime: Math.floor((initialTime || 0) * 1000),
      });
      if (onTimeUpdate) onTimeUpdate((r?.position || 0) / 1000, (r?.duration || 0) / 1000);
      if (onClose) onClose();
    } catch (e: any) {
      setNativeFailed(true);
      setIsLoading(false);
      setHasError('No se pudo abrir el reproductor nativo.');
      setErrorDetail(String(e?.message || e));
    }
  }, [url, title, initialTime, onClose, onTimeUpdate]);

  useEffect(() => {
    if (!nativeActive || !url) return;
    if (nativeLaunchedFor.current === url) return;
    nativeLaunchedFor.current = url;
    launchNative();
  }, [nativeActive, url, launchNative]);

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
    if (nativeActive) {
      // Lo reproduce el motor nativo: apagar el reproductor web
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        video?.pause();
      } catch {
        // ignore
      }
      return;
    }
    if (!video || !url || url.trim() === '') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(null);
    setErrorDetail('');
    retryCountRef.current = 0;
    fallbackAttemptedRef.current = false;

    // Reuse HLS instance if active for fast zapping
    if (hlsRef.current && (url.includes('.m3u8') || type === 'live')) {
      hlsRef.current.loadSource(url);
      hlsRef.current.startLoad();
      if (autoPlay) {
        video.play().catch(() => {});
      }
      setIsLoading(false);
      return;
    }

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
        lowLatencyMode: false,
        backBufferLength: 30,
        // Colchón de carga para que no se corte: en vivo reproduce ~20 s por detrás del directo.
        maxBufferLength: 40,
        maxMaxBufferLength: 90,
        liveSyncDuration: 20,
        liveMaxLatencyDuration: 60,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 5,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        startLevel: -1,
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        setHasError(null);
        if (data.levels && data.levels.length > 0) {
          const maxLevel = data.levels[data.levels.length - 1];
          if (maxLevel.height) {
            setQualityText(maxLevel.height >= 1080 ? 'FHD 1080p' : `${maxLevel.height}p`);
          }
        }
        if (autoPlay) {
          video.playbackRate = 1.0;
          video.play().catch(() => {
            // Autoplay policies require muted playback
            video.muted = true;
            setIsMuted(true);
            video.playbackRate = 1.0;
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        const httpCode: number | undefined = (data as any).response?.code;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCountRef.current < 4) {
          retryCountRef.current += 1;
          console.warn('HLS Network Error, retry', retryCountRef.current);
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retryCountRef.current < 4) {
          retryCountRef.current += 1;
          console.warn('HLS Media Error, recovering', retryCountRef.current);
          hls.recoverMediaError();
          return;
        }

        // Fallback nativo: Si Hls.js falla, intentamos reproducir con el elemento HTML5 nativo del WebView
        if (video && !fallbackAttemptedRef.current) {
          fallbackAttemptedRef.current = true;
          console.warn('HLS.js fatal error, switching to native video element playback');
          hls.destroy();
          hlsRef.current = null;
          video.src = url;
          video.load();
          video.play().catch(() => {});
          return;
        }

        hls.destroy();
        hlsRef.current = null;
        setIsLoading(false);
        setHasError(describeHlsError(httpCode));
        setErrorDetail(
          `hls.js: ${data.type} / ${data.details}${httpCode !== undefined ? ` / HTTP ${httpCode}` : ''}`
        );
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // HLS nativo soportado por el navegador/WebView
      video.src = url;
      video.load();
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    } else {
      // Stream directo (.mp4, .ts, etc.)
      video.src = url;
      video.load();
      video.playbackRate = 1.0;
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.playbackRate = 1.0;
          video.play().catch(() => {});
        });
      }
    }

    if (initialTime > 0) {
      // Hay que esperar a los metadatos; antes se asignaba demasiado pronto y se ignoraba
      video.addEventListener(
        'loadedmetadata',
        () => {
          try {
            video.currentTime = initialTime;
          } catch {
            // ignore
          }
        },
        { once: true }
      );
    }
  }, [url, autoPlay, initialTime, type, nativeActive]);

  // Prevent screen dimming / device sleep while playing video
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isPlaying) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // ignore
      }
    };
    if (isPlaying) {
      requestWakeLock();
    }
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isPlaying]);

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
        preload="auto"
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
          if (hlsRef.current || !url || url.trim() === '') return; // hls.js informa sus propios errores
          const err = videoRef.current?.error;
          const ext = getExt(url);
          setHasError(describeMediaError(err?.code, ext));
          setErrorDetail(
            `MediaError ${err?.code ?? '?'}${err?.message ? ' – ' + err.message : ''} · tipo=${type} · ext=${ext || '?'}`
          );
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
          <h4 className="text-base font-bold text-white mb-1">
            {type === 'live' ? 'Señal no disponible' : 'No se pudo reproducir'}
          </h4>
          <p className="text-xs text-zinc-300 max-w-md mb-2">{hasError}</p>
          {errorDetail && (
            <p className="text-[10px] font-mono text-zinc-500 max-w-md mb-4 break-all">{errorDetail}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadStream();
              }}
              className="tv-focusable px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reintentar
            </button>
            {canUseNativePlayer() && (nativeFailed || type === 'live') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nativeLaunchedFor.current = '';
                  setNativeFailed(false);
                  setForceNative(true);
                  setHasError(null);
                }}
                className="tv-focusable px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Reproductor nativo
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, '_blank');
              }}
              className="tv-focusable px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"
              title="Abrir con otro reproductor (VLC, MX Player...)"
            >
              <ExternalLink className="w-4 h-4" /> Abrir en otro reproductor
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(url).catch(() => {});
              }}
              className="tv-focusable px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"
              title="Copiar enlace (incluye usuario y contraseña)"
            >
              <Copy className="w-4 h-4" /> Copiar enlace
            </button>
          </div>
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

      {/* TV Zapping Overlay */}
      {viewMode === 'tv' && type === 'live' && (showOverlay || directNumberInput) && (
        <div className="absolute top-6 left-6 z-50 bg-[#080a12]/90 border border-zinc-700/60 rounded-2xl p-4 flex items-center gap-4 shadow-2xl transition-opacity duration-300 pointer-events-none select-none">
          <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-zinc-600">
            {poster ? (
              <img src={poster} className="w-full h-full object-contain p-1" alt="" />
            ) : (
              <Tv className="w-7 h-7 text-zinc-800" />
            )}
          </div>
          <div>
            <div className="text-cyan-400 font-mono font-extrabold text-sm">
              CANAL #{directNumberInput || currentIdx + 1}
            </div>
            <div className="text-white font-black text-lg tracking-tight max-w-md truncate">
              {title}
            </div>
          </div>
          {showCategoryList && channelsList.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-80 max-h-72 bg-[#080a12]/95 border border-zinc-700 rounded-2xl overflow-y-auto p-2 pointer-events-auto custom-scrollbar shadow-2xl">
              <div className="text-[11px] font-black text-cyan-400 uppercase tracking-widest px-2 py-1 mb-1 border-b border-zinc-800">
                Lista de Canales ({channelsList.length})
              </div>
              {channelsList.map((ch, idx) => (
                <button
                  key={ch.stream_id}
                  onClick={() => {
                    changeChannelByIndex(idx);
                    setShowCategoryList(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold truncate flex items-center justify-between transition cursor-pointer ${
                    idx === currentIdx ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="font-mono text-zinc-500 mr-2">{idx + 1}.</span>
                  <span className="truncate flex-1">{adjustTime(ch.name)}</span>
                  {idx === currentIdx && <span className="text-[9px] bg-cyan-500 text-black px-1.5 py-0.5 rounded font-black ml-1">ACTUAL</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
