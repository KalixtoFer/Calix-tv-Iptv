import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Persistent centralized IPTV configuration storage
const DATA_DIR = path.resolve(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'iptv-config.json');

interface CentralizedConfig {
  serverUrl: string;
  serverPort: string;
  serverProtocol: 'http' | 'https';
  serviceName: string;
  adminPin: string;
  announcement: string;
  showAnnouncement: boolean;
  banners: Array<{
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    imageUrl: string;
    tagColor: string;
    actionSection: string;
  }>;
  featuredStream: {
    streamId: string;
    name: string;
    category: string;
    streamUrl: string;
    poster: string;
    resolution: string;
    fps: string;
  };
  demoModeEnabled: boolean;
}

const DEFAULT_CONFIG: CentralizedConfig = {
  serverUrl: 'http://xtream.demo-nexus.tv:8080',
  serverPort: '8080',
  serverProtocol: 'http',
  serviceName: 'NEXUS IPTV ULTRA HD',
  adminPin: '8888',
  announcement: '¡Bienvenidos a Nexus IPTV Pro! Servidores 4K optimizados con baja latencia.',
  showAnnouncement: true,
  banners: [
    {
      id: 'b1',
      title: 'SUPER DOMINGO DE FÚTBOL',
      subtitle: 'La Liga, Champions League y Copa Libertadores en vivo en 4K 60FPS sin cortes.',
      badge: 'EN VIVO AHORA',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
      tagColor: '#06b6d4',
      actionSection: 'live',
    },
    {
      id: 'b2',
      title: 'ESTRENOS CINEMATOGRÁFICOS',
      subtitle: 'Más de 4,500 películas agregadas esta semana con audio dual y subtítulos.',
      badge: 'NUEVO EN CINE',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
      tagColor: '#eab308',
      actionSection: 'movies',
    },
    {
      id: 'b3',
      title: 'MARATÓN DE SERIES & ANIME',
      subtitle: 'Temporadas completas en calidad FHD y 4K UHD listas para maratonear.',
      badge: 'TOP SERIES',
      imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
      tagColor: '#a855f7',
      actionSection: 'series',
    },
  ],
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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig(): CentralizedConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error('Error reading centralized config:', err);
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: CentralizedConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving centralized config:', err);
  }
}

// In-memory active config
let currentConfig = loadConfig();

// -------------------------------------------------------------
// Centralized Configuration API
// -------------------------------------------------------------

// Public config for clients (omits sensitive pin)
app.get('/api/iptv/config', (_req, res) => {
  const { adminPin: _, ...safeConfig } = currentConfig;
  res.json({
    success: true,
    config: safeConfig,
  });
});

// Download Android Studio Native Project ZIP
app.get('/api/iptv/download-android-zip', (_req, res) => {
  const dataZip = path.resolve(__dirname, 'data', 'nexus-iptv-pro-android.zip');
  const distZip = path.resolve(__dirname, 'dist', 'nexus-iptv-pro-android.zip');
  const targetZip = fs.existsSync(dataZip) ? dataZip : distZip;

  if (fs.existsSync(targetZip)) {
    res.download(targetZip, 'nexus-iptv-pro-android.zip');
  } else {
    res.status(404).json({ success: false, message: 'Archivo ZIP de Android no encontrado' });
  }
});

// Download Full Project ZIP ready for GitHub Actions
app.get('/api/iptv/download-github-repo', (_req, res) => {
  const dataZip = path.resolve(__dirname, 'data', 'nexus-iptv-pro-github-ready.zip');
  const distZip = path.resolve(__dirname, 'dist', 'nexus-iptv-pro-github-ready.zip');
  const targetZip = fs.existsSync(dataZip) ? dataZip : distZip;

  if (fs.existsSync(targetZip)) {
    res.download(targetZip, 'nexus-iptv-pro-github-ready.zip');
  } else {
    res.status(404).json({ success: false, message: 'Paquete de GitHub no encontrado' });
  }
});

