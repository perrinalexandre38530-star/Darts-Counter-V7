import type { Dart as UIDart } from "../../lib/types";

export type TrainingDart = {
  v: number;
  mult: 1 | 2 | 3;
  score: number;
  label: string;
  miss: boolean;
  bull: boolean;
  dbull: boolean;
};

export type ParsedTrainingTarget = {
  v: number;
  mult: 1 | 2 | 3;
  label: string;
};

export function normalizeTrainingDart(raw: UIDart | any): TrainingDart {
  const rawValue = Number(raw?.v ?? 0);
  const v = Number.isFinite(rawValue)
    ? rawValue === 25
      ? 25
      : Math.max(0, Math.min(20, Math.floor(rawValue)))
    : 0;

  const rawMult = Number(raw?.mult ?? 1);
  const mult: 1 | 2 | 3 =
    v === 25
      ? rawMult === 2
        ? 2
        : 1
      : rawMult === 3
      ? 3
      : rawMult === 2
      ? 2
      : 1;

  const miss = v === 0;
  const bull = v === 25 && mult === 1;
  const dbull = v === 25 && mult === 2;
  const score = miss ? 0 : v === 25 ? (dbull ? 50 : 25) : v * mult;
  const label = miss
    ? "MISS"
    : bull
    ? "BULL"
    : dbull
    ? "DBULL"
    : `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${v}`;

  return { v, mult, score, label, miss, bull, dbull };
}

export function normalizeTrainingVisit(raw: UIDart[] | any[]): TrainingDart[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 3).map(normalizeTrainingDart);
}

export function parseTrainingTarget(input: string): ParsedTrainingTarget | null {
  const raw = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!raw) return null;
  if (raw === "BULL" || raw === "OB" || raw === "25") {
    return { v: 25, mult: 1, label: "BULL" };
  }
  if (raw === "DBULL" || raw === "D-BULL" || raw === "IB" || raw === "50") {
    return { v: 25, mult: 2, label: "DBULL" };
  }

  const match = raw.match(/^([SDT])?(\d{1,2})$/);
  if (!match) return null;

  const v = Number(match[2]);
  if (!Number.isInteger(v) || v < 1 || v > 20) return null;

  const prefix = match[1] || "S";
  const mult: 1 | 2 | 3 = prefix === "T" ? 3 : prefix === "D" ? 2 : 1;
  return { v, mult, label: `${prefix}${v}` };
}

export function trainingDartMatches(
  dart: TrainingDart,
  target: string | ParsedTrainingTarget | null | undefined
): boolean {
  const parsed = typeof target === "string" ? parseTrainingTarget(target) : target;
  if (!parsed) return false;
  return dart.v === parsed.v && dart.mult === parsed.mult;
}

export function isDoubleDart(dart: TrainingDart | null | undefined): boolean {
  return !!dart && !dart.miss && dart.mult === 2;
}

export function visitScore(darts: TrainingDart[]): number {
  return (Array.isArray(darts) ? darts : []).reduce(
    (sum, dart) => sum + (Number(dart?.score) || 0),
    0
  );
}

export function countNonMisses(darts: TrainingDart[]): number {
  return (Array.isArray(darts) ? darts : []).reduce(
    (sum, dart) => sum + (dart && !dart.miss ? 1 : 0),
    0
  );
}

export function calcAvg3(points: number, darts: number): number {
  const d = Math.max(0, Number(darts) || 0);
  return d > 0 ? ((Number(points) || 0) / d) * 3 : 0;
}

export function fmtDuration(ms: number): string {
  const safeMs = Math.max(0, Math.floor(Number(ms) || 0));
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function makeTrainingStats(input: {
  darts: number;
  hits: number;
  points: number;
  startedAt: number;
  endedAt?: number;
}) {
  const darts = Math.max(0, Math.floor(Number(input.darts) || 0));
  const hits = Math.max(0, Math.min(darts, Math.floor(Number(input.hits) || 0)));
  const score = Math.max(0, Number(input.points) || 0);
  const start = Number(input.startedAt || Date.now());
  const end = Math.max(start, Number(input.endedAt || Date.now()));
  const minutes = Math.max(1, end - start) / 60000;

  return {
    darts,
    hits,
    hitRate: darts > 0 ? hits / darts : 0,
    score,
    ppm: score / minutes,
  };
}
