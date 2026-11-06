package com.calixtv.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Plugin Capacitor para Calix TV:
 * 1. Reproductor nativo (libVLC) a pantalla completa con decodificación por hardware MediaCodec.
 * 2. Descargador e instalador de actualizaciones OTA (.apk) con soporte para DownloadManager y FileProvider.
 */
@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Falta la URL");
            return;
        }
        Intent intent = new Intent(getContext(), PlayerActivity.class);
        intent.putExtra("url", url);
        intent.putExtra("title", call.getString("title", ""));
        intent.putExtra("startMs", call.getInt("startTime", 0));
        startActivityForResult(call, intent, "playerClosed");
    }

    @ActivityCallback
    private void playerClosed(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        JSObject ret = new JSObject();
        ret.put("position", data != null ? data.getLongExtra("position", 0L) : 0L);
        ret.put("duration", data != null ? data.getLongExtra("duration", 0L) : 0L);
        call.resolve(ret);
    }

    /**
     * Descarga e instala una actualización de APK directamente en Android.
     */
    @PluginMethod
    public void installApk(PluginCall call) {
        String downloadUrl = call.getString("url");
        String fileName = call.getString("filename", "CalixTV-update.apk");

        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("Falta la URL del archivo APK");
            return;
        }

        Context ctx = getContext();

        // 1. Verificar permiso de instalación de paquetes desconocidos (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!ctx.getPackageManager().canRequestPackageInstalls()) {
                try {
                    Intent manageUnknown = new Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + ctx.getPackageName())
                    );
                    manageUnknown.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(manageUnknown);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        }

        try {
            DownloadManager downloadManager = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                // Si el DownloadManager no está disponible, abrir vía navegador del sistema
                openExternalUrl(ctx, downloadUrl);
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("method", "browser");
                call.resolve(res);
                return;
            }

            Uri uri = Uri.parse(downloadUrl);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("Calix TV Actualización");
            request.setDescription("Descargando nueva versión...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("application/vnd.android.package-archive");

            // Guardar en directorio de descargas públicas
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

            final long downloadId = downloadManager.enqueue(request);

            // Escuchar cuando finalice la descarga para lanzar el instalador
            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        try {
                            context.unregisterReceiver(this);
                        } catch (Exception ignored) {}

                        launchApkInstall(context, downloadManager, downloadId, fileName);
                    }
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ctx.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
            } else {
                ctx.registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("downloadId", downloadId);
            res.put("message", "Descarga de actualización iniciada");
            call.resolve(res);

        } catch (Exception e) {
            e.printStackTrace();
            // Fallback directo a abrir la URL en el navegador
            openExternalUrl(ctx, downloadUrl);
            JSObject res = new JSObject();
            res.put("success", true);
            res.put("fallback", true);
            res.put("error", e.getMessage());
            call.resolve(res);
        }
    }

    private void launchApkInstall(Context context, DownloadManager dm, long downloadId, String fileName) {
        try {
            Uri apkUri = null;
            File file = new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                fileName
            );

            if (file.exists() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    apkUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        file
                    );
                } catch (Exception e) {
                    apkUri = Uri.fromFile(file);
                }
            } else if (file.exists()) {
                apkUri = Uri.fromFile(file);
            } else {
                apkUri = dm.getUriForDownloadedFile(downloadId);
            }

            if (apkUri != null) {
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(apkUri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    context.startActivity(install);
                } catch (Exception tvEx) {
                    Intent tvInstall = new Intent(Intent.ACTION_INSTALL_PACKAGE);
                    tvInstall.setData(apkUri);
                    tvInstall.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    tvInstall.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    context.startActivity(tvInstall);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            try {
                openExternalUrl(context, "file://" + new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), fileName).getAbsolutePath());
            } catch (Exception ignored) {}
        }
    }

    private void openExternalUrl(Context context, String url) {
        try {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(browserIntent);
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        Context ctx = getContext();
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted = ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            if (!granted && getActivity() != null) {
                getActivity().requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        String title = call.getString("title", "Actualización Calix TV");
        String message = call.getString("message", "Nueva versión disponible para instalar.");
        String downloadUrl = call.getString("url", "");

        Context ctx = getContext();
        try {
            android.app.NotificationManager nm = (android.app.NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                android.app.Notification.Builder builder;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    builder = new android.app.Notification.Builder(ctx, "calix_tv_updates");
                } else {
                    builder = new android.app.Notification.Builder(ctx);
                }

                builder.setContentTitle(title)
                       .setContentText(message)
                       .setSmallIcon(android.R.drawable.stat_sys_download_done)
                       .setAutoCancel(true);

                if (downloadUrl != null && !downloadUrl.isEmpty()) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
                    android.app.PendingIntent pi = android.app.PendingIntent.getActivity(
                        ctx,
                        0,
                        intent,
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? android.app.PendingIntent.FLAG_IMMUTABLE : 0
                    );
                    builder.setContentIntent(pi);
                }

                nm.notify(1001, builder.build());
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error mostrando notificación: " + e.getMessage());
        }
    }
}
