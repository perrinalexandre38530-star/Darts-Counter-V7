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

    private final Context context;
    private final Random random = new Random();

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

        ready = true;
        Log.i(TAG, "Awena Estelle neural engine ready.");
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
        AudioTrack track = audioTrack;
        if (track != null) {
            try { track.pause(); } catch (Exception ignored) {}
            try { track.flush(); } catch (Exception ignored) {}
            try { track.stop(); } catch (Exception ignored) {}
        }
    }

    public void speak(String text, float volume) throws Exception {
        initialize();
        stopRequested = false;
        Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO);

        List<String> chunks = splitText(text);
        if (chunks.isEmpty()) return;

        int minBuffer = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_FLOAT
        );
        int bufferSize = Math.max(minBuffer, SAMPLE_RATE / 2 * 4);
        AudioTrack track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build())
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build();
        track.setVolume(Math.max(0f, Math.min(1f, volume)));
        audioTrack = track;
        track.play();

        try {
            for (String chunk : chunks) {
                if (stopRequested) break;
                synthesizeChunk(chunk, track);
            }
        } finally {
            audioTrack = null;
            try { track.stop(); } catch (Exception ignored) {}
            try { track.release(); } catch (Exception ignored) {}
        }
    }

    private void synthesizeChunk(String text, AudioTrack track) throws Exception {
        long[] tokenIds = tokenizer.encode(text);
        if (tokenIds.length == 0) return;

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

        // Feed the whole text prompt to the Flow LM state before autoregressive generation.
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
        boolean firstDecode = true;
        float[] curr = new float[LATENT_DIM];
        Arrays.fill(curr, Float.NaN);
        int eosStep = -1;
        int wordCount = Math.max(1, text.trim().split("\\s+").length);
        int framesAfterEos = wordCount <= 4 ? 5 : 3;
        int frameLimit = Math.min(700, Math.max(40,
            (int) Math.ceil((tokenIds.length / 3.0 + 2.0) * FRAME_RATE)));

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

            // PocketTTS recommended LSD steps=1: s=0, t=1, dt=1.
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

            int threshold = firstDecode ? 2 : 8;
            if (latentBuffer.size() >= threshold) {
                float[] audio = decodeLatents(latentBuffer, decoderState);
                latentBuffer.clear();
                firstDecode = false;
                writeAudio(track, audio);
            }
        }

        if (!stopRequested && !latentBuffer.isEmpty()) {
            float[] audio = decodeLatents(latentBuffer, decoderState);
            writeAudio(track, audio);
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

    private static void writeAudio(AudioTrack track, float[] audio) {
        if (audio == null || audio.length == 0) return;
        int offset = 0;
        while (offset < audio.length) {
            int written = track.write(audio, offset, audio.length - offset, AudioTrack.WRITE_BLOCKING);
            if (written <= 0) break;
            offset += written;
        }
    }

    private List<String> splitText(String raw) {
        String text = raw == null ? "" : raw.trim().replace(';', ',');
        if (text.isEmpty()) return new ArrayList<>();
        String[] sentences = text.split("(?<=[.!?])\\s+");
        List<String> out = new ArrayList<>();

        for (String sentence : sentences) {
            String remaining = sentence.trim();
            if (remaining.isEmpty()) continue;
            long[] ids = tokenizer.encode(remaining);
            if (ids.length <= MAX_TOKEN_CHUNK) {
                out.add(remaining);
                continue;
            }

            String[] words = remaining.split("\\s+");
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
            if (builder.length() > 0) out.add(builder.toString());
        }
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
