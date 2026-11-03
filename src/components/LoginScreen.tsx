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
} from 'lucide-react';
import { CentralizedConfig, XtreamAuthResponse } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface LoginScreenProps {
  config: CentralizedConfig;
  onLoginSuccess: (auth: XtreamAuthResponse, username: string) => void;
  onOpenAdmin: () => void;
  onEnterGuest: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  config,
  onLoginSuccess,
  onOpenAdmin,
  onEnterGuest,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const auth = await iptvApi.login(username.trim(), password.trim());
      if (auth.user_info.status !== 'Active') {
        throw new Error(
          `La cuenta se encuentra en estado: ${auth.user_info.status}. Comuníquese con su proveedor.`
        );
      }
      onLoginSuccess(auth, username.trim());
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'No se pudo conectar con el servidor IPTV centralizado. Verifique sus credenciales.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#06070a] relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Login Card */}
      <div className="w-full max-w-md bg-zinc-950/85 backdrop-blur-2xl border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <img
              src="/logo.png"
              alt="Calix TV"
              className="h-20 sm:h-24 w-auto object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            CALIX TV
          </h1>
          <p className="text-xs text-cyan-400 font-semibold tracking-wide">
            Tu Servicio Digital • Versión 1.0
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
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
                <span>Validando Credenciales...</span>
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
            <span>Conexión Encriptada SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
