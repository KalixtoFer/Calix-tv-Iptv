import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Smartphone,
  Tv,
  Monitor,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { CentralizedConfig, DeviceViewMode, XtreamAuthResponse } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface LoginScreenProps {
  config: CentralizedConfig;
  viewMode: DeviceViewMode;
  onChangeViewMode: (mode: DeviceViewMode) => void;
  onLoginSuccess: (auth: XtreamAuthResponse, username: string) => void;
  onOpenAdmin: () => void;
  onEnterGuest: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  config,
  viewMode,
  onChangeViewMode,
  onLoginSuccess,
  onOpenAdmin,
  onEnterGuest,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [preloadStatus, setPreloadStatus] = useState<string>('');
  const [preloadPercent, setPreloadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    // Auto-detect Admin login: if admin credentials typed in main form, open Admin Panel
    if (
      (u === 'admin' || u === 'kalixgaming123@gmail.com' || u === 'kalix' || u === 'calix') &&
      (p === 'CalixTvAdmin2026!' || p === 'admin' || p === 'admin123')
    ) {
      onOpenAdmin();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setPreloadStatus('Verificando credenciales con Calix TV...');
    setPreloadPercent(10);

    try {
      const auth = await iptvApi.login(username.trim(), password.trim());
      if (auth.user_info.status !== 'Active') {
        throw new Error(
          `La cuenta se encuentra en estado: ${auth.user_info.status}. Comuníquese con su proveedor.`
        );
      }

      // Preload initial catalogs to avoid freezes on movies and series
      setPreloadStatus('Cargando catálogo inicial sin cortes...');
      setPreloadPercent(30);

      await iptvApi.preloadInitialData(username.trim(), (msg, pct) => {
        setPreloadStatus(msg);
        setPreloadPercent(pct);
      });

      onLoginSuccess(auth, username.trim());
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'No se pudo conectar con el servidor IPTV centralizado. Verifique sus credenciales.'
      );
    } finally {
      setIsLoading(false);
      setPreloadStatus('');
      setPreloadPercent(0);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#06070a] relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Login Card */}
      <div className="w-full max-w-md bg-zinc-950/85 backdrop-blur-2xl border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Device Profile Switcher (Celular y Android TV) */}
        <div className="flex flex-col items-center gap-1.5 pb-1 border-b border-zinc-800/60">
          <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Selecciona tu dispositivo:
          </span>
          <div className="grid grid-cols-2 gap-2 w-full bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => onChangeViewMode('mobile')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Celular</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('tv')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                viewMode === 'tv'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Android TV</span>
            </button>
          </div>
        </div>

        {/* Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <div className="h-24 sm:h-28 aspect-square rounded-3xl overflow-hidden bg-[#05070a] border-2 border-zinc-800 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
              <img
                src="/logo_icon.png"
                alt="Calix TV"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <p className="text-[10px] text-cyan-400/60 font-bold tracking-[4px] uppercase mt-2">
            Versión 1.0 • {viewMode === 'mobile' ? 'Móvil' : 'Android TV'}
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Preload / Synchronization Progress Bar */}
        {isLoading && (
          <div className="p-3.5 bg-cyan-950/40 border border-cyan-800/80 rounded-2xl space-y-2 text-center animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
              <span className="truncate">{preloadStatus || 'Conectando con el servidor...'}</span>
              <span>{preloadPercent}%</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-700/60">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${preloadPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" /> Usuario
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario IPTV..."
                disabled={isLoading}
                autoFocus
                className="tv-focusable w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña..."
                disabled={isLoading}
                className="tv-focusable w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Recordar sesión</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="tv-focusable w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Sincronizando Catálogo...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>INGRESAR AL SERVICIO [OK]</span>
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-center text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Conexión Directa Encriptada SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
