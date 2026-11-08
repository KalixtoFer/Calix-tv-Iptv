import {
  CentralizedConfig,
  XtreamAuthResponse,
  LiveCategory,
  LiveStream,
  VodCategory,
  VodStream,
  SeriesCategory,
  SeriesItem,
  SeriesDetails,
} from '../types/iptv';
import { Capacitor } from '@capacitor/core';

const STORAGE_SESSION_KEY = 'nexus_iptv_session_v1';
const STORAGE_FAVORITES_KEY = 'nexus_iptv_favorites_v1';
const STORAGE_HISTORY_KEY = 'nexus_iptv_history_v1';

export interface StoredSession {
  username: string;
  authResponse: XtreamAuthResponse;
  savedAt: number;
}

export interface FavoriteRecord {
  id: string | number;
  type: 'live' | 'vod' | 'series';
  name: string;
  icon?: string;
  category?: string;
}

export interface WatchHistoryRecord {
  id: string | number;
  type: 'live' | 'vod' | 'series';
  name: string;
  icon?: string;
  currentTime: number;
  duration?: number;
  updatedAt: number;
}

class IptvApiService {
  private activeConfig: CentralizedConfig | null = null;
  private activePassword = '';
  private categoryCache: Map<string, any[]> = new Map();
  private streamCache: Map<string, any[]> = new Map();

  private getEffectivePassword(overridePass?: string): string {
    if (overridePass && overridePass !== '•••' && overridePass.trim() !== '') return overridePass;
    if (this.activePassword && this.activePassword !== '•••' && this.activePassword.trim() !== '') return this.activePassword;
    try {
      const storedPass = localStorage.getItem('calixtv_active_pass');
      if (storedPass && storedPass !== '•••' && storedPass.trim() !== '') return storedPass;
    } catch {}
    const session = this.getSavedSession();
    const pass = session?.authResponse?.user_info?.password;
    if (pass && pass !== '•••' && pass.trim() !== '') return pass;
    return 'demo';
  }

  // Pre-load catalogs during splash/login to prevent freezes
  async preloadInitialData(
    username: string,
    onProgress?: (message: string, percent: number) => void
  ): Promise<void> {
    try {
      onProgress?.('Sincronizando categorías de TV...', 20);
      const liveCats = await this.getCategories('live', username);

      onProgress?.('Sincronizando catálogo de Películas...', 45);
      const vodCats = await this.getCategories('vod', username);

      onProgress?.('Sincronizando catálogo de Series...', 70);
      const seriesCats = await this.getCategories('series', username);

      onProgress?.('Cargando primeros contenidos...', 90);
      if (liveCats.length > 0) {
        await this.getStreams('live', username, liveCats[0].category_id);
      }
      if (vodCats.length > 0) {
        await this.getStreams('vod', username, vodCats[0].category_id);
      }
      if (seriesCats.length > 0) {
        await this.getStreams('series', username, seriesCats[0].category_id);
      }

      onProgress?.('¡Catálogo de Calix TV listo!', 100);
    } catch (e) {
      console.warn('Preload non-fatal error:', e);
    }
  }

