// =============================================================
// src/lib/statsUnifiedAgg.ts
// PHASE 2 — Agrégateurs unifiés (basés sur NormalizedMatch)
// ✅ Dashboard player (avg3, bestVisit, bestCO, winRate, evolution, buckets, sessionsByMode)
// ✅ FIX: X01 V3 n'enregistre pas toujours payload.visits -> fallback depuis raw.summary
// =============================================================

import type { NormalizedMatch } from "./statsNormalized";


// =============================================================
// Unified stats helpers (payload.stats)
// - Allows dashboards to use the new lightweight payload.stats block
//   for non-X01 modes (Golf/Cricket/Killer/Shanghai/Batard/etc.)
// =============================================================
function getUnifiedStatsPlayers(raw: any): any[] {
  const ps = raw?.payload?.stats?.players;
  return Array.isArray(ps) ? ps : [];
}

function findUnifiedPlayer(raw: any, playerId: string): any | null {
  const pid = String(playerId || "");
  if (!pid) return null;
  const ps = getUnifiedStatsPlayers(raw);
  for (const p of ps) {
    const id = String(p?.id ?? p?.profileId ?? "");
    if (id && id === pid) return p;
  }
  // fallback: sometimes NormalizedPlayer.playerId != profileId; try matching by profileId
  for (const p of ps) {
    const id = String(p?.profileId ?? "");
    if (id && id === pid) return p;
  }
  return null;
}

function readUnifiedAvg3(raw: any, playerId: string): number {
  const p = findUnifiedPlayer(raw, playerId);
  if (!p) return 0;

  // 1) X01-like direct averages when present
  const direct = Number(p?.averages?.avg3d ?? p?.avg3d ?? null);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const mode = String(raw?.payload?.stats?.mode ?? raw?.payload?.mode ?? raw?.summary?.mode ?? raw?.kind ?? "").toLowerCase();
  const thrown = Number(p?.darts?.thrown ?? 0);
  const hits = Number(p?.darts?.hits ?? 0);
  const score = Number(p?.score ?? 0);

  // 2) Cricket: expose marks per round (3 darts) in the generic dashboard
  // marksTotal is the most stable field stored by CricketPlay unified stats.
  if (mode.includes("cricket")) {
    const marksTotal = Number(p?.special?.marksTotal ?? 0);
    if (marksTotal > 0 && thrown > 0) return (marksTotal / thrown) * 3;
    if (score > 0 && thrown > 0) return (score / thrown) * 3;
  }

  // 3) Shanghai: average points per turn mapped to the generic avg box
  if (mode.includes("shanghai")) {
    if (score > 0 && thrown > 0) return (score / thrown) * 3;
  }

  // 4) Killer: average hits per turn mapped to the generic avg box
  if (mode.includes("killer")) {
    if (hits > 0 && thrown > 0) return (hits / thrown) * 3;
  }

  // 5) Other non-darts score-based sports: use stored score as the generic average box
  if (mode.includes("babyfoot") || mode.includes("pingpong") || mode.includes("petanque") || mode.includes("molkky") || mode.includes("dice")) {
    if (score > 0) return score;
  }

  return 0;
}

