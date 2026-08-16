package com.multisportsscoring.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.util.Log;

import com.k2fsa.sherpa.onnx.GeneratedAudio;
import com.k2fsa.sherpa.onnx.OfflineTts;
import com.k2fsa.sherpa.onnx.OfflineTtsConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stable local neural TTS engine for Awena (V6.3 crash-safe JNI path).
 *
 * Historical class name kept so existing Capacitor bridge code does not need a destructive
 * migration. V6 no longer runs PocketTTS: it uses sherpa-onnx's mature VITS/Piper French path.
 *
 * Crucially, there is NO live AudioTrack streaming here. sherpa generates a complete, coherent
 * waveform first; Android then plays one immutable PCM buffer with MODE_STATIC. This removes the
 * underruns, half-words, crackling and EOS truncation seen with the experimental PocketTTS path.
 */
public final class AwenaPocketTtsEngine implements AutoCloseable {
    private static final String TAG = "AwenaStableTTS";
    private static final int CACHE_VERSION = 3;
    private static final int MAX_MEMORY_CACHE_ITEMS = 28;
    private static final int MAX_DISK_CACHE_FILES = 96;
    private static final int MAX_CACHE_TEXT = 180;

    private final Context context;
    private final Object engineLock = new Object();
    private final Object audioLock = new Object();
    private final ConcurrentHashMap<String, CachedAudio> memoryCache = new ConcurrentHashMap<>();

    private volatile OfflineTts tts;
    private volatile AudioTrack activeTrack;
    private volatile boolean ready = false;
    private volatile boolean stopRequested = false;

    public AwenaPocketTtsEngine(Context context) {
        this.context = context.getApplicationContext();
    }

    public boolean isReady() {
        return ready && tts != null;
    }

    public void initialize() throws Exception {
        synchronized (engineLock) {
            if (isReady()) return;
            if (!AwenaNeuralModelManager.isInstalled(context)) {
                throw new IllegalStateException("Le pack vocal stable d'Awena n'est pas installé.");
            }

            OfflineTtsVitsModelConfig vits = new OfflineTtsVitsModelConfig();
            vits.setModel(AwenaNeuralModelManager.modelFile(context).getAbsolutePath());
            vits.setTokens(AwenaNeuralModelManager.tokensFile(context).getAbsolutePath());
            vits.setDataDir(AwenaNeuralModelManager.dataDir(context).getAbsolutePath());
            vits.setNoiseScale(0.667f);
            vits.setNoiseScaleW(0.8f);
            vits.setLengthScale(1.0f);

            OfflineTtsModelConfig modelConfig = new OfflineTtsModelConfig();
            modelConfig.setVits(vits);
            // Two threads generally lowers latency without monopolising the UI/gameplay threads.
            modelConfig.setNumThreads(1);
            modelConfig.setDebug(false);
            modelConfig.setProvider("cpu");

            OfflineTtsConfig config = new OfflineTtsConfig();
            config.setModel(modelConfig);
            config.setMaxNumSentences(1);
            config.setSilenceScale(0.16f);

            // sherpa-onnx Kotlin API exposes the Java constructor as
            // OfflineTts(AssetManager, OfflineTtsConfig). Because Awena's model files are
            // installed in app-private filesystem storage (not packaged Android assets),
            // pass null so sherpa uses newFromFile(config) with the absolute paths above.
            tts = new OfflineTts(null, config);
            ready = true;
            stopRequested = false;
            trimDiskCache();
            Log.i(TAG, "Awena stable French VITS/Piper engine ready @ " + tts.sampleRate() + " Hz");
        }
    }

    public void speak(String text, float volume) throws Exception {
        speak(text, volume, 1.0f);
    }

