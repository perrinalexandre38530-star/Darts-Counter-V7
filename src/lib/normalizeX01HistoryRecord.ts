import { getX01StatsContext, type X01InModeKey, type X01OutModeKey, type X01StartScoreKey, type X01VariantKey } from "./x01StatsContext.ts";
import { historicalParticipantId, resolveX01CanonicalIdentity, type X01IdentityResolverOptions, type X01ResolvedIdentity } from "./x01IdentityResolver.ts";

export type X01SourceSchema = "modern" | "quick" | "legacy" | "legacy_compact" | "unknown";
export type X01TelemetryQuality = "exact" | "partial" | "summary_only" | "unknown";

export type NormalizedX01Participant = X01ResolvedIdentity & {
  name: string;
  darts: number | null;
  points: number | null;
  avg3d: number | null;
  hitsS: number | null;
  hitsD: number | null;
  hitsT: number | null;
  bull25: number | null;
  bull50: number | null;
  misses: number | null;
  bestVisit: number | null;
  bestCheckout: number | null;
  win: boolean | null;
};

export type NormalizedX01Match = {
  matchId: string;
  date: number;
  status: string;
  startScore: X01StartScoreKey | null;
  inMode: X01InModeKey;
  outMode: X01OutModeKey;
  variant: X01VariantKey;
  sourceSchema: X01SourceSchema;
  telemetryQuality: X01TelemetryQuality;
  participants: NormalizedX01Participant[];
};

const text = (v: unknown): string => String(v ?? "").trim();
const finite = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function isX01HistoryRecord(record: any): boolean {
  const values = [
    record?.kind,
    record?.mode,
    record?.game?.mode,
    record?.payload?.mode,
    record?.payload?.game,
    record?.summary?.kind,
    record?.summary?.mode,
  ]
    .map((v) => text(v).toLowerCase())
    .filter(Boolean);
  return values.some((v) => v.includes("x01"));
}

function isQuickRecord(record: any): boolean {
  const payload = record?.payload || {};
  const config = payload?.config || record?.config || record?.resume?.config || {};
  const summary = record?.summary || {};
  return (
    record?.quickParty === true ||
    payload?.quickParty === true ||
    config?.quickParty === true ||
    summary?.quickParty === true ||
    text(record?.partyMode).toLowerCase() === "quick" ||
    text(payload?.partyMode).toLowerCase() === "quick" ||
    text(config?.partyMode).toLowerCase() === "quick"
  );
}

function sourceSchema(record: any): X01SourceSchema {
  if (isQuickRecord(record)) return "quick";
  const ctx = getX01StatsContext(record);
  if (ctx.startScore && ctx.outMode !== "unknown" && (record?.game || record?.payload?.config)) return "modern";
  if (record?.schemaVersion === 4 || record?.summary?.compact || record?.compact) return "legacy_compact";
  if (record?.kind || record?.mode || record?.summary) return "legacy";
  return "unknown";
}

function firstArray(...values: any[]): any[] {
  for (const value of values) if (Array.isArray(value) && value.length) return value;
  return [];
}

function participantsSource(record: any): any[] {
  // The historical participant list is authoritative for membership.
  const explicit = firstArray(
    record?.players,
    record?.payload?.players,
    record?.payload?.config?.players,
    record?.resume?.config?.players,
    record?.config?.players
  );
  if (explicit.length) return explicit;

  const summary = record?.summary || {};
  const perPlayer = Array.isArray(summary?.perPlayer) ? summary.perPlayer : [];
  if (perPlayer.length) return perPlayer;

  const rankings = Array.isArray(summary?.rankings) ? summary.rankings : [];
  return rankings;
}

