import React from 'react';
import { Home, Tv, Trophy, Film, Clapperboard, Settings } from 'lucide-react';
import { ActiveSection } from '../types/iptv';

interface MobileBottomNavProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  onOpenSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  onNavigate,
  onOpenSettings,
}) => {
  const navItems: {
    id: ActiveSection | 'settings';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'live', label: 'TV en Vivo', icon: Tv },
    { id: 'events', label: 'Eventos', icon: Trophy },
    { id: 'movies', label: 'Películas', icon: Film },
    { id: 'series', label: 'Series', icon: Clapperboard },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav
      aria-label="Navegación móvil"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#060812]/95 backdrop-blur-2xl border-t border-zinc-800/90 px-2 pt-2 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.6)] select-none"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id !== 'settings' && activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'settings') {
                onOpenSettings();
              } else {
                onNavigate(item.id);
              }
            }}
            className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
              isActive
                ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] font-black'
                : 'text-zinc-400 hover:text-zinc-200 font-semibold'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                isActive ? 'bg-cyan-500/15' : 'bg-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight truncate max-w-[62px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
