package com.multisportsscoring.app;

import java.io.File;
import java.io.FileInputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/** PCM WAV loader + lightweight linear resampler used for the Estelle reference voice. */
public final class AwenaWav {
    private AwenaWav() {}

    public static float[] loadMono24k(File file) throws Exception {
        byte[] bytes;
        try (FileInputStream input = new FileInputStream(file)) {
            bytes = new byte[(int) file.length()];
            int offset = 0;
            while (offset < bytes.length) {
                int read = input.read(bytes, offset, bytes.length - offset);
                if (read < 0) break;
                offset += read;
            }
        }
        if (bytes.length < 44 ||
            bytes[0] != 'R' || bytes[1] != 'I' || bytes[2] != 'F' || bytes[3] != 'F' ||
            bytes[8] != 'W' || bytes[9] != 'A' || bytes[10] != 'V' || bytes[11] != 'E') {
            throw new IllegalArgumentException("Estelle WAV invalide.");
        }

        int channels = 1;
        int sampleRate = 24000;
        int bits = 16;
        int format = 1;
        int dataOffset = -1;
        int dataSize = 0;
        int pos = 12;

        while (pos + 8 <= bytes.length) {
            String id = new String(bytes, pos, 4, java.nio.charset.StandardCharsets.US_ASCII);
            int size = leInt(bytes, pos + 4);
            int body = pos + 8;
            if ("fmt ".equals(id) && body + Math.min(size, 16) <= bytes.length) {
                format = leShort(bytes, body);
                channels = leShort(bytes, body + 2);
                sampleRate = leInt(bytes, body + 4);
                bits = leShort(bytes, body + 14);
            } else if ("data".equals(id)) {
                dataOffset = body;
                dataSize = Math.min(size, bytes.length - body);
                break;
            }
            pos = body + size + (size & 1);
        }
        if (dataOffset < 0) throw new IllegalArgumentException("Bloc data WAV introuvable.");

        int bytesPerSample = Math.max(1, bits / 8);
        int frames = dataSize / Math.max(1, bytesPerSample * channels);
        float[] mono = new float[frames];
        ByteBuffer buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        for (int frame = 0; frame < frames; frame++) {
            float sum = 0f;
            for (int ch = 0; ch < channels; ch++) {
                int off = dataOffset + (frame * channels + ch) * bytesPerSample;
                float value;
                if (format == 3 && bits == 32) {
                    value = buffer.getFloat(off);
                } else if (bits == 16) {
                    value = buffer.getShort(off) / 32768f;
                } else if (bits == 24) {
                    int v = (bytes[off] & 0xff) | ((bytes[off + 1] & 0xff) << 8) | (bytes[off + 2] << 16);
                    value = v / 8388608f;
                } else if (bits == 32) {
                    value = buffer.getInt(off) / 2147483648f;
                } else {
                    throw new IllegalArgumentException("Format WAV Estelle non supporté : " + bits + " bits.");
                }
                sum += value;
            }
            mono[frame] = sum / Math.max(1, channels);
        }

        if (sampleRate == 24000) return mono;
        int outLength = Math.max(1, (int) Math.round(mono.length * (24000.0 / sampleRate)));
        float[] out = new float[outLength];
        double ratio = sampleRate / 24000.0;
        for (int i = 0; i < outLength; i++) {
            double source = i * ratio;
            int a = Math.min(mono.length - 1, (int) Math.floor(source));
            int b = Math.min(mono.length - 1, a + 1);
            float t = (float) (source - a);
            out[i] = mono[a] * (1f - t) + mono[b] * t;
        }
        return out;
    }

    private static int leInt(byte[] b, int o) {
        return (b[o] & 0xff) | ((b[o + 1] & 0xff) << 8) |
            ((b[o + 2] & 0xff) << 16) | ((b[o + 3] & 0xff) << 24);
    }

    private static int leShort(byte[] b, int o) {
        return (b[o] & 0xff) | ((b[o + 1] & 0xff) << 8);
    }
}
