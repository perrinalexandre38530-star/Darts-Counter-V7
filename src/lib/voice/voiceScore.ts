// ============================================
// src/lib/voice/voiceScore.ts
// Parse FR/EN voice input for X01 scoring.
// Supports:
// - one dart: "triple vingt", "triplevant" (speech glued), "T20", "double 16", "bull", "double bull", "miss"
// - full visit: "triple vingt, simple cinq, miss"
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
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_WORDS: Array<[RegExp, string]> = [
  [/\bvingts?\b/g, "20"],
  [/\bdix\s*neuf\b/g, "19"],
  [/\bdix\s*huit\b/g, "18"],
  [/\bdix\s*sept\b/g, "17"],
  [/\bseize\b/g, "16"],
  [/\bquinze\b/g, "15"],
  [/\bquatorze\b/g, "14"],
  [/\btreize\b/g, "13"],
  [/\bdouze\b/g, "12"],
  [/\bonze\b/g, "11"],
  [/\bdix\b/g, "10"],
  [/\bneuf\b/g, "9"],
  [/\bhuit\b/g, "8"],
  [/\bsept\b/g, "7"],
  [/\bsix\b/g, "6"],
  [/\bcinq\b/g, "5"],
  [/\bquatre\b/g, "4"],
  [/\btrois\b/g, "3"],
  [/\bdeux\b/g, "2"],
  [/\b(un|une)\b/g, "1"],
  [/\bzero\b/g, "0"],
  [/\btwenty\b/g, "20"],
  [/\bnineteen\b/g, "19"],
  [/\beighteen\b/g, "18"],
  [/\bseventeen\b/g, "17"],
  [/\bsixteen\b/g, "16"],
  [/\bfifteen\b/g, "15"],
  [/\bfourteen\b/g, "14"],
  [/\bthirteen\b/g, "13"],
  [/\btwelve\b/g, "12"],
  [/\beleven\b/g, "11"],
  [/\bten\b/g, "10"],
  [/\bnine\b/g, "9"],
  [/\beight\b/g, "8"],
  [/\bseven\b/g, "7"],
  [/\bsix\b/g, "6"],
  [/\bfive\b/g, "5"],
  [/\bfour\b/g, "4"],
  [/\bthree\b/g, "3"],
  [/\btwo\b/g, "2"],
  [/\bone\b/g, "1"],
];

// Aliases compacts : le Web Speech API renvoie parfois "triple vingt" en un seul token,
// par exemple "triplevant", "triplevent", "triplevingt".
const NUMBER_ALIASES: Record<string, number> = {
  "0": 0,
  zero: 0,
  zeros: 0,
  "1": 1,
  un: 1,
  une: 1,
  one: 1,
  "2": 2,
  deux: 2,
  two: 2,
  "3": 3,
  trois: 3,
  three: 3,
  "4": 4,
  quatre: 4,
  four: 4,
  "5": 5,
  cinq: 5,
  five: 5,
  "6": 6,
  six: 6,
  "7": 7,
  sept: 7,
  seven: 7,
  "8": 8,
  huit: 8,
  eight: 8,
  "9": 9,
  neuf: 9,
  nine: 9,
  "10": 10,
  dix: 10,
  ten: 10,
  "11": 11,
  onze: 11,
  eleven: 11,
  "12": 12,
  douze: 12,
  twelve: 12,
  "13": 13,
  treize: 13,
  thirteen: 13,
  "14": 14,
  quatorze: 14,
  fourteen: 14,
  "15": 15,
  quinze: 15,
  fifteen: 15,
  "16": 16,
  seize: 16,
  sixteen: 16,
  "17": 17,
  dixsept: 17,
  disept: 17,
  seventeen: 17,
  "18": 18,
  dixhuit: 18,
  dizhuit: 18,
  eighteen: 18,
  "19": 19,
  dixneuf: 19,
  dizneuf: 19,
  nineteen: 19,
  "20": 20,
  vingt: 20,
  vingts: 20,
  vint: 20,
  vin: 20,
  ving: 20,
  vent: 20,
  vant: 20,
  vain: 20,
  twenty: 20,
};

const MULTIPLIER_ALIASES: Array<[RegExp, "S" | "D" | "T"]> = [
  [/^(triple|triples|tripl|treble|t)(.+)$/i, "T"],
  [/^(double|doubles|doubl|d)(.+)$/i, "D"],
  [/^(simple|simples|single|s)(.+)$/i, "S"],
];

function wordsToNumbers(text: string) {
  let out = text;
  for (const [pattern, value] of NUMBER_WORDS) out = out.replace(pattern, value);
  return out.replace(/\s+/g, " ").trim();
}

