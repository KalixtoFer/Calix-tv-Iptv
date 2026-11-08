import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveSection,
  CentralizedConfig,
  DeviceViewMode,
  PlaybackState,
  XtreamAuthResponse,
  XtreamUserInfo,
  SeriesItem,
} from './types/iptv';
import { iptvApi, StoredSession } from './services/iptvApi';
import { useRemoteControl, RemoteKey } from './hooks/useRemoteControl';
import { NativePlayer, canUseNativePlayer } from './services/nativePlayer';

// Components
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { LiveTVScreen } from './components/LiveTVScreen';
import { MoviesScreen } from './components/MoviesScreen';
import { SeriesScreen } from './components/SeriesScreen';
import { EventsScreen } from './components/EventsScreen';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanelModal } from './components/AdminPanelModal';
import { UserProfileModal } from './components/UserProfileModal';
import { VideoPlayer } from './components/VideoPlayer';
import { VirtualRemote } from './components/VirtualRemote';
import { ApkExportGuideModal } from './components/ApkExportGuideModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Loader2 } from 'lucide-react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { App as CapacitorApp } from '@capacitor/app';

export default function App() {
  const [config, setConfig] = useState<CentralizedConfig | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [targetSeriesDetail, setTargetSeriesDetail] = useState<SeriesItem | null>(null);

  // Navigation State
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [viewMode, setViewMode] = useState<DeviceViewMode>(() => {
    try {
      const saved = localStorage.getItem('calixtv_device_mode') as DeviceViewMode | null;
      if (saved === 'mobile' || saved === 'tv') {
        return saved;
      }
      if (typeof window !== 'undefined') {
        const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        const isSmall = window.innerWidth <= 768;
        if (isMobileUA || isSmall) return 'mobile';
      }
    } catch {
      // fallback
    }
    return 'mobile';
  });

  const handleViewModeChange = (mode: DeviceViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('calixtv_device_mode', mode);
    } catch {}
  };

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
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

  // 1. Initial Load: Fetch Config, Check Updates & Restore Session
  useEffect(() => {
    async function init() {
      try {
        const fetchedConfig = await iptvApi.fetchConfig();
        setConfig(fetchedConfig);

        // Check if URL specifies /admin or #admin
        if (typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.hash === '#admin')) {
          setIsAdminOpen(true);
        }

        // Check for app updates (OTA)
        const updateCheck = await iptvApi.checkAppUpdate('1.0');
        if (updateCheck && updateCheck.hasUpdate) {
          setAvailableUpdate(updateCheck);

          // Prompt for notification permission and post Android system notification
          if (canUseNativePlayer()) {
            NativePlayer.requestNotificationPermission?.().catch(() => {});
            NativePlayer.showNotification?.({
              title: `Nueva Versión Calix TV v${updateCheck.latestVersion}`,
              message: updateCheck.releaseNotes || 'Hay una nueva actualización lista para descargar e instalar.',
              url: updateCheck.apkDownloadUrl || '/api/iptv/download-apk',
            }).catch(() => {});
          }
        }

        const savedSession = iptvApi.getSavedSession();
        if (savedSession) {
          setSession(savedSession);
        }
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

  // 3. Screen Orientation Management (Auto-rotate to landscape on mobile during playback)
  useEffect(() => {
    if (activePlayback && viewMode === 'mobile') {
      try {
        ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
      } catch (e) {}
    } else if (!activePlayback && viewMode === 'mobile') {
      try {
        ScreenOrientation.unlock().catch(() => {});
      } catch (e) {}
    }
  }, [activePlayback, viewMode]);

  // 3.1 Handle Android Hardware Back Button
  useEffect(() => {
    const handleCapacitorBack = () => {
      if (activePlayback) {
        setActivePlayback(null);
      } else if (isProfileOpen) {
        setIsProfileOpen(false);
      } else if (isAdminOpen) {
        setIsAdminOpen(false);
      } else if (isRemoteOpen) {
        setIsRemoteOpen(false);
      } else if (isApkGuideOpen) {
        setIsApkGuideOpen(false);
      } else if (activeSection !== 'home') {
        setActiveSection('home');
      } else {
        // If already at home with no modals, exit app
        CapacitorApp.exitApp();
      }
    };

    const listener = CapacitorApp.addListener('backButton', handleCapacitorBack);
    return () => {
      listener.then(l => l.remove());
    };
  }, [activePlayback, activeSection, isAdminOpen, isRemoteOpen, isApkGuideOpen]);

  // 4. Remote Control Key Listener (TV Remote D-Pad & shortcuts)
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
            url: config?.serverUrl || 'https://sneoplus.net:8443',
            port: '8443',
            server_protocol: 'https',
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
    handleViewModeChange(viewMode === 'tv' ? 'mobile' : 'tv');
  };

  // Loading Screen while bootstrapping
  if (isInitializing || !config) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#07080c] text-white">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold tracking-wide">Iniciando Calix Tv iptv Pro...</h2>
        <p className="text-xs text-zinc-500 mt-1">Conectando con la configuración centralizada</p>
      </div>
    );
  }

  // Dedicated Standalone Admin Portal View
  if (isAdminOpen && !session) {
    return (
      <div className="min-h-screen w-full bg-[#040508] flex items-center justify-center p-2 sm:p-4">
        <AdminPanelModal
          initialConfig={config}
          onClose={() => setIsAdminOpen(false)}
          onConfigSaved={(updated) => setConfig(updated)}
        />
      </div>
    );
  }

  // If no session, show Login Screen (with OTA Update modal if available)
  if (!session) {
    return (
      <div className="relative min-h-screen">
        <LoginScreen
          config={config}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          onLoginSuccess={handleLoginSuccess}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onEnterGuest={handleEnterGuestMode}
        />
        {availableUpdate && (
          <AppUpdateModal
            updateInfo={availableUpdate}
            onClose={() => setAvailableUpdate(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`h-screen h-[100dvh] flex flex-col bg-[#08090d] text-zinc-100 overflow-hidden ${
        viewMode === 'tv' ? 'tv-overscan text-base' : 'text-sm'
      }`}
    >
      {/* Top Application Bar - Only shown in sub-sections, Home has its own integrated TV bar matching the screenshot */}
      {activeSection !== 'home' && (
        <Header
          appName={config.serviceName || 'Calix Tv iptv Pro'}
          version="v2.5.4"
          userInfo={session.authResponse.user_info}
          serverUrl={config.serverUrl}
          isOnline={true}
          viewMode={viewMode}
          onChangeViewMode={handleViewModeChange}
          onToggleViewMode={toggleViewMode}
          onOpenSettings={() => setIsProfileOpen(true)}
          onOpenRemote={() => setIsRemoteOpen((prev) => !prev)}
          onOpenApkGuide={() => setIsApkGuideOpen(true)}
          onLogout={handleLogout}
          onHomeClick={() => setActiveSection('home')}
        />
      )}

      {/* Main View Router */}
      <main
        className={`flex-1 flex flex-col overflow-hidden ${viewMode === 'mobile' ? 'pb-16 sm:pb-20' : ''}`}
        style={
          viewMode === 'mobile'
            ? {
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.25rem)',
              }
            : undefined
        }
      >
        {activeSection === 'home' && (
          <HomeScreen
            config={config}
            username={session.username}
            viewMode={viewMode}
            onChangeViewMode={handleViewModeChange}
            onNavigate={(sec) => setActiveSection(sec)}
            onPlayStream={handlePlayStream}
            onOpenSeriesDetail={(series) => {
              setTargetSeriesDetail(series);
              setActiveSection('series');
            }}
            onOpenSettings={() => setIsProfileOpen(true)}
            onOpenSpeedTest={() => setIsProfileOpen(true)}
            onOpenFavorites={() => setActiveSection('live')}
            onLogout={handleLogout}
          />
        )}

        {activeSection === 'live' && (
          <LiveTVScreen
            username={session.username}
            viewMode={viewMode}
            onBack={() => setActiveSection('home')}
            onNavigate={(sec) => setActiveSection(sec)}
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
            initialSeries={targetSeriesDetail}
            onClearInitialSeries={() => setTargetSeriesDetail(null)}
            onBack={() => {
              setTargetSeriesDetail(null);
              setActiveSection('home');
            }}
            onPlayStream={handlePlayStream}
          />
        )}

        {activeSection === 'events' && (
          <EventsScreen
            username={session.username}
            onBack={() => setActiveSection('home')}
            onPlayStream={handlePlayStream}
          />
        )}
      </main>

      {/* Persistent Mobile Bottom Navigation Bar (Visible in all screens for Mobile) */}
      {viewMode === 'mobile' && !activePlayback && (
        <MobileBottomNav
          activeSection={activeSection}
          onNavigate={(sec) => setActiveSection(sec)}
          onOpenSettings={() => setIsProfileOpen(true)}
        />
      )}

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
            channels={activePlayback.channels}
            initialChannelIndex={activePlayback.initialChannelIndex}
            username={session?.username}
            viewMode={viewMode}
            onChannelChange={(stream, idx) => {
              setActivePlayback({
                ...activePlayback,
                streamId: stream.stream_id,
                title: stream.name,
                url: stream.stream_url || iptvApi.buildStreamUrl('live', stream.stream_id, 'm3u8', session?.username || 'demo'),
                poster: stream.stream_icon,
                initialChannelIndex: idx,
              });
            }}
          />
        </div>
      )}

      {/* User Profile & Subscription Expiration Modal */}
      {isProfileOpen && (
        <UserProfileModal
          userInfo={session?.authResponse?.user_info || null}
          serverUrl={config.serverUrl}
          onClose={() => setIsProfileOpen(false)}
          onLogout={handleLogout}
          onOpenAdminPanel={() => setIsAdminOpen(true)}
        />
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
