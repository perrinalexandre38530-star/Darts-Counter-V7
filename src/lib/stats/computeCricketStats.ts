// ============================================
// src/lib/stats/computeCricketStats.ts
// Calcul stats Cricket rapide (lite + fallback payload minimal)
// ============================================

import { History } from "../history";

export type CricketAgg = {
  kind: "cricket";
  matches: number;
  legs: number;
  marks: number;
  points: number;
  marksPerLeg: number;
  pointsPerLeg: number;
  updatedAt: number;
};

function isCricket(rec: any) {
  const k = String(rec?.kind ?? rec?.game?.mode ?? rec?.payload?.mode ?? rec?.payload?.config?.mode ?? "")
    .toLowerCase();
  return k === "cricket" || k.includes("cricket");
}

export async function computeCricketStats(profileId?: string | null): Promise<CricketAgg> {
  const pid = profileId ? String(profileId) : "";
  const rows = await History.listFinished();

  let matches = 0;
  let legs = 0;
  let marks = 0;
  let points = 0;

  for (const r0 of rows as any[]) {
    if (!r0) continue;
    if (!isCricket(r0)) continue;

    if (pid) {
      const players = (r0.players || r0.payload?.players || []) as any[];
      const has = Array.isArray(players) && players.some((p) => String(p?.id) === pid);
      if (!has) continue;
    }

    matches++;

    const summary = r0?.summary ?? r0?.payload?.summary ?? null;

    // si ton moteur met déjà des chiffres
    legs += Number(summary?.legs ?? 0) || 0;
    marks += Number(summary?.marks ?? summary?.totalMarks ?? 0) || 0;
    points += Number(summary?.points ?? summary?.totalPoints ?? 0) || 0;

    // fallback ultra léger : si payload.players[].legStats existe (injecté par history.upsert)
    if ((!marks && !points) || legs === 0) {
      const pl = r0?.payload?.players;
      if (Array.isArray(pl)) {
        for (const p of pl) {
          const ls = p?.legStats;
          if (ls && typeof ls === "object") {
            marks += Number(ls?.marks ?? 0) || 0;
            points += Number(ls?.points ?? 0) || 0;
          }
        }
      }
    }
  }

  const legsSafe = legs || 0;
  return {
    kind: "cricket",
    matches,
    legs: legsSafe,
    marks,
    points,
    marksPerLeg: legsSafe ? marks / legsSafe : 0,
    pointsPerLeg: legsSafe ? points / legsSafe : 0,
    updatedAt: Date.now(),
  };
}
