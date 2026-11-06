import React from 'react';
import { Download, Sparkles, X, AlertTriangle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NativePlayer, canUseNativePlayer } from '../services/nativePlayer';

interface AppUpdateModalProps {
  updateInfo: {
    latestVersion: string;
    currentVersion: string;
    apkDownloadUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
  };
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ updateInfo, onClose }) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (canUseNativePlayer() && NativePlayer.requestNotificationPermission) {
      NativePlayer.requestNotificationPermission().catch(() => {});
    }
  }, []);

  const handleDownload = async () => {
    setIsProcessing(true);
    setStatusMessage('Iniciando descarga de la actualización...');

    const rawUrl = updateInfo.apkDownloadUrl || '/api/iptv/download-apk';
    const downloadUrl = rawUrl.startsWith('http') ? rawUrl : window.location.origin + rawUrl;
    const filename = `CalixTV-v${updateInfo.latestVersion}.apk`;

    // 1. Check if running inside native Android app with NativePlayer plugin
    if (canUseNativePlayer() && NativePlayer.installApk) {
      try {
        setStatusMessage('Descargando en segundo plano vía Android DownloadManager...');
        await NativePlayer.installApk({
          url: downloadUrl,
          filename,
        });
        setStatusMessage('¡Descarga en progreso! Revisa la barra de notificaciones para abrir el instalador.');
        setIsProcessing(false);
        return;
      } catch (err) {
        console.warn('Native install error, trying fallback:', err);
      }
    }

    // 2. Fallback to system browser or direct download
    try {
      if (Capacitor.isNativePlatform()) {
        window.open(downloadUrl, '_system') || (window.location.href = downloadUrl);
      } else {
        window.open(downloadUrl, '_blank');
      }
      setStatusMessage('Descarga iniciada en tu navegador/descargas.');
    } catch {
      window.location.href = downloadUrl;
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base">Nueva Versión Calix TV</span>
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full">
                  v{updateInfo.latestVersion}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Tu versión instalada: <span className="font-mono text-zinc-300">v{updateInfo.currentVersion}</span>
              </p>
            </div>
          </div>

          {!updateInfo.forceUpdate && (
            <button
              onClick={onClose}
              className="tv-focusable p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Release Notes */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Novedades de la actualización</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
            {updateInfo.releaseNotes || 'Mejoras de rendimiento, estabilidad de streaming y compatibilidad con Android TV.'}
          </p>
        </div>

        {updateInfo.forceUpdate && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Esta actualización es obligatoria para continuar disfrutando del servicio.</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 bg-cyan-950/60 border border-cyan-800 rounded-xl text-cyan-300 text-xs flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-cyan-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {!updateInfo.forceUpdate && (
            <button
              onClick={onClose}
              className="tv-focusable flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Recordar más tarde
            </button>
          )}

          <button
            onClick={handleDownload}
            className="tv-focusable flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <span>Descargar e Instalar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
