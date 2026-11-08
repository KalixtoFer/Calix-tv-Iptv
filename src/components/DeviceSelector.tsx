import React, { useEffect, useRef } from 'react';
import { Tv, Smartphone, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { DeviceViewMode } from '../types/iptv';

interface DeviceSelectorProps {
  onSelect: (mode: DeviceViewMode) => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({ onSelect }) => {
  const tvButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Default focus for TV mode compatibility
    tvButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, mode: DeviceViewMode) => {
    if (e.key === 'Enter') {
      onSelect(mode);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030408] text-white flex flex-col items-center justify-center p-6 sm:p-10 select-none overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 mb-12 z-10"
      >
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
          ¿Dónde vas a usarla?
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base font-medium max-w-md mx-auto">
          Elegí el modo para ajustar botones, foco y gestos.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl z-10">
        {/* TV / BOX CARD */}
        <button
          ref={tvButtonRef}
          onClick={() => onSelect('tv')}
          onKeyDown={(e) => handleKeyDown(e, 'tv')}
          className="group relative flex flex-col items-center justify-center p-8 sm:p-10 bg-zinc-900/40 border-2 border-zinc-800 rounded-[2.5rem] hover:bg-zinc-900/60 focus:bg-zinc-900/80 focus:border-cyan-500 hover:border-cyan-500/50 outline-none transition-all duration-300 active:scale-95 shadow-xl"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-focus:scale-110 transition-transform duration-500 group-hover:bg-cyan-500/20 group-focus:bg-cyan-500/20 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <Tv className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-400 group-focus:text-cyan-400 transition-colors uppercase">
              TV / Box
            </h3>
            <p className="text-zinc-500 text-xs sm:text-sm font-bold tracking-wider uppercase opacity-80">
              Control remoto
            </p>
          </div>
          
          {/* Focus Ring Effect */}
          <div className="absolute inset-0 rounded-[2.5rem] border-2 border-cyan-500 opacity-0 group-focus:opacity-100 transition-opacity pointer-events-none shadow-[0_0_40px_rgba(6,182,212,0.2)]" />
        </button>

        {/* MOBILE CARD */}
        <button
          onClick={() => onSelect('mobile')}
          onKeyDown={(e) => handleKeyDown(e, 'mobile')}
          className="group relative flex flex-col items-center justify-center p-8 sm:p-10 bg-zinc-900/40 border-2 border-zinc-800 rounded-[2.5rem] hover:bg-zinc-900/60 focus:bg-zinc-900/80 focus:border-cyan-500 hover:border-cyan-500/50 outline-none transition-all duration-300 active:scale-95 shadow-xl"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 group-focus:scale-110 transition-transform duration-500 group-hover:bg-blue-500/20 group-focus:bg-blue-500/20 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
            <Smartphone className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-400 group-focus:text-blue-400 transition-colors uppercase">
              Celular
            </h3>
            <p className="text-zinc-500 text-xs sm:text-sm font-bold tracking-wider uppercase opacity-80">
              Pantalla táctil
            </p>
          </div>

          {/* Focus Ring Effect */}
          <div className="absolute inset-0 rounded-[2.5rem] border-2 border-cyan-500 opacity-0 group-focus:opacity-100 transition-opacity pointer-events-none shadow-[0_0_40px_rgba(6,182,212,0.2)]" />
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 flex items-center gap-2 text-zinc-500 text-xs sm:text-sm font-medium z-10"
      >
        <Info className="w-4 h-4 text-cyan-500/60" />
        <span>ⓘ Después podés cambiarlo desde Ajustes.</span>
      </motion.div>
    </div>
  );
};
