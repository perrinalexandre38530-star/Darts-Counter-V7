/**
 * V123: read-only selectors over the canonical X01 projection.
 * IMPORTANT: no History, IndexedDB, React, name-based matching, or implicit zeros.
 */
import type { CanonicalX01IndexV2 } from './x01CanonicalIndexV2.ts';
import type { NormalizedX01Match, NormalizedX01Participant } from './normalizeX01HistoryRecord.ts';

export type X01ExitGroup = 'simple' | 'double' | 'master' | 'unknown';
export type X01Metric = { value: number | null; eligible: number; excluded: number; points: number; darts: number };
export type X01ProfileView = {
  profileId: string;
  totalMatches: number;
  reference501DO: number;
  referenceCurrentMatches: number;
  referenceLifetime: X01Metric;
  referenceCurrent: X01Metric;
  exitModes: Record<X01ExitGroup, { matches: number; avg3d: X01Metric; avgFinish: number | null; finishSamples: number }>;
};

type Observation = { match: NormalizedX01Match; player: NormalizedX01Participant };

function avg3d(rows: Observation[]): X01Metric {
  let points = 0;
  let darts = 0;
  let eligible = 0;
  for (const { player } of rows) {
    if (player.darts === null || !Number.isFinite(player.darts) || player.darts <= 0 ||
        player.points === null || !Number.isFinite(player.points) || player.points < 0) continue;
    eligible += 1;
    points += player.points;
    darts += player.darts;
  }
  return { value: darts > 0 ? points * 3 / darts : null,
    eligible, excluded: rows.length - eligible, points, darts };
}

function exitMode(rows: Observation[]) {
  const finishes = rows.map(({ player }) => player.bestCheckout).filter((x): x is number => x !== null && Number.isFinite(x) && x > 0);
  return {
    matches: rows.length,
    avg3d: avg3d(rows),
    avgFinish: finishes.length ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null,
    finishSamples: finishes.length,
  };
}

export function selectCanonicalX01ProfileV3(index: CanonicalX01IndexV2, profileId: string): X01ProfileView {
  const observations: Observation[] = [];
  for (const match of index.matches) {
    if (match.status !== 'finished' && match.status !== 'completed' && match.status !== 'done' && match.status !== 'ended') continue;
    // An individual match should never contribute the same profile twice.
    const perMatch = match.participants.filter((p) => p.canonicalProfileId === profileId);
    if (!perMatch.length) continue;
    // Multiple legacy player slots can resolve to one profile. Count the match
    // once. Do not add their darts/points (that would double score the match).
    // When exactly one slot has usable telemetry it is safe to use that slot;
    // when several have conflicting telemetry, retain an unknown metric.
    const usable = perMatch.filter((p) => p.darts !== null && p.darts > 0 && p.points !== null && p.points >= 0);
    const compatible = usable.length > 1 && usable.every((p) => p.points === usable[0].points && p.darts === usable[0].darts);
    const player = usable.length === 1 || compatible ? usable[0] : perMatch.length === 1 ? perMatch[0] : {
      ...perMatch[0], darts: null, points: null, avg3d: null,
      bestCheckout: null, bestVisit: null,
    };
    observations.push({ match, player });
  }
  const reference = observations.filter(({ match }) => match.startScore === 501 && match.outMode === 'double');
  const current = reference.slice().sort((a,b) => (b.match.date - a.match.date) || b.match.matchId.localeCompare(a.match.matchId)).slice(0, 10);
  const exitModes = {} as X01ProfileView['exitModes'];
  for (const mode of ['simple', 'double', 'master', 'unknown'] as const) {
    exitModes[mode] = exitMode(observations.filter(({ match }) => match.outMode === mode));
  }
  return { profileId, totalMatches: observations.length, reference501DO: reference.length,
    referenceCurrentMatches: current.length, referenceLifetime: avg3d(reference),
    referenceCurrent: avg3d(current), exitModes };
}
