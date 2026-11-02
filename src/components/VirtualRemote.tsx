import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Home,
  Menu,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  X,
  Radio,
  Tv,
} from 'lucide-react';
import { RemoteKey } from '../hooks/useRemoteControl';

interface VirtualRemoteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerKey: (key: RemoteKey) => void;
}

export const VirtualRemote: React.FC<VirtualRemoteProps> = ({
  isOpen,
  onClose,
  onTriggerKey,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center bg-zinc-950/95 border-2 border-zinc-700/80 rounded-3xl p-4 shadow-[0_0_35px_rgba(0,0,0,0.8)] backdrop-blur-xl w-64 select-none animate-fadeIn">
      {/* Remote Header */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Control Remoto TV Box</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Power & Mute */}
      <div className="w-full flex items-center justify-between px-2 mb-3">
        <button
          onClick={() => onTriggerKey('HOME')}
          className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer"
          title="Inicio"
        >
          <Home className="w-4 h-4" />
        </button>

        <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">D-PAD</span>

        <button
          onClick={() => onTriggerKey('MUTE')}
          className="p-2 bg-zinc-900 hover:bg-zinc-800 text-rose-400 rounded-xl cursor-pointer"
          title="Silenciar"
        >
          <VolumeX className="w-4 h-4" />
        </button>
      </div>

      {/* D-PAD Circular Controller */}
      <div className="relative w-44 h-44 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center shadow-inner my-2">
        {/* UP */}
        <button
          onClick={() => onTriggerKey('UP')}
          className="absolute top-1 p-2 text-zinc-300 hover:text-cyan-400 active:scale-95 transition cursor-pointer"
          title="Arriba"
        >
          <ChevronUp className="w-7 h-7" />
        </button>

        {/* DOWN */}
        <button
          onClick={() => onTriggerKey('DOWN')}
          className="absolute bottom-1 p-2 text-zinc-300 hover:text-cyan-400 active:scale-95 transition cursor-pointer"
          title="Abajo"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        {/* LEFT */}
        <button
          onClick={() => onTriggerKey('LEFT')}
          className="absolute left-1 p-2 text-zinc-300 hover:text-cyan-400 active:scale-95 transition cursor-pointer"
          title="Izquierda"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        {/* RIGHT */}
        <button
          onClick={() => onTriggerKey('RIGHT')}
          className="absolute right-1 p-2 text-zinc-300 hover:text-cyan-400 active:scale-95 transition cursor-pointer"
          title="Derecha"
        >
          <ChevronRight className="w-7 h-7" />
        </button>

        {/* CENTER OK BUTTON */}
        <button
          onClick={() => onTriggerKey('OK')}
          className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 active:scale-90 text-black font-extrabold text-sm shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center justify-center transition cursor-pointer"
          title="Seleccionar (OK)"
        >
          OK
        </button>
      </div>

      {/* Back, Home, Menu Row */}
      <div className="w-full grid grid-cols-3 gap-2 my-2">
        <button
          onClick={() => onTriggerKey('BACK')}
          className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer"
          title="Atrás (Volver)"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" />
          <span className="text-[10px]">Atrás</span>
        </button>

        <button
          onClick={() => onTriggerKey('HOME')}
          className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer"
          title="Inicio"
        >
          <Home className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px]">Inicio</span>
        </button>

        <button
          onClick={() => onTriggerKey('FULLSCREEN')}
          className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer"
          title="Pantalla Completa"
        >
          <Maximize2 className="w-4 h-4 text-zinc-400" />
          <span className="text-[10px]">Zoom</span>
        </button>
      </div>

      {/* Vol & Channel Rockers */}
      <div className="w-full grid grid-cols-2 gap-2 my-1">
        {/* Vol Up / Down */}
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-center">
          <span className="text-[9px] font-mono text-zinc-400 font-bold mb-0.5">VOL</span>
          <button
            onClick={() => onTriggerKey('VOL_UP')}
            className="py-1 hover:bg-zinc-800 rounded text-xs font-bold text-zinc-300 cursor-pointer"
          >
            +
          </button>
          <button
            onClick={() => onTriggerKey('VOL_DOWN')}
            className="py-1 hover:bg-zinc-800 rounded text-xs font-bold text-zinc-300 cursor-pointer"
          >
            -
          </button>
        </div>

        {/* Ch Up / Down */}
        <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-center">
          <span className="text-[9px] font-mono text-zinc-400 font-bold mb-0.5">CANAL</span>
          <button
            onClick={() => onTriggerKey('CH_UP')}
            className="py-1 hover:bg-zinc-800 rounded text-xs font-bold text-cyan-400 cursor-pointer"
          >
            CH+
          </button>
          <button
            onClick={() => onTriggerKey('CH_DOWN')}
            className="py-1 hover:bg-zinc-800 rounded text-xs font-bold text-cyan-400 cursor-pointer"
          >
            CH-
          </button>
        </div>
      </div>

      {/* Colored TV Keys (Red, Green, Yellow, Blue) */}
      <div className="w-full grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-zinc-800">
        <button
          onClick={() => onTriggerKey('RED')}
          className="h-3 rounded-full bg-red-500 hover:brightness-125 cursor-pointer shadow-sm"
          title="Botón Rojo (Favoritos)"
        />
        <button
          onClick={() => onTriggerKey('GREEN')}
          className="h-3 rounded-full bg-emerald-500 hover:brightness-125 cursor-pointer shadow-sm"
          title="Botón Verde (Audio)"
        />
        <button
          onClick={() => onTriggerKey('YELLOW')}
          className="h-3 rounded-full bg-amber-400 hover:brightness-125 cursor-pointer shadow-sm"
          title="Botón Amarillo (EPG)"
        />
        <button
          onClick={() => onTriggerKey('BLUE')}
          className="h-3 rounded-full bg-blue-500 hover:brightness-125 cursor-pointer shadow-sm"
          title="Botón Azul (Buscar)"
        />
      </div>

      <div className="mt-2 text-[10px] text-zinc-400 text-center">
        También puedes usar las flechas del teclado y Enter
      </div>
    </div>
  );
};
