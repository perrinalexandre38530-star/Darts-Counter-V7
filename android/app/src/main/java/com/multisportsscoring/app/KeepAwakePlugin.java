package com.multisportsscoring.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KeepAwake")
public class KeepAwakePlugin extends Plugin {
    static final String PREFS_NAME = "multisports_scoring_display";
    static final String PREF_KEEP_AWAKE = "keep_screen_awake";

    public static boolean getStoredEnabled(Context context) {
        if (context == null) return true;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(PREF_KEEP_AWAKE, true);
    }

    public static void applyToActivity(Activity activity, boolean enabled) {
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            if (enabled) {
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean requested = call.getBoolean("enabled", true);
        boolean enabled = requested == null || requested;
        Context context = getContext();
        if (context != null) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(PREF_KEEP_AWAKE, enabled)
                .apply();
        }
        applyToActivity(getActivity(), enabled);
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        boolean enabled = getStoredEnabled(getContext());
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }
}
