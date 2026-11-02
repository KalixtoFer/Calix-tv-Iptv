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

  // 1. Fetch Centralized Server Configuration
  async fetchConfig(): Promise<CentralizedConfig> {
    try {
      const res = await fetch('/api/iptv/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          this.activeConfig = data.config;
          return data.config;
        }
      }
    } catch (err) {
      console.warn('Could not fetch server config from backend, using client default:', err);
    }

    // Default fallback if backend unreachable
    return {
      serverUrl: 'http://xtream.demo-nexus.tv:8080',
      serverPort: '8080',
      serverProtocol: 'http',
      serviceName: 'NEXUS IPTV ULTRA HD',
      adminPin: '8888',
      announcement: '¡Bienvenidos a Nexus IPTV Pro! Servidores 4K optimizados con baja latencia.',
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
  }

  // 2. Xtream Codes Login (Proxied through backend)
  async login(username: string, password: string): Promise<XtreamAuthResponse> {
    const res = await fetch('/api/iptv/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al autenticar en el servidor IPTV');
    }

    // Save session
    this.saveSession(username, data);
    return data;
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

  // 4. Fetch Categories
  async getCategories(
    type: 'live' | 'vod' | 'series',
    username: string,
    password = '•••'
  ): Promise<any[]> {
    const action =
      type === 'live'
        ? 'get_live_categories'
        : type === 'vod'
        ? 'get_vod_categories'
        : 'get_series_categories';

    try {
      const res = await fetch(
        `/api/iptv/proxy?action=${action}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
      );
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.error(`Error loading ${type} categories:`, e);
    }
    return [];
  }

  // 5. Fetch Streams
  async getStreams(
    type: 'live' | 'vod' | 'series',
    username: string,
    categoryId?: string,
    password = '•••'
  ): Promise<any[]> {
    const action =
      type === 'live'
        ? 'get_live_streams'
        : type === 'vod'
        ? 'get_vod_streams'
        : 'get_series';

    let url = `/api/iptv/proxy?action=${action}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
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
    password = '•••'
  ): Promise<SeriesDetails | null> {
    try {
      const res = await fetch(
        `/api/iptv/proxy?action=get_series_info&series_id=${seriesId}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
      );
      if (res.ok) {
        return await res.json();
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
    extension = 'ts',
    username = '',
    password = ''
  ): string {
    const config = this.activeConfig;
    const base = config?.serverUrl || 'http://xtream.demo-nexus.tv:8080';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

    if (type === 'live') {
      return `${cleanBase}/live/${username}/${password}/${streamId}.${extension || 'm3u8'}`;
    } else if (type === 'movie') {
      return `${cleanBase}/movie/${username}/${password}/${streamId}.${extension || 'mp4'}`;
    } else {
      return `${cleanBase}/series/${username}/${password}/${streamId}.${extension || 'mp4'}`;
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

  // 9. Admin Configuration Methods
  async verifyAdminPin(pin: string): Promise<{ success: boolean; authorized?: boolean; fullConfig?: CentralizedConfig; message?: string }> {
    const res = await fetch('/api/iptv/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return await res.json();
  }

  async saveAdminConfig(pin: string, config: Partial<CentralizedConfig>): Promise<{ success: boolean; message: string; config?: CentralizedConfig }> {
    const res = await fetch('/api/iptv/admin/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, config }),
    });
    const data = await res.json();
    if (data.success && data.config) {
      this.activeConfig = data.config;
    }
    return data;
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
