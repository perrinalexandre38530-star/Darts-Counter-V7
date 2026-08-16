package com.multisportsscoring.app;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * One-time installer for Awena's local neural voice pack.
 *
 * The neural model is intentionally NOT bundled inside the base AAB: the French PocketTTS
 * bundle is ~158 MiB. Once downloaded, every synthesis runs entirely on-device.
 */
public final class AwenaNeuralModelManager {
    private static final String TAG = "AwenaNeuralModel";
    private static final String BASE =
        "https://huggingface.co/lookbe/pocket-tts-onnx/resolve/main/french/";
    private static final String ESTELLE =
        "https://huggingface.co/kyutai/tts-voices/resolve/main/unmute-prod-website/developpeuse-3.wav?download=true";

    public static final String PACK_ID = "awena-estelle-pocket-fr-v1";
    public static final long TOTAL_EXPECTED_BYTES = 165_802_405L;

    private static final List<ModelFile> FILES = Arrays.asList(
        new ModelFile("bos_before_voice.npy", BASE + "bos_before_voice.npy", 4_224L),
        new ModelFile("flow_lm_flow_int8.onnx", BASE + "flow_lm_flow_int8.onnx", 9_961_955L),
        new ModelFile("flow_lm_main_int8.onnx", BASE + "flow_lm_main_int8.onnx", 76_197_556L),
        new ModelFile("mimi_decoder_int8.onnx", BASE + "mimi_decoder_int8.onnx", 22_625_761L),
        new ModelFile("mimi_encoder.onnx", BASE + "mimi_encoder.onnx", 39_284_392L),
        new ModelFile("text_conditioner.onnx", BASE + "text_conditioner.onnx", 16_388_344L),
        new ModelFile("tokenizer.model", BASE + "tokenizer.model", 60_173L),
        new ModelFile("estelle.wav", ESTELLE, 1_280_000L)
    );

    private static final AtomicBoolean installing = new AtomicBoolean(false);
    private static volatile long downloadedBytes = 0L;
    private static volatile long totalBytes = TOTAL_EXPECTED_BYTES;
    private static volatile String currentFile = null;
    private static volatile String lastError = null;

    private AwenaNeuralModelManager() {}

    public static File packDir(Context context) {
        return new File(context.getFilesDir(), "awena_voice/pocket_french");
    }

    public static File file(Context context, String name) {
        return new File(packDir(context), name);
    }

    public static boolean isInstalled(Context context) {
        for (ModelFile def : FILES) {
            File f = file(context, def.name);
            // HF/Xet may differ slightly in byte count over time. A 90% floor catches
            // HTML/error placeholders without rejecting a legitimate repack.
            long minimum = Math.max(1024L, (long) (def.expectedBytes * 0.90));
            if (!f.exists() || f.length() < minimum) return false;
        }
        return true;
    }

    public static boolean isInstalling() {
        return installing.get();
    }

    public static long getDownloadedBytes() {
        return downloadedBytes;
    }

    public static long getTotalBytes() {
        return totalBytes;
    }

    public static float getProgress(Context context) {
        if (isInstalled(context)) return 1f;
        if (totalBytes <= 0) return 0f;
        return Math.max(0f, Math.min(1f, downloadedBytes / (float) totalBytes));
    }

    public static String getCurrentFile() {
        return currentFile;
    }

    public static String getLastError() {
        return lastError;
    }

    public static synchronized void install(Context context) throws Exception {
        if (isInstalled(context)) {
            downloadedBytes = totalBytes;
            lastError = null;
            return;
        }
        if (!installing.compareAndSet(false, true)) {
            throw new IllegalStateException("Installation de la voix Awena déjà en cours.");
        }

        File dir = packDir(context);
        if (!dir.exists() && !dir.mkdirs()) {
            installing.set(false);
            throw new IllegalStateException("Impossible de créer le dossier du modèle Awena.");
        }

        lastError = null;
        try {
            long existing = 0L;
            for (ModelFile def : FILES) {
                File target = file(context, def.name);
                if (isValid(target, def)) existing += target.length();
            }
            downloadedBytes = existing;
            totalBytes = TOTAL_EXPECTED_BYTES;

            for (ModelFile def : FILES) {
                File target = file(context, def.name);
                if (isValid(target, def)) continue;

                currentFile = def.name;
                download(def, target, existing);
                existing += target.length();
                downloadedBytes = existing;
            }

            if (!isInstalled(context)) {
                throw new IllegalStateException("Le pack vocal téléchargé est incomplet.");
            }
            downloadedBytes = totalBytes;
            currentFile = null;
        } catch (Exception error) {
            lastError = error.getMessage();
            Log.e(TAG, "Awena voice pack installation failed", error);
            throw error;
        } finally {
            currentFile = null;
            installing.set(false);
        }
    }

    private static boolean isValid(File file, ModelFile def) {
        if (!file.exists()) return false;
        long minimum = Math.max(1024L, (long) (def.expectedBytes * 0.90));
        return file.length() >= minimum;
    }

    private static void download(ModelFile def, File target, long completedBefore) throws Exception {
        File partial = new File(target.getAbsolutePath() + ".part");
        if (partial.exists()) partial.delete();

        HttpURLConnection connection = null;
        try {
            String currentUrl = def.url;
            for (int redirect = 0; redirect < 8; redirect++) {
                connection = (HttpURLConnection) new URL(currentUrl).openConnection();
                connection.setConnectTimeout(30_000);
                connection.setReadTimeout(120_000);
                connection.setRequestProperty("User-Agent", "MULTISPORTS-SCORING-Awena/1.0");
                connection.setInstanceFollowRedirects(false);
                int code = connection.getResponseCode();

                if (code >= 300 && code < 400) {
                    String location = connection.getHeaderField("Location");
                    connection.disconnect();
                    connection = null;
                    if (location == null || location.trim().isEmpty()) {
                        throw new IllegalStateException("Redirection invalide pour " + def.name);
                    }
                    currentUrl = location;
                    continue;
                }

                if (code != HttpURLConnection.HTTP_OK) {
                    throw new IllegalStateException("HTTP " + code + " pendant " + def.name);
                }

                long contentLength = connection.getContentLengthLong();
                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[128 * 1024];
                    long local = 0L;
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                        local += read;
                        downloadedBytes = completedBefore + local;
                        if (Thread.currentThread().isInterrupted()) {
                            throw new InterruptedException("Téléchargement Awena interrompu.");
                        }
                    }
                    output.getFD().sync();
                }
                if (!partial.renameTo(target)) {
                    throw new IllegalStateException("Impossible de finaliser " + def.name);
                }
                return;
            }
            throw new IllegalStateException("Trop de redirections pour " + def.name);
        } finally {
            if (connection != null) connection.disconnect();
            if (!target.exists() && partial.exists()) partial.delete();
        }
    }

    public static synchronized void delete(Context context) {
        File dir = packDir(context);
        deleteRecursively(dir);
        downloadedBytes = 0L;
        currentFile = null;
        lastError = null;
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) deleteRecursively(child);
            }
        }
        //noinspection ResultOfMethodCallIgnored
        file.delete();
    }

    private static final class ModelFile {
        final String name;
        final String url;
        final long expectedBytes;

        ModelFile(String name, String url, long expectedBytes) {
            this.name = name;
            this.url = url;
            this.expectedBytes = expectedBytes;
        }
    }
}
