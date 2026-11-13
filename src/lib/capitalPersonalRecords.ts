/**
 * CAPITAL V160 — records personnels à partir des SEULES volées réelles de matches
 * terminés et dédoublonnés. Aucun record individuel n'est déduit d'une moyenne
 * cumulée, d'un classement ou d'une saisie de score sans historique de volées.
 */
export type CapitalPersonalMatch = {
  record: any;
  row: any;
  variantId: string;
  variantLabel: string;
};

export type CapitalContractRecord = {
  id: string;
  attempts: number;
  successes: number;
  failures: number;
  successRate: number;
  bestCredited: number | null;
  bestCreditedAt: number | null;
  bestCreditedVariant: string | null;
  bestCreditedRound: number | null;
  totalCredited: number;
  bestGain: number | null;
  bestGainAt: number | null;
};

export type CapitalPersonalSummary = {
  gamesWithVisits: number;
  contractsAttempted: number;
  contractsSucceeded: number;
  bestGain: { value: number; contractId: string; variantLabel: string; at: number; round: number } | null;
  bestStreak: { value: number; variantLabel: string; at: number } | null;
  bestPeak: { value: number; variantLabel: string; at: number } | null;
  contracts: CapitalContractRecord[];
};

const clean = (value: unknown) => String(value ?? "").trim();
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const dateOf = (record: any) => {
  const v = Number(record?.summary?.finishedAt ?? record?.payload?.summary?.finishedAt ?? record?.updatedAt ?? record?.createdAt);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const visitsOf = (record: any): any[] => {
  // Un même journal est souvent répliqué dans summary/payload/stats : une seule lecture.
  const pools = [record?.payload?.stats?.visits, record?.payload?.summary?.visits,
    record?.summary?.visits, record?.payload?.visits, record?.visits];
  return pools.find(Array.isArray) || [];
};
const idsOf = (row: any, wantedId: string) => new Set(
  [row?.id, row?.playerId, row?.profileId, row?.pid, wantedId]
    .map(clean).filter(Boolean),
);

/** `matches` doit être produit par capitalCompletedMatches pour exclure checkpoints et doublons. */
export function buildCapitalPersonalRecords(matches: CapitalPersonalMatch[], wantedId: string): CapitalPersonalSummary {
  const result: CapitalPersonalSummary = {
    gamesWithVisits: 0, contractsAttempted: 0, contractsSucceeded: 0,
    bestGain: null, bestStreak: null, bestPeak: null, contracts: [],
  };
  const map = new Map<string, CapitalContractRecord>();
  for (const match of matches || []) {
    if (!match?.record || !match?.row) continue;
    // Ne pas décerner un record depuis une partie déclarée incohérente.
    if (match.record?.summary?.capitalIntegrity?.verified === false ||
        match.record?.payload?.capitalIntegrity?.verified === false) continue;
    const ids = idsOf(match.row, wantedId);
    if (!ids.size) continue;
    const source = visitsOf(match.record);
    // Une seule volée par manche et joueur : le journal de partie fait autorité.
    const perRound = new Map<string, any>();
    for (const visit of source) {
      if (!ids.has(clean(visit?.playerId))) continue;
      const round = Number(visit?.contractIndex);
      if (!Number.isInteger(round) || round < 0) continue;
      const contractId = clean(visit?.contractId);
      if (!contractId || (visit?.success !== true && visit?.success !== false)) continue;
      perRound.set(String(round), visit);
    }
    if (!perRound.size) continue;
    result.gamesWithVisits++;
    const at = dateOf(match.record);
    const ordered = [...perRound.values()].sort((a, b) => Number(a.contractIndex) - Number(b.contractIndex));
    let streak = 0;
    let previousRound: number | null = null;
    for (const visit of ordered) {
      // Une manche absente rompt la série : ne pas inventer une réussite continue.
      if (previousRound !== null && Number(visit.contractIndex) !== previousRound + 1) streak = 0;
      previousRound = Number(visit.contractIndex);
      const id = clean(visit.contractId);
      const isOpening = id === "capital";
      const round = Number(visit.contractIndex) + 1;
      if (finite(visit.scoreAfter) && (!result.bestPeak || visit.scoreAfter > result.bestPeak.value)) {
        result.bestPeak = { value: visit.scoreAfter, variantLabel: match.variantLabel, at };
      }
      if (isOpening) { streak = 0; continue; }
      result.contractsAttempted++;
      const success = visit.success === true;
      if (success) result.contractsSucceeded++;
      streak = success ? streak + 1 : 0;
      if (streak && (!result.bestStreak || streak > result.bestStreak.value)) {
        result.bestStreak = { value: streak, variantLabel: match.variantLabel, at };
      }
      const old = map.get(id) || {
        id, attempts: 0, successes: 0, failures: 0, successRate: 0,
        bestCredited: null, bestCreditedAt: null, bestCreditedVariant: null, bestCreditedRound: null,
        totalCredited: 0, bestGain: null, bestGainAt: null,
      } as CapitalContractRecord;
      old.attempts++;
      if (success) old.successes++;
      else old.failures++;
      // Le gain du contrat n'est PAS le total brut de la volée.
      const credited = success && finite(visit.visitScore) &&
        (visit.bonusPoints === undefined || finite(visit.bonusPoints))
        ? visit.visitScore + (visit.bonusPoints ?? 0) : null;
      if (credited !== null && credited >= 0) {
        old.totalCredited += credited;
        if (old.bestCredited === null || credited > old.bestCredited) {
          old.bestCredited = credited;
          old.bestCreditedAt = at || null;
          old.bestCreditedVariant = match.variantLabel;
          old.bestCreditedRound = round;
        }
      }
      // delta réel = variation stockée, ou différence vérifiable scoreAfter/Before.
      const delta = finite(visit.scoreAfter) && finite(visit.scoreBefore)
        ? visit.scoreAfter - visit.scoreBefore : (finite(visit.delta) ? visit.delta : null);
      if (success && delta !== null && delta >= 0) {
        if (old.bestGain === null || delta > old.bestGain) {
          old.bestGain = delta;
          old.bestGainAt = at || null;
        }
        if (!result.bestGain || delta > result.bestGain.value) {
          result.bestGain = { value: delta, contractId: id, variantLabel: match.variantLabel, at, round };
        }
      }
      map.set(id, old);
    }
  }
  result.contracts = [...map.values()].map((stat) => ({ ...stat,
    successRate: stat.attempts ? Math.round(stat.successes / stat.attempts * 1000) / 10 : 0,
  })).sort((a, b) => b.attempts - a.attempts || b.successes - a.successes || a.id.localeCompare(b.id));
  return result;
}
