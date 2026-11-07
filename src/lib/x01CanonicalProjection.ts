// Canonical lightweight X01 stats projection.
// History remains the authority, but UI surfaces consume this projection only.
// It is updated synchronously when an X01 match is completed and survives reloads.
// No IndexedDB scan is allowed from rendering components.

import { getAccountLocalStorageItem, setAccountLocalStorageItem } from "./accountScope";
import { readCanonicalX01IndexV2, resolveCanonicalX01ProfileId } from "./x01CanonicalIndexStoreV2";
import { selectCanonicalX01ProfileV3 } from "./x01CanonicalSelectorsV3";
import { getX01StatsContext, type X01InModeKey, type X01OutModeKey, type X01StartScoreKey, type X01VariantKey } from "./x01StatsContext";

export type CanonicalX01Session = {
  id: string;
  matchId: string;
  date: number;
  profileId: string;
  playerId: string;
  playerName: string;
  startScore: X01StartScoreKey | null;
  inMode: X01InModeKey;
  outMode: X01OutModeKey;
  variant: X01VariantKey;
  darts: number;
  points: number;
  avg3D: number;
  bestVisit: number;
  bestCheckout: number;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull25: number;
  bull50: number;
  bust: number;
  coAttempts: number;
  coSuccess: number;
  isWin: boolean;
  legsWon: number;
  setsWon: number;
};

