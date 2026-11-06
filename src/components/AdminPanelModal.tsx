import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Smartphone,
  KeyRound,
  UserCheck,
  Sparkles,
  ExternalLink,
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
  // Login form state (Strict username + password authentication)
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<{ username: string; email: string; name: string; role: string } | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'server' | 'update' | 'security' | 'banners' | 'featured' | 'notice'>('server');
  const [config, setConfig] = useState<CentralizedConfig>({
    ...initialConfig,
    appUpdate: initialConfig.appUpdate || {
      latestVersion: '1.0',
      minVersion: '1.0',
      apkDownloadUrl: (initialConfig.appUpdate as any)?.apkDownloadUrl || 'https://github.com/KalixtoFer/calixtvapp/releases/latest/download/CalixTV.apk',
      releaseNotes: 'Versión inicial oficial de Calix TV (v1.0) con diseño fluido para Android TV y móviles.',
      forceUpdate: false,
      publishedAt: '2026-11-05',
    },
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Ping test state
  const [isTestingServer, setIsTestingServer] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  // Security Audit state
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<{
    score: number;
    status: string;
    checks: Array<{ id: string; title: string; status: 'passed' | 'warning' | 'failed'; description: string; recommendation: string }>;
  } | null>(null);

  // Credential update state
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [credMessage, setCredMessage] = useState<string | null>(null);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState<boolean>(false);

  // Direct APK Upload & OTA Distribution state
  const [selectedApkFile, setSelectedApkFile] = useState<File | null>(null);
  const [apkVersion, setApkVersion] = useState<string>(config.appUpdate?.latestVersion || '1.1');
  const [apkNotes, setApkNotes] = useState<string>(
    config.appUpdate?.releaseNotes || 'Mejoras de rendimiento en reproducción 4K/FHD, estabilidad y soporte para Android TV.'
  );
  const [apkForceUpdate, setApkForceUpdate] = useState<boolean>(config.appUpdate?.forceUpdate || false);
  const [isUploadingApk, setIsUploadingApk] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    filename: string;
    sizeFormatted: string;
    version: string;
    sha256: string;
    downloadUrl?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.apk')) {
        alert('Por favor selecciona un archivo con extensión .apk');
        return;
      }
      setSelectedApkFile(file);
      // Try to auto-detect version from file name
      const match = file.name.match(/v?(\d+\.\d+(\.\d+)?)/i);
      if (match && match[1]) {
        setApkVersion(match[1]);
      }
    }
  };

  const handleUploadApk = async () => {
    if (!selectedApkFile) {
      alert('Por favor selecciona primero un archivo APK desde tu celular o computadora.');
      return;
    }
    setIsUploadingApk(true);
    setUploadProgress(0);
    setUploadSuccess(null);

    const res = await iptvApi.uploadApk({
      file: selectedApkFile,
      version: apkVersion || '1.1',
      notes: apkNotes,
      forceUpdate: apkForceUpdate,
      onProgress: (pct) => setUploadProgress(pct),
    });

    setIsUploadingApk(false);

    if (res.success) {
      setUploadSuccess(res.message);
      if (res.fileInfo) {
        setUploadedFileInfo(res.fileInfo);
      }
      if (res.config) {
        setConfig(res.config);
        onConfigSaved(res.config);
      }
      setTimeout(() => setUploadSuccess(null), 8000);
    } else {
      alert('Error al subir APK: ' + res.message);
    }
  };

  // Handle Admin Login (Strict User & Password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setAuthError(null);

    const res = await iptvApi.verifyAdmin({ username, password });
    setIsVerifying(false);

    if (res.success && res.authorized) {
      setIsAuthorized(true);
      if (res.adminUser) {
        setAdminUser(res.adminUser);
        setNewUsername(res.adminUser.username);
        setNewEmail(res.adminUser.email);
      }
      if (res.fullConfig) {
        setConfig({
          ...res.fullConfig,
          appUpdate: res.fullConfig.appUpdate || {
            latestVersion: '1.0',
            minVersion: '1.0',
            apkDownloadUrl: '',
            releaseNotes: 'Versión oficial de Calix TV.',
            forceUpdate: false,
          },
        });
      }
      // Run security audit automatically on login
      runAudit();
    } else {
      setAuthError(res.message || 'Usuario o contraseña de administrador incorrectos.');
    }
  };

  // Run Security Audit
  const runAudit = async () => {
    setIsRunningAudit(true);
    try {
      const data = await iptvApi.getSecurityAudit();
      if (data.success) {
        setAuditResult(data);
      }
    } catch (e) {
      console.warn('Audit error:', e);
    } finally {
      setIsRunningAudit(false);
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

  // Save Centralized Configuration
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(null);

    const res = await iptvApi.saveAdminConfig(config);
    setIsSaving(false);

    if (res.success) {
      setSaveSuccess('¡Configuración centralizada guardada exitosamente!');
      if (res.config) {
        onConfigSaved(res.config);
      }
      setTimeout(() => setSaveSuccess(null), 4000);
    } else {
      alert('Error al guardar configuración: ' + res.message);
    }
  };

  // Update Admin Credentials
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCreds(true);
    setCredMessage(null);

    const res = await iptvApi.updateAdminCredentials({
      newUsername: newUsername || undefined,
      newPassword: newPassword || undefined,
      newEmail: newEmail || undefined,
    });
    setIsUpdatingCreds(false);

    if (res.success) {
      setCredMessage('¡Credenciales de administrador actualizadas correctamente!');
      if (res.adminUser) {
        setAdminUser(res.adminUser);
      }
      setNewPassword('');
      runAudit();
      setTimeout(() => setCredMessage(null), 4000);
    } else {
      setCredMessage(res.message || 'Error al actualizar credenciales.');
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

  const handleRemoveBanner = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      banners: prev.banners.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base sm:text-lg tracking-wide uppercase">
                  Panel Administrador Calix TV
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Control Centralizado
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Gestión remota de servidor, actualizaciones móviles y seguridad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthorized && adminUser && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800 text-xs text-zinc-300">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-white">@{adminUser.username}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded">
                  {adminUser.role}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="tv-focusable p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            CASO 1: Formulario de Autenticación de Administrador
           ======================================================== */}
        {!isAuthorized ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center my-auto space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/10">
              <KeyRound className="w-8 h-8 animate-pulse" />
            </div>

            <div className="text-center space-y-1 max-w-md">
              <h4 className="text-lg font-bold text-white">Acceso de Administrador</h4>
              <p className="text-xs text-zinc-400">
                Inicia sesión con tu cuenta de usuario y contraseña de administrador para gestionar tu servicio IPTV.
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Usuario Administrador</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              {authError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="tv-focusable w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Ingresar al Panel de Control</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ========================================================
              CASO 2: Panel de Administración Autorizado
             ======================================================== */
          <>
            {/* Navegación por Pestañas */}
            <div className="px-5 pt-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('server')}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'server'
                    ? 'bg-zinc-950 text-cyan-400 border-t-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>1. Servidor IPTV</span>
              </button>

              <button
                onClick={() => setActiveTab('update')}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'update'
                    ? 'bg-zinc-950 text-cyan-400 border-t-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>2. Actualizar App (OTA)</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'security'
                    ? 'bg-zinc-950 text-cyan-400 border-t-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>3. Seguridad & Credenciales</span>
              </button>

              <button
                onClick={() => setActiveTab('notice')}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'notice'
                    ? 'bg-zinc-950 text-cyan-400 border-t-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>4. Mensajes & Anuncios</span>
              </button>

              <button
                onClick={() => setActiveTab('featured')}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'featured'
                    ? 'bg-zinc-950 text-cyan-400 border-t-2 border-cyan-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>5. Canal Destacado</span>
              </button>
            </div>

            {/* Contenido de la Pestaña Activa */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {/* ----------------------------------------------------
                  TAB 1: Servidor IPTV
                 ---------------------------------------------------- */}
              {activeTab === 'server' && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <span>URL del Servidor Centralizado Xtream Codes</span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Tus usuarios nunca tendrán que escribir este servidor. Si tu proveedor cambia de dominio o IP, lo cambias aquí y se actualiza al instante en todos los celulares y televisores.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                      <div className="sm:col-span-8 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">URL o IP del Servidor</label>
                        <input
                          type="text"
                          value={config.serverUrl}
                          onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                          placeholder="https://sneoplus.net:8443"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">Puerto</label>
                        <input
                          type="text"
                          value={config.serverPort}
                          onChange={(e) => setConfig({ ...config, serverPort: e.target.value })}
                          placeholder="8443 o 8080"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-xs text-zinc-300 font-semibold">Nombre del Servicio / Marca</label>
                      <input
                        type="text"
                        value={config.serviceName}
                        onChange={(e) => setConfig({ ...config, serviceName: e.target.value })}
                        placeholder="Calix TV"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTestingServer}
                        className="tv-focusable px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        {isTestingServer ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Midiendo latencia...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Probar Conexión & Ping</span>
                          </>
                        )}
                      </button>

                      {testResult && (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${
                            testResult.success
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {testResult.success
                            ? `En línea: ${testResult.latencyMs}ms de latencia`
                            : 'Servidor no respondió'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  TAB 2: Actualizaciones Remotas de la App (OTA) & Subida de APK
                 ---------------------------------------------------- */}
              {activeTab === 'update' && (
                <div className="space-y-5">
                  {/* Mensaje de Éxito de Subida */}
                  {uploadSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs space-y-1 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                        <span>¡Actualización Distribuida Exitosamente!</span>
                      </div>
                      <p className="text-zinc-300 text-xs">
                        {uploadSuccess}
                      </p>
                      {uploadedFileInfo && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300">
                          <div><span className="text-zinc-500">Archivo:</span> {uploadedFileInfo.filename}</div>
                          <div><span className="text-zinc-500">Tamaño:</span> {uploadedFileInfo.sizeFormatted}</div>
                          <div><span className="text-zinc-500">Versión:</span> v{uploadedFileInfo.version}</div>
                          <div><span className="text-zinc-500">Firma SHA256:</span> {uploadedFileInfo.sha256?.substring(0, 12)}...</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BLOQUE 1: SUBIR APK DIRECTAMENTE DESDE EL PANEL */}
                  <div className="p-5 bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-cyan-500/30 rounded-3xl space-y-4 shadow-xl shadow-cyan-950/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">
                            Subir Archivo APK Directamente
                          </h4>
                          <p className="text-[11px] text-zinc-400">
                            Carga el archivo .apk desde tu celular o PC y envíalo automáticamente a todos los usuarios
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                        OTA Automático
                      </span>
                    </div>

                    {/* Selector / Dropzone de Archivo APK */}
                    <div className="relative border-2 border-dashed border-zinc-700 hover:border-cyan-500/60 rounded-2xl p-5 text-center transition bg-zinc-950/50 group">
                      <input
                        type="file"
                        accept=".apk,application/vnd.android.package-archive"
                        onChange={handleFileChange}
                        disabled={isUploadingApk}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 group-hover:bg-cyan-500/10 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition border border-zinc-800 group-hover:border-cyan-500/30">
                          <Download className="w-6 h-6 rotate-180" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-200 group-hover:text-cyan-300">
                            {selectedApkFile ? selectedApkFile.name : 'Toca aquí o arrastra tu archivo APK'}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {selectedApkFile
                              ? `${(selectedApkFile.size / (1024 * 1024)).toFixed(2)} MB listos para subir`
                              : 'Formatos soportados: .apk (sin límite de tamaño)'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Formulario de Detalles de la Versión para Subida */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">
                          Versión a Distribuir
                        </label>
                        <input
                          type="text"
                          value={apkVersion}
                          onChange={(e) => setApkVersion(e.target.value)}
                          placeholder="1.2"
                          disabled={isUploadingApk}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-8 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">
                          Notas de la Actualización para el Usuario
                        </label>
                        <input
                          type="text"
                          value={apkNotes}
                          onChange={(e) => setApkNotes(e.target.value)}
                          placeholder="Nuevas mejoras de reproducción y canales..."
                          disabled={isUploadingApk}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={apkForceUpdate}
                          onChange={(e) => setApkForceUpdate(e.target.checked)}
                          disabled={isUploadingApk}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                        />
                        <span className="text-xs text-zinc-300 font-medium">
                          Actualización obligatoria (bloquea la app anterior hasta que instalen esta)
                        </span>
                      </label>
                    </div>

                    {/* Barra de Progreso de Subida */}
                    {isUploadingApk && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-xs font-mono text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                            <span>Subiendo archivo al servidor central...</span>
                          </span>
                          <span className="font-bold text-cyan-400">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-150 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Botón de Acción Principal de Subida */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleUploadApk}
                        disabled={!selectedApkFile || isUploadingApk}
                        className="tv-focusable px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isUploadingApk ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enviando APK ({uploadProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Subir y Distribuir Actualización a los Usuarios</span>
                          </>
                        )}
                      </button>

                      <a
                        href="/api/iptv/download-apk"
                        target="_blank"
                        rel="noreferrer"
                        className="tv-focusable px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-zinc-800 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Descargar APK Actual de Prueba</span>
                      </a>
                    </div>
                  </div>

                  {/* BLOQUE 2: CONFIGURACIÓN MANUAL Y ESTADO DE DISTRIBUCIÓN */}
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span>Estado Actual de Distribución OTA</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">
                          Versión Registrada en el Servidor
                        </label>
                        <input
                          type="text"
                          value={config.appUpdate?.latestVersion || '1.0'}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              appUpdate: {
                                ...(config.appUpdate || {
                                  minVersion: '1.0',
                                  apkDownloadUrl: '',
                                  releaseNotes: '',
                                  forceUpdate: false,
                                }),
                                latestVersion: e.target.value,
                              },
                            })
                          }
                          placeholder="1.1"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-8 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">
                          Enlace de Descarga Activo
                        </label>
                        <input
                          type="text"
                          value={config.appUpdate?.apkDownloadUrl || '/api/iptv/download-apk'}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              appUpdate: {
                                ...(config.appUpdate || {
                                  latestVersion: '1.0',
                                  minVersion: '1.0',
                                  releaseNotes: '',
                                  forceUpdate: false,
                                }),
                                apkDownloadUrl: e.target.value,
                              },
                            })
                          }
                          placeholder="/api/iptv/download-apk o URL externa"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Explicación de Permisos de Android */}
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2 mt-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span>Permisos de Android Configurados en la App:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span><strong>POST_NOTIFICATIONS:</strong> Alerta al usuario en segundo plano cuando hay nueva versión.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span><strong>REQUEST_INSTALL_PACKAGES:</strong> Abre el instalador nativo directamente tras la descarga.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span><strong>DownloadManager:</strong> Descarga con barra de progreso en notificaciones del sistema.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span><strong>FileProvider:</strong> Compatibilidad total con Android 7 hasta Android 15.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  TAB 3: Seguridad & Credenciales del Administrador
                 ---------------------------------------------------- */}
              {activeTab === 'security' && (
                <div className="space-y-5">
                  {/* Auditoría de Seguridad Interactiva */}
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Verificación de Seguridad del Sistema</span>
                      </h4>
                      <button
                        type="button"
                        onClick={runAudit}
                        disabled={isRunningAudit}
                        className="tv-focusable text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {isRunningAudit ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Verificar Ahora</span>
                      </button>
                    </div>

                    {auditResult && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                          <div className="text-2xl font-black font-mono text-emerald-400">
                            {auditResult.score}%
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">
                              Estado de Protección: {auditResult.status}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              Protección de fuerza bruta activa, cabeceras anti-XSS y tokens de sesión criptográficos.
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {auditResult.checks.map((chk) => (
                            <div
                              key={chk.id}
                              className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-850 flex items-start gap-2"
                            >
                              <CheckCircle2
                                className={`w-4 h-4 mt-0.5 shrink-0 ${
                                  chk.status === 'passed' ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              />
                              <div>
                                <div className="text-xs font-semibold text-zinc-200">{chk.title}</div>
                                <div className="text-[10px] text-zinc-400">{chk.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Formulario de Cambio de Credenciales */}
                  <form onSubmit={handleUpdateCredentials} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      <span>Cambiar Credenciales de Administrador</span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Modifica tu usuario, email o contraseña para acceder de forma segura desde cualquier navegador o tu celular.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">Usuario Administrador</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="admin"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">Email de Contacto</label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="kalixgaming123@gmail.com"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">Nueva Contraseña (Dejar vacío para no cambiar)</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {credMessage && (
                      <div className="p-2.5 bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded-xl text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{credMessage}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isUpdatingCreds}
                        className="tv-focusable px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingCreds ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>Guardar Nuevas Credenciales</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ----------------------------------------------------
                  TAB 4: Anuncios y Avisos
                 ---------------------------------------------------- */}
              {activeTab === 'notice' && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-cyan-400" />
                        <span>Aviso Global en la Cabecera</span>
                      </h4>
                      <label className="flex items-center gap-2 text-xs text-zinc-300 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showAnnouncement}
                          onChange={(e) => setConfig({ ...config, showAnnouncement: e.target.checked })}
                          className="w-4 h-4 rounded text-cyan-500 bg-zinc-900 border-zinc-700"
                        />
                        <span>Mostrar aviso</span>
                      </label>
                    </div>

                    <textarea
                      rows={2}
                      value={config.announcement}
                      onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                      placeholder="Mensaje que verán todos tus usuarios arriba en la pantalla..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  TAB 5: Canal Destacado
                 ---------------------------------------------------- */}
              {activeTab === 'featured' && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Tv className="w-4 h-4 text-cyan-400" />
                      <span>Reproductor de Video en Vivo de la Pantalla Principal</span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Configura el canal o evento que se reproduce automáticamente en el reproductor 16:9 del inicio.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">Nombre del Canal</label>
                        <input
                          type="text"
                          value={config.featuredStream?.name || ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              featuredStream: { ...config.featuredStream, name: e.target.value },
                            })
                          }
                          placeholder="ESPN 1 Premium HD"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">Categoría</label>
                        <input
                          type="text"
                          value={config.featuredStream?.category || ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              featuredStream: { ...config.featuredStream, category: e.target.value },
                            })
                          }
                          placeholder="Deportes En Vivo"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs text-zinc-300 font-semibold">URL del Flujo (.m3u8)</label>
                        <input
                          type="text"
                          value={config.featuredStream?.streamUrl || ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              featuredStream: { ...config.featuredStream, streamUrl: e.target.value },
                            })
                          }
                          placeholder="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="px-5 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAuthorized(false)}
                className="tv-focusable px-3 py-1.5 text-zinc-400 hover:text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                Cerrar Sesión Administrador
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="tv-focusable px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="tv-focusable px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Todo en Servidor</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
