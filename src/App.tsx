import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveSection,
  CentralizedConfig,
  DeviceViewMode,
  PlaybackState,
  XtreamAuthResponse,
  XtreamUserInfo,
} from './types/iptv';
import { iptvApi, StoredSession } from './services/iptvApi';
import { useRemoteControl, RemoteKey } from './hooks/useRemoteControl';

// Components
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { LiveTVScreen } from './components/LiveTVScreen';
import { MoviesScreen } from './components/MoviesScreen';
import { SeriesScreen } from './components/SeriesScreen';
import { AnimeScreen } from './components/AnimeScreen';
import { EspecialScreen } from './components/EspecialScreen';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanelModal } from './components/AdminPanelModal';
import { VideoPlayer } from './components/VideoPlayer';
import { VirtualRemote } from './components/VirtualRemote';
import { ApkExportGuideModal } from './components/ApkExportGuideModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<CentralizedConfig | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Navigation State
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [viewMode, setViewMode] = useState<DeviceViewMode>('tv');

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isRemoteOpen, setIsRemoteOpen] = useState<boolean>(false);
  const [isApkGuideOpen, setIsApkGuideOpen] = useState<boolean>(false);
  const [availableUpdate, setAvailableUpdate] = useState<{
    latestVersion: string;
    currentVersion: string;
    apkDownloadUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
  } | null>(null);

  // Active Fullscreen Video Playback
  const [activePlayback, setActivePlayback] = useState<PlaybackState | null>(null);

  // 1. Initial Load: Fetch Config, Check Updates & Restore Session + Check Admin Route (#calixtv or /calixtv)
  useEffect(() => {
    async function init() {
      try {
        const fetchedConfig = await iptvApi.fetchConfig();
        setConfig(fetchedConfig);

        // Check for app updates (OTA)
        const updateCheck = await iptvApi.checkAppUpdate('1.0');
        if (updateCheck && updateCheck.hasUpdate) {
          setAvailableUpdate(updateCheck);
        }

        const savedSession = iptvApi.getSavedSession();
        if (savedSession) {
          setSession(savedSession);
        }

        // Check URL route for calixtv admin access
        const checkCalixtvRoute = () => {
          const currentUrl = window.location.href.toLowerCase();
          const path = window.location.pathname.toLowerCase();
          const hash = window.location.hash.toLowerCase();
          const search = window.location.search.toLowerCase();

          if (
            hash.includes('calixtv') ||
            path.includes('calixtv') ||
            search.includes('calixtv') ||
            currentUrl.includes('calixtv')
          ) {
            setIsAdminOpen(true);
          }
        };

        checkCalixtvRoute();
        window.addEventListener('hashchange', checkCalixtvRoute);
        window.addEventListener('popstate', checkCalixtvRoute);

        return () => {
          window.removeEventListener('hashchange', checkCalixtvRoute);
          window.removeEventListener('popstate', checkCalixtvRoute);
        };
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  // 2. Play Stream Handler
  const handlePlayStream = useCallback((stream: {
    streamId: string | number;
    title: string;
    url: string;
    type: 'live' | 'movie' | 'episode';
    poster?: string;
    category?: string;
  }) => {
    setActivePlayback({
      streamId: stream.streamId,
      title: stream.title,
      url: stream.url,
      type: stream.type,
      poster: stream.poster,
      category: stream.category,
    });
  }, []);

  // 3. Remote Control Key Listener (TV Remote D-Pad & shortcuts)
  const handleRemoteKey = useCallback(
    (key: RemoteKey) => {
      // If full player is active, Back closes it
      if (activePlayback) {
        if (key === 'BACK') {
          setActivePlayback(null);
          return true;
        }
        return false;
      }

      // If any modal is open, Back closes it
      if (isAdminOpen) {
        if (key === 'BACK') {
          setIsAdminOpen(false);
          return true;
        }
        return false;
      }
      if (isApkGuideOpen) {
        if (key === 'BACK') {
          setIsApkGuideOpen(false);
          return true;
        }
        return false;
      }

      // If inside a sub-screen, Back returns to Home
      if (activeSection !== 'home') {
        if (key === 'BACK' || key === 'HOME') {
          setActiveSection('home');
          return true;
        }
      }

      if (key === 'HOME') {
        setActiveSection('home');
        return true;
      }

      return false;
    },
    [activePlayback, isAdminOpen, isApkGuideOpen, activeSection]
  );

  const { triggerRemoteKey } = useRemoteControl({
    onKey: handleRemoteKey,
    enableSpatialNav: true,
  });

  // 4. Session Handlers
  const handleLoginSuccess = (auth: XtreamAuthResponse, username: string) => {
    const newSession: StoredSession = {
      username,
      authResponse: auth,
      savedAt: Date.now(),
    };
    setSession(newSession);
    setActiveSection('home');
  };

  const handleEnterGuestMode = async () => {
    try {
      const auth = await iptvApi.login('demo', 'demo');
      const guestSession: StoredSession = {
        username: 'Invitado',
        authResponse: {
          ...auth,
          user_info: {
            ...auth.user_info,
            username: 'Invitado',
          },
        },
        savedAt: Date.now(),
      };
      setSession(guestSession);
      setActiveSection('home');
    } catch {
      const fallbackSession: StoredSession = {
        username: 'Invitado',
        authResponse: {
          user_info: {
            username: 'Invitado',
            auth: 1,
            status: 'Active',
            exp_date: '1798761600',
            is_trial: '1',
            active_cons: '1',
            created_at: '1704067200',
            max_connections: '1',
          },
          server_info: {
            url: config?.serverUrl || 'http://xtream.demo-nexus.tv:8080',
            port: '8080',
            server_protocol: 'http',
          },
        },
        savedAt: Date.now(),
      };
      setSession(fallbackSession);
      setActiveSection('home');
    }
  };

  const handleLogout = () => {
    iptvApi.clearSession();
    setSession(null);
    setActiveSection('home');
    setActivePlayback(null);
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'tv' ? 'mobile' : 'tv'));
  };

  // Loading Screen while bootstrapping
  if (isInitializing || !config) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#07080c] text-white">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold tracking-wide">Iniciando Nexus IPTV Pro...</h2>
        <p className="text-xs text-zinc-500 mt-1">Conectando con la configuración centralizada</p>
      </div>
    );
  }

  // If no session, show Login Screen (no server URL asked!)
  if (!session) {
    return (
      <>
        <LoginScreen
          config={config}
          onLoginSuccess={handleLoginSuccess}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onEnterGuest={handleEnterGuestMode}
        />
        {isAdminOpen && (
          <AdminPanelModal
            initialConfig={config}
            onClose={() => setIsAdminOpen(false)}
            onConfigSaved={(updated) => setConfig(updated)}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#08090d] text-zinc-100 ${
        viewMode === 'tv' ? 'tv-overscan text-base' : 'text-sm'
      }`}
    >
      {/* Top Application Bar - Only shown in sub-sections, Home has its own integrated TV bar matching the screenshot */}
      {activeSection !== 'home' && (
        <Header
          appName={config.serviceName || 'NEXUS IPTV PRO'}
          version="v2.5.4"
          userInfo={session.authResponse.user_info}
          serverUrl={config.serverUrl}
          isOnline={true}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          onOpenSettings={() => setIsAdminOpen(true)}
          onOpenRemote={() => setIsRemoteOpen((prev) => !prev)}
          onOpenApkGuide={() => setIsApkGuideOpen(true)}
          onLogout={handleLogout}
          onHomeClick={() => setActiveSection('home')}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeSection === 'home' && (
          <HomeScreen
            config={config}
            onNavigate={(sec) => setActiveSection(sec)}
            onPlayStream={handlePlayStream}
            onOpenSettings={() => setIsAdminOpen(true)}
            onOpenSpeedTest={() => setIsAdminOpen(true)}
            onOpenFavorites={() => setActiveSection('live')}
          />
        )}

        {activeSection === 'live' && (
          <LiveTVScreen
            username={session.username}
            onBack={() => setActiveSection('home')}
            onPlayStream={handlePlayStream}
          />
        )}

        {activeSection === 'movies' && (
          <MoviesScreen
            username={session.username}
            onBack={() => setActiveSection('home')}
            onPlayStream={handlePlayStream}
          />
        )}

        {activeSection === 'series' && (
          <SeriesScreen
            username={session.username}
            onBack={() => setActiveSection('home')}
            onPlayStream={handlePlayStream}
          />
        )}

        {activeSection === 'anime' && (
          <AnimeScreen
            username={session.username}
            onBack={() => setActiveSection('home')}
            onPlayStream={handlePlayStream}
          />
        )}

        {activeSection === 'especial' && (
          <EspecialScreen
            username={session.username}
            onBack={() => setActiveSection('home')}
            onPlayStream={handlePlayStream}
          />
        )}
      </main>

      {/* Global Fullscreen Video Player Modal */}
      {activePlayback && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <VideoPlayer
            url={activePlayback.url}
            title={activePlayback.title}
            subtitle={activePlayback.category}
            type={activePlayback.type}
            poster={activePlayback.poster}
            autoPlay={true}
            onClose={() => setActivePlayback(null)}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Admin Panel Modal */}
      {isAdminOpen && (
        <AdminPanelModal
          initialConfig={config}
          onClose={() => setIsAdminOpen(false)}
          onConfigSaved={(newCfg) => setConfig(newCfg)}
        />
      )}

      {/* Virtual Remote Control HUD */}
      <VirtualRemote
        isOpen={isRemoteOpen}
        onClose={() => setIsRemoteOpen(false)}
        onTriggerKey={triggerRemoteKey}
      />

      {/* APK Compilation & Android TV Guide Modal */}
      {isApkGuideOpen && (
        <ApkExportGuideModal onClose={() => setIsApkGuideOpen(false)} />
      )}

      {/* Over-The-Air (OTA) App Update Notification Modal */}
      {availableUpdate && (
        <AppUpdateModal
          updateInfo={availableUpdate}
          onClose={() => setAvailableUpdate(null)}
        />
      )}
    </div>
  );
}
