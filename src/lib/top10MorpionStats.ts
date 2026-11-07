/** Statistiques TOP 10 / MORPION dérivées uniquement de parties History V4 terminées.
 * Aucune mutation des records, aucun stockage ni requête réseau. */
export type Top10MorpionMode = "top_10" | "tic_tac_toe";
export type GameStat = { id: string; date: number; score: number; visits: number; bestVisit: number; visitScores: number[]; wins: number; cases: number; marks: number };
export type Top10MorpionStats = {
  games: number; competitiveGames: number; knownCompetitiveGames: number; soloGames: number; victories: number; defeats: number; draws: number; unknownResults: number; totalPoints: number; averagePointsPerVisit: number | null;
  bestGame: number | null; bestVisit: number | null; visits: number; documentedVisits: number; darts: number;
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
  // Les scores de volée doivent être des points entiers entre 0 et 180.
  return Array.isArray(row) && row.length <= 10 &&
    row.every((v: unknown) => finite(v) !== null && Number.isInteger(Number(v)) && Number(v) <= 180)
    ? row.map(Number) : [];
}
/** Ne jamais transformer une volée legacy sans score détaillé en volée à zéro. */
function recordedVisitScore(visit: any): number | null {
  const direct = finite(visit?.score ?? visit?.points);
  if (direct !== null && Number.isInteger(direct) && direct <= 180) return direct;
  const darts = arr(visit?.darts);
  if (!darts.length || darts.some((d: any) => finite(d?.score) === null)) return null;
  const sum = darts.reduce((total: number, dart: any) => total + Number(dart.score), 0);
  return Number.isInteger(sum) && sum <= 180 ? sum : null;
}
/** Résultat compétitif historique : ne jamais assimiler l'absence de winnerId à un nul.
 * Les variantes anciennes peuvent avoir les scores définitifs sans winnerId. */