    public void speak(String text, float volume, float requestedRate) throws Exception {
        String clean = normalizeText(text);
        if (clean.isEmpty()) return;
        if (!isReady()) initialize();

        requestStop();
        stopRequested = false;

        float speed = clamp(requestedRate, 0.82f, 1.24f);
        float gain = clamp(volume, 0f, 1f);
        String cacheKey = cacheKey(clean, speed);

        CachedAudio audio = getCached(cacheKey);
        if (audio == null) {
            long started = System.nanoTime();
            GeneratedAudio generated;
            synchronized (engineLock) {
                if (stopRequested) return;
                OfflineTts engine = tts;
                if (engine == null) throw new IllegalStateException("Moteur Awena non initialisé.");

                // V6.3: use sherpa's simplest synchronous JNI generation path.
                // The previous V6 path unnecessarily crossed the Java/native callback bridge even
                // though we were not streaming audio. On Android a native TTS failure can terminate
                // the whole process, so keep the synthesis path minimal and deterministic.
                generated = engine.generate(clean, 0, speed);
            }
            if (stopRequested || generated == null) return;

            float[] samples = generated.getSamples();
            int sampleRate = generated.getSampleRate();
            if (samples == null || samples.length == 0 || sampleRate <= 0) {
                throw new IllegalStateException("Awena n'a généré aucun audio.");
            }

            short[] pcm = toPcm16(samples, gain);
            audio = new CachedAudio(sampleRate, pcm);

            double synthMs = (System.nanoTime() - started) / 1_000_000.0;
            double durationMs = pcm.length * 1000.0 / sampleRate;
            Log.i(TAG, String.format(Locale.US,
                "generated %.0fms audio in %.0fms (RTF %.2f)", durationMs, synthMs,
                durationMs > 0 ? synthMs / durationMs : 0));

            if (clean.length() <= MAX_CACHE_TEXT && !stopRequested) putCached(cacheKey, audio);
        }

        if (!stopRequested) playStatic(audio, gain);
    }

    public void requestStop() {
        stopRequested = true;
        synchronized (audioLock) {
            AudioTrack track = activeTrack;
            activeTrack = null;
            if (track != null) {
                try { track.pause(); } catch (Exception ignored) {}
                try { track.flush(); } catch (Exception ignored) {}
                try { track.stop(); } catch (Exception ignored) {}
                try { track.release(); } catch (Exception ignored) {}
            }
        }
    }

