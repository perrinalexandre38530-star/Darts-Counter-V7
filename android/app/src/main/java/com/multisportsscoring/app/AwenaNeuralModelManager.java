package com.multisportsscoring.app;

import android.content.Context;
import android.util.Log;

import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * One-time installer for Awena's production local French voice pack.
 *
 * V6 deliberately abandons the hand-ported PocketTTS French inference path. The French PocketTTS
 * ONNX exports currently use generation/EOS protocols that are not stable enough for production
 * Android playback in our custom runtime. Awena now uses the mature sherpa-onnx VITS/Piper path.
 *
 * The model is downloaded once, extracted under app-private storage, then every synthesis runs
 * fully on-device. The old PocketTTS pack is removed only after the new pack has been validated.
 */
public final class AwenaNeuralModelManager {
    private static final String TAG = "AwenaNeuralModel";

    private static final String ARCHIVE_URL =
        "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/" +
        "vits-piper-fr_FR-siwis-medium.tar.bz2";
    private static final String ARCHIVE_ROOT = "vits-piper-fr_FR-siwis-medium/";

    public static final String PACK_ID = "awena-siwis-piper-fr-v1";
    // The uncompressed Hugging Face repository is ~81 MB. The actual archive Content-Length is
    // used during download when available; this value only gives the UI a sane initial estimate.
    public static final long TOTAL_EXPECTED_BYTES = 82L * 1024L * 1024L;

    private static final AtomicBoolean installing = new AtomicBoolean(false);
    private static volatile long downloadedBytes = 0L;
    private static volatile long totalBytes = TOTAL_EXPECTED_BYTES;
    private static volatile String currentFile = null;
    private static volatile String lastError = null;

    private AwenaNeuralModelManager() {}

    public static File packDir(Context context) {
        return new File(context.getFilesDir(), "awena_voice/piper_siwis_fr");
    }

    public static File modelFile(Context context) {
        return new File(packDir(context), "fr_FR-siwis-medium.onnx");
    }

    public static File tokensFile(Context context) {
        return new File(packDir(context), "tokens.txt");
    }

    public static File dataDir(Context context) {
        return new File(packDir(context), "espeak-ng-data");
    }

    private static File legacyPocketDir(Context context) {
        return new File(context.getFilesDir(), "awena_voice/pocket_french");
    }

    public static boolean isInstalled(Context context) {
        File model = modelFile(context);
        File tokens = tokensFile(context);
        File espeak = dataDir(context);
        return model.exists() && model.length() > 55L * 1024L * 1024L
            && tokens.exists() && tokens.length() > 500L
            && espeak.exists() && espeak.isDirectory()
            && espeak.list() != null && espeak.list().length > 10;
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
        return Math.max(0f, Math.min(0.98f, downloadedBytes / (float) totalBytes));
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

        File parent = new File(context.getFilesDir(), "awena_voice");
        if (!parent.exists() && !parent.mkdirs()) {
            installing.set(false);
            throw new IllegalStateException("Impossible de créer le dossier vocal Awena.");
        }

        File archive = new File(context.getCacheDir(), "awena-siwis-piper.tar.bz2.part");
        File staging = new File(parent, "piper_siwis_fr.installing");
        deleteRecursively(staging);
        if (!staging.mkdirs()) {
            installing.set(false);
            throw new IllegalStateException("Impossible de préparer le pack vocal Awena.");
        }

        lastError = null;
        downloadedBytes = 0L;
        totalBytes = TOTAL_EXPECTED_BYTES;

        try {
            currentFile = "Téléchargement voix française stable";
            downloadArchive(archive);

            currentFile = "Installation du moteur vocal";
            extractArchive(archive, staging);

            if (!isValidPack(staging)) {
                throw new IllegalStateException("Le pack vocal Awena extrait est incomplet.");
            }

            File finalDir = packDir(context);
            deleteRecursively(finalDir);
            if (!staging.renameTo(finalDir)) {
                copyDirectory(staging, finalDir);
                deleteRecursively(staging);
            }

            if (!isInstalled(context)) {
                throw new IllegalStateException("Le pack vocal Awena n'a pas pu être finalisé.");
            }

            // Migration: the obsolete custom PocketTTS pack is large and must not consume storage
            // once the new stable VITS/Piper pack has been validated.
            deleteRecursively(legacyPocketDir(context));

            downloadedBytes = totalBytes;
            currentFile = null;
        } catch (Exception error) {
            lastError = error.getMessage();
            Log.e(TAG, "Awena stable voice installation failed", error);
            deleteRecursively(staging);
            throw error;
        } finally {
            if (archive.exists()) {
                //noinspection ResultOfMethodCallIgnored
                archive.delete();
            }
            currentFile = null;
            installing.set(false);
        }
    }

