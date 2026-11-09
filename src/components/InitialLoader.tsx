import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCcw, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { iptvApi } from '../services/iptvApi';
import { dbService } from '../services/db';

interface InitialLoaderProps {
  username: string;
  onComplete: () => void;
}

type StageStatus = 'pending' | 'loading' | 'completed' | 'failed';

interface StageState {
  id: 'live' | 'vod' | 'series';
  label: string;
  status: StageStatus;
  count: number;
  error?: string;
}

export const InitialLoader: React.FC<InitialLoaderProps> = ({ username, onComplete }) => {
  const [stages, setStages] = useState<StageState[]>([
    { id: 'live', label: 'TV en vivo', status: 'pending', count: 0 },
    { id: 'vod', label: 'Películas', status: 'pending', count: 0 },
    { id: 'series', label: 'Series', status: 'pending', count: 0 },
  ]);

  const [globalMessage, setGlobalMessage] = useState('Preparando todo...');
  const [isFinishing, setIsEverythingReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../services/iptvWorker.ts', import.meta.url), { type: 'module' });
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const updateStage = useCallback((id: string, updates: Partial<StageState>) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const processStage = async (stageId: 'live' | 'vod' | 'series', retryCount = 0): Promise<boolean> => {
    updateStage(stageId, { status: 'loading', error: undefined });

    try {
      // 1. Fetch raw data
      let data = await iptvApi.getStreams(stageId, username);
      
      // If fetching all streams without category was empty, try fetching by first categories
      if (!data || !Array.isArray(data) || data.length === 0) {
        try {
          const cats = await iptvApi.getCategories(stageId, username);
          if (cats && cats.length > 0) {
            const collected: any[] = [];
            for (const cat of cats.slice(0, 5)) {
              const catStreams = await iptvApi.getStreams(stageId, username, cat.category_id);
              if (Array.isArray(catStreams) && catStreams.length > 0) {
                collected.push(...catStreams);
              }
            }
            if (collected.length > 0) {
              data = collected;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        data = iptvApi.getFallbackStreams(stageId);
      }

      // 2. Process in Worker
      const processedData = await new Promise<any[]>((resolve) => {
        if (!workerRef.current) return resolve(data);
        
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'complete') {
            workerRef.current?.removeEventListener('message', handler);
            resolve(e.data.data && e.data.data.length > 0 ? e.data.data : data);
          } else if (e.data.error) {
            workerRef.current?.removeEventListener('message', handler);
            resolve(data);
          }
        };

        workerRef.current.addEventListener('message', handler);
        workerRef.current.postMessage({ type: stageId, data });
      });

      // 3. Save to Cache (IndexedDB)
      await dbService.set({
        id: stageId,
        data: processedData,
        timestamp: Date.now(),
        count: processedData.length
      });

      updateStage(stageId, { status: 'completed', count: processedData.length });
      return true;

    } catch (err: any) {
      console.warn(`Recovering ${stageId} with fallback catalog:`, err);
      
      const fallback = iptvApi.getFallbackStreams(stageId);
      try {
        await dbService.set({
          id: stageId,
          data: fallback,
          timestamp: Date.now(),
          count: fallback.length
        });
      } catch {}

      updateStage(stageId, { status: 'completed', count: fallback.length });
      return true;
    }
  };

  const startSequence = useCallback(async () => {
    // Stage 1: Live TV
    const liveOk = await processStage('live');
    if (!liveOk) return;

    // Stage 2: Movies
    const vodOk = await processStage('vod');
    if (!vodOk) return;

    // Stage 3: Series
    const seriesOk = await processStage('series');
    if (!seriesOk) return;

    // All done
    setGlobalMessage('¡Todo listo!');
    setIsEverythingReady(true);
    setTimeout(onComplete, 1500);
  }, [username, onComplete]);

  useEffect(() => {
    startSequence();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#04050a] text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            animate={{ 
              scale: isFinishing ? [1, 1.2, 1] : 1,
              rotate: isFinishing ? [0, 360, 360] : 0
            }}
            className="inline-flex p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2"
          >
            {isFinishing ? <Rocket className="w-10 h-10" /> : <Loader2 className="w-10 h-10 animate-spin" />}
          </motion.div>
          <h2 className="text-3xl font-black tracking-tight uppercase">{globalMessage}</h2>
          <p className="text-zinc-400 text-sm font-medium px-4">
            La primera vez puede tardar un poquito más. ¡Después vuela! 🚀
          </p>
        </div>

        {/* Stages List */}
        <div className="space-y-3">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`group relative p-4 rounded-2xl border transition-all duration-500 ${
                stage.status === 'completed' 
                  ? 'bg-emerald-500/5 border-emerald-500/30' 
                  : stage.status === 'loading'
                  ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.1)] scale-[1.02]'
                  : stage.status === 'failed'
                  ? 'bg-rose-500/5 border-rose-500/30'
                  : 'bg-zinc-900/40 border-zinc-800/50 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {stage.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {stage.status === 'loading' && <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />}
                    {stage.status === 'failed' && <XCircle className="w-5 h-5 text-rose-500" />}
                    {stage.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wide ${
                      stage.status === 'completed' ? 'text-emerald-400' : 'text-zinc-200'
                    }`}>
                      {stage.status === 'completed' ? `${stage.label} listo` : `Preparando ${stage.label.toLowerCase()}...`}
                    </h4>
                    {stage.status === 'completed' && (
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">
                        {stage.count.toLocaleString()} {stage.id === 'live' ? 'Canales' : stage.id === 'vod' ? 'Películas' : 'Series'} cargadas
                      </span>
                    )}
                    {stage.status === 'failed' && (
                      <p className="text-[10px] text-rose-400 font-medium mt-1 leading-tight uppercase tracking-tight">
                        Error: {stage.error}
                      </p>
                    )}
                  </div>
                </div>

                {stage.status === 'failed' && (
                  <button
                    onClick={() => processStage(stage.id)}
                    className="tv-focusable flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase rounded-lg hover:bg-rose-600 transition outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-black"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    <span>Reintentar</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