function readUnifiedBestVisit(raw: any, playerId: string): number {
  const p = findUnifiedPlayer(raw, playerId);
  if (!p) return 0;

  const direct = Number(p?.special?.bestVisit ?? p?.bestVisit ?? null);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const mode = String(raw?.payload?.stats?.mode ?? raw?.payload?.mode ?? raw?.summary?.mode ?? raw?.kind ?? "").toLowerCase();

  // Cricket does not store a classic "best visit", so use the best score reached in the leg.
  if (mode.includes("cricket")) {
    const score = Number(p?.score ?? 0);
    if (Number.isFinite(score) && score > 0) return score;
    const marks = Number(p?.special?.marksTotal ?? 0);
    if (Number.isFinite(marks) && marks > 0) return marks;
  }

  // Shanghai naturally exposes a total score; use it as the generic best box.
  if (mode.includes("shanghai")) {
    const score = Number(p?.score ?? 0);
    if (Number.isFinite(score) && score > 0) return score;
  }

  // Killer: use total kills first, then total hits as a fallback.
  if (mode.includes("killer")) {
    const kills = Number(p?.special?.kills ?? 0);
    if (Number.isFinite(kills) && kills > 0) return kills;
    const hits = Number(p?.darts?.hits ?? 0);
    if (Number.isFinite(hits) && hits > 0) return hits;
  }

  if (mode.includes("babyfoot") || mode.includes("pingpong") || mode.includes("petanque") || mode.includes("molkky") || mode.includes("dice")) {
    const score = Number(p?.score ?? 0);
    if (Number.isFinite(score) && score > 0) return score;
  }

  return 0;
}

type VisitBucket = "0-59" | "60-99" | "100+" | "140+" | "180";
type PlayerDistribution = Record<VisitBucket, number>;

export type UnifiedPlayerDashboardStats = {
  playerId: string;
  playerName: string;
  avg3Overall: number;
  bestVisit: number;
  winRatePct: number;
  bestCheckout?: number;
  evolution: Array<{ date: string; avg3: number }>;
  distribution: PlayerDistribution;
  sessionsByMode?: Record<string, number>;
};

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const fmt1 = (x: number) => Math.round(x * 10) / 10;

function firstFiniteStatsValue(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}


function normalizeDashboardMode(mode: any, raw?: any): string {
  const tag = [
    mode,
    raw?.kind, raw?.game, raw?.mode, raw?.variant, raw?.sport,
    raw?.summary?.kind, raw?.summary?.mode, raw?.summary?.gameMode, raw?.summary?.sport, raw?.summary?.game?.mode, raw?.summary?.game?.game,
    raw?.payload?.kind, raw?.payload?.game, raw?.payload?.mode, raw?.payload?.gameMode, raw?.payload?.variant, raw?.payload?.sport,
    raw?.payload?.stats?.mode, raw?.payload?.stats?.sport,
    raw?.payload?.summary?.kind, raw?.payload?.summary?.mode, raw?.payload?.summary?.gameMode, raw?.payload?.summary?.sport, raw?.payload?.summary?.game?.mode, raw?.payload?.summary?.game?.game,
  ]
    .filter((v) => v !== undefined && v !== null && String(v).trim())
    .map((v) => String(v).toLowerCase())
    .join('|');

  if (!tag) return '';
  if (tag.includes('x01') || tag.includes('301') || tag.includes('501') || tag.includes('701')) return 'x01';
  if (tag.includes('cricket')) return 'cricket';
  if (tag.includes('killer')) return 'killer';
  if (tag.includes('shanghai')) return 'shanghai';
  if (tag.includes('golf')) return 'golf';
  if (tag.includes('territ') || tag.includes('departement')) return 'territories';
  if (tag.includes('batard') || tag.includes('bâtard') || tag.includes('bastard')) return 'batard';
  if (tag.includes('scram')) return 'scram';
  if (tag.includes('warfare')) return 'warfare';
  if (tag.includes('five_lives') || tag.includes('five lives') || tag.includes('5 vies') || tag.includes('cinq vies')) return 'five_lives';
  if (tag.includes('battle') || tag.includes('royale')) return 'battle_royale';
  if (tag.includes('capital')) return 'capital';
  if (tag.includes('clock') || tag.includes('horloge') || tag.includes('tour')) return 'clock';
  return String(mode || '').trim().toLowerCase();
}

function isX01Mode(mode: string): boolean {
  const m = String(mode || '').toLowerCase();
  return m === 'x01' || m.startsWith('x01') || m.includes('x01');
}


function bucketForVisit(score: number): VisitBucket {
  if (score >= 180) return "180";
  if (score >= 140) return "140+";
  if (score >= 100) return "100+";
  if (score >= 60) return "60-99";
  return "0-59";
}