    private void playStatic(CachedAudio audio, float volume) throws Exception {
        if (audio.pcm.length == 0) return;
        int bytes = Math.max(2, audio.pcm.length * 2);

        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build();
        AudioFormat format = new AudioFormat.Builder()
            .setSampleRate(audio.sampleRate)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build();

        AudioTrack track = new AudioTrack.Builder()
            .setAudioAttributes(attrs)
            .setAudioFormat(format)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .setBufferSizeInBytes(bytes)
            .build();

        if (track.getState() != AudioTrack.STATE_INITIALIZED) {
            try { track.release(); } catch (Exception ignored) {}
            throw new IllegalStateException("Audio Android Awena impossible à initialiser.");
        }

        synchronized (audioLock) {
            if (stopRequested) {
                track.release();
                return;
            }
            activeTrack = track;
        }

        try {
            int written = track.write(audio.pcm, 0, audio.pcm.length, AudioTrack.WRITE_BLOCKING);
            if (written <= 0) throw new IllegalStateException("Impossible de charger l'audio Awena.");

            track.setVolume(clamp(volume, 0f, 1f));
            track.play();

            // MODE_STATIC gives us one immutable buffer: wait for the hardware playback head rather
            // than sleeping an estimated duration, so the last phoneme is never chopped off.
            int targetFrames = written;
            long maxWaitMs = Math.max(1_000L, (long) (targetFrames * 1000.0 / audio.sampleRate) + 1_200L);
            long deadline = System.currentTimeMillis() + maxWaitMs;
            while (!stopRequested && System.currentTimeMillis() < deadline) {
                int head = track.getPlaybackHeadPosition();
                if (head >= targetFrames - Math.min(64, targetFrames)) break;
                try { Thread.sleep(12L); } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    stopRequested = true;
                    break;
                }
            }
        } finally {
            synchronized (audioLock) {
                if (activeTrack == track) activeTrack = null;
            }
            try { track.stop(); } catch (Exception ignored) {}
            try { track.release(); } catch (Exception ignored) {}
        }
    }

    private static short[] toPcm16(float[] input, float gain) {
        if (input.length == 0) return new short[0];
        float maxAbs = 0f;
        for (float v : input) maxAbs = Math.max(maxAbs, Math.abs(v));
        float normalizer = maxAbs > 0.985f ? 0.965f / maxAbs : 0.965f;
        float scale = Math.min(1f, normalizer) * Math.max(0f, gain);

        short[] out = new short[input.length];
        int fade = Math.min(Math.max(16, input.length / 600), 160);
        for (int i = 0; i < input.length; i++) {
            float envelope = 1f;
            if (i < fade) envelope = i / (float) fade;
            else if (i >= input.length - fade) envelope = (input.length - 1 - i) / (float) fade;
            float v = input[i] * scale * Math.max(0f, envelope);
            v = Math.max(-1f, Math.min(1f, v));
            out[i] = (short) Math.round(v * 32767f);
        }
        return out;
    }

    private CachedAudio getCached(String key) {
        CachedAudio memory = memoryCache.get(key);
        if (memory != null) return memory;
        File file = cacheFile(key);
        if (!file.exists()) return null;
        try (DataInputStream in = new DataInputStream(new BufferedInputStream(new FileInputStream(file)))) {
            int version = in.readInt();
            if (version != CACHE_VERSION) return null;
            int sampleRate = in.readInt();
            int count = in.readInt();
            if (sampleRate < 8_000 || sampleRate > 96_000 || count <= 0 || count > 8_000_000) return null;
            short[] pcm = new short[count];
            for (int i = 0; i < count; i++) pcm[i] = in.readShort();
            CachedAudio audio = new CachedAudio(sampleRate, pcm);
            remember(key, audio);
            //noinspection ResultOfMethodCallIgnored
            file.setLastModified(System.currentTimeMillis());
            return audio;
        } catch (Exception ignored) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
            return null;
        }
    }

    private void putCached(String key, CachedAudio audio) {
        remember(key, audio);
        File file = cacheFile(key);
        File tmp = new File(file.getAbsolutePath() + ".tmp");
        try {
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            try (DataOutputStream out = new DataOutputStream(new BufferedOutputStream(new FileOutputStream(tmp)))) {
                out.writeInt(CACHE_VERSION);
                out.writeInt(audio.sampleRate);
                out.writeInt(audio.pcm.length);
                for (short sample : audio.pcm) out.writeShort(sample);
            }
            if (file.exists()) file.delete();
            //noinspection ResultOfMethodCallIgnored
            tmp.renameTo(file);
            trimDiskCache();
        } catch (Exception ignored) {
            //noinspection ResultOfMethodCallIgnored
            tmp.delete();
        }
    }

    private void remember(String key, CachedAudio audio) {
        if (memoryCache.size() >= MAX_MEMORY_CACHE_ITEMS) {
            String first = memoryCache.keys().hasMoreElements() ? memoryCache.keys().nextElement() : null;
            if (first != null) memoryCache.remove(first);
        }
        memoryCache.put(key, audio);
    }

    private File cacheDir() {
        return new File(context.getCacheDir(), "awena_voice_pcm_v2");
    }

    private File cacheFile(String key) {
        return new File(cacheDir(), key + ".pcmcache");
    }

    private void trimDiskCache() {
        File dir = cacheDir();
        if (!dir.exists()) return;
        File[] files = dir.listFiles((d, name) -> name.endsWith(".pcmcache"));
        if (files == null || files.length <= MAX_DISK_CACHE_FILES) return;
        java.util.Arrays.sort(files, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (int i = 0; i < files.length - MAX_DISK_CACHE_FILES; i++) {
            //noinspection ResultOfMethodCallIgnored
            files[i].delete();
        }
    }

    private static String cacheKey(String text, float speed) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String payload = CACHE_VERSION + "|siwis-medium|" + String.format(Locale.US, "%.3f", speed) + "|" + text;
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < 12; i++) out.append(String.format(Locale.US, "%02x", hash[i]));
            return out.toString();
        } catch (Exception error) {
            return Integer.toHexString(text.hashCode()) + "_" + Math.round(speed * 1000f);
        }
    }

    private static String normalizeText(String text) {
        String clean = text == null ? "" : text
            .replace('→', ',')
            .replace('•', ',')
            .replaceAll("\\s+", " ")
            .trim();
        // TTS is more predictable with spoken French forms for common darts notation.
        clean = clean.replaceAll("(?i)\\bT([0-9]{1,2})\\b", "triple $1")
            .replaceAll("(?i)\\bD([0-9]{1,2})\\b", "double $1")
            .replaceAll("(?i)\\bS([0-9]{1,2})\\b", "$1")
            .replaceAll("(?i)\\bDBULL\\b", "double bull")
            .replaceAll("(?i)\\bBULL\\b", "bull");
        return clean;
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    @Override
    public void close() {
        requestStop();
        synchronized (engineLock) {
            OfflineTts engine = tts;
            tts = null;
            ready = false;
            if (engine != null) {
                try { engine.release(); } catch (Exception ignored) {}
            }
        }
        memoryCache.clear();
    }

    private static final class CachedAudio {
        final int sampleRate;
        final short[] pcm;
        CachedAudio(int sampleRate, short[] pcm) {
            this.sampleRate = sampleRate;
            this.pcm = pcm;
        }
    }
}