type CompetitiveOutcome = { kind: "winner"; winnerId: string } | { kind: "draw" } | { kind: "unknown" };
function outcomeOf(r: any, mode: Top10MorpionMode): CompetitiveOutcome {
  const players = arr(r?.players);
  if (players.length < 2) return { kind: "unknown" };
  const ids = players.map(pId);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) return { kind: "unknown" };
  const explicit = String(r?.winnerId ?? r?.summary?.winnerId ?? "").trim();
  if (explicit && ids.includes(explicit)) return { kind: "winner", winnerId: explicit };
  if (r?.summary?.draw === true || r?.summary?.isDraw === true || r?.result === "draw") return { kind: "draw" };

  const topVisits = arr(r?.payload?.visitScores);
  const morpionWins = arr(r?.payload?.matchWins);
  // Priorité aux véritables données définitives. Aucun score manquant n'est inventé.
  let scores: number[] | null = null;
  if (mode === "top_10" && topVisits.length === ids.length &&
      topVisits.every((line: any) => Array.isArray(line) && line.length === 10 &&
        line.every((v: any) => finite(v) !== null && Number(v) <= 180))) {
    scores = topVisits.map((line: any[]) => line.reduce((sum: number, n: any) => sum + Number(n), 0));
  } else if (mode === "tic_tac_toe" && morpionWins.length === ids.length &&
      morpionWins.every((n: any) => finite(n) !== null && Number.isInteger(Number(n)))) {
    scores = morpionWins.map(Number);
  } else if (obj(r?.summary?.finalScores) &&
      ids.every(id => finite(r.summary.finalScores[id]) !== null)) {
    scores = ids.map(id => Number(r.summary.finalScores[id]));
  } else if (players.every(p => finite(p?.score) !== null)) {
    scores = players.map(p => Number(p.score));
  }
  if (!scores) return { kind: "unknown" };
  const best = Math.max(...scores);
  const leaders = ids.filter((_, i) => scores![i] === best);
  return leaders.length === 1 ? { kind: "winner", winnerId: leaders[0] } : { kind: "draw" };
}
function snapshotOf(r: any, playerId: string, mode: Top10MorpionMode): GameStat | null {
  const people = arr(r?.players);
  const index = people.findIndex(p => pId(p) === playerId);
  if (index < 0) return null;
  const p = people[index];
  const own = readVisits(r).filter((v: any) => String(v?.playerId ?? v?.profileId ?? "") === playerId);
  // Le score final officiel prime sur un champ players[].score ancien ou non mis à jour.
  const finalScore = finite(r?.summary?.finalScores?.[playerId]);
  const playerScore = finite(p?.score);
  const board = r?.payload?.grid;
  const owners = arr(board?.owners);
  const marks = arr(board?.marks);
  const cases = owners.filter(v => v === index).length;
  const markCount = marks.reduce((sum: number, line: any) => sum + (finite(arr(line)[index]) ?? 0), 0);
  const scores = mode === "top_10" ? playerScores(r, index) : [];
  const telemetryScore = finite(r?.summary?.perPlayer?.[playerId]?.total);
  const visitScores = scores.length ? scores : mode === "top_10"
    ? own.map(recordedVisitScore).filter((n): n is number => n !== null) : [];
  // Un record "sur 10 volées" ne peut pas être calculé depuis un tableau partiel.
  // Pour les anciennes parties, préférer summary.finalScores à players[].score.
  const score = mode === "top_10"
    ? scores.length === 10 ? scores.reduce((a, b) => a + b, 0)
      : finalScore ?? telemetryScore ?? playerScore ?? (scores.length ? scores.reduce((a, b) => a + b, 0) : 0)
    : finite(r?.payload?.matchWins?.[index]) ?? finalScore ?? playerScore ?? 0;
  return {
    id: String(r?.matchId ?? r?.id ?? ""), date: timestamp(r?.finishedAt ?? r?.updatedAt ?? r?.createdAt),
    score, visits: mode === "top_10" ? (scores.length || own.length) : own.length,
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
    games: selected.length, competitiveGames: 0, knownCompetitiveGames: 0, soloGames: 0, victories: 0, defeats: 0, draws: 0, unknownResults: 0, totalPoints: 0, averagePointsPerVisit: null,
    bestGame: null, bestVisit: null, visits: 0, documentedVisits: 0, darts: 0, visits100: 0, visits140: 0,
    roundsWon: 0, lastGridCases: null, lastGridMarks: null, recent: selected.map(x => x.stat).slice(-12),
  };
  // Une moyenne ne doit porter que sur les volées dont le score est connu.
  // Les records legacy peuvent fournir un total final sans le détail des volées.
  let observedVisitPoints = 0;
  let observedVisitCount = 0;
  for (const { record: r, stat } of selected) {
    // Un winnerId absent n'est pas une preuve de nul. Les parties legacy
    // sont départagées seulement si leurs scores finaux sont exploitables.
    const competitive = arr(r?.players).length > 1;
    if (competitive) {
      totals.competitiveGames++;
      const outcome = outcomeOf(r, mode);
      if (outcome.kind === "unknown") totals.unknownResults++;
      else {
        totals.knownCompetitiveGames++;
        if (outcome.kind === "draw") totals.draws++;
        else if (outcome.winnerId === String(playerId)) totals.victories++;
        else totals.defeats++;
      }
    } else totals.soloGames++;
    totals.visits += stat.visits;
    if (mode === "top_10") totals.documentedVisits += stat.visitScores.length;
    const own = readVisits(r).filter((v: any) => String(v?.playerId ?? v?.profileId ?? "") === String(playerId));
    totals.darts += own.reduce((n: number, v: any) => n + arr(v?.darts).length, 0);
    if (mode === "top_10") {
      observedVisitPoints += stat.visitScores.reduce((total, points) => total + points, 0);
      observedVisitCount += stat.visitScores.length;
      totals.totalPoints += stat.score;
      totals.bestGame = Math.max(totals.bestGame ?? 0, stat.score);
      if (stat.visitScores.length) totals.bestVisit = Math.max(totals.bestVisit ?? 0, stat.bestVisit);
      totals.visits100 += stat.visitScores.filter(s => s >= 100).length;
      totals.visits140 += stat.visitScores.filter(s => s >= 140).length;
    } else {
      totals.roundsWon += stat.wins;
    }
  }
  if (mode === "top_10" && observedVisitCount > 0) {
    totals.averagePointsPerVisit = observedVisitPoints / observedVisitCount;
  }
  if (mode === "tic_tac_toe" && selected.length) {
    const last = selected[selected.length - 1].stat;
    totals.lastGridCases = last.cases;
    totals.lastGridMarks = last.marks;
  }
  return totals;
}
