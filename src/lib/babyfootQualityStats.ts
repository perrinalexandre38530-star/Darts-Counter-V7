// =============================================================
// src/lib/babyfootQualityStats.ts
// Baby-Foot — V4.8 Stats "Qualité de jeu"
// PURE FUNCTIONS — no gameplay / no store mutation
// =============================================================

export type GoalEvent = {
  t: "goal";
  at: number;
  team: "A" | "B";
  scorerId?: string;
};

export type PenaltyEvent = {
  t: "penalty";
  at: number;
  team: "A" | "B";
  scored: boolean;
  scorerId?: string;
  shooterId?: string;
};

export type ShotEvent = {
  t: "shot";
  at: number;
  team: "A" | "B";
  shooterId?: string;
};

export type MatchPayload = {
  events?: Array<GoalEvent | PenaltyEvent | ShotEvent | any>;
  scoreA?: number;
  scoreB?: number;
};

// Conversion tirs -> buts (si events "shot" existent)
export function computeShotConversion(events: any[]) {
  let shots = 0;
  let goals = 0;
  for (const e of events || []) {
    if (e?.t === "shot") shots += 1;
    if (e?.t === "goal") goals += 1;
  }
  return { shots, goals, conversion: shots > 0 ? goals / shots : null };
}

// Buts décisifs (best-effort):
// - égalisation (A==B) OU
// - but final (atteint scoreA/scoreB final)
export function computeDecisiveGoals(payload: MatchPayload) {
  const events = ((payload?.events ?? []) as any[]).filter((e) => e?.t === "goal") as GoalEvent[];
  let a = 0;
  let b = 0;
  const decisive: GoalEvent[] = [];

  const finalA = Number.isFinite(Number(payload?.scoreA)) ? Number(payload?.scoreA) : null;
  const finalB = Number.isFinite(Number(payload?.scoreB)) ? Number(payload?.scoreB) : null;

  for (const e of events) {
    if (e.team === "A") a += 1;
    else b += 1;

    const isEqualizer = a === b;
    const isFinalGoal = (finalA != null && a === finalA) || (finalB != null && b === finalB);

    if (isEqualizer || isFinalGoal) decisive.push(e);
  }

  return decisive;
}

// Impact penalty (best-effort): existence d'une séance de penalties
export function computePenaltyImpact(payload: MatchPayload) {
  const events = ((payload?.events ?? []) as any[]).filter((e) => e?.t === "penalty") as PenaltyEvent[];
  if (!events.length) return null;
  const last = events[events.length - 1];
  return { decisive: true, scored: !!last.scored, team: last.team, scorerId: (last.scorerId ?? last.shooterId ?? null) as any };
}

// Momentum: bursts (>=2 buts) dans une fenêtre de temps
export function computeMomentum(events: any[], windowMs = 20000) {
  const goals = (events || []).filter((e) => e?.t === "goal") as GoalEvent[];
  const moments: Array<{ from: number; to: number; count: number }> = [];

  for (let i = 0; i < goals.length; i++) {
    let count = 1;
    let j = i + 1;
    while (j < goals.length && goals[j].at - goals[i].at <= windowMs) {
      count += 1;
      j += 1;
    }
    if (count >= 2) moments.push({ from: goals[i].at, to: goals[j - 1].at, count });
  }

  return moments;
}
