/** Statistiques TOP 10 / MORPION dérivées uniquement de parties History V4 terminées.
 * Aucune mutation des records, aucun stockage ni requête réseau. */
export type Top10MorpionMode = "top_10" | "tic_tac_toe";
export type GameStat = { id: string; date: number; score: number; visits: number; bestVisit: number; visitScores: number[]; wins: number; cases: number; marks: number };
export type Top10MorpionStats = {
  games: number; competitiveGames: number; soloGames: number; victories: number; draws: number; totalPoints: number; averagePointsPerVisit: number | null;
  bestGame: number | null; bestVisit: number | null; visits: number; darts: number;
  visits100: number; visits140: number; roundsWon: number;
  lastGridCases: number | null; lastGridMarks: number | null; recent: GameStat[];
};
const obj = (v: any): v is Record<string, any> => v !== null && typeof v === "object" && !Array.isArray(v);
const arr = (v: any): any[] => Array.isArray(v) ? v : [];
const finite = (v: any): number | null => {
  if (typeof v !== "number" && (typeof v !== "string" || !v.trim())) return null;
  const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null;
};
const timestamp = (v: any): number => {
  const n = finite(v); if (n !== null) return n;
  if (typeof v === "string") { const parsed = Date.parse(v); return Number.isFinite(parsed) ? parsed : 0; }
  return 0;
};
const pId = (p: any): string => String(p?.id ?? p?.profileId ?? p?.playerId ?? "");
const modeOf = (r: any): string => String(r?.mode ?? r?.kind ?? r?.game?.mode ?? r?.payload?.mode ?? r?.resume?.modeId ?? "").toLowerCase();
function isFinished(r: any): boolean {
  // Un snapshot actif ne doit jamais gonfler les statistiques, même avec un summary ancien.
  if (r?.status != null) return r.status === "finished";
  return r?.summary?.finished === true;
}
function readVisits(r: any): any[] {
  // Ces champs sont des alias d'une même source; ne jamais les concaténer.
  const payload = r?.payload || {};
  return arr(payload.visits).length ? payload.visits : arr(payload.visitHistory).length ? payload.visitHistory : arr(payload.events);
}
function playerScores(r: any, playerIndex: number): number[] {
  const row = r?.payload?.visitScores?.[playerIndex];
  return Array.isArray(row) && row.every((v: unknown) => finite(v) !== null && Number(v) <= 180)
    ? row.map(Number) : [];
}
function snapshotOf(r: any, playerId: string, mode: Top10MorpionMode): GameStat | null {
  const people = arr(r?.players);
  const index = people.findIndex(p => pId(p) === playerId);
  if (index < 0) return null;
  const p = people[index];
  const own = readVisits(r).filter((v: any) => String(v?.playerId ?? v?.profileId ?? "") === playerId);
  const scoreFromPlayer = finite(p?.score) ?? finite(r?.summary?.finalScores?.[playerId]) ?? 0;
  const board = r?.payload?.grid;
  const owners = arr(board?.owners);
  const marks = arr(board?.marks);
  const cases = owners.filter(v => v === index).length;
  const markCount = marks.reduce((sum: number, line: any) => sum + (finite(arr(line)[index]) ?? 0), 0);
  const scores = mode === "top_10" ? playerScores(r, index) : [];
  const telemetryScore = finite(r?.summary?.perPlayer?.[playerId]?.total);
  const visitScores = scores.length ? scores : mode === "top_10" ? own.map((v: any) => finite(v?.score) ??
    arr(v?.darts).reduce((sum: number, d: any) => sum + (finite(d?.score) ?? 0), 0)) : [];
  const score = mode === "top_10"
    ? scores.length ? scores.reduce((a, b) => a + b, 0) : telemetryScore ?? scoreFromPlayer
    : finite(r?.payload?.matchWins?.[index]) ?? scoreFromPlayer;
  return {
    id: String(r?.matchId ?? r?.id ?? ""), date: timestamp(r?.finishedAt ?? r?.updatedAt ?? r?.createdAt),
    score, visits: mode === "top_10" ? visitScores.length : own.length,
    bestVisit: Math.max(0, ...visitScores), visitScores,
    wins: mode === "tic_tac_toe" ? score : 0, cases, marks: markCount,
  };
}
export function computeTop10MorpionStats(records: any[], playerId: string, mode: Top10MorpionMode): Top10MorpionStats {
  // Dédupliquer les snapshots de la même partie; garder le résultat final le plus récent.
  const byMatch = new Map<string, any>();
  for (const [index, r] of arr(records).entries()) {
    if (!obj(r) || modeOf(r) !== mode || !isFinished(r)) continue;
    const key = String(r.matchId ?? r.id ?? `record-${index}`);
    const old = byMatch.get(key);
    if (!old || timestamp(r.updatedAt ?? r.finishedAt) >= timestamp(old.updatedAt ?? old.finishedAt)) byMatch.set(key, r);
  }
  const selected: Array<{ record: any; stat: GameStat }> = [];
  for (const r of byMatch.values()) {
    const stat = snapshotOf(r, String(playerId), mode);
    if (stat) selected.push({record:r, stat});
  }
  selected.sort((a, b) => a.stat.date - b.stat.date);
  const totals: Top10MorpionStats = {
    games: selected.length, competitiveGames: 0, soloGames: 0, victories: 0, draws: 0, totalPoints: 0, averagePointsPerVisit: null,
    bestGame: null, bestVisit: null, visits: 0, darts: 0, visits100: 0, visits140: 0,
    roundsWon: 0, lastGridCases: null, lastGridMarks: null, recent: selected.map(x => x.stat).slice(-12),
  };
  for (const { record: r, stat } of selected) {
    const winner = String(r.winnerId ?? r.summary?.winnerId ?? "");
    // En entraînement solo, une partie terminée n’est pas une victoire compétitive.
    const competitive = arr(r?.players).length > 1;
    if (competitive) {
      totals.competitiveGames++;
      if (winner === String(playerId)) totals.victories++;
      if (!winner) totals.draws++;
    } else totals.soloGames++;
    totals.visits += stat.visits;
    const own = readVisits(r).filter((v: any) => String(v?.playerId ?? v?.profileId ?? "") === String(playerId));
    totals.darts += own.reduce((n: number, v: any) => n + arr(v?.darts).length, 0);
    if (mode === "top_10") {
      totals.totalPoints += stat.score;
      totals.bestGame = Math.max(totals.bestGame ?? 0, stat.score);
      if (stat.visitScores.length) totals.bestVisit = Math.max(totals.bestVisit ?? 0, stat.bestVisit);
      totals.visits100 += stat.visitScores.filter(s => s >= 100).length;
      totals.visits140 += stat.visitScores.filter(s => s >= 140).length;
    } else {
      totals.roundsWon += stat.wins;
    }
  }
  if (mode === "top_10" && totals.visits > 0) totals.averagePointsPerVisit = totals.totalPoints / totals.visits;
  if (mode === "tic_tac_toe" && selected.length) {
    const last = selected[selected.length - 1].stat;
    totals.lastGridCases = last.cases;
    totals.lastGridMarks = last.marks;
  }
  return totals;
}
