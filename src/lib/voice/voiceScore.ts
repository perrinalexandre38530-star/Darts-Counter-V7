// ============================================
// src/lib/voice/voiceScore.ts
// Parser vocal X01 FR/EN très tolérant.
// Objectif : comprendre un HIT à la fois sans imposer "simple".
// Exemples : "seize" => S16, "triple seize" => T16,
// "triplevant" => T20, "dbull"/"plein centre" => DBULL.
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

function compactText(text: string) {
  return normalize(text).replace(/\s+/g, "");
}

const NUMBER_ALIASES: Record<string, number> = {
  "0": 0,
  zero: 0,
  zeros: 0,
  nul: 0,
  "1": 1,
  un: 1,
  une: 1,
  one: 1,
  first: 1,
  "2": 2,
  deux: 2,
  de: 2,
  two: 2,
  "3": 3,
  trois: 3,
  troi: 3,
  three: 3,
  "4": 4,
  quatre: 4,
  quat: 4,
  four: 4,
  "5": 5,
  cinq: 5,
  cinqe: 5,
  sinq: 5,
  five: 5,
  "6": 6,
  six: 6,
  sis: 6,
  sice: 6,
  sixe: 6,
  "7": 7,
  sept: 7,
  set: 7,
  seven: 7,
  "8": 8,
  huit: 8,
  uit: 8,
  eight: 8,
  "9": 9,
  neuf: 9,
  noeuf: 9,
  nine: 9,
  "10": 10,
  dix: 10,
  dis: 10,
  ten: 10,
  "11": 11,
  onze: 11,
  onzee: 11,
  eleven: 11,
  "12": 12,
  douze: 12,
  doze: 12,
  twelve: 12,
  "13": 13,
  treize: 13,
  traize: 13,
  thirteen: 13,
  "14": 14,
  quatorze: 14,
  catorze: 14,
  fourteen: 14,
  "15": 15,
  quinze: 15,
  kinze: 15,
  fifteen: 15,
  "16": 16,
  seize: 16,
  seze: 16,
  saize: 16,
  sixteen: 16,
  "17": 17,
  dixsept: 17,
  disept: 17,
  disset: 17,
  seventeen: 17,
  "18": 18,
  dixhuit: 18,
  dizhuit: 18,
  disuit: 18,
  eighteen: 18,
  "19": 19,
  dixneuf: 19,
  dizneuf: 19,
  disneuf: 19,
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

const NUMBER_WORDS: Array<[RegExp, string]> = [
  [/\bdix\s*neuf\b/g, "19"],
  [/\bdix\s*huit\b/g, "18"],
  [/\bdix\s*sept\b/g, "17"],
  [/\bvingts?\b/g, "20"],
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

const TRIPLE_WORDS = new Set(["triple", "triples", "tripl", "treble", "t", "x3"]);
const DOUBLE_WORDS = new Set(["double", "doubles", "doubl", "d", "x2"]);
const SIMPLE_WORDS = new Set(["simple", "simples", "single", "s"]);
const TIMES_WORDS = new Set(["fois", "x"]);

const MISS_ALIASES = [
  "miss",
  "rate",
  "ratee",
  "manque",
  "manquee",
  "loupe",
  "loupee",
  "dehors",
  "outside",
  "out",
  "zero",
  "zeros",
  "nul",
  "0",
  "acote",
  "coté",
  "cote",
];

const BULL_ALIASES = [
  "bull",
  "bulle",
  "boule",
  "boul",
  "bol",
  "demibull",
  "demibulle",
  "demiboule",
  "demi",
  "demicentre",
  "petitcentre",
  "outerbull",
  "outerbulle",
  "simplebull",
  "simplebulle",
  "vert",
  "green",
];

const DBULL_ALIASES = [
  "dbull",
  "dbulle",
  "dblebull",
  "doublebull",
  "doublebulle",
  "doubleboule",
  "doubleboul",
  "doublebol",
  "doublecentre",
  "doublecenter",
  "pleincentre",
  "fullbull",
  "innerbull",
  "innerbulle",
  "bullseye",
  "bulleye",
  "bullzeye",
  "centre",
  "center",
  "rouge",
  "red",
];

const MULT_PREFIXES: Array<[string, "S" | "D" | "T"]> = [
  ["triple", "T"],
  ["triples", "T"],
  ["tripl", "T"],
  ["treble", "T"],
  ["t", "T"],
  ["x3", "T"],
  ["double", "D"],
  ["doubles", "D"],
  ["doubl", "D"],
  ["d", "D"],
  ["x2", "D"],
  ["simple", "S"],
  ["simples", "S"],
  ["single", "S"],
  ["s", "S"],
];

const NUMBER_KEYS = Object.keys(NUMBER_ALIASES).sort((a, b) => b.length - a.length);
const MISS_KEYS = MISS_ALIASES.sort((a, b) => b.length - a.length);
const DBULL_KEYS = DBULL_ALIASES.sort((a, b) => b.length - a.length);
const BULL_KEYS = BULL_ALIASES.sort((a, b) => b.length - a.length);

function wordsToNumbers(text: string) {
  let out = text;
  for (const [pattern, value] of NUMBER_WORDS) out = out.replace(pattern, value);
  return out.replace(/\s+/g, " ").trim();
}

function parseNumberCompact(raw: string): number | null {
  const key = compactText(raw);
  if (!key) return null;
  const direct = NUMBER_ALIASES[key];
  if (typeof direct === "number") return direct;
  const digit = key.match(/^\d{1,2}$/);
  if (digit) return Number(digit[0]);
  return null;
}

function makeSegment(kind: "S" | "D" | "T", rawBase: number): VoiceDart | null {
  if (!Number.isFinite(rawBase)) return null;
  const base = clamp(Math.trunc(rawBase), 1, 20);
  if (kind === "T") return { kind: "T", base, value: base * 3, label: `T${base}` };
  if (kind === "D") return { kind: "D", base, value: base * 2, label: `D${base}` };
  return { kind: "S", base, value: base, label: `S${base}` };
}

function isMissCompact(c: string) {
  return MISS_ALIASES.includes(c);
}

function compactTokenToDart(compact: string): VoiceDart | null {
  const c = compactText(compact);
  if (!c) return null;

  if (isMissCompact(c)) return { kind: "MISS", value: 0, label: "MISS" };
  if (DBULL_ALIASES.includes(c)) return { kind: "DBULL", value: 50, label: "DBULL" };
  if (BULL_ALIASES.includes(c)) return { kind: "BULL", value: 25, label: "BULL" };

  const shorthand = c.match(/^([sdt])([0-9]{1,2})$/i);
  if (shorthand) {
    const kind = shorthand[1].toLowerCase() === "t" ? "T" : shorthand[1].toLowerCase() === "d" ? "D" : "S";
    return makeSegment(kind, Number(shorthand[2]));
  }

  for (const [prefix, kind] of MULT_PREFIXES) {
    if (!c.startsWith(prefix)) continue;
    const rest = c.slice(prefix.length);
    if (!rest) continue;
    if (kind === "D" && BULL_ALIASES.includes(rest)) return { kind: "DBULL", value: 50, label: "DBULL" };
    if (BULL_ALIASES.includes(rest)) return kind === "S" ? { kind: "BULL", value: 25, label: "BULL" } : kind === "D" ? { kind: "DBULL", value: 50, label: "DBULL" } : null;
    const base = parseNumberCompact(rest);
    if (base != null) return makeSegment(kind, base);
  }

  const plain = parseNumberCompact(c);
  if (plain != null) {
    if (plain === 0) return { kind: "MISS", value: 0, label: "MISS" };
    return makeSegment("S", plain);
  }

  return null;
}

function takePrefix(input: string, keys: string[]) {
  for (const key of keys) {
    if (input.startsWith(key)) return key;
  }
  return null;
}

function scanCompactDarts(rawCompact: string): VoiceDart[] {
  let rest = compactText(rawCompact);
  const darts: VoiceDart[] = [];
  let guard = 0;

  while (rest && darts.length < 3 && guard++ < 20) {
    let consumed = "";
    let dart: VoiceDart | null = null;

    const db = takePrefix(rest, DBULL_KEYS);
    if (db) {
      dart = { kind: "DBULL", value: 50, label: "DBULL" };
      consumed = db;
    }

    if (!dart) {
      const b = takePrefix(rest, BULL_KEYS);
      if (b) {
        dart = { kind: "BULL", value: 25, label: "BULL" };
        consumed = b;
      }
    }

    if (!dart) {
      const m = takePrefix(rest, MISS_KEYS);
      if (m) {
        dart = { kind: "MISS", value: 0, label: "MISS" };
        consumed = m;
      }
    }

    if (!dart) {
      for (const [prefix, kind] of MULT_PREFIXES) {
        if (!rest.startsWith(prefix)) continue;
        const afterPrefix = rest.slice(prefix.length);
        const numKey = takePrefix(afterPrefix, NUMBER_KEYS);
        if (numKey) {
          dart = makeSegment(kind, NUMBER_ALIASES[numKey]);
          consumed = prefix + numKey;
          break;
        }
        const bullKey = takePrefix(afterPrefix, BULL_KEYS);
        if (bullKey) {
          dart = kind === "D" ? { kind: "DBULL", value: 50, label: "DBULL" } : { kind: "BULL", value: 25, label: "BULL" };
          consumed = prefix + bullKey;
          break;
        }
      }
    }

    if (!dart) {
      const numKey = takePrefix(rest, NUMBER_KEYS);
      if (numKey) {
        const n = NUMBER_ALIASES[numKey];
        dart = n === 0 ? { kind: "MISS", value: 0, label: "MISS" } : makeSegment("S", n);
        consumed = numKey;
      }
    }

    if (!dart || !consumed) break;
    darts.push(dart);
    rest = rest.slice(consumed.length);
  }

  return darts;
}

function parseTokens(tokens: string[]): VoiceDart[] {
  const darts: VoiceDart[] = [];
  const push = (dart: VoiceDart | null) => {
    if (dart && darts.length < 3) darts.push(dart);
  };

  for (let i = 0; i < tokens.length && darts.length < 3; i += 1) {
    const token = tokens[i];
    const next = tokens[i + 1] || "";
    const next2 = tokens[i + 2] || "";
    const joined = `${token}${next}`;

    // "trois fois seize" => T16 / "deux fois seize" => D16
    if ((token === "3" || token === "trois" || token === "three") && TIMES_WORDS.has(next)) {
      const base = parseNumberCompact(next2);
      if (base != null) {
        push(makeSegment("T", base));
        i += 2;
        continue;
      }
    }
    if ((token === "2" || token === "deux" || token === "two") && TIMES_WORDS.has(next)) {
      const base = parseNumberCompact(next2);
      if (base != null) {
        push(makeSegment("D", base));
        i += 2;
        continue;
      }
    }

    if (DOUBLE_WORDS.has(token) && BULL_ALIASES.includes(compactText(next))) {
      push({ kind: "DBULL", value: 50, label: "DBULL" });
      i += 1;
      continue;
    }

    if ((TRIPLE_WORDS.has(token) || DOUBLE_WORDS.has(token) || SIMPLE_WORDS.has(token)) && next) {
      const kind = TRIPLE_WORDS.has(token) ? "T" : DOUBLE_WORDS.has(token) ? "D" : "S";
      const base = parseNumberCompact(next);
      if (base != null) {
        push(makeSegment(kind, base));
        i += 1;
        continue;
      }
      const nextCompact = compactText(next);
      if (BULL_ALIASES.includes(nextCompact)) {
        push(kind === "D" ? { kind: "DBULL", value: 50, label: "DBULL" } : { kind: "BULL", value: 25, label: "BULL" });
        i += 1;
        continue;
      }
    }

    const joinedDart = compactTokenToDart(joined);
    if (joinedDart && token.length <= 12 && next.length <= 12) {
      push(joinedDart);
      if (TRIPLE_WORDS.has(token) || DOUBLE_WORDS.has(token) || SIMPLE_WORDS.has(token) || joined.startsWith("doublebull")) i += 1;
      continue;
    }

    push(compactTokenToDart(token));
  }

  return darts;
}

export function parseVoiceVisit(rawText: string): VoiceDart[] {
  const normalized = normalize(rawText);
  const base = wordsToNumbers(normalized);
  if (!base) return [];

  const direct = compactTokenToDart(base);
  if (direct) return [direct];

  const tokens = base.split(/\s+/).filter(Boolean);
  const byTokens = parseTokens(tokens);
  if (byTokens.length) return byTokens.slice(0, 3);

  return scanCompactDarts(base).slice(0, 3);
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