export type CanonicalX01ProfileStats = {
  profileId: string;
  totalX01Matches: number;
  reference501DOMatches: number;
  lifetime501DOAvg3D: number;
  current501DOAvg3D: number;
  current501DOMatches: number;
  bestVisit501DO: number;
  bestCheckout501DO: number;
  wins501DO: number;
  darts501DO: number;
  points501DO: number;
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

type ProjectionBag = { version: 1; updatedAt: number; sessions: CanonicalX01Session[] };
const KEY = "dc_x01_canonical_projection_v1";
let mem: ProjectionBag | null = null;

const n = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const text = (v: any) => String(v ?? "").trim();
const normName = (v: any) => text(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function readBag(): ProjectionBag {
  if (mem) return mem;
  try {
    const raw = getAccountLocalStorageItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.version === 1 && Array.isArray(parsed.sessions)) {
      mem = { version: 1, updatedAt: n(parsed.updatedAt), sessions: parsed.sessions };
      return mem;
    }
  } catch {}
  mem = { version: 1, updatedAt: 0, sessions: [] };
  return mem;
}

function writeBag(bag: ProjectionBag) {
  mem = bag;
  try { setAccountLocalStorageItem(KEY, JSON.stringify(bag)); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc-x01-canonical-updated", { detail: { updatedAt: bag.updatedAt } })); } catch {}
}

export function clearX01CanonicalProjectionMemory() { mem = null; }

export function listCanonicalX01Sessions(profileId?: string | null, profileName?: string | null): CanonicalX01Session[] {
  // V242: one authority for ALL surfaces. The read-only History V4 index
  // must win over the old independent V1 local cache when available.
  const stored = readCanonicalX01IndexV2();
  const pid = resolveCanonicalX01ProfileId(profileId);
  if (stored) {
    const out: CanonicalX01Session[] = [];
    for (const match of stored.index.matches || []) {
      if (!["finished", "completed", "done", "ended"].includes(match.status)) continue;
      const matches = match.participants.filter((part) =>
        !pid || part.canonicalProfileId === pid || resolveCanonicalX01ProfileId(part.historicalPlayerId) === pid
      );
      // At most one observation per match for the requested logical profile.
      const quality = (part: typeof matches[number]) =>
        Number(part.darts !== null && part.darts > 0 && part.points !== null) * 10 +
        Number(part.bestVisit !== null) + Number(part.hitsS !== null);
      const selected = pid && matches.length > 1
        ? matches.slice().sort((a, b) => quality(b) - quality(a)).slice(0, 1)
        : matches;
      for (const part of selected) {
        const canonicalId = part.canonicalProfileId || resolveCanonicalX01ProfileId(part.historicalPlayerId);
        const darts = part.darts ?? 0;
        const points = part.points ?? 0;
        out.push({
          id: `${match.matchId}:${part.historicalPlayerId}`,
          matchId: match.matchId, date: match.date,
          profileId: canonicalId, playerId: part.historicalPlayerId, playerName: part.name,
          startScore: match.startScore, inMode: match.inMode, outMode: match.outMode,
          variant: match.variant, darts, points,
          avg3D: part.avg3d ?? (darts > 0 ? points * 3 / darts : 0),
          bestVisit: part.bestVisit ?? 0, bestCheckout: part.bestCheckout ?? 0,
          hitsS: part.hitsS ?? 0, hitsD: part.hitsD ?? 0, hitsT: part.hitsT ?? 0,
          miss: part.misses ?? 0, bull25: part.bull25 ?? 0, bull50: part.bull50 ?? 0,
          bust: 0, coAttempts: 0, coSuccess: (part.bestCheckout ?? 0) > 0 ? 1 : 0,
          isWin: part.win === true, legsWon: part.legsWon ?? 0, setsWon: part.setsWon ?? 0,
        });
      }
    }
    return out.sort((a, b) => a.date - b.date);
  }
  // Compatibility-only cache while the new V4 projection is being rebuilt.
  bootstrapX01ProjectionFromLegacyCaches();
  const rows = readBag().sessions || [];
  const pname = normName(profileName);
  if (!pid && !pname) return rows.slice().sort((a,b) => a.date - b.date);
  return rows.filter((row) => {
    if (pid && (row.profileId === pid || row.playerId === pid)) return true;
    return !!pname && normName(row.playerName) === pname;
  }).sort((a,b) => a.date - b.date);
}

function weightedAvg(rows: CanonicalX01Session[]): number {
  let darts = 0, points = 0, directSum = 0, directCount = 0;
  for (const row of rows) {
    if (row.darts > 0 && row.points >= 0) { darts += row.darts; points += row.points; }
    else if (row.avg3D > 0) { directSum += row.avg3D; directCount += 1; }
  }
  return darts > 0 ? (points / darts) * 3 : directCount ? directSum / directCount : 0;
}

export function computeCanonicalX01ProfileStats(profileId?: string | null, profileName?: string | null): CanonicalX01ProfileStats {
  const profileKey = resolveCanonicalX01ProfileId(profileId);
  // V166: Home, Profiles and StatsHub use the SAME versioned History V4
  // projection as X01Multi. No name fallback, no IndexedDB in render path.
  const stored = profileKey ? readCanonicalX01IndexV2() : null;
  if (stored && profileKey) {
    const view = selectCanonicalX01ProfileV3(stored.index, profileKey);
    const group = (mode: 'simple' | 'double' | 'master') => {
      const x = view.exitModes[mode];
      return {
        matches: x.matches, darts: x.avg3d.darts, points: x.avg3d.points,
        avg3D: x.avg3d.value ?? 0, finishes: x.finishSamples,
        finishTotal: (x.avgFinish ?? 0) * x.finishSamples,
        avgFinish: x.avgFinish ?? 0,
      };
    };
    const ref = stored.index.matches.flatMap((match) => {
      if (match.startScore !== 501 || match.outMode !== 'double') return [];
      const p = match.participants.filter((part) => part.canonicalProfileId === profileKey);
      if (!p.length) return [];
      const quality = (part: typeof p[number]) => Number(part.darts !== null && part.darts > 0 && part.points !== null) * 10 + Number(part.bestVisit !== null);
      return [p.slice().sort((a,b) => quality(b) - quality(a))[0]];
    });
    return {
      profileId: profileKey,
      totalX01Matches: view.totalMatches,
      reference501DOMatches: view.reference501DO,
      lifetime501DOAvg3D: view.referenceLifetime.value ?? 0,
      current501DOAvg3D: view.referenceCurrent.value ?? 0,
      current501DOMatches: view.referenceCurrentMatches,
      bestVisit501DO: ref.reduce((m,p) => Math.max(m,p.bestVisit ?? 0), 0),
      bestCheckout501DO: ref.reduce((m,p) => Math.max(m,p.bestCheckout ?? 0), 0),
      wins501DO: ref.filter((p) => p.win === true).length,
      darts501DO: view.referenceLifetime.darts,
      points501DO: view.referenceLifetime.points,
      byOut: { simple: group('simple'), double: group('double'), master: group('master') },
    };
  }
  const all = listCanonicalX01Sessions(profileId, profileName);
  const ref = all.filter((r) => r.startScore === 501 && r.outMode === "double");
  const current = ref.slice().sort((a,b) => a.date - b.date).slice(-10);
  const emptyOut = () => ({ matches: 0, darts: 0, points: 0, avg3D: 0, finishes: 0, finishTotal: 0, avgFinish: 0 });
  const byOut: CanonicalX01ProfileStats["byOut"] = { simple: emptyOut(), double: emptyOut(), master: emptyOut() };
  for (const mode of ["simple","double","master"] as const) {
    const rows = all.filter((r) => r.outMode === mode);
    const finishes = rows.filter((r) => r.bestCheckout > 0);
    const finishTotal = finishes.reduce((s,r) => s + r.bestCheckout, 0);
    byOut[mode] = {
      matches: rows.length,
      darts: rows.reduce((s,r) => s + r.darts, 0),
      points: rows.reduce((s,r) => s + r.points, 0),
      avg3D: weightedAvg(rows),
      finishes: finishes.length,
      finishTotal,
      avgFinish: finishes.length ? finishTotal / finishes.length : 0,
    };
  }
  return {
    profileId: text(profileId),
    totalX01Matches: all.length,
    reference501DOMatches: ref.length,
    lifetime501DOAvg3D: weightedAvg(ref),
    current501DOAvg3D: weightedAvg(current),
    current501DOMatches: current.length,
    bestVisit501DO: ref.reduce((m,r) => Math.max(m,r.bestVisit || 0), 0),
    bestCheckout501DO: ref.reduce((m,r) => Math.max(m,r.bestCheckout || 0), 0),
    wins501DO: ref.reduce((s,r) => s + (r.isWin ? 1 : 0), 0),
    darts501DO: ref.reduce((s,r) => s + r.darts, 0),
    points501DO: ref.reduce((s,r) => s + r.points, 0),
    byOut,
  };
}

function playerFromPool(pool: any, pid: string): any {
  if (Array.isArray(pool)) return pool.find((p) => text(p?.playerId ?? p?.profileId ?? p?.id) === pid) || null;
  if (pool && typeof pool === "object") return pool[pid] || Object.values(pool).find((p:any) => text(p?.playerId ?? p?.profileId ?? p?.id) === pid) || null;
  return null;
}

export function upsertCanonicalX01Record(record: any): void {
  try {
    if (!record || String(record?.status || "finished").toLowerCase() !== "finished") return;
    const ctx = getX01StatsContext(record);
    if (!ctx.startScore) return;
    const matchId = text(record?.matchId ?? record?.id);
    if (!matchId) return;
    const date = n(record?.createdAt ?? record?.updatedAt) || Date.now();
    const summary = record?.summary || {};
    const perPlayer = Array.isArray(summary?.perPlayer) ? summary.perPlayer : [];
    const summaryPlayers = summary?.players || {};
    const rootPlayers = Array.isArray(record?.players) ? record.players : [];
    const winnerId = text(record?.winnerId ?? summary?.winnerId);
    const candidates = perPlayer.length ? perPlayer : (Array.isArray(summaryPlayers) ? summaryPlayers : Object.values(summaryPlayers || {}));
    const nextRows: CanonicalX01Session[] = [];
    for (const raw of candidates as any[]) {
      const playerId = text(raw?.playerId ?? raw?.profileId ?? raw?.id);
      if (!playerId) continue;
      const root = playerFromPool(rootPlayers, playerId) || {};
      const detail = summary?.detailedByPlayer?.[playerId] || raw || {};
      const darts = Math.max(0, n(raw?.darts ?? raw?.dartsThrown ?? detail?.darts ?? detail?.dartsThrown));
      const avg3D = Math.max(0, n(raw?.avg3 ?? raw?.avg3D ?? summary?.avg3ByPlayer?.[playerId]));
      let points = Math.max(0, n(raw?.points ?? raw?.pointsScored ?? summary?.legacy?.points?.[playerId]));
      if (!points && darts > 0 && avg3D > 0) points = (avg3D * darts) / 3;
      const profileId = text(root?.profileId ?? raw?.profileId ?? playerId) || playerId;
      const playerName = text(root?.name ?? raw?.name ?? summaryPlayers?.[playerId]?.name ?? "Joueur");
      const bestCheckout = Math.max(0, n(raw?.bestCheckout ?? summary?.bestCheckoutByPlayer?.[playerId] ?? detail?.bestCheckout));
      nextRows.push({
        id: `${matchId}:${profileId}`,
        matchId, date, profileId, playerId, playerName,
        startScore: ctx.startScore, inMode: ctx.inMode, outMode: ctx.outMode, variant: ctx.variant,
        darts, points, avg3D: darts > 0 ? (points / darts) * 3 : avg3D,
        bestVisit: Math.max(0, n(raw?.bestVisit ?? summary?.bestVisitByPlayer?.[playerId] ?? detail?.bestVisit)),
        bestCheckout,
        hitsS: Math.max(0, n(raw?.hits?.S ?? raw?.hitsS ?? detail?.hitsS)),
        hitsD: Math.max(0, n(raw?.hits?.D ?? raw?.hitsD ?? detail?.hitsD)),
        hitsT: Math.max(0, n(raw?.hits?.T ?? raw?.hitsT ?? detail?.hitsT)),
        miss: Math.max(0, n(raw?.hits?.M ?? raw?.miss ?? detail?.miss)),
        bull25: Math.max(0, n(raw?.bull ?? detail?.bull)),
        bull50: Math.max(0, n(raw?.dBull ?? raw?.dbull ?? detail?.dBull ?? detail?.dbull)),
        bust: Math.max(0, n(raw?.bust ?? detail?.bust)),
        coAttempts: Math.max(0, n(raw?.coAttempts ?? detail?.coAttempts)),
        coSuccess: Math.max(0, n(raw?.coSuccess ?? detail?.coSuccess ?? (bestCheckout > 0 ? 1 : 0))),
        isWin: !!winnerId && (winnerId === playerId || winnerId === profileId),
        legsWon: Math.max(0, n(summary?.legsByPlayer?.[playerId] ?? detail?.legsWonTotal)),
        setsWon: Math.max(0, n(summary?.setsByPlayer?.[playerId] ?? detail?.setsWonTotal)),
      });
    }
    if (!nextRows.length) return;
    const bag = readBag();
    const map = new Map<string, CanonicalX01Session>();
    for (const row of bag.sessions) map.set(row.id, row);
    for (const row of nextRows) map.set(row.id, row);
    const sessions = Array.from(map.values()).sort((a,b) => a.date - b.date).slice(-5000);
    writeBag({ version: 1, updatedAt: Date.now(), sessions });
    // compatibility cache used by every ProfileStarRing
    for (const row of nextRows) {
      const stats = computeCanonicalX01ProfileStats(row.profileId, row.playerName);
      persistCurrentLevelCompat(row.profileId, row.playerName, stats);
    }
  } catch (e) {
    console.warn("[x01CanonicalProjection] upsert failed", e);
  }
}

function persistCurrentLevelCompat(profileId: string, playerName: string, stats: CanonicalX01ProfileStats) {
  try {
    const legacyKey = "dc_x01_current_level_v127";
    const raw = getAccountLocalStorageItem(legacyKey);
    const bag = raw ? JSON.parse(raw) : {};
    const value = stats.current501DOAvg3D;
    const row = {
      currentAvg3D: value,
      x01CurrentAvg3D: value,
      last10Avg3D: value,
      currentMatches: stats.current501DOMatches,
      lifetimeAvg3D: stats.lifetime501DOAvg3D,
      reference501DOMatches: stats.reference501DOMatches,
      updatedAt: Date.now(),
      name: playerName,
    };
    if (profileId) bag[profileId] = row;
    const name = normName(playerName);
    if (name) bag[`name:${name}`] = row;
    setAccountLocalStorageItem(legacyKey, JSON.stringify(bag));
    try { window.dispatchEvent(new CustomEvent("dc-x01-level-updated", { detail: { profileId, ...row } })); } catch {}
  } catch {}
}

// One-time synchronous migration from the existing compact X01Multi cache.
// This avoids an IndexedDB getAll on mobile after upgrading existing installs.
let legacyBootstrapped = false;
export function bootstrapX01ProjectionFromLegacyCaches(): void {
  if (legacyBootstrapped) return;
  legacyBootstrapped = true;
  const existing = readBag();
  if (existing.sessions.length) return;
  try {
    if (typeof localStorage === "undefined") return;
    const found: CanonicalX01Session[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = String(localStorage.key(i) || "");
      if (!key.includes("dc_x01_multi_sessions_v6") && !key.includes("dc_x01_multi_quick_v6")) continue;
      let parsed: any = null;
      try { parsed = JSON.parse(String(localStorage.getItem(key) || "")); } catch { continue; }
      const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
      const rows = sessions.length ? sessions : (Array.isArray(parsed?.rows) ? parsed.rows.map((r:any[]) => ({
        id:r?.[0], matchId:r?.[1]||r?.[0], date:r?.[2], selectedPlayerId:r?.[3], playerName:r?.[4], profileId:r?.[5],
        x01StartScore:r?.[6], x01Variant:r?.[7], darts:r?.[9], avg3D:r?.[10], bestVisit:r?.[12], bestCheckout:r?.[13],
        hitsS:r?.[14], hitsD:r?.[15], hitsT:r?.[16], miss:r?.[17], bull:r?.[18], dBull:r?.[19], bust:r?.[20], isWin:r?.[21]===1,
        legsWon:r?.[23], setsWon:r?.[25], x01OutMode:r?.[33],
      })) : []);
      for (const r of rows) {
        const pid = text(r?.profileId ?? r?.selectedPlayerId);
        const matchId = text(r?.matchId ?? r?.id);
        if (!pid || !matchId) continue;
        const darts = Math.max(0,n(r?.darts));
        const avg3D = Math.max(0,n(r?.avg3D));
        const points = darts > 0 && avg3D > 0 ? (avg3D*darts)/3 : 0;
        found.push({
          id:`${matchId}:${pid}`, matchId, date:n(r?.date), profileId:pid, playerId:text(r?.selectedPlayerId)||pid,
          playerName:text(r?.playerName)||"Joueur", startScore:n(r?.x01StartScore) as X01StartScoreKey || null,
          inMode:"unknown", outMode:(r?.x01OutMode || "unknown") as X01OutModeKey, variant:(r?.x01Variant || "unknown") as X01VariantKey,
          darts, points, avg3D, bestVisit:n(r?.bestVisit), bestCheckout:n(r?.bestCheckout), hitsS:n(r?.hitsS), hitsD:n(r?.hitsD), hitsT:n(r?.hitsT),
          miss:n(r?.miss), bull25:n(r?.bull), bull50:n(r?.dBull), bust:n(r?.bust), coAttempts:0, coSuccess:n(r?.bestCheckout)>0?1:0,
          isWin:!!r?.isWin, legsWon:n(r?.legsWon), setsWon:n(r?.setsWon),
        });
      }
    }
    if (found.length) {
      const map = new Map<string,CanonicalX01Session>();
      for (const row of found) map.set(row.id,row);
      const sessions = Array.from(map.values()).sort((a,b)=>a.date-b.date).slice(-5000);
      writeBag({version:1,updatedAt:Date.now(),sessions});
      const ids = new Map<string,string>();
      for (const row of sessions) ids.set(row.profileId,row.playerName);
      for (const [pid,name] of ids) persistCurrentLevelCompat(pid,name,computeCanonicalX01ProfileStats(pid,name));
    }
  } catch {}
}
