package com.multisportsscoring.app;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pont minimal pour OAuth social :
 * 1) ouvre l'URL Supabase/Provider dans le navigateur système Android ;
 * 2) expose le deep link reçu par MainActivity au JavaScript Capacitor.
 */
@CapacitorPlugin(name = "SocialAuth")
public class SocialAuthPlugin extends Plugin {

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("URL OAuth manquante.");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Impossible d'ouvrir le navigateur système.", error);
        }
    }

    @PluginMethod
    public void consumeLaunchUrl(PluginCall call) {
        JSObject result = new JSObject();
        try {
            Intent intent = getActivity().getIntent();
            Uri data = intent != null ? intent.getData() : null;
            String raw = data != null ? data.toString() : null;
            String prefix = call.getString("prefix");
            boolean matches = raw != null && (prefix == null || prefix.trim().isEmpty() || raw.startsWith(prefix));
            result.put("url", matches ? raw : null);

            // Le deep link ne doit être consommé qu'une fois. Quand un préfixe
            // est fourni (Google Drive, OAuth social...), ne jamais avaler un
            // callback appartenant à un autre flux.
            if (intent != null && matches) {
                intent.setData(null);
                getActivity().setIntent(intent);
            }
        } catch (Exception error) {
            result.put("url", null);
        }
        call.resolve(result);
    }
}
