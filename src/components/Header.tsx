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
  onToggleViewMode: () => void;
  onOpenSettings: () => void;
  onOpenRemote: () => void;
  onOpenApkGuide: () => void;
  onLogout: () => void;
  onHomeClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appName = 'NEXUS IPTV PRO',
  version = 'v2.5.4',
  userInfo,
  serverUrl = '',
  isOnline = true,
  viewMode,
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
          {/* Logo Icon / Custom Slot */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-[1.5px] shadow-[0_0_18px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_24px_rgba(6,182,212,0.6)] transition-all">
            <div className="w-full h-full bg-[#08090e] rounded-[10px] flex items-center justify-center overflow-hidden">
              <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 fill-cyan-400/20 group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0a0d14] rounded-full shadow-sm" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-cyan-300">
                {appName}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                {version}
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

        {/* Device View Mode Toggle (TV vs Mobile) */}
        <button
          onClick={onToggleViewMode}
          className={`tv-focusable p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
            viewMode === 'tv'
              ? 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-300 hover:text-white'
          }`}
          title={viewMode === 'tv' ? 'Modo Android TV activo (Optimizado para control remoto)' : 'Modo Móvil/Tablet activo'}
        >
          {viewMode === 'tv' ? (
            <>
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">Modo TV</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4 text-zinc-400" />
              <span className="hidden md:inline">Modo Móvil</span>
            </>
          )}
        </button>

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