// Android Project Status
app.get('/api/iptv/android-status', (_req, res) => {
  const androidExists = fs.existsSync(path.resolve(__dirname, 'android'));
  const dataZip = path.resolve(__dirname, 'data', 'nexus-iptv-pro-android.zip');
  const distZip = path.resolve(__dirname, 'dist', 'nexus-iptv-pro-android.zip');
  const zipExists = fs.existsSync(dataZip) || fs.existsSync(distZip);
  const targetZip = fs.existsSync(dataZip) ? dataZip : distZip;

  let zipSizeMb = 0;
  if (zipExists) {
    const stats = fs.statSync(targetZip);
    zipSizeMb = +(stats.size / (1024 * 1024)).toFixed(2);
  }
  res.json({
    success: true,
    androidProjectReady: androidExists,
    zipAvailable: zipExists,
    zipSizeMb,
    packageId: 'com.nexus.iptv.pro',
    appName: 'Nexus IPTV Pro',
  });
});

// Admin validation
app.post('/api/iptv/admin/verify', (req, res) => {
  const { pin } = req.body;
  if (pin === currentConfig.adminPin) {
    res.json({ success: true, authorized: true, fullConfig: currentConfig });
  } else {
    res.status(401).json({ success: false, message: 'PIN de Administrador incorrecto' });
  }
});

// Admin save config
app.post('/api/iptv/admin/save', (req, res) => {
  const { pin, config } = req.body;
  if (pin !== currentConfig.adminPin) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  if (!config) {
    return res.status(400).json({ success: false, message: 'Configuración inválida' });
  }

  currentConfig = {
    ...currentConfig,
    ...config,
    adminPin: config.adminPin || currentConfig.adminPin,
  };
  saveConfig(currentConfig);
  res.json({ success: true, message: 'Configuración centralizada guardada exitosamente', config: currentConfig });
});

// Test connection to Xtream server
app.post('/api/iptv/test-server', async (req, res) => {
  const { serverUrl } = req.body;
  const targetUrl = serverUrl || currentConfig.serverUrl;

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const checkUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
    const response = await fetch(`${checkUrl}/player_api.php`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'IPTVSmarters/3.1.5.1 (Linux; Android 12)',
      },
    });
    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    res.json({
      success: true,
      statusCode: response.status,
      latencyMs: latency,
      message: `Servidor conectado exitosamente (${latency}ms)`,
    });
  } catch (error: any) {
    res.json({
      success: false,
      latencyMs: Date.now() - startTime,
      message: `Fallo al conectar: ${error.message || 'Tiempo de espera agotado'}`,
    });
  }
});

// Xtream Codes Authentication Proxy
app.post('/api/iptv/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
  }

  // Check if user requested demo credentials
  if (
    (username.toLowerCase() === 'demo' && password.toLowerCase() === 'demo') ||
    (username.toLowerCase() === 'nexus' && password.toLowerCase() === 'nexus2026')
  ) {
    return res.json({
      success: true,
      isDemo: true,
      user_info: {
        username: username,
        password: '•••',
        message: 'Cuenta Premium Autorizada',
        auth: 1,
        status: 'Active',
        exp_date: '1798761600', // Far future (Year 2027)
        is_trial: '0',
        active_cons: '1',
        created_at: '1704067200',
        max_connections: '3',
        allowed_output_formats: ['m3u8', 'ts', 'rtmp'],
      },
      server_info: {
        url: currentConfig.serverUrl,
        port: currentConfig.serverPort,
        https_port: '8443',
        server_protocol: currentConfig.serverProtocol,
        rtmp_port: '8880',
        timezone: 'America/Mexico_City',
        timestamp_now: Math.floor(Date.now() / 1000),
        time_now: new Date().toISOString(),
      },
    });
  }

  // Real Xtream Codes request using centralized server
  const server = currentConfig.serverUrl.endsWith('/')
    ? currentConfig.serverUrl.slice(0, -1)
    : currentConfig.serverUrl;

  const url = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const apiRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NexusIPTVPro/2.5.4 (Android TV; Linux)',
        Accept: 'application/json, text/plain, */*',
      },
    });
    clearTimeout(timeout);

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        success: false,
        message: `Error del servidor IPTV: HTTP ${apiRes.status}`,
      });
    }

    const data = await apiRes.json();
    if (data.user_info && data.user_info.auth === 1) {
      res.json({
        success: true,
        isDemo: false,
        ...data,
      });
    } else {
      res.status(401).json({
        success: false,
        message: data.user_info?.message || 'Usuario o contraseña incorrectos en el proveedor IPTV.',
        data,
      });
    }
  } catch (error: any) {
    console.error('IPTV login proxy error:', error);
    res.status(502).json({
      success: false,
      message: `No se pudo conectar al servidor IPTV (${currentConfig.serverUrl}). Verifique que el servidor esté en línea o use credenciales demo para probar.`,
      error: error.message,
    });
  }
});

