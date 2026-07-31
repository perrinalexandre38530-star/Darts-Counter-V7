package com.multisportsscoring.app;

import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pont Android spécifique à MULTISPORTS SCORING.
 *
 * Il place de vraies bannières Google AdMob dans des emplacements mesurés par la
 * WebView. Contrairement au banner générique du plugin communautaire, l'annonce
 * suit donc son bloc React dans le contenu scrollable au lieu d'être collée en
 * haut ou en bas de l'écran.
 */
@CapacitorPlugin(name = "InlineAdMob")
public class InlineAdMobPlugin extends Plugin {

    private static final class SlotHolder {
        final String adUnitId;
        final FrameLayout container;
        final AdView adView;
        boolean loaded = false;

        SlotHolder(String adUnitId, FrameLayout container, AdView adView) {
            this.adUnitId = adUnitId;
            this.container = container;
            this.adView = adView;
        }
    }

    private final Map<String, SlotHolder> slots = new HashMap<>();
    private String testDeviceConfigurationSignature = "";
    private volatile boolean adsAllowed = false;

    /**
     * Les vrais IDs AdMob peuvent être testés sans générer de trafic invalide.
     * Le build real_test transmet explicitement les IDs des téléphones autorisés ;
     * le build production transmet une liste vide et retire donc tout appareil de test.
     */
    private void applyTestDeviceConfiguration(PluginCall call) {
        final boolean testing = Boolean.TRUE.equals(call.getBoolean("isTesting", false));
        final List<String> deviceIds = new ArrayList<>();
        final JSArray rawIds = call.getArray("testDeviceIds");
        if (testing && rawIds != null) {
            for (int index = 0; index < rawIds.length(); index++) {
                final String value = rawIds.optString(index, "").trim();
                if (!value.isEmpty() && !deviceIds.contains(value)) deviceIds.add(value);
            }
        }

        Collections.sort(deviceIds);
        final String signature = testing + ":" + String.join(",", deviceIds);
        if (signature.equals(testDeviceConfigurationSignature)) return;

        RequestConfiguration configuration = MobileAds.getRequestConfiguration()
            .toBuilder()
            .setTestDeviceIds(testing ? deviceIds : Collections.emptyList())
            .build();
        MobileAds.setRequestConfiguration(configuration);
        testDeviceConfigurationSignature = signature;
    }

    private int dp(float value) {
        final float density = getActivity().getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }

    private FrameLayout getRootContent() {
        View root = getActivity().findViewById(android.R.id.content);
        return root instanceof FrameLayout ? (FrameLayout) root : null;
    }

    private int[] getWebViewOffset(FrameLayout root) {
        int[] result = new int[] { 0, 0 };
        try {
            WebView webView = getBridge().getWebView();
            if (webView == null) return result;
            int[] webLoc = new int[2];
            int[] rootLoc = new int[2];
            webView.getLocationOnScreen(webLoc);
            root.getLocationOnScreen(rootLoc);
            result[0] = webLoc[0] - rootLoc[0];
            result[1] = webLoc[1] - rootLoc[1];
        } catch (Exception ignored) {
        }
        return result;
    }

    private void applyRect(SlotHolder holder, PluginCall call) {
        FrameLayout root = getRootContent();
        if (root == null) return;

        Double left = call.getDouble("left");
        Double top = call.getDouble("top");
        Double width = call.getDouble("width");
        Double height = call.getDouble("height");
        Boolean visible = call.getBoolean("visible");

        float leftDp = left == null ? 0f : left.floatValue();
        float topDp = top == null ? 0f : top.floatValue();
        float widthDp = width == null ? 320f : Math.max(300f, width.floatValue());
        float heightDp = height == null ? 56f : Math.max(50f, height.floatValue());

        int[] webOffset = getWebViewOffset(root);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(widthDp), dp(heightDp));
        params.leftMargin = webOffset[0] + dp(leftDp);
        params.topMargin = webOffset[1] + dp(topDp);
        params.gravity = Gravity.TOP | Gravity.LEFT;
        holder.container.setLayoutParams(params);
        // Tant que Google n'a pas confirmé onAdLoaded, le conteneur natif reste
        // invisible et ne masque ni ne bloque la carte de secours React.
        holder.container.setVisibility(holder.loaded && !Boolean.FALSE.equals(visible) ? View.VISIBLE : View.GONE);
    }

    private void destroySlot(String slotId) {
        SlotHolder holder = slots.remove(slotId);
        if (holder == null) return;
        try {
            holder.adView.destroy();
        } catch (Exception ignored) {
        }
        try {
            ViewGroup parent = (ViewGroup) holder.container.getParent();
            if (parent != null) parent.removeView(holder.container);
        } catch (Exception ignored) {
        }
    }

    @PluginMethod
    public void setAdsAllowed(PluginCall call) {
        final boolean allowed = Boolean.TRUE.equals(call.getBoolean("allowed", true));
        adsAllowed = allowed;
        getActivity().runOnUiThread(() -> {
            if (!allowed) {
                for (String slotId : slots.keySet().toArray(new String[0])) {
                    destroySlot(slotId);
                }
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!adsAllowed) {
            call.reject("Publicités désactivées par le droit Sans pub/Premium");
            return;
        }
        final String slotId = call.getString("slotId", "").trim();
        final String adId = call.getString("adId", "").trim();
        if (slotId.isEmpty() || adId.isEmpty()) {
            call.reject("slotId/adId manquant");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                if (!adsAllowed) {
                    call.reject("Publicités désactivées par le droit Sans pub/Premium");
                    return;
                }
                applyTestDeviceConfiguration(call);

                SlotHolder existing = slots.get(slotId);
                if (existing != null && existing.adUnitId.equals(adId) && existing.loaded) {
                    applyRect(existing, call);
                    call.resolve();
                    return;
                }
                // Un slot encore en chargement ou ayant échoué ne doit pas être
                // considéré comme affiché : on repart sur une requête propre.
                if (existing != null) destroySlot(slotId);

                FrameLayout root = getRootContent();
                if (root == null) {
                    call.reject("Conteneur Android introuvable");
                    return;
                }

                Double widthValue = call.getDouble("width");
                Double heightValue = call.getDouble("height");
                int widthDp = Math.max(300, (int) Math.floor(widthValue == null ? 320 : widthValue));
                int maxHeightDp = Math.max(50, Math.min(100, (int) Math.ceil(heightValue == null ? 56 : heightValue)));

                FrameLayout container = new FrameLayout(getActivity());
                container.setBackgroundColor(Color.TRANSPARENT);
                container.setClipChildren(true);
                container.setClipToPadding(true);

                AdView adView = new AdView(getActivity());
                adView.setAdUnitId(adId);
                adView.setAdSize(AdSize.getInlineAdaptiveBannerAdSize(widthDp, maxHeightDp));

                FrameLayout.LayoutParams adParams = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                );
                adParams.gravity = Gravity.CENTER;
                container.addView(adView, adParams);
                root.addView(container);

                SlotHolder holder = new SlotHolder(adId, container, adView);
                slots.put(slotId, holder);
                applyRect(holder, call);

                adView.setAdListener(new AdListener() {
                    @Override
                    public void onAdLoaded() {
                        SlotHolder current = slots.get(slotId);
                        if (current != holder) {
                            call.reject("Emplacement publicitaire remplacé avant chargement");
                            return;
                        }
                        holder.loaded = true;
                        applyRect(holder, call);
                        JSObject data = new JSObject();
                        data.put("slotId", slotId);
                        data.put("adUnitId", adId);
                        notifyListeners("inlineAdLoaded", data);
                        // La promesse JS ne devient vraie qu'une fois l'annonce
                        // réellement chargée. Cela permet au React de retenter si
                        // AdMob répond temporairement par une erreur/no-fill.
                        call.resolve();
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError error) {
                        JSObject data = new JSObject();
                        data.put("slotId", slotId);
                        data.put("code", error.getCode());
                        data.put("message", error.getMessage());
                        notifyListeners("inlineAdFailed", data);
                        if (slots.get(slotId) == holder) destroySlot(slotId);
                        call.reject("Échec du chargement AdMob (" + error.getCode() + ") : " + error.getMessage());
                    }
                });

                if (!adsAllowed) {
                    destroySlot(slotId);
                    call.reject("Publicités désactivées avant la requête AdMob");
                    return;
                }
                adView.loadAd(new AdRequest.Builder().build());
            } catch (Exception error) {
                call.reject("Impossible d'afficher la publicité AdMob intégrée", error);
            }
        });
    }

    @PluginMethod
    public void update(PluginCall call) {
        final String slotId = call.getString("slotId", "").trim();
        if (slotId.isEmpty()) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(() -> {
            SlotHolder holder = slots.get(slotId);
            if (holder != null) applyRect(holder, call);
            call.resolve();
        });
    }

    @PluginMethod
    public void hide(PluginCall call) {
        final String slotId = call.getString("slotId", "").trim();
        getActivity().runOnUiThread(() -> {
            if (!slotId.isEmpty()) destroySlot(slotId);
            call.resolve();
        });
    }

    @PluginMethod
    public void hideAll(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            for (String slotId : slots.keySet().toArray(new String[0])) {
                destroySlot(slotId);
            }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (String slotId : slots.keySet().toArray(new String[0])) {
            destroySlot(slotId);
        }
        super.handleOnDestroy();
    }
}
