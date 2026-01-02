// @ts-nocheck
// =============================================================
// src/lib/statsKiller.ts
// Stats KILLER (Option A étendue) — agrégations robustes
// - Source de vérité pour StatsKiller.tsx (page stats)
// - Lit memHistory (records withAvatars) / store.history / IDB history
// - Support summary.detailedByPlayer + summary.perPlayer + fallbacks summary.players
// - ✅ NEW robustness:
//    - filtre joueur via players array multi-sources (rec / payload / summary / payload.summary)
//    - lit hitsBySegmentByPlayer maps si dispo
//    - fallback kills/lives via summary.players même si perPlayer existe mais incomplet
// - Expose:
//    played, wins, winRate, lastAt
//    killsTotal, killsAvg
//    livesTakenTotal, livesLostTotal (si dispo)
//    hitsBySegmentAgg + favSegment/favNumber + totalHits
// =============================================================

export type KillerStatsAgg = {
  played: number;
  wins: number;
  winRate: number; // 0..100
  lastAt: number;

  killsTotal: number;
  killsAvg: number;

  livesTakenTotal: number;
  livesLostTotal: number;

  hitsBySegmentAgg: Record<string, number>;
  totalHits: number;

  favSegment: string;
  favSegmentHits: number;

  favNumber: number; // 0 si inconnu, sinon 1..20 ou 25
  favNumberHits: number;
};

