package com.multisportsscoring.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Process;
import android.util.Log;

import ai.onnxruntime.NodeInfo;
import ai.onnxruntime.OnnxJavaType;
import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OnnxValue;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtException;
import ai.onnxruntime.OrtSession;
import ai.onnxruntime.TensorInfo;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.LongBuffer;
import java.nio.ShortBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.security.MessageDigest;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Local PocketTTS/ONNX runtime dedicated to Awena's French "Estelle" voice.
 *
 * This follows the public PocketTTS ONNX inference protocol:
 * voice encoder -> BOS+voice conditioning -> text conditioning -> autoregressive
 * flow matching -> Mimi decoder. No network request is made during synthesis.
 */
public final class AwenaPocketTtsEngine implements AutoCloseable {
    private static final String TAG = "AwenaPocketTTS";
    private static final int SAMPLE_RATE = 24_000;
    private static final int LATENT_DIM = 32;
    private static final int CONDITIONING_DIM = 1024;
    private static final float FRAME_RATE = 12.5f;
    private static final float TEMPERATURE = 0.70f;
    private static final float EOS_THRESHOLD = -4.0f;
    private static final int MAX_TOKEN_CHUNK = 48;
    private static final int DEFAULT_PREBUFFER_MS = 440;
    private static final int MAX_MEMORY_CACHE_ENTRIES = 24;
    private static final long MAX_DISK_CACHE_BYTES = 24L * 1024L * 1024L;
    private static final int MAX_CACHE_AUDIO_SECONDS = 15;

    private final Context context;
    private final Random random = new Random();

    // Adaptive playback learns the real generation speed of the current device.
    private volatile double generationRtf = 0.82; // generation time / audio duration
    private volatile boolean generationRtfCalibrated = false;
    private volatile int adaptiveSafetyMs = 40;