function safeDate(ts: number) {
  try {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}/${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

/**
 * 🔥 Fallback X01 quand m.visits est vide (cas X01 V3 actuel)
 * On lit les stats déjà sauvegardées dans summary :
 * - summary.players[pid].avg3
 * - summary.players[pid].visits
 * - summary.players[pid].bestVisit / bestCheckout
 * ou maps : avg3ByPlayer / bestVisitByPlayer / bestCheckoutByPlayer
 */
function normStatsName(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function idMatches(a: any, b: any): boolean {
  const aa = String(a ?? "").trim();
  const bb = String(b ?? "").trim();
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  return aa.length >= 16 && bb.length >= 16 && (aa.startsWith(bb) || bb.startsWith(aa));
}

function collectPlayerAliases(m: NormalizedMatch, playerId: string, playerName?: string): string[] {
  const out = new Set<string>();
  const pid = String(playerId || "").trim();
  const pname = normStatsName(playerName);
  if (pid) out.add(pid);

  const pools: any[] = [
    ...((Array.isArray((m as any)?.players) ? (m as any).players : []) as any[]),
    ...((Array.isArray((m as any)?.raw?.players) ? (m as any).raw.players : []) as any[]),
    ...((Array.isArray((m as any)?.raw?.payload?.players) ? (m as any).raw.payload.players : []) as any[]),
    ...((Array.isArray((m as any)?.raw?.summary?.players) ? (m as any).raw.summary.players : []) as any[]),
    ...((Array.isArray((m as any)?.raw?.payload?.config?.players) ? (m as any).raw.payload.config.players : []) as any[]),
  ];

  for (const p of pools) {
    const ids = [p?.id, p?.playerId, p?.profileId, p?.sourceId, p?.sourcePlayerId, p?.sourceProfileId, p?.userId, ...(Array.isArray(p?.aliases) ? p.aliases : [])]
      .filter((v) => v !== undefined && v !== null)
      .map((v) => String(v).trim())
      .filter(Boolean);
    const nm = normStatsName(p?.name ?? p?.displayName ?? p?.nickname ?? p?.surname);
    const hitById = ids.some((x) => idMatches(x, pid));
    const hitByName = !!pname && !!nm && nm === pname;
    if (hitById || hitByName) ids.forEach((x) => out.add(x));
  }
  return Array.from(out);
}

function getByAlias(map: any, aliases: string[]): any {
  if (!map || typeof map !== "object") return undefined;
  for (const a of aliases) {
    if (map[a] !== undefined) return map[a];
    const hitKey = Object.keys(map).find((k) => idMatches(k, a));
    if (hitKey) return map[hitKey];
  }
  return undefined;
}

function findArrayByAlias(arr: any, aliases: string[], playerName?: string): any {
  if (!Array.isArray(arr)) return undefined;
  const pname = normStatsName(playerName);
  return arr.find((x: any) => {
    const ids = [x?.id, x?.playerId, x?.profileId, x?.sourceId].filter(Boolean);
    const nm = normStatsName(x?.name ?? x?.displayName ?? x?.nickname);
    return ids.some((id) => aliases.some((a) => idMatches(id, a))) || (!!pname && !!nm && nm === pname);
  });
}


function statWinText(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function statTruthyWin(v: any): boolean {
  return v === true || v === 1 || v === "1" || statWinText(v) === "true";
}

function statTextIsWin(v: any): boolean {
  const t = statWinText(v);
  return [
    "w",
    "win",
    "winner",
    "won",
    "victory",
    "victoire",
    "gagne",
    "gagnant",
    "vainqueur",
    "1er",
    "1ere",
    "1ere place",
    "first",
  ].includes(t) || t.startsWith("win") || t.startsWith("gagn");
}

function statValueMatchesPlayer(v: any, aliases: string[], playerName?: string): boolean {
  const pname = normStatsName(playerName);
  if (v === undefined || v === null) return false;
  if (typeof v === "object") {
    const ids = [
      v?.id,
      v?.playerId,
      v?.profileId,
      v?.sourceId,
      v?.sourcePlayerId,
      v?.sourceProfileId,
      v?.userId,
      v?.uid,
      ...(Array.isArray(v?.aliases) ? v.aliases : []),
    ]
      .filter((x) => x !== undefined && x !== null)
      .map((x) => String(x).replace(/^online:/, "").trim())
      .filter(Boolean);
    if (ids.some((id) => aliases.some((a) => idMatches(id, a)))) return true;
    const nm = normStatsName(v?.name ?? v?.playerName ?? v?.displayName ?? v?.nickname ?? v?.surname ?? v?.winnerName);
    return !!pname && !!nm && nm === pname;
  }
  const raw = String(v).replace(/^online:/, "").trim();
  if (aliases.some((a) => idMatches(raw, a))) return true;
  return !!pname && normStatsName(raw) === pname;
}

function statPlayerRows(raw: any): any[] {
  const rec = raw || {};
  const payload = rec?.payload || {};
  const nested = payload?.payload || {};
  const summary = rec?.summary || payload?.summary || nested?.summary || {};
  const out: any[] = [];
  const add = (v: any) => {
    if (Array.isArray(v)) out.push(...v);
    else if (v && typeof v === "object") {
      for (const [k, row] of Object.entries(v)) {
        if (row && typeof row === "object") out.push({ id: k, ...(row as any) });
      }
    }
  };
  add(rec?.players);
  add(rec?.perPlayer);
  add(rec?.rankings);
  add(rec?.detailedByPlayer);
  add(payload?.players);
  add(payload?.stats?.players);
  add(payload?.perPlayer);
  add(payload?.rankings);
  add(nested?.players);
  add(nested?.stats?.players);
  add(summary?.players);
  add(summary?.perPlayer);
  add(summary?.rankings);
  add(summary?.detailedByPlayer);
  add(summary?.detailedbyplayer);
  add(summary?.standings);
  return out;
}

function statReadScore(row: any, keys: string[]): number {
  for (const k of keys) {
    const n = Number(row?.[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function playerWonMatch(m: NormalizedMatch, aliases: string[], playerName?: string): boolean {
  const raw = (m as any)?.raw || {};
  const payload = raw?.payload || {};
  const nested = payload?.payload || {};
  const summary = raw?.summary || payload?.summary || nested?.summary || {};

  const directWinners = [
    ...(Array.isArray((m as any)?.winnerIds) ? (m as any).winnerIds : []),
    raw?.winnerId,
    raw?.winner,
    raw?.winnerName,
    raw?.winnerPlayer,
    raw?.result?.winnerId,
    raw?.result?.winnerName,
    summary?.winnerId,
    summary?.winner,
    summary?.winnerName,
    summary?.result?.winnerId,
    summary?.result?.winnerName,
    payload?.winnerId,
    payload?.winner,
    payload?.winnerName,
    payload?.result?.winnerId,
    payload?.result?.winnerName,
    payload?.summary?.winnerId,
    payload?.summary?.winner,
    payload?.summary?.winnerName,
    payload?.summary?.result?.winnerId,
    payload?.summary?.result?.winnerName,
    nested?.winnerId,
    nested?.winner,
    nested?.winnerName,
    ...(Array.isArray(raw?.winnerIds) ? raw.winnerIds : []),
    ...(Array.isArray(summary?.winnerIds) ? summary.winnerIds : []),
    ...(Array.isArray(payload?.winnerIds) ? payload.winnerIds : []),
    ...(Array.isArray(payload?.summary?.winnerIds) ? payload.summary.winnerIds : []),
    ...(Array.isArray(nested?.winnerIds) ? nested.winnerIds : []),
  ].filter((v) => v !== undefined && v !== null && String(v).trim() !== "");

  if (directWinners.some((v) => statValueMatchesPlayer(v, aliases, playerName))) return true;

  const rows = statPlayerRows(raw);
  const myRow = rows.find((r) => statValueMatchesPlayer(r, aliases, playerName));
  if (myRow) {
    if ([myRow?.win, myRow?.won, myRow?.winner, myRow?.isWinner, myRow?.victory, myRow?.hasWon].some(statTruthyWin)) return true;
    if ([myRow?.result, myRow?.outcome, myRow?.status, myRow?.matchResult, myRow?.finalResult, myRow?.label].some(statTextIsWin)) return true;
    const place = Number(myRow?.place ?? myRow?.rank ?? myRow?.finalRank ?? myRow?.position ?? myRow?.standing ?? 0);
    if (Number.isFinite(place) && place === 1) return true;
  }

  // Fallback classement : vainqueur = meilleur score de sets, sinon de legs, sinon place/rank min.
  const uniqueRows = rows.filter(Boolean);
  const scoreRows = uniqueRows.map((row) => ({
    row,
    sets: statReadScore(row, ["setsWon", "setsWin", "setWins", "matchSetsWon", "sets"]),
    legs: statReadScore(row, ["legsWon", "legsWin", "legWins", "matchLegsWon", "legs"]),
    place: Number(row?.place ?? row?.rank ?? row?.finalRank ?? row?.position ?? row?.standing ?? NaN),
  }));
  const mine = scoreRows.find((x) => statValueMatchesPlayer(x.row, aliases, playerName));
  if (mine && scoreRows.length >= 2) {
    const maxSets = Math.max(...scoreRows.map((x) => Number.isFinite(x.sets) ? x.sets : 0));
    if (maxSets > 0 && mine.sets === maxSets && scoreRows.filter((x) => x.sets === maxSets).length === 1) return true;
    const maxLegs = Math.max(...scoreRows.map((x) => Number.isFinite(x.legs) ? x.legs : 0));
    if (maxSets <= 0 && maxLegs > 0 && mine.legs === maxLegs && scoreRows.filter((x) => x.legs === maxLegs).length === 1) return true;
    const places = scoreRows.map((x) => x.place).filter((x) => Number.isFinite(x) && x > 0);
    if (places.length >= 2) {
      const bestPlace = Math.min(...places);
      if (mine.place === bestPlace && scoreRows.filter((x) => x.place === bestPlace).length === 1) return true;
    }
  }

  return false;
}

function readX01SummaryFallback(m: NormalizedMatch, playerId: string, playerName?: string) {
  const rec: any = (m as any)?.raw || {};
  const sum: any = rec?.summary || rec?.payload?.summary || rec?.payload?.stats?.summary || {};

  const pid = String(playerId);
  const aliases = collectPlayerAliases(m, pid, playerName);

  // A) summary.detailedByPlayer est prioritaire :
  // certaines anciennes parties X01 multi ont une map bestCheckoutByPlayer corrompue
  // qui attribue le checkout du vainqueur au profil actif. Si le détail joueur existe,
  // même avec bestCheckout = 0, il doit bloquer cette map héritée.
  const detailedSp = getByAlias(sum?.detailedByPlayer, aliases) || getByAlias(sum?.detailedbyplayer, aliases) || null;
  const playerSummarySp = getByAlias(sum?.players, aliases) || null;
  const sp = detailedSp || playerSummarySp;
  const perPlayerHit = findArrayByAlias(sum?.perPlayer, aliases, playerName);
  const statsPlayerHit = findArrayByAlias(rec?.payload?.stats?.players, aliases, playerName);

  const avg3 = firstFiniteStatsValue(
    detailedSp?.avg3, detailedSp?.avg3D, detailedSp?.avg3d,
    playerSummarySp?.avg3, playerSummarySp?.avg3D, playerSummarySp?.avg3d,
    getByAlias(sum?.avg3ByPlayer, aliases),
    perPlayerHit?.avg3, perPlayerHit?.avg3D, perPlayerHit?.avg3d,
    getByAlias(sum?.avg3dByPlayer, aliases),
    getByAlias(sum?.avg3d_by_player, aliases),
    getByAlias(sum?.playersAvg3, aliases),
    statsPlayerHit?.averages?.avg3d, statsPlayerHit?.avg3d
  );

  const visits = firstFiniteStatsValue(
    detailedSp?.visits, detailedSp?.visitCount,
    playerSummarySp?.visits, playerSummarySp?.visitCount,
    getByAlias(sum?.legacy?.visits, aliases),
    statsPlayerHit?.special?.visits,
    statsPlayerHit?.visits
  );

  const bestVisit = firstFiniteStatsValue(
    detailedSp?.bestVisit, detailedSp?.best_visit, detailedSp?.bv,
    playerSummarySp?.bestVisit, playerSummarySp?.best_visit, playerSummarySp?.bv,
    getByAlias(sum?.bestVisitByPlayer, aliases),
    perPlayerHit?.bestVisit, perPlayerHit?.best_visit, perPlayerHit?.bv,
    statsPlayerHit?.special?.bestVisit, statsPlayerHit?.bestVisit
  );

  const bestCheckout = firstFiniteStatsValue(
    detailedSp?.bestCheckout, detailedSp?.bestCO, detailedSp?.bestCo, detailedSp?.best_co, detailedSp?.bestFinish, detailedSp?.bc,
    playerSummarySp?.bestCheckout, playerSummarySp?.bestCO, playerSummarySp?.bestCo, playerSummarySp?.best_co, playerSummarySp?.bestFinish, playerSummarySp?.bc,
    perPlayerHit?.bestCheckout, perPlayerHit?.bestCO, perPlayerHit?.bestCo, perPlayerHit?.best_co, perPlayerHit?.bestFinish, perPlayerHit?.bc,
    statsPlayerHit?.special?.bestCheckout, statsPlayerHit?.bestCheckout, statsPlayerHit?.bestFinish,
    getByAlias(sum?.bestCheckoutByPlayer, aliases)
  );

  return {
    has: Number.isFinite(avg3) || Number.isFinite(bestVisit) || Number.isFinite(bestCheckout),
    avg3: Number.isFinite(avg3) ? avg3 : 0,
    visits: Number.isFinite(visits) ? visits : 0,
    bestVisit: Number.isFinite(bestVisit) ? bestVisit : 0,
    bestCheckout: Number.isFinite(bestCheckout) ? bestCheckout : 0,
  };
}

export function buildDashboardFromNormalized(
  playerId: string,
  playerName: string,
  matches: NormalizedMatch[]
): UnifiedPlayerDashboardStats {
  const dist: PlayerDistribution = {
    "0-59": 0,
    "60-99": 0,
    "100+": 0,
    "140+": 0,
    "180": 0,
  };

  const sessionsByMode: Record<string, number> = {};
  let totalX01VisitScore = 0; // somme des scores de visits (ou avg3 * visits)
  let totalX01Visits = 0;


// Non-X01 (unified payload.stats) — avg3d per match (simple mean)
let totalUnifiedAvg3 = 0;
let totalUnifiedMatchesWithAvg3 = 0;

  let bestVisit = 0;
  let bestCheckout = 0;

  let matchesPlayed = 0;
  let wins = 0;

  const evolution: Array<{ date: string; avg3: number }> = [];

  for (const m of matches || []) {
    const aliases = collectPlayerAliases(m, playerId, playerName);
    const playersIn = (m.players || []).some((p: any) => {
      const ids = [p?.playerId, p?.id, p?.profileId, p?.sourceId, p?.sourcePlayerId, p?.sourceProfileId, ...(Array.isArray(p?.aliases) ? p.aliases : [])];
      const nm = normStatsName(p?.name ?? p?.displayName ?? p?.nickname);
      return ids.some((id) => aliases.some((a) => idMatches(id, a))) || (!!playerName && nm === normStatsName(playerName));
    });
    if (!playersIn) continue;

    matchesPlayed += 1;
    const dashboardMode = normalizeDashboardMode((m as any)?.mode, (m as any)?.raw);
    if (dashboardMode) {
      sessionsByMode[dashboardMode] = (sessionsByMode[dashboardMode] || 0) + 1;
    }

    if (playerWonMatch(m, aliases, playerName)) {
      wins += 1;
    }

    // X01 : visits OU fallback summary
    if (isX01Mode(m.mode)) {
      const myVisits = (m.visits || []).filter((v: any) => aliases.some((a) => idMatches(v?.playerId, a)));

      if (myVisits.length) {
        // ✅ cas idéal : on a les visits détaillées
        let sum = 0;
        for (const v of myVisits) {
          const sc = N(v.score, 0);
          sum += sc;

          if (sc > bestVisit) bestVisit = sc;

          dist[bucketForVisit(sc)] += 1;

          if (v.isCheckout) {
            if (sc > bestCheckout) bestCheckout = sc;
          }
        }

        totalX01VisitScore += sum;
        totalX01Visits += myVisits.length;

        const matchAvg3 = myVisits.length ? sum / myVisits.length : 0;
        evolution.push({ date: safeDate(m.date || Date.now()), avg3: fmt1(matchAvg3) });
      } else {
        // ✅ fallback : X01 V3 => summary.players / avg3ByPlayer / legacy.visits
        const fb = readX01SummaryFallback(m, playerId, playerName);

        if (fb.has) {
          const vCount = Math.max(0, N(fb.visits, 0));
          const matchAvg3 = Math.max(0, N(fb.avg3, 0));

          // avg3 global pondéré par nb de visits (≈ “3 flèches”)
          if (vCount > 0 && matchAvg3 > 0) {
            totalX01VisitScore += matchAvg3 * vCount;
            totalX01Visits += vCount;

            // distribution (approx) : on met les visits dans le bucket correspondant à l'avg
            dist[bucketForVisit(matchAvg3)] += vCount;
          }

          if (fb.bestVisit > bestVisit) bestVisit = fb.bestVisit;
          if (fb.bestCheckout > bestCheckout) bestCheckout = fb.bestCheckout;

          evolution.push({ date: safeDate(m.date || Date.now()), avg3: fmt1(matchAvg3) });
        }
      }
    } else {
      // Non-X01 modes: use unified payload.stats if present (lightweight block)
      const raw = (m as any)?.raw;
      const ua3 = readUnifiedAvg3(raw, playerId);
      if (ua3 > 0) {
        totalUnifiedAvg3 += ua3;
        totalUnifiedMatchesWithAvg3 += 1;
        evolution.push({ date: safeDate(m.date || Date.now()), avg3: fmt1(ua3) });
      }
      const ubv = readUnifiedBestVisit(raw, playerId);
      if (ubv > bestVisit) bestVisit = ubv;
    }
  }

  const avg3Overall = totalX01Visits ? totalX01VisitScore / totalX01Visits : totalUnifiedMatchesWithAvg3 ? totalUnifiedAvg3 / totalUnifiedMatchesWithAvg3 : 0;
  const winRatePct = matchesPlayed ? (wins / matchesPlayed) * 100 : 0;

  const evoSorted = evolution
    .map((e) => e)
    .sort((a, b) => {
      const pa = a.date.split("/").map((x) => Number(x));
      const pb = b.date.split("/").map((x) => Number(x));
      const ta = pa.length === 3 ? new Date(pa[2], pa[1] - 1, pa[0]).getTime() : 0;
      const tb = pb.length === 3 ? new Date(pb[2], pb[1] - 1, pb[0]).getTime() : 0;
      return ta - tb;
    });

  return {
    playerId,
    playerName,
    avg3Overall: fmt1(avg3Overall),
    bestVisit: N(bestVisit, 0),
    winRatePct: fmt1(winRatePct),
    bestCheckout: bestCheckout ? N(bestCheckout, 0) : undefined,
    evolution: evoSorted,
    distribution: dist,
    sessionsByMode,
  };
}