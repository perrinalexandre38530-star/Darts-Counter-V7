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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Awena voice bridge.
 *
 * - Before the neural pack is installed: Android TextToSpeech remains available as a fallback.
 * - Once the Estelle/PocketTTS pack is installed: synthesis is forced through the local neural
 *   engine. Neural errors are reported and NEVER silently downgraded to the Android system voice.
 */
@CapacitorPlugin(name = "AwenaVoice")
public class AwenaVoicePlugin extends Plugin {
    private TextToSpeech tts;
    private volatile boolean ready = false;
    private volatile int initStatus = TextToSpeech.ERROR;
    private String selectedVoiceName = null;

    private final ExecutorService neuralExecutor = Executors.newSingleThreadExecutor();
    private volatile AwenaPocketTtsEngine neuralEngine;
    private volatile boolean neuralInitializing = false;
    private volatile String neuralLastError = null;

    @Override
    public void load() {
        super.load();
        selectedVoiceName = getContext().getSharedPreferences("awena_voice", Context.MODE_PRIVATE)
            .getString("voiceName", null);

        // Keep the heavy neural sessions warm in the background so the first sentence does not
        // pay model-loading latency. System TTS is only a fallback while the pack is absent.
        if (AwenaNeuralModelManager.isInstalled(getContext())) {
            neuralExecutor.execute(() -> {
                try {
                    ensureNeuralEngine();
                } catch (Exception error) {
                    neuralLastError = error.getMessage();
                }
            });
        } else {
            initEngine(null);
        }
    }

