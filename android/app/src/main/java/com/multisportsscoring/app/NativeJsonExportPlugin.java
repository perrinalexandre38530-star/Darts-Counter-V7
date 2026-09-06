package com.multisportsscoring.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "NativeJsonExport")
public class NativeJsonExportPlugin extends Plugin {

    private static final class ExportSession {
        final OutputStream output;
        final String fileName;
        final Uri uri;
        final String mimeType;
        final String method;
        final boolean mediaStorePending;
        final File temporaryFile;
        int nextIndex = 0;
        long bytesWritten = 0L;

        ExportSession(
            OutputStream output,
            String fileName,
            Uri uri,
            String mimeType,
            String method,
            boolean mediaStorePending,
            File temporaryFile
        ) {
            this.output = output;
            this.fileName = fileName;
            this.uri = uri;
            this.mimeType = mimeType;
            this.method = method;
            this.mediaStorePending = mediaStorePending;
            this.temporaryFile = temporaryFile;
        }
    }

    private final Map<String, ExportSession> sessions = new ConcurrentHashMap<>();

    /**
     * Sélecteur Android classique. Conservé comme fallback pour les vieux Android
     * et pour les appareils qui bloqueraient MediaStore Downloads.
     */
    @PluginMethod
    public void beginJsonExport(PluginCall call) {
        String fileName = sanitizeFileName(call.getString("fileName", "multisports-backup.json"));
        String mimeType = sanitizeMimeType(call.getString("mimeType", "application/json"));

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, "beginJsonExportResult");
    }

    @ActivityCallback
    private void beginJsonExportResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Intent data = result == null ? null : result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result == null || result.getResultCode() != Activity.RESULT_OK || uri == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            cancelled.put("method", "android-file-picker");
            call.resolve(cancelled);
            return;
        }

        String fileName = sanitizeFileName(call.getString("fileName", "multisports-backup.json"));
        String mimeType = sanitizeMimeType(call.getString("mimeType", "application/json"));
        try {
            OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w");
            if (output == null) {
                call.reject("Impossible d'ouvrir le fichier choisi.");
                return;
            }
            resolveOpenedSession(call, new ExportSession(
                output, fileName, uri, mimeType, "android-file-picker", false, null
            ));
        } catch (Exception error) {
            call.reject("Ouverture du fichier JSON impossible : " + safeMessage(error), error);
        }
    }

    /**
     * Android 10+ : crée immédiatement un VRAI fichier dans
     * Téléchargements/MULTISPORTS SCORING. Aucune permission stockage n'est requise.
     * Android 9 et antérieurs : fallback vers ACTION_CREATE_DOCUMENT.
     */
    @PluginMethod
    public void beginJsonDownload(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            beginJsonExport(call);
            return;
        }

        String fileName = sanitizeFileName(call.getString("fileName", "multisports-backup.json"));
        String mimeType = sanitizeMimeType(call.getString("mimeType", "application/json"));
        Uri uri = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MULTISPORTS SCORING");
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                call.reject("Android n'a pas pu créer le fichier dans Téléchargements.");
                return;
            }

            OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w");
            if (output == null) {
                getContext().getContentResolver().delete(uri, null, null);
                call.reject("Impossible d'ouvrir le fichier créé dans Téléchargements.");
                return;
            }

            resolveOpenedSession(call, new ExportSession(
                output, fileName, uri, mimeType, "android-downloads", true, null
            ));
        } catch (Exception error) {
            if (uri != null) {
                try { getContext().getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
            }
            call.reject("Création dans Téléchargements impossible : " + safeMessage(error), error);
        }
    }

    /** Prépare un fichier temporaire partageable via FileProvider. */
    @PluginMethod
    public void beginJsonShare(PluginCall call) {
        String fileName = sanitizeFileName(call.getString("fileName", "multisports-match.json"));
        String mimeType = sanitizeMimeType(call.getString("mimeType", "application/json"));
        try {
            File dir = new File(getContext().getCacheDir(), "shared-json");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Impossible de préparer le dossier temporaire de partage.");
                return;
            }

            File file = new File(dir, UUID.randomUUID().toString().substring(0, 8) + "_" + fileName);
            OutputStream output = new FileOutputStream(file, false);
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            resolveOpenedSession(call, new ExportSession(
                output, fileName, uri, mimeType, "android-share", false, file
            ));
        } catch (Exception error) {
            call.reject("Préparation du partage impossible : " + safeMessage(error), error);
        }
    }

    private void resolveOpenedSession(PluginCall call, ExportSession session) {
        String exportId = UUID.randomUUID().toString();
        sessions.put(exportId, session);

        JSObject opened = new JSObject();
        opened.put("cancelled", false);
        opened.put("exportId", exportId);
        opened.put("fileName", session.fileName);
        opened.put("uri", session.uri.toString());
        opened.put("method", session.method);
        call.resolve(opened);
    }

    @PluginMethod
    public void appendJsonChunk(PluginCall call) {
        String exportId = call.getString("exportId");
        String chunk = call.getString("chunk");
        Integer index = call.getInt("index");

        if (exportId == null || exportId.trim().isEmpty()) {
            call.reject("Identifiant d'export manquant.");
            return;
        }
        if (chunk == null) {
            call.reject("Bloc JSON manquant.");
            return;
        }
        if (index == null || index < 0) {
            call.reject("Index de bloc JSON invalide.");
            return;
        }

        ExportSession session = sessions.get(exportId);
        if (session == null) {
            call.reject("Session d'export introuvable ou expirée.");
            return;
        }

        synchronized (session) {
            if (index != session.nextIndex) {
                call.reject("Ordre des blocs JSON invalide : attendu " + session.nextIndex + ", reçu " + index + ".");
                return;
            }

            try {
                byte[] bytes = chunk.getBytes(StandardCharsets.UTF_8);
                session.output.write(bytes);
                session.bytesWritten += bytes.length;
                session.nextIndex += 1;

                JSObject progress = new JSObject();
                progress.put("chunksWritten", session.nextIndex);
                progress.put("bytesWritten", session.bytesWritten);
                call.resolve(progress);
            } catch (Exception error) {
                closeAndRemove(exportId, session, true);
                call.reject("Écriture du bloc JSON impossible : " + safeMessage(error), error);
            }
        }
    }

    /** Termine un export permanent (Downloads ou sélecteur système). */
    @PluginMethod
    public void finishJsonExport(PluginCall call) {
        String exportId = call.getString("exportId");
        ExportSession session = exportId == null ? null : sessions.remove(exportId);
        if (session == null) {
            call.reject("Session d'export introuvable ou déjà terminée.");
            return;
        }

        synchronized (session) {
            try {
                session.output.flush();
                session.output.close();
                publishMediaStoreIfNeeded(session);

                JSObject saved = resultFor(session);
                call.resolve(saved);
            } catch (Exception error) {
                closeQuietly(session.output);
                cleanupSessionTarget(session);
                call.reject("Finalisation du fichier JSON impossible : " + safeMessage(error), error);
            }
        }
    }

    /** Termine le fichier temporaire puis ouvre la feuille de partage Android native. */
    @PluginMethod
    public void finishJsonShare(PluginCall call) {
        String exportId = call.getString("exportId");
        ExportSession session = exportId == null ? null : sessions.remove(exportId);
        if (session == null) {
            call.reject("Session de partage introuvable ou déjà terminée.");
            return;
        }

        synchronized (session) {
            try {
                session.output.flush();
                session.output.close();

                String title = call.getString("title", "Partager la partie");
                String text = call.getString("text", "");
                String mimeType = sanitizeMimeType(call.getString("mimeType", session.mimeType));

                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType(mimeType);
                send.putExtra(Intent.EXTRA_STREAM, session.uri);
                if (text != null && !text.trim().isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                send.setClipData(ClipData.newRawUri(session.fileName, session.uri));

                Intent chooser = Intent.createChooser(send, title == null || title.trim().isEmpty() ? "Partager" : title);
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Activity activity = getActivity();
                if (activity != null) {
                    activity.startActivity(chooser);
                } else {
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(chooser);
                }

                JSObject shared = resultFor(session);
                shared.put("method", "android-share");
                call.resolve(shared);
            } catch (Exception error) {
                closeQuietly(session.output);
                cleanupSessionTarget(session);
                call.reject("Partage du fichier JSON impossible : " + safeMessage(error), error);
            }
        }
    }

    @PluginMethod
    public void abortJsonExport(PluginCall call) {
        String exportId = call.getString("exportId");
        ExportSession session = exportId == null ? null : sessions.remove(exportId);
        if (session != null) {
            synchronized (session) {
                closeQuietly(session.output);
                cleanupSessionTarget(session);
            }
        }
        call.resolve();
    }

    private JSObject resultFor(ExportSession session) {
        JSObject result = new JSObject();
        result.put("cancelled", false);
        result.put("fileName", session.fileName);
        result.put("uri", session.uri.toString());
        result.put("chunksWritten", session.nextIndex);
        result.put("bytesWritten", session.bytesWritten);
        result.put("method", session.method);
        return result;
    }

    private void publishMediaStoreIfNeeded(ExportSession session) {
        if (!session.mediaStorePending || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        getContext().getContentResolver().update(session.uri, values, null, null);
    }

    private void cleanupSessionTarget(ExportSession session) {
        if (session == null) return;
        if (session.mediaStorePending) {
            try { getContext().getContentResolver().delete(session.uri, null, null); } catch (Exception ignored) {}
        }
        if (session.temporaryFile != null) {
            try { session.temporaryFile.delete(); } catch (Exception ignored) {}
        }
    }

    private void closeAndRemove(String exportId, ExportSession session, boolean cleanupTarget) {
        sessions.remove(exportId);
        closeQuietly(session.output);
        if (cleanupTarget) cleanupSessionTarget(session);
    }

    private void closeQuietly(OutputStream output) {
        if (output == null) return;
        try {
            output.close();
        } catch (Exception ignored) {
            // Rien à faire : la première erreur est déjà remontée au frontend.
        }
    }

    private String safeMessage(Exception error) {
        String message = error == null ? null : error.getMessage();
        return message == null || message.trim().isEmpty() ? "erreur inconnue" : message;
    }

    private String sanitizeMimeType(String value) {
        String raw = value == null ? "application/json" : value.trim();
        return raw.isEmpty() ? "application/json" : raw;
    }

    private String sanitizeFileName(String value) {
        String raw = value == null ? "multisports-backup.json" : value.trim();
        if (raw.isEmpty()) raw = "multisports-backup.json";
        raw = raw.replaceAll("[\\\\/:*?\"<>|]+", "_");
        if (!raw.toLowerCase().endsWith(".json")) raw += ".json";
        return raw;
    }
}
