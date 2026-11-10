package com.calixtv.app;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackGroup;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.Tracks;
import androidx.media3.datasource.okhttp.OkHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.analytics.AnalyticsListener;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.extractor.DefaultExtractorsFactory;
import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory;
import androidx.media3.ui.PlayerView;

import io.github.anilbeesetti.nextlib.media3ext.ffdecoder.NextRenderersFactory;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/**
 * Reproductor nativo de alta velocidad para Calix TV 2.0 (Android TV y dispositivos móviles).
 * Optimizado con una sola instancia persistente de ExoPlayer, LoadControl de arranque rápido (1 s),
 * extractor TS sin IDR estricto y conexiones HTTP persistentes con OkHttp ConnectionPool.
 */
public class PlayerActivity extends Activity {

    private static final String TAG = "CalixPlayer";

    private ExoPlayer player;
    private PlayerView playerView;
    private boolean playerIsVod = false; // tipo de LoadControl con el que se creó el player actual

    private FrameLayout root;
    private LinearLayout topBar;
    private LinearLayout bottomBar;
    private TextView titleView;
    private TextView timeView;
    private TextView durationView;
    private TextView errorView;
    private TextView retryNoticeView;
    private TextView playBtn;
    private SeekBar seekBar;
    private ProgressBar spinner;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Runnable hideRunnable = new Runnable() {
        @Override
        public void run() {
            setControlsVisible(false);
        }
    };

    private String url;
    private String title;
    private long startMs = 0;
    private long lastTime = 0;
    private long length = 0;
    private boolean controlsVisible = true;
    private boolean userSeeking = false;
    private boolean resumedOnce = false;

    // Métricas de latencia de arranque
    private long prepareStartTimeMs = 0;
    private String lastReportedVideoDecoder = null;

    // Canal y MediaItem guardados para desconectar en onStop y reenganchar al directo en onStart
    private String savedChannelUrl = null;
    private MediaItem savedMediaItem = null;

    // 3) FLAG DE ARRANQUE RÁPIDO CON PLAN B:
    // Permite iniciar la decodificación inmediatamente en cualquier keyframe no-IDR para reducir latencia inicial.
    // Si en algún equipo o stream específico aparecen cuadros verdes o pixelados al iniciar el canal,
    // cambiar esta variable booleana a false para esperar obligatoriamente un IDR completo.
    private static final boolean ENABLE_NON_IDR_KEYFRAMES_FAST_START = true;

    // Control de reintentos en arranque y reconexión
    private int startupRetryCount = 0;
    private static final int MAX_STARTUP_RETRIES = 2;
    private int reconnectAttempts = 0;
    private static final int MAX_RECONNECT_ATTEMPTS = 5;

