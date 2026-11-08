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
import { ActiveSection, DeviceViewMode, XtreamUserInfo } from '../types/iptv';

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
  onNavigate?: (section: ActiveSection) => void;
}

type NavItem = { id: 'events' | 'movies' | 'series'; label: string; icon: string };
const NAV_ITEMS: NavItem[] = [
  { id: 'events', label: 'Eventos en vivo', icon: '📅' },
  { id: 'movies', label: 'Películas', icon: '🎬' },
  { id: 'series', label: 'Series', icon: '📺' },
];

function TopNavButtons({ onNavigate }: { onNavigate: (id: NavItem['id']) => void }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight') {
      if (refs.current[i + 1]) {
        refs.current[i + 1]?.focus();
        e.preventDefault();
      }
    }
    if (e.key === 'ArrowLeft') {
      if (refs.current[i - 1]) {
        refs.current[i - 1]?.focus();
        e.preventDefault();
      }
    }
    if (e.key === 'ArrowDown') {
      // volver a la lista de categorías/canales
      const channelTarget = document.querySelector('[data-focus-zone="channels"] [tabindex="0"], [data-focus-zone="channels"] button') as HTMLElement | null;
      const catTarget = document.querySelector('[data-focus-zone="categories"] [tabindex="0"], [data-focus-zone="categories"] button') as HTMLElement | null;
      const target = channelTarget || catTarget || (document.querySelector('.tv-focusable') as HTMLElement | null);
      if (target) {
        target.focus();
        e.preventDefault();
      }
    }
    if (e.key === 'Enter') onNavigate(NAV_ITEMS[i].id);
  };

  return (
    <div className="top-nav-buttons">
      {NAV_ITEMS.map((item, i) => (
        <button
          key={item.id}
          ref={el => { refs.current[i] = el; }}
          tabIndex={0}
          className="top-nav-btn tv-focusable"
          onClick={() => onNavigate(item.id)}
          onKeyDown={e => onKeyDown(e, i)}
          onFocus={() => console.log(`[TopNav] Botón enfocado: ${item.label} (${item.id})`)}
        >
          <span>{item.icon}</span> {item.label}
        </button>
      ))}
    </div>
  );
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
  onNavigate,
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
          <div className="relative group-hover:scale-105 transition-transform w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-[#05070a] border border-zinc-800 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <img
              src="/logo_icon.png"
              alt="Calix TV"
              className="w-full h-full object-cover"
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

      {/* Center: Direct Access Navigation Shortcuts (TV & Tablet) */}
      {viewMode !== 'mobile' && onNavigate && (
        <TopNavButtons onNavigate={onNavigate} />
      )}

      {/* Right: Status, Clock, Admin Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
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

        {/* Remote Control HUD Toggle (Solo si hay onOpenRemote) */}
        {onOpenRemote && (
          <button
            onClick={onOpenRemote}
            className="tv-focusable p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-cyan-400 rounded-lg transition cursor-pointer flex items-center gap-1"
            title="Abrir Control Remoto Virtual"
          >
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline text-xs font-medium">Control</span>
          </button>
        )}

        {/* Admin Settings Button */}
        <button
          onClick={onOpenSettings}
          className="tv-focusable p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white rounded-lg transition cursor-pointer"
          title="Administración"
        >
          <Settings className="w-4 h-4 text-zinc-300 hover:text-cyan-400" />
        </button>

        {/* Logout Button */}
        {userInfo && (
          <button
            onClick={onLogout}
            className="tv-focusable px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900/90 border border-rose-800/80 text-rose-300 hover:text-white rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md"
            title="Salir"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        )}
      </div>
    </header>
  );
};
