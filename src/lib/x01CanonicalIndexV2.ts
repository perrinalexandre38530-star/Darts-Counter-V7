import type { X01IdentityResolverOptions } from "./x01IdentityResolver.ts";
import { normalizeX01HistoryRecord, type NormalizedX01Match, type NormalizedX01Participant } from "./normalizeX01HistoryRecord.ts";

export type CanonicalX01ProfileAggregate = {
  canonicalProfileId: string;
  allMatches: number;
  legacyUnknownMatches: number;
  reference501DOMatches: number;
  lifetime501DOAvg3D: number;
  current501DOAvg3D: number;
  current501DOMatches: number;
  byOut: Record<"simple" | "double" | "master", {
    matches: number;
    darts: number;
    points: number;
    avg3D: number;
    finishes: number;
    finishTotal: number;
    avgFinish: number;
  }>;
};

export type CanonicalX01IndexV2 = {
  version: 2;
  builtAt: number;
  sourceHistoryCount: number;
  x01MatchCount: number;
  matches: NormalizedX01Match[];
  profiles: Record<string, CanonicalX01ProfileAggregate>;
};

const weightedAvg = (rows: Array<{ darts: number | null; points: number | null; avg3d: number | null }>): number => {
  let darts = 0;
  let points = 0;
  let fallbackSum = 0;
  let fallbackCount = 0;
  for (const row of rows) {
    if (row.darts !== null && row.darts > 0 && row.points !== null && row.points >= 0) {
      darts += row.darts;
      points += row.points;
    } else if (row.avg3d !== null && row.avg3d >= 0) {
      fallbackSum += row.avg3d;
      fallbackCount += 1;
    }
  }
  if (darts > 0) return (points / darts) * 3;
  return fallbackCount ? fallbackSum / fallbackCount : 0;
};

function participantRows(matches: NormalizedX01Match[], profileId: string): Array<{ match: NormalizedX01Match; player: NormalizedX01Participant }> {
  const out: Array<{ match: NormalizedX01Match; player: NormalizedX01Participant }> = [];
  for (const match of matches) {
    for (const player of match.participants) {
      if (player.canonicalProfileId === profileId) out.push({ match, player });
    }
  }
  return out;
}

function aggregateProfile(matches: NormalizedX01Match[], profileId: string): CanonicalX01ProfileAggregate {
  const rows = participantRows(matches, profileId);
  const reference = rows.filter(({ match }) => match.startScore === 501 && match.outMode === "double");
  const current = reference.slice().sort((a, b) => a.match.date - b.match.date).slice(-10);
  const empty = () => ({ matches: 0, darts: 0, points: 0, avg3D: 0, finishes: 0, finishTotal: 0, avgFinish: 0 });
  const byOut: CanonicalX01ProfileAggregate["byOut"] = { simple: empty(), double: empty(), master: empty() };

  for (const mode of ["simple", "double", "master"] as const) {
    const scoped = rows.filter(({ match }) => match.outMode === mode);
    const values = scoped.map(({ player }) => player);
    const finishes = values.map((p) => p.bestCheckout).filter((v): v is number => v !== null && v > 0);
    const darts = values.reduce((sum, p) => sum + (p.darts ?? 0), 0);
    const points = values.reduce((sum, p) => sum + (p.points ?? 0), 0);
    const finishTotal = finishes.reduce((sum, value) => sum + value, 0);
    byOut[mode] = {
      matches: scoped.length,
      darts,
      points,
      avg3D: weightedAvg(values),
      finishes: finishes.length,
      finishTotal,
      avgFinish: finishes.length ? finishTotal / finishes.length : 0,
    };
  }

  return {
    canonicalProfileId: profileId,
    allMatches: rows.length,
    legacyUnknownMatches: rows.filter(({ match }) => match.outMode === "unknown").length,
    reference501DOMatches: reference.length,
    lifetime501DOAvg3D: weightedAvg(reference.map(({ player }) => player)),
    current501DOAvg3D: weightedAvg(current.map(({ player }) => player)),
    current501DOMatches: current.length,
    byOut,
  };
}

export function buildCanonicalX01IndexFromNormalizedMatchesV2(
  normalizedMatches: NormalizedX01Match[],
  sourceHistoryCount: number
): CanonicalX01IndexV2 {
  const matches = normalizedMatches.slice().sort((a, b) => a.date - b.date);
  const profileIds = new Set<string>();
  for (const match of matches) {
    for (const player of match.participants) if (player.canonicalProfileId) profileIds.add(player.canonicalProfileId);
  }
  const profiles: Record<string, CanonicalX01ProfileAggregate> = {};
  for (const profileId of profileIds) profiles[profileId] = aggregateProfile(matches, profileId);
  return { version: 2, builtAt: Date.now(), sourceHistoryCount, x01MatchCount: matches.length, matches, profiles };
}

export function buildCanonicalX01IndexV2(
  historyRecords: any[],
  options: X01IdentityResolverOptions = {}
): CanonicalX01IndexV2 {
  const matches = historyRecords
    .map((record) => normalizeX01HistoryRecord(record, options))
    .filter((value): value is NormalizedX01Match => !!value);
  return buildCanonicalX01IndexFromNormalizedMatchesV2(matches, historyRecords.length);
}