  // 1. Fetch Centralized Server Configuration
  async fetchConfig(): Promise<CentralizedConfig> {
    try {
      const res = await fetch('/api/iptv/config');
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (data.config) {
            this.activeConfig = data.config;
            return data.config;
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch server config from backend, using client default:', err);
    }

    // Default fallback if backend unreachable (e.g. running as standalone APK)
    const fallback: CentralizedConfig = {
      serverUrl: 'https://sneoplus.net:8443',
      serverPort: '8443',
      serverProtocol: 'https',
      serviceName: 'Calix TV',
      announcement: '¡Bienvenidos a Calix TV! Tu Servicio Digital en la mejor calidad.',
      showAnnouncement: true,
      banners: [],
      featuredStream: {
        streamId: 'demo-live-1',
        name: 'ESPN 1 Premium HD',
        category: 'Deportes En Vivo',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
        resolution: 'FHD 1080p',
        fps: '60 FPS',
      },
      demoModeEnabled: true,
    };
    this.activeConfig = fallback;
    return fallback;
  }

  // 2. Xtream Codes Login (Direct Xtream API + Proxy Fallback)
  async login(username: string, password: string): Promise<XtreamAuthResponse> {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();
    this.activePassword = trimmedPass;

    // Demo credentials
    if (
      (trimmedUser.toLowerCase() === 'demo' && trimmedPass.toLowerCase() === 'demo') ||
      (trimmedUser.toLowerCase() === 'nexus' && trimmedPass.toLowerCase() === 'nexus2026')
    ) {
      const demoAuth: XtreamAuthResponse = {
        user_info: {
          username: trimmedUser,
          password: trimmedPass,
          message: 'Cuenta Premium Autorizada',
          auth: 1,
          status: 'Active',
          exp_date: '1798761600',
          is_trial: '0',
          active_cons: '1',
          created_at: '1704067200',
          max_connections: '3',
          allowed_output_formats: ['m3u8', 'ts', 'rtmp'],
        },
        server_info: {
          url: this.activeConfig?.serverUrl || 'https://sneoplus.net:8443',
          port: this.activeConfig?.serverPort || '8443',
          server_protocol: this.activeConfig?.serverProtocol || 'https',
        },
      };
      this.saveSession(trimmedUser, demoAuth);
      return demoAuth;
    }

    const base = this.activeConfig?.serverUrl || 'https://sneoplus.net:8443';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

    // A. Direct call to Xtream Codes server (Works natively on Android APK and with CORS)
    try {
      const directUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(trimmedUser)}&password=${encodeURIComponent(trimmedPass)}`;
      const directRes = await fetch(directUrl);

      if (directRes.ok) {
        const text = await directRes.text();
        if (text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (data.user_info && data.user_info.auth === 1) {
            data.user_info.password = trimmedPass;
            this.saveSession(trimmedUser, data);
            return data;
          } else if (data.user_info && data.user_info.auth === 0) {
            throw new Error(data.user_info?.message || 'Usuario o contraseña incorrectos en el proveedor IPTV.');
          }
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('NetworkError') && !err.message.includes('JSON')) {
        throw err;
      }
      console.warn('Direct Xtream login failed, attempting proxy endpoint:', err);
    }

    // B. Backend proxy fallback (Works when running inside browser on dev server)
    try {
      const proxyRes = await fetch('/api/iptv/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
      });

      const text = await proxyRes.text();
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (proxyRes.ok && data.success) {
          if (data.user_info) data.user_info.password = trimmedPass;
          this.saveSession(trimmedUser, data);
          return data;
        } else {
          throw new Error(data.message || 'Usuario o contraseña incorrectos.');
        }
      }
    } catch (proxyErr: any) {
      if (proxyErr.message && !proxyErr.message.includes('JSON')) {
        throw proxyErr;
      }
    }

    throw new Error('No se pudo autenticar con el servidor IPTV. Verifique sus credenciales y su conexión a internet.');
  }

  // 3. Save & Restore Session
  saveSession(username: string, authResponse: XtreamAuthResponse): void {
    try {
      if (this.activePassword && this.activePassword !== '•••') {
        localStorage.setItem('calixtv_active_pass', this.activePassword);
      } else if (authResponse.user_info?.password && authResponse.user_info.password !== '•••') {
        localStorage.setItem('calixtv_active_pass', authResponse.user_info.password);
      }
      const session: StoredSession = {
        username,
        authResponse,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }

  getSavedSession(): StoredSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!stored) return null;
      const parsed: StoredSession = JSON.parse(stored);

      // Check if session has expired based on Xtream exp_date (UNIX timestamp)
      const expDate = parseInt(parsed.authResponse.user_info.exp_date, 10);
      if (expDate && !isNaN(expDate)) {
        const now = Math.floor(Date.now() / 1000);
        if (now > expDate) {
          this.clearSession();
          return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }

  // Helper to get a stable ID from a category name
  normalizeCategoryName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{200C}\u{AD}\u{FE0F}]/gu, '') // Remove emojis
      .replace(/[⭐🌟✨💫🔥💥]/g, '') // Remove specific characters common in IPTV lists
      .trim();
  }

  // Apply order, renaming and visibility to categories
  applyCategoryManagement(
    type: 'live' | 'vod' | 'series',
    rawCategories: any[]
  ): any[] {
    if (!this.activeConfig?.categoriesConfig) return rawCategories;
    
    const config = this.activeConfig.categoriesConfig[type];
    if (!config || !Array.isArray(config) || config.length === 0) return rawCategories;

    // 1. Index config by normalized ID
    const configMap = new Map<string, any>();
    config.forEach((item) => configMap.set(item.id, item));

    // 2. Prepare items
    const result = rawCategories.map(cat => {
      const normId = this.normalizeCategoryName(cat.category_name);
      const conf = configMap.get(normId);
      
      return {
        ...cat,
        _normId: normId,
        _managed: !!conf,
        managedName: conf?.displayName || cat.category_name,
        isHidden: conf?.hidden || false,
        isPinned: conf?.pinned || false,
        sortOrder: conf?.order ?? 9999
      };
    });

    // 3. Filter hidden
    const visible = result.filter(cat => !cat.isHidden);

    // 4. Sort: Pinned first, then by defined order, then alphabetically for new ones
    return visible.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      
      return a.category_name.localeCompare(b.category_name);
    });
  }

  // 4. Fetch Categories (Direct + Proxy fallback + Memory Cache)
  async getCategories(
    type: 'live' | 'vod' | 'series',
    username: string,
    password?: string
  ): Promise<any[]> {
    if (this.categoryCache.has(type)) {
      return this.categoryCache.get(type)!;
    }

    const action =
      type === 'live'
        ? 'get_live_categories'
        : type === 'vod'
        ? 'get_vod_categories'
        : 'get_series_categories';

    const effectivePass = this.getEffectivePassword(password);
    const base = this.activeConfig?.serverUrl || 'https://sneoplus.net:8443';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

    let rawData: any[] = [];

    // 1. Direct call
    try {
      const directUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}&action=${action}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            rawData = data;
          }
        }
      }
    } catch {
      // Fallback to proxy
    }

    // 2. Proxy call fallback if direct failed
    if (rawData.length === 0) {
      try {
        const res = await fetch(
          `/api/iptv/proxy?action=${action}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}`
        );
        if (res.ok) {
          const text = await res.text();
          if (text.trim().startsWith('[')) {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
              rawData = data;
            }
          }
        }
      } catch (e) {
        console.error(`Error loading ${type} categories:`, e);
      }
    }

    if (rawData.length > 0) {
      const managed = this.applyCategoryManagement(type, rawData);
      this.categoryCache.set(type, managed);
      return managed;
    }

    return [];
  }

  // 5. Fetch Streams (Direct + Proxy fallback + Memory Cache)
  async getStreams(
    type: 'live' | 'vod' | 'series',
    username: string,
    categoryId?: string,
    password?: string
  ): Promise<any[]> {
    const cacheKey = `${type}_${categoryId || 'all'}`;
    if (this.streamCache.has(cacheKey)) {
      return this.streamCache.get(cacheKey)!;
    }

    const action =
      type === 'live'
        ? 'get_live_streams'
        : type === 'vod'
        ? 'get_vod_streams'
        : 'get_series';

    const effectivePass = this.getEffectivePassword(password);
    const base = this.activeConfig?.serverUrl || 'https://sneoplus.net:8443';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

    let catParam = '';
    if (categoryId && categoryId !== 'all') {
      catParam = `&category_id=${encodeURIComponent(categoryId)}`;
    }

    // 1. Direct call
    try {
      const directUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}&action=${action}${catParam}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            this.streamCache.set(cacheKey, data);
            return data;
          }
        }
      }
    } catch {
      // Fallback to proxy
    }

    // 2. Proxy call fallback
    try {
      const proxyUrl = `/api/iptv/proxy?action=${action}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}${catParam}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            this.streamCache.set(cacheKey, data);
            return data;
          }
        }
      }
    } catch (e) {
      console.error(`Error loading ${type} streams:`, e);
    }
    return [];
  }

  // 6. Fetch Series Details (Seasons + Episodes)
  async getSeriesInfo(
    seriesId: string | number,
    username: string,
    password?: string
  ): Promise<SeriesDetails | null> {
    const effectivePass = this.getEffectivePassword(password);
    const base = this.activeConfig?.serverUrl || 'https://sneoplus.net:8443';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

    // 1. Direct call
    try {
      const directUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}&action=get_series_info&series_id=${encodeURIComponent(seriesId)}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch {
      // Fallback to proxy
    }

    // 2. Proxy call fallback
    try {
      const res = await fetch(
        `/api/iptv/proxy?action=get_series_info&series_id=${seriesId}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}`
      );
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch (e) {
      console.error('Error loading series info:', e);
    }
    return null;
  }

  // 7. Generate Stream URL for Video Player
  buildStreamUrl(
    type: 'live' | 'movie' | 'episode',
    streamId: string | number,
    extension = '',
    username = '',
    password = ''
  ): string {
    const config = this.activeConfig;
    const base = config?.serverUrl || 'https://sneoplus.net:8443';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

    const session = this.getSavedSession();
    const activeUser = username || session?.username || 'demo';
    let activePass = password || this.getEffectivePassword();
    if (activePass === '•••') activePass = '';

    if (type === 'live') {
      const ext = extension || 'm3u8';
      return `${cleanBase}/live/${encodeURIComponent(activeUser)}/${encodeURIComponent(activePass)}/${streamId}.${ext}`;
    } else if (type === 'movie') {
      const ext = extension || 'mp4';
      return `${cleanBase}/movie/${encodeURIComponent(activeUser)}/${encodeURIComponent(activePass)}/${streamId}.${ext}`;
    } else {
      const ext = extension || 'mp4';
      return `${cleanBase}/series/${encodeURIComponent(activeUser)}/${encodeURIComponent(activePass)}/${streamId}.${ext}`;
    }
  }

  // 8. Test Server Connection
  async testServer(serverUrl: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const res = await fetch('/api/iptv/test-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl }),
    });
    return await res.json();
  }

  // 9. Admin Configuration & Security Methods
  private adminToken: string | null = null;

  async verifyAdmin(params: { username?: string; password?: string }): Promise<{
    success: boolean;
    authorized?: boolean;
    token?: string;
    adminUser?: { username: string; email: string; name: string; role: string };
    fullConfig?: CentralizedConfig;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/iptv/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          this.adminToken = data.token;
          return data;
        }
      }
    } catch (e) {
      console.warn('Network admin verify failed, trying client fallback:', e);
    }

    // Client-side / Standalone APK Admin Validation Fallback:
    const u = (params.username || '').trim().toLowerCase();
    const p = (params.password || '').trim();

    const isMatch =
      (u === 'admin' || u === 'kalixgaming123@gmail.com') &&
      (p === 'CalixTvAdmin2026!');

    if (isMatch) {
      this.adminToken = 'local_admin_token';
      return {
        success: true,
        authorized: true,
        token: 'local_admin_token',
        adminUser: {
          username: u || 'admin',
          email: 'kalixgaming123@gmail.com',
          name: 'Administrador Calix TV',
          role: 'superadmin',
        },
        fullConfig: this.activeConfig || {
          serverUrl: 'https://sneoplus.net:8443',
          serverPort: '8443',
          serverProtocol: 'https',
          serviceName: 'Calix TV',
          announcement: '¡Bienvenidos a Calix TV!',
          showAnnouncement: true,
          banners: [],
          featuredStream: { streamId: '1', name: '', category: '', streamUrl: '', poster: '', resolution: '', fps: '' },
          demoModeEnabled: true,
          appUpdate: {
            latestVersion: '1.0',
            minVersion: '1.0',
            apkDownloadUrl: 'https://github.com/KalixtoFer/calixtvapp/releases/latest/download/CalixTV.apk',
            releaseNotes: 'Versión oficial de Calix TV v1.0',
            forceUpdate: false,
          },
        },
      };
    }

    return {
      success: false,
      message: 'Usuario o contraseña de administrador incorrectos.',
    };
  }

  async saveAdminConfig(config: Partial<CentralizedConfig>): Promise<{ success: boolean; message: string; config?: CentralizedConfig }> {
    const res = await fetch('/api/iptv/admin/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.adminToken ? { 'x-admin-token': this.adminToken } : {}),
      },
      body: JSON.stringify({ token: this.adminToken, config }),
    });
    const data = await res.json();
    if (data.success && data.config) {
      this.activeConfig = data.config;
    }
    return data;
  }

  async updateAdminCredentials(params: {
    newUsername?: string;
    newPassword?: string;
    newEmail?: string;
    newName?: string;
  }): Promise<{ success: boolean; message: string; adminUser?: any }> {
    const res = await fetch('/api/iptv/admin/update-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.adminToken ? { 'x-admin-token': this.adminToken } : {}),
      },
      body: JSON.stringify({ token: this.adminToken, ...params }),
    });
    return await res.json();
  }

  // Upload APK file directly from Admin Panel with real-time percentage progress
  async uploadApk(params: {
    file: File;
    version: string;
    notes: string;
    forceUpdate: boolean;
    onProgress?: (percent: number) => void;
  }): Promise<{
    success: boolean;
    message: string;
    fileInfo?: {
      filename: string;
      sizeBytes: number;
      sizeFormatted: string;
      sha256: string;
      version: string;
      downloadUrl: string;
    };
    config?: CentralizedConfig;
  }> {
    const CHUNK_SIZE = 500 * 1024; // 500KB per chunk to safely avoid 413 Entity Too Large proxy limits
    const totalChunks = Math.ceil(params.file.size / CHUNK_SIZE);
    const uploadId = 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(params.file.size, start + CHUNK_SIZE);
      const chunk = params.file.slice(start, end);

      const success = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        const url = `/api/iptv/admin/upload-apk-chunk?uploadId=${uploadId}&chunkIndex=${chunkIndex}&totalChunks=${totalChunks}&version=${encodeURIComponent(params.version)}&notes=${encodeURIComponent(params.notes)}&forceUpdate=${params.forceUpdate}&filename=${encodeURIComponent(params.file.name)}`;

        xhr.open('POST', url, true);
        if (this.adminToken) {
          xhr.setRequestHeader('x-admin-token', this.adminToken);
        }
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            console.error(`Chunk ${chunkIndex + 1}/${totalChunks} failed with status ${xhr.status}:`, xhr.responseText);
            resolve(false);
          }
        };

        xhr.onerror = () => resolve(false);

        xhr.send(chunk);
      });

      if (!success) {
        return {
          success: false,
          message: `Error al subir el fragmento ${chunkIndex + 1} de ${totalChunks}. Inténtalo de nuevo.`,
        };
      }

      if (params.onProgress) {
        const pct = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        params.onProgress(pct);
      }
    }

    // Finalize chunked upload session
    try {
      const res = await fetch(`/api/iptv/admin/upload-apk-finalize?uploadId=${uploadId}&version=${encodeURIComponent(params.version)}&notes=${encodeURIComponent(params.notes)}&forceUpdate=${params.forceUpdate}&filename=${encodeURIComponent(params.file.name)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.adminToken ? { 'x-admin-token': this.adminToken } : {}),
        },
        body: JSON.stringify({ token: this.adminToken }),
      });
      const data = await res.json();
      if (data.config) {
        this.activeConfig = data.config;
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: 'Error al finalizar la unión del APK: ' + (err.message || 'Error desconocido'),
      };
    }
  }

  async getApkStatus(): Promise<{
    hasUploadedApk: boolean;
    sizeFormatted: string;
    mtime: string | null;
    latestVersion: string;
    apkDownloadUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
  }> {
    try {
      const res = await fetch('/api/iptv/admin/apk-status');
      if (res.ok) return await res.json();
    } catch {}
    return {
      hasUploadedApk: false,
      sizeFormatted: '0 MB',
      mtime: null,
      latestVersion: '1.1',
      apkDownloadUrl: '/api/iptv/download-apk',
      releaseNotes: '',
      forceUpdate: false,
    };
  }

  async getSecurityAudit(): Promise<{
    success: boolean;
    score: number;
    status: string;
    checks: Array<{ id: string; title: string; status: 'passed' | 'warning' | 'failed'; description: string; recommendation: string }>;
    checkedAt: string;
  }> {
    const res = await fetch('/api/iptv/admin/security-audit');
    return await res.json();
  }

  async checkAppUpdate(currentVersion = '1.0'): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    apkDownloadUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
    publishedAt?: string;
  }> {
    try {
      const res = await fetch(`/api/iptv/check-update?currentVersion=${encodeURIComponent(currentVersion)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Update check error:', e);
    }
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      apkDownloadUrl: '',
      releaseNotes: '',
      forceUpdate: false,
    };
  }

  // 10. Favorites Management
  getFavorites(): FavoriteRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  toggleFavorite(item: FavoriteRecord): boolean {
    const favs = this.getFavorites();
    const index = favs.findIndex((f) => String(f.id) === String(item.id) && f.type === item.type);
    let isNowFavorite = false;
    if (index >= 0) {
      favs.splice(index, 1);
    } else {
      favs.push(item);
      isNowFavorite = true;
    }
    localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favs));
    return isNowFavorite;
  }

  isFavorite(id: string | number, type: 'live' | 'vod' | 'series'): boolean {
    const favs = this.getFavorites();
    return favs.some((f) => String(f.id) === String(id) && f.type === type);
  }

  // 11. Playback History / Resume
  saveProgress(item: Omit<WatchHistoryRecord, 'updatedAt'>): void {
    try {
      const list = this.getHistory();
      const filtered = list.filter((h) => !(String(h.id) === String(item.id) && h.type === item.type));
      filtered.unshift({
        ...item,
        updatedAt: Date.now(),
      });
      // Keep last 30
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(filtered.slice(0, 30)));
    } catch (e) {
      console.error('Failed to save watch history:', e);
    }
  }

  getHistory(): WatchHistoryRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export const iptvApi = new IptvApiService();