function safeStr(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

function numOr0(...vals: any[]): number {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickId(obj: any): string {
  if (!obj) return "";
  return obj.profileId || obj.playerId || obj.pid || obj.id || obj._id || obj.uid || "";
}

function getRecTimestamp(rec: any): number {
  return (
    numOr0(
      rec?.updatedAt,
      rec?.createdAt,
      rec?.ts,
      rec?.date,
      rec?.summary?.updatedAt,
      rec?.summary?.createdAt,
      rec?.summary?.finishedAt,
      rec?.payload?.updatedAt,
      rec?.payload?.createdAt,
      rec?.payload?.ts,
      rec?.payload?.summary?.updatedAt,
      rec?.payload?.summary?.finishedAt
    ) || 0
  );
}

function isKillerRecord(rec: any): boolean {
  const kind =
    rec?.kind ||
    rec?.summary?.kind ||
    rec?.payload?.kind ||
    rec?.payload?.summary?.kind;

  const game = rec?.payload?.game || rec?.summary?.game?.mode || rec?.summary?.game?.game;
  const payloadMode = rec?.payload?.mode || rec?.payload?.summary?.mode;

  return kind === "killer" || game === "killer" || payloadMode === "killer";
}

function extractPerPlayer(summary: any): Record<string, any> {
  if (!summary) return {};

  if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") {
    return summary.detailedByPlayer as Record<string, any>;
  }

  const out: Record<string, any> = {};

  if (Array.isArray(summary.perPlayer)) {
    for (const p of summary.perPlayer) {
      const pid = pickId(p) || safeStr(p?.id);
      if (!pid) continue;
      out[pid] = p;
    }
    if (Object.keys(out).length) return out;
  }

  // Fallback: summary.players array
  if (Array.isArray(summary.players)) {
    for (const p of summary.players) {
      const pid = pickId(p) || safeStr(p?.id);
      if (!pid) continue;
      out[pid] = p;
    }
    if (Object.keys(out).length) return out;
  }

  return {};
}

// ✅ NEW: extrait players[] depuis plusieurs sources
function extractPlayersArray(rec: any): any[] {
  const summary = rec?.summary || rec?.payload?.summary || null;

  const arr =
    (Array.isArray(rec?.players) && rec.players) ||
    (Array.isArray(rec?.payload?.players) && rec.payload.players) ||
    (Array.isArray(summary?.players) && summary.players) ||
    (Array.isArray(rec?.payload?.summary?.players) && rec.payload.summary.players) ||
    [];

  return Array.isArray(arr) ? arr : [];
}

// ✅ NEW: hitsBySegmentByPlayer map (Option A)
function extractHitsBySegmentMap(summary: any): any | null {
  if (!summary) return null;
  return (
    summary.hitsBySegmentByPlayer ||
    summary.hits_by_segment_by_player ||
    summary.hitsBySegment ||
    null
  );
}

function parseSegmentKeyToNumber(segKey: string): number {
  const k = safeStr(segKey).toUpperCase().trim();
  if (!k) return 0;

  // MISS ne compte pas comme hit
  if (k === "MISS") return 0;

  // bull => 25
  if (k === "SB" || k === "BULL") return 25;
  if (k === "DB" || k === "DBULL") return 25;

  // format S20 / D8 / T19
  const m = k.match(/^([SDT])(\d{1,2})$/);
  if (m) {
    const n = Number(m[2]);
    if (n >= 1 && n <= 20) return n;
  }
  return 0;
}

function computeFavsFromHitsMap(hitsBySegment: Record<string, number>) {
  const segCounts: Record<string, number> = {};
  const numCounts: Record<string, number> = {};
  let totalHits = 0;

  const map = hitsBySegment || {};
  for (const [k0, v0] of Object.entries(map)) {
    const k = safeStr(k0).toUpperCase();
    const c = numOr0(v0);
    if (c <= 0) continue;
    if (k === "MISS") continue;

    segCounts[k] = (segCounts[k] || 0) + c;
    totalHits += c;

    const n = parseSegmentKeyToNumber(k);
    if (n > 0) {
      const nk = String(n);
      numCounts[nk] = (numCounts[nk] || 0) + c;
    }
  }

  let favSegment = "";
  let favSegmentHits = 0;
  for (const [k, c] of Object.entries(segCounts)) {
    if (c > favSegmentHits) {
      favSegmentHits = c;
      favSegment = k;
    }
  }

  let favNumber = 0;
  let favNumberHits = 0;
  for (const [nk, c] of Object.entries(numCounts)) {
    const n = Number(nk);
    if (c > favNumberHits) {
      favNumberHits = c;
      favNumber = n;
    }
  }

  return { favSegment, favSegmentHits, favNumber, favNumberHits, totalHits };
}

export function computeKillerStatsAggForProfile(memHistory: any[], playerId: string | null): KillerStatsAgg {
  const list = Array.isArray(memHistory) ? memHistory : [];
  const killer = list.filter(isKillerRecord);

  const filtered = playerId
    ? killer.filter((r) => {
        const arr = extractPlayersArray(r);
        return arr.some((p: any) => String(pickId(p) || p?.id) === String(playerId));
      })
    : killer;

  let played = 0;
  let wins = 0;
  let lastAt = 0;

  let killsTotal = 0;
  let livesTakenTotal = 0;
  let livesLostTotal = 0;

  const hitsBySegmentAgg: Record<string, number> = {};

  for (const rec of filtered) {
    if (!rec) continue;

    const when = getRecTimestamp(rec);
    if (when > lastAt) lastAt = when;

    played += 1;

    const winnerId =
      rec?.winnerId ||
      rec?.payload?.winnerId ||
      rec?.summary?.winnerId ||
      rec?.payload?.summary?.winnerId ||
      null;

    if (playerId && winnerId && String(winnerId) === String(playerId)) wins += 1;

    const summary = rec?.summary || rec?.payload?.summary || null;
    const per = extractPerPlayer(summary);

    // playerId obligatoire ici (page stats perso). Si null, on ne calcule pas les favs cross-profiles.
    if (!playerId) continue;

    const me = per?.[playerId] || per?.[String(playerId)] || null;

    // ✅ fallback player summary.players même si per existe (au cas où per est incomplet)
    const arrSummaryPlayers: any[] = Array.isArray(summary?.players) ? summary.players : [];
    const sp =
      arrSummaryPlayers.find((x) => String(pickId(x) || x?.id) === String(playerId)) ||
      null;

    // -------- kills / lives --------
    const k = numOr0(me?.kills, me?.killCount, me?.k, sp?.kills, sp?.killCount, sp?.k);
    if (k > 0) killsTotal += k;

    const lt = numOr0(
      me?.livesTaken, me?.damageDealt, me?.dmgDealt,
      sp?.livesTaken, sp?.damageDealt, sp?.dmgDealt
    );
    if (lt > 0) livesTakenTotal += lt;

    const ll = numOr0(
      me?.livesLost, me?.damageTaken, me?.dmgTaken,
      sp?.livesLost, sp?.damageTaken, sp?.dmgTaken
    );
    if (ll > 0) livesLostTotal += ll;

    // -------- hits by segment (Option A) --------
    // 1) det
    const hbs1 = me?.hitsBySegment || me?.hits_by_segment || me?.hits || null;
    if (hbs1 && typeof hbs1 === "object") {
      for (const [seg, c0] of Object.entries(hbs1)) {
        const c = numOr0(c0);
        if (c <= 0) continue;
        const s = safeStr(seg).toUpperCase();
        if (s === "MISS") continue;
        hitsBySegmentAgg[s] = (hitsBySegmentAgg[s] || 0) + c;
      }
    }

    // 2) fallback: summary.players[i].hitsBySegment
    const hbs2 = sp?.hitsBySegment || sp?.hits_by_segment || sp?.hits || null;
    if (hbs2 && typeof hbs2 === "object") {
      for (const [seg, c0] of Object.entries(hbs2)) {
        const c = numOr0(c0);
        if (c <= 0) continue;
        const s = safeStr(seg).toUpperCase();
        if (s === "MISS") continue;
        hitsBySegmentAgg[s] = (hitsBySegmentAgg[s] || 0) + c;
      }
    }

    // 3) ✅ NEW: hitsBySegmentByPlayer map
    const map = extractHitsBySegmentMap(summary);
    const mapForMe = map?.[playerId] || map?.[String(playerId)] || null;
    if (mapForMe && typeof mapForMe === "object") {
      for (const [seg, c0] of Object.entries(mapForMe)) {
        const c = numOr0(c0);
        if (c <= 0) continue;
        const s = safeStr(seg).toUpperCase();
        if (s === "MISS") continue;
        hitsBySegmentAgg[s] = (hitsBySegmentAgg[s] || 0) + c;
      }
    }
  }

  const winRate = playerId && played > 0 ? (wins / played) * 100 : 0;
  const killsAvg = played > 0 ? killsTotal / played : 0;

  const fav = computeFavsFromHitsMap(hitsBySegmentAgg);

  return {
    played,
    wins,
    winRate,
    lastAt,

    killsTotal,
    killsAvg,

    livesTakenTotal,
    livesLostTotal,

    hitsBySegmentAgg,
    totalHits: fav.totalHits || 0,

    favSegment: fav.favSegment || "",
    favSegmentHits: fav.favSegmentHits || 0,

    favNumber: fav.favNumber || 0,
    favNumberHits: fav.favNumberHits || 0,
  };
}
