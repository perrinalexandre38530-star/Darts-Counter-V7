package com.multisportsscoring.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Native speech-to-text bridge for Awena commands.
 *
 * The recognizer is intentionally one utterance at a time. The TypeScript
 * controller decides whether another listen cycle should start, which keeps
 * the Android SpeechRecognizer lifecycle explicit and lets Awena pause the
 * microphone while she is speaking.
 */
@CapacitorPlugin(
    name = "AwenaSpeechRecognition",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class AwenaSpeechRecognitionPlugin extends Plugin implements RecognitionListener {
    private SpeechRecognizer recognizer;
    private boolean usingOnDevice = false;
    private boolean listening = false;

    @Override
    protected void handleOnDestroy() {
        destroyRecognizer();
        super.handleOnDestroy();
    }

    private void destroyRecognizer() {
        getActivity().runOnUiThread(() -> {
            try {
                if (recognizer != null) {
                    recognizer.cancel();
                    recognizer.destroy();
                }
            } catch (Exception ignored) {}
            recognizer = null;
            listening = false;
        });
    }

    private boolean recognitionAvailable() {
        try {
            return SpeechRecognizer.isRecognitionAvailable(getContext());
        } catch (Exception e) {
            return false;
        }
    }

    private boolean onDeviceAvailable() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false;
        try {
            return SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", recognitionAvailable());
        ret.put("onDeviceAvailable", onDeviceAvailable());
        ret.put("permission", getPermissionState("microphone") == PermissionState.GRANTED ? "granted" : "prompt");
        ret.put("listening", listening);
        ret.put("engine", usingOnDevice ? "android-on-device" : "android-system");
        call.resolve(ret);
    }

    @PluginMethod
    public void requestMicrophonePermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "startListeningPermissionCallback");
            return;
        }
        startListeningInternal(call);
    }

    @PermissionCallback
    private void startListeningPermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission denied", "MICROPHONE_DENIED");
            emitState("permission-denied", null);
            return;
        }
        startListeningInternal(call);
    }

    private void startListeningInternal(PluginCall call) {
        if (!recognitionAvailable()) {
            call.reject("Speech recognition is not available on this device", "NOT_AVAILABLE");
            return;
        }

        final String language = call.getString("language", Locale.getDefault().toLanguageTag());
        final boolean preferOffline = Boolean.TRUE.equals(call.getBoolean("preferOffline", true));
        final boolean partialResults = Boolean.TRUE.equals(call.getBoolean("partialResults", true));
        final int maxResults = Math.max(1, Math.min(8, call.getInt("maxResults", 5)));

        getActivity().runOnUiThread(() -> {
            try {
                if (recognizer != null && listening) {
                    try { recognizer.cancel(); } catch (Exception ignored) {}
                    listening = false;
                }

                boolean shouldUseOnDevice = preferOffline && onDeviceAvailable();
                if (recognizer == null || shouldUseOnDevice != usingOnDevice) {
                    if (recognizer != null) {
                        try { recognizer.destroy(); } catch (Exception ignored) {}
                    }
                    usingOnDevice = shouldUseOnDevice;
                    recognizer = usingOnDevice
                        ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext())
                        : SpeechRecognizer.createSpeechRecognizer(getContext());
                    recognizer.setRecognitionListener(this);
                }

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, partialResults);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, maxResults);
                intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
                if (!usingOnDevice) {
                    intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline);
                }

                listening = true;
                recognizer.startListening(intent);
                JSObject ret = new JSObject();
                ret.put("started", true);
                ret.put("onDevice", usingOnDevice);
                ret.put("language", language);
                call.resolve(ret);
                emitState("starting", null);
            } catch (Exception e) {
                listening = false;
                call.reject("Unable to start speech recognition", "START_FAILED", e);
                emitState("error", e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (recognizer != null && listening) recognizer.stopListening();
            } catch (Exception ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (recognizer != null) recognizer.cancel();
            } catch (Exception ignored) {}
            listening = false;
            emitState("idle", null);
            call.resolve();
        });
    }

    private void emitState(String state, String error) {
        JSObject data = new JSObject();
        data.put("state", state);
        data.put("listening", listening);
        data.put("onDevice", usingOnDevice);
        if (error != null) data.put("error", error);
        notifyListeners("speechState", data);
    }

    private void emitResult(Bundle results, boolean isFinal) {
        ArrayList<String> matches = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        float[] confidences = results == null ? null : results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
        JSObject data = new JSObject();
        JSArray alternatives = new JSArray();
        if (matches != null) {
            for (String match : matches) alternatives.put(match);
        }
        data.put("text", matches != null && !matches.isEmpty() ? matches.get(0) : "");
        data.put("alternatives", alternatives);
        data.put("final", isFinal);
        data.put("onDevice", usingOnDevice);
        if (confidences != null && confidences.length > 0) data.put("confidence", confidences[0]);
        notifyListeners("speechResult", data);
    }

    private String errorName(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "audio";
            case SpeechRecognizer.ERROR_CLIENT: return "client";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "permission";
            case SpeechRecognizer.ERROR_NETWORK: return "network";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "network-timeout";
            case SpeechRecognizer.ERROR_NO_MATCH: return "no-match";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "busy";
            case SpeechRecognizer.ERROR_SERVER: return "server";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "speech-timeout";
            default: return "error-" + error;
        }
    }

    @Override public void onReadyForSpeech(Bundle params) { emitState("ready", null); }
    @Override public void onBeginningOfSpeech() { emitState("speech", null); }
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() { emitState("processing", null); }

    @Override
    public void onError(int error) {
        listening = false;
        String name = errorName(error);
        JSObject data = new JSObject();
        data.put("state", "error");
        data.put("error", name);
        data.put("code", error);
        data.put("listening", false);
        data.put("onDevice", usingOnDevice);
        notifyListeners("speechState", data);
    }

    @Override
    public void onResults(Bundle results) {
        listening = false;
        emitResult(results, true);
        emitState("idle", null);
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        emitResult(partialResults, false);
    }

    @Override public void onEvent(int eventType, Bundle params) {}
}