    private final Runnable updateProgressRunnable = new Runnable() {
        @Override
        public void run() {
            if (player != null) {
                lastTime = Math.max(0, player.getCurrentPosition());
                long dur = player.getDuration();
                if (dur > 0 && dur != C.TIME_UNSET) {
                    length = dur;
                    seekBar.setMax((int) (length / 1000));
                    durationView.setText(fmt(length));
                }
                if (!userSeeking) {
                    seekBar.setProgress((int) (lastTime / 1000));
                    timeView.setText(fmt(lastTime));
                }
            }
            if (player != null && player.isPlaying()) {
                ui.postDelayed(this, 500);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        extractIntentData(getIntent());
        buildUi();
        setContentView(root);
        initPlayer();
    }

    private void extractIntentData(Intent in) {
        if (in != null) {
            url = in.getStringExtra("url");
            title = in.getStringExtra("title");
            startMs = in.getIntExtra("startMs", 0);
        }
    }

    /**
     * Reutilización de PlayerActivity: al cambiar de canal desde Capacitor / plugin,
     * se recibe el nuevo Intent aquí sin recrear la Activity ni la vista ni el ExoPlayer.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        extractIntentData(intent);
        if (titleView != null) {
            titleView.setText(title == null ? "" : title);
        }
        Log.d(TAG, "onNewIntent recibido -> cambiando canal a: " + title);
        playCurrentMedia();
    }

    /**
     * Película o serie (VOD) en lugar de canal en vivo. Xtream Codes usa /movie/ y /series/;
     * como respaldo, se detectan contenedores de archivo típicos de VOD.
     */
    private static boolean isVodUrl(String rawUrl) {
        if (rawUrl == null) return false;
        String u = rawUrl.trim().toLowerCase(Locale.ROOT);
        if (u.contains("/live/")) return false;
        if (u.contains("/movie/") || u.contains("/series/")) return true;
        int q = u.indexOf('?');
        String path = q >= 0 ? u.substring(0, q) : u;
        return path.endsWith(".mkv") || path.endsWith(".mp4") || path.endsWith(".avi");
    }

    /** Libera el ExoPlayer actual para poder recrearlo con otro LoadControl (vivo <-> VOD). */
    private void releasePlayer() {
        if (player == null) return;
        player.removeListener(playerListener);
        player.removeAnalyticsListener(analyticsListener);
        player.stop();
        player.release();
        player = null;
        playerView.setPlayer(null);
    }

    /**
     * Regla 5: Usar la URL TS directa (output=ts); no convertir a HLS.
     */
    private String getEffectiveStreamUrl(String rawUrl) {
        if (rawUrl == null) return "";
        String u = rawUrl.trim();
        // Si es canal en vivo de Xtream Codes, forzar TS directo para evitar latencia de playlist HLS
        if (u.contains("/live/")) {
            if (u.endsWith(".m3u8")) {
                u = u.substring(0, u.length() - 5) + ".ts";
            }
            if (!u.contains(".ts") && !u.contains("output=")) {
                u += (u.contains("?") ? "&" : "?") + "output=ts";
            }
        }
        return u;
    }

    /**
     * 1) UNA SOLA INSTANCIA DE PLAYER
     * Configuración de ExoPlayer una sola vez con LoadControl adaptativo según memoria RAM,
     * decodificación de hardware prioritaria, extractor TS sin IDR estricto y conexiones persistentes OkHttp.
     */
    private void initPlayer() {
        if (player != null) return;

        Log.d(TAG, "Inicializando instancia única de ExoPlayer");

        // 1) BUFFERS SEGÚN EL TIPO DE CONTENIDO (vivo vs VOD) Y LA MEMORIA DEL EQUIPO
        ActivityManager am = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
        boolean lowRam = am != null && (am.isLowRamDevice() || am.getMemoryClass() <= 128);
        boolean vod = isVodUrl(url);
        playerIsVod = vod;

        DefaultLoadControl loadControl;
        if (vod) {
            // PELÍCULAS Y SERIES (MP4/MKV de alto bitrate): buffer grande para absorber
            // los picos de la red y no entrar en rebuffering constante. Se limita por bytes
            // (no solo por tiempo) para no agotar la memoria en equipos chicos.
            int minBufferMs = lowRam ? 15_000 : 30_000;
            int maxBufferMs = lowRam ? 45_000 : 90_000;
            int bufferForPlaybackMs = 2_500;
            int bufferForPlaybackAfterRebufferMs = 5_000;
            int targetBytes = (lowRam ? 24 : 64) * 1024 * 1024;
            int backBufferMs = lowRam ? 0 : 20_000; // permite volver -10s sin re-descargar

            Log.d(TAG, "Modo VOD: lowRam=" + lowRam +
                    (am != null ? " [memoryClass=" + am.getMemoryClass() + "MB, isLowRamDevice=" + am.isLowRamDevice() + "]" : "") +
                    " -> Buffers: min=" + minBufferMs + "ms, max=" + maxBufferMs + "ms, playback=" + bufferForPlaybackMs +
                    "ms, rebuffer=" + bufferForPlaybackAfterRebufferMs + "ms, bytes=" + (targetBytes / 1024 / 1024) + "MB");

            loadControl = new DefaultLoadControl.Builder()
                    .setBufferDurationsMs(minBufferMs, maxBufferMs, bufferForPlaybackMs, bufferForPlaybackAfterRebufferMs)
                    .setTargetBufferBytes(targetBytes)
                    .setBackBuffer(backBufferMs, true)
                    .setPrioritizeTimeOverSizeThresholds(false) // el tope de bytes manda
                    .build();
        } else {
            // TV EN VIVO: arranque rápido y poca latencia (configuración original)
            int minBufferMs = lowRam ? 3_000 : 5_000;
            int maxBufferMs = lowRam ? 15_000 : 25_000;
            int bufferForPlaybackMs = 1_000;
            int bufferForPlaybackAfterRebufferMs = 2_000;

            Log.d(TAG, "Modo VIVO: lowRam=" + lowRam +
                    (am != null ? " [memoryClass=" + am.getMemoryClass() + "MB, isLowRamDevice=" + am.isLowRamDevice() + "]" : "") +
                    " -> Buffers: min=" + minBufferMs + "ms, max=" + maxBufferMs + "ms, playback=" + bufferForPlaybackMs + "ms, rebuffer=" + bufferForPlaybackAfterRebufferMs + "ms");

            loadControl = new DefaultLoadControl.Builder()
                    .setBufferDurationsMs(minBufferMs, maxBufferMs, bufferForPlaybackMs, bufferForPlaybackAfterRebufferMs)
                    .setBackBuffer(0, false) // en vivo no hace falta buffer hacia atrás
                    .setPrioritizeTimeOverSizeThresholds(!lowRam)
                    .build();
        }

        // 2) DECODIFICACIÓN: HARDWARE PRIMERO PARA EL VIDEO (EXTENSION_RENDERER_MODE_ON)
        // NextRenderersFactory extiende DefaultRenderersFactory y registra NextLib FFmpeg solo para audio (AC3/EAC3/DTS).
        // El modo ON deja los decodificadores de hardware (MediaCodec) primero y la extensión de software solo como respaldo;
        // nunca usar EXTENSION_RENDERER_MODE_PREFER.
        NextRenderersFactory renderersFactory = new NextRenderersFactory(this);
        renderersFactory.setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON);
        renderersFactory.setEnableDecoderFallback(true);

        // 3) EXTRACTOR DE TS CON FLAG DE ARRANQUE RÁPIDO Y PLAN B
        int tsFlags = DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS;
        if (ENABLE_NON_IDR_KEYFRAMES_FAST_START) {
            tsFlags |= DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES;
        }
        DefaultExtractorsFactory extractorsFactory = new DefaultExtractorsFactory()
                .setTsExtractorFlags(tsFlags);

        // 4) HTTP CON CONEXIONES PERSISTENTES (OkHttp ConnectionPool)
        OkHttpClient okHttp = new OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .connectionPool(new ConnectionPool(5, 5, TimeUnit.MINUTES))
                .retryOnConnectionFailure(true)
                .build();

        OkHttpDataSource.Factory dataSourceFactory = new OkHttpDataSource.Factory(okHttp);
        DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(dataSourceFactory, extractorsFactory);

        player = new ExoPlayer.Builder(this, renderersFactory)
                .setLoadControl(loadControl)
                .setMediaSourceFactory(mediaSourceFactory)
                .build();

        playerView.setPlayer(player);
        player.addListener(playerListener);
        player.addAnalyticsListener(analyticsListener);
    }

    /**
     * Cambia el canal o contenido reutilizando la misma instancia de ExoPlayer (setMediaItem + prepare)
     * sin destruir el player ni la vista.
     */
    private void playCurrentMedia() {
        if (url == null || url.isEmpty()) {
            showError("Falta la URL del contenido.");
            return;
        }

        // El LoadControl no se puede cambiar con el player creado: si se pasa de vivo a VOD
        // (o al revés) se recrea la instancia con los buffers adecuados.
        if (player != null && playerIsVod != isVodUrl(url)) {
            releasePlayer();
        }
        initPlayer();
        resumedOnce = false;
        startupRetryCount = 0;
        lastReportedVideoDecoder = null;
        setBuffering(true);
        hideRetryNotice();
        if (errorView != null) {
            errorView.setVisibility(View.GONE);
        }

        String effectiveUrl = getEffectiveStreamUrl(url);
        prepareStartTimeMs = System.currentTimeMillis();
        Log.d(TAG, "playCurrentMedia -> prepare() llamado para URL: " + effectiveUrl + " (título: " + title + ")");

        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(effectiveUrl));
        savedChannelUrl = url;
        savedMediaItem = mediaItem;
        player.setMediaItem(mediaItem);
        if (startMs > 0) {
            player.seekTo(startMs);
        }
        player.prepare();
        player.play();
        startProgressUpdates();
    }

