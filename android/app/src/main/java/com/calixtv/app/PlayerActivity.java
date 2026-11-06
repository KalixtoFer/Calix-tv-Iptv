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

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Reproductor nativo a pantalla completa basado en libVLC.
 * Reproduce MKV, MP4, HEVC, AC3/EAC3/DTS, etc. Sin CORS ni contenido mixto.
 */
public class PlayerActivity extends Activity {

    private LibVLC libVLC;
    private MediaPlayer player;
    private VLCVideoLayout videoLayout;

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

        ArrayList<String> args = new ArrayList<>();
        // Cache optimizado para streaming fluido sin microcortes
        args.add("--network-caching=3000");
        args.add("--file-caching=2000");
        args.add("--live-caching=2000");
        args.add("--http-reconnect");
        args.add("--http-continuous");
        // Aceleración por hardware completa de Android (MediaCodec NDK & JNI)
        args.add("--avcodec-hw=any");
        args.add("--codec=mediacodec_ndk,mediacodec_jni,all");
        // Sincronización estricta de tiempo de reproducción (1.0x velocidad normal)
        args.add("--clock-synchro=1");
        args.add("--clock-jitter=0");
        // Decodificación multihilo automática con todos los núcleos de la CPU
        args.add("--avcodec-threads=0");
        libVLC = new LibVLC(this, args);
        player = new MediaPlayer(libVLC);
        try {
            player.setRate(1.0f);
        } catch (Exception ignored) {}
        player.setEventListener(listener);
    }

    private void handlePrematureDisconnect() {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && lastTime > 3000) {
            reconnectAttempts++;
            final long resumeTime = lastTime;
            setBuffering(true);
            ui.postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        player.stop();
                        player.detachViews();
                        player.attachViews(videoLayout, null, true, false);
                        Media media = new Media(libVLC, Uri.parse(url));
                        media.setHWDecoderEnabled(true, false);
                        player.setMedia(media);
                        media.release();
                        startMs = resumeTime;
                        resumedOnce = false;
                        player.play();
                    } catch (Exception e) {
                        showError("Error al reconectar la transmisión.");
                    }
                }
            }, 1000);
        } else {
            showError("La conexión con el servidor de la serie se interrumpió.\nRevisá la señal de tu proveedor de IPTV o la conexión a internet.");
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (url == null || url.isEmpty()) {
            showError("Falta la URL del contenido.");
            return;
        }
        resumedOnce = false;
        setBuffering(true);
        player.attachViews(videoLayout, null, true, false);
        Media media = new Media(libVLC, Uri.parse(url));
        media.setHWDecoderEnabled(true, false);
        player.setMedia(media);
        media.release();
        try {
            player.setRate(1.0f);
        } catch (Exception ignored) {}
        player.play();
    }

    @Override
    protected void onStop() {
        super.onStop();
        try {
            lastTime = player.getTime();
            startMs = lastTime;
            player.stop();
            player.detachViews();
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        ui.removeCallbacksAndMessages(null);
        try {
            player.release();
            libVLC.release();
        } catch (Exception ignored) {
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

    // ---------------------------------------------------------------- eventos de VLC

    private final MediaPlayer.EventListener listener = new MediaPlayer.EventListener() {
        @Override
        public void onEvent(final MediaPlayer.Event event) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    handleEvent(event);
                }
            });
        }
    };

    private void handleEvent(MediaPlayer.Event event) {
        switch (event.type) {
            case MediaPlayer.Event.Opening:
                setBuffering(true);
                break;
            case MediaPlayer.Event.Buffering:
                setBuffering(event.getBuffering() < 100f);
                break;
            case MediaPlayer.Event.Playing:
                reconnectAttempts = 0;
                setBuffering(false);
                errorView.setVisibility(View.GONE);
                playBtn.setText("Pausa");
                try {
                    player.setRate(1.0f);
                } catch (Exception ignored) {}
                if (!resumedOnce) {
                    resumedOnce = true;
                    if (startMs > 0) player.setTime(startMs);
                    scheduleHide();
                }
                break;
            case MediaPlayer.Event.Paused:
                playBtn.setText("Play");
                break;
            case MediaPlayer.Event.LengthChanged:
                length = event.getLengthChanged();
                seekBar.setMax((int) (length / 1000));
                durationView.setText(fmt(length));
                break;
            case MediaPlayer.Event.TimeChanged:
                lastTime = event.getTimeChanged();
                if (!userSeeking) {
                    seekBar.setProgress((int) (lastTime / 1000));
                    timeView.setText(fmt(lastTime));
                }
                break;
            case MediaPlayer.Event.EncounteredError:
                setBuffering(false);
                if (lastTime > 5000 && (length == 0 || lastTime < length - 15000)) {
                    handlePrematureDisconnect();
                } else {
                    showError("No se pudo reproducir este contenido.\nRevisá la conexión, el usuario/contraseña o el límite de conexiones del servidor.");
                }
                break;
            case MediaPlayer.Event.EndReached:
                if (lastTime > 5000 && length > 30000 && lastTime < (length - 15000)) {
                    handlePrematureDisconnect();
                } else {
                    finish();
                }
                break;
            default:
                break;
        }
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

        videoLayout = new VLCVideoLayout(this);
        root.addView(videoLayout, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        View.OnClickListener toggle = new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                setControlsVisible(!controlsVisible);
            }
        };
        root.setOnClickListener(toggle);
        videoLayout.setOnClickListener(toggle);

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
                if (!userSeeking) player.setTime(progress * 1000L); // cambio con control remoto
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
                player.setTime(sb.getProgress() * 1000L);
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
        if (player.isPlaying()) player.pause();
        else player.play();
        scheduleHide();
    }

    private void seekBy(long deltaMs) {
        long target = Math.max(0, player.getTime() + deltaMs);
        if (length > 0) target = Math.min(length, target);
        player.setTime(target);
        scheduleHide();
    }

    private void cycleAudio() {
        MediaPlayer.TrackDescription[] tracks = player.getAudioTracks();
        if (tracks == null || tracks.length == 0) {
            Toast.makeText(this, "Sin pistas de audio", Toast.LENGTH_SHORT).show();
            return;
        }
        int cur = player.getAudioTrack();
        int idx = -1;
        for (int i = 0; i < tracks.length; i++) {
            if (tracks[i].id == cur) idx = i;
        }
        for (int k = 1; k <= tracks.length; k++) {
            MediaPlayer.TrackDescription next = tracks[(idx + k + tracks.length) % tracks.length];
            if (next.id != -1) { // -1 = desactivado
                player.setAudioTrack(next.id);
                Toast.makeText(this, "Audio: " + next.name, Toast.LENGTH_SHORT).show();
                break;
            }
        }
        scheduleHide();
    }

    private void cycleSubs() {
        MediaPlayer.TrackDescription[] tracks = player.getSpuTracks();
        if (tracks == null || tracks.length == 0) {
            Toast.makeText(this, "Sin subtítulos", Toast.LENGTH_SHORT).show();
            return;
        }
        int cur = player.getSpuTrack();
        int idx = -1;
        for (int i = 0; i < tracks.length; i++) {
            if (tracks[i].id == cur) idx = i;
        }
        MediaPlayer.TrackDescription next = tracks[(idx + 1 + tracks.length) % tracks.length];
        player.setSpuTrack(next.id);
        Toast.makeText(this, "Subtítulos: " + next.name, Toast.LENGTH_SHORT).show();
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
