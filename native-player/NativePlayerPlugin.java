package com.calixtv.app;

import android.content.Intent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin Capacitor que abre un reproductor nativo (libVLC) a pantalla completa.
 * JS: NativePlayer.play({ url, title, startTime }) -> { position, duration } (ms) al cerrar.
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
}