function compactText(text: string) {
  return normalize(text).replace(/\s+/g, "");
}

function parseNumberCompact(raw: string): number | null {
  const key = compactText(raw);
  if (!key) return null;
  const direct = NUMBER_ALIASES[key];
  if (typeof direct === "number") return direct;

  const digit = key.match(/^\d{1,2}$/);
  if (digit) {
    const n = Number(digit[0]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function makeSegment(kind: "S" | "D" | "T", rawBase: number): VoiceDart | null {
  if (!Number.isFinite(rawBase)) return null;
  const base = clamp(Math.trunc(rawBase), 1, 20);
  if (kind === "T") return { kind: "T", base, value: base * 3, label: `T${base}` };
  if (kind === "D") return { kind: "D", base, value: base * 2, label: `D${base}` };
  return { kind: "S", base, value: base, label: `S${base}` };
}

function compactTokenToDart(compact: string): VoiceDart | null {
  if (/^(miss|rate|ratee|manque|manquee|loupe|loupee|0|zero|zeros)$/.test(compact)) {
    return { kind: "MISS", value: 0, label: "MISS" };
  }

  if (/^(dbull|doublebull|doublebulle|doubleboule|doubleboul)$/.test(compact)) {
    return { kind: "DBULL", value: 50, label: "DBULL" };
  }

  if (/^(bull|bulle|boule|boul)$/.test(compact)) {
    return { kind: "BULL", value: 25, label: "BULL" };
  }

  const shorthand = compact.match(/^([sdt])([0-9]{1,2})$/i);
  if (shorthand) {
    const kind = shorthand[1].toLowerCase() === "t" ? "T" : shorthand[1].toLowerCase() === "d" ? "D" : "S";
    return makeSegment(kind, Number(shorthand[2]));
  }

  for (const [pattern, kind] of MULTIPLIER_ALIASES) {
    const m = compact.match(pattern);
    if (!m) continue;
    const base = parseNumberCompact(m[2]);
    if (base == null) continue;
    return makeSegment(kind, base);
  }

  const plain = parseNumberCompact(compact);
  if (plain != null) {
    if (plain === 0) return { kind: "MISS", value: 0, label: "MISS" };
    return makeSegment("S", plain);
  }

  return null;
}

function tokenToDart(token: string): VoiceDart | null {
  const compact = compactText(token);
  return compactTokenToDart(compact);
}

export function parseVoiceVisit(rawText: string): VoiceDart[] {
  const normalized = normalize(rawText);
  const base = wordsToNumbers(normalized);
  if (!base) return [];

  const tokens = base.split(/\s+/).filter(Boolean);
  const darts: VoiceDart[] = [];

  const push = (dart: VoiceDart | null) => {
    if (dart && darts.length < 3) darts.push(dart);
  };

  for (let i = 0; i < tokens.length && darts.length < 3; i += 1) {
    const token = tokens[i];
    const next = tokens[i + 1] || "";
    const joined = `${token}${next}`;

    if ((token === "double" || token === "d") && /^(bull|bulle|boule|boul)$/.test(next)) {
      push({ kind: "DBULL", value: 50, label: "DBULL" });
      i += 1;
      continue;
    }

    if (/^(triple|treble|t)$/.test(token) && /^\d{1,2}$/.test(next)) {
      push(makeSegment("T", Number(next)));
      i += 1;
      continue;
    }

    if (/^(double|d)$/.test(token) && /^\d{1,2}$/.test(next)) {
      push(makeSegment("D", Number(next)));
      i += 1;
      continue;
    }

    if (/^(simple|single|s)$/.test(token) && /^\d{1,2}$/.test(next)) {
      push(makeSegment("S", Number(next)));
      i += 1;
      continue;
    }

    // Useful for browser transcripts such as "t 20", "d 16", "doublebull"
    // and glued French transcripts such as "triplevant".
    const joinedDart = tokenToDart(joined);
    if (joinedDart && token.length <= 10 && next.length <= 10) {
      push(joinedDart);
      if (/^(double|d|triple|treble|t|simple|single|s)$/.test(token) || joined.startsWith("doublebull")) i += 1;
      continue;
    }

    push(tokenToDart(token));
  }

  return darts.slice(0, 3);
}

export function parseVoiceDart(rawText: string): VoiceDart | null {
  return parseVoiceVisit(rawText)[0] || null;
}

export function formatDartLabel(d: VoiceDart) {
  if (d.kind === "MISS") return "MISS";
  return d.label;
}

export function sumDarts(darts: VoiceDart[]) {
  return darts.reduce((a, d) => a + d.value, 0);
}