    // Short recurrent phrases (scores, "à toi", confirmations...) become instant after first use.
    private final LinkedHashMap<String, short[]> memoryPcmCache =
        new LinkedHashMap<String, short[]>(MAX_MEMORY_CACHE_ENTRIES + 1, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, short[]> eldest) {
                return size() > MAX_MEMORY_CACHE_ENTRIES;
            }
        };

    private OrtEnvironment env;
    private OrtSession mimiEncoder;
    private OrtSession textConditioner;
    private OrtSession flowMain;
    private OrtSession flowFlow;
    private OrtSession mimiDecoder;
    private AwenaPocketTokenizer tokenizer;

    private Map<String, TensorData> baseVoiceState;
    private float[] bosBeforeVoice;
    private volatile boolean ready = false;
    private volatile boolean stopRequested = false;
    private volatile AudioTrack audioTrack;
    private volatile AdaptivePlaybackSink playbackSink;

    public AwenaPocketTtsEngine(Context context) {
        this.context = context.getApplicationContext();
    }

    public boolean isReady() {
        return ready;
    }

    public synchronized void initialize() throws Exception {
        if (ready) return;
        if (!AwenaNeuralModelManager.isInstalled(context)) {
            throw new IllegalStateException("Le pack neural Estelle n'est pas installé.");
        }

        File dir = AwenaNeuralModelManager.packDir(context);
        env = OrtEnvironment.getEnvironment();

        OrtSession.SessionOptions options = new OrtSession.SessionOptions();
        options.setIntraOpNumThreads(Math.max(2, Math.min(4, Runtime.getRuntime().availableProcessors() - 1)));
        options.setInterOpNumThreads(1);
        options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);

        mimiEncoder = env.createSession(new File(dir, "mimi_encoder.onnx").getAbsolutePath(), options);
        textConditioner = env.createSession(new File(dir, "text_conditioner.onnx").getAbsolutePath(), options);
        flowMain = env.createSession(new File(dir, "flow_lm_main_int8.onnx").getAbsolutePath(), options);
        flowFlow = env.createSession(new File(dir, "flow_lm_flow_int8.onnx").getAbsolutePath(), options);
        mimiDecoder = env.createSession(new File(dir, "mimi_decoder_int8.onnx").getAbsolutePath(), options);

        tokenizer = new AwenaPocketTokenizer();
        tokenizer.load(new File(dir, "tokenizer.model"));

        bosBeforeVoice = AwenaNpy.readFloat32(new File(dir, "bos_before_voice.npy"));
        if (bosBeforeVoice.length != CONDITIONING_DIM) {
            throw new IllegalStateException("BOS PocketTTS inattendu : " + bosBeforeVoice.length);
        }

        float[] voiceAudio = AwenaWav.loadMono24k(new File(dir, "estelle.wav"));
        TensorData voiceEmbedding = encodeVoice(voiceAudio);
        TensorData preparedVoice = prependBos(voiceEmbedding);
        baseVoiceState = conditionVoice(preparedVoice);

        pruneDiskCache();
        ready = true;
        Log.i(TAG, "Awena Estelle neural engine ready. Adaptive streaming prewarmed.");
    }

    private TensorData encodeVoice(float[] audio) throws Exception {
        Map<String, OnnxTensor> inputs = new LinkedHashMap<>();
        inputs.put("audio", OnnxTensor.createTensor(env, FloatBuffer.wrap(audio),
            new long[]{1, 1, audio.length}));
        try (OrtSession.Result result = mimiEncoder.run(inputs)) {
            OnnxTensor output = asTensor(result.get(0));
            return TensorData.fromTensor(output);
        } finally {
            closeInputs(inputs);
        }
    }

    private TensorData prependBos(TensorData embedding) {
        if (embedding.type != OnnxJavaType.FLOAT) {
            throw new IllegalStateException("Embedding vocal Estelle non float32.");
        }
        long[] shape = embedding.shape;
        int frames = shape.length >= 2 ? (int) shape[shape.length - 2] : embedding.floats.length / CONDITIONING_DIM;
        float[] out = new float[(frames + 1) * CONDITIONING_DIM];
        System.arraycopy(bosBeforeVoice, 0, out, 0, CONDITIONING_DIM);
        System.arraycopy(embedding.floats, 0, out, CONDITIONING_DIM,
            Math.min(embedding.floats.length, frames * CONDITIONING_DIM));
        return TensorData.floats(out, new long[]{1, frames + 1L, CONDITIONING_DIM});
    }

    private Map<String, TensorData> conditionVoice(TensorData voiceEmbeddings) throws Exception {
        Map<String, TensorData> state = initState(flowMain, true, "sequence", "text_embeddings");
        Map<String, OnnxTensor> inputs = tensorsForState(state);
        inputs.put("sequence", OnnxTensor.createTensor(env, FloatBuffer.wrap(new float[0]),
            new long[]{1, 0, LATENT_DIM}));
        inputs.put("text_embeddings", voiceEmbeddings.toTensor(env));

        try (OrtSession.Result result = flowMain.run(inputs)) {
            updateStateFromResult(state, result);
        } finally {
            closeInputs(inputs);
        }
        return state;
    }

    public synchronized void requestStop() {
        stopRequested = true;
        AdaptivePlaybackSink sink = playbackSink;
        if (sink != null) sink.cancel();

        AudioTrack track = audioTrack;
        if (track != null) {
            try { track.pause(); } catch (Exception ignored) {}
            try { track.flush(); } catch (Exception ignored) {}
            try { track.stop(); } catch (Exception ignored) {}
        }
    }

    /**
     * Adaptive low-latency neural playback.
     *
     * We generate slightly ahead of playback, then keep ONNX and AudioTrack running on separate
     * threads. This avoids the V4 underruns without waiting for the whole sentence as V5 did.
     * The prebuffer adapts to the device's measured real-time factor (RTF).
     */
    public void speak(String text, float volume) throws Exception {
        initialize();
        stopRequested = false;

        try { Process.setThreadPriority(Process.THREAD_PRIORITY_DEFAULT); } catch (Exception ignored) {}

        String cleanText = text == null ? "" : text.trim();
        if (cleanText.isEmpty()) return;

        // Fast path: recurrent short phrases are replayed immediately from local PCM cache.
        String cacheKey = shouldCache(cleanText) ? cacheKey(cleanText) : null;
        if (cacheKey != null) {
            short[] cached = loadCachedPcm(cacheKey);
            if (cached != null && cached.length > 0) {
                Log.d(TAG, "PCM cache hit for Awena phrase (" + cached.length + " samples).");
                try { Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO); } catch (Exception ignored) {}
                try {
                    playContinuousPcm16(cached, volume);
                } finally {
                    try { Process.setThreadPriority(Process.THREAD_PRIORITY_DEFAULT); } catch (Exception ignored) {}
                }
                return;
            }
        }

        List<String> chunks = splitText(cleanText);
        if (chunks.isEmpty()) return;

        int prebufferMs = targetPrebufferMs();
        AdaptivePlaybackSink sink = new AdaptivePlaybackSink(volume, prebufferMs);
        playbackSink = sink;
        PcmAccumulator cacheAccumulator = cacheKey == null ? null : new PcmAccumulator();

        long generationStartMs = android.os.SystemClock.elapsedRealtime();
        int generatedSpeechSamples = 0;

        sink.start();
        try {
            for (int i = 0; i < chunks.size() && !stopRequested; i++) {
                if (i > 0) {
                    short[] pause = new short[Math.round(SAMPLE_RATE * 0.035f)];
                    sink.submit(pause);
                    if (cacheAccumulator != null) cacheAccumulator.add(pause);
                }

                long chunkStartMs = android.os.SystemClock.elapsedRealtime();
                int chunkSamples = synthesizeChunkStreaming(
                    chunks.get(i),
                    sink,
                    cacheAccumulator
                );
                generatedSpeechSamples += chunkSamples;

                long chunkElapsedMs = android.os.SystemClock.elapsedRealtime() - chunkStartMs;
                updateGenerationRtf(chunkElapsedMs, chunkSamples);
            }

            if (stopRequested) {
                sink.cancel();
                return;
            }

            long totalGenMs = android.os.SystemClock.elapsedRealtime() - generationStartMs;
            updateGenerationRtf(totalGenMs, generatedSpeechSamples);

            sink.finish();
            adaptSafetyFromPlayback(sink.hadUnderrun());

            if (!stopRequested && cacheKey != null && cacheAccumulator != null) {
                short[] pcm = cacheAccumulator.toArray();
                if (pcm.length > 0 && pcm.length <= SAMPLE_RATE * MAX_CACHE_AUDIO_SECONDS) {
                    saveCachedPcm(cacheKey, pcm);
                }
            }
        } catch (Exception error) {
            sink.cancel();
            throw error;
        } finally {
            playbackSink = null;
        }
    }

    /**
     * Generates one prompt and streams decoded PCM blocks into the adaptive playback queue.
     */
    private int synthesizeChunkStreaming(
        String text,
        AdaptivePlaybackSink sink,
        PcmAccumulator cacheAccumulator
    ) throws Exception {
        long[] tokenIds = tokenizer.encode(text);
        if (tokenIds.length == 0) return 0;

        Map<String, TensorData> state = deepCopyState(baseVoiceState);

        TensorData textEmbeddings;
        Map<String, OnnxTensor> tcInputs = new LinkedHashMap<>();
        tcInputs.put("token_ids", OnnxTensor.createTensor(env, LongBuffer.wrap(tokenIds),
            new long[]{1, tokenIds.length}));
        try (OrtSession.Result result = textConditioner.run(tcInputs)) {
            textEmbeddings = TensorData.fromTensor(asTensor(result.get(0)));
        } finally {
            closeInputs(tcInputs);
        }

        Map<String, OnnxTensor> promptInputs = tensorsForState(state);
        promptInputs.put("sequence", OnnxTensor.createTensor(env, FloatBuffer.wrap(new float[0]),
            new long[]{1, 0, LATENT_DIM}));
        promptInputs.put("text_embeddings", textEmbeddings.toTensor(env));
        try (OrtSession.Result result = flowMain.run(promptInputs)) {
            updateStateFromResult(state, result);
        } finally {
            closeInputs(promptInputs);
        }

        Map<String, TensorData> decoderState = initState(mimiDecoder, false, "latent");
        List<float[]> latentBuffer = new ArrayList<>();

        float[] curr = new float[LATENT_DIM];
        Arrays.fill(curr, Float.NaN);
        int eosStep = -1;
        int wordCount = Math.max(1, text.trim().split("\\s+").length);
        int framesAfterEos = wordCount <= 4 ? 5 : 3;
        int frameLimit = Math.min(700, Math.max(40,
            (int) Math.ceil((tokenIds.length / 3.0 + 2.0) * FRAME_RATE)));

        boolean firstAudioPacket = true;
        int emittedSamples = 0;
        int decodeThreshold = initialDecodeFrames();

        for (int step = 0; step < frameLimit && !stopRequested; step++) {
            TensorData conditioning;
            float eos;

            Map<String, OnnxTensor> inputs = tensorsForState(state);
            inputs.put("sequence", OnnxTensor.createTensor(env, FloatBuffer.wrap(curr),
                new long[]{1, 1, LATENT_DIM}));
            inputs.put("text_embeddings", OnnxTensor.createTensor(env, FloatBuffer.wrap(new float[0]),
                new long[]{1, 0, CONDITIONING_DIM}));
            try (OrtSession.Result result = flowMain.run(inputs)) {
                conditioning = TensorData.fromTensor(asTensor(result.get(0)));
                eos = firstFloat(asTensor(result.get(1)));
                updateStateFromResult(state, result);
            } finally {
                closeInputs(inputs);
            }

            if (eos > EOS_THRESHOLD && eosStep < 0) eosStep = step;
            if (eosStep >= 0 && step >= eosStep + framesAfterEos) break;

            float[] x = new float[LATENT_DIM];
            double std = Math.sqrt(TEMPERATURE);
            for (int i = 0; i < x.length; i++) x[i] = (float) (random.nextGaussian() * std);

            Map<String, OnnxTensor> flowInputs = new LinkedHashMap<>();
            flowInputs.put("c", conditioning.toTensor(env));
            flowInputs.put("s", OnnxTensor.createTensor(env, FloatBuffer.wrap(new float[]{0f}), new long[]{1, 1}));
            flowInputs.put("t", OnnxTensor.createTensor(env, FloatBuffer.wrap(new float[]{1f}), new long[]{1, 1}));
            flowInputs.put("x", OnnxTensor.createTensor(env, FloatBuffer.wrap(x), new long[]{1, LATENT_DIM}));
            try (OrtSession.Result flowResult = flowFlow.run(flowInputs)) {
                float[] derivative = floats(asTensor(flowResult.get(0)));
                for (int i = 0; i < LATENT_DIM && i < derivative.length; i++) x[i] += derivative[i];
            } finally {
                closeInputs(flowInputs);
            }

            curr = x;
            latentBuffer.add(Arrays.copyOf(x, x.length));

            if (latentBuffer.size() >= decodeThreshold) {
                float[] audio = decodeLatents(latentBuffer, decoderState);
                latentBuffer.clear();

                short[] pcm = toStreamingPcm16(audio, firstAudioPacket);
                firstAudioPacket = false;
                if (pcm.length > 0) {
                    sink.submit(pcm);
                    if (cacheAccumulator != null) cacheAccumulator.add(pcm);
                    emittedSamples += pcm.length;
                }

                decodeThreshold = steadyDecodeFrames();
            }
        }

        if (stopRequested) return emittedSamples;

        if (!latentBuffer.isEmpty()) {
            float[] audio = decodeLatents(latentBuffer, decoderState);
            short[] pcm = toStreamingPcm16(audio, firstAudioPacket);
            if (pcm.length > 0) {
                sink.submit(pcm);
                if (cacheAccumulator != null) cacheAccumulator.add(pcm);
                emittedSamples += pcm.length;
            }
        }

        return emittedSamples;
    }

    /**
     * First packet is deliberately small to get Awena talking quickly; later packets are larger
     * to reduce decoder overhead.
     */
    private int initialDecodeFrames() {
        // One first decoder batch should be large enough to satisfy the current prebuffer target.
        // This avoids waiting for a second neural batch before Awena can start talking.
        int frames = (int) Math.ceil(targetPrebufferMs() / 80.0); // PocketTTS: ~80 ms/frame
        return Math.max(4, Math.min(14, frames));
    }

    private int steadyDecodeFrames() {
        if (!generationRtfCalibrated) return 7;        // ~560 ms
        if (generationRtf <= 0.65) return 5;
        if (generationRtf <= 0.90) return 6;
        if (generationRtf <= 1.05) return 8;
        return 10;
    }

    private int targetPrebufferMs() {
        int base;
        if (!generationRtfCalibrated) {
            base = DEFAULT_PREBUFFER_MS;
        } else if (generationRtf <= 0.55) {
            base = 280;
        } else if (generationRtf <= 0.75) {
            base = 360;
        } else if (generationRtf <= 0.90) {
            base = 440;
        } else if (generationRtf <= 1.00) {
            base = 600;
        } else if (generationRtf <= 1.10) {
            base = 760;
        } else {
            // If a device is genuinely slower than realtime, some safety buffer is unavoidable.
            base = 980;
        }
        return Math.max(280, Math.min(1180, base + adaptiveSafetyMs));
    }

    private synchronized void updateGenerationRtf(long elapsedMs, int generatedSamples) {
        if (elapsedMs <= 0 || generatedSamples < SAMPLE_RATE / 5) return;
        double audioMs = generatedSamples * 1000.0 / SAMPLE_RATE;
        double observed = elapsedMs / audioMs;
        if (!Double.isFinite(observed) || observed <= 0.05 || observed > 5.0) return;

        if (!generationRtfCalibrated) {
            generationRtf = observed;
            generationRtfCalibrated = true;
        } else {
            // Smooth enough to avoid one unusually hard sentence changing behaviour abruptly.
            generationRtf = generationRtf * 0.72 + observed * 0.28;
        }
        Log.d(TAG, String.format(
            java.util.Locale.US,
            "Adaptive RTF=%.2f, next prebuffer=%dms",
            generationRtf,
            targetPrebufferMs()
        ));
    }

    private synchronized void adaptSafetyFromPlayback(boolean hadUnderrun) {
        if (hadUnderrun) {
            adaptiveSafetyMs = Math.min(420, adaptiveSafetyMs + 140);
            Log.w(TAG, "Audio underrun detected; increasing Awena prebuffer safety to " + adaptiveSafetyMs + "ms.");
        } else if (adaptiveSafetyMs > 40) {
            adaptiveSafetyMs = Math.max(40, adaptiveSafetyMs - 25);
        }
    }

    private float[] decodeLatents(List<float[]> latents, Map<String, TensorData> state) throws Exception {
        int frames = latents.size();
        float[] flat = new float[frames * LATENT_DIM];
        for (int f = 0; f < frames; f++) {
            System.arraycopy(latents.get(f), 0, flat, f * LATENT_DIM, LATENT_DIM);
        }

        Map<String, OnnxTensor> inputs = tensorsForState(state);
        inputs.put("latent", OnnxTensor.createTensor(env, FloatBuffer.wrap(flat),
            new long[]{1, frames, LATENT_DIM}));
        try (OrtSession.Result result = mimiDecoder.run(inputs)) {
            float[] audio = floats(asTensor(result.get(0)));
            updateStateFromResult(state, result);
            return audio;
        } finally {
            closeInputs(inputs);
        }
    }

    /**
     * Stable PCM16 conversion for streamed blocks. Uses a fixed gain to avoid packet-to-packet
     * pumping; only the first packet gets a tiny fade-in.
     */
    private static short[] toStreamingPcm16(float[] audio, boolean fadeIn) {
        if (audio == null || audio.length == 0) return new short[0];
        short[] out = new short[audio.length];
        int fadeSamples = fadeIn ? Math.min(audio.length, SAMPLE_RATE / 200) : 0; // ~5 ms

        for (int i = 0; i < audio.length; i++) {
            float sample = audio[i];
            if (!Float.isFinite(sample)) sample = 0f;
            sample *= 0.94f;
            sample = Math.max(-1f, Math.min(1f, sample));
            if (fadeSamples > 0 && i < fadeSamples) {
                sample *= i / (float) fadeSamples;
            }
            out[i] = (short) Math.round(sample * 32767f);
        }
        return out;
    }

    private static float[] concatAudio(List<float[]> parts, int totalSamples) {
        if (parts == null || parts.isEmpty() || totalSamples <= 0) return new float[0];
        float[] out = new float[totalSamples];
        int offset = 0;
        for (float[] part : parts) {
            if (part == null || part.length == 0) continue;
            int length = Math.min(part.length, out.length - offset);
            if (length <= 0) break;
            System.arraycopy(part, 0, out, offset, length);
            offset += length;
        }
        return offset == out.length ? out : Arrays.copyOf(out, offset);
    }

    /**
     * Removes edge clicks when PocketTTS starts/ends a prompt.
     */
    private static void deClick(float[] audio) {
        if (audio == null || audio.length < 4) return;
        int fade = Math.min(audio.length / 4, Math.max(24, SAMPLE_RATE / 200)); // ~5 ms
        for (int i = 0; i < fade; i++) {
            float gain = i / (float) fade;
            audio[i] *= gain;
            audio[audio.length - 1 - i] *= gain;
        }
    }

    /**
     * Converts the neural float output to broadly compatible PCM16 and applies one utterance-wide
     * limiter. PCM16 is substantially more reliable across Android audio HALs than streamed floats.
     */
    private static short[] toPcm16(float[] audio) {
        if (audio == null || audio.length == 0) return new short[0];

        float peak = 0f;
        for (float sample : audio) {
            if (!Float.isFinite(sample)) continue;
            peak = Math.max(peak, Math.abs(sample));
        }
        float scale = peak > 0.96f ? (0.92f / peak) : 0.96f;

        short[] out = new short[audio.length];
        for (int i = 0; i < audio.length; i++) {
            float sample = audio[i];
            if (!Float.isFinite(sample)) sample = 0f;
            sample = Math.max(-1f, Math.min(1f, sample * scale));
            out[i] = (short) Math.round(sample * 32767f);
        }
        return out;
    }

    /**
     * Plays a fully rendered utterance. Since all PCM is already in RAM, AudioTrack can never be
     * starved by ONNX inference. We also wait for the playback head before releasing the track, so
     * the final syllable cannot be truncated.
     */
    private void playContinuousPcm16(short[] pcm, float volume) throws Exception {
        int minBuffer = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        );
        if (minBuffer <= 0) minBuffer = SAMPLE_RATE * 2;

        // About one second of audio, or 4x the platform minimum.
        int bufferSizeBytes = Math.max(minBuffer * 4, SAMPLE_RATE * 2);
        AudioTrack track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build())
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setBufferSizeInBytes(bufferSizeBytes)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build();

        if (track.getState() != AudioTrack.STATE_INITIALIZED) {
            try { track.release(); } catch (Exception ignored) {}
            throw new IllegalStateException("AudioTrack Awena non initialisé.");
        }

        track.setVolume(Math.max(0f, Math.min(1f, volume)));
        audioTrack = track;

        int acceptedFrames = 0;
        try {
            track.play();

            // Feed reasonably sized blocks from a buffer that is already fully rendered.
            final int block = 4096;
            int offset = 0;
            while (offset < pcm.length && !stopRequested) {
                int count = Math.min(block, pcm.length - offset);
                int written = track.write(pcm, offset, count, AudioTrack.WRITE_BLOCKING);
                if (written < 0) {
                    throw new IllegalStateException("Erreur AudioTrack Awena : " + written);
                }
                if (written == 0) continue;
                offset += written;
                acceptedFrames += written;
            }

            if (!stopRequested) {
                waitUntilPlayed(track, acceptedFrames);
            }
        } finally {
            audioTrack = null;
            try { track.pause(); } catch (Exception ignored) {}
            try { track.flush(); } catch (Exception ignored) {}
            try { track.stop(); } catch (Exception ignored) {}
            try { track.release(); } catch (Exception ignored) {}
        }
    }

    private void waitUntilPlayed(AudioTrack track, int expectedFrames) {
        if (expectedFrames <= 0) return;
        long maxWaitMs = Math.max(1500L,
            Math.round(expectedFrames * 1000.0 / SAMPLE_RATE) + 2000L);
        long deadline = android.os.SystemClock.elapsedRealtime() + maxWaitMs;

        while (!stopRequested && android.os.SystemClock.elapsedRealtime() < deadline) {
            long played = track.getPlaybackHeadPosition() & 0xffffffffL;
            if (played >= expectedFrames - 16L) break;
            android.os.SystemClock.sleep(8L);
        }
    }

    /**
     * Combines neighbouring sentences whenever possible, then splits only prompts that exceed the
     * safe PocketTTS token window. This reduces unnecessary voice-state resets.
     */
    private List<String> splitText(String raw) {
        String text = raw == null ? "" : raw.trim().replace(';', ',');
        if (text.isEmpty()) return new ArrayList<>();

        String[] sentences = text.split("(?<=[.!?])\\s+");
        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();

        for (String sentence : sentences) {
            String cleanSentence = sentence.trim();
            if (cleanSentence.isEmpty()) continue;

            String combined = current.length() == 0
                ? cleanSentence
                : current.toString() + " " + cleanSentence;

            if (tokenizer.encode(combined).length <= MAX_TOKEN_CHUNK) {
                current.setLength(0);
                current.append(combined);
                continue;
            }

            if (current.length() > 0) {
                out.add(current.toString());
                current.setLength(0);
            }

            if (tokenizer.encode(cleanSentence).length <= MAX_TOKEN_CHUNK) {
                current.append(cleanSentence);
                continue;
            }

            // Long sentence: split by words without cutting a word.
            String[] words = cleanSentence.split("\\s+");
            StringBuilder builder = new StringBuilder();
            for (String word : words) {
                String candidate = builder.length() == 0 ? word : builder + " " + word;
                if (builder.length() > 0 && tokenizer.encode(candidate).length > MAX_TOKEN_CHUNK) {
                    out.add(builder.toString());
                    builder.setLength(0);
                    builder.append(word);
                } else {
                    if (builder.length() > 0) builder.append(' ');
                    builder.append(word);
                }
            }
            if (builder.length() > 0) current.append(builder);
        }

        if (current.length() > 0) out.add(current.toString());
        return out;
    }

    private Map<String, TensorData> initState(
        OrtSession session,
        boolean flowState,
        String... excluded
    ) throws OrtException {
        List<String> skip = Arrays.asList(excluded);
        Map<String, TensorData> state = new LinkedHashMap<>();
        for (String name : session.getInputNames()) {
            if (skip.contains(name)) continue;
            NodeInfo node = session.getInputInfo().get(name);
            if (node == null || !(node.getInfo() instanceof TensorInfo)) continue;
            TensorInfo info = (TensorInfo) node.getInfo();
            state.put(name, TensorData.initial(info, flowState));
        }
        return state;
    }

    private Map<String, OnnxTensor> tensorsForState(Map<String, TensorData> state) throws OrtException {
        Map<String, OnnxTensor> result = new LinkedHashMap<>();
        for (Map.Entry<String, TensorData> entry : state.entrySet()) {
            result.put(entry.getKey(), entry.getValue().toTensor(env));
        }
        return result;
    }

    private void updateStateFromResult(Map<String, TensorData> state, OrtSession.Result result) throws OrtException {
        for (String inputName : new ArrayList<>(state.keySet())) {
            String suffix = inputName.startsWith("state_") ? inputName.substring("state_".length()) : inputName;
            String outputName = "out_state_" + suffix;
            Optional<OnnxValue> maybe = result.get(outputName);
            if (maybe.isPresent() && maybe.get() instanceof OnnxTensor) {
                state.put(inputName, TensorData.fromTensor((OnnxTensor) maybe.get()));
            }
        }
    }

    private static Map<String, TensorData> deepCopyState(Map<String, TensorData> input) {
        Map<String, TensorData> copy = new LinkedHashMap<>();
        for (Map.Entry<String, TensorData> entry : input.entrySet()) {
            copy.put(entry.getKey(), entry.getValue().copy());
        }
        return copy;
    }

    private static OnnxTensor asTensor(OnnxValue value) {
        if (!(value instanceof OnnxTensor)) {
            throw new IllegalStateException("Sortie ONNX non tensor.");
        }
        return (OnnxTensor) value;
    }

    private static float firstFloat(OnnxTensor tensor) {
        FloatBuffer buffer = tensor.getFloatBuffer();
        return buffer == null || !buffer.hasRemaining() ? Float.NEGATIVE_INFINITY : buffer.get();
    }

    private static float[] floats(OnnxTensor tensor) {
        FloatBuffer buffer = tensor.getFloatBuffer();
        if (buffer == null) throw new IllegalStateException("Tensor ONNX non convertible en float.");
        float[] out = new float[buffer.remaining()];
        buffer.get(out);
        return out;
    }

    private static void closeInputs(Map<String, OnnxTensor> inputs) {
        for (OnnxTensor tensor : inputs.values()) {
            try { tensor.close(); } catch (Exception ignored) {}
        }
        inputs.clear();
    }

    @Override
    public synchronized void close() {
        requestStop();
        ready = false;
        baseVoiceState = null;
        tokenizer = null;
        closeSession(mimiEncoder); mimiEncoder = null;
        closeSession(textConditioner); textConditioner = null;
        closeSession(flowMain); flowMain = null;
        closeSession(flowFlow); flowFlow = null;
        closeSession(mimiDecoder); mimiDecoder = null;
    }

    private static void closeSession(OrtSession session) {
        if (session != null) {
            try { session.close(); } catch (Exception ignored) {}
        }
    }

    private boolean shouldCache(String text) {
        return text != null && !text.isEmpty() && text.length() <= 220;
    }

    private File diskCacheDir() {
        return new File(context.getCacheDir(), "awena_estelle_pcm_v51");
    }

    private static String cacheKey(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder(hash.length * 2);
            for (byte b : hash) out.append(String.format(java.util.Locale.US, "%02x", b & 0xff));
            return out.toString();
        } catch (Exception error) {
            return Integer.toHexString(text.hashCode());
        }
    }

    private synchronized short[] loadCachedPcm(String key) {
        short[] memory = memoryPcmCache.get(key);
        if (memory != null) return Arrays.copyOf(memory, memory.length);

        File file = new File(diskCacheDir(), key + ".pcm");
        if (!file.isFile() || file.length() <= 0 || (file.length() & 1L) != 0L) return null;
        if (file.length() > SAMPLE_RATE * MAX_CACHE_AUDIO_SECONDS * 2L) return null;

        try (FileInputStream input = new FileInputStream(file)) {
            byte[] bytes = new byte[(int) file.length()];
            int offset = 0;
            while (offset < bytes.length) {
                int read = input.read(bytes, offset, bytes.length - offset);
                if (read < 0) break;
                offset += read;
            }
            if (offset != bytes.length) return null;

            ShortBuffer buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer();
            short[] pcm = new short[buffer.remaining()];
            buffer.get(pcm);
            memoryPcmCache.put(key, pcm);
            file.setLastModified(System.currentTimeMillis());
            return Arrays.copyOf(pcm, pcm.length);
        } catch (Exception error) {
            try { file.delete(); } catch (Exception ignored) {}
            return null;
        }
    }

    private synchronized void saveCachedPcm(String key, short[] pcm) {
        if (key == null || pcm == null || pcm.length == 0) return;
        memoryPcmCache.put(key, Arrays.copyOf(pcm, pcm.length));

        File dir = diskCacheDir();
        if (!dir.exists() && !dir.mkdirs()) return;
        File file = new File(dir, key + ".pcm");

        try (FileOutputStream output = new FileOutputStream(file)) {
            ByteBuffer bytes = ByteBuffer.allocate(pcm.length * 2).order(ByteOrder.LITTLE_ENDIAN);
            bytes.asShortBuffer().put(pcm);
            output.write(bytes.array());
            output.flush();
            file.setLastModified(System.currentTimeMillis());
        } catch (Exception error) {
            try { file.delete(); } catch (Exception ignored) {}
        }

        pruneDiskCache();
    }

    private synchronized void pruneDiskCache() {
        File dir = diskCacheDir();
        File[] files = dir.listFiles((d, name) -> name.endsWith(".pcm"));
        if (files == null || files.length == 0) return;

        long total = 0L;
        for (File file : files) total += Math.max(0L, file.length());
        if (total <= MAX_DISK_CACHE_BYTES) return;

        Arrays.sort(files, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (File file : files) {
            if (total <= MAX_DISK_CACHE_BYTES) break;
            long length = Math.max(0L, file.length());
            if (file.delete()) total -= length;
        }
    }

    private static final class PcmAccumulator {
        private final List<short[]> parts = new ArrayList<>();
        private int total = 0;

        void add(short[] pcm) {
            if (pcm == null || pcm.length == 0) return;
            parts.add(Arrays.copyOf(pcm, pcm.length));
            total += pcm.length;
        }

        short[] toArray() {
            if (total <= 0) return new short[0];
            short[] out = new short[total];
            int offset = 0;
            for (short[] part : parts) {
                System.arraycopy(part, 0, out, offset, part.length);
                offset += part.length;
            }
            return out;
        }
    }

    /**
     * Producer/consumer bridge: ONNX produces PCM packets while a dedicated AUDIO-priority thread
     * plays them. Playback starts only after a small adaptive prebuffer has accumulated.
     */
    private final class AdaptivePlaybackSink {
        private static final int POLL_MS = 50;
        private final short[] endMarker = new short[0];
        private final LinkedBlockingQueue<short[]> queue = new LinkedBlockingQueue<>();
        private final float volume;
        private final int targetPrebufferSamples;
        private volatile boolean cancelled = false;
        private volatile boolean finished = false;
        private volatile Throwable playbackFailure = null;
        private volatile boolean underrun = false;
        private Thread thread;

        AdaptivePlaybackSink(float volume, int prebufferMs) {
            this.volume = Math.max(0f, Math.min(1f, volume));
            this.targetPrebufferSamples = Math.max(
                SAMPLE_RATE / 5,
                Math.round(SAMPLE_RATE * prebufferMs / 1000f)
            );
        }

        void start() {
            thread = new Thread(this::runPlayback, "AwenaAudio");
            thread.start();
        }

        void submit(short[] pcm) throws InterruptedException {
            if (cancelled || stopRequested || pcm == null || pcm.length == 0) return;
            queue.put(pcm);
        }

        void finish() throws Exception {
            finished = true;
            queue.offer(endMarker);
            Thread t = thread;
            if (t != null) t.join();
            if (playbackFailure != null) {
                if (playbackFailure instanceof Exception) throw (Exception) playbackFailure;
                throw new IllegalStateException("Lecture Awena interrompue.", playbackFailure);
            }
        }

        void cancel() {
            cancelled = true;
            finished = true;
            queue.clear();
            queue.offer(endMarker);
            AudioTrack track = audioTrack;
            if (track != null) {
                try { track.pause(); } catch (Exception ignored) {}
                try { track.flush(); } catch (Exception ignored) {}
                try { track.stop(); } catch (Exception ignored) {}
            }
            Thread t = thread;
            if (t != null) t.interrupt();
        }

        boolean hadUnderrun() {
            return underrun;
        }

        private void runPlayback() {
            try {
                try { Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO); } catch (Exception ignored) {}

                List<short[]> preRoll = new ArrayList<>();
                int preRollSamples = 0;
                boolean sawEnd = false;

                while (!cancelled && !stopRequested && preRollSamples < targetPrebufferSamples) {
                    short[] packet = queue.poll(POLL_MS, java.util.concurrent.TimeUnit.MILLISECONDS);
                    if (packet == null) {
                        if (finished && queue.isEmpty()) break;
                        continue;
                    }
                    if (packet == endMarker) {
                        sawEnd = true;
                        break;
                    }
                    preRoll.add(packet);
                    preRollSamples += packet.length;
                }

                if (cancelled || stopRequested || preRollSamples <= 0) return;

                int minBuffer = AudioTrack.getMinBufferSize(
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                );
                if (minBuffer <= 0) minBuffer = SAMPLE_RATE * 2;

                int prebufferBytes = Math.max(8192, targetPrebufferSamples * 2);
                int bufferSizeBytes = Math.max(minBuffer * 3, prebufferBytes);

                AudioTrack track = new AudioTrack.Builder()
                    .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build())
                    .setAudioFormat(new AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build())
                    .setBufferSizeInBytes(bufferSizeBytes)
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .build();

                if (track.getState() != AudioTrack.STATE_INITIALIZED) {
                    try { track.release(); } catch (Exception ignored) {}
                    throw new IllegalStateException("AudioTrack Awena non initialisé.");
                }

                track.setVolume(volume);
                audioTrack = track;
                int acceptedFrames = 0;
                int underrunsAtStart = safeUnderrunCount(track);

                try {
                    track.play();
                    for (short[] packet : preRoll) {
                        acceptedFrames += writePacket(track, packet);
                    }

                    while (!cancelled && !stopRequested && !sawEnd) {
                        short[] packet = queue.poll(POLL_MS, java.util.concurrent.TimeUnit.MILLISECONDS);
                        if (packet == null) {
                            // Do not stop just because generation is temporarily busy; AudioTrack
                            // still owns the prebuffer. Only producer end or cancellation terminates.
                            if (finished && queue.isEmpty()) break;
                            continue;
                        }
                        if (packet == endMarker) {
                            sawEnd = true;
                            break;
                        }
                        acceptedFrames += writePacket(track, packet);
                    }

                    if (!cancelled && !stopRequested) {
                        waitUntilPlayed(track, acceptedFrames);
                        underrun = safeUnderrunCount(track) > underrunsAtStart;
                    }
                } finally {
                    audioTrack = null;
                    try { track.pause(); } catch (Exception ignored) {}
                    try { track.flush(); } catch (Exception ignored) {}
                    try { track.stop(); } catch (Exception ignored) {}
                    try { track.release(); } catch (Exception ignored) {}
                }
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            } catch (Throwable error) {
                playbackFailure = error;
            } finally {
                try { Process.setThreadPriority(Process.THREAD_PRIORITY_DEFAULT); } catch (Exception ignored) {}
            }
        }

        private int writePacket(AudioTrack track, short[] packet) {
            int offset = 0;
            int accepted = 0;
            while (offset < packet.length && !cancelled && !stopRequested) {
                int count = Math.min(4096, packet.length - offset);
                int written = track.write(packet, offset, count, AudioTrack.WRITE_BLOCKING);
                if (written < 0) throw new IllegalStateException("Erreur AudioTrack Awena : " + written);
                if (written == 0) continue;
                offset += written;
                accepted += written;
            }
            return accepted;
        }

        private int safeUnderrunCount(AudioTrack track) {
            try {
                return track.getUnderrunCount();
            } catch (Throwable ignored) {
                return 0;
            }
        }
    }

    private static final class TensorData {
        final OnnxJavaType type;
        final long[] shape;
        final float[] floats;
        final long[] longs;
        final byte[] bytes;
        final short[] shorts;

        private TensorData(OnnxJavaType type, long[] shape, float[] floats, long[] longs, byte[] bytes, short[] shorts) {
            this.type = type;
            this.shape = shape;
            this.floats = floats;
            this.longs = longs;
            this.bytes = bytes;
            this.shorts = shorts;
        }

        static TensorData floats(float[] values, long[] shape) {
            return new TensorData(OnnxJavaType.FLOAT, shape, values, null, null, null);
        }

        static TensorData initial(TensorInfo info, boolean flowState) {
            long[] shape = info.getShape();
            long elementsLong = 1L;
            for (long dim : shape) {
                if (dim <= 0) {
                    elementsLong = 0;
                    break;
                }
                elementsLong *= dim;
            }
            if (elementsLong > Integer.MAX_VALUE) {
                throw new IllegalStateException("État ONNX trop grand.");
            }
            int elements = (int) elementsLong;

            if (info.type == OnnxJavaType.FLOAT) {
                float[] values = new float[elements];
                if (flowState && shape.length >= 4) Arrays.fill(values, Float.NaN);
                return new TensorData(info.type, shape, values, null, null, null);
            }
            if (info.type == OnnxJavaType.INT64) {
                return new TensorData(info.type, shape, null, new long[elements], null, null);
            }
            if (info.type == OnnxJavaType.BOOL) {
                byte[] values = new byte[elements];
                Arrays.fill(values, (byte) 1);
                return new TensorData(info.type, shape, null, null, values, null);
            }
            if (info.type == OnnxJavaType.FLOAT16 || info.type == OnnxJavaType.BFLOAT16) {
                short[] values = new short[elements];
                if (flowState && shape.length >= 4) {
                    short nan = (short) 0x7e00;
                    Arrays.fill(values, nan);
                }
                return new TensorData(info.type, shape, null, null, null, values);
            }
            throw new IllegalStateException("Type d'état ONNX non supporté : " + info.type);
        }

        static TensorData fromTensor(OnnxTensor tensor) {
            TensorInfo info = tensor.getInfo();
            long[] shape = info.getShape();

            if (info.type == OnnxJavaType.FLOAT) {
                FloatBuffer b = tensor.getFloatBuffer();
                float[] values = new float[b == null ? 0 : b.remaining()];
                if (b != null) b.get(values);
                return new TensorData(info.type, shape, values, null, null, null);
            }
            if (info.type == OnnxJavaType.INT64) {
                LongBuffer b = tensor.getLongBuffer();
                long[] values = new long[b == null ? 0 : b.remaining()];
                if (b != null) b.get(values);
                return new TensorData(info.type, shape, null, values, null, null);
            }
            if (info.type == OnnxJavaType.BOOL) {
                ByteBuffer b = tensor.getByteBuffer();
                byte[] values = new byte[b == null ? 0 : b.remaining()];
                if (b != null) b.get(values);
                return new TensorData(info.type, shape, null, null, values, null);
            }
            if (info.type == OnnxJavaType.FLOAT16 || info.type == OnnxJavaType.BFLOAT16) {
                ShortBuffer b = tensor.getShortBuffer();
                short[] values = new short[b == null ? 0 : b.remaining()];
                if (b != null) b.get(values);
                return new TensorData(info.type, shape, null, null, null, values);
            }
            throw new IllegalStateException("Type ONNX non supporté : " + info.type);
        }

        TensorData copy() {
            return new TensorData(
                type,
                Arrays.copyOf(shape, shape.length),
                floats == null ? null : Arrays.copyOf(floats, floats.length),
                longs == null ? null : Arrays.copyOf(longs, longs.length),
                bytes == null ? null : Arrays.copyOf(bytes, bytes.length),
                shorts == null ? null : Arrays.copyOf(shorts, shorts.length)
            );
        }

        OnnxTensor toTensor(OrtEnvironment env) throws OrtException {
            if (type == OnnxJavaType.FLOAT) {
                return OnnxTensor.createTensor(env, FloatBuffer.wrap(floats == null ? new float[0] : floats), shape);
            }
            if (type == OnnxJavaType.INT64) {
                return OnnxTensor.createTensor(env, LongBuffer.wrap(longs == null ? new long[0] : longs), shape);
            }
            if (type == OnnxJavaType.BOOL) {
                return OnnxTensor.createTensor(env, ByteBuffer.wrap(bytes == null ? new byte[0] : bytes), shape, OnnxJavaType.BOOL);
            }
            if (type == OnnxJavaType.FLOAT16 || type == OnnxJavaType.BFLOAT16) {
                return OnnxTensor.createTensor(env, ShortBuffer.wrap(shorts == null ? new short[0] : shorts), shape, type);
            }
            throw new IllegalStateException("Type tensor non supporté : " + type);
        }
    }
}
