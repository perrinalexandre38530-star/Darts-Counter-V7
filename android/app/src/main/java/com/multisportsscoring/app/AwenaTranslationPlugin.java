package com.multisportsscoring.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * On-device translation bridge for Awena.
 *
 * Knowledge remains authored in French. When the app language differs:
 *  - incoming questions are translated to French,
 *  - Awena resolves the intent against the same canonical knowledge base,
 *  - replies are translated back to the selected app language.
 *
 * Models are downloaded by ML Kit on demand and translation then runs on-device.
 */
@CapacitorPlugin(name = "AwenaTranslation")
public class AwenaTranslationPlugin extends Plugin {
    private final Map<String, Translator> translators = new ConcurrentHashMap<>();
    private final Map<String, Boolean> readyPairs = new ConcurrentHashMap<>();
    private final Map<String, String> lastErrors = new ConcurrentHashMap<>();

    private static String base(String value) {
        if (value == null || value.trim().isEmpty()) return "fr";
        String clean = value.trim().toLowerCase().replace('_', '-');
        int dash = clean.indexOf('-');
        return dash > 0 ? clean.substring(0, dash) : clean;
    }

    private static String mlLanguage(String requested) {
        String value = base(requested);
        // ML Kit Translation currently has no Serbian model. Croatian is the
        // closest supported fallback for Awena's local translation layer.
        if ("sr".equals(value)) value = "hr";
        return TranslateLanguage.fromLanguageTag(value);
    }

    private static String fallbackLanguage(String requested) {
        return "sr".equals(base(requested)) ? "hr" : null;
    }

    private static String pairKey(String source, String target) {
        return base(source) + ">" + base(target);
    }

    private Translator translatorFor(String sourceRequested, String targetRequested) {
        final String source = mlLanguage(sourceRequested);
        final String target = mlLanguage(targetRequested);
        if (source == null || target == null) return null;
        String key = source + ">" + target;
        Translator existing = translators.get(key);
        if (existing != null) return existing;

        TranslatorOptions options = new TranslatorOptions.Builder()
            .setSourceLanguage(source)
            .setTargetLanguage(target)
            .build();
        Translator created = Translation.getClient(options);
        translators.put(key, created);
        return created;
    }

    private JSObject baseResult(String source, String target) {
        JSObject out = new JSObject();
        out.put("sourceLanguage", base(source));
        out.put("targetLanguage", base(target));
        out.put("fallbackLanguage", fallbackLanguage(target));
        return out;
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        final String source = call.getString("sourceLanguage", "fr");
        final String target = call.getString("targetLanguage", "fr");
        final String key = pairKey(source, target);

        if (base(source).equals(base(target))) {
            JSObject out = baseResult(source, target);
            out.put("ok", true);
            out.put("ready", true);
            call.resolve(out);
            return;
        }

        Translator translator = translatorFor(source, target);
        if (translator == null) {
            call.reject("Langue de traduction Awena non prise en charge : " + source + " > " + target);
            return;
        }

        DownloadConditions conditions = new DownloadConditions.Builder().build();
        translator.downloadModelIfNeeded(conditions)
            .addOnSuccessListener(v -> {
                readyPairs.put(key, true);
                lastErrors.remove(key);
                JSObject out = baseResult(source, target);
                out.put("ok", true);
                out.put("ready", true);
                call.resolve(out);
            })
            .addOnFailureListener(error -> {
                readyPairs.put(key, false);
                lastErrors.put(key, error.getMessage());
                call.reject("Impossible de préparer la traduction Awena : " + error.getMessage(), error);
            });
    }

    @PluginMethod
    public void translate(PluginCall call) {
        final String text = call.getString("text", "");
        final String source = call.getString("sourceLanguage", "fr");
        final String target = call.getString("targetLanguage", "fr");
        final String key = pairKey(source, target);

        if (text == null || text.trim().isEmpty() || base(source).equals(base(target))) {
            JSObject out = baseResult(source, target);
            out.put("ok", true);
            out.put("text", text == null ? "" : text);
            call.resolve(out);
            return;
        }

        Translator translator = translatorFor(source, target);
        if (translator == null) {
            call.reject("Langue de traduction Awena non prise en charge : " + source + " > " + target);
            return;
        }

        Runnable doTranslate = () -> translator.translate(text)
            .addOnSuccessListener(translated -> {
                readyPairs.put(key, true);
                lastErrors.remove(key);
                JSObject out = baseResult(source, target);
                out.put("ok", true);
                out.put("text", translated);
                call.resolve(out);
            })
            .addOnFailureListener(error -> {
                lastErrors.put(key, error.getMessage());
                call.reject("Traduction Awena impossible : " + error.getMessage(), error);
            });

        if (Boolean.TRUE.equals(readyPairs.get(key))) {
            doTranslate.run();
            return;
        }

        translator.downloadModelIfNeeded(new DownloadConditions.Builder().build())
            .addOnSuccessListener(v -> {
                readyPairs.put(key, true);
                doTranslate.run();
            })
            .addOnFailureListener(error -> {
                readyPairs.put(key, false);
                lastErrors.put(key, error.getMessage());
                call.reject("Modèle de traduction Awena indisponible : " + error.getMessage(), error);
            });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        final String source = call.getString("sourceLanguage", "fr");
        final String target = call.getString("targetLanguage", "fr");
        final String key = pairKey(source, target);

        JSObject out = baseResult(source, target);
        boolean supported = mlLanguage(source) != null && mlLanguage(target) != null;
        boolean same = base(source).equals(base(target));
        out.put("available", supported);
        out.put("ready", same || Boolean.TRUE.equals(readyPairs.get(key)));
        out.put("lastError", lastErrors.get(key));
        call.resolve(out);
    }

    @Override
    protected void handleOnDestroy() {
        for (Translator translator : translators.values()) {
            try { translator.close(); } catch (Exception ignored) {}
        }
        translators.clear();
        readyPairs.clear();
        super.handleOnDestroy();
    }
}