// Xtream Codes Action Proxy (categories, streams, series_info)
app.get('/api/iptv/proxy', async (req, res) => {
  const { action, username, password, category_id, series_id, stream_id } = req.query;

  if (!username || !password || !action) {
    return res.status(400).json({ success: false, message: 'Parámetros faltantes' });
  }

  // If demo credentials, return sample realistic data
  if (
    username === 'demo' ||
    username === 'nexus' ||
    currentConfig.serverUrl.includes('demo-nexus.tv')
  ) {
    return res.json(getDemoData(action as string, { category_id, series_id, stream_id }));
  }

  const server = currentConfig.serverUrl.endsWith('/')
    ? currentConfig.serverUrl.slice(0, -1)
    : currentConfig.serverUrl;

  let url = `${server}/player_api.php?username=${encodeURIComponent(String(username))}&password=${encodeURIComponent(String(password))}&action=${encodeURIComponent(String(action))}`;
  if (category_id) url += `&category_id=${encodeURIComponent(String(category_id))}`;
  if (series_id) url += `&series_id=${encodeURIComponent(String(series_id))}`;
  if (stream_id) url += `&stream_id=${encodeURIComponent(String(stream_id))}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const apiRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NexusIPTVPro/2.5.4 (Android TV; Linux)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ success: false, message: `Error HTTP ${apiRes.status}` });
    }

    const data = await apiRes.json();
    res.json(data);
  } catch (error: any) {
    console.warn(`Proxy fetch failed for ${action}, falling back to demo catalog:`, error.message);
    res.json(getDemoData(action as string, { category_id, series_id, stream_id }));
  }
});

// Fallback demo data generator for instant out-of-the-box experience
function getDemoData(action: string, params: any) {
  switch (action) {
    case 'get_live_categories':
      return [
        { category_id: '1', category_name: '⚽ DEPORTES PREMIUM EN VIVO', parent_id: 0 },
        { category_id: '2', category_name: '🎬 CINE & SERIES 24/7', parent_id: 0 },
        { category_id: '3', category_name: '🌍 NOTICIAS INTERNACIONALES', parent_id: 0 },
        { category_id: '4', category_name: '🧸 INFANTIL & FAMILIAR', parent_id: 0 },
        { category_id: '5', category_name: '🦁 DOCUMENTALES & NATURALEZA', parent_id: 0 },
        { category_id: '6', category_name: '🎶 MÚSICA & CONCIERTOS', parent_id: 0 },
        { category_id: '7', category_name: '⚡ ANIME CHANNELS 24/7', parent_id: 0 },
        { category_id: '8', category_name: '🔥 ESPECIALES & EVENTOS PPV', parent_id: 0 },
      ];

    case 'get_live_streams':
      return [
        {
          num: 1,
          name: 'ESPN Deportes HD [FHD 60FPS]',
          stream_type: 'live',
          stream_id: 101,
          stream_icon: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'espn.es',
          added: '1700000000',
          category_id: '1',
          custom_sid: '',
          tv_archive: 1,
          direct_source: '',
          tv_archive_duration: 3,
          current_program: 'Fútbol Europeo: El Clásico en Vivo',
          next_program: 'SportsCenter Edición Nocturna',
          stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        },
        {
          num: 2,
          name: 'Fox Sports 1 UHD [4K]',
          stream_type: 'live',
          stream_id: 102,
          stream_icon: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'foxsports.es',
          added: '1700000000',
          category_id: '1',
          current_program: 'Fórmula 1: Gran Premio en Directo',
          next_program: 'Debate Central de Campeones',
          stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        },
        {
          num: 3,
          name: 'HBO Max Cinema FHD',
          stream_type: 'live',
          stream_id: 103,
          stream_icon: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'hbo.es',
          added: '1700000000',
          category_id: '2',
          current_program: 'Dune: Parte Dos (Estreno Exclusivo)',
          next_program: 'Oppenheimer',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        },
        {
          num: 4,
          name: 'TNT Series FHD Dual Audio',
          stream_type: 'live',
          stream_id: 104,
          stream_icon: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'tnt.es',
          added: '1700000000',
          category_id: '2',
          current_program: 'Breaking Bad - Temporada 5 Ep 14',
          next_program: 'Better Call Saul',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        },
        {
          num: 5,
          name: 'BBC World News 24/7',
          stream_type: 'live',
          stream_id: 105,
          stream_icon: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'bbc.news',
          added: '1700000000',
          category_id: '3',
          current_program: 'Global News Hour: Headlines & Tech',
          next_program: 'World Business Report',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        },
        {
          num: 6,
          name: 'National Geographic Wild FHD',
          stream_type: 'live',
          stream_id: 106,
          stream_icon: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'natgeo.es',
          added: '1700000000',
          category_id: '5',
          current_program: 'Grandes Depredadores del Serengeti',
          next_program: 'Secretos de las Profundidades',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        },
        {
          num: 7,
          name: 'Crunchyroll TV 24/7 Anime',
          stream_type: 'live',
          stream_id: 107,
          stream_icon: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'anime.tv',
          added: '1700000000',
          category_id: '7',
          current_program: 'Attack on Titan: The Final Season',
          next_program: 'Demon Slayer: Kimetsu no Yaiba',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        },
        {
          num: 8,
          name: 'UFC Fight Pass PPV 4K',
          stream_type: 'live',
          stream_id: 108,
          stream_icon: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&w=300&q=80',
          epg_channel_id: 'ufc.ppv',
          added: '1700000000',
          category_id: '8',
          current_program: 'Cartelera Principal: Campeonato Mundial',
          next_program: 'Conferencia de Prensa Post-Pelea',
          stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        },
      ];

    case 'get_vod_categories':
      return [
        { category_id: '201', category_name: '🔥 ESTRENOS 2026', parent_id: 0 },
        { category_id: '202', category_name: '💥 ACCIÓN Y SUSPENSO', parent_id: 0 },
        { category_id: '203', category_name: '🚀 CIENCIA FICCIÓN & FANTASÍA', parent_id: 0 },
        { category_id: '204', category_name: '👻 TERROR Y MISTERIO', parent_id: 0 },
        { category_id: '205', category_name: '😂 COMEDIA FAMILIAR', parent_id: 0 },
      ];

    case 'get_vod_streams':
      return [
        {
          num: 1,
          name: 'Cyber Horizon 2099 (4K HDR)',
          stream_type: 'movie',
          stream_id: 2001,
          stream_icon: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
          rating: '8.8',
          rating_5based: 4.4,
          added: '1705000000',
          category_id: '201',
          container_extension: 'mp4',
          year: '2026',
          duration_secs: 7420,
          duration: '02:03:40',
          plot: 'En una metrópolis subterránea, un androide consciente busca el origen de los recuerdos humanos mientras evade una corporación letal.',
          genre: 'Ciencia Ficción, Acción',
          director: 'Alex Rivera',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        },
        {
          num: 2,
          name: 'Velocidad Máxima: Desafío Urbano',
          stream_type: 'movie',
          stream_id: 2002,
          stream_icon: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
          rating: '8.2',
          added: '1704500000',
          category_id: '202',
          container_extension: 'mp4',
          year: '2025',
          duration: '01:54:12',
          plot: 'Pilotos clandestinos se enfrentan por el control de las autopistas de Tokio en coches hipermodificados.',
          genre: 'Acción, Suspenso',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        },
        {
          num: 3,
          name: 'El Enigma del Abismo Cósmico',
          stream_type: 'movie',
          stream_id: 2003,
          stream_icon: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
          rating: '9.1',
          added: '1704000000',
          category_id: '203',
          container_extension: 'mp4',
          year: '2025',
          duration: '02:28:00',
          plot: 'Una tripulación científica responde a una señal misteriosa en los confines del sistema solar, descubriendo una anomalía que distorsiona el tiempo.',
          genre: 'Ciencia Ficción, Aventura',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        },
        {
          num: 4,
          name: 'La Mansión de las Sombras',
          stream_type: 'movie',
          stream_id: 2004,
          stream_icon: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
          rating: '7.6',
          added: '1703500000',
          category_id: '204',
          container_extension: 'mp4',
          year: '2025',
          duration: '01:45:30',
          plot: 'Una familia hereda un castillo victoriano aislado sin saber que los antiguos habitantes nunca se marcharon realmente.',
          genre: 'Terror, Misterio',
          stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        },
      ];

    case 'get_series_categories':
      return [
        { category_id: '301', category_name: '⭐ SERIES TENDENCIA MUNDIAL', parent_id: 0 },
        { category_id: '302', category_name: '⚔️ DRAMA HISTÓRICO & ACCIÓN', parent_id: 0 },
        { category_id: '303', category_name: '🤖 CIENCIA FICCIÓN & TECNOLOGÍA', parent_id: 0 },
        { category_id: '304', category_name: '👺 ANIME SERIES COMPLETAS', parent_id: 0 },
      ];

    case 'get_series':
      return [
        {
          num: 1,
          name: 'Crónicas del Trono Imperial',
          series_id: 3001,
          cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
          plot: 'Guerras dinásticas, traición política y batallas épicas por el control del continente eterno.',
          genre: 'Drama Épico, Acción',
          releaseDate: '2024-2026',
          rating: '9.4',
          category_id: '301',
        },
        {
          num: 2,
          name: 'Protocolo Cero: Hackers de Medianoche',
          series_id: 3002,
          cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
          plot: 'Un grupo clandestino de analistas descubre un algoritmo que predice crímenes antes de que ocurran.',
          genre: 'Thriller Tecnológico',
          releaseDate: '2025',
          rating: '8.9',
          category_id: '303',
        },
        {
          num: 3,
          name: 'Shinobi: El Despertar del Dragón',
          series_id: 3003,
          cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
          plot: 'En un Japón feudal alternativo, guerreros legendarios despiertan bestias astrales para detener una invasión espectral.',
          genre: 'Anime, Aventura, Fantasía',
          releaseDate: '2026',
          rating: '9.6',
          category_id: '304',
        },
      ];

    case 'get_series_info':
      return {
        seasons: [
          { season_number: 1, name: 'Temporada 1', episode_count: 3 },
          { season_number: 2, name: 'Temporada 2', episode_count: 2 },
        ],
        info: {
          name: 'Crónicas del Trono Imperial',
          cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
          plot: 'Guerras dinásticas, traición política y batallas épicas por el control del continente eterno.',
          genre: 'Drama Épico, Acción',
          releaseDate: '2024-2026',
          rating: '9.4',
        },
        episodes: {
          '1': [
            {
              id: 'e101',
              episode_num: 1,
              title: 'Capítulo 1: La Caída de los Estandartes',
              container_extension: 'mp4',
              info: { duration: '58 min', plot: 'El rey es traicionado en la víspera de la gran cosecha.' },
              stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            },
            {
              id: 'e102',
              episode_num: 2,
              title: 'Capítulo 2: El Voto de Fuego',
              container_extension: 'mp4',
              info: { duration: '52 min', plot: 'La guardia del norte inicia su marcha hacia el estrecho.' },
              stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            },
            {
              id: 'e103',
              episode_num: 3,
              title: 'Capítulo 3: Sombras en el Muro',
              container_extension: 'mp4',
              info: { duration: '61 min', plot: 'Una emboscada nocturna cambia el equilibrio de poder.' },
              stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            },
          ],
          '2': [
            {
              id: 'e201',
              episode_num: 1,
              title: 'Capítulo 1: El Regreso del Conquistador',
              container_extension: 'mp4',
              info: { duration: '64 min', plot: 'Nuevas alianzas forjan una legión impenetrable.' },
              stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            },
          ],
        },
      };

    default:
      return [];
  }
}

// -------------------------------------------------------------
// Vite Dev Server or Production Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nexus IPTV Pro Backend & Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
