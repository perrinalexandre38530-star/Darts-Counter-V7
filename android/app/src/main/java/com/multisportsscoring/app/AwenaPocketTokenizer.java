package com.multisportsscoring.app;

import java.io.File;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Minimal pure-Java SentencePiece Unigram tokenizer.
 *
 * PocketTTS' tokenizer.model is a ModelProto protobuf. Parsing it directly avoids
 * shipping a second native SentencePiece library into the Android app.
 */
public final class AwenaPocketTokenizer {
    private static final String WORD_BOUNDARY = "\u2581";

    private final Map<String, Piece> vocabulary = new HashMap<>();
    private final Map<Integer, Integer> byteFallback = new HashMap<>();
    private int unkTokenId = 0;
    private boolean loaded = false;

    public void load(File modelFile) throws Exception {
        byte[] data;
        try (java.io.FileInputStream input = new java.io.FileInputStream(modelFile)) {
            data = new byte[(int) modelFile.length()];
            int offset = 0;
            while (offset < data.length) {
                int read = input.read(data, offset, data.length - offset);
                if (read < 0) break;
                offset += read;
            }
        }
        parseModel(data);
        loaded = true;
        if (vocabulary.isEmpty()) {
            throw new IllegalStateException("Tokenizer PocketTTS vide.");
        }
    }

    private void parseModel(byte[] data) {
        int pos = 0;
        int tokenId = 0;
        while (pos < data.length) {
            Varint key = readVarint(data, pos);
            if (key.next <= pos) break;
            pos = key.next;
            int field = key.value >>> 3;
            int wire = key.value & 7;
            if (wire == 0) {
                Varint ignored = readVarint(data, pos);
                pos = ignored.next;
            } else if (wire == 1) {
                pos += 8;
            } else if (wire == 2) {
                Varint len = readVarint(data, pos);
                pos = len.next;
                int end = Math.min(data.length, pos + len.value);
                if (field == 1 && end > pos) {
                    parsePiece(data, pos, end, tokenId++);
                }
                pos = end;
            } else if (wire == 5) {
                pos += 4;
            } else {
                break;
            }
        }
    }

    private void parsePiece(byte[] data, int start, int end, int tokenId) {
        int pos = start;
        String piece = null;
        float score = 0f;
        int type = 1;

        while (pos < end) {
            Varint key = readVarint(data, pos);
            if (key.next <= pos) break;
            pos = key.next;
            int field = key.value >>> 3;
            int wire = key.value & 7;

            if (wire == 0) {
                Varint value = readVarint(data, pos);
                pos = value.next;
                if (field == 3) type = value.value;
            } else if (wire == 2) {
                Varint len = readVarint(data, pos);
                pos = len.next;
                int valueEnd = Math.min(end, pos + len.value);
                if (field == 1) {
                    piece = new String(data, pos, Math.max(0, valueEnd - pos), StandardCharsets.UTF_8);
                }
                pos = valueEnd;
            } else if (wire == 5) {
                if (field == 2 && pos + 4 <= end) {
                    score = ByteBuffer.wrap(data, pos, 4).order(ByteOrder.LITTLE_ENDIAN).getFloat();
                }
                pos += 4;
            } else if (wire == 1) {
                pos += 8;
            } else {
                break;
            }
        }

        if (piece == null) return;
        vocabulary.put(piece, new Piece(tokenId, score));
        if (type == 2) {
            unkTokenId = tokenId;
        } else if (type == 6 && piece.matches("<0x[0-9A-Fa-f]{2}>")) {
            int value = Integer.parseInt(piece.substring(3, 5), 16);
            byteFallback.put(value, tokenId);
        }
    }

