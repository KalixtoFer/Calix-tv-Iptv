package com.calixtv.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

import io.github.anilbeesetti.nextlib.media3ext.ffdecoder.NextRenderersFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Reproductor nativo a pantalla completa basado en Media3 ExoPlayer + NextLib FFmpeg.
 * Soporta MKV, MP4, HLS (.m3u8), TS, HEVC, AC3/EAC3/DTS (vía FFmpeg fallback).
 */
public class PlayerActivity extends Activity {

    private ExoPlayer player;
    private PlayerView playerView;

    private FrameLayout root;
    private LinearLayout topBar;
    private LinearLayout bottomBar;
    private TextView timeView;
    private TextView durationView;
    private TextView errorView;
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

        Intent in = getIntent();
        url = in.getStringExtra("url");
        title = in.getStringExtra("title");
        startMs = in.getIntExtra("startMs", 0);

        buildUi();
        setContentView(root);
    }

    private void initPlayer() {
        if (player != null) return;

        NextRenderersFactory renderersFactory = new NextRenderersFactory(this);
        renderersFactory.setEnableDecoderFallback(true);
        renderersFactory.setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON);

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(15000);

        DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(httpDataSourceFactory);

        DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(30000, 60000, 2500, 5000)
                .build();

        player = new ExoPlayer.Builder(this, renderersFactory)
                .setMediaSourceFactory(mediaSourceFactory)
                .setLoadControl(loadControl)
                .build();

        playerView.setPlayer(player);
        player.addListener(playerListener);
    }

    private void handlePrematureDisconnect() {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            final long resumeTime = lastTime > 0 ? lastTime : (player != null ? player.getCurrentPosition() : startMs);
            setBuffering(true);
            ui.postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (player != null) {
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
            showError("La conexión con el servidor se interrumpió.\nRevisá la señal de tu proveedor de IPTV o la conexión a internet.");
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (url == null || url.isEmpty()) {
            showError("Falta la URL del contenido.");
            return;
        }
        initPlayer();
        resumedOnce = false;
        setBuffering(true);

        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(url));
        player.setMediaItem(mediaItem);
        if (startMs > 0) {
            player.seekTo(startMs);
        }
        player.prepare();
        player.play();
        startProgressUpdates();
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
            player.stop();
            player.release();
            player = null;
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        ui.removeCallbacksAndMessages(null);
        stopProgressUpdates();
        if (player != null) {
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
                    reconnectAttempts = 0;
                    setBuffering(false);
                    errorView.setVisibility(View.GONE);
                    playBtn.setText(player != null && player.isPlaying() ? "Pausa" : "Play");
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

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            playBtn.setText(isPlaying ? "Pausa" : "Play");
            if (isPlaying) {
                setBuffering(false);
                startProgressUpdates();
            } else {
                stopProgressUpdates();
            }
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            setBuffering(false);
            if (lastTime > 5000 && (length == 0 || lastTime < length - 15000)) {
                handlePrematureDisconnect();
            } else {
                showError("No se pudo reproducir este contenido.\nRevisá la conexión, el usuario/contraseña o el límite de conexiones del servidor.");
            }
        }
    };

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
        TextView titleView = new TextView(this);
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
                    intent.setDataAndType(Uri.parse(url), "video/*");
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
