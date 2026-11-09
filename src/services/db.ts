const DB_NAME = 'calix_tv_db';
const DB_VERSION = 1;
const STORE_NAME = 'iptv_cache';

export interface CacheEntry {
  id: string; // 'live' | 'vod' | 'series' | 'sports_events'
  data: any[];
  timestamp: number;
  count: number;
}

export const dbService = {
  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  async set(entry: CacheEntry): Promise<void> {
    // Regla: No guardar en caché un resultado vacío
    if (!entry.data || entry.data.length === 0) {
      return;
    }
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async get(id: string): Promise<CacheEntry | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },

  async getEvents(): Promise<CacheEntry | null> {
    return this.get('sports_events');
  },

  async setEvents(events: any[]): Promise<void> {
    // Si la carga devuelve 0 elementos, no sobrescribir la caché anterior
    if (!events || !Array.isArray(events) || events.length === 0) {
      return;
    }
    return this.set({
      id: 'sports_events',
      data: events,
      timestamp: Date.now(),
      count: events.length,
    });
  },

  async clear(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
};
