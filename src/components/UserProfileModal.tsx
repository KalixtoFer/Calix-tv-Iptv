import React from 'react';
import {
  User,
  Calendar,
  Clock,
  ShieldCheck,
  Tv,
  LogOut,
  X,
  Smartphone,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { XtreamUserInfo } from '../types/iptv';

interface UserProfileModalProps {
  userInfo: XtreamUserInfo | null;
  serverUrl?: string;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdminPanel?: () => void;
  viewMode: 'tv' | 'mobile' | 'web';
  onChangeViewMode: (mode: 'tv' | 'mobile') => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userInfo,
  serverUrl = '',
  onClose,
  onLogout,
  onOpenAdminPanel,
  viewMode,
  onChangeViewMode,
}) => {
  // 1. Format Expiration Date
  const formatExpDate = (expTimestamp?: string) => {
    if (!expTimestamp) return { text: 'Ilimitado (Sin Vencimiento)', daysLeft: null };
    const ts = parseInt(expTimestamp, 10);
    if (isNaN(ts) || ts <= 0 || ts > 2147483647) return { text: 'Ilimitado (Sin Vencimiento)', daysLeft: null };

    const date = new Date(ts * 1000);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      text: formattedDate,
      shortDate: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      isExpired: daysLeft <= 0,
    };
  };

  // 2. Format Creation Date
  const formatCreationDate = (createdTimestamp?: string) => {
    if (!createdTimestamp) return 'No disponible';
    const ts = parseInt(createdTimestamp, 10);
    if (isNaN(ts) || ts <= 0) return 'No disponible';
    const date = new Date(ts * 1000);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const expInfo = formatExpDate(userInfo?.exp_date);
  const createdDateStr = formatCreationDate(userInfo?.created_at);
  const isDemoUser = userInfo?.username?.toLowerCase().includes('invitado') || userInfo?.username?.toLowerCase() === 'demo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-[#0a0d14] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col">
        {/* Background ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Modal Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#05070a] border border-zinc-800 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <img
                src="/logo_icon.png"
                alt="Calix TV"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide uppercase leading-tight">
                Mi Cuenta • Perfil
              </h2>
              <span className="text-[10px] font-bold text-cyan-400 tracking-wider">
                Datos de tu Suscripción Digital
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="tv-focusable p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 relative z-10 overflow-y-auto max-h-[75vh]">
          {/* User Status Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-cyan-950/40 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/80 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">
                  Usuario Activo
                </span>
                <span className="text-lg font-black text-white tracking-wide block">
                  @{userInfo?.username || 'Invitado'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-950/90 text-emerald-400 border border-emerald-700/80 inline-flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isDemoUser ? 'Modo Prueba' : userInfo?.status || 'Activa'}
              </span>
            </div>
          </div>

          {/* Expiration Date Highlight Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900/80 to-blue-950/30 border border-cyan-500/40 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Vencimiento de la Cuenta
              </span>
              {expInfo.daysLeft !== null && (
                <span className={`px-2.5 py-0.5 rounded-md font-mono text-[11px] font-black uppercase border ${
                  expInfo.daysLeft > 15
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : expInfo.daysLeft > 0
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700'
                }`}>
                  {expInfo.daysLeft > 0 ? `${expInfo.daysLeft} días restantes` : 'Expirada'}
                </span>
              )}
            </div>

            <div className="text-lg sm:text-xl font-black text-white capitalize tracking-wide font-mono">
              {expInfo.text}
            </div>

            <p className="text-[11px] text-zinc-400 font-medium">
              Tu servicio se renueva automáticamente según el plan contratado con tu proveedor.
            </p>
          </div>

          {/* Subscription Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-cyan-400" /> Dispositivos
              </span>
              <span className="text-sm font-black text-white block">
                {userInfo?.active_cons || '1'} de {userInfo?.max_connections || '1'} pantalla(s)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Alta de Cuenta
              </span>
              <span className="text-sm font-black text-white block font-mono">
                {createdDateStr}
              </span>
            </div>
          </div>

          {/* Tipo de dispositivo (Ajustes con navegación D-pad y soporte táctil) */}
          <div className="setting-row p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-cyan-400" /> Tipo de dispositivo
              </span>
              <span className="text-[11px] font-semibold text-cyan-400 font-mono">
                {viewMode === 'mobile' ? '📱 Celular Activo' : '📺 Android TV Activo'}
              </span>
            </div>
            
            <div className="segmented grid grid-cols-2 gap-2 p-1.5 bg-zinc-950 rounded-xl border border-zinc-800/80">
              <button
                tabIndex={0}
                onClick={() => {
                  try {
                    localStorage.setItem('deviceMode', 'mobile');
                    localStorage.setItem('calixtv_device_mode', 'mobile');
                  } catch {}
                  if (typeof document !== 'undefined') {
                    document.documentElement.classList.toggle('tv-mode', false);
                    document.documentElement.classList.toggle('mobile-mode', true);
                  }
                  onChangeViewMode('mobile');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    try {
                      localStorage.setItem('deviceMode', 'mobile');
                      localStorage.setItem('calixtv_device_mode', 'mobile');
                    } catch {}
                    if (typeof document !== 'undefined') {
                      document.documentElement.classList.toggle('tv-mode', false);
                      document.documentElement.classList.toggle('mobile-mode', true);
                    }
                    onChangeViewMode('mobile');
                  }
                }}
                className={`tv-focusable py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer outline-none focus:ring-2 focus:ring-cyan-400 focus:scale-[1.02] ${
                  viewMode === 'mobile'
                    ? 'active bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/30'
                    : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800/80'
                }`}
                title="Cambiar a Modo Celular"
              >
                <Smartphone className="w-4 h-4" />
                <span>📱 Celular</span>
              </button>

              <button
                tabIndex={0}
                onClick={() => {
                  try {
                    localStorage.setItem('deviceMode', 'tv');
                    localStorage.setItem('calixtv_device_mode', 'tv');
                  } catch {}
                  if (typeof document !== 'undefined') {
                    document.documentElement.classList.toggle('tv-mode', true);
                    document.documentElement.classList.toggle('mobile-mode', false);
                  }
                  onChangeViewMode('tv');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    try {
                      localStorage.setItem('deviceMode', 'tv');
                      localStorage.setItem('calixtv_device_mode', 'tv');
                    } catch {}
                    if (typeof document !== 'undefined') {
                      document.documentElement.classList.toggle('tv-mode', true);
                      document.documentElement.classList.toggle('mobile-mode', false);
                    }
                    onChangeViewMode('tv');
                  }
                }}
                className={`tv-focusable py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer outline-none focus:ring-2 focus:ring-cyan-400 focus:scale-[1.02] ${
                  viewMode === 'tv'
                    ? 'active bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/30'
                    : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800/80'
                }`}
                title="Cambiar a Modo Android TV"
              >
                <Tv className="w-4 h-4" />
                <span>📺 Android TV</span>
              </button>
            </div>
          </div>

          {/* Connection Security Status */}
          <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Servidor Seguro Calix TV SSL</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-500 truncate max-w-[150px]">
              {serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'Conexión Directa'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="tv-focusable w-full py-3.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-200 hover:text-white font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>CERRAR SESIÓN DE ESTE DISPOSITIVO</span>
            </button>

            {onOpenAdminPanel && (
              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminPanel();
                  }}
                  className="text-[11px] font-bold text-zinc-500 hover:text-cyan-400 transition cursor-pointer inline-flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Configuración de Servidor (Administración)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
