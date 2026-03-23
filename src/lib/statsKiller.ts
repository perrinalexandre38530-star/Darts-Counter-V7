// @ts-nocheck
// =============================================================
// src/lib/statsKiller.ts
// Agrégateur KILLER robuste + alias compat UI + fallbacks legacy
// =============================================================

export type KillerStatsAgg = {
  played: number;
  wins: number;
  winRate: number;
  lastAt: number;
  lastPlayedAt: number;

  killsTotal: number;
  killsAvg: number;
  deathsTotal: number;
  deathsAvg: number;
  dartsTotal: number;
  dartsAvg: number;
  totalHits: number;

  livesTakenTotal: number;
  livesLostTotal: number;
  livesDeltaTotal: number;

  autoKillsTotal: number;
  autoKillsAvg: number;
  selfPenaltyHitsTotal: number;
  selfPenaltyHitsAvg: number;
  livesStolenTotal: number;
  livesStolenAvg: number;
  livesHealedTotal: number;
  livesHealedAvg: number;
  disarmsTriggeredTotal: number;
  disarmsTriggeredAvg: number;
  disarmsReceivedTotal: number;
  shieldBreaksTotal: number;
  shieldHalfBreaksTotal: number;
  resurrectionsGivenTotal: number;
  resurrectionsGivenAvg: number;
  resurrectionsReceivedTotal: number;

  offensiveThrowsTotal: number;
  killerThrowsTotal: number;
  uselessHitsTotal: number;
  rearmThrowsTotal: number;
  precisionOffensive: number;
  precisionKiller: number;
  rearmAvgThrows: number;

  hitsBySegmentAgg: Record<string, number>;
  hitsByNumberAgg: Record<string, number>;
  favSegment: string;
  favSegmentHits: number;
  favNumber: number;
  favNumberHits: number;

  placements: Record<string, number>;
  podiums: number;
  firsts: number;
  seconds: number;
  thirds: number;
  recentPlacements: Array<{ when: number; rank: number; totalPlayers: number }>;

  totalMatches: number;
  totalWins: number;
  totalKills: number;
  avgKills: number;
  totalDarts: number;
  avgDarts: number;
  deaths: number;
  avgDeaths: number;
  matches: number;
  winsCount: number;
  kills: number;
  darts: number;
};

function safeStr(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v);
}
function numOr0(...vals: any[]): number {
  for (const v of vals) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
function truthy(v: any): boolean {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  const s = safeStr(v).trim().toLowerCase();
  return ["true", "1", "yes", "oui", "on"].includes(s);
}
function pickId(obj: any): string {
  if (!obj) return "";
  return safeStr(obj.profileId || obj.playerId || obj.pid || obj.id || obj._id || obj.uid || "");
}
function getRecTimestamp(rec: any): number {
  return numOr0(
    rec?.updatedAt,
    rec?.finishedAt,
    rec?.createdAt,
    rec?.ts,
    rec?.date,
    rec?.summary?.updatedAt,
    rec?.summary?.finishedAt,
    rec?.summary?.createdAt,
    rec?.payload?.updatedAt,
    rec?.payload?.finishedAt,
    rec?.payload?.createdAt,
    rec?.payload?.ts,
    rec?.payload?.summary?.updatedAt,
    rec?.payload?.summary?.finishedAt,
    rec?.payload?.summary?.createdAt,
  ) || 0;
}
function isKillerRecord(rec: any): boolean {
  const kind = rec?.kind || rec?.summary?.kind || rec?.payload?.kind || rec?.payload?.summary?.kind;
  const mode = rec?.mode || rec?.summary?.mode || rec?.payload?.mode || rec?.payload?.summary?.mode;
  const game = rec?.payload?.game || rec?.summary?.game?.mode || rec?.summary?.game?.game;
  return kind === "killer" || mode === "killer" || game === "killer";
}
function extractSummary(rec: any): any {
  return rec?.summary || rec?.payload?.summary || rec?.payload?.payload?.summary || null;
}
function extractPlayersArray(rec: any): any[] {
  const summary = extractSummary(rec);
  const arr =
    (Array.isArray(rec?.players) && rec.players) ||
    (Array.isArray(rec?.payload?.players) && rec.payload.players) ||
    (Array.isArray(summary?.players) && summary.players) ||
    (Array.isArray(rec?.payload?.summary?.players) && rec.payload.summary.players) ||
    [];
  return Array.isArray(arr) ? arr : [];
}
function extractPerPlayer(summary: any): Record<string, any> {
  if (!summary) return {};
  if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") return summary.detailedByPlayer as any;
  const out: Record<string, any> = {};
  const arr1 = Array.isArray(summary.perPlayer) ? summary.perPlayer : [];
  const arr2 = Array.isArray(summary.players) ? summary.players : [];
  const arr = arr1.length ? arr1 : arr2;
  for (const p of arr) {
    const pid = pickId(p);
    if (!pid) continue;
    out[pid] = p;
  }
  if (!Object.keys(out).length && summary.players && typeof summary.players === "object" && !Array.isArray(summary.players)) {
    for (const [pid, p] of Object.entries(summary.players)) out[String(pid)] = p as any;
  }
  return out;
}
function extractUnifiedStatsPlayer(rec: any, playerId: string): any {
  const players = rec?.payload?.stats?.players;
  if (!Array.isArray(players)) return null;
  return players.find((p: any) => String(p?.id || p?.playerId || p?.profileId) === String(playerId)) || null;
}
function parseSegmentKeyToNumber(segKey: string): number {
  const k = safeStr(segKey).toUpperCase().trim();
  if (!k || k === "MISS") return 0;
  if (["SB", "DB", "BULL", "DBULL"].includes(k)) return 25;
  const m = k.match(/^([SDT])?(\d{1,2})$/);
  if (!m) return 0;
  const n = Number(m[2]);
  return n >= 1 && n <= 20 ? n : 0;
}
function addHitsMap(target: Record<string, number>, src: any) {
  if (!src || typeof src !== "object") return;
  for (const [k0, v0] of Object.entries(src)) {
    const k = safeStr(k0).toUpperCase().trim();
    const c = numOr0(v0);
    if (!k || k === "MISS" || c <= 0) continue;
    target[k] = (target[k] || 0) + c;
  }
}
function addHitsByNumberIntoSegments(target: Record<string, number>, src: any) {
  if (!src || typeof src !== "object") return;
  for (const [k0, v0] of Object.entries(src)) {
    const n = numOr0(k0);
    const c = numOr0(v0);
    if (!n || c <= 0) continue;
    target[String(n)] = (target[String(n)] || 0) + c;
  }
}
function toHitsByNumber(hitsBySegment: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const [seg, c] of Object.entries(hitsBySegment || {})) {
    const n = parseSegmentKeyToNumber(seg);
    if (n <= 0) continue;
    out[String(n)] = (out[String(n)] || 0) + numOr0(c);
  }
  return out;
}
function bestKey(map: Record<string, number>) {
  let key = "";
  let value = 0;
  for (const [k, v0] of Object.entries(map || {})) {
    const v = numOr0(v0);
    if (v > value) {
      key = k;
      value = v;
    }
  }
  return { key, value };
}
function sumHitsCandidate(...sources: any[]): number {
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    let s = 0;
    let ok = false;
    for (const v of Object.values(src)) {
      const n = numOr0(v);
      if (n > 0) ok = true;
      s += n;
    }
    if (ok && s > 0) return s;
  }
  return 0;
}
function pickRank(me: any, sp: any, winnerId: string, playerId: string, totalPlayers: number, ranking: any[] = []): number {
  const direct = numOr0(
    me?.finalRank, me?.rank, me?.placement, me?.place, me?.position,
    sp?.finalRank, sp?.rank, sp?.placement, sp?.place, sp?.position,
  );
  if (direct > 0) return direct;
  const fromRanking = Array.isArray(ranking)
    ? ranking.find((r: any) => String(r?.playerId || r?.profileId || r?.id) === String(playerId))
    : null;
  if (numOr0(fromRanking?.rank, fromRanking?.placement, fromRanking?.place, fromRanking?.position) > 0) {
    return numOr0(fromRanking?.rank, fromRanking?.placement, fromRanking?.place, fromRanking?.position);
  }
  if (winnerId && String(winnerId) === String(playerId)) return 1;
  if (truthy(me?.eliminated) || truthy(sp?.eliminated)) {
    const fallback = numOr0(me?.eliminationRank, sp?.eliminationRank);
    if (fallback > 0) return fallback;
    if (totalPlayers > 1) return totalPlayers;
  }
  return 0;
}

export function computeKillerStatsAggForProfile(records: any[], playerId: string): KillerStatsAgg {
  const list = (Array.isArray(records) ? records : []).filter((r) => isKillerRecord(r));
  let played = 0, wins = 0, lastAt = 0;
  let killsTotal = 0, deathsTotal = 0, dartsTotal = 0;
  let livesTakenTotal = 0, livesLostTotal = 0;
  let autoKillsTotal = 0, selfPenaltyHitsTotal = 0, livesStolenTotal = 0, livesHealedTotal = 0;
  let disarmsTriggeredTotal = 0, disarmsReceivedTotal = 0, shieldBreaksTotal = 0, shieldHalfBreaksTotal = 0;
  let resurrectionsGivenTotal = 0, resurrectionsReceivedTotal = 0;
  let offensiveThrowsTotal = 0, killerThrowsTotal = 0, uselessHitsTotal = 0, rearmThrowsTotal = 0;
  const hitsBySegmentAgg: Record<string, number> = {};
  const placements: Record<string, number> = {};
  const recentPlacements: Array<{ when: number; rank: number; totalPlayers: number }> = [];

  for (const rec of list) {
    const summary = extractSummary(rec);
    const per = extractPerPlayer(summary);
    const playersArr = extractPlayersArray(rec);
    const statPlayer = extractUnifiedStatsPlayer(rec, playerId);
    const contains = playersArr.some((p: any) => String(pickId(p)) === String(playerId)) || !!per?.[playerId] || !!statPlayer;
    if (!contains) continue;

    const when = getRecTimestamp(rec);
    if (when > lastAt) lastAt = when;
    played += 1;

    const winnerId = safeStr(rec?.winnerId || summary?.winnerId || rec?.payload?.winnerId || rec?.payload?.summary?.winnerId || rec?.payload?.stats?.global?.winnerId || "");

    const me = per?.[playerId] || null;
    const sp = playersArr.find((p: any) => String(pickId(p)) === String(playerId)) || null;
    const special = statPlayer?.special || null;
    const dartsBlock = statPlayer?.darts || null;
    const ranking = summary?.ranking || rec?.payload?.summary?.ranking || [];
    const totalPlayers = playersArr.length || Object.keys(per || {}).length || numOr0(summary?.playerCount, rec?.payload?.stats?.players?.length, 0);

    const rank = pickRank(me, sp, winnerId, playerId, totalPlayers, ranking);
    if ((winnerId && winnerId === String(playerId)) || rank === 1 || truthy(me?.win) || truthy(sp?.win) || truthy(statPlayer?.win)) wins += 1;

    killsTotal += numOr0(me?.kills, me?.killCount, me?.k, special?.kills, sp?.kills, sp?.killCount, sp?.k);
    deathsTotal += numOr0(me?.deaths, me?.deathCount, sp?.deaths, sp?.deathCount, truthy(me?.eliminated) ? 1 : null, truthy(sp?.eliminated) ? 1 : null, truthy(statPlayer?.eliminated) ? 1 : null);
    dartsTotal += numOr0(me?.totalThrows, me?.throws, me?.darts, dartsBlock?.thrown, sp?.totalThrows, sp?.throws, sp?.darts, me?.totalDarts, sp?.totalDarts);

    livesTakenTotal += numOr0(me?.livesTaken, me?.damageDealt, me?.dmgDealt, special?.livesTaken, sp?.livesTaken, sp?.damageDealt, sp?.dmgDealt);
    livesLostTotal += numOr0(me?.livesLost, me?.damageTaken, me?.dmgTaken, special?.livesLost, sp?.livesLost, sp?.damageTaken, sp?.dmgTaken);

    autoKillsTotal += numOr0(me?.autoKills, me?.auto_kills, special?.autoKills, sp?.autoKills, sp?.auto_kills);
    selfPenaltyHitsTotal += numOr0(me?.selfPenaltyHits, me?.self_penalty_hits, me?.selfHits, me?.hitsOnSelf, special?.selfPenaltyHits, sp?.selfPenaltyHits, sp?.self_penalty_hits, sp?.selfHits, sp?.hitsOnSelf);
    livesStolenTotal += numOr0(me?.livesStolen, me?.lives_stolen, special?.livesStolen, sp?.livesStolen, sp?.lives_stolen);
    livesHealedTotal += numOr0(me?.livesHealed, me?.lives_healed, special?.livesHealed, sp?.livesHealed, sp?.lives_healed);
    disarmsTriggeredTotal += numOr0(me?.disarmsTriggered, me?.disarms_triggered, special?.disarmsTriggered, sp?.disarmsTriggered, sp?.disarms_triggered);
    disarmsReceivedTotal += numOr0(me?.disarmsReceived, me?.disarms_received, special?.disarmsReceived, sp?.disarmsReceived, sp?.disarms_received);
    shieldBreaksTotal += numOr0(me?.shieldBreaks, me?.shield_breaks, special?.shieldBreaks, sp?.shieldBreaks, sp?.shield_breaks);
    shieldHalfBreaksTotal += numOr0(me?.shieldHalfBreaks, me?.shield_half_breaks, special?.shieldHalfBreaks, sp?.shieldHalfBreaks, sp?.shield_half_breaks);
    resurrectionsGivenTotal += numOr0(me?.resurrectionsGiven, me?.resurrections_given, special?.resurrectionsGiven, sp?.resurrectionsGiven, sp?.resurrections_given);
    resurrectionsReceivedTotal += numOr0(me?.resurrectionsReceived, me?.resurrections_received, special?.resurrectionsReceived, sp?.resurrectionsReceived, sp?.resurrections_received);
    offensiveThrowsTotal += numOr0(me?.offensiveThrows, me?.offensiveDarts, special?.offensiveThrows, sp?.offensiveThrows, sp?.offensiveDarts);
    killerThrowsTotal += numOr0(me?.killerThrows, me?.killerDarts, special?.killerThrows, me?.killerHits, dartsBlock?.hits, sp?.killerThrows, sp?.killerDarts, sp?.killerHits);
    uselessHitsTotal += numOr0(me?.uselessHits, special?.uselessHits, sp?.uselessHits);
    rearmThrowsTotal += numOr0(me?.throwsToBecomeKiller, me?.rearmThrows, sp?.throwsToBecomeKiller, sp?.rearmThrows);

    addHitsMap(hitsBySegmentAgg, me?.hitsBySegment || me?.hits_by_segment || me?.hits || me?.segments);
    addHitsMap(hitsBySegmentAgg, sp?.hitsBySegment || sp?.hits_by_segment || sp?.hits || sp?.segments);
    addHitsByNumberIntoSegments(hitsBySegmentAgg, me?.hitsByNumber || me?.hits_by_number);
    addHitsByNumberIntoSegments(hitsBySegmentAgg, sp?.hitsByNumber || sp?.hits_by_number);
    const byPlayerMap = summary?.hitsBySegmentByPlayer || summary?.hits_by_segment_by_player || rec?.payload?.summary?.hitsBySegmentByPlayer || null;
    if (byPlayerMap?.[playerId]) addHitsMap(hitsBySegmentAgg, byPlayerMap[playerId]);
    const byPlayerNumMap = summary?.hitsByNumberByPlayer || summary?.hits_by_number_by_player || rec?.payload?.summary?.hitsByNumberByPlayer || null;
    if (byPlayerNumMap?.[playerId]) addHitsByNumberIntoSegments(hitsBySegmentAgg, byPlayerNumMap[playerId]);

    const inferredHits = sumHitsCandidate(me?.hitsBySegment, me?.hits_by_segment, me?.hitsByNumber, me?.hits_by_number, sp?.hitsBySegment, sp?.hits_by_segment, sp?.hitsByNumber, sp?.hits_by_number);
    if (!inferredHits && numOr0(dartsBlock?.hits) > 0) {
      hitsBySegmentAgg["TOTAL"] = (hitsBySegmentAgg["TOTAL"] || 0) + numOr0(dartsBlock?.hits);
    }

    if (rank > 0) {
      placements[String(rank)] = (placements[String(rank)] || 0) + 1;
      recentPlacements.push({ when, rank, totalPlayers });
    }
  }

  const hitsByNumberAgg = toHitsByNumber(hitsBySegmentAgg);
  const favSeg = bestKey(Object.fromEntries(Object.entries(hitsBySegmentAgg).filter(([k]) => k !== "TOTAL")) as any);
  const favNum = bestKey(hitsByNumberAgg);
  let totalHits = Object.entries(hitsBySegmentAgg).reduce((s: number, [k, v]: any) => s + (k === "TOTAL" ? 0 : numOr0(v)), 0);
  if (totalHits <= 0) totalHits = Object.values(hitsByNumberAgg).reduce((s: number, v: any) => s + numOr0(v), 0);
  if (totalHits <= 0) totalHits = killerThrowsTotal || offensiveThrowsTotal || 0;
  const precisionOffensive = offensiveThrowsTotal > 0 ? (totalHits / offensiveThrowsTotal) * 100 : 0;
  const precisionKiller = killerThrowsTotal > 0 ? (killsTotal / killerThrowsTotal) * 100 : 0;
  const rearmAvgThrows = played > 0 ? rearmThrowsTotal / played : 0;
  const firsts = numOr0(placements["1"]);
  const seconds = numOr0(placements["2"]);
  const thirds = numOr0(placements["3"]);
  const podiums = firsts + seconds + thirds;
  const winRate = played > 0 ? (wins / played) * 100 : 0;
  const killsAvg = played > 0 ? killsTotal / played : 0;
  const deathsAvg = played > 0 ? deathsTotal / played : 0;
  const dartsAvg = played > 0 ? dartsTotal / played : 0;
  const autoKillsAvg = played > 0 ? autoKillsTotal / played : 0;
  const selfPenaltyHitsAvg = played > 0 ? selfPenaltyHitsTotal / played : 0;
  const livesStolenAvg = played > 0 ? livesStolenTotal / played : 0;
  const livesHealedAvg = played > 0 ? livesHealedTotal / played : 0;
  const disarmsTriggeredAvg = played > 0 ? disarmsTriggeredTotal / played : 0;
  const resurrectionsGivenAvg = played > 0 ? resurrectionsGivenTotal / played : 0;

  return {
    played, wins, winRate, lastAt, lastPlayedAt: lastAt,
    killsTotal, killsAvg, deathsTotal, deathsAvg, dartsTotal, dartsAvg, totalHits,
    livesTakenTotal, livesLostTotal, livesDeltaTotal: livesTakenTotal - livesLostTotal,
    autoKillsTotal, autoKillsAvg, selfPenaltyHitsTotal, selfPenaltyHitsAvg,
    livesStolenTotal, livesStolenAvg, livesHealedTotal, livesHealedAvg,
    disarmsTriggeredTotal, disarmsTriggeredAvg, disarmsReceivedTotal,
    shieldBreaksTotal, shieldHalfBreaksTotal,
    resurrectionsGivenTotal, resurrectionsGivenAvg, resurrectionsReceivedTotal,
    offensiveThrowsTotal, killerThrowsTotal, uselessHitsTotal, rearmThrowsTotal,
    precisionOffensive, precisionKiller, rearmAvgThrows,
    hitsBySegmentAgg: Object.fromEntries(Object.entries(hitsBySegmentAgg).filter(([k]) => k !== "TOTAL")), hitsByNumberAgg,
    favSegment: favSeg.key || "", favSegmentHits: favSeg.value || 0,
    favNumber: Number(favNum.key || 0) || 0, favNumberHits: favNum.value || 0,
    placements, podiums, firsts, seconds, thirds,
    recentPlacements: recentPlacements.sort((a,b)=>b.when-a.when).slice(0,20),
    totalMatches: played, totalWins: wins, totalKills: killsTotal, avgKills: killsAvg,
    totalDarts: dartsTotal, avgDarts: dartsAvg, deaths: deathsTotal, avgDeaths: deathsAvg,
    matches: played, winsCount: wins, kills: killsTotal, darts: dartsTotal,
  };
}
