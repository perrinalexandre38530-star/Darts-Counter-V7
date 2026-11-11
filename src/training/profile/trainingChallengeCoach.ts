/** Awena / Centre d'entraînement — analyses locales Challenge.
 * Ne lit ni l'Historique compétitif, ni les classements en ligne.
 * Les comparaisons ne sont autorisées qu'à fiche ET configuration de règles identiques.
 */
import type { ChallengeTrainingPreset } from '../catalog/challengeTrainingCatalog';
import type { TrainingDetailedSession } from '../stats/trainingStatsHub';

const RULE_KEYS = [
  'exerciseType', 'target', 'rule', 'visits', 'clockIncludeBull', 'clockScoreMode',
  'halfItStartScore', 'sequenceObjectives', 'sequenceScoreMode', 'groupingMin',
  'groupingMax', 'groupingHits', 'doublesBonusTarget', 'doublesTargets',
  'doublesTargetMode', 'catalogChallengeId', 'catalogLine', 'catalogVariant',
  'catalogRounds', 'catalogTarget', 'catalogStep', 'catalogMin', 'catalogMax',
  'catalogLives', 'catalogSeed',
] as const;

export type ChallengeCoachSession = Pick<TrainingDetailedSession,
  'id' | 'modeId' | 'participantId' | 'endedAt' | 'points' | 'config' | 'metrics'>;

function clampPercent(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function challengeSessionPerformance(row: ChallengeCoachSession): number | null {
  return clampPercent(row.metrics?.trainingPerformancePct ?? row.metrics?.exerciseValidationRate);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, canonical(nested)]));
  }
  return value;
}

export function challengeRulesFingerprint(config: Record<string, unknown> | undefined): string {
  if (!config) return '';
  return JSON.stringify(RULE_KEYS.map((key) => [key, canonical(config[key] ?? null)]));
}

function relevantRows(presetId: string, rows: readonly ChallengeCoachSession[], participantId?: string) {
  return rows.filter((row) => row.modeId === 'training_challenges'
    && row.config?.trainingOrigin === 'training_lab'
    && row.config?.trainingCatalogPresetId === presetId
    && (participantId === undefined || row.participantId === participantId))
    .sort((a, b) => (Number(b.endedAt) || 0) - (Number(a.endedAt) || 0));
}

export type ChallengeComparableSummary = {
  attempts: number;
  comparableAttempts: number;
  comparisonExcluded: number;
  latest: number | null;
  previous: number | null;
  delta: number | null;
  best: number | null;
  latestPoints: number | null;
  latestAt: number | null;
  rulesKey: string | null;
};

/** Compares the latest valid session with the previous valid session under exactly the same rules.
 * Missing telemetry remains missing; no synthetic percentages are generated.
 */
export function summarizeComparableChallengeSessions(
  presetId: string, rows: readonly ChallengeCoachSession[], participantId?: string,
): ChallengeComparableSummary {
  const all = relevantRows(presetId, rows, participantId);
  const latestRow = all.find((row) => challengeSessionPerformance(row) !== null && row.config);
  if (!latestRow) return {
    attempts: all.length, comparableAttempts: 0, comparisonExcluded: all.length,
    latest: null, previous: null, delta: null, best: null,
    latestPoints: null, latestAt: null, rulesKey: null,
  };
  const key = challengeRulesFingerprint(latestRow.config);
  const same = all.filter((row) => challengeRulesFingerprint(row.config) === key
    && challengeSessionPerformance(row) !== null);
  const latest = challengeSessionPerformance(same[0]);
  const previous = same.length > 1 ? challengeSessionPerformance(same[1]) : null;
  return {
    attempts: all.length,
    comparableAttempts: same.length,
    comparisonExcluded: all.length - same.length,
    latest, previous,
    delta: latest !== null && previous !== null ? latest - previous : null,
    best: same.length ? Math.max(...same.map((row) => challengeSessionPerformance(row)!)) : null,
    latestPoints: Number.isFinite(Number(same[0].points)) ? Number(same[0].points) : null,
    latestAt: Number(same[0].endedAt) || null,
    rulesKey: key,
  };
}

export type ChallengeCoachRecommendation = {
  preset: ChallengeTrainingPreset;
  reason: string;
  kind: 'consolider' | 'progresser' | 'decouvrir';
  currentPct: number | null;
  trend: number | null;
};

export function buildChallengeTrainingRecommendations(
  catalog: readonly ChallengeTrainingPreset[], rows: readonly ChallengeCoachSession[], participantId: string,
  limit = 3,
): ChallengeCoachRecommendation[] {
  if (!participantId) return [];
  const safeLimit = Math.max(1, Math.min(5, Math.trunc(limit) || 3));
  const scored = catalog.filter((preset) => preset.status !== 'planned' && (preset.minPlayers || 1) === 1)
    .map((preset) => ({ preset, summary: summarizeComparableChallengeSessions(preset.id, rows, participantId) }));
  const attempted = scored.filter((item) => item.summary.latest !== null);
  // Arcade score/streak modes report an observed success index, not a universal 100 % goal.
  // Only the classic presets declare comparable validation thresholds.
  const below = attempted.filter((item) => !item.preset.arcadeId && item.summary.latest! < item.preset.successValidationPct)
    .sort((a, b) => (a.summary.latest! - a.preset.successValidationPct) - (b.summary.latest! - b.preset.successValidationPct));
  const result: ChallengeCoachRecommendation[] = [];
  const add = (item: typeof scored[number], kind: ChallengeCoachRecommendation['kind'], reason: string) => {
    if (result.some((row) => row.preset.id === item.preset.id)) return;
    result.push({ preset: item.preset, kind, reason, currentPct: item.summary.latest, trend: item.summary.delta });
  };
  if (below.length) {
    const item = below[0];
    add(item, 'consolider', `Dernier indice ${Math.round(item.summary.latest!)} %, sous l'objectif de ${item.preset.successValidationPct} %${item.summary.comparableAttempts > 1 ? ' à règles identiques' : ''}.`);
  } else if (attempted.length) {
    const item = [...attempted].sort((a, b) => (a.summary.delta ?? 0) - (b.summary.delta ?? 0)
      || (a.summary.latest ?? 101) - (b.summary.latest ?? 101))[0];
    add(item, 'progresser', `Rejouer avec les mêmes réglages pour confirmer l’indice observé de ${Math.round(item.summary.latest!)} %.`);
  }
  // Prefer a solo first step in an unvisited family, without treating unplayed as a weakness.
  const triedFamilies = new Set(attempted.map((row) => row.preset.family));
  const discovery = scored.filter((item) => item.summary.attempts === 0)
    .sort((a, b) => Number(triedFamilies.has(a.preset.family)) - Number(triedFamilies.has(b.preset.family))
      || (a.preset.difficulty ?? 3) - (b.preset.difficulty ?? 3)
      || a.preset.title.localeCompare(b.preset.title, 'fr'));
  for (const item of discovery) {
    if (result.length >= safeLimit) break;
    add(item, 'decouvrir', triedFamilies.has(item.preset.family)
      ? 'Nouvel exercice pour varier les gestes dans une famille connue.'
      : `Découverte de la famille ${item.preset.family.toUpperCase()}, sans données précédentes.`);
  }
  for (const item of attempted.slice().sort((a, b) => (a.summary.latest ?? 101) - (b.summary.latest ?? 101))) {
    if (result.length >= safeLimit) break;
    add(item, 'progresser', 'Continuer à mesurer cet exercice avec les mêmes règles.');
  }
  return result.slice(0, safeLimit);
}
