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

  private getEffectivePassword(overridePass?: string): string {
    if (overridePass && overridePass !== '•••') return overridePass;
    if (this.activePassword) return this.activePassword;
    const session = this.getSavedSession();
    return session?.authResponse?.user_info?.password || '';
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
          password: '•••',
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

  // 4. Fetch Categories (Direct + Proxy fallback)
  async getCategories(
    type: 'live' | 'vod' | 'series',
    username: string,
    password?: string
  ): Promise<any[]> {
    const action =
      type === 'live'
        ? 'get_live_categories'
        : type === 'vod'
        ? 'get_vod_categories'
        : 'get_series_categories';

    const effectivePass = this.getEffectivePassword(password);
    const base = this.activeConfig?.serverUrl || 'https://sneoplus.net:8443';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

    // 1. Direct call
    try {
      const directUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}&action=${action}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) return data;
        }
      }
    } catch {
      // Fallback to proxy
    }

    // 2. Proxy call fallback
    try {
      const res = await fetch(
        `/api/iptv/proxy?action=${action}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(effectivePass)}`
      );
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          return Array.isArray(data) ? data : [];
        }
      }
    } catch (e) {
      console.error(`Error loading ${type} categories:`, e);
    }
    return [];
  }

  // 5. Fetch Streams (Direct + Proxy fallback)
  async getStreams(
    type: 'live' | 'vod' | 'series',
    username: string,
    categoryId?: string,
    password?: string
  ): Promise<any[]> {
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
          if (Array.isArray(data)) return data;
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
          return Array.isArray(data) ? data : [];
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
    const activeUser = username || session?.username || 'ferdemo';
    const activePass = password || this.getEffectivePassword();

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
    const res = await fetch('/api/iptv/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.success && data.token) {
      this.adminToken = data.token;
    }
    return data;
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