function uniqueHistoricalParticipants(rows: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    const id = historicalParticipantId(row) || `__slot_${i}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function findStatObject(record: any, participant: any): any {
  const summary = record?.summary || {};
  const ids = [
    historicalParticipantId(participant),
    text(participant?.id),
    text(participant?.playerId),
    text(participant?.profileId),
    text(participant?.pid),
    text(participant?.sideId),
  ].filter(Boolean);

  const detailed = summary?.detailedByPlayer;
  if (detailed && typeof detailed === "object" && !Array.isArray(detailed)) {
    for (const id of ids) if (detailed[id]) return detailed[id];
  }

  const perPlayer = Array.isArray(summary?.perPlayer) ? summary.perPlayer : [];
  for (const row of perPlayer) {
    const rid = historicalParticipantId(row);
    if (rid && ids.includes(rid)) return row;
  }

  const players = summary?.players;
  if (players && typeof players === "object" && !Array.isArray(players)) {
    for (const id of ids) if (players[id]) return players[id];
  }

  return participant;
}

function bestCheckoutFor(record: any, ids: string[], stats: any): number | null {
  const map = record?.summary?.bestCheckoutByPlayer;
  if (map && typeof map === "object") {
    for (const id of ids) {
      const value = finite(map[id]);
      if (value !== null) return Math.max(0, value);
    }
  }
  const direct = finite(stats?.bestCheckout ?? stats?.checkout ?? stats?.co);
  return direct === null ? null : Math.max(0, direct);
}

function normalizeParticipant(record: any, participant: any, options: X01IdentityResolverOptions): NormalizedX01Participant {
  const identity = resolveX01CanonicalIdentity(participant, record, options);
  const stats = findStatObject(record, participant) || {};
  const ids = [identity.historicalPlayerId, text(participant?.id), text(participant?.playerId), text(participant?.profileId)].filter(Boolean);
  const darts = finite(stats?.darts ?? stats?.dartsThrown);
  let points = finite(stats?.points ?? stats?.pointsScored);
  let avg3d = finite(stats?.avg3D ?? stats?.avg3 ?? stats?.avgVisit ?? record?.summary?.avg3ByPlayer?.[identity.historicalPlayerId]);
  if (points === null && darts !== null && darts > 0 && avg3d !== null && avg3d >= 0) points = (avg3d * darts) / 3;
  if (avg3d === null && points !== null && darts !== null && darts > 0) avg3d = (points / darts) * 3;

  const hits = stats?.hits || stats?.hitSummary || {};
  const winnerId = text(record?.winnerId ?? record?.summary?.winnerId);
  const winner = winnerId ? ids.includes(winnerId) : null;

  return {
    ...identity,
    name: text(participant?.name ?? participant?.displayName ?? stats?.name ?? "Joueur"),
    darts,
    points,
    avg3d,
    hitsS: finite(hits?.S ?? stats?.hitsS),
    hitsD: finite(hits?.D ?? stats?.hitsD),
    hitsT: finite(hits?.T ?? stats?.hitsT),
    bull25: finite(hits?.SBull ?? hits?.B25 ?? stats?.bull ?? stats?.bull25),
    bull50: finite(hits?.DBull ?? hits?.B50 ?? stats?.dBull ?? stats?.dbull ?? stats?.bull50),
    misses: finite(hits?.MISS ?? hits?.M ?? stats?.miss ?? stats?.misses),
    bestVisit: finite(stats?.bestVisit ?? stats?.bestVisitScore),
    bestCheckout: bestCheckoutFor(record, ids, stats),
    win: winner,
  };
}

function telemetryQuality(participants: NormalizedX01Participant[]): X01TelemetryQuality {
  if (!participants.length) return "unknown";
  const exact = participants.every((p) => p.darts !== null && p.points !== null && p.hitsS !== null && p.hitsD !== null && p.hitsT !== null);
  if (exact) return "exact";
  const partial = participants.some((p) => p.darts !== null || p.points !== null || p.avg3d !== null || p.hitsS !== null || p.bestVisit !== null);
  if (partial) return "partial";
  return "summary_only";
}

export function normalizeX01HistoryRecord(
  record: any,
  options: X01IdentityResolverOptions = {}
): NormalizedX01Match | null {
  if (!isX01HistoryRecord(record)) return null;
  const context = getX01StatsContext(record);
  const participants = uniqueHistoricalParticipants(participantsSource(record)).map((participant) =>
    normalizeParticipant(record, participant, options)
  );
  return {
    matchId: text(record?.matchId ?? record?.id),
    date: Number(record?.finishedAt ?? record?.updatedAt ?? record?.createdAt ?? 0) || 0,
    status: text(record?.status || "finished").toLowerCase() || "finished",
    startScore: context.startScore,
    inMode: context.inMode,
    outMode: context.outMode,
    variant: context.variant,
    sourceSchema: sourceSchema(record),
    telemetryQuality: telemetryQuality(participants),
    participants,
  };
}
