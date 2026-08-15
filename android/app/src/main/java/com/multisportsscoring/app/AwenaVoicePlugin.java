package com.multisportsscoring.app;

import android.content.Context;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "AwenaVoice")
public class AwenaVoicePlugin extends Plugin {
    private TextToSpeech tts;
    private volatile boolean ready = false;
    private volatile int initStatus = TextToSpeech.ERROR;
    private String selectedVoiceName = null;

    @Override
    public void load() {
        super.load();
        selectedVoiceName = getContext().getSharedPreferences("awena_voice", Context.MODE_PRIVATE)
            .getString("voiceName", null);
        initEngine(null);
    }

    private synchronized void initEngine(final Runnable afterReady) {
        if (tts != null && ready) {
            if (afterReady != null) afterReady.run();
            return;
        }
        if (tts != null && !ready) {
            if (afterReady != null) {
                getActivity().runOnUiThread(() -> getActivity().getWindow().getDecorView().postDelayed(() -> initEngine(afterReady), 120));
            }
            return;
        }

        getActivity().runOnUiThread(() -> {
            tts = new TextToSpeech(getContext(), status -> {
                initStatus = status;
                ready = status == TextToSpeech.SUCCESS;
                if (ready) {
                    tts.setLanguage(Locale.FRANCE);
                    applySelectedVoice();
                }
                if (afterReady != null) afterReady.run();
            });
        });
    }

    private void applySelectedVoice() {
        if (!ready || tts == null || selectedVoiceName == null || selectedVoiceName.trim().isEmpty()) return;
        Set<Voice> voices = tts.getVoices();
        if (voices == null) return;
        for (Voice voice : voices) {
            if (voice != null && selectedVoiceName.equals(voice.getName())) {
                try { tts.setVoice(voice); } catch (Exception ignored) {}
                return;
            }
        }
    }

    private Locale localeFromTag(String languageTag) {
        if (languageTag == null || languageTag.trim().isEmpty()) return Locale.FRANCE;
        try {
            Locale locale = Locale.forLanguageTag(languageTag);
            return locale == null ? Locale.FRANCE : locale;
        } catch (Exception ignored) {
            return Locale.FRANCE;
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("Texte Awena vide.");
            return;
        }
        final String language = call.getString("language", "fr-FR");
        final String voiceName = call.getString("voiceName");
        final double rate = call.getDouble("rate", 1.0);
        final double pitch = call.getDouble("pitch", 1.0);
        final double volume = call.getDouble("volume", 0.9);

        initEngine(() -> {
            if (!ready || tts == null) {
                call.reject("Moteur vocal Android indisponible.");
                return;
            }
            try {
                Locale locale = localeFromTag(language);
                int languageResult = tts.setLanguage(locale);
                if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    call.reject("Langue vocale non installée : " + language);
                    return;
                }

                if (voiceName != null && !voiceName.trim().isEmpty()) {
                    selectedVoiceName = voiceName.trim();
                    getContext().getSharedPreferences("awena_voice", Context.MODE_PRIVATE)
                        .edit().putString("voiceName", selectedVoiceName).apply();
                    applySelectedVoice();
                }

                tts.setSpeechRate((float)Math.max(0.65, Math.min(1.45, rate)));
                tts.setPitch((float)Math.max(0.75, Math.min(1.25, pitch)));

                Bundle params = new Bundle();
                params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, (float)Math.max(0.0, Math.min(1.0, volume)));
                String utteranceId = "awena-" + UUID.randomUUID();
                int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
                if (result == TextToSpeech.ERROR) {
                    call.reject("La synthèse vocale Awena a échoué.");
                    return;
                }
                JSObject out = new JSObject();
                out.put("ok", true);
                Voice activeVoice = tts.getVoice();
                out.put("voiceName", activeVoice == null ? null : activeVoice.getName());
                call.resolve(out);
            } catch (Exception error) {
                call.reject("Erreur Awena Voice : " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            if (tts != null) tts.stop();
            JSObject out = new JSObject();
            out.put("ok", true);
            call.resolve(out);
        } catch (Exception error) {
            call.reject("Impossible d'arrêter Awena.", error);
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        initEngine(() -> {
            JSObject out = new JSObject();
            out.put("available", tts != null);
            out.put("ready", ready);
            out.put("engine", ready ? "android-native" : "none");
            out.put("enginePackage", tts == null ? null : tts.getDefaultEngine());
            Voice activeVoice = ready && tts != null ? tts.getVoice() : null;
            out.put("voiceName", activeVoice == null ? selectedVoiceName : activeVoice.getName());
            out.put("language", activeVoice == null || activeVoice.getLocale() == null ? "fr-FR" : activeVoice.getLocale().toLanguageTag());
            out.put("offline", activeVoice == null ? null : !activeVoice.isNetworkConnectionRequired());
            out.put("initStatus", initStatus);
            call.resolve(out);
        });
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        final String language = call.getString("language", "fr-FR");
        initEngine(() -> {
            JSArray result = new JSArray();
            if (ready && tts != null) {
                String languagePrefix = localeFromTag(language).getLanguage();
                Set<Voice> set = tts.getVoices();
                if (set != null) {
                    List<Voice> voices = new ArrayList<>(set);
                    voices.sort(Comparator.comparing(Voice::getName));
                    for (Voice voice : voices) {
                        if (voice == null || voice.getLocale() == null) continue;
                        if (!voice.getLocale().getLanguage().equalsIgnoreCase(languagePrefix)) continue;
                        JSObject item = new JSObject();
                        item.put("name", voice.getName());
                        item.put("language", voice.getLocale().toLanguageTag());
                        item.put("offline", !voice.isNetworkConnectionRequired());
                        item.put("quality", voice.getQuality());
                        item.put("latency", voice.getLatency());
                        result.put(item);
                    }
                }
            }
            JSObject out = new JSObject();
            out.put("voices", result);
            call.resolve(out);
        });
    }

    @PluginMethod
    public void setVoice(PluginCall call) {
        String name = call.getString("voiceName");
        selectedVoiceName = name == null || name.trim().isEmpty() ? null : name.trim();
        if (selectedVoiceName == null) {
            getContext().getSharedPreferences("awena_voice", Context.MODE_PRIVATE).edit().remove("voiceName").apply();
        } else {
            getContext().getSharedPreferences("awena_voice", Context.MODE_PRIVATE).edit().putString("voiceName", selectedVoiceName).apply();
        }
        initEngine(() -> {
            applySelectedVoice();
            JSObject out = new JSObject();
            out.put("ok", true);
            out.put("voiceName", selectedVoiceName);
            call.resolve(out);
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            try { tts.stop(); } catch (Exception ignored) {}
            try { tts.shutdown(); } catch (Exception ignored) {}
        }
        tts = null;
        ready = false;
        super.handleOnDestroy();
    }
}
