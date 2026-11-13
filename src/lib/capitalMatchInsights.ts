/**
 * CAPITAL V159 — bilan de partie établi exclusivement depuis les volées validées.
 * Aucune valeur n'est inférée d'une volée manquante ; la grille et l'ordre des
 * contrats viennent de la configuration enregistrée avec la partie.
 */
export type CapitalInsightPlayer = { id?: string | number; name?: string; nickname?: string; color?: string };
export type CapitalInsightVisit = {
  playerId: string | number; contractIndex: number; contractId?: string;
  scoreAfter: number; scoreBefore: number; delta: number; success: boolean;
  penaltyLost?: number; visitScore?: number;
};
export type CapitalInsightMoment = {
  playerId: string; playerName: string; round: number; contractId: string;
  amount: number; scoreAfter: number;
};
export type CapitalInsightPoint = { round: number; contractId: string; values: Array<number | null> };
export type CapitalMatchInsights = {
  timeline: CapitalInsightPoint[];
  bestGain: CapitalInsightMoment | null;
  biggestLoss: CapitalInsightMoment | null;
  lastLeadChange: { round: number; contractId: string; playerName: string; playerId: string } | null;
  longestStreak: { playerId: string; playerName: string; count: number } | null;
  mostSuccessful: { playerId: string; playerName: string; count: number } | null;
  maxCapital: { playerId: string; playerName: string; value: number } | null;
  completedRounds: number;
};
const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
const num = (n: unknown) => finite(n) ? Number(n) : 0;

export function buildCapitalMatchInsights(
  players: CapitalInsightPlayer[], contracts: string[], visits: CapitalInsightVisit[],
): CapitalMatchInsights {
  const people = (players || []).map((person, i) => ({
    id: String(person?.id ?? i), name: String(person?.nickname || person?.name || `Joueur ${i + 1}`),
  }));
  const rounds = Array.isArray(contracts) ? contracts : [];
  const latest = new Map<string, CapitalInsightVisit>();
  for (const visit of Array.isArray(visits) ? visits : []) {
    const index = Number(visit?.contractIndex);
    if (!Number.isInteger(index) || index < 0 || index >= rounds.length || !finite(visit?.scoreAfter)) continue;
    if (!people.some((player) => player.id === String(visit.playerId))) continue;
    latest.set(`${String(visit.playerId)}:${index}`, visit);
  }
  // Les points d'ouverture sont de vraies données (scoreBefore du premier contrat),
  // et non un capital supposé. La valeur null signale l'absence d'enregistrement.
  const startValues = people.map((p) => {
    const opening = latest.get(`${p.id}:0`);
    return opening && finite(opening.scoreBefore) ? Number(opening.scoreBefore) : null;
  });
  const timeline: CapitalInsightPoint[] = [{ round: 0, contractId: "start", values: startValues }];
  let completedRounds = 0;
  let priorUniqueLeader: string | null = null;
  let lastLeadChange: CapitalMatchInsights["lastLeadChange"] = null;
  for (let i = 0; i < rounds.length; i++) {
    const values = people.map((p) => {
      const visit = latest.get(`${p.id}:${i}`);
      return visit ? num(visit.scoreAfter) : null;
    });
    timeline.push({ round: i + 1, contractId: rounds[i], values });
    // Un leader ne peut être déclaré que si TOUS les joueurs ont joué le tour.
    if (values.some((v) => v === null) || !values.length) continue;
    completedRounds++;
    const best = Math.max(...values as number[]);
    const winners = people.filter((_, idx) => values[idx] === best);
    if (winners.length !== 1) continue; // égalité = pas de changement décisif
    const leader = winners[0];
    if (priorUniqueLeader !== null && priorUniqueLeader !== leader.id) {
      lastLeadChange = { round: i + 1, contractId: rounds[i], playerName: leader.name, playerId: leader.id };
    }
    priorUniqueLeader = leader.id;
  }

  let bestGain: CapitalInsightMoment | null = null;
  let biggestLoss: CapitalInsightMoment | null = null;
  let maxCapital: CapitalMatchInsights["maxCapital"] = null;
  let longestStreak: CapitalMatchInsights["longestStreak"] = null;
  let mostSuccessful: CapitalMatchInsights["mostSuccessful"] = null;
  for (const p of people) {
    let streak = 0;
    let count = 0;
    for (let i = 0; i < rounds.length; i++) {
      const visit = latest.get(`${p.id}:${i}`);
      if (!visit) { streak = 0; continue; }
      if (!maxCapital || num(visit.scoreAfter) > maxCapital.value) {
        maxCapital = { playerId: p.id, playerName: p.name, value: num(visit.scoreAfter) };
      }
      if (visit.contractId === "capital" || rounds[i] === "capital") continue;
      const delta = num(visit.delta);
      const moment: CapitalInsightMoment = {
        playerId: p.id, playerName: p.name, round: i + 1,
        contractId: rounds[i], amount: delta, scoreAfter: num(visit.scoreAfter),
      };
      if (delta > 0 && (!bestGain || delta > bestGain.amount)) bestGain = moment;
      if (delta < 0 && (!biggestLoss || delta < biggestLoss.amount)) biggestLoss = moment;
      if (visit.success === true) { streak++; count++; } else streak = 0;
      if (!longestStreak || streak > longestStreak.count) {
        longestStreak = { playerId: p.id, playerName: p.name, count: streak };
      }
    }
    if (!mostSuccessful || count > mostSuccessful.count) {
      mostSuccessful = { playerId: p.id, playerName: p.name, count };
    }
  }
  return { timeline, bestGain, biggestLoss, lastLeadChange, longestStreak,
    mostSuccessful, maxCapital, completedRounds };
}

/** Résumé compact ; ne duplique pas les volées déjà conservées dans History V4. */
export function capitalMatchHighlights(insights: CapitalMatchInsights) {
  return {
    version: 1, completedRounds: insights.completedRounds,
    bestGain: insights.bestGain, biggestLoss: insights.biggestLoss,
    lastLeadChange: insights.lastLeadChange, longestStreak: insights.longestStreak,
    mostSuccessful: insights.mostSuccessful, maxCapital: insights.maxCapital,
  };
}
