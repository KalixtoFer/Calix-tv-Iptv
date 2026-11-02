import React, { useState } from 'react';
import {
  Lock,
  X,
  Server,
  Activity,
  Sliders,
  Bell,
  Image,
  Tv,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import { CentralizedConfig, BannerItem } from '../types/iptv';
import { iptvApi } from '../services/iptvApi';

interface AdminPanelModalProps {
  initialConfig: CentralizedConfig;
  onClose: () => void;
  onConfigSaved: (newConfig: CentralizedConfig) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  initialConfig,
  onClose,
  onConfigSaved,
}) => {
  const [pin, setPin] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Form State
  const [activeTab, setActiveTab] = useState<'server' | 'banners' | 'featured' | 'notice'>('server');
  const [config, setConfig] = useState<CentralizedConfig>({ ...initialConfig });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Ping test
  const [isTestingServer, setIsTestingServer] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  // Handle PIN verification
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setPinError(null);

    const res = await iptvApi.verifyAdminPin(pin);
    setIsVerifying(false);

    if (res.success && res.authorized) {
      setIsAuthorized(true);
      if (res.fullConfig) {
        setConfig(res.fullConfig);
      }
    } else {
      setPinError('PIN de Administrador incorrecto. (PIN predeterminado: 8888)');
    }
  };

  // Test Server Connection
  const handleTestConnection = async () => {
    setIsTestingServer(true);
    setTestResult(null);

    const result = await iptvApi.testServer(config.serverUrl);
    setIsTestingServer(false);
    setTestResult(result);
  };

  // Save Configuration to Centralized Backend
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(null);

    const res = await iptvApi.saveAdminConfig(pin, config);
    setIsSaving(false);

    if (res.success) {
      setSaveSuccess('¡Configuración centralizada guardada con éxito en el servidor!');
      if (res.config) {
        onConfigSaved(res.config);
      }
      setTimeout(() => setSaveSuccess(null), 4000);
    } else {
      alert('Error al guardar configuración: ' + res.message);
    }
  };

  // Banner Management
  const handleAddBanner = () => {
    const newBanner: BannerItem = {
      id: 'b_' + Date.now(),
      title: 'NUEVA TRANSMISIÓN DESTACADA',
      subtitle: 'Descripción del evento o contenido especial disponible.',
      badge: 'DESTACADO',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
      tagColor: '#06b6d4',
      actionSection: 'live',
    };
    setConfig((prev) => ({
      ...prev,
      banners: [...prev.banners, newBanner],
    }));
  };

  const handleUpdateBanner = (index: number, field: keyof BannerItem, value: string) => {
    setConfig((prev) => {
      const updated = [...prev.banners];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, banners: updated };
    });
  };

  const handleDeleteBanner = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      banners: prev.banners.filter((_, i) => i !== index),
    }));
  };

  // Export / Import
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', 'nexus-iptv-config.json');
    dlAnchorElem.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Panel de Administración Centralizado
              </h2>
              <p className="text-xs text-zinc-400">
                Gestión remota de servidor Xtream Codes, banners y contenido destacado
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

        {/* PIN Verification View */}
        {!isAuthorized ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <Lock className="w-10 h-10 text-cyan-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Autenticación de Administrador</h3>
              <p className="text-xs text-zinc-400 max-w-md">
                Ingrese el código PIN maestro para modificar la configuración centralizada del servicio IPTV.
              </p>
            </div>

            {pinError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl max-w-sm">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="w-full max-w-xs space-y-4">
              <input
                type="password"
                placeholder="PIN Maestro (ej. 8888)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={8}
                autoFocus
                className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg tracking-widest text-white font-mono focus:outline-none focus:border-cyan-400"
              />

              <button
                type="submit"
                disabled={isVerifying}
                className="tv-focusable w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? 'Verificando...' : 'Acceder al Panel'}
              </button>

              <div className="text-[11px] text-zinc-400">
                PIN predeterminado de fábrica: <span className="font-mono text-cyan-400">8888</span>
              </div>
            </form>
          </div>
        ) : (
          /* Authorized Panel Content */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs Bar */}
            <div className="px-6 py-2.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between overflow-x-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('server')}
                  className={`tv-focusable px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'server'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" /> Servidor Xtream
                </button>

                <button
                  onClick={() => setActiveTab('banners')}
                  className={`tv-focusable px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'banners'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Image className="w-3.5 h-3.5" /> Banners de Inicio
                </button>

                <button
                  onClick={() => setActiveTab('featured')}
                  className={`tv-focusable px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'featured'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" /> Canal Destacado
                </button>

                <button
                  onClick={() => setActiveTab('notice')}
                  className={`tv-focusable px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'notice'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" /> Comunicado
                </button>
              </div>

              <button
                onClick={handleExportJSON}
                className="tv-focusable text-zinc-400 hover:text-cyan-400 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 ml-4"
                title="Exportar configuración en formato JSON"
              >
                <Download className="w-3.5 h-3.5" /> Exportar JSON
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {saveSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {/* 1. SERVER TAB */}
              {activeTab === 'server' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      URL del Servidor Xtream Codes (Dominio / IP)
                    </label>
                    <p className="text-xs text-zinc-400">
                      Esta dirección se almacena en el backend centralizado. Los clientes nunca tendrán que escribirla.
                    </p>
                    <input
                      type="text"
                      value={config.serverUrl}
                      onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                      placeholder="ej. http://line.myiptvservice.com:8080"
                      className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Puerto
                      </label>
                      <input
                        type="text"
                        value={config.serverPort}
                        onChange={(e) => setConfig({ ...config, serverPort: e.target.value })}
                        placeholder="ej. 8080"
                        className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Protocolo
                      </label>
                      <select
                        value={config.serverProtocol}
                        onChange={(e) =>
                          setConfig({ ...config, serverProtocol: e.target.value as 'http' | 'https' })
                        }
                        className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Nombre Comercial del Servicio
                    </label>
                    <input
                      type="text"
                      value={config.serviceName}
                      onChange={(e) => setConfig({ ...config, serviceName: e.target.value })}
                      className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Ping Test Button & Results */}
                  <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <span>Prueba de Conectividad con el Proveedor</span>
                      </div>
                      <button
                        onClick={handleTestConnection}
                        disabled={isTestingServer}
                        className="tv-focusable px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isTestingServer ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...
                          </>
                        ) : (
                          'Probar Ping al Servidor'
                        )}
                      </button>
                    </div>

                    {testResult && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                          testResult.success
                            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                            : 'bg-rose-950/80 border-rose-800 text-rose-300'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. BANNERS TAB */}
              {activeTab === 'banners' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Banners Promocionales de Inicio</h4>
                      <p className="text-xs text-zinc-400">
                        Se muestran en el cuadrante derecho de la pantalla principal.
                      </p>
                    </div>
                    <button
                      onClick={handleAddBanner}
                      className="tv-focusable px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Banner
                    </button>
                  </div>

                  <div className="space-y-4">
                    {config.banners.map((banner, idx) => (
                      <div
                        key={banner.id || idx}
                        className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            Banner #{idx + 1}
                          </span>
                          <button
                            onClick={() => handleDeleteBanner(idx)}
                            className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                            title="Eliminar banner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase">
                              Título Principal
                            </label>
                            <input
                              type="text"
                              value={banner.title}
                              onChange={(e) => handleUpdateBanner(idx, 'title', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase">
                              Etiqueta / Badge
                            </label>
                            <input
                              type="text"
                              value={banner.badge}
                              onChange={(e) => handleUpdateBanner(idx, 'badge', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase">
                            Subtítulo / Descripción
                          </label>
                          <input
                            type="text"
                            value={banner.subtitle}
                            onChange={(e) => handleUpdateBanner(idx, 'subtitle', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase">
                            URL de Imagen de Fondo
                          </label>
                          <input
                            type="text"
                            value={banner.imageUrl}
                            onChange={(e) => handleUpdateBanner(idx, 'imageUrl', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. FEATURED STREAM TAB */}
              {activeTab === 'featured' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Nombre del Canal Destacado en Inicio
                    </label>
                    <input
                      type="text"
                      value={config.featuredStream?.name || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          featuredStream: { ...config.featuredStream, name: e.target.value },
                        })
                      }
                      className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      URL del Flujo de Video (HLS .m3u8 o MP4)
                    </label>
                    <input
                      type="text"
                      value={config.featuredStream?.streamUrl || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          featuredStream: { ...config.featuredStream, streamUrl: e.target.value },
                        })
                      }
                      className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Categoría
                      </label>
                      <input
                        type="text"
                        value={config.featuredStream?.category || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            featuredStream: { ...config.featuredStream, category: e.target.value },
                          })
                        }
                        className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Resolución
                      </label>
                      <input
                        type="text"
                        value={config.featuredStream?.resolution || 'FHD 1080p'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            featuredStream: { ...config.featuredStream, resolution: e.target.value },
                          })
                        }
                        className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. NOTICE TAB */}
              {activeTab === 'notice' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showAnnouncement"
                      checked={config.showAnnouncement}
                      onChange={(e) =>
                        setConfig({ ...config, showAnnouncement: e.target.checked })
                      }
                      className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 w-4 h-4 cursor-pointer"
                    />
                    <label
                      htmlFor="showAnnouncement"
                      className="text-sm font-bold text-white cursor-pointer"
                    >
                      Mostrar cintillo de aviso en la pantalla principal
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Mensaje de Aviso / Mantenimiento / Novedad
                    </label>
                    <textarea
                      rows={3}
                      value={config.announcement}
                      onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                      placeholder="Escribe el mensaje que verán todos los clientes..."
                      className="tv-focusable w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="p-4 sm:p-5 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Los cambios se aplican inmediatamente para todas las instalaciones.
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="tv-focusable px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="tv-focusable px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition transform active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios [OK]</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
