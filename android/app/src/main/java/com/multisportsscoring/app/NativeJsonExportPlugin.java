package com.multisportsscoring.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
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
        int nextIndex = 0;
        long bytesWritten = 0L;

        ExportSession(OutputStream output, String fileName, Uri uri) {
            this.output = output;
            this.fileName = fileName;
            this.uri = uri;
        }
    }

    private final Map<String, ExportSession> sessions = new ConcurrentHashMap<>();

    @PluginMethod
    public void beginJsonExport(PluginCall call) {
        String fileName = sanitizeFileName(call.getString("fileName", "multisports-backup.json"));
        String mimeType = call.getString("mimeType", "application/json");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType == null || mimeType.trim().isEmpty() ? "application/json" : mimeType);
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
            call.resolve(cancelled);
            return;
        }

        String fileName = sanitizeFileName(call.getString("fileName", "multisports-backup.json"));
        try {
            OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w");
            if (output == null) {
                call.reject("Impossible d'ouvrir le fichier choisi.");
                return;
            }

            String exportId = UUID.randomUUID().toString();
            sessions.put(exportId, new ExportSession(output, fileName, uri));

            JSObject opened = new JSObject();
            opened.put("cancelled", false);
            opened.put("exportId", exportId);
            opened.put("fileName", fileName);
            opened.put("uri", uri.toString());
            call.resolve(opened);
        } catch (Exception error) {
            call.reject("Ouverture du fichier JSON impossible : " + safeMessage(error), error);
        }
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
                closeAndRemove(exportId, session);
                call.reject("Écriture du bloc JSON impossible : " + safeMessage(error), error);
            }
        }
    }

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

                JSObject saved = new JSObject();
                saved.put("cancelled", false);
                saved.put("fileName", session.fileName);
                saved.put("uri", session.uri.toString());
                saved.put("chunksWritten", session.nextIndex);
                saved.put("bytesWritten", session.bytesWritten);
                call.resolve(saved);
            } catch (Exception error) {
                closeQuietly(session.output);
                call.reject("Finalisation du fichier JSON impossible : " + safeMessage(error), error);
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
            }
        }
        call.resolve();
    }

    private void closeAndRemove(String exportId, ExportSession session) {
        sessions.remove(exportId);
        closeQuietly(session.output);
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

    private String sanitizeFileName(String value) {
        String raw = value == null ? "multisports-backup.json" : value.trim();
        if (raw.isEmpty()) raw = "multisports-backup.json";
        raw = raw.replaceAll("[\\\\/:*?\"<>|]+", "_");
        if (!raw.toLowerCase().endsWith(".json")) raw += ".json";
        return raw;
    }
}