    private synchronized void initEngine(final Runnable afterReady) {
        if (tts != null && ready) {
            if (afterReady != null) afterReady.run();
            return;
        }
        if (tts != null && !ready) {
            if (afterReady != null && getActivity() != null) {
                getActivity().runOnUiThread(() ->
                    getActivity().getWindow().getDecorView().postDelayed(() -> initEngine(afterReady), 120)
                );
            }
            return;
        }

        if (getActivity() == null) {
            if (afterReady != null) afterReady.run();
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

    private synchronized AwenaPocketTtsEngine ensureNeuralEngine() throws Exception {
        if (!AwenaNeuralModelManager.isInstalled(getContext())) {
            throw new IllegalStateException("Le pack vocal Awena · Estelle n'est pas installé.");
        }

        if (neuralEngine != null && neuralEngine.isReady()) return neuralEngine;

        neuralInitializing = true;
        try {
            if (neuralEngine == null) neuralEngine = new AwenaPocketTtsEngine(getContext());
            neuralEngine.initialize();
            neuralLastError = null;
            return neuralEngine;
        } catch (Exception error) {
            neuralLastError = error.getMessage();
            if (neuralEngine != null) {
                try { neuralEngine.close(); } catch (Exception ignored) {}
                neuralEngine = null;
            }
            throw error;
        } finally {
            neuralInitializing = false;
        }
    }

    private void resolveOnUi(PluginCall call, JSObject value) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> call.resolve(value));
        } else {
            call.resolve(value);
        }
    }

    private void rejectOnUi(PluginCall call, String message, Exception error) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> call.reject(message, error));
        } else {
            call.reject(message, error);
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("Texte Awena vide.");
            return;
        }

        final double volume = call.getDouble("volume", 0.9);

        // Final Awena path: once installed, Estelle is mandatory. Never fall back silently.
        if (AwenaNeuralModelManager.isInstalled(getContext())) {
            try {
                if (tts != null) tts.stop();
            } catch (Exception ignored) {}
            AwenaPocketTtsEngine currentlySpeaking = neuralEngine;
            if (currentlySpeaking != null) currentlySpeaking.requestStop();

            neuralExecutor.execute(() -> {
                try {
                    AwenaPocketTtsEngine engine = ensureNeuralEngine();
                    engine.requestStop();
                    engine.speak(text, (float) Math.max(0.0, Math.min(1.0, volume)));

                    JSObject out = new JSObject();
                    out.put("ok", true);
                    out.put("voiceName", "Awena · Estelle");
                    out.put("engine", "awena-neural");
                    resolveOnUi(call, out);
                } catch (Exception error) {
                    neuralLastError = error.getMessage();
                    rejectOnUi(call, "Erreur moteur neuronal Awena · Estelle : " + error.getMessage(), error);
                }
            });
            return;
        }

        // Temporary fallback only while the neural pack has not been installed.
        final String language = call.getString("language", "fr-FR");
        final String voiceName = call.getString("voiceName");
        final double rate = call.getDouble("rate", 1.0);
        final double pitch = call.getDouble("pitch", 1.0);

        initEngine(() -> {
            if (!ready || tts == null) {
                call.reject("Moteur vocal Android indisponible. Installe le pack Awena · Estelle.");
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
                String utteranceId = "awena-fallback-" + UUID.randomUUID();
                int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
                if (result == TextToSpeech.ERROR) {
                    call.reject("La synthèse vocale Awena provisoire a échoué.");
                    return;
                }
                JSObject out = new JSObject();
                out.put("ok", true);
                Voice activeVoice = tts.getVoice();
                out.put("voiceName", activeVoice == null ? null : activeVoice.getName());
                out.put("engine", "android-native");
                call.resolve(out);
            } catch (Exception error) {
                call.reject("Erreur Awena Voice : " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            AwenaPocketTtsEngine engine = neuralEngine;
            if (engine != null) engine.requestStop();
            if (tts != null) tts.stop();
            JSObject out = new JSObject();
            out.put("ok", true);
            call.resolve(out);
        } catch (Exception error) {
            call.reject("Impossible d'arrêter Awena.", error);
        }
    }

    @PluginMethod
    public void installNeuralVoice(PluginCall call) {
        if (AwenaNeuralModelManager.isInstalled(getContext())) {
            JSObject out = buildStatus();
            out.put("ok", true);
            call.resolve(out);
            return;
        }
        if (AwenaNeuralModelManager.isInstalling()) {
            call.reject("Installation de la voix Awena déjà en cours.");
            return;
        }

        neuralExecutor.execute(() -> {
            try {
                AwenaNeuralModelManager.install(getContext());
                // Force a full initialization now: install is only considered successful for the UI
                // if the ONNX sessions, tokenizer and Estelle conditioning can actually load.
                AwenaPocketTtsEngine engine = ensureNeuralEngine();

                try {
                    if (tts != null) {
                        tts.stop();
                        tts.shutdown();
                    }
                } catch (Exception ignored) {}
                tts = null;
                ready = false;

                JSObject out = buildStatus();
                out.put("ok", engine != null && engine.isReady());
                resolveOnUi(call, out);
            } catch (Exception error) {
                neuralLastError = error.getMessage();
                rejectOnUi(call, "Installation/initialisation Estelle impossible : " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void removeNeuralVoice(PluginCall call) {
        neuralExecutor.execute(() -> {
            try {
                AwenaPocketTtsEngine engine = neuralEngine;
                if (engine != null) engine.close();
                neuralEngine = null;
                neuralLastError = null;
                AwenaNeuralModelManager.delete(getContext());
                initEngine(null);

                JSObject out = buildStatus();
                out.put("ok", true);
                resolveOnUi(call, out);
            } catch (Exception error) {
                rejectOnUi(call, "Impossible de supprimer le pack vocal Awena.", error);
            }
        });
    }

    private JSObject buildStatus() {
        boolean installed = AwenaNeuralModelManager.isInstalled(getContext());
        AwenaPocketTtsEngine engine = neuralEngine;
        boolean neuralReady = installed && engine != null && engine.isReady();

        JSObject out = new JSObject();
        out.put("available", installed || tts != null);
        out.put("ready", installed ? neuralReady : ready);
        out.put("engine", installed ? "awena-neural" : (ready ? "android-native" : "none"));
        out.put("enginePackage", installed ? "PocketTTS · ONNX Runtime" : (tts == null ? null : tts.getDefaultEngine()));
        out.put("voiceName", installed ? "Awena · Estelle" : selectedVoiceName);
        out.put("language", "fr-FR");
        out.put("offline", installed ? true : null);

        out.put("neuralInstalled", installed);
        out.put("neuralReady", neuralReady);
        out.put("neuralInitializing", neuralInitializing);
        out.put("installing", AwenaNeuralModelManager.isInstalling());
        out.put("installProgress", AwenaNeuralModelManager.getProgress(getContext()));
        out.put("downloadedBytes", AwenaNeuralModelManager.getDownloadedBytes());
        out.put("totalBytes", AwenaNeuralModelManager.getTotalBytes());
        out.put("currentFile", AwenaNeuralModelManager.getCurrentFile());
        String modelError = AwenaNeuralModelManager.getLastError();
        out.put("lastError", neuralLastError != null ? neuralLastError : modelError);
        out.put("packId", AwenaNeuralModelManager.PACK_ID);
        return out;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        // Do not initialize Android TTS just to report status when Estelle is installed.
        if (AwenaNeuralModelManager.isInstalled(getContext())) {
            call.resolve(buildStatus());
            return;
        }

        initEngine(() -> call.resolve(buildStatus()));
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        JSArray result = new JSArray();

        if (AwenaNeuralModelManager.isInstalled(getContext())) {
            JSObject estelle = new JSObject();
            estelle.put("name", "Awena · Estelle");
            estelle.put("language", "fr-FR");
            estelle.put("offline", true);
            estelle.put("quality", 1000);
            estelle.put("latency", 0);
            result.put(estelle);

            JSObject out = new JSObject();
            out.put("voices", result);
            call.resolve(out);
            return;
        }

        final String language = call.getString("language", "fr-FR");
        initEngine(() -> {
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
        if (AwenaNeuralModelManager.isInstalled(getContext())) {
            JSObject out = new JSObject();
            out.put("ok", true);
            out.put("voiceName", "Awena · Estelle");
            call.resolve(out);
            return;
        }

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
        AwenaPocketTtsEngine engine = neuralEngine;
        if (engine != null) {
            try { engine.close(); } catch (Exception ignored) {}
        }
        neuralEngine = null;

        if (tts != null) {
            try { tts.stop(); } catch (Exception ignored) {}
            try { tts.shutdown(); } catch (Exception ignored) {}
        }
        tts = null;
        ready = false;

        neuralExecutor.shutdownNow();
        super.handleOnDestroy();
    }
}
