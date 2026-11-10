/**
 * Configuración remota del servicio (servidor IPTV, nombre, anuncio).
 *
 * Vive en Firestore, documento `config/servidor`, y se edita desde el panel de admin
 * (carpeta /admin, publicado en Firebase Hosting). La app NO trae ningún servidor
 * escrito en el código: si no hay configuración, el login muestra "Servicio no disponible".
 *
 * Se lee por la API REST de Firestore (sin SDK) con la clave web del proyecto.
 * Esa clave es pública por diseño; lo que protege los datos son las reglas de
 * seguridad (firestore.rules): lectura pública solo del documento config/servidor,
 * escritura solo para administradores.
 */

const FIREBASE_PROJECT_ID = 'influential-iris-f6shk';
const FIREBASE_WEB_API_KEY = 'AIzaSyAo-BT50_pq2FGIATWx9rJaHnp84KOznxA';

const DOC_URL =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
  `/databases/(default)/documents/config/servidor?key=${FIREBASE_WEB_API_KEY}`;

const CACHE_KEY = 'calixtv_remote_config_v1';
const REQUEST_TIMEOUT_MS = 8000;

export interface RemoteServerConfig {
  serverUrl: string; // sin barra final, con protocolo. '' si no está configurado
  serverPort: string;
  serverProtocol: 'http' | 'https';
  serviceName?: string;
  announcement?: string;
  showAnnouncement?: boolean;
}

export type RemoteConfigResult =
  | { status: 'ok'; config: RemoteServerConfig; fromCache: boolean }
  | { status: 'missing' } // el documento no existe: servicio sin configurar
  | { status: 'error' }; // sin red y sin copia guardada

/** Convierte un valor tipado de Firestore REST ({stringValue: "x"}) en un valor JS. */
function decodeValue(v: any): any {
  if (v == null || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(fields)) out[k] = decodeValue(fields[k]);
  return out;
}

/** Normaliza lo que escribió el admin: agrega http:// si falta, quita barras finales. */
export function normalizeServerUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return '';
  }
}

function toConfig(data: Record<string, any>): RemoteServerConfig | null {
  const serverUrl = normalizeServerUrl(data.serverUrl);
  if (!serverUrl) return null;
  const parsed = new URL(serverUrl);
  const protocol = parsed.protocol === 'https:' ? 'https' : 'http';
  return {
    serverUrl,
    serverPort: parsed.port || (protocol === 'https' ? '443' : '80'),
    serverProtocol: protocol,
    serviceName: typeof data.serviceName === 'string' && data.serviceName.trim() ? data.serviceName.trim() : undefined,
    announcement: typeof data.announcement === 'string' ? data.announcement : undefined,
    showAnnouncement: typeof data.showAnnouncement === 'boolean' ? data.showAnnouncement : undefined,
  };
}

function readCache(): RemoteServerConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? toConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(cfg: RemoteServerConfig | null): void {
  try {
    if (cfg) localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // sin almacenamiento disponible: se sigue sin copia local
  }
}

/**
 * Lee la configuración desde Firestore.
 * - Documento válido  -> la guarda como copia local y la devuelve.
 * - 404 / sin serverUrl -> 'missing' (y borra la copia local: el admin la quitó).
 * - Error de red / permisos -> usa la última copia buena si existe; si no, 'error'.
 */
export async function fetchRemoteConfig(): Promise<RemoteConfigResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(DOC_URL, { signal: controller.signal });

    if (res.status === 404) {
      writeCache(null);
      return { status: 'missing' };
    }
    if (!res.ok) throw new Error(`Firestore respondió ${res.status}`);

    const body = await res.json();
    const cfg = toConfig(decodeFields(body.fields || {}));
    if (!cfg) {
      writeCache(null);
      return { status: 'missing' };
    }
    writeCache(cfg);
    return { status: 'ok', config: cfg, fromCache: false };
  } catch (err) {
    console.warn('No se pudo leer la configuración remota, se usa la copia local si existe:', err);
    const cached = readCache();
    return cached ? { status: 'ok', config: cached, fromCache: true } : { status: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
