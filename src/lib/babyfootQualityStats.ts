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
};

export type MatchPayload = {
  events?: Array<GoalEvent | PenaltyEvent | any>;
  scoreA?: number;
  scoreB?: number;
};

export function computeShotConversion(events: any[]) {
  let shots = 0;
  let goals = 0;
  for (const e of events) {
    if (e?.t === "shot") shots++;
    if (e?.t === "goal") goals++;
  }
  return { shots, goals, conversion: shots > 0 ? goals / shots : null };
}

// Buts décisifs : égalisation OU but final (score final atteint)
export function computeDecisiveGoals(payload: MatchPayload) {
  const events = (payload.events ?? []).filter((e) => e?.t === "goal") as GoalEvent[];
  let a = 0,
    b = 0;
  const decisive: GoalEvent[] = [];
  for (const e of events) {
    if (e.team === "A") a++;
    else b++;
    if (a === b || a === payload.scoreA || b === payload.scoreB) decisive.push(e);
  }
  return decisive;
}

// Impact penalty : dernier penalty enregistré (best-effort)
export function computePenaltyImpact(payload: MatchPayload) {
  const events = (payload.events ?? []).filter((e) => e?.t === "penalty") as PenaltyEvent[];
  if (!events.length) return null;
  const last = events[events.length - 1];
  return { decisive: true, scored: last.scored, team: last.team, scorerId: last.scorerId ?? null };
}

// Temps forts : bursts (>=2 buts dans une fenêtre)
export function computeMomentum(events: any[], windowMs = 20000) {
  const goals = events.filter((e) => e?.t === "goal") as GoalEvent[];
  const moments: Array<{ from: number; to: number; count: number }> = [];
  for (let i = 0; i < goals.length; i++) {
    let count = 1,
      j = i + 1;
    while (j < goals.length && goals[j].at - goals[i].at <= windowMs) {
      count++;
      j++;
    }
    if (count >= 2) moments.push({ from: goals[i].at, to: goals[j - 1].at, count });
  }
  return moments;
}