    public long[] encode(String rawText) {
        if (!loaded) throw new IllegalStateException("Tokenizer PocketTTS non chargé.");
        String text = prepare(rawText);
        String normalized = WORD_BOUNDARY + Normalizer.normalize(text, Normalizer.Form.NFKC)
            .replace(" ", WORD_BOUNDARY);

        final int n = normalized.length();
        float[] bestScore = new float[n + 1];
        int[] bestLen = new int[n + 1];
        int[] bestToken = new int[n + 1];
        @SuppressWarnings("unchecked")
        List<Integer>[] bestByteTokens = new List[n + 1];

        java.util.Arrays.fill(bestScore, Float.NEGATIVE_INFINITY);
        java.util.Arrays.fill(bestToken, unkTokenId);
        bestScore[0] = 0f;

        for (int pos = 0; pos < n; pos++) {
            if (bestScore[pos] == Float.NEGATIVE_INFINITY) continue;

            int maxLen = Math.min(64, n - pos);
            for (int len = 1; len <= maxLen; len++) {
                Piece candidate = vocabulary.get(normalized.substring(pos, pos + len));
                if (candidate == null) continue;
                float score = bestScore[pos] + candidate.score;
                if (score > bestScore[pos + len]) {
                    bestScore[pos + len] = score;
                    bestLen[pos + len] = len;
                    bestToken[pos + len] = candidate.id;
                    bestByteTokens[pos + len] = null;
                }
            }

            // No regular token begins here: use SentencePiece byte-fallback tokens.
            if (pos + 1 <= n && bestScore[pos + 1] == Float.NEGATIVE_INFINITY) {
                int cp = Character.codePointAt(normalized, pos);
                int charCount = Character.charCount(cp);
                int target = pos + charCount;
                if (target <= n) {
                    byte[] bytes = new String(Character.toChars(cp)).getBytes(StandardCharsets.UTF_8);
                    List<Integer> fallbackIds = new ArrayList<>(bytes.length);
                    boolean allKnown = true;
                    for (byte b : bytes) {
                        Integer token = byteFallback.get(b & 0xff);
                        if (token == null) {
                            allKnown = false;
                            fallbackIds.add(unkTokenId);
                        } else {
                            fallbackIds.add(token);
                        }
                    }
                    float score = bestScore[pos] - (allKnown ? 10f * bytes.length : 100f);
                    if (score > bestScore[target]) {
                        bestScore[target] = score;
                        bestLen[target] = charCount;
                        bestToken[target] = -1;
                        bestByteTokens[target] = fallbackIds;
                    }
                }
            }
        }

        List<Integer> reversed = new ArrayList<>();
        int pos = n;
        while (pos > 0) {
            int len = bestLen[pos];
            if (len <= 0) {
                reversed.add(unkTokenId);
                pos--;
                continue;
            }
            if (bestToken[pos] == -1 && bestByteTokens[pos] != null) {
                List<Integer> bytes = bestByteTokens[pos];
                for (int i = bytes.size() - 1; i >= 0; i--) reversed.add(bytes.get(i));
            } else {
                reversed.add(bestToken[pos]);
            }
            pos -= len;
        }
        Collections.reverse(reversed);

        long[] ids = new long[reversed.size()];
        for (int i = 0; i < reversed.size(); i++) ids[i] = reversed.get(i);
        return ids;
    }

    private static String prepare(String input) {
        String value = input == null ? "" : input.trim().replace('\n', ' ').replace('\r', ' ');
        value = value.replace(';', ',').replaceAll("\\s+", " ");
        if (value.isEmpty()) throw new IllegalArgumentException("Texte PocketTTS vide.");
        int first = value.codePointAt(0);
        if (Character.isLowerCase(first)) {
            String firstString = new String(Character.toChars(Character.toUpperCase(first)));
            value = firstString + value.substring(Character.charCount(first));
        }
        int last = value.codePointBefore(value.length());
        if (Character.isLetterOrDigit(last)) value += ".";
        return value;
    }

    private static Varint readVarint(byte[] data, int start) {
        int result = 0;
        int shift = 0;
        int pos = start;
        while (pos < data.length && shift < 32) {
            int b = data[pos++] & 0xff;
            result |= (b & 0x7f) << shift;
            if ((b & 0x80) == 0) break;
            shift += 7;
        }
        return new Varint(result, pos);
    }

    private static final class Varint {
        final int value;
        final int next;
        Varint(int value, int next) { this.value = value; this.next = next; }
    }

    private static final class Piece {
        final int id;
        final float score;
        Piece(int id, float score) { this.id = id; this.score = score; }
    }
}
