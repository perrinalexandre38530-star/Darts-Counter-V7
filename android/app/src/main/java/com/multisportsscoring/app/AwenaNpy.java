package com.multisportsscoring.app;

import java.io.File;
import java.io.FileInputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

/** Tiny .npy float32 reader for bos_before_voice.npy. */
public final class AwenaNpy {
    private AwenaNpy() {}

    public static float[] readFloat32(File file) throws Exception {
        byte[] data;
        try (FileInputStream input = new FileInputStream(file)) {
            data = new byte[(int) file.length()];
            int offset = 0;
            while (offset < data.length) {
                int read = input.read(data, offset, data.length - offset);
                if (read < 0) break;
                offset += read;
            }
        }
        if (data.length < 16 || (data[0] & 0xff) != 0x93 ||
            data[1] != 'N' || data[2] != 'U' || data[3] != 'M' ||
            data[4] != 'P' || data[5] != 'Y') {
            throw new IllegalArgumentException("Fichier NPY invalide.");
        }

        int major = data[6] & 0xff;
        int headerLen;
        int headerStart;
        if (major <= 1) {
            headerLen = (data[8] & 0xff) | ((data[9] & 0xff) << 8);
            headerStart = 10;
        } else {
            headerLen = (data[8] & 0xff) |
                ((data[9] & 0xff) << 8) |
                ((data[10] & 0xff) << 16) |
                ((data[11] & 0xff) << 24);
            headerStart = 12;
        }
        if (headerStart + headerLen > data.length) {
            throw new IllegalArgumentException("Entête NPY tronqué.");
        }
        String header = new String(data, headerStart, headerLen, StandardCharsets.US_ASCII);
        if (!(header.contains("<f4") || header.contains("'f4") || header.contains("\"f4"))) {
            throw new IllegalArgumentException("bos_before_voice doit être float32 little-endian.");
        }
        int payload = headerStart + headerLen;
        int count = (data.length - payload) / 4;
        float[] result = new float[count];
        ByteBuffer buffer = ByteBuffer.wrap(data, payload, count * 4).order(ByteOrder.LITTLE_ENDIAN);
        for (int i = 0; i < count; i++) result[i] = buffer.getFloat();
        return result;
    }
}
