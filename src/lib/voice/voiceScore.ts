// ============================================
// src/lib/voice/voiceScore.ts
// Parse FR/EN: "simple 20 / double 16 / triple 19 / bull / double bull / zéro / miss"
// -> valeur de fléchette (0..60, bull 25, dbull 50) + libellé normalisé
// ============================================

export type VoiceDart =
  | { kind: "MISS"; value: 0; label: string }
  | { kind: "S"; value: number; label: string; base: number }
  | { kind: "D"; value: number; label: string; base: number }
  | { kind: "T"; value: number; label: string; base: number }
  | { kind: "BULL"; value: 25; label: string }
  | { kind: "DBULL"; value: 50; label: string };

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function normalize(raw: string) {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const WORDS = {
  simple: ["simple", "single", "s"],
  double: ["double", "d"],
  triple: ["triple", "treble", "t"],
  bull: ["bull", "bulle", "boul", "boule"],
  dbull: [
    "double bull",
    "doublebull",
    "dbull",
    "double bulle",
    "double boule",
    "double boul",
  ],
  miss: [
    "miss",
    "rate",
    "ratee",
    "raté",
    "zéro",
    "zero",
    "0",
    "manque",
    "manqué",
  ],
};

function hasAny(text: string, arr: string[]) {
  return arr.some((w) => text.includes(w));
}

function extractNumber(text: string): number | null {
  const m = text.match(/\b(\d{1,2})\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  return n;
}

export function parseVoiceDart(rawText: string): VoiceDart | null {
  const text = normalize(rawText);
  if (!text) return null;

  // DBULL prioritaire
  if (hasAny(text, WORDS.dbull)) return { kind: "DBULL", value: 50, label: "DBULL" };

  // BULL
  if (hasAny(text, WORDS.bull)) return { kind: "BULL", value: 25, label: "BULL" };

  // MISS / ZERO
  if (hasAny(text, WORDS.miss)) return { kind: "MISS", value: 0, label: "MISS" };

  const n0 = extractNumber(text);
  if (n0 == null) return null;

  // segments standards 1..20
  const base = clamp(n0, 1, 20);

  // multiplicateur
  const isT = hasAny(text, WORDS.triple);
  const isD = hasAny(text, WORDS.double);
  const isS = hasAny(text, WORDS.simple);

  if (isT) return { kind: "T", base, value: base * 3, label: `T${base}` };
  if (isD) return { kind: "D", base, value: base * 2, label: `D${base}` };

  // par défaut : simple
  if (isS || true) return { kind: "S", base, value: base, label: `S${base}` };
}

export function formatDartLabel(d: VoiceDart) {
  if (d.kind === "MISS") return "0";
  return d.label;
}

export function sumDarts(darts: VoiceDart[]) {
  return darts.reduce((a, d) => a + d.value, 0);
}
