import React, { useState, useEffect } from 'react';
  import {
  Tv,
  Wifi,
  Settings,
  Clock,
  LogOut,
  SlidersHorizontal,
  Smartphone,
  Monitor,
  ShieldCheck,
  Radio,
  FileCode,
} from 'lucide-react';
import { DeviceViewMode, XtreamUserInfo } from '../types/iptv';

interface HeaderProps {
  appName?: string;
  version?: string;
  userInfo?: XtreamUserInfo | null;
  serverUrl?: string;
  isOnline?: boolean;
  viewMode: DeviceViewMode;
  onChangeViewMode?: (mode: DeviceViewMode) => void;
  onToggleViewMode?: () => void;
  onOpenSettings: () => void;
  onOpenRemote: () => void;
  onOpenApkGuide: () => void;
  onLogout: () => void;
  onHomeClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appName = 'Calix Tv iptv Pro',
  version = 'v2.5.4',
  userInfo,
  serverUrl = '',
  isOnline = true,
  viewMode,
  onChangeViewMode,
  onToggleViewMode,
  onOpenSettings,
  onOpenRemote,
  onOpenApkGuide,
  onLogout,
  onHomeClick,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDateStr(
        now.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format expiration date
  const formatExpiry = (expTimestamp?: string) => {
    if (!expTimestamp) return 'Ilimitado';
    const ts = parseInt(expTimestamp, 10);
    if (isNaN(ts) || ts <= 0) return 'Ilimitado';
    const date = new Date(ts * 1000);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <header className="w-full bg-[#0a0d14]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left: Custom Brand Logo & Version */}
      <div className="flex items-center gap-3">
        <button
          onClick={onHomeClick}
          className="tv-focusable flex items-center gap-2.5 text-left group cursor-pointer"
          title="Ir a Inicio"
        >
          {/* Official Calix TV Logo Image */}
          <div className="relative group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="Calix TV"
              className="h-10 sm:h-11 w-auto object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                1.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${userInfo?.username?.includes('Invitado') ? 'bg-cyan-400' : 'bg-emerald-400'} animate-pulse`} />
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {userInfo?.username?.includes('Invitado') ? (
                  <span className="text-cyan-300 font-bold">Modo Vista Previa (Sin Cuenta)</span>
                ) : userInfo?.username ? (
                  `@${userInfo.username}`
                ) : (
                  'Xtream Codes Conectado'
                )}
              </span>
              {userInfo?.exp_date && !userInfo?.username?.includes('Invitado') && (
                <span className="hidden md:inline text-zinc-400">
                  • Vence: {formatExpiry(userInfo.exp_date)}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Right: Status, Clock, Mode Switcher, Admin Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection status badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs">
          <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="font-mono text-zinc-300">
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className="text-zinc-400">|</span>
          <span className="text-zinc-400 truncate max-w-[140px]">
            {serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'Xtream Proxy'}
          </span>
        </div>

        {/* Live Clock & Date */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 bg-zinc-900/90 border border-zinc-800/80 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-white tracking-wider">
              {currentTimeStr}
            </div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-tight hidden sm:block">
              {currentDateStr}
            </div>
          </div>
        </div>

        {/* Device View Mode Toggle (Celular, TV, PC) */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-semibold">
          <button
            onClick={() => (onChangeViewMode ? onChangeViewMode('mobile') : onToggleViewMode && onToggleViewMode())}
            className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
              viewMode === 'mobile'
                ? 'bg-cyan-500 text-black font-bold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Modo Celular (Táctil)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Celular</span>
          </button>
          <button
            onClick={() => (onChangeViewMode ? onChangeViewMode('tv') : onToggleViewMode && onToggleViewMode())}
            className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
              viewMode === 'tv'
                ? 'bg-cyan-500 text-black font-bold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Modo Android TV (Control Remoto)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden md:inline">TV</span>
          </button>
          <button
            onClick={() => (onChangeViewMode ? onChangeViewMode('web') : onToggleViewMode && onToggleViewMode())}
            className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
              viewMode === 'web'
                ? 'bg-cyan-500 text-black font-bold shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Modo PC / Navegador"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">PC</span>
          </button>
        </div>

        {/* Remote Control HUD Toggle */}
        <button
          onClick={onOpenRemote}
          className="tv-focusable p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-cyan-400 rounded-lg transition cursor-pointer flex items-center gap-1"
          title="Abrir Control Remoto Virtual de TV Box"
        >
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="hidden xl:inline text-xs font-medium">Control Remoto</span>
        </button>

        {/* APK Generation Guide */}
        <button
          onClick={onOpenApkGuide}
          className="tv-focusable hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border border-emerald-700/50 text-emerald-300 rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition"
          title="Guía de compilación de APK para Android TV"
        >
          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
          <span>Guía APK</span>
        </button>

        {/* Admin Settings Button */}
        <button
          onClick={onOpenSettings}
          className="tv-focusable p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white rounded-lg transition cursor-pointer"
          title="Panel de Administración Centralizado (Configuración de Servidor)"
        >
          <Settings className="w-4 h-4 text-zinc-300 hover:text-cyan-400" />
        </button>

        {/* Logout Button */}
        {userInfo && (
          <button
            onClick={onLogout}
            className="tv-focusable p-2 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 hover:text-rose-100 rounded-lg transition cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
