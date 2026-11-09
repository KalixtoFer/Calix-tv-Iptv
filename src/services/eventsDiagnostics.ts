import { Capacitor } from '@capacitor/core';
import { httpGetJson, LEAGUES, parseScoreboard } from './sportsApi';
import { dbService } from './db';
import { iptvApi, norm } from './iptvApi';

export interface DynamicFolderDiagnostic {
  name: string;
  sourceGroup: string;
  normSource: string;
  channelsCount: number;
  status: 'Activa' | 'Sin canales' | 'No encontrada en proveedor';
}

export interface EventsDiagnosticData {
  timestamp: number;
  platform: string;
  isNative: boolean;
  testedUrl: string;
  httpStatus: number | string;
  responseTimeMs: number;
  eventsCount: number;
  source: 'RED' | 'CACHÉ (IndexedDB)' | 'ERROR';
  cacheAge: string;
  lastError: string | null;
  dynamicFolders: DynamicFolderDiagnostic[];
  totalLeaguesTested: number;
  totalLeaguesOk: number;
}

let latestDiagnostic: EventsDiagnosticData | null = null;

export const eventsDiagnosticsService = {
  getLatest(): EventsDiagnosticData | null {
    return latestDiagnostic;
  },

  async runDiagnostics(username: string): Promise<EventsDiagnosticData> {
    const isNative = Capacitor.isNativePlatform();
    const platform = isNative ? 'Android (Capacitor Nativo)' : 'Navegador Web';
    const testLeague = LEAGUES[0] || { sport: 'soccer', id: 'arg.1', name: 'Liga Profesional' };
    const testUrl = `https://site.api.espn.com/apis/site/v2/sports/${testLeague.sport}/${testLeague.id}/scoreboard`;

    let httpStatus: number | string = 'N/A';
    let responseTimeMs = 0;
    let eventsCount = 0;
    let source: 'RED' | 'CACHÉ (IndexedDB)' | 'ERROR' = 'RED';
    let cacheAge = 'Sin caché previa';
    let lastError: string | null = null;
    let totalLeaguesTested = 0;
    let totalLeaguesOk = 0;

    // 1. Probar consulta de red con httpGetJson
    try {
      const res = await httpGetJson(testUrl);
      httpStatus = res.status;
      responseTimeMs = res.durationMs;
      const parsed = parseScoreboard(res.data, testLeague);
      eventsCount = parsed.length;
      totalLeaguesTested = 1;
      totalLeaguesOk = res.status === 200 ? 1 : 0;
      source = 'RED';
    } catch (netErr: any) {
      lastError = netErr.message || String(netErr);
      source = 'ERROR';

      // 2. Si falló la red, verificar caché de IndexedDB
      try {
        const cached = await dbService.getEvents();
        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          const ageMs = Date.now() - cached.timestamp;
          const ageMin = Math.floor(ageMs / 60000);
          const ageSec = Math.floor((ageMs % 60000) / 1000);
          cacheAge = ageMin > 0 ? `${ageMin}m ${ageSec}s` : `${ageSec}s`;
          eventsCount = cached.data.length;
          source = 'CACHÉ (IndexedDB)';
        }
      } catch (cacheErr: any) {
        lastError += ` | Error caché: ${cacheErr.message || cacheErr}`;
      }
    }

    // 3. Revisar carpetas dinámicas del channel-map
    const dynamicFolders: DynamicFolderDiagnostic[] = [];
    try {
      const liveCats = await iptvApi.getCategories('live', username);
      const allStreams = await iptvApi.getStreams('live', username);

      // Obtener configuración de categorías dinámicas
      const session = iptvApi.getSavedSession();
      const rawCats = liveCats; // Categorías ya mapeadas y normalizadas

      // Buscar las dinámicas marcadas con _managed
      const managedDynamic = liveCats.filter((c: any) => c._managed?.dynamic === true);

      if (managedDynamic.length > 0) {
        for (const cat of managedDynamic) {
          const sGroup = cat._sourceGroup || cat._managed?.sourceGroup || cat.category_name;
          const normS = norm(sGroup);
          const provId = String(cat._providerCategoryId || cat.category_id);

          const matchingChannels = allStreams.filter((s: any) =>
            String(s.category_id) === provId ||
            norm(s.category_name || '') === normS ||
            norm(s.group_title || '') === normS
          );

          dynamicFolders.push({
            name: cat.managedName || cat.category_name,
            sourceGroup: sGroup,
            normSource: normS,
            channelsCount: matchingChannels.length,
            status: matchingChannels.length > 0 ? 'Activa' : 'Sin canales',
          });
        }
      } else {
        // Si no se han procesado aún, listar las conocidas de channel-map
        const knownDynamics = [
          { name: 'Eventos TV', sourceGroup: '⭐EVENTOS TV⭐' },
          { name: 'Eventos Encoder', sourceGroup: '⭐ EVENTOS ENCODER ⭐' },
          { name: 'Evento Exclusivo', sourceGroup: '⚽EVENTO EXCLUSIVO⚽' },
          { name: 'Evento', sourceGroup: '⚽⚽EVENTO⚽⚽' },
          { name: 'NBA - NFL - NHL - MLB - MLS (Eventos)', sourceGroup: '⭐ NBA - NFL - NHL - MLB - MLS (EVENTOS)' },
          { name: 'Eventos Disney+', sourceGroup: '⭐EVENTOS DISNEY+⭐' },
          { name: 'Eventos Netflix', sourceGroup: '⭐EVENTOS NETFLIX⭐' },
          { name: 'Tennis - F1', sourceGroup: '✅ TENNIS - F1' },
          { name: 'NBA', sourceGroup: '✅ NBA' },
          { name: 'MLB', sourceGroup: '✅ MLB' },
          { name: 'NHL', sourceGroup: '✅ NHL' },
          { name: 'NFL', sourceGroup: '✅ NFL' },
        ];

        for (const kd of knownDynamics) {
          const normS = norm(kd.sourceGroup);
          const foundCat = liveCats.find((c: any) => norm(c.category_name || '') === normS || norm(c.managedName || '') === normS);
          const matchingChannels = allStreams.filter((s: any) =>
            (foundCat && String(s.category_id) === String(foundCat._providerCategoryId || foundCat.category_id)) ||
            norm(s.category_name || '') === normS
          );

          dynamicFolders.push({
            name: kd.name,
            sourceGroup: kd.sourceGroup,
            normSource: normS,
            channelsCount: matchingChannels.length,
            status: foundCat ? (matchingChannels.length > 0 ? 'Activa' : 'Sin canales') : 'No encontrada en proveedor',
          });
        }
      }
    } catch (e: any) {
      console.warn('[DIAGNÓSTICO] Error evaluando carpetas dinámicas:', e);
    }

    latestDiagnostic = {
      timestamp: Date.now(),
      platform,
      isNative,
      testedUrl: testUrl,
      httpStatus,
      responseTimeMs,
      eventsCount,
      source,
      cacheAge,
      lastError,
      dynamicFolders,
      totalLeaguesTested,
      totalLeaguesOk,
    };

    return latestDiagnostic;
  },

  formatReportText(d: EventsDiagnosticData): string {
    const dateStr = new Date(d.timestamp).toLocaleString('es-AR');
    let text = `=== DIAGNÓSTICO CALIX TV 2.0 (EVENTOS) ===\n`;
    text += `Fecha y hora: ${dateStr}\n`;
    text += `Plataforma: ${d.platform}\n`;
    text += `Modo Nativo: ${d.isNative ? 'SÍ (CapacitorHttp activo)' : 'NO (Navegador Web)'}\n\n`;

    text += `--- CONSULTA API DEPORTES ---\n`;
    text += `URL consultada: ${d.testedUrl}\n`;
    text += `Código HTTP: ${d.httpStatus}\n`;
    text += `Tiempo de respuesta: ${d.responseTimeMs} ms\n`;
    text += `Partidos recibidos: ${d.eventsCount}\n`;
    text += `Origen de datos: ${d.source}\n`;
    if (d.source === 'CACHÉ (IndexedDB)') {
      text += `Antigüedad de la caché: ${d.cacheAge}\n`;
    }
    text += `Último error: ${d.lastError ? d.lastError : 'Ninguno (conexión exitosa)'}\n\n`;

    text += `--- CARPETAS DINÁMICAS (CHANNEL-MAP) ---\n`;
    text += `Total carpetas evaluadas: ${d.dynamicFolders.length}\n`;
    for (const f of d.dynamicFolders) {
      text += `• ${f.name} ("${f.sourceGroup}") -> ${f.channelsCount} canales (${f.status})\n`;
    }
    text += `==========================================`;
    return text;
  },
};