    private void handlePrematureDisconnect() {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            final long resumeTime = lastTime > 0 ? lastTime : (player != null ? player.getCurrentPosition() : startMs);
            setBuffering(true);
            showRetryNotice("Reconectando señal en vivo (" + reconnectAttempts + "/" + MAX_RECONNECT_ATTEMPTS + ")...");
            ui.postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (player != null && !isFinishing()) {
                            prepareStartTimeMs = System.currentTimeMillis();
                            player.seekTo(resumeTime);
                            player.prepare();
                            player.play();
                        }
                    } catch (Exception e) {
                        showError("Error al reconectar la transmisión.");
                    }
                }
            }, 1000);
        } else {
            hideRetryNotice();
            showError("La conexión con el servidor se interrumpió.\nRevisá la señal de tu proveedor de IPTV o la conexión a internet.");
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        initPlayer();

        if (savedMediaItem != null || (savedChannelUrl != null && !savedChannelUrl.isEmpty())) {
            Log.d(TAG, "onStart: reenganchando al directo del canal guardado: " + (title != null ? title : savedChannelUrl));
            setBuffering(true);
            prepareStartTimeMs = System.currentTimeMillis();
            lastReportedVideoDecoder = null;
            startupRetryCount = 0;
            hideRetryNotice();
            if (errorView != null) {
                errorView.setVisibility(View.GONE);
            }

            if (savedMediaItem != null) {
                player.setMediaItem(savedMediaItem);
            } else {
                String effectiveUrl = getEffectiveStreamUrl(savedChannelUrl);
                savedMediaItem = MediaItem.fromUri(Uri.parse(effectiveUrl));
                player.setMediaItem(savedMediaItem);
            }
            player.prepare();
            player.play();
            startProgressUpdates();
        } else {
            Log.d(TAG, "onStart: iniciando reproducción de canal: " + title);
            playCurrentMedia();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        stopProgressUpdates();
        if (player != null) {
            lastTime = player.getCurrentPosition();
            long dur = player.getDuration();
            if (dur > 0 && dur != C.TIME_UNSET) length = dur;
            startMs = lastTime;

            // Guardar la URL y el MediaItem actual antes de detener
            if (player.getCurrentMediaItem() != null) {
                savedMediaItem = player.getCurrentMediaItem();
            }
            if (url != null && !url.isEmpty()) {
                savedChannelUrl = url;
            }

            Log.d(TAG, "onStop: cerrando conexión con proveedor IPTV (player.stop()) y liberando buffer (player.clearMediaItems()). Canal guardado: " + (title != null ? title : savedChannelUrl));
            player.stop();
            player.clearMediaItems();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        ui.removeCallbacksAndMessages(null);
        stopProgressUpdates();
        savedMediaItem = null;
        savedChannelUrl = null;
        if (player != null) {
            // Liberar completamente ExoPlayer al destruir la Activity para soltar
            // el decodificador de hardware y los recursos del sistema
            Log.d(TAG, "onDestroy: liberando instancia de ExoPlayer (player.release())");
            player.removeListener(playerListener);
            player.removeAnalyticsListener(analyticsListener);
            player.stop();
            player.release();
            player = null;
        }
    }

    @Override
    public void finish() {
        Intent data = new Intent();
        data.putExtra("position", lastTime);
        data.putExtra("duration", length);
        setResult(RESULT_OK, data);
        super.finish();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    // ---------------------------------------------------------------- eventos de ExoPlayer

    private final Player.Listener playerListener = new Player.Listener() {
        @Override
        public void onPlaybackStateChanged(int playbackState) {
            switch (playbackState) {
                case Player.STATE_BUFFERING:
                    setBuffering(true);
                    break;
                case Player.STATE_READY:
                    if (prepareStartTimeMs > 0) {
                        long readyTimeMs = System.currentTimeMillis() - prepareStartTimeMs;
                        Log.d(TAG, "Tiempo desde prepare() hasta STATE_READY: " + readyTimeMs + " ms");
                    }
                    startupRetryCount = 0;
                    reconnectAttempts = 0;
                    setBuffering(false);
                    hideRetryNotice();
                    if (errorView != null) errorView.setVisibility(View.GONE);
                    if (playBtn != null) {
                        playBtn.setText(player != null && player.isPlaying() ? "Pausa" : "Play");
                    }
                    if (player != null) {
                        long dur = player.getDuration();
                        if (dur > 0 && dur != C.TIME_UNSET) {
                            length = dur;
                            seekBar.setMax((int) (length / 1000));
                            durationView.setText(fmt(length));
                        }
                    }
                    if (!resumedOnce) {
                        resumedOnce = true;
                        scheduleHide();
                    }
                    startProgressUpdates();
                    break;
                case Player.STATE_ENDED:
                    if (lastTime > 5000 && length > 30000 && lastTime < (length - 15000)) {
                        handlePrematureDisconnect();
                    } else {
                        finish();
                    }
                    break;
                case Player.STATE_IDLE:
                    break;
            }
        }

        /**
         * Regla 5: Registrar tiempo exacto desde prepare() hasta el primer cuadro renderizado.
         */
        @Override
        public void onRenderedFirstFrame() {
            if (prepareStartTimeMs > 0) {
                long firstFrameTimeMs = System.currentTimeMillis() - prepareStartTimeMs;
                Log.d(TAG, "Tiempo desde prepare() hasta onRenderedFirstFrame (primer cuadro): " + firstFrameTimeMs + " ms");
            }
            setBuffering(false);
            hideRetryNotice();
        }

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            if (playBtn != null) {
                playBtn.setText(isPlaying ? "Pausa" : "Play");
            }
            if (isPlaying) {
                setBuffering(false);
                hideRetryNotice();
                startProgressUpdates();
            } else {
                stopProgressUpdates();
            }
        }

        /**
         * Regla 5: Reintento automático (hasta 2 veces) si falla el arranque, con aviso visual discreto.
         */
        @Override
        public void onPlayerError(PlaybackException error) {
            setBuffering(false);
            Log.e(TAG, "onPlayerError en reproducción: " + error.getMessage(), error);

            if (startupRetryCount < MAX_STARTUP_RETRIES) {
                startupRetryCount++;
                showRetryNotice("Reconectando canal (" + startupRetryCount + "/" + MAX_STARTUP_RETRIES + ")...");
                Log.d(TAG, "Reintentando arranque de canal (" + startupRetryCount + "/" + MAX_STARTUP_RETRIES + ")");

                ui.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        if (player != null && !isFinishing()) {
                            prepareStartTimeMs = System.currentTimeMillis();
                            String effectiveUrl = getEffectiveStreamUrl(url);
                            MediaItem mediaItem = MediaItem.fromUri(Uri.parse(effectiveUrl));
                            player.setMediaItem(mediaItem);
                            if (startMs > 0) {
                                player.seekTo(startMs);
                            }
                            player.prepare();
                            player.play();
                        }
                    }
                }, 800);
            } else if (lastTime > 5000 && (length == 0 || lastTime < length - 15000)) {
                handlePrematureDisconnect();
            } else {
                hideRetryNotice();
                showError("No se pudo reproducir este canal.\nRevisá la conexión con tu proveedor o el límite de conexiones simultáneas.");
            }
        }
    };

    // 2) DETECCIÓN Y LOG DEL DECODIFICADOR DE VIDEO (onVideoDecoderInitialized)
    private final AnalyticsListener analyticsListener = new AnalyticsListener() {
        @Override
        public void onVideoDecoderInitialized(
                AnalyticsListener.EventTime eventTime,
                String decoderName,
                long initializedTimestampMs,
                long initializationDurationMs) {
            logVideoDecoder(decoderName, initializationDurationMs);
        }

        @Override
        public void onVideoDecoderInitialized(
                AnalyticsListener.EventTime eventTime,
                String decoderName,
                long initializationDurationMs) {
            logVideoDecoder(decoderName, initializationDurationMs);
        }
    };

    private void logVideoDecoder(String decoderName, long durationMs) {
        if (decoderName == null || decoderName.equals(lastReportedVideoDecoder)) return;
        lastReportedVideoDecoder = decoderName;
        // Si el nombre comienza con "c2.android" u "OMX.google" es software (CPU);
        // si tiene marca del SoC ("OMX.qcom", "c2.mtk", "c2.aml", "OMX.Exynos", etc.) es hardware.
        boolean isSoftware = decoderName.startsWith("c2.android") || decoderName.startsWith("OMX.google");
        boolean isHardware = !isSoftware;
        Log.d(TAG, "Decodificador de video en uso: " + decoderName +
                (isHardware ? " (Hardware: " + decoderName + ")" : " (Software / CPU fallback: " + decoderName + ")") +
                (durationMs > 0 ? " [inicializado en " + durationMs + " ms]" : ""));
    }

    private void startProgressUpdates() {
        stopProgressUpdates();
        ui.post(updateProgressRunnable);
    }

    private void stopProgressUpdates() {
        ui.removeCallbacks(updateProgressRunnable);
    }

    // ---------------------------------------------------------------- UI

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density + 0.5f);
    }

    private TextView makeButton(String label, View.OnClickListener l) {
        TextView b = new TextView(this);
        b.setText(label);
        b.setTextColor(Color.WHITE);
        b.setTextSize(16);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(14), dp(8), dp(14), dp(8));
        b.setBackgroundColor(0x66000000);
        b.setClickable(true);
        b.setFocusable(true);
        b.setOnClickListener(l);
        b.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            @Override
            public void onFocusChange(View v, boolean hasFocus) {
                v.setBackgroundColor(hasFocus ? 0xFF06B6D4 : 0x66000000);
            }
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(dp(4), 0, dp(4), 0);
        b.setLayoutParams(lp);
        return b;
    }

    private void buildUi() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        playerView = new PlayerView(this);
        playerView.setUseController(false);
        root.addView(playerView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        View.OnClickListener toggle = new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setControlsVisible(!controlsVisible);
            }
        };
        root.setOnClickListener(toggle);
        playerView.setOnClickListener(toggle);

        spinner = new ProgressBar(this);
        FrameLayout.LayoutParams spLp = new FrameLayout.LayoutParams(dp(56), dp(56), Gravity.CENTER);
        root.addView(spinner, spLp);

        // Aviso visual discreto de reintento en segundo plano
        retryNoticeView = new TextView(this);
        retryNoticeView.setTextColor(0xFF22D3EE);
        retryNoticeView.setTextSize(12);
        retryNoticeView.setGravity(Gravity.CENTER);
        retryNoticeView.setPadding(dp(16), dp(8), dp(16), dp(8));
        retryNoticeView.setBackgroundColor(0xD90A0D14);
        retryNoticeView.setVisibility(View.GONE);
        FrameLayout.LayoutParams rnLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        rnLp.topMargin = dp(64);
        root.addView(retryNoticeView, rnLp);

        errorView = new TextView(this);
        errorView.setTextColor(Color.WHITE);
        errorView.setTextSize(16);
        errorView.setGravity(Gravity.CENTER);
        errorView.setPadding(dp(32), dp(16), dp(32), dp(16));
        errorView.setVisibility(View.GONE);
        root.addView(errorView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER));

        // Barra superior: cerrar + título
        topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setBackgroundColor(0x88000000);
        topBar.setPadding(dp(12), dp(8), dp(12), dp(8));
        TextView closeBtn = makeButton("Cerrar", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
        topBar.addView(closeBtn);
        titleView = new TextView(this);
        titleView.setText(title == null ? "" : title);
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(16);
        titleView.setSingleLine(true);
        titleView.setPadding(dp(12), 0, dp(12), 0);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        titleView.setLayoutParams(titleLp);
        topBar.addView(titleView);

        TextView extBtn = makeButton("Reproductor externo", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(getEffectiveStreamUrl(url)), "video/*");
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(Intent.createChooser(intent, "Abrir con reproductor de video..."));
                } catch (Exception ex) {
                    Toast.makeText(PlayerActivity.this, "No se encontró otro reproductor externo", Toast.LENGTH_SHORT).show();
                }
            }
        });
        topBar.addView(extBtn);

        root.addView(topBar, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP));

        // Barra inferior: progreso + botones
        bottomBar = new LinearLayout(this);
        bottomBar.setOrientation(LinearLayout.VERTICAL);
        bottomBar.setBackgroundColor(0x88000000);
        bottomBar.setPadding(dp(16), dp(8), dp(16), dp(12));

        LinearLayout progressRow = new LinearLayout(this);
        progressRow.setOrientation(LinearLayout.HORIZONTAL);
        progressRow.setGravity(Gravity.CENTER_VERTICAL);
        timeView = new TextView(this);
        timeView.setTextColor(Color.WHITE);
        timeView.setText("00:00");
        seekBar = new SeekBar(this);
        seekBar.setFocusable(true);
        durationView = new TextView(this);
        durationView.setTextColor(Color.WHITE);
        durationView.setText("00:00");
        progressRow.addView(timeView);
        progressRow.addView(seekBar, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        progressRow.addView(durationView);
        bottomBar.addView(progressRow);

        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar sb, int progress, boolean fromUser) {
                if (!fromUser) return;
                timeView.setText(fmt(progress * 1000L));
                if (!userSeeking && player != null) {
                    player.seekTo(progress * 1000L);
                }
                scheduleHide();
            }

            @Override
            public void onStartTrackingTouch(SeekBar sb) {
                userSeeking = true;
                ui.removeCallbacks(hideRunnable);
            }

            @Override
            public void onStopTrackingTouch(SeekBar sb) {
                userSeeking = false;
                if (player != null) {
                    player.seekTo(sb.getProgress() * 1000L);
                }
                scheduleHide();
            }
        });

        LinearLayout buttonsRow = new LinearLayout(this);
        buttonsRow.setOrientation(LinearLayout.HORIZONTAL);
        buttonsRow.setGravity(Gravity.CENTER);
        buttonsRow.setPadding(0, dp(8), 0, 0);
        buttonsRow.addView(makeButton("-10s", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                seekBy(-10000);
            }
        }));
        playBtn = makeButton("Pausa", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                togglePlay();
            }
        });
        buttonsRow.addView(playBtn);
        buttonsRow.addView(makeButton("+10s", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                seekBy(10000);
            }
        }));
        buttonsRow.addView(makeButton("Audio", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                cycleAudio();
            }
        }));
        buttonsRow.addView(makeButton("Subs", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                cycleSubs();
            }
        }));
        bottomBar.addView(buttonsRow);

        root.addView(bottomBar, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
    }

    private void setControlsVisible(boolean visible) {
        controlsVisible = visible;
        int v = visible ? View.VISIBLE : View.GONE;
        topBar.setVisibility(v);
        bottomBar.setVisibility(v);
        if (visible) {
            playBtn.requestFocus();
            scheduleHide();
        } else {
            ui.removeCallbacks(hideRunnable);
        }
    }

    private void scheduleHide() {
        ui.removeCallbacks(hideRunnable);
        ui.postDelayed(hideRunnable, 5000);
    }

    private void setBuffering(boolean on) {
        spinner.setVisibility(on ? View.VISIBLE : View.GONE);
    }

    private void showRetryNotice(String message) {
        if (retryNoticeView != null) {
            retryNoticeView.setText(message);
            retryNoticeView.setVisibility(View.VISIBLE);
        }
    }

    private void hideRetryNotice() {
        if (retryNoticeView != null) {
            retryNoticeView.setVisibility(View.GONE);
        }
    }

    private void showError(String msg) {
        errorView.setText(msg);
        errorView.setVisibility(View.VISIBLE);
        setControlsVisible(true);
    }

    // ---------------------------------------------------------------- acciones

    private void togglePlay() {
        if (player == null) return;
        if (player.isPlaying()) {
            player.pause();
        } else {
            player.play();
        }
        scheduleHide();
    }

    private void seekBy(long deltaMs) {
        if (player == null) return;
        long target = Math.max(0, player.getCurrentPosition() + deltaMs);
        if (length > 0) target = Math.min(length, target);
        player.seekTo(target);
        lastTime = target;
        scheduleHide();
    }

    private static class TrackOption {
        final TrackGroup trackGroup;
        final int trackIndex;
        final String label;
        final boolean selected;

        TrackOption(TrackGroup trackGroup, int trackIndex, String label, boolean selected) {
            this.trackGroup = trackGroup;
            this.trackIndex = trackIndex;
            this.label = label;
            this.selected = selected;
        }
    }

    private void cycleAudio() {
        if (player == null) return;
        Tracks tracks = player.getCurrentTracks();
        List<TrackOption> audioOptions = new ArrayList<>();

        for (Tracks.Group group : tracks.getGroups()) {
            if (group.getType() == C.TRACK_TYPE_AUDIO) {
                TrackGroup trackGroup = group.getMediaTrackGroup();
                for (int i = 0; i < trackGroup.length; i++) {
                    Format format = trackGroup.getFormat(i);
                    boolean selected = group.isTrackSelected(i);
                    String label = format.label != null && !format.label.isEmpty() ? format.label :
                            (format.language != null && !format.language.isEmpty() ? format.language : "Audio " + (audioOptions.size() + 1));
                    audioOptions.add(new TrackOption(trackGroup, i, label, selected));
                }
            }
        }

        if (audioOptions.isEmpty()) {
            Toast.makeText(this, "Sin pistas de audio", Toast.LENGTH_SHORT).show();
            return;
        }

        int selectedIdx = -1;
        for (int i = 0; i < audioOptions.size(); i++) {
            if (audioOptions.get(i).selected) {
                selectedIdx = i;
                break;
            }
        }

        int nextIdx = (selectedIdx + 1) % audioOptions.size();
        TrackOption target = audioOptions.get(nextIdx);

        TrackSelectionParameters newParams = player.getTrackSelectionParameters()
                .buildUpon()
                .setOverrideForType(new TrackSelectionOverride(target.trackGroup, target.trackIndex))
                .build();
        player.setTrackSelectionParameters(newParams);

        Toast.makeText(this, "Audio: " + target.label, Toast.LENGTH_SHORT).show();
        scheduleHide();
    }

    private void cycleSubs() {
        if (player == null) return;
        Tracks tracks = player.getCurrentTracks();
        List<TrackOption> subOptions = new ArrayList<>();

        for (Tracks.Group group : tracks.getGroups()) {
            if (group.getType() == C.TRACK_TYPE_TEXT) {
                TrackGroup trackGroup = group.getMediaTrackGroup();
                for (int i = 0; i < trackGroup.length; i++) {
                    Format format = trackGroup.getFormat(i);
                    boolean selected = group.isTrackSelected(i);
                    String label = format.label != null && !format.label.isEmpty() ? format.label :
                            (format.language != null && !format.language.isEmpty() ? format.language : "Sub " + (subOptions.size() + 1));
                    subOptions.add(new TrackOption(trackGroup, i, label, selected));
                }
            }
        }

        if (subOptions.isEmpty()) {
            Toast.makeText(this, "Sin subtítulos", Toast.LENGTH_SHORT).show();
            return;
        }

        boolean isTextDisabled = player.getTrackSelectionParameters().disabledTrackTypes.contains(C.TRACK_TYPE_TEXT);
        int selectedIdx = -1;
        if (!isTextDisabled) {
            for (int i = 0; i < subOptions.size(); i++) {
                if (subOptions.get(i).selected) {
                    selectedIdx = i;
                    break;
                }
            }
        }

        int nextIdx = selectedIdx + 1;
        if (nextIdx >= subOptions.size()) {
            TrackSelectionParameters newParams = player.getTrackSelectionParameters()
                .buildUpon()
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                .build();
            player.setTrackSelectionParameters(newParams);
            Toast.makeText(this, "Subtítulos: Desactivado", Toast.LENGTH_SHORT).show();
        } else {
            TrackOption target = subOptions.get(nextIdx);
            TrackSelectionParameters newParams = player.getTrackSelectionParameters()
                .buildUpon()
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                .setOverrideForType(new TrackSelectionOverride(target.trackGroup, target.trackIndex))
                .build();
            player.setTrackSelectionParameters(newParams);
            Toast.makeText(this, "Subtítulos: " + target.label, Toast.LENGTH_SHORT).show();
        }
        scheduleHide();
    }

    private String fmt(long ms) {
        long s = Math.max(0, ms) / 1000;
        long h = s / 3600;
        long m = (s % 3600) / 60;
        long sec = s % 60;
        if (h > 0) return String.format(Locale.US, "%d:%02d:%02d", h, m, sec);
        return String.format(Locale.US, "%02d:%02d", m, sec);
    }

    // ---------------------------------------------------------------- control remoto

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                togglePlay();
                return true;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                seekBy(30000);
                return true;
            case KeyEvent.KEYCODE_MEDIA_REWIND:
                seekBy(-30000);
                return true;
            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (!controlsVisible) {
                    seekBy(-10000);
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (!controlsVisible) {
                    seekBy(10000);
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                if (!controlsVisible) {
                    setControlsVisible(true);
                    return true;
                }
                break;
            default:
                break;
        }
        return super.onKeyDown(keyCode, event);
    }
}