    private static void downloadArchive(File target) throws Exception {
        if (target.exists()) target.delete();
        HttpURLConnection connection = null;
        String currentUrl = ARCHIVE_URL;

        try {
            for (int redirect = 0; redirect < 10; redirect++) {
                connection = (HttpURLConnection) new URL(currentUrl).openConnection();
                connection.setConnectTimeout(30_000);
                connection.setReadTimeout(180_000);
                connection.setRequestProperty("User-Agent", "MULTISPORTS-SCORING-Awena/2.0");
                connection.setInstanceFollowRedirects(false);
                int code = connection.getResponseCode();

                if (code >= 300 && code < 400) {
                    String location = connection.getHeaderField("Location");
                    connection.disconnect();
                    connection = null;
                    if (location == null || location.trim().isEmpty()) {
                        throw new IllegalStateException("Redirection invalide du pack vocal Awena.");
                    }
                    currentUrl = location;
                    continue;
                }
                if (code != HttpURLConnection.HTTP_OK) {
                    throw new IllegalStateException("HTTP " + code + " pendant le téléchargement vocal Awena.");
                }

                long contentLength = connection.getContentLengthLong();
                if (contentLength > 5L * 1024L * 1024L) totalBytes = contentLength;

                try (InputStream in = new BufferedInputStream(connection.getInputStream(), 128 * 1024);
                     FileOutputStream fos = new FileOutputStream(target);
                     BufferedOutputStream out = new BufferedOutputStream(fos, 128 * 1024)) {
                    byte[] buffer = new byte[128 * 1024];
                    int read;
                    long local = 0L;
                    while ((read = in.read(buffer)) != -1) {
                        if (Thread.currentThread().isInterrupted()) {
                            throw new InterruptedException("Téléchargement Awena interrompu.");
                        }
                        out.write(buffer, 0, read);
                        local += read;
                        downloadedBytes = local;
                    }
                    out.flush();
                    fos.getFD().sync();
                }
                return;
            }
            throw new IllegalStateException("Trop de redirections pour le pack Awena.");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static void extractArchive(File archive, File staging) throws Exception {
        String canonicalRoot = staging.getCanonicalPath() + File.separator;

        try (InputStream fileIn = new BufferedInputStream(new FileInputStream(archive), 128 * 1024);
             BZip2CompressorInputStream bzIn = new BZip2CompressorInputStream(fileIn, true);
             TarArchiveInputStream tarIn = new TarArchiveInputStream(bzIn)) {

            TarArchiveEntry entry;
            while ((entry = tarIn.getNextTarEntry()) != null) {
                String rawName = entry.getName().replace('\\', '/');
                String relative = rawName.startsWith(ARCHIVE_ROOT)
                    ? rawName.substring(ARCHIVE_ROOT.length())
                    : rawName;
                if (relative.isEmpty()) continue;

                File output = new File(staging, relative);
                String canonical = output.getCanonicalPath();
                if (!canonical.startsWith(canonicalRoot)) {
                    throw new SecurityException("Chemin invalide dans le pack vocal Awena.");
                }

                if (entry.isDirectory()) {
                    if (!output.exists() && !output.mkdirs()) {
                        throw new IllegalStateException("Impossible de créer " + relative);
                    }
                    continue;
                }

                File parent = output.getParentFile();
                if (parent != null && !parent.exists() && !parent.mkdirs()) {
                    throw new IllegalStateException("Impossible de créer le dossier de " + relative);
                }

                try (BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(output), 64 * 1024)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = tarIn.read(buffer)) != -1) {
                        if (Thread.currentThread().isInterrupted()) {
                            throw new InterruptedException("Installation Awena interrompue.");
                        }
                        out.write(buffer, 0, read);
                    }
                }
            }
        }
    }

    private static boolean isValidPack(File dir) {
        File model = new File(dir, "fr_FR-siwis-medium.onnx");
        File tokens = new File(dir, "tokens.txt");
        File espeak = new File(dir, "espeak-ng-data");
        return model.exists() && model.length() > 55L * 1024L * 1024L
            && tokens.exists() && tokens.length() > 500L
            && espeak.exists() && espeak.isDirectory()
            && espeak.list() != null && espeak.list().length > 10;
    }

    private static void copyDirectory(File src, File dst) throws Exception {
        if (src.isDirectory()) {
            if (!dst.exists() && !dst.mkdirs()) {
                throw new IllegalStateException("Impossible de finaliser le dossier vocal Awena.");
            }
            File[] children = src.listFiles();
            if (children != null) {
                for (File child : children) copyDirectory(child, new File(dst, child.getName()));
            }
            return;
        }
        try (InputStream in = new BufferedInputStream(new FileInputStream(src));
             BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(dst))) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
        }
    }

    public static synchronized void delete(Context context) {
        deleteRecursively(packDir(context));
        deleteRecursively(legacyPocketDir(context));
        downloadedBytes = 0L;
        totalBytes = TOTAL_EXPECTED_BYTES;
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
}
