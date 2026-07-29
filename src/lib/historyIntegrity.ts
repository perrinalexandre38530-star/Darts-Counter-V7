// src/lib/historyIntegrity.ts
// Non-destructive integrity helpers for persisted finished matches.
// The invariant is simple: once a match is finished, a later write may enrich it,
// but it must never silently remove detailed gameplay/statistical information.

const IMPORTANT_ARRAY_KEYS = new Set([
  "darts",
  "replayDarts",
  "visitHistory",
  "visitsHistory",
  "visits",
  "legs",
  "legDetails",
  "legSummaries",
  "hits",
  "cricketEvents",
  "cricketDartLog",
  "events",
  "timeline",
  "rounds",
  "turns",
  "throws",
  "frames",
  "scores",
  "perPlayer",
]);

const IMPORTANT_OBJECT_KEYS = new Set([
  "stats",
  "legStats",
  "cricketStats",
  "marks",
  "hitsBySegment",
  "hitsBySector",
  "detailedByPlayer",
  "players",
  "rankings",
  "finalScores",
  "avg3ByPlayer",
  "bestVisitByPlayer",
  "bestCheckoutByPlayer",
  "config",
  "state",
  "engineState",
  "result",
]);

function isPlainObject(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isMeaningfulHistoryValue(value: any): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function safeJsonLength(value: any): number {
  try {
    return JSON.stringify(value ?? null).length;
  } catch {
    return 0;
  }
}

function structuralScore(value: any, key = "", depth = 0): number {
  if (value == null || depth > 14) return 0;
  if (Array.isArray(value)) {
    const multiplier = IMPORTANT_ARRAY_KEYS.has(key) ? 80 : 12;
    let score = value.length * multiplier;
    // A small sample is enough to detect rich per-dart/per-player objects without
    // making an integrity check expensive on very long histories.
    const max = Math.min(value.length, 80);
    for (let i = 0; i < max; i += 1) score += structuralScore(value[i], "", depth + 1);
    return score;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    let score = keys.length * (IMPORTANT_OBJECT_KEYS.has(key) ? 40 : 5);
    for (const childKey of keys) {
      score += structuralScore(value[childKey], childKey, depth + 1);
    }
    return score;
  }
  if (typeof value === "string") return Math.min(value.length, 500) / 20;
  if (typeof value === "number" || typeof value === "boolean") return 1;
  return 0;
}

export type HistoryPayloadFingerprint = {
  jsonBytes: number;
  score: number;
  detailedSignals: number;
};

function countDetailedSignals(value: any, key = "", depth = 0): number {
  if (value == null || depth > 14) return 0;
  if (Array.isArray(value)) {
    let total = IMPORTANT_ARRAY_KEYS.has(key) && value.length > 0 ? 1 : 0;
    const max = Math.min(value.length, 80);
    for (let i = 0; i < max; i += 1) total += countDetailedSignals(value[i], "", depth + 1);
    return total;
  }
  if (isPlainObject(value)) {
    let total = IMPORTANT_OBJECT_KEYS.has(key) && Object.keys(value).length > 0 ? 1 : 0;
    for (const [childKey, child] of Object.entries(value)) {
      total += countDetailedSignals(child, childKey, depth + 1);
    }
    return total;
  }
  return 0;
}

export function fingerprintHistoryPayload(payload: any): HistoryPayloadFingerprint {
  const jsonBytes = safeJsonLength(payload);
  const detailedSignals = countDetailedSignals(payload);
  return {
    jsonBytes,
    detailedSignals,
    score: Math.round(structuralScore(payload) + Math.min(jsonBytes, 250_000) / 8 + detailedSignals * 250),
  };
}

function stableEntityId(value: any): string {
  if (!isPlainObject(value)) return "";
  return String(value.id ?? value.playerId ?? value.profileId ?? value.pid ?? value.key ?? "").trim();
}

function mergeArraysMonotonic(previous: any[], incoming: any[], path: string): any[] {
  if (!incoming.length && previous.length) return previous;
  if (!previous.length) return incoming;

  // Players/per-player arrays have stable identifiers: enrich matching entities
  // rather than choosing one complete array and potentially losing nested stats.
  const shouldMergeById = /(^|\.)(players|perPlayer|rankings)$/i.test(path);
  if (shouldMergeById) {
    const previousById = new Map<string, any>();
    for (const row of previous) {
      const id = stableEntityId(row);
      if (id) previousById.set(id, row);
    }
    const seen = new Set<string>();
    const merged = incoming.map((row, index) => {
      const id = stableEntityId(row);
      if (id) seen.add(id);
      const prev = id ? previousById.get(id) : previous[index];
      return mergeHistoryPayloadMonotonic(prev, row, `${path}[${id || index}]`);
    });
    for (const row of previous) {
      const id = stableEntityId(row);
      if (id && !seen.has(id)) merged.push(row);
    }
    return merged;
  }

  // Event/dart/visit arrays are append-only once a match is finished. A shorter
  // later array is therefore a regression and the longer version wins.
  if (IMPORTANT_ARRAY_KEYS.has(path.split(".").pop() || "")) {
    return incoming.length >= previous.length ? incoming : previous;
  }

  // Generic arrays: preserve the richer representation rather than dropping data.
  const prevScore = fingerprintHistoryPayload(previous).score;
  const nextScore = fingerprintHistoryPayload(incoming).score;
  return nextScore >= prevScore ? incoming : previous;
}

export function mergeHistoryPayloadMonotonic(previous: any, incoming: any, path = "payload"): any {
  if (!isMeaningfulHistoryValue(incoming)) return previous;
  if (!isMeaningfulHistoryValue(previous)) return incoming;

  if (Array.isArray(previous) && Array.isArray(incoming)) {
    return mergeArraysMonotonic(previous, incoming, path);
  }

  if (isPlainObject(previous) && isPlainObject(incoming)) {
    const out: Record<string, any> = { ...previous };
    for (const [key, value] of Object.entries(incoming)) {
      out[key] = mergeHistoryPayloadMonotonic(previous[key], value, `${path}.${key}`);
    }
    return out;
  }

  // Primitive corrections/enrichments are allowed. The non-destructive invariant
  // concerns loss of structure/detail, not a legitimate corrected scalar value.
  return incoming;
}

export type HistoryIntegrityResult = {
  payload: any;
  regressionPrevented: boolean;
  previous: HistoryPayloadFingerprint;
  incoming: HistoryPayloadFingerprint;
  merged: HistoryPayloadFingerprint;
};

export function protectFinishedHistoryPayload(previous: any, incoming: any): HistoryIntegrityResult {
  const previousFp = fingerprintHistoryPayload(previous);
  const incomingFp = fingerprintHistoryPayload(incoming);

  if (!isMeaningfulHistoryValue(previous)) {
    return {
      payload: incoming,
      regressionPrevented: false,
      previous: previousFp,
      incoming: incomingFp,
      merged: incomingFp,
    };
  }
  if (!isMeaningfulHistoryValue(incoming)) {
    return {
      payload: previous,
      regressionPrevented: true,
      previous: previousFp,
      incoming: incomingFp,
      merged: previousFp,
    };
  }

  const mergedPayload = mergeHistoryPayloadMonotonic(previous, incoming);
  const mergedFp = fingerprintHistoryPayload(mergedPayload);
  const regressionPrevented =
    incomingFp.score < previousFp.score ||
    incomingFp.detailedSignals < previousFp.detailedSignals ||
    incomingFp.jsonBytes < previousFp.jsonBytes * 0.72;

  return {
    payload: mergedPayload,
    regressionPrevented,
    previous: previousFp,
    incoming: incomingFp,
    merged: mergedFp,
  };
}
