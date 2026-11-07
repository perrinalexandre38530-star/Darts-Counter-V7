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
  // Données historiques détaillées récupérables sans toucher au match.
  bySegmentS: Record<string, number> | null;
  bySegmentD: Record<string, number> | null;
  bySegmentT: Record<string, number> | null;
  legsWon: number | null;
  setsWon: number | null;
  rank: number | null;
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
  const perPlayer = Array.isArray(summary?.perPlayer)
    ? summary.perPlayer
    : summary?.perPlayer && typeof summary.perPlayer === "object"
      ? Object.entries(summary.perPlayer).map(([id, value]) => ({ ...(value as any), id: (value as any)?.id ?? id }))
      : [];
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
    text(participant?.id), text(participant?.playerId),
    text(participant?.profileId), text(participant?.pid), text(participant?.sideId),
  ].filter(Boolean);

  // Certain exports anciens contiennent un perPlayer indexé par playerId,
  // d'autres un tableau. Le bloc détaillé peut être incomplet : on fusionne
  // les SOURCES DU MÊME JOUEUR, sans croiser les identités.
  const candidates: any[] = [participant];
  const take = (collection: any) => {
    if (!collection || typeof collection !== "object") return;
    if (Array.isArray(collection)) {
      const row = collection.find((item: any) => item && ids.includes(historicalParticipantId(item)));
      if (row) candidates.push(row);
    } else {
      for (const id of ids) if (collection[id] && typeof collection[id] === "object") {
        candidates.push(collection[id]);
        break;
      }
    }
  };
  take(summary?.players);
  take(summary?.perPlayer);
  take(summary?.detailedByPlayer);
  // Plus documenté en dernier ; les valeurs nulles n'écrasent jamais les
  // statistiques valides de l'ancienne structure.
  const merged: Record<string, any> = {};
  for (const item of candidates) {
    for (const [key, value] of Object.entries(item || {})) {
      if (value !== null && value !== undefined && value !== "") merged[key] = value;
    }
  }
  return merged;
}

function segmentMap(value: any): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const n = finite(raw);
    if (n !== null && n >= 0 && Number.isInteger(n)) out[key] = n;
  }
  return Object.keys(out).length ? out : null;
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
  if (darts !== null && darts > 0 && avg3d !== null && avg3d >= 0) {
    const impliedPoints = (avg3d * darts) / 3;
    // In legacy X01, `points` may be the team/match total or the cumulative
    // score across legs whereas `avg3` and `darts` describe this participant.
    // A huge discrepancy MUST NOT turn a 35 AVG3D into an impossible 80 AVG3D.
    // We reconstruct the mathematically implied points from the saved AVG3D,
    // only when the two explicitly saved measurements contradict each other.
    if (points === null || Math.abs(points - impliedPoints) > Math.max(6, impliedPoints * 0.1)) {
      points = impliedPoints;
    }
  }
  if (avg3d === null && points !== null && darts !== null && darts > 0) avg3d = (points / darts) * 3;

  const hits = (stats?.hits && typeof stats.hits === "object") ? stats.hits : (stats?.hitSummary || {});
  const segmentStats = stats?.bySegment || stats?.segments || {};
  const detail = record?.summary?.detailedByPlayer?.[identity.historicalPlayerId] || {};
  const buckets = detail?.bySegment || detail?.segments || {};
  const winnerId = text(record?.winnerId ?? record?.summary?.winnerId);
  const winner = winnerId ? ids.includes(winnerId) : null;

  return {
    ...identity,
    name: text(participant?.name ?? participant?.displayName ?? stats?.name ?? "Joueur"),
    darts,
    points,
    avg3d,
    hitsS: finite(hits?.S ?? stats?.hitsS ?? stats?.singles ?? stats?.singleHits),
    hitsD: finite(hits?.D ?? stats?.hitsD ?? stats?.doubles ?? stats?.doubleHits),
    hitsT: finite(hits?.T ?? stats?.hitsT ?? stats?.triples ?? stats?.tripleHits),
    bull25: finite(hits?.SBull ?? hits?.B25 ?? stats?.bull ?? stats?.bull25),
    bull50: finite(hits?.DBull ?? hits?.B50 ?? stats?.dBull ?? stats?.dbull ?? stats?.bull50),
    misses: finite(hits?.MISS ?? hits?.M ?? stats?.miss ?? stats?.misses),
    bestVisit: finite(stats?.bestVisit ?? stats?.bestVisitScore),
    bestCheckout: bestCheckoutFor(record, ids, stats),
    bySegmentS: segmentMap(stats?.bySegmentS ?? segmentStats?.S ?? buckets?.S),
    bySegmentD: segmentMap(stats?.bySegmentD ?? segmentStats?.D ?? buckets?.D),
    bySegmentT: segmentMap(stats?.bySegmentT ?? segmentStats?.T ?? buckets?.T),
    legsWon: finite(stats?.legsWon),
    setsWon: finite(stats?.setsWon),
    rank: finite(stats?.rank ?? stats?.position),
    win: typeof stats?.win === "boolean" ? stats.win : typeof stats?.winner === "boolean" ? stats.winner : winner,
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
