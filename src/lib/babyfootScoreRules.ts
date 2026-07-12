// @ts-nocheck
// Centralisation des règles de score Baby-Foot.
// Objectif : éviter les incohérences entre Historique, Résultat, Stats et imports.

export type BabyFootScorePair = {
  scoreA: number;
  scoreB: number;
  hasScoringEvents: boolean;
  hasPenaltyEvents: boolean;
};

function isObj(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function arr(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function num(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pick(source: any, ...keys: string[]) {
  for (const key of keys) {
    if (source && source[key] !== undefined) return source[key];
  }
  return undefined;
}

function compactRootOf(...sources: any[]) {
  for (const source of sources) {
    if (!isObj(source)) continue;
    const candidates = [source?.compact, source?.payload?.compact, source?.payload?.payload?.compact];
    for (const compact of candidates) {
      if (isObj(compact) && compact.__compact === "match.v1") return compact;
    }
  }
  return null;
}

export function normalizeBabyFootScoreEvent(raw: any) {
  if (!isObj(raw)) return raw;
  return {
    ...raw,
    t: String(pick(raw, "t", "type") ?? "").toLowerCase(),
    at: num(pick(raw, "at", "timestamp"), 0),
    team: String(pick(raw, "team") ?? "").toUpperCase() === "B" ? "B" : String(pick(raw, "team") ?? "").toUpperCase() === "A" ? "A" : null,
    scorerId: pick(raw, "scorerId", "scorerid", "playerId", "playerid") ?? null,
    ownGoalById: pick(raw, "ownGoalById", "owngoalbyid") ?? null,
    ownGoalTeam: pick(raw, "ownGoalTeam", "owngoalteam") ?? null,
    kind: pick(raw, "kind") ?? null,
    points: num(pick(raw, "points", "pts"), 1),
    demiBonusApplied: num(pick(raw, "demiBonusApplied", "demibonusapplied"), 0),
    sourceLine: pick(raw, "sourceLine", "sourceline") ?? null,
    counted: pick(raw, "counted"),
    pendingBefore: num(pick(raw, "pendingBefore", "pendingbefore"), 0),
    lastBallPenalty: num(pick(raw, "lastBallPenalty", "lastballpenalty"), 0),
    scoreDeltaA: num(pick(raw, "scoreDeltaA", "scoredeltaa"), 0),
    scoreDeltaB: num(pick(raw, "scoreDeltaB", "scoredeltab"), 0),
    winner: pick(raw, "winner") ?? null,
    reason: pick(raw, "reason") ?? null,
  };
}

export function collectBabyFootScoreEvents(record: any): any[] {
  const outer = isObj(record) ? record : {};
  const p0 = isObj(outer.payload) ? outer.payload : {};
  const p1 = isObj(p0.payload) ? p0.payload : {};
  const payload = Object.keys(p1).length ? p1 : p0;
  const compact = compactRootOf(outer, p0, payload);
  const compactState = isObj(compact?.d?.s) ? compact.d.s : {};
  const sources = [
    payload.events,
    payload?.summary?.events,
    p0.events,
    p0?.summary?.events,
    outer.events,
    outer?.summary?.events,
    compactState.events,
    compact?.d?.e,
  ];
  const hit = sources.find((value) => Array.isArray(value) && value.length);
  return arr(hit).map(normalizeBabyFootScoreEvent).filter(isObj).sort((a, b) => num(a.at) - num(b.at));
}

function getStartScore(source: any, side: "A" | "B") {
  const summary = isObj(source?.summary) ? source.summary : {};
  // Même convention que le moteur actuel : le handicap A donne une avance à B et inversement.
  return side === "A"
    ? Math.max(0, num(source?.handicapB ?? summary?.handicapB ?? source?.handicapb ?? summary?.handicapb, 0))
    : Math.max(0, num(source?.handicapA ?? summary?.handicapA ?? source?.handicapa ?? summary?.handicapa, 0));
}

export function deriveBabyFootScoreFromEvents(events: any[], source?: any): BabyFootScorePair {
  let scoreA = getStartScore(source, "A");
  let scoreB = getStartScore(source, "B");
  let hasScoringEvents = false;
  let hasPenaltyEvents = false;

  for (const raw of arr(events)) {
    const ev = normalizeBabyFootScoreEvent(raw);
    if (!isObj(ev)) continue;

    if (ev.t === "set_win") {
      scoreA = getStartScore(source, "A");
      scoreB = getStartScore(source, "B");
      continue;
    }

    let deltaA = 0;
    let deltaB = 0;

    if (ev.t === "goal") {
      const points = Math.max(1, num(ev.points, 1));
      if (ev.team === "A") deltaA += points;
      if (ev.team === "B") deltaB += points;
    } else if (ev.t === "special") {
      deltaA += num(ev.scoreDeltaA, 0);
      deltaB += num(ev.scoreDeltaB, 0);
    } else if (ev.t === "demi") {
      const penalty = Math.max(0, num(ev.lastBallPenalty, 0));
      if (num(ev.scoreDeltaA, 0) || num(ev.scoreDeltaB, 0)) {
        deltaA += num(ev.scoreDeltaA, 0);
        deltaB += num(ev.scoreDeltaB, 0);
      } else if (penalty > 0) {
        if (ev.team === "A") deltaA -= penalty;
        if (ev.team === "B") deltaB -= penalty;
      }
      if (penalty > 0 || deltaA < 0 || deltaB < 0) hasPenaltyEvents = true;
    }

    if (deltaA !== 0 || deltaB !== 0 || ev.t === "goal") {
      hasScoringEvents = true;
      scoreA = Math.max(0, scoreA + deltaA);
      scoreB = Math.max(0, scoreB + deltaB);
    }
  }

  return { scoreA, scoreB, hasScoringEvents, hasPenaltyEvents };
}

export function deriveBabyFootScoreFromRecord(record: any): BabyFootScorePair {
  return deriveBabyFootScoreFromEvents(collectBabyFootScoreEvents(record), record);
}

export function babyFootPenaltyLossByTeam(events: any[]) {
  const out = {
    A: { total: 0, demi: 0, gamelle: 0, peche: 0, pissette: 0, parachute: 0, other: 0 },
    B: { total: 0, demi: 0, gamelle: 0, peche: 0, pissette: 0, parachute: 0, other: 0 },
  } as any;
  for (const raw of arr(events)) {
    const ev = normalizeBabyFootScoreEvent(raw);
    if (!isObj(ev)) continue;
    const lossA = Math.max(0, -num(ev.scoreDeltaA, 0));
    const lossB = Math.max(0, -num(ev.scoreDeltaB, 0));
    if (!lossA && !lossB) continue;
    const kind = ev.t === "demi" ? "demi"
      : String(ev.kind || "").includes("gamelle") ? "gamelle"
      : String(ev.kind || "").includes("peche") ? "peche"
      : String(ev.kind || "").includes("pissette") ? "pissette"
      : String(ev.kind || "").includes("parachute") ? "parachute"
      : "other";
    if (lossA) { out.A.total += lossA; out.A[kind] += lossA; }
    if (lossB) { out.B.total += lossB; out.B[kind] += lossB; }
  }
  return out;
}
