import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Tv,
  FileCode,
  CheckCircle2,
  Terminal,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  Cpu,
  Package,
  ShieldCheck,
  Play,
  Copy,
  Check,
  Github,
} from 'lucide-react';

interface ApkExportGuideModalProps {
  onClose: () => void;
}

export const ApkExportGuideModal: React.FC<ApkExportGuideModalProps> = ({ onClose }) => {
  const [copiedGit, setCopiedGit] = useState<boolean>(false);
  const [androidStatus, setAndroidStatus] = useState<{
    androidProjectReady: boolean;
    zipAvailable: boolean;
    zipSizeMb: number;
    packageId: string;
    appName: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/iptv/android-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAndroidStatus(data);
        }
      })
      .catch(console.error);
  }, []);

  const gitCommands = `git init
git add .
git commit -m "Nexus IPTV Pro Android TV APK"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main`;

  const copyGitCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Github className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Compilar APK desde GitHub Actions
                </h2>
                <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-400 font-mono text-[10px] font-bold rounded">
                  WORKFLOW .YML LISTO
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                GitHub compilará el archivo APK de Android TV en sus servidores en la nube de forma 100% gratuita
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="tv-focusable p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-zinc-300 text-xs sm:text-sm">
          {/* Card 1: Main Action - Download GitHub Ready Project */}
          <div className="p-5 bg-gradient-to-r from-cyan-950/40 via-zinc-900/90 to-blue-950/30 border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-cyan-400 font-extrabold text-sm sm:text-base">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>Todo el Código Preparado para GitHub con 1 Clic</span>
              </div>
              <p className="text-xs text-zinc-300 max-w-lg">
                El archivo descargable ya incluye la carpeta <strong className="text-white">.github/workflows/build-apk.yml</strong>, la carpeta <strong className="text-white">android/</strong> con soporte Leanback TV y todos los scripts de compilación automática.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 text-[11px] font-mono text-zinc-400">
                <span>Archivo: nexus-iptv-pro-github-ready.zip</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">~0.68 MB</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <a
                href="/api/iptv/download-github-repo"
                download="nexus-iptv-pro-github-ready.zip"
                className="tv-focusable px-5 py-3.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-extrabold text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95 whitespace-nowrap"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>DESCARGAR PARA GITHUB (ZIP)</span>
              </a>
            </div>
          </div>

          {/* Card 2: 4 Steps on GitHub */}
          <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Github className="w-4 h-4 text-cyan-400" />
              <span>Pasos para obtener tu APK en GitHub:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Step 1 */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Crear Repositorio</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Entra a <strong className="text-zinc-200">github.com</strong> y crea un nuevo repositorio (por ejemplo: <strong className="text-cyan-300">nexus-iptv-pro</strong>).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-2">
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 font-mono font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Subir los Archivos</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Descomprime el ZIP y sube todos los archivos a tu repositorio (arrastrando a GitHub o usando Git en terminal).
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm">GitHub Compila el APK</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Ve a la pestaña <strong className="text-zinc-200">"Actions"</strong> en GitHub. Verás el proceso <strong className="text-amber-300">"Compilar APK para Android TV"</strong> ejecutándose.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                  4
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Descargar el APK Listo</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  En 2 minutos terminará con un check verde ✅. Entra y en la sección <strong className="text-emerald-300">Artifacts</strong> descarga el archivo <strong className="text-white">CalixTV-v1.0-APK</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Git Terminal Commands */}
          <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Comandos para subir a GitHub por terminal (Opcional):</span>
              </div>
              <button
                onClick={copyGitCommands}
                className="tv-focusable text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer transition"
              >
                {copiedGit ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Comandos</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 bg-black/90 rounded-xl font-mono text-[11px] sm:text-xs text-emerald-400 overflow-x-auto border border-zinc-800 leading-relaxed">
              {gitCommands}
            </pre>
          </div>

          {/* Card 4: Alternative Local Android Studio Download */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="text-zinc-300 font-semibold">¿Prefieres compilar en tu computadora con Android Studio?</div>
              <div className="text-zinc-400 text-[11px]">Puedes descargar directamente la carpeta del proyecto Android nativo.</div>
            </div>
            <a
              href="/api/iptv/download-android-zip"
              download="nexus-iptv-pro-android.zip"
              className="tv-focusable px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-semibold cursor-pointer shrink-0 transition"
            >
              Descargar Solo Android Studio ZIP
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Compatible con Android 8.0 hasta Android 15 (Android TV, Firestick y Celulares).
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="tv-focusable px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
