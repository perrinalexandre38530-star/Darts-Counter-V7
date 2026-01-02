// @ts-nocheck
// ============================================================
// src/components/stats/X01MultiStatsTabFull.tsx
// FULL X01 MULTI stats tab (mode "X01 V3" multi / tous matchs)
// - KPIs X01 multi (défilement)
// - Stats détaillées (période)
// - Sparkline multi-métriques (avg3 / BV / CO / %Hits / %S/D/T)
// - Radar précision (BV / BCO / AVG) via darts reconstruits
// - Hits par segment (S / D / T / MISS)
// - Historique des matchs + modal détail
// - Compatible avec summary.detailedByPlayer de X01PlayV3
// ============================================================

import * as React from "react";
import SparklinePro from "../components/SparklinePro";
import TrainingRadar from "../components/TrainingRadar";
import { GoldPill } from "../components/StatsPlayerDashboard";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import ProfileAvatar from "../components/ProfileAvatar";

// ------ Helpers locaux : classement multi pour un joueur ------

type MultiRankStats = {
  first: number;
  second: number;
  third: number;
  place4: number;
  place5: number;
  place6: number;
  place7: number;
  place8: number;
  place9: number;
  place10plus: number;
};

function makeEmptyMultiRankStats(): MultiRankStats {
  return {
    first: 0,
    second: 0,
    third: 0,
    place4: 0,
    place5: 0,
    place6: 0,
    place7: 0,
    place8: 0,
    place9: 0,
    place10plus: 0,
  };
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Essaie de retrouver le rang du joueur dans un enregistrement de match
function getPlayerRankInRecord(rec: any, playerId: string | null): number | null {
  if (!playerId) return null;
  const pid = String(playerId);

  const candidates =
    asArray<any>(rec.ranks) ||
    asArray<any>(rec.standings) ||
    asArray<any>(rec.leaderboard) ||
    asArray<any>(rec.players);

  if (!candidates.length) return null;

  for (const p of candidates) {
    const idStr = String(
      p.id ?? p.playerId ?? p.profileId ?? p.pid ?? ""
    );
    if (!idStr || idStr !== pid) continue;

    const rawRank = p.rank ?? p.place ?? p.position ?? p.standing ?? null;
    if (rawRank == null) return null;

    const n =
      typeof rawRank === "number"
        ? rawRank
        : parseInt(String(rawRank), 10);

    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  return null;
}

// Calcule les stats de classement multi (1er / 2e / 3e / 4e→10+)
function computeMultiRankStats(
  records: any[],
  playerId: string | null
): MultiRankStats {
  const stats = makeEmptyMultiRankStats();
  if (!playerId) return stats;

  for (const rec of records) {
    if (!rec) continue;

    // On ne garde que les matchs "multi" (≃ 3 joueurs ou plus)
    const players = asArray<any>(rec.players);
    if (players.length < 3) continue;

    const rank = getPlayerRankInRecord(rec, playerId);
    if (!rank || rank < 1) continue;

    if (rank === 1) stats.first += 1;
    else if (rank === 2) stats.second += 1;
    else if (rank === 3) stats.third += 1;
    else if (rank === 4) stats.place4 += 1;
    else if (rank === 5) stats.place5 += 1;
    else if (rank === 6) stats.place6 += 1;
    else if (rank === 7) stats.place7 += 1;
    else if (rank === 8) stats.place8 += 1;
    else if (rank === 9) stats.place9 += 1;
    else stats.place10plus += 1; // 10e et plus
  }

  return stats;
}

// ---------- Thème local ----------
const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
};

const goldNeon: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#F6C256",
  textShadow: "0 0 8px rgba(246,194,86,.9), 0 0 16px rgba(246,194,86,.45)",
  letterSpacing: 0.8,
};

const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

// ---------- Types / helpers ----------

type TimeRange = "all" | "day" | "week" | "month" | "year";

/**
 * Ligne de stats = 1 joueur sur 1 match X01
 */
export type X01MultiSession = {
  id: string; // matchId + selectedPlayerId
  matchId: string;
  date: number;
  selectedPlayerId: string;
  playerName: string;
  // 🔥 AJOUT
  profileId?: string | null;

  // 🔥 pour les stats TEAM
  teamId?: string | null;

  darts: number;
  avg3D: number;
  avg1D: number;
  bestVisit: number;
  bestCheckout: number | null;

  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;

  bySegmentS?: Record<string, number>;
  bySegmentD?: Record<string, number>;
  bySegmentT?: Record<string, number>;

  // ➕ nouveaux champs pour les stats match
  isWin?: boolean;
  legsPlayed?: number;
  legsWon?: number;
  setsPlayed?: number;
  setsWon?: number;
  finishes?: number;
  isTeam?: boolean;

  // ➕ rang du joueur sur le match (multi)
  rank?: number | null;

  // ➕ avatar compressé (si dispo dans History.players)
  avatarDataUrl?: string | null;
};

type Props = {
  /** Optionnel : ne garder que ce profil */
  profileId?: string | null;
};

// Ordre plateau + Bull + MISS (comme le Training X01)
const HITS_SEGMENTS: (number | "MISS")[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  25,
  "MISS",
];

function filterByRange(
  sessions: X01MultiSession[],
  range: TimeRange
): X01MultiSession[] {
  if (range === "all") return sessions;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const delta =
    range === "day"
      ? ONE_DAY
      : range === "week"
      ? 7 * ONE_DAY
      : range === "month"
      ? 30 * ONE_DAY
      : 365 * ONE_DAY;
  const minDate = now - delta;
  return sessions.filter((s) => s.date >= minDate);
}

function formatShortDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function cap(n: number) {
  return Math.min(200, Math.max(0, Math.round(n)));
}

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/**
 * Détail summary => X01MultiSession partiel (sans meta)
 * Utilise en priorité :
 *  - summary.detailedByPlayer[pid] (notre nouveau format)
 *  - summary.avg3ByPlayer / bestVisitByPlayer / bestCheckoutByPlayer
 *  - summary.perPlayer (compat anciens matchs)
 */
function buildSessionFromSummary(
  match: any,
  pid: string
): Omit<
  X01MultiSession,
  "id" | "matchId" | "date" | "selectedPlayerId" | "playerName"
> | null {
  const summary = match.summary || {};
  const detailedByPlayer = summary.detailedByPlayer || {};
  const perPlayer: any[] = Array.isArray(summary.perPlayer)
    ? summary.perPlayer
    : [];

  const pidStr = String(pid);

  // Ligne perPlayer qui correspond à ce joueur
  const row =
    perPlayer.find((p) => {
      const candidates = [
        p.playerId,
        p.selectedPlayerId,
        p.profileId,
        p.id,
        p.pid,
      ]
        .filter(Boolean)
        .map((x: any) => String(x));
      return candidates.includes(pidStr);
    }) || {};

  // Détail V3
  const detail: any = detailedByPlayer[pid] || {};

  // ---------- Darts ----------
  let darts = numOr0(detail.darts, row.darts);
  if (!darts) {
    darts =
      numOr0(detail.hitsS, detail.hitsD, detail.hitsT, detail.miss) ||
      numOr0(row.hitsS, row.hitsD, row.hitsT, row.miss);
  }

  // ---------- Moyennes ----------
  const avg3D = numOr0(
    summary.avg3ByPlayer?.[pidStr],
    detail.avg3,
    detail.avg3D,
    row.avg3,
    row.avg3D
  );

  const avg1D =
    darts > 0 && avg3D > 0
      ? avg3D / 3
      : numOr0(detail.avg1D, row.avg1D);

  // ---------- Records BV ----------
  const bestVisit = numOr0(
    summary.bestVisitByPlayer?.[pidStr],
    detail.bestVisit,
    row.bestVisit
  );

  // ===== CO (Checkout) — version ultra tolérante =====
  const rawCOByPlayer =
    summary.bestCheckoutByPlayer?.[pidStr] ??
    summary.bestFinishByPlayer?.[pidStr] ??
    summary.bestCoByPlayer?.[pidStr];

  const genericSummaryCO =
    summary.bestCheckout ??
    summary.bestCo ??
    summary.bestFinish ??
    null;

  const bestCheckoutRaw =
    // per-player row
    row?.bestCheckout ??
    row?.bestCO ??
    row?.bestCo ??
    row?.bestFinish ??
    row?.checkout ??
    row?.co ??
    // summary.*ByPlayer[pid]
    rawCOByPlayer ??
    // summary global
    genericSummaryCO ??
    // detailedByPlayer[pid]
    detail?.bestCheckout ??
    detail?.bestCO ??
    detail?.bestCo ??
    detail?.bestFinish ??
    detail?.checkout ??
    detail?.co ??
    // éventuellement sur le match lui-même
    match?.bestCheckout ??
    match?.bestCo ??
    match?.bestFinish ??
    null;

  let bestCheckout = 0;
  if (bestCheckoutRaw != null) {
    const parsed = Number(bestCheckoutRaw);
    bestCheckout = Number.isFinite(parsed) ? parsed : 0;
  }
  // ============================================

  // ---------- Hits / Miss / Bust (hors Bull) ----------
  const hitsS = numOr0(detail.hitsS, row.hitsS);
  const hitsD = numOr0(detail.hitsD, row.hitsD);
  const hitsT = numOr0(detail.hitsT, row.hitsT);
  const miss = numOr0(detail.miss, row.miss);
  const bust = numOr0(detail.bust, row.bust);

  // ---------- bySegment S / D / T ----------
  const bySegmentS: Record<string, number> =
    (detail.bySegmentS && typeof detail.bySegmentS === "object"
      ? detail.bySegmentS
      : row.bySegmentS) || {};

  const bySegmentD: Record<string, number> =
    (detail.bySegmentD && typeof detail.bySegmentD === "object"
      ? detail.bySegmentD
      : row.bySegmentD) || {};

  const bySegmentT: Record<string, number> =
    (detail.bySegmentT && typeof detail.bySegmentT === "object"
      ? detail.bySegmentT
      : row.bySegmentT) || {};

  // ---------- Bull / DBull (d’abord champs, puis fallback segments 25) ----------
  const bull = numOr0(
    detail.bull,
    row.bull,
    (bySegmentS && (bySegmentS["25"] ?? (bySegmentS as any)[25])) ?? 0
  );

  const dBull = numOr0(
    detail.dBull,
    row.dBull,
    (bySegmentD && (bySegmentD["25"] ?? (bySegmentD as any)[25])) ?? 0
  );

  // ---------- Win / legs / sets ----------
  const isWinExplicit =
    match.winnerId && String(match.winnerId) === pidStr;

  const isWinHeuristic =
    row.isWinner === true ||
    row.won === true ||
    row.win === true ||
    row.victory === true ||
    row.result === "win" ||
    row.outcome === "win" ||
    (typeof row.rank === "number" && row.rank === 1) ||
    (typeof row.position === "number" && row.position === 1);

  const isWin = isWinExplicit || isWinHeuristic;

  // 🔥 On essaye d'être ULTRA tolérant sur l'endroit où sont stockés les legs/sets

  // maps "legs gagnés"
  const legsMapCandidates: any[] = [
    summary?.legsByPlayer,
    summary?.legsScore,
    match?.payload?.legsWon,
    match?.legsWon,
  ];

  // maps "legs joués"
  const legsPlayedMapCandidates: any[] = [
    summary?.legsPlayedByPlayer,
    summary?.legsPlayed,
  ];

  // maps "sets gagnés"
  const setsMapCandidates: any[] = [
    summary?.setsByPlayer,
    summary?.setsScore,
    match?.payload?.setsWon,
    match?.setsWon,
  ];

  // maps "sets joués"
  const setsPlayedMapCandidates: any[] = [
    summary?.setsPlayedByPlayer,
    summary?.setsPlayed,
  ];

  // clés possibles pour ce joueur dans les maps
  const candidateKeys: string[] = [
    pidStr,
    row.playerId,
    row.selectedPlayerId,
    row.profileId,
    row.id,
    row.pid,
  ]
    .filter(Boolean)
    .map((x: any) => String(x));

  function lookupValueInMaps(maps: any[]): number {
    for (const map of maps) {
      if (!map || typeof map !== "object") continue;
      for (const key of candidateKeys) {
        if (key in map) {
          const v = (map as any)[key];
          const n = Number(v);
          if (Number.isFinite(n)) return n;
        }
      }
    }
    return 0;
  }

  function sumFirstMap(maps: any[]): number {
    const map = maps.find((m) => m && typeof m === "object");
    if (!map) return 0;
    return Object.values(map as any).reduce(
      (sum: number, v: any) => sum + numOr0(v),
      0
    );
  }

  // 1) on lit d'abord ce qui vient du détail V3 (legsPlayedTotal, legsWonTotal, etc.)
  let legsWon = numOr0(
    detail.legsWonTotal,
    detail.legsWon,
    row.legsWon
  );
  let legsPlayed = numOr0(
    detail.legsPlayedTotal,
    detail.legsPlayed,
    row.legsPlayed
  );

  let setsWon = numOr0(
    detail.setsWonTotal,
    detail.setsWon,
    row.setsWon
  );
  let setsPlayed = numOr0(
    detail.setsPlayedTotal,
    detail.setsPlayed,
    row.setsPlayed
  );

  // 2) si on n'a toujours rien, on va chercher dans les maps summary.*
  if (!legsWon) {
    const v = lookupValueInMaps(legsMapCandidates);
    if (v) legsWon = v;
  }
  if (!setsWon) {
    const v = lookupValueInMaps(setsMapCandidates);
    if (v) setsWon = v;
  }

  // 3) si legsPlayed/setsPlayed sont à 0, on estime "Total" = somme des legs/sets gagnés de tout le match
  if (!legsPlayed) {
    const totalLegs = sumFirstMap(legsMapCandidates);
    if (totalLegs) legsPlayed = totalLegs;
  }
  if (!setsPlayed) {
    const totalSets = sumFirstMap(setsMapCandidates);
    if (totalSets) setsPlayed = totalSets;
  }

  const finishes = numOr0(
    (row as any).finishes,
    (row as any).finishCount,
    (detail as any).finishes,
    (detail as any).finishCount
  );

  // ---------- Rang multi ----------
  const rawRank =
    (row as any).rank ??
    (row as any).position ??
    (row as any).place ??
    (row as any).standing ??
    (detail as any).rank ??
    (detail as any).position ??
    null;

  let rank: number | null = null;
  if (rawRank !== null && rawRank !== undefined) {
    const n =
      typeof rawRank === "number"
        ? rawRank
        : parseInt(String(rawRank), 10);
    rank = Number.isFinite(n) && n > 0 ? n : null;
  }

  // Si vraiment rien → on ignore ce match
  if (!darts && !hitsS && !hitsD && !hitsT && !miss) return null;

  return {
    playerId: pidStr,          // 🔥 OBLIGATOIRE sinon toutes les stats se mélangent !
    darts,
    avg3D,
    avg1D,
    bestVisit,
    bestCheckout,
    hitsS,
    hitsD,
    hitsT,
    miss,
    bull,
    dBull,
    bust,
    bySegmentS,
    bySegmentD,
    bySegmentT,
    isWin,
    legsPlayed,
    legsWon,
    setsPlayed,
    setsWon,
    finishes,
    rank,
  };
}

/**
 * Chargement des matchs X01 depuis History
 * - match X01 détecté même si kind / game / mode / variant = "x01v3" etc.
 * - summary.detailedByPlayer consolidé
 * - Si profileId fourni : ne garder que ce profil
 *   (match.players[].profileId === profileId OU player.id === profileId)
 */
async function loadX01MultiSessions(
  profileId?: string | null
): Promise<X01MultiSession[]> {
  let list: any[] = [];
  try {
    list = (await History.list()) || [];
  } catch (e) {
    console.warn("[X01MultiStatsTabFull] History.list() failed", e);
    return [];
  }

  const out: X01MultiSession[] = [];

  for (const match of list) {
    // --------- 1) est-ce bien un X01 / X01V3 ? ----------
    const candidates: any[] = [
      match.kind,
      match.game,
      match.mode,
      match.variant,
      match.type,
      match?.payload?.kind,
      match?.payload?.game,
      match?.payload?.mode,
      match?.payload?.variant,
    ];

    const isX01 = candidates
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes("x01"));

    if (!isX01) continue;

    // --------- 2) méta (id + date) ----------
    const matchId = match.id || match.matchId || "";
    const createdAt =
      Number(match.updatedAt) ||
      Number(match.createdAt) ||
      Number(match?.payload?.updatedAt) ||
      Number(match?.payload?.createdAt) ||
      Date.now();

    // --------- 3) liste des joueurs ----------
    const players: any[] =
      (Array.isArray(match.players) && match.players.length
        ? match.players
        : Array.isArray(match?.payload?.players)
        ? match.payload.players
        : []) || [];

    if (!players.length) continue;

    // --------- 4) si profileId fourni → on ne garde que les matchs où il joue ----------
    if (profileId) {
      const playsThisMatch = players.some(
        (p) => p?.profileId === profileId || p?.id === profileId
      );
      if (!playsThisMatch) continue;
    }

    // --------- 5) on crée UNE session par joueur ----------
    for (const player of players) {
      const pidCandidate =
        player.id ??
        player.profileId ??
        player.playerId ??
        player.pid ??
        null;
      if (!pidCandidate) continue;

      const pid = String(pidCandidate);
      const base = buildSessionFromSummary(match, pid);
      if (!base) continue;

      const isTeam =
        ["team", "teams"].some((w) =>
          String(
            match.gameMode ||
              match.mode ||
              match.variant ||
              match?.payload?.gameMode ||
              match?.payload?.mode ||
              match?.payload?.variant
          )
            .toLowerCase()
            .includes(w)
        ) || !!(player as any).teamId;

      const teamId = (player as any).teamId ?? null;

      const playerName =
        player.name ||
        player.displayName ||
        player.nickname ||
        player.nick ||
        player.label ||
        "Player";

      out.push({
        id: `${matchId}:${pid}`,
        matchId,
        date: createdAt,
        selectedPlayerId: pid,
        playerName,
        // 🔥 profileId pour lier aux profils / bots
        profileId: player.profileId ?? player.id ?? null,
        // 🔥 avatar qui vient directement de History.players[].avatarDataUrl
        avatarDataUrl: player.avatarDataUrl ?? null,
        isTeam,
        teamId,
        ...base,
      });
    }
  }

  // Tri chronologique
  return out.sort((a, b) => a.date - b.date);
}

// Normalisation d’un dart pour le radar
function normalizeX01Dart(v: number, mult: number): UIDart | null {
  if (!Number.isFinite(v) || !Number.isFinite(mult)) return null;
  if (v < 0 || mult < 0) return null;
  return { v, mult: mult as 0 | 1 | 2 | 3 };
}

// ===========================================================
// Composant principal
// ===========================================================

// ⚠️ On accepte maintenant playerId en plus de profileId
export default function X01MultiStatsTabFull({
  profileId,
  playerId,
}: {
  profileId?: string | null;
  playerId?: string | null;
}) {
  // 👉 ID effectivement utilisé pour filtrer les sessions :
  //    - priorité au playerId (venant de StatsHub / carrousel)
  //    - fallback sur profileId (anciens appels)
  const effectiveProfileId = React.useMemo(
    () => playerId ?? profileId ?? null,
    [playerId, profileId]
  );

  const [sessions, setSessions] = React.useState<X01MultiSession[]>([]);
  const [range, setRange] = React.useState<TimeRange>("all");
  const [selected, setSelected] = React.useState<X01MultiSession | null>(null);

  const metricKeys: Array<
    "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
  > = ["darts", "avg3D", "pctS", "pctD", "pctT", "BV", "CO"];

  const [metric, setMetric] = React.useState<
    "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
  >("avg3D");

  const [metricLocked, setMetricLocked] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // Chargement des matchs (une fois + quand l’ID effectif change)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadX01MultiSessions(effectiveProfileId);
      if (!cancelled) {
        setSessions(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveProfileId]);

  // Auto-défilement métriques
  React.useEffect(() => {
    if (!sessions.length) return;
    if (metricLocked) return;

    const id = window.setInterval(() => {
      setMetric((prev) => {
        const idx = metricKeys.indexOf(prev);
        const nextIdx = idx === -1 ? 0 : (idx + 1) % metricKeys.length;
        return metricKeys[nextIdx];
      });
    }, 4000);

    return () => window.clearInterval(id);
  }, [sessions.length, metricLocked]);

  React.useEffect(() => {
    if (!metricLocked) return;
    const id = window.setTimeout(() => setMetricLocked(false), 15000);
    return () => window.clearTimeout(id);
  }, [metricLocked]);

  // Sessions filtrées
  const filtered = React.useMemo(
    () => filterByRange(sessions, range).sort((a, b) => a.date - b.date),
    [sessions, range]
  );

  // Classements multi pour le joueur (ou tous si aucun ID fourni)
  const multiRanks = React.useMemo(() => {
    const stats = makeEmptyMultiRankStats();
    if (!filtered.length) return stats;

    // Regroupe les lignes par match
    const byMatch = new Map<string, X01MultiSession[]>();
    for (const s of filtered) {
      if (!s.matchId) continue;
      const arr = byMatch.get(s.matchId) || [];
      arr.push(s);
      byMatch.set(s.matchId, arr);
    }

    for (const [, arr] of byMatch) {
      // Multi = au moins 3 joueurs sur le match (et pas TEAM)
      if (arr.length < 3) continue;
      const isTeamMatch = arr.some((p) => p.isTeam);
      if (isTeamMatch) continue;

      for (const s of arr) {
        // 🔥 On ne garde que les lignes du joueur sélectionné :
        //    on compare d'abord profileId, puis on fallback sur selectedPlayerId
        if (effectiveProfileId) {
          const target = String(effectiveProfileId);
          const lineProfileId =
            s.profileId != null ? String(s.profileId) : null;
          const linePlayerId =
            s.selectedPlayerId != null ? String(s.selectedPlayerId) : null;

          if (lineProfileId !== target && linePlayerId !== target) {
            continue;
          }
        }

        const r = s.rank ?? null;
        if (!r || r < 1) continue;

        if (r === 1) stats.first++;
        else if (r === 2) stats.second++;
        else if (r === 3) stats.third++;
        else if (r === 4) stats.place4++;
        else if (r === 5) stats.place5++;
        else if (r === 6) stats.place6++;
        else if (r === 7) stats.place7++;
        else if (r === 8) stats.place8++;
        else if (r === 9) stats.place9++;
        else stats.place10plus++;
      }
    }

    return stats;
  }, [filtered, effectiveProfileId]);
  
  // --- AGRÉGATION RÉELLE DES MATCHS PAR TYPE ---

  // Regroupe les sessions par matchId (une ligne par joueur)
  const matchGroups = new Map<string, X01MultiSession[]>();
  for (const s of filtered) {
    if (!s.matchId) continue;
    const arr = matchGroups.get(s.matchId) || [];
    arr.push(s);
    matchGroups.set(s.matchId, arr);
  }

  // Helper : calcule Legs / Sets pour une ligne de match
  function computeLegsSetsForLine(
    line: X01MultiSession,
    group: X01MultiSession[]
  ) {
    const isTeam = line.isTeam === true;
    const numPlayers = group.length;
    const isDuo = !isTeam && numPlayers === 2;

    let legsPlayed = line.legsPlayed ?? 0;
    let legsWon = line.legsWon ?? 0;
    let setsPlayed = line.setsPlayed ?? 0;
    let setsWon = line.setsWon ?? 0;

    const myFinishes = (line as any).finishes ?? 0;

    // 🔥 DUO : si on n'a pas les legs / sets, on les reconstruit
    if (isDuo) {
      const opp = group.find(
        (x) => x.selectedPlayerId !== line.selectedPlayerId
      );
      const oppFinishes = (opp as any)?.finishes ?? 0;

      // 1 leg gagné = 1 finish
      if (!legsWon) legsWon = myFinishes;
      // 1 leg joué = 1 finish (quel que soit le joueur)
      if (!legsPlayed) legsPlayed = myFinishes + oppFinishes;
    }

    return { legsPlayed, legsWon, setsPlayed, setsWon };
  }

  let duoTotal = 0,
    duoWins = 0,
    duoLegsWon = 0,
    duoLegsPlayed = 0,
    duoSetsWon = 0,
    duoSetsPlayed = 0;

  let multiTotal = 0,
    multiWins = 0,
    multiLegsWon = 0,
    multiLegsPlayed = 0,
    multiFinishCount = 0; // 🔥 nb de FINISH en multi (ne pas finir dernier)

  let teamTotal = 0,
    teamWins = 0,
    teamLegsWon = 0,
    teamLegsPlayed = 0,
    teamSetsWon = 0,
    teamSetsPlayed = 0;

  // 🔥 stats par format de team (2v2, 3v3, 2v2v2, 2v2v2v2, etc.)
  const teamFormatStats: Record<string, { total: number; win: number }> = {};

  // 🔥 Compteurs globaux X01 (tous formats confondus) pour le joueur
  let x01MatchesTotal = 0;
  let x01WinsTotal = 0;
  let x01LegsPlayedTotal = 0;
  let x01LegsWonTotal = 0;
  let x01SetsPlayedTotal = 0;
  let x01SetsWonTotal = 0;

  // Pour chaque match → on ne lit QUE la ligne du joueur sélectionné
  for (const [, arr] of matchGroups) {
    let playerLine: X01MultiSession | undefined;

    if (effectiveProfileId) {
      playerLine =
        arr.find(
          (s) => String(s.selectedPlayerId) === String(effectiveProfileId)
        ) || arr[0]; // fallback si les IDs ne matchent pas
    } else {
      playerLine = arr[0];
    }

    if (!playerLine) continue;

    const isTeam = playerLine.isTeam === true;
    const numPlayers = arr.length;
    const isDuo = !isTeam && numPlayers === 2;
    const isMulti = !isTeam && numPlayers >= 3;

    const { legsPlayed, legsWon, setsPlayed, setsWon } =
      computeLegsSetsForLine(playerLine, arr);

    // 🔥 Compteurs globaux X01 pour ce joueur (tous formats confondus)
    x01MatchesTotal++;
    if (playerLine.isWin) x01WinsTotal++;

    x01LegsPlayedTotal += legsPlayed;
    x01LegsWonTotal += legsWon;

    x01SetsPlayedTotal += setsPlayed;
    x01SetsWonTotal += setsWon;

    // ---- DUO ----
    if (isDuo) {
      duoTotal++;
      if (playerLine.isWin) duoWins++;

      duoLegsWon += legsWon;
      duoLegsPlayed += legsPlayed;

      duoSetsWon += setsWon;
      duoSetsPlayed += setsPlayed;
    }

    // ---- MULTI ----
    if (isMulti) {
      multiTotal++;
      if (playerLine.isWin) multiWins++;

      multiLegsWon += legsWon;
      multiLegsPlayed += legsPlayed;

      // 🔥 FINISH = ne pas arriver dernier (rang < nb joueurs)
      const myRank = playerLine.rank ?? null;
      if (myRank && myRank < numPlayers) {
        multiFinishCount++;
      }
    }

    // ---- TEAM ----
    if (isTeam) {
      teamTotal++;
      if (playerLine.isWin) teamWins++;

      teamLegsWon += legsWon;
      teamLegsPlayed += legsPlayed;

      teamSetsWon += setsWon;
      teamSetsPlayed += setsPlayed;

      // 🔥 Détection du format (2v2, 3v3, 2v2v2, 2v2v2v2, etc.)
      const teamCount: Record<string, number> = {};
      for (const line of arr) {
        const tid = line.teamId || "team";
        teamCount[tid] = (teamCount[tid] || 0) + 1;
      }
      const sizes = Object.values(teamCount).sort((a, b) => b - a);
      const formatLabel =
        sizes.length > 0 ? sizes.join("v") : "team";

      const bucket =
        teamFormatStats[formatLabel] ||
        (teamFormatStats[formatLabel] = { total: 0, win: 0 });

      bucket.total++;
      if (playerLine.isWin) bucket.win++;
    }
  }


// --- Calculs finaux ---

const pct = (num: number, den: number) =>
  den > 0 ? ((num / den) * 100).toFixed(1) : "0.0";

  const duoPctWin = pct(duoWins, duoTotal);
  const multiPctWin = pct(multiWins, multiTotal);
  const teamPctWin = pct(teamWins, teamTotal);
  
  const duoPctLegs = pct(duoLegsWon, duoLegsPlayed);
  const multiPctLegs = pct(multiLegsWon, multiLegsPlayed); // on le garde au cas où
  const teamPctLegs = pct(teamLegsWon, teamLegsPlayed);
  
  const duoPctSets = pct(duoSetsWon, duoSetsPlayed);
  const teamPctSets = pct(teamSetsWon, teamSetsPlayed);
  
  // 🔥 % FINISH multi
  const multiPctFinish = pct(multiFinishCount, multiTotal);

  const totalSessions = filtered.length;
  const totalDarts = filtered.reduce((s: any, x: any) => s + x.darts, 0);
  const avgDarts = totalSessions > 0 ? totalDarts / totalSessions : 0;

  const bestVisit =
    totalSessions > 0 ? Math.max(...filtered.map((x: any) => x.bestVisit)) : 0;

  const bestCheckout =
    totalSessions > 0
      ? Math.max(...filtered.map((x: any) => (x.bestCheckout ?? 0) || 0))
      : 0;

  const globalAvg3D =
    totalSessions > 0
      ? filtered.reduce((s: any, x: any) => s + x.avg3D, 0) / totalSessions
      : 0;

  const globalAvg1D =
    totalSessions > 0
      ? filtered.reduce((s: any, x: any) => s + x.avg1D, 0) / totalSessions
      : 0;

  // Agrégats hits / miss / bull etc.
  // (on réutilise totalSessions = filtered.length; défini juste au-dessus)

  let gHitsS = 0,
    gHitsD = 0,
    gHitsT = 0,
    gMiss = 0,
    gBull = 0,
    gDBull = 0,
    gBust = 0;

  let minDarts: number | null = null,
    maxDarts: number | null = null,
    minHits: number | null = null,
    maxHits: number | null = null,
    minS: number | null = null,
    maxS: number | null = null,
    minD: number | null = null,
    maxD: number | null = null,
    minT: number | null = null,
    maxT: number | null = null,
    minMiss: number | null = null,
    maxMiss: number | null = null,
    minBust: number | null = null,
    maxBust: number | null = null,
    minBull: number | null = null,
    maxBull: number | null = null,
    minDBull: number | null = null,
    maxDBull: number | null = null,
    // 🔥 nouveau : stats CO (bestCheckout par session > 0)
    minCO: number | null = null,
    maxCO: number | null = null;

  // nombre de sessions où il y a AU MOINS un checkout
  let sessionsWithCO = 0;

  for (const s of filtered) {
    const darts = s.darts || 0;
    const sS = s.hitsS ?? 0;
    const sD = s.hitsD ?? 0;
    const sT = s.hitsT ?? 0;
    const sMiss = s.miss ?? 0;
    const sBull = s.bull ?? 0;
    const sDBull = s.dBull ?? 0;
    const sBust = s.bust ?? 0;
    const sHits = sS + sD + sT;
    const sCO = (s.bestCheckout ?? 0) || 0; // 🔥 best CO pour cette session

    const hasCounters =
      sS + sD + sT + sMiss + sBull + sDBull + sBust > 0;

    if (!hasCounters) continue;

    gHitsS += sS;
    gHitsD += sD;
    gHitsT += sT;
    gMiss += sMiss;
    gBull += sBull;
    gDBull += sDBull;
    gBust += sBust;

    if (darts > 0) {
      if (minDarts === null || darts < minDarts) minDarts = darts;
      if (maxDarts === null || darts > maxDarts) maxDarts = darts;

      if (minHits === null || sHits < minHits) minHits = sHits;
      if (maxHits === null || sHits > maxHits) maxHits = sHits;

      if (minS === null || sS < minS) minS = sS;
      if (maxS === null || sS > maxS) maxS = sS;

      if (minD === null || sD < minD) minD = sD;
      if (maxD === null || sD > maxD) maxD = sD;

      if (minT === null || sT < minT) minT = sT;
      if (maxT === null || sT > maxT) maxT = sT;

      if (minMiss === null || sMiss < minMiss) minMiss = sMiss;
      if (maxMiss === null || sMiss > maxMiss) maxMiss = sMiss;

      if (minBust === null || sBust < minBust) minBust = sBust;
      if (maxBust === null || sBust > maxBust) maxBust = sBust;

      if (minBull === null || sBull < minBull) minBull = sBull;
      if (maxBull === null || sBull > maxBull) maxBull = sBull;

      if (minDBull === null || sDBull < minDBull) minDBull = sDBull;
      if (maxDBull === null || sDBull > maxDBull) maxDBull = sDBull;

      // --- CO (bestCheckout par session) ---
      if (sCO > 0) {
        sessionsWithCO++;
        if (minCO === null || sCO < minCO) minCO = sCO;
        if (maxCO === null || sCO > maxCO) maxCO = sCO;
      }
    }
  }

  const totalHits = gHitsS + gHitsD + gHitsT;
  const totalThrows = totalHits + gMiss;

  const hitsPercent = totalThrows > 0 ? (totalHits / totalThrows) * 100 : 0;
  const simplePercent = totalHits > 0 ? (gHitsS / totalHits) * 100 : 0;
  const doublePercent = totalHits > 0 ? (gHitsD / totalHits) * 100 : 0;
  const triplePercent = totalHits > 0 ? (gHitsT / totalHits) * 100 : 0;

  const avgHitsSPerSession =
    totalSessions > 0 ? gHitsS / totalSessions : 0;
  const avgHitsDPerSession =
    totalSessions > 0 ? gHitsD / totalSessions : 0;
  const avgHitsTPerSession =
    totalSessions > 0 ? gHitsT / totalSessions : 0;
  const avgMissPerSession =
    totalSessions > 0 ? gMiss / totalSessions : 0;
  const avgBustPerSession =
    totalSessions > 0 ? gBust / totalSessions : 0;
  const avgBullPerSession =
    totalSessions > 0 ? gBull / totalSessions : 0;
  const avgDBullPerSession =
    totalSessions > 0 ? gDBull / totalSessions : 0;

  const bestAvg3DSession =
    totalSessions > 0
      ? Math.max(...filtered.map((x: any) => x.avg3D || 0))
      : 0;

  const pctHitsGlobal = totalThrows > 0 ? hitsPercent : null;
  const pctMissGlobal =
    totalThrows > 0 ? (gMiss / totalThrows) * 100 : null;
  const pctSimpleGlobal =
    totalHits > 0 ? (gHitsS / totalHits) * 100 : null;
  const pctDoubleGlobal =
    totalHits > 0 ? (gHitsD / totalHits) * 100 : null;
  const pctTripleGlobal =
    totalHits > 0 ? (gHitsT / totalHits) * 100 : null;

  const pctBullGlobal =
    totalDarts > 0 ? (gBull / totalDarts) * 100 : null;
  const pctDBullGlobal =
    totalDarts > 0 ? (gDBull / totalDarts) * 100 : null;
  const pctBustGlobal =
    totalThrows > 0 ? (gBust / totalThrows) * 100 : null;
     // 🔥 % de sessions avec au moins un checkout (CO)
  const pctCOGlobal =
  totalSessions > 0 ? (sessionsWithCO / totalSessions) * 100 : null;

// ================== AGRÉGATS MATCHS (tous modes) ==================
// 🔥 Ici on utilise UNIQUEMENT la ligne du joueur courant sur chaque match
// (compteurs x01MatchesTotal / x01WinsTotal / x01Legs* / x01Sets* calculés plus haut)

const matchesX01Total = x01MatchesTotal;
const winsX01Total = x01WinsTotal;

const pctWinX01 =
  matchesX01Total > 0
    ? (winsX01Total / matchesX01Total) * 100
    : 0;

const legsPlayedX01 = x01LegsPlayedTotal;
const legsWonX01 = x01LegsWonTotal;
const pctLegsWinX01 =
  legsPlayedX01 > 0 ? (legsWonX01 / legsPlayedX01) * 100 : 0;

const setsPlayedX01 = x01SetsPlayedTotal;
const setsWonX01 = x01SetsWonTotal;
const pctSetsWinX01 =
  setsPlayedX01 > 0 ? (setsWonX01 / setsPlayedX01) * 100 : 0;

  // Pour l’instant on n’a pas encore branché Cricket → 0
  const matchesCricketSolo = 0;
  const matchesCricketTeam = 0;
  const winsCricketSolo = 0;
  const winsCricketTeam = 0;
  const legsWinCricket = 0;
  const setsWinCricket = 0;

  // helpers formats pour la carte "Stats matchs"
  const fmtInt = (v: number | null | undefined) =>
    v && Number.isFinite(v) ? v.toString() : "0";

  const fmtPct = (v: number | null | undefined) =>
    v && Number.isFinite(v) && v !== 0 ? `${v.toFixed(1)}%` : "-";

  // Darts pour radar + hits/segment (reconstruits depuis bySegmentS/D/T)
  const x01DartsAll: UIDart[] = React.useMemo(() => {
    const out: UIDart[] = [];

    for (const s of filtered) {
      const { bySegmentS, bySegmentD, bySegmentT } = s;

      if (
        (!bySegmentS || !Object.keys(bySegmentS).length) &&
        (!bySegmentD || !Object.keys(bySegmentD).length) &&
        (!bySegmentT || !Object.keys(bySegmentT).length)
      ) {
        continue;
      }

      const keys = new Set<string>([
        ...Object.keys(bySegmentS || {}),
        ...Object.keys(bySegmentD || {}),
        ...Object.keys(bySegmentT || {}),
      ]);

      for (const segStr of keys) {
        const seg = Number(segStr);
        if (!Number.isFinite(seg) || seg <= 0) continue;

        const sCount = cap(Number(bySegmentS?.[segStr] || 0));
        const dCount = cap(Number(bySegmentD?.[segStr] || 0));
        const tCount = cap(Number(bySegmentT?.[segStr] || 0));

        for (let i = 0; i < sCount; i++) {
          const d = normalizeX01Dart(seg, 1);
          if (d) out.push(d);
        }
        for (let i = 0; i < dCount; i++) {
          const d = normalizeX01Dart(seg, 2);
          if (d) out.push(d);
        }
        for (let i = 0; i < tCount; i++) {
          const d = normalizeX01Dart(seg, 3);
          if (d) out.push(d);
        }
      }
    }

    return out;
  }, [filtered]);

  // Hit préféré / favoris
  const segmentCount: Record<string, number> = {};
  for (const d of x01DartsAll) {
    const v = Number((d as any)?.v) || 0;
    if (v <= 0) continue;
    const key = v === 25 ? "25" : String(v);
    segmentCount[key] = (segmentCount[key] || 0) + 1;
  }

  let favoriteSegmentKey: string | null = null;
  let favoriteSegmentCount = 0;
  for (const [k, c] of Object.entries(segmentCount)) {
    if (c > favoriteSegmentCount) {
      favoriteSegmentCount = c;
      favoriteSegmentKey = k;
    }
  }

  const labelForSegment = (k: string | null) =>
    k === null ? null : k === "25" ? "25 (Bull)" : k;

  const favoriteHitDisplay = labelForSegment(favoriteSegmentKey);

  const segSDTMap: Record<string, { S: number; D: number; T: number }> = {};
  let chartMissCount = gMiss;

  for (const d of x01DartsAll) {
    const v = Number((d as any)?.v) || 0;
    const mult = Number((d as any)?.mult) || 0;

    if (v === 0 || mult === 0) continue;

    const key = v === 25 ? "25" : String(v);
    if (!segSDTMap[key]) segSDTMap[key] = { S: 0, D: 0, T: 0 };

    if (mult === 1) segSDTMap[key].S++;
    else if (mult === 2) segSDTMap[key].D++;
    else if (mult === 3) segSDTMap[key].T++;
  }

  const maxStackHits = HITS_SEGMENTS.reduce((max, seg) => {
    if (seg === "MISS") {
      return chartMissCount > max ? chartMissCount : max;
    }
  
    const data = segSDTMap[String(seg)];
    const tot = data ? data.S + data.D + data.T : 0;
  
    return tot > max ? tot : max;
  }, 0);

  let favSimpleKey: string | null = null;
  let favSimpleCount = 0;
  let favDoubleKey: string | null = null;
  let favDoubleCount = 0;
  let favTripleKey: string | null = null;
  let favTripleCount = 0;

  for (const [key, val] of Object.entries(segSDTMap)) {
    if (val.S > favSimpleCount) {
      favSimpleCount = val.S;
      favSimpleKey = key;
    }
    if (val.D > favDoubleCount) {
      favDoubleCount = val.D;
      favDoubleKey = key;
    }
    if (val.T > favTripleCount) {
      favTripleCount = val.T;
      favTripleKey = key;
    }
  }

  let leastHitKey: string | null = null;
  let leastHitCount = Infinity;
  for (const [key, count] of Object.entries(segmentCount)) {
    if (count > 0 && count < leastHitCount) {
      leastHitCount = count;
      leastHitKey = key;
    }
  }

  const favoriteSimpleDisplay = labelForSegment(favSimpleKey);
  const favoriteDoubleDisplay = labelForSegment(favDoubleKey);
  const favoriteTripleDisplay = labelForSegment(favTripleKey);
  const leastHitDisplay = labelForSegment(leastHitKey);

  // sparkline
  function valueForMetric(
    s: X01MultiSession,
    m: "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
  ): number {
    switch (m) {
      case "darts":
        return s.darts;
      case "avg3D":
        return s.avg3D;
      case "pctS": {
        const t = s.hitsS + s.hitsD + s.hitsT;
        return t > 0 ? (s.hitsS / t) * 100 : 0;
      }
      case "pctD": {
        const t = s.hitsS + s.hitsD + s.hitsT;
        return t > 0 ? (s.hitsD / t) * 100 : 0;
      }
      case "pctT": {
        const t = s.hitsS + s.hitsD + s.hitsT;
        return t > 0 ? (s.hitsT / t) * 100 : 0;
      }
      case "BV":
        return s.bestVisit;
      case "CO":
        return s.bestCheckout || 0;
      default:
        return 0;
    }
  }

  const sparkSeries = filtered.map((s: any) => ({
    x: s.date,
    y: valueForMetric(s, metric),
    session: s,
  }));

  // KPIs
  type RawKpiItem =
    | {
        kind: "num";
        label: string;
        raw: number | null;
        format?: (v: number) => string;
        allowZero?: boolean;
      }
    | {
        kind: "text";
        label: string;
        text: string | null;
      };

  type KpiDisplayItem = { label: string; value: string };

  function finalizeKpiItems(items: RawKpiItem[]): KpiDisplayItem[] {
    const out: KpiDisplayItem[] = [];
    for (const it of items) {
      if (it.kind === "num") {
        if (it.raw === null || Number.isNaN(it.raw)) continue;
        if (!it.allowZero && it.raw === 0) continue;
        const fmt = it.format ?? ((v: number) => `${v}`);
        out.push({ label: it.label, value: fmt(it.raw) });
      } else {
        if (!it.text) continue;
        out.push({ label: it.label, value: it.text });
      }
    }
    return out;
  }

  const goldItems = finalizeKpiItems([
    { kind: "num", label: "Darts totaux", raw: totalDarts, allowZero: true },
    {
      kind: "num",
      label: "Lignes joueur (matchs)",
      raw: totalSessions,
      allowZero: true,
    },
    { kind: "num", label: "Hits S cumulés", raw: gHitsS },
    { kind: "num", label: "Hits D cumulés", raw: gHitsD },
    { kind: "num", label: "Hits T cumulés", raw: gHitsT },
    { kind: "num", label: "Miss cumulés", raw: gMiss },
    { kind: "num", label: "Bull cumulés", raw: gBull },
    { kind: "num", label: "DBull cumulés", raw: gDBull },
    { kind: "num", label: "Bust cumulés", raw: gBust },
  ]);

  const pinkItems = finalizeKpiItems([
    {
      kind: "num",
      label: "Moy.3D (période)",
      raw: totalSessions > 0 ? globalAvg3D : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Moy.1D (période)",
      raw: totalSessions > 0 ? globalAvg1D : null,
      format: (v) => v.toFixed(2),
    },
    {
      kind: "num",
      label: "Darts / ligne",
      raw: totalSessions > 0 ? avgDarts : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Hits S / ligne",
      raw: totalSessions > 0 ? avgHitsSPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Hits D / ligne",
      raw: totalSessions > 0 ? avgHitsDPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Hits T / ligne",
      raw: totalSessions > 0 ? avgHitsTPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Miss / ligne",
      raw: totalSessions > 0 ? avgMissPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Bust / ligne",
      raw: totalSessions > 0 ? avgBustPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Bull / ligne",
      raw: totalSessions > 0 ? avgBullPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "DBull / ligne",
      raw: totalSessions > 0 ? avgDBullPerSession : null,
      format: (v) => v.toFixed(1),
    },
  ]);

  const blueItems = finalizeKpiItems([
    {
      kind: "text",
      label: "Hit préféré (global)",
      text: favoriteHitDisplay ?? null,
    },
    { kind: "num", label: "Best Visit (match)", raw: bestVisit },
    {
      kind: "num",
      label: "Best Checkout (match)",
      raw: bestCheckout > 0 ? bestCheckout : null,
    },
    {
      kind: "num",
      label: "Miss min / ligne",
      raw: minMiss,
      allowZero: true,
    },
    {
      kind: "num",
      label: "Miss max / ligne",
      raw: maxMiss,
    },
    {
      kind: "num",
      label: "Bust min / ligne",
      raw: minBust,
      allowZero: true,
    },
    {
      kind: "num",
      label: "Bust max / ligne",
      raw: maxBust,
    },
  ]);

  const green1Items = finalizeKpiItems([
    {
      kind: "num",
      label: "%Hits global",
      raw: pctHitsGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%Miss",
      raw: pctMissGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%S",
      raw: pctSimpleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%D",
      raw: pctDoubleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%T",
      raw: pctTripleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%Bull",
      raw: pctBullGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%DBull",
      raw: pctDBullGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
  ]);

  const green2Items = finalizeKpiItems([
    { kind: "num", label: "Best Visit", raw: bestVisit },
    {
      kind: "num",
      label: "Best Checkout",
      raw: bestCheckout > 0 ? bestCheckout : null,
    },
    {
      kind: "num",
      label: "Moy.3D (période)",
      raw: totalSessions > 0 ? globalAvg3D : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "%Hits global",
      raw: pctHitsGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%T (global)",
      raw: pctTripleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
  ]);

  const hasAnyKpi =
    goldItems.length ||
    pinkItems.length ||
    blueItems.length ||
    green1Items.length ||
    green2Items.length;

  const [ticker, setTicker] = React.useState(0);
  React.useEffect(() => {
    if (!hasAnyKpi) return;
    const id = window.setInterval(() => {
      setTicker((t: any) => t + 1);
    }, 4000);
    return () => window.clearInterval(id);
  }, [hasAnyKpi, filtered.length]);

  const currentGold =
    goldItems.length > 0 ? goldItems[ticker % goldItems.length] : null;
  const currentPink =
    pinkItems.length > 0 ? pinkItems[ticker % pinkItems.length] : null;
  const currentBlue =
    blueItems.length > 0 ? blueItems[ticker % blueItems.length] : null;
  const currentGreen1 =
    green1Items.length > 0 ? green1Items[ticker % green1Items.length] : null;
  const currentGreen2 =
    green2Items.length > 0 ? green2Items[ticker % green2Items.length] : null;

  const baseKpiBox: React.CSSProperties = {
    borderRadius: 22,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 4,
    background: "linear-gradient(180deg,#15171B,#101115)",
    minHeight: 78,
  };

  const makeKpiBox = (accent: string): React.CSSProperties => ({
    ...baseKpiBox,
    border: `1px solid ${accent}`,
    boxShadow: `0 0 0 1px ${accent}33, 0 0 14px ${accent}88, 0 0 28px ${accent}55`,
    background:
      "radial-gradient(circle at 0% 0%, " +
      accent +
      "26 0, transparent 55%), linear-gradient(180deg,#15171B,#101115)",
  });

  const kpiLabelStyle: React.CSSProperties = {
    fontSize: 10,
    color: T.text70,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };

  const kpiSub: React.CSSProperties = {
    fontSize: 11,
    color: T.text70,
  };

  const statRowBox: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    padding: "6px 0",
    borderTop: `1px solid rgba(255,255,255,.06)`,
  };

  const metricPill: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(0,0,0,.45)",
    cursor: "pointer",
  };

  React.useEffect(() => {
    setPage(1);
  }, [range, sessions.length]);

  const pageSize = 10;
  const totalPages =
    totalSessions > 0 ? Math.max(1, Math.ceil(totalSessions / pageSize)) : 1;

  const reversedSessions = filtered.slice().reverse();
  const pagedSessions = reversedSessions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // ============================================================
// STATS AVANCÉES X01 — RECORDS / ADVERSAIRES / TEAMMATES
// ============================================================

// 1) Regroupement des sessions par match
const groupedByMatch: Record<string, X01MultiSession[]> = {};
for (const s of filtered) {
  if (!groupedByMatch[s.matchId]) groupedByMatch[s.matchId] = [];
  groupedByMatch[s.matchId].push(s);
}

// 2) Résultats du joueur sélectionné par match
type MatchOutcome = {
  matchId: string;
  isTeam: boolean;
  players: string[]; // ids dans le match
  teammates: string[];
  opponents: string[];
  won: boolean;
  margin: number | null; // diff (pour comparer)
  scoreLabel: string | null; // "3-0", "2-1", etc.
  legsPlayed: number;
  legsWon: number;
  setsPlayed: number;
  setsWon: number;
};

const outcomes: MatchOutcome[] = [];

for (const matchId in groupedByMatch) {
  const arr = groupedByMatch[matchId];
  const targetId = effectiveProfileId ?? profileId ?? null;

  const myLine = targetId
    ? arr.find((s) => String(s.selectedPlayerId) === String(targetId))
    : arr[0];

  if (!myLine) continue;

  const allIds = arr.map((s) => s.selectedPlayerId);
  const isTeamMatch = myLine.isTeam || false;

  // 🔥 Legs / sets calculés avec la même logique que plus haut
  const { legsPlayed, legsWon, setsPlayed, setsWon } =
    computeLegsSetsForLine(myLine, arr);

  // Détection teammates / opponents
  const teammates = arr
    .filter(
      (s) => s.isTeam === true && s.selectedPlayerId !== myLine.selectedPlayerId
    )
    .map((s) => s.selectedPlayerId);

  const opponents = arr
    .filter(
      (s) => s.selectedPlayerId !== myLine.selectedPlayerId && s.isTeam !== true
    )
    .map((s) => s.selectedPlayerId);

  // Calcul marge + score affichable (on privilégie les LEGS, puis les SETS)
  let margin: number | null = null;
  let scoreLabel: string | null = null;

  if (legsPlayed > 0) {
    const legsLost = Math.max(0, legsPlayed - legsWon);
    margin = legsWon - legsLost;
    scoreLabel = `${legsWon}-${legsLost}`;
  } else if (setsPlayed > 0) {
    const setsLost = Math.max(0, setsPlayed - setsWon);
    margin = setsWon - setsLost;
    scoreLabel = `${setsWon}-${setsLost}`;
  } else {
    // Dernier recours : on retombe sur 1-0 / 0-1
    const isWin = !!myLine.isWin;
    margin = isWin ? 1 : -1;
    scoreLabel = isWin ? "1-0" : "0-1";
  }

  outcomes.push({
    matchId,
    isTeam: isTeamMatch,
    players: allIds,
    teammates,
    opponents,
    won: !!myLine.isWin,
    margin,
    scoreLabel,
    legsPlayed,
    legsWon,
    setsPlayed,
    setsWon,
  });
}

// ============================================================
// 3) RECORDS — TOP SCORE DUO / TEAM + PIRE DÉFAITE DUO
// ============================================================

// Helper : récupère le nombre de legs/sets gagnés à partir de "2-1", "3-0", etc.
const getMyScoreFromOutcome = (oc: MatchOutcome): number => {
  if (!oc.scoreLabel) return 0;
  const [meRaw] = oc.scoreLabel.split("-");
  const n = parseInt(meRaw ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
};

// on distingue bien DUO (2 joueurs, pas TEAM) et TEAM
let bestDuoScore: string | null = null;
let bestTeamScore: string | null = null;
let worstDuoScore: string | null = null;

let bestDuoMargin = -Infinity;
let bestTeamMargin = -Infinity;
let worstDuoMargin = Infinity;

// 🔥 nouveau : pour départager 1-0 vs 2-1 (même marge, plus de legs gagnés)
let bestDuoMyScore = -Infinity;
let bestTeamMyScore = -Infinity;

for (const oc of outcomes) {
  if (oc.margin == null) continue;

  const isDuo = !oc.isTeam && oc.players.length === 2;
  const myScoreThis = getMyScoreFromOutcome(oc);

  if (isDuo) {
    // TOP SCORE DUO : d’abord marge, puis nb de legs/sets gagnés
    if (oc.won) {
      if (
        oc.margin > bestDuoMargin ||
        (oc.margin === bestDuoMargin && myScoreThis > bestDuoMyScore)
      ) {
        bestDuoMargin = oc.margin;
        bestDuoMyScore = myScoreThis;
        bestDuoScore = oc.scoreLabel ?? oc.margin.toString();
      }
    }

    // PIRE DÉFAITE DUO (inchangé : marge la plus négative)
    if (!oc.won && oc.margin < worstDuoMargin) {
      worstDuoMargin = oc.margin;
      worstDuoScore = oc.scoreLabel ?? oc.margin.toString();
    }
  }

  if (oc.isTeam && oc.won) {
    // TOP SCORE TEAM : même logique que DUO
    if (
      oc.margin > bestTeamMargin ||
      (oc.margin === bestTeamMargin && myScoreThis > bestTeamMyScore)
    ) {
      bestTeamMargin = oc.margin;
      bestTeamMyScore = myScoreThis;
      bestTeamScore = oc.scoreLabel ?? oc.margin.toString();
    }
  }
}

// ============================================================
// 4) ADVERSAIRES / TEAMMATES — FAVORIS + TABLEAU DÉTAILLÉ
// ============================================================

type VersusStats = {
  vsMatches: number; // matchs joués face à ce joueur
  vsWins: number; // matchs gagnés face à lui
  legsWon: number; // 🔥 legs gagnés contre lui
  setsWon: number; // 🔥 sets gagnés contre lui
  bestScoreLabel: string | null; // meilleur score "3-0", "2-1" vs ce joueur
  bestScoreMargin: number; // marge associée (pour comparer)
  teamMatches: number; // matchs joués AVEC lui en équipe
};

const perPersonStats: Record<string, VersusStats> = {};

const ensurePerson = (id: string): VersusStats => {
  if (!perPersonStats[id]) {
    perPersonStats[id] = {
      vsMatches: 0,
      vsWins: 0,
      legsWon: 0,
      setsWon: 0,
      bestScoreLabel: null,
      bestScoreMargin: -Infinity,
      teamMatches: 0,
    };
  }
  return perPersonStats[id];
};

// on remplit pour chaque match
for (const oc of outcomes) {
  // on ne fait les stats adversaires détaillées QUE pour les matchs DUO non-team
  const isDuo = !oc.isTeam && oc.players.length === 2;
  if (!isDuo) {
    // mais on garde quand même les coéquipiers (TEAM)
    if (oc.isTeam) {
      for (const tm of oc.teammates) {
        const st = ensurePerson(tm);
        st.teamMatches++;
      }
    }
    continue;
  }

  const legsWonThis = oc.legsWon ?? 0;
  const setsWonThis = oc.setsWon ?? 0;

  // adversaires (joués contre)
  for (const opp of oc.opponents) {
    const st = ensurePerson(opp);
    st.vsMatches++;
    if (oc.won) st.vsWins++;

    // 🔥 Legs / sets gagnés contre cet adversaire sur ce match
    st.legsWon += legsWonThis;
    st.setsWon += setsWonThis;

    // meilleur score vs cet adversaire
    if (oc.margin != null && oc.scoreLabel) {
      if (oc.margin > st.bestScoreMargin) {
        st.bestScoreMargin = oc.margin;
        st.bestScoreLabel = oc.scoreLabel;
      }
    }
  }

  // coéquipiers (joués avec, en team) → déjà géré plus haut, mais on garde pour sécurité
  if (oc.isTeam) {
    for (const tm of oc.teammates) {
      const st = ensurePerson(tm);
      st.teamMatches++;
    }
  }
}

// ---- FAVORIS ----

// total de matchs X01 pour ce joueur
const totalMatchesPlayer = outcomes.length;

// 1) Adversaire favori = celui contre qui on a joué le plus
let favOpponentId: string | null = null;
let favOpponentMatches = 0;

for (const id in perPersonStats) {
  const st = perPersonStats[id];
  if (st.vsMatches > favOpponentMatches) {
    favOpponentMatches = st.vsMatches;
    favOpponentId = id;
  }
}

// 2) Max Win VS = celui contre qui on a le plus de victoires
let maxWinVsId: string | null = null;
let maxWinVsCount = 0;

for (const id in perPersonStats) {
  const st = perPersonStats[id];
  if (st.vsWins > maxWinVsCount) {
    maxWinVsCount = st.vsWins;
    maxWinVsId = id;
  }
}

// 3) Coéquipier favori = celui avec qui on a le plus de matchs TEAM
let favTeammateId: string | null = null;
let favTeammateMatches = 0;

for (const id in perPersonStats) {
  const st = perPersonStats[id];
  if (st.teamMatches > favTeammateMatches) {
    favTeammateMatches = st.teamMatches;
    favTeammateId = id;
  }
}

if (filtered.length > 0) {
  console.log("X01Multi sample session", filtered[0]);
}

// ============================================================
// FORMATTAGE DES STATS MATCHS / FAVORIS POUR LE RENDER
// ============================================================

// Helper ultra tolérant pour récupérer le vrai profileId depuis une session
const getProfileIdFromSession = (s: any): string | undefined => {
  return (
    (s.profileId && String(s.profileId)) ||
    (s.profile_id && String(s.profile_id)) ||
    (s.profile && s.profile.id && String(s.profile.id)) ||
    (s.playerProfileId && String(s.playerProfileId)) ||
    (s.player_profile_id && String(s.player_profile_id)) ||
    undefined
  );
};

// Mapping id (selectedPlayerId) -> nom + profileId + avatar
const playerNameMap: Record<string, string> = {};
const playerProfileIdMap: Record<string, string | undefined> = {};
const playerAvatarMap: Record<string, string | null | undefined> = {};

for (const s of filtered) {
  if (!s.selectedPlayerId) continue;
  const key = String(s.selectedPlayerId);

  if (!playerNameMap[key]) {
    playerNameMap[key] = s.playerName || key;
  }

  // 🔥 on essaie de récupérer un vrai profileId avec le helper
  if (!playerProfileIdMap[key]) {
    const pid = getProfileIdFromSession(s as any);
    if (pid) {
      playerProfileIdMap[key] = pid;
    }
  }

  // 🔥 avatar récupéré depuis X01MultiSession.avatarDataUrl (si dispo)
  if (playerAvatarMap[key] === undefined) {
    playerAvatarMap[key] = (s as any).avatarDataUrl ?? null;
  }
}

// Noms "humains"
const favOpponentName =
  favOpponentId ? playerNameMap[favOpponentId] ?? favOpponentId : null;
const maxWinVsName =
  maxWinVsId ? playerNameMap[maxWinVsId] ?? maxWinVsId : null;
const favTeammateName =
  favTeammateId ? playerNameMap[favTeammateId] ?? favTeammateId : null;

// vrais profileId (optionnels)
const favOpponentProfileId =
  favOpponentId ? playerProfileIdMap[favOpponentId] : undefined;
const maxWinVsProfileId =
  maxWinVsId ? playerProfileIdMap[maxWinVsId] : undefined;
const favTeammateProfileId =
  favTeammateId ? playerProfileIdMap[favTeammateId] : undefined;

// URLs d'avatar (data URL ou HTTP)
const favOpponentAvatarUrl =
  favOpponentId ? playerAvatarMap[favOpponentId] ?? null : null;
const maxWinVsAvatarUrl =
  maxWinVsId ? playerAvatarMap[maxWinVsId] ?? null : null;
const favTeammateAvatarUrl =
  favTeammateId ? playerAvatarMap[favTeammateId] ?? null : null;

// valeurs numériques sous les avatars
const favOpponentStats =
  favOpponentId != null ? perPersonStats[favOpponentId] : null;
const maxWinVsStats =
  maxWinVsId != null ? perPersonStats[maxWinVsId] : null;
const favTeammateStats =
  favTeammateId != null ? perPersonStats[favTeammateId] : null;

const favOpponentMatchesPct =
  favOpponentStats && totalMatchesPlayer > 0
    ? ((favOpponentStats.vsMatches / totalMatchesPlayer) * 100).toFixed(1)
    : null;

const maxWinVsRatePct =
  maxWinVsStats && maxWinVsStats.vsMatches > 0
    ? ((maxWinVsStats.vsWins / maxWinVsStats.vsMatches) * 100).toFixed(1)
    : null;

const favTeammateMatchesPct =
  favTeammateStats && totalMatchesPlayer > 0
    ? ((favTeammateStats.teamMatches / totalMatchesPlayer) * 100).toFixed(1)
    : null;

const bestDuoScoreDisplay = bestDuoScore ?? "-";
const bestTeamScoreDisplay = bestTeamScore ?? "-";
const worstDuoScoreDisplay = worstDuoScore ?? "-";

const pctMatchWinDisplay =
  matchesX01Total > 0 ? `${pctWinX01.toFixed(1)}%` : "0.0%";
const pctLegsWinDisplay =
  legsPlayedX01 > 0 ? `${pctLegsWinX01.toFixed(1)}%` : "0.0%";
const pctSetsWinDisplay =
  setsPlayedX01 > 0 ? `${pctSetsWinX01.toFixed(1)}%` : "0.0%";

// LIGNES POUR LE TABLEAU "DÉTAILS ADVERSAIRES / COÉQUIPIERS"
const detailsRows = Object.entries(perPersonStats)
  .map(([id, st]) => ({
    id,
    name: playerNameMap[id] ?? id,
    matches: st.vsMatches,
    legsWon: st.legsWon,
    setsWon: st.setsWon,
    wins: st.vsWins,
    bestScore: st.bestScoreLabel,
    teams: st.teamMatches,
  }))
  // tri : ceux qu'on a le plus joués en haut
  .sort((a, b) => b.matches - a.matches);

// ------------------- RENDER -------------------
return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {/* Filtres J/S/M/A/ALL */}
    <div style={{ ...card, padding: 14, textAlign: "center" }}>
      <div
        style={{
          ...goldNeon,
          fontSize: 18,
          marginBottom: 10,
          textAlign: "center",
        }}
        >
          X01 MULTI
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            flexWrap: "nowrap",
            transform: "scale(0.92)",
            transformOrigin: "center",
          }}
        >
          {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
            (r) => (
              <GoldPill
                key={r}
                active={range === r}
                onClick={() => setRange(r)}
                style={{
                  padding: "4px 12px",
                  fontSize: 11,
                  minWidth: "unset",
                  whiteSpace: "nowrap",
                }}
              >
                {r === "day" && "Jour"}
                {r === "week" && "Semaine"}
                {r === "month" && "Mois"}
                {r === "year" && "Année"}
                {r === "all" && "All"}
              </GoldPill>
            )
          )}
        </div>
      </div>

      {/* KPI carrousels */}
      {totalSessions > 0 && hasAnyKpi && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div style={makeKpiBox("#47B5FF")}>
              <div style={{ ...kpiLabelStyle, color: "#47B5FF" }}>CUMUL</div>
              {currentGold ? (
                <>
                  <div style={kpiSub}>{currentGold.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#47B5FF",
                    }}
                  >
                    {currentGold.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>

            <div style={makeKpiBox("#FF6FB5")}>
              <div style={{ ...kpiLabelStyle, color: "#FF6FB5" }}>MOYENNES</div>
              {currentPink ? (
                <>
                  <div style={kpiSub}>{currentPink.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#FFB8DE",
                    }}
                  >
                    {currentPink.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div style={makeKpiBox(T.gold)}>
              <div style={{ ...kpiLabelStyle, color: T.gold }}>RECORDS</div>
              {currentBlue ? (
                <>
                  <div style={kpiSub}>{currentBlue.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: T.gold,
                    }}
                  >
                    {currentBlue.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>

            <div style={makeKpiBox("#7CFF9A")}>
              <div style={{ ...kpiLabelStyle, color: "#7CFF9A" }}>
                POURCENTAGES
              </div>
              {currentGreen1 ? (
                <>
                  <div style={kpiSub}>{currentGreen1.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#E5FFEF",
                    }}
                  >
                    {currentGreen1.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>

            <div style={makeKpiBox("#7CFF9A")}>
              <div style={{ ...kpiLabelStyle, color: "#7CFF9A" }}>
                % / BV / CO
              </div>
              {currentGreen2 ? (
                <>
                  <div style={kpiSub}>{currentGreen2.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#E5FFEF",
                    }}
                  >
                    {currentGreen2.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Résumé nb de lignes */}
      <div
        style={{
          borderRadius: 20,
          padding: "12px 14px",
          marginBottom: 3,
          marginTop: 15,
          background: "linear-gradient(180deg,#18181A,#0F0F11)",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 6px 18px rgba(0,0,0,.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            fontWeight: 700,
            color: T.gold,
          }}
        >
          <span>Sessions</span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 15,
              color: T.gold,
              textShadow:
                "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.55)",
            }}
          >
            {totalSessions}
          </span>
        </div>
      </div>

      {totalSessions === 0 && (
        <div style={{ ...card, fontSize: 13, color: T.text70 }}>
          Aucun match X01 enregistré pour cette période.
        </div>
      )}

      {totalSessions > 0 && (
        <>

                    {/* ====== STATS DÉTAILLÉES (PÉRIODE) — COPY TRAINING X01 ====== */}
                    <div style={{ ...card }}>
            {(() => {
              const totalHitsRow = totalHits;
              const totalMissRow = gMiss;
              const totalBustRow = gBust;
              const totalBullRow = gBull;
              const totalDBullRow = gDBull;
              const throws = totalThrows || 1;
              const hitsForPct = totalHitsRow || 1;

              const rows = [
                {
                  label: "Darts",
                  min: minDarts,
                  max: maxDarts,
                  total: totalDarts,
                  pct: null,
                },
                {
                  label: "Hits",
                  min: minHits,
                  max: maxHits,
                  total: totalHitsRow,
                  pct: (totalHitsRow / throws) * 100,
                },
                {
                  label: "Miss",
                  min: minMiss,
                  max: maxMiss,
                  total: totalMissRow,
                  pct: (totalMissRow / throws) * 100,
                },
                {
                  label: "S",
                  min: minS,
                  max: maxS,
                  total: gHitsS,
                  pct: (gHitsS / hitsForPct) * 100,
                },
                {
                  label: "D",
                  min: minD,
                  max: maxD,
                  total: gHitsD,
                  pct: (gHitsD / hitsForPct) * 100,
                },
                {
                  label: "T",
                  min: minT,
                  max: maxT,
                  total: gHitsT,
                  pct: (gHitsT / hitsForPct) * 100,
                },
                {
                  label: "Bull",
                  min: minBull,
                  max: maxBull,
                  total: totalBullRow,
                  pct: (totalBullRow / throws) * 100,
                },
                {
                  label: "DBull",
                  min: minDBull,
                  max: maxDBull,
                  total: totalDBullRow,
                  pct: (totalDBullRow / throws) * 100,
                },
                {
                  label: "Bust",
                  min: minBust,
                  max: maxBust,
                  total: totalBustRow,
                  pct: (totalBustRow / throws) * 100,
                },
                // 🔥 Nouvelle ligne CO
                {
                  label: "CO",
                  min: minCO,
                  max: maxCO,
                  // on compte le nombre de sessions avec au moins un checkout
                  total: sessionsWithCO,
                  // % de sessions avec au moins un CO
                  pct: pctCOGlobal ?? null,
                },
              ];

              return (
                <>
                  {/* Titre + capsule "Session" comme sur Training X01 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        textTransform: "uppercase",
                        color: T.text70,
                        letterSpacing: 0.6,
                        fontWeight: 700,
                      }}
                    >
                      Stats détaillées (période)
                    </div>
                  </div>

                  {/* Tableau principal : Stat / min-max / total / % */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                      color: T.text70,
                    }}
                  >
                    <thead>
                      <tr style={{ color: T.gold }}>
                        <th
                          style={{
                            paddingBottom: 6,
                            textAlign: "left",
                            fontWeight: 700,
                          }}
                        >
                          Stat
                        </th>
                        <th
                          style={{
                            paddingBottom: 6,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          Session min / max
                        </th>
                        <th
                          style={{
                            paddingBottom: 6,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          Total
                        </th>
                        <th
                          style={{
                            paddingBottom: 6,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.label}
                          style={{
                            borderTop: "1px solid rgba(255,255,255,.06)",
                          }}
                        >
                          {/* Libellé */}
                          <td style={{ padding: "5px 0" }}>{row.label}</td>

                          {/* Min / Max */}
                          <td
                            style={{
                              padding: "5px 0",
                              textAlign: "right",
                            }}
                          >
                            {row.min == null && row.max == null
                              ? "-"
                              : `${row.min ?? "-"} / ${row.max ?? "-"}`}
                          </td>

                          {/* Total */}
                          <td
                            style={{
                              padding: "5px 0",
                              textAlign: "right",
                              color: T.gold,
                            }}
                          >
                            {row.total ?? "-"}
                          </td>

                          {/* % */}
                          <td
                            style={{
                              padding: "5px 0",
                              textAlign: "right",
                              color: "#7CFF9A",
                            }}
                          >
                            {row.pct == null || !Number.isFinite(row.pct)
                              ? "-"
                              : `${row.pct.toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Barre séparatrice */}
                  <div
                    style={{
                      marginTop: 10,
                      borderTop: "1px solid rgba(255,255,255,.12)",
                      paddingTop: 10,
                    }}
                  />

                  {/* Sous-bloc MOYENNES (rose) */}
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        fontWeight: 800,
                        color: "#FF6FB5",
                        marginBottom: 6,
                      }}
                    >
                      Moyennes
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          Moy.1D
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#FFB8DE",
                          }}
                        >
                          {globalAvg1D ? globalAvg1D.toFixed(2) : "-"}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          Moy.3D
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#FFB8DE",
                          }}
                        >
                          {globalAvg3D ? globalAvg3D.toFixed(1) : "-"}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          Best Moy.3D
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#FFB8DE",
                          }}
                        >
                          {bestAvg3DSession
                            ? bestAvg3DSession.toFixed(1)
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sous-bloc RECORDS (vert) */}
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        fontWeight: 800,
                        color: "#7CFF9A",
                        marginBottom: 6,
                      }}
                    >
                      Records
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          Best Visit
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#7CFF9A",
                          }}
                        >
                          {bestVisit || "-"}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          Best CO
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#7CFF9A",
                          }}
                        >
                          {bestCheckout > 0 ? bestCheckout : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sous-bloc FAVORIS (bleu) */}
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        fontWeight: 800,
                        color: "#47B5FF",
                        marginBottom: 6,
                      }}
                    >
                      Favoris
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          S
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "#E5F2FF",
                          }}
                        >
                          {favoriteSimpleDisplay ?? "-"}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          D
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "#E5F2FF",
                          }}
                        >
                          {favoriteDoubleDisplay ?? "-"}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: T.text70,
                          }}
                        >
                          T
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "#E5F2FF",
                          }}
                        >
                          {favoriteTripleDisplay ?? "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>


                  {/* ====== STATS MATCHS X01 — DUO / MULTI / TEAM ====== */}
<div style={{ ...card }}>

{/* ---- DUO ---- */}
<div style={{ marginBottom: 12 }}>
  <div style={{
    fontSize: 11,
    textTransform: "uppercase",
    color: "#FFB74D",
    fontWeight: 700,
    marginBottom: 4,
  }}>
    Matchs DUO
  </div>

  <div style={{ ...statRowBox, borderTop: "none", fontSize: 11, color: T.text70, fontWeight: 700 }}>
    <span style={{ flex: 2 }}>Intitulé</span>
    <span style={{ flex: 1, textAlign: "right" }}>Win / Total</span>
    <span style={{ flex: 1, textAlign: "right" }}>%Win</span>
  </div>

  {[
    { label: "Matchs duo", total: duoTotal, win: duoWins, pct: duoPctWin },
    { label: "Legs duo", total: duoLegsPlayed, win: duoLegsWon, pct: duoPctLegs },
    { label: "Sets duo", total: duoSetsPlayed, win: duoSetsWon, pct: duoPctSets },
  ].map((row) => (
    <div key={row.label} style={statRowBox}>
      <span style={{ flex: 2 }}>{row.label}</span>
      <span style={{ flex: 1, textAlign: "right", color: "#E5FFEF" }}>
        {row.win} / {row.total}
      </span>
      <span style={{ flex: 1, textAlign: "right", color: "#7CFF9A" }}>
        {row.pct}%
      </span>
    </div>
  ))}
</div>

{/* ---- MULTI ---- */}
<div style={{ marginBottom: 12 }}>
  <div style={{
    fontSize: 11,
    textTransform: "uppercase",
    color: "#FFB74D",
    fontWeight: 700,
    marginBottom: 4,
  }}>
    Matchs MULTI
  </div>

  <div style={{ ...statRowBox, borderTop: "none", fontSize: 11, color: T.text70, fontWeight: 700 }}>
    <span style={{ flex: 2 }}>Intitulé</span>
    <span style={{ flex: 1, textAlign: "right" }}>Win / Total</span>
    <span style={{ flex: 1, textAlign: "right" }}>%Win</span>
  </div>

  {[
    {
      label: "Matchs multi",
      total: multiTotal,
      win: multiWins,
      pct: multiPctWin,
    },
    {
      label: "Finish multi",
      total: multiTotal,
      win: multiFinishCount,
      pct: multiPctFinish,
    },
  ].map((row) => (
    <div key={row.label} style={statRowBox}>
      <span style={{ flex: 2 }}>{row.label}</span>
      <span style={{ flex: 1, textAlign: "right", color: "#E5FFEF" }}>
        {row.win} / {row.total}
      </span>
      <span style={{ flex: 1, textAlign: "right", color: "#7CFF9A" }}>
        {row.pct}%
      </span>
    </div>
  ))}

  {/* ---- PODIUMS ---- */}
  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
    {[
      { label: "1er", color: T.gold, value: multiRanks.first },
      { label: "2e", color: "#E0E0E0", value: multiRanks.second },
      { label: "3e", color: "#B0BEC5", value: multiRanks.third },
    ].map((p) => (
      <div key={p.label} style={{
        flex: 1, borderRadius: 14, padding: "6px 8px",
        background: "rgba(0,0,0,.45)", border: "1px solid rgba(255,255,255,.12)",
        textAlign: "center"
      }}>
        <div style={{ fontSize: 10, color: T.text70 }}>{p.label}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: p.color }}>{p.value}</div>
      </div>
    ))}
  </div>

  {/* ---- TABLEAU 4e → 10+ ---- */}
  <div style={{
    marginTop: 8, borderRadius: 12,
    padding: "6px 10px 8px",
    background: "rgba(0,0,0,.45)",
    border: "1px solid rgba(255,255,255,.08)",
  }}>
    <div style={{ fontSize: 10, textTransform: "uppercase", color: T.text70, marginBottom: 4 }}>
      Multi / classements
    </div>

    <div style={{ display: "flex", fontSize: 10, color: T.text70, marginBottom: 2 }}>
      <div style={{ flex: 1 }}>Place</div>
      <div style={{ width: 60, textAlign: "right" }}>Total</div>
    </div>

    {[
      { label: "4e", value: multiRanks.place4 },
      { label: "5e", value: multiRanks.place5 },
      { label: "6e", value: multiRanks.place6 },
      { label: "7e", value: multiRanks.place7 },
      { label: "8e", value: multiRanks.place8 },
      { label: "9e", value: multiRanks.place9 },
      { label: "10+", value: multiRanks.place10plus },
    ].map((row) => (
      <div key={row.label} style={{
        display: "flex", fontSize: 10,
        color: T.text, lineHeight: 1.5,
      }}>
        <div style={{ flex: 1 }}>{row.label}</div>
        <div style={{ width: 60, textAlign: "right" }}>{row.value}</div>
      </div>
    ))}
  </div>
</div>

{/* ---- TEAM ---- */}
<div>
  <div style={{
    fontSize: 11,
    textTransform: "uppercase",
    color: "#FFB74D",
    fontWeight: 700,
    marginBottom: 4,
  }}>
    Matchs TEAM
  </div>

  <div style={{ ...statRowBox, borderTop: "none", fontSize: 11, color: T.text70, fontWeight: 700 }}>
    <span style={{ flex: 2 }}>Intitulé</span>
    <span style={{ flex: 1, textAlign: "right" }}>Win / Total</span>
    <span style={{ flex: 1, textAlign: "right" }}>%Win</span>
  </div>

  {[
    { label: "Matchs team", total: teamTotal, win: teamWins, pct: teamPctWin },
    { label: "Legs Win team", total: teamLegsPlayed, win: teamLegsWon, pct: teamPctLegs },
    { label: "Sets Win team", total: teamSetsPlayed, win: teamSetsWon, pct: teamPctSets },
  ].map((row) => (
    <div key={row.label} style={statRowBox}>
      <span style={{ flex: 2 }}>{row.label}</span>
      <span style={{ flex: 1, textAlign: "right", color: "#E5FFEF" }}>
        {row.win} / {row.total}
      </span>
      <span style={{ flex: 1, textAlign: "right", color: "#7CFF9A" }}>
        {row.pct}%
      </span>
    </div>
  ))}

  {/* 🔥 FORMATS TEAM : 2v2 / 3v3 / 2v2v2 / ... */}
  {Object.keys(teamFormatStats).length > 0 && (
    <div
      style={{
        marginTop: 8,
        borderRadius: 12,
        padding: "6px 10px 8px",
        background: "rgba(0,0,0,.45)",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          color: T.text70,
          marginBottom: 4,
        }}
      >
        Formats team
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 10,
          color: T.text70,
          marginBottom: 2,
        }}
      >
        <div style={{ flex: 2 }}>Format</div>
        <div style={{ flex: 1, textAlign: "right" }}>Win / Total</div>
        <div style={{ flex: 1, textAlign: "right" }}>%Win</div>
      </div>

      {Object.entries(teamFormatStats).map(([format, st]) => {
        const pctWin =
          st.total > 0 ? ((st.win / st.total) * 100).toFixed(1) : "0.0";
        return (
          <div
            key={format}
            style={{
              display: "flex",
              fontSize: 10,
              color: T.text,
              lineHeight: 1.5,
            }}
          >
            <div style={{ flex: 2 }}>{format}</div>
            <div style={{ flex: 1, textAlign: "right" }}>
              {st.win} / {st.total}
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>{pctWin}%</div>
          </div>
        );
      })}
    </div>
  )}
</div>

</div>

{/* ====== MOYENNES / RECORDS / FAVORIS — MATCHS ====== */}
<div style={{ ...card, marginTop: 12 }}>
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 16,
      textAlign: "center",
    }}
  >
    {/* MOYENNES WIN */}
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          color: "#FF6FB5",
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        Moyennes WIN
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              textTransform: "uppercase",
            }}
          >
            % match WIN
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#FFB8DE",
            }}
          >
            {pctMatchWinDisplay}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              textTransform: "uppercase",
            }}
          >
            % leg WIN
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#FFB8DE",
            }}
          >
            {pctLegsWinDisplay}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              textTransform: "uppercase",
            }}
          >
            % set WIN
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#FFB8DE",
            }}
          >
            {pctSetsWinDisplay}
          </div>
        </div>
      </div>
    </div>

    {/* RECORDS */}
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          color: "#7CFF9A",
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        Records
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              textTransform: "uppercase",
            }}
          >
            Top score DUO
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#7CFF9A",
            }}
          >
            {bestDuoScoreDisplay}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              textTransform: "uppercase",
            }}
          >
            Top score TEAM
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#7CFF9A",
            }}
          >
            {bestTeamScoreDisplay}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              textTransform: "uppercase",
            }}
          >
            Pire défaite DUO
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#7CFF9A",
            }}
          >
            {worstDuoScoreDisplay}
          </div>
        </div>
      </div>
    </div>

    {/* FAVORIS — ADVERSAIRE FAVORI / MAX WIN VS / COÉQUIPIER FAVORI */}
<div>
  <div
    style={{
      fontSize: 11,
      textTransform: "uppercase",
      color: "#4DB2FF",
      fontWeight: 800,
      marginBottom: 8,
    }}
  >
    Favoris
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
    }}
  >
    {/* Adversaire favori = celui contre qui on joue le plus */}
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: T.text70,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Adversaire favori
      </div>

      {/* Avatar médaillon */}
      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2px solid rgba(77,178,255,.9)",
            boxShadow: "0 0 12px rgba(77,178,255,.6)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 30% 10%, rgba(255,255,255,.4), #080910 60%)",
          }}
        >
          {favOpponentAvatarUrl ? (
            <img
              src={favOpponentAvatarUrl}
              alt={favOpponentName ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "#E5F2FF",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {(favOpponentName || "?").trim().charAt(0) || "?"}
            </span>
          )}
        </div>
      </div>

      {/* Nom réduit mais entier, centré sur 2 lignes max */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#4DB2FF",
          marginBottom: 2,
          maxWidth: 80,
          lineHeight: 1.15,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {favOpponentName ?? "-"}
      </div>

      {/* Stat en mode "intitulé : case néon" */}
      <div style={{ marginTop: 4 }}>
        <div
          style={{
            fontSize: 9,
            color: T.text70,
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Matchs
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px 10px",
            borderRadius: 999,
            border: "1px solid #4DB2FF",
            boxShadow: "0 0 10px rgba(77,178,255,.7)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(77,178,255,.35), transparent 55%)",
            fontSize: 11,
            fontWeight: 800,
            color: "#E5F2FF",
            minWidth: 40,
          }}
        >
          {favOpponentStats ? favOpponentStats.vsMatches : "-"}
        </div>
        {favOpponentMatchesPct && (
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              marginTop: 2,
            }}
          >
            {favOpponentMatchesPct}% de tes matchs
          </div>
        )}
      </div>
    </div>

    {/* Max Win VS = celui contre qui on a gagné le plus */}
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: T.text70,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Max Win VS
      </div>

      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2px solid rgba(124,255,154,.9)",
            boxShadow: "0 0 12px rgba(124,255,154,.6)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 30% 10%, rgba(255,255,255,.4), #080910 60%)",
          }}
        >
          {maxWinVsAvatarUrl ? (
            <img
              src={maxWinVsAvatarUrl}
              alt={maxWinVsName ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "#E5FFEF",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {(maxWinVsName || "?").trim().charAt(0) || "?"}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#4DB2FF",
          marginBottom: 2,
          maxWidth: 80,
          lineHeight: 1.15,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {maxWinVsName ?? "-"}
      </div>

      <div style={{ marginTop: 4 }}>
        <div
          style={{
            fontSize: 9,
            color: T.text70,
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Victoires
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px 10px",
            borderRadius: 999,
            border: "1px solid #7CFF9A",
            boxShadow: "0 0 10px rgba(124,255,154,.7)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(124,255,154,.35), transparent 55%)",
            fontSize: 11,
            fontWeight: 800,
            color: "#E5FFEF",
            minWidth: 40,
          }}
        >
          {maxWinVsStats ? maxWinVsStats.vsWins : "-"}
        </div>
        {maxWinVsRatePct && (
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              marginTop: 2,
            }}
          >
            {maxWinVsRatePct}% de win vs lui
          </div>
        )}
      </div>
    </div>

    {/* Coéquipier favori = celui avec qui on joue le plus en TEAM */}
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: T.text70,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Coéquipier favori
      </div>

      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2px solid rgba(246,194,86,.9)",
            boxShadow: "0 0 12px rgba(246,194,86,.6)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 30% 10%, rgba(255,255,255,.4), #080910 60%)",
          }}
        >
          {favTeammateAvatarUrl ? (
            <img
              src={favTeammateAvatarUrl}
              alt={favTeammateName ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "#FFF3D9",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {(favTeammateName || "?").trim().charAt(0) || "?"}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#4DB2FF",
          marginBottom: 2,
          maxWidth: 80,
          lineHeight: 1.15,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {favTeammateName ?? "-"}
      </div>

      <div style={{ marginTop: 4 }}>
        <div
          style={{
            fontSize: 9,
            color: T.text70,
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Matchs TEAM
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px 10px",
            borderRadius: 999,
            border: "1px solid #F6C256",
            boxShadow: "0 0 10px rgba(246,194,86,.7)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(246,194,86,.35), transparent 55%)",
            fontSize: 11,
            fontWeight: 800,
            color: "#FFF3D9",
            minWidth: 40,
          }}
        >
          {favTeammateStats ? favTeammateStats.teamMatches : "-"}
        </div>
        {favTeammateMatchesPct && (
          <div
            style={{
              fontSize: 9,
              color: T.text70,
              marginTop: 2,
            }}
          >
            {favTeammateMatchesPct}% de tes matchs
          </div>
        )}
      </div>
    </div>
  </div>
</div>

    {/* DÉTAILS ADVERSAIRES / COÉQUIPIERS */}
    {detailsRows.length > 0 && (
      <div
        style={{
          marginTop: 10,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            color: T.text70,
            marginBottom: 6,
            letterSpacing: 0.6,
            fontWeight: 700,
          }}
        >
          Détails adversaires / coéquipiers
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 0.7fr 0.7fr 0.7fr 0.7fr 0.9fr 0.7fr",
            columnGap: 6,
            rowGap: 4,
            fontSize: 10,
          }}
        >
          {/* En-têtes */}
          <div style={{ fontWeight: 700, color: T.text70 }}>Joueur</div>
          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              color: T.text70,
            }}
          >
            Matchs
          </div>
          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              color: T.text70,
            }}
          >
            Legs Win
          </div>
          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              color: T.text70,
            }}
          >
            Sets Win
          </div>
          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              color: T.text70,
            }}
          >
            Win
          </div>
          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              color: T.text70,
            }}
          >
            Meilleur score
          </div>
          <div
            style={{
              textAlign: "right",
              fontWeight: 700,
              color: T.text70,
            }}
          >
            Teams
          </div>

          {/* Lignes */}
          {detailsRows.map((row) => (
  <React.Fragment key={row.id}>
    <div>{row.name}</div>
    <div style={{ textAlign: "right", color: "#E5FFEF" }}>
      {row.matches}
    </div>
    <div style={{ textAlign: "right", color: "#E5FFEF" }}>
  {typeof row.legsWon === "number" ? row.legsWon : "-"}
</div>
<div style={{ textAlign: "right", color: "#E5FFEF" }}>
  {typeof row.setsWon === "number" ? row.setsWon : "-"}
</div>
    <div style={{ textAlign: "right", color: "#E5FFEF" }}>
      {row.wins || "-"}
    </div>
    <div style={{ textAlign: "right", color: "#7CFF9A" }}>
      {row.bestScore ?? "-"}
    </div>
    <div style={{ textAlign: "right", color: "#E5FFEF" }}>
      {row.teams || "-"}
    </div>
  </React.Fragment>
          ))}
        </div>
      </div>
    )}
  </div>
</div>

          {/* Sparkline + choix de métrique */}
          <div style={{ ...card }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                }}
              >
                Évolution des matchs
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {metricKeys.map((m) => (
                  <button
                    key={m}
                    type="button"
                    style={{
                      ...metricPill,
                      borderColor:
                        metric === m ? T.gold : "rgba(255,255,255,.18)",
                      boxShadow:
                        metric === m
                          ? "0 0 10px rgba(246,194,86,.7)"
                          : "none",
                      color: metric === m ? T.gold : T.text70,
                    }}
                    onClick={() => {
                      setMetric(m);
                      setMetricLocked(true);
                    }}
                  >
                    {m === "darts" && "Darts"}
                    {m === "avg3D" && "Moy.3D"}
                    {m === "pctS" && "%S"}
                    {m === "pctD" && "%D"}
                    {m === "pctT" && "%T"}
                    {m === "BV" && "Best Visit"}
                    {m === "CO" && "Checkout"}
                  </button>
                ))}
              </div>
            </div>

            {sparkSeries.length > 1 ? (
              <div style={{ marginTop: 4 }}>
                <SparklinePro
                  points={sparkSeries.map((p: any) => ({
                    x: p.x,
                    y: p.y,
                  }))}
                />
              </div>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                  marginTop: 4,
                }}
              >
                Il faut au moins 2 lignes de match pour afficher une courbe.
              </div>
            )}
          </div>

          {/* Radar + hits par segment */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Radar + résumé segments */}
            <div style={{ ...card }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Radar de précision (matchs X01)
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TrainingRadar darts={x01DartsAll} />
                </div>
                <div
                  style={{
                    flexBasis: 130,
                    fontSize: 12,
                    color: T.text70,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, color: T.gold }}>
                    Segments clés
                  </div>
                  <div>
                    Hit préféré :{" "}
                    <span style={{ color: "#7CFF9A" }}>
                      {favoriteHitDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Simple favori :{" "}
                    <span style={{ color: "#47B5FF" }}>
                      {favoriteSimpleDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Double favori :{" "}
                    <span style={{ color: "#FFB8DE" }}>
                      {favoriteDoubleDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Triple favori :{" "}
                    <span style={{ color: "#FF9F43" }}>
                      {favoriteTripleDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Moins joué :{" "}
                    <span style={{ color: "#AAAAAA" }}>
                      {leastHitDisplay ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hits par segment (stack S/D/T) */}
            <div style={{ ...card }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Hits par segment (S / D / T / MISS)
              </div>

              {maxStackHits > 0 || chartMissCount > 0 ? (
                <>
                  {(() => {
                    const baseStack =
                      Math.max(maxStackHits, chartMissCount || 0) || 1;

                    const renderBar = (seg: number | "MISS") => {
                      const label =
                        seg === "MISS"
                          ? "MISS"
                          : seg === 25
                          ? "25"
                          : String(seg);

                      if (seg === "MISS") {
                        const h = (chartMissCount / baseStack) * 100;

                        return (
                          <div
                            key={label}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              minWidth: 22,
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: `${h}%`,
                                borderRadius: 6,
                                background:
                                  "linear-gradient(180deg,#555,#999)",
                                boxShadow:
                                  h > 0
                                    ? "0 0 8px rgba(255,255,255,.4)"
                                    : "none",
                              }}
                            />
                            <div
                              style={{
                                fontSize: 8,
                                marginTop: 2,
                                color: T.text70,
                              }}
                            >
                              {label}
                            </div>
                          </div>
                        );
                      }

                      const key = String(seg);
                      const data = segSDTMap[key] || { S: 0, D: 0, T: 0 };
                      const total = data.S + data.D + data.T;

                      const hS = (data.S / baseStack) * 100;
                      const hD = (data.D / baseStack) * 100;
                      const hT = (data.T / baseStack) * 100;

                      return (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: 22,
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 70,
                              display: "flex",
                              flexDirection: "column-reverse",
                              borderRadius: 6,
                              overflow: "hidden",
                              boxShadow:
                                total > 0
                                  ? "0 0 8px rgba(255,255,255,.4)"
                                  : "none",
                              background: "rgba(255,255,255,.02)",
                            }}
                          >
                            {hS > 0 && (
                              <div
                                style={{
                                  height: `${hS}%`,
                                  background:
                                    "linear-gradient(180deg,#47B5FF,#1F5F9F)",
                                }}
                              />
                            )}
                            {hD > 0 && (
                              <div
                                style={{
                                  height: `${hD}%`,
                                  background:
                                    "linear-gradient(180deg,#FF6FB5,#8F2B64)",
                                }}
                              />
                            )}
                            {hT > 0 && (
                              <div
                                style={{
                                  height: `${hT}%`,
                                  background:
                                    "linear-gradient(180deg,#FF9F43,#C25B0F)",
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 8,
                              marginTop: 2,
                              color: T.text70,
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    };

                    const row1 = HITS_SEGMENTS.slice(0, 11);
                    const row2 = HITS_SEGMENTS.slice(11);

                    return (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "space-between",
                            gap: 4,
                            height: 90,
                          }}
                        >
                          {row1.map(renderBar)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "space-between",
                            gap: 4,
                            height: 90,
                          }}
                        >
                          {row2.map(renderBar)}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: T.text70,
                  }}
                >
                  Pas assez de données pour afficher les hits par segment.
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 4,
                  fontSize: 10,
                  color: T.text70,
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      marginRight: 4,
                      background:
                        "linear-gradient(180deg,#47B5FF,#1F5F9F)",
                    }}
                  />
                  S
                </div>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      marginRight: 4,
                      background:
                        "linear-gradient(180deg,#FF6FB5,#8F2B64)",
                    }}
                  />
                  D
                </div>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      marginRight: 4,
                      background:
                        "linear-gradient(180deg,#FF9F43,#C25B0F)",
                    }}
                  />
                  T
                </div>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      marginRight: 4,
                      background:
                        "linear-gradient(180deg,#555,#999)",
                    }}
                  />
                  Miss
                </div>
              </div>
            </div>
          </div>

          {/* Liste des lignes / matchs */}
          <div style={{ ...card }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: T.text70,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Historique des matchs X01
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {pagedSessions.map((s: any) => {
  const hits = s.hitsS + s.hitsD + s.hitsT;
  const throws = hits + s.miss;
  const pctHitsSession =
    throws > 0 ? (hits / throws) * 100 : null;

  // ---- méta match (DUO / MULTI / TEAM + format) ----
  const group = matchGroups.get(s.matchId) || [s];
  const numPlayers = group.length;
  const isTeamMatch = s.isTeam === true;
  const isDuoMatch = !isTeamMatch && numPlayers === 2;
  const isMultiMatch = !isTeamMatch && numPlayers >= 3;

  let modeLabel = "SOLO";
  if (isTeamMatch) modeLabel = "TEAM";
  else if (isDuoMatch) modeLabel = "DUO";
  else if (isMultiMatch) modeLabel = "MULTI";

  // format TEAM : 2v2, 3v3, 2v2v2, 2v2v2v2...
  let teamFormatLabel: string | null = null;
  if (isTeamMatch) {
    const teamCount: Record<string, number> = {};
    for (const line of group) {
      const tid = (line as any).teamId || "team";
      teamCount[tid] = (teamCount[tid] || 0) + 1;
    }
    const sizes = Object.values(teamCount).sort((a, b) => b - a);
    if (sizes.length) {
      teamFormatLabel = sizes.join("v"); // ex: 2v2, 3v3, 2v2v2...
    }
  }

  // rang / classement
  const rank: number | null =
    typeof s.rank === "number" && s.rank > 0 ? s.rank : null;
  let rankLabel: string | null = null;
  if (rank != null) {
    rankLabel = rank === 1 ? "1er" : `${rank}e`;
  }
  const placeText =
    rankLabel && numPlayers > 1 ? `${rankLabel} / ${numPlayers}` : null;

  // WIN / LOSE
  const isWin = !!s.isWin;
  const winLabel = isWin ? "WIN" : "LOSE";
  const winColor = isWin ? "#7CFF9A" : "#FF6B6B";

  // Legs / sets
  const legsPlayed = s.legsPlayed ?? 0;
  const legsWon = s.legsWon ?? 0;
  const setsPlayed = s.setsPlayed ?? 0;
  const setsWon = s.setsWon ?? 0;

  return (
    <button
      key={s.id}
      type="button"
      onClick={() => setSelected(s)}
      style={{
        textAlign: "left",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.08)",
        padding: "8px 10px",
        background: "linear-gradient(180deg,#15171B,#0F1013)",
        color: T.text,
        cursor: "pointer",
      }}
    >
      {/* ligne date + moyenne */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 2,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: T.text70,
          }}
        >
          {formatShortDate(s.date)} — {s.playerName}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.gold,
            fontWeight: 700,
          }}
        >
          {s.avg3D.toFixed(1)} de moy. 3D
        </div>
      </div>

      {/* ligne mode / format / rang / WIN */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            fontSize: 10,
          }}
        >
          {/* badge mode */}
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.22)",
              background: "rgba(0,0,0,.6)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: "#E5F2FF",
              fontWeight: 700,
            }}
          >
            {modeLabel}
            {isTeamMatch && teamFormatLabel
              ? ` ${teamFormatLabel}`
              : ""}
          </span>

          {/* badge classement */}
          {placeText && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(0,0,0,.55)",
                color: "#FFCFA0",
                fontWeight: 700,
              }}
            >
              {placeText}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: winColor,
            textTransform: "uppercase",
          }}
        >
          {winLabel}
        </div>
      </div>

      {/* ligne Darts / Hits / BV / CO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: T.text70,
        }}
      >
        <div>
          Darts:{" "}
          <span style={{ color: "#E5FFEF" }}>{s.darts}</span>
        </div>
        <div>
          Hits:{" "}
          <span style={{ color: "#7CFF9A" }}>{hits}</span>
          {pctHitsSession !== null && (
            <span> ({pctHitsSession.toFixed(1)}%)</span>
          )}
        </div>
        <div>
          BV:{" "}
          <span style={{ color: "#FFB8DE" }}>{s.bestVisit}</span>
        </div>
        <div>
          CO:{" "}
          <span style={{ color: "#FF9F43" }}>
            {s.bestCheckout ?? "-"}
          </span>
        </div>
      </div>

      {/* ligne Legs / Sets */}
      {(legsPlayed > 0 || setsPlayed > 0) && (
        <div
          style={{
            marginTop: 2,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: T.text70,
          }}
        >
          <div>
            Legs:{" "}
            <span style={{ color: "#E5FFEF" }}>
              {legsWon} / {legsPlayed}
            </span>
          </div>
          {setsPlayed > 0 && (
            <div>
              Sets:{" "}
              <span style={{ color: "#E5FFEF" }}>
                {setsWon} / {setsPlayed}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  color: T.text70,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPage((p: any) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(0,0,0,.4)",
                    color: page <= 1 ? "#666" : T.text,
                    cursor: page <= 1 ? "default" : "pointer",
                  }}
                >
                  ◀
                </button>
                <div>
                  Page <span style={{ color: T.gold }}>{page}</span> /{" "}
                  <span>{totalPages}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p: any) => Math.min(totalPages, p + 1))
                  }
                  disabled={page >= totalPages}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(0,0,0,.4)",
                    color: page >= totalPages ? "#666" : T.text,
                    cursor: page >= totalPages ? "default" : "pointer",
                  }}
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal détail ligne (joueur sur match) */}
      {selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            zIndex: 999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              borderRadius: 22,
              background: "linear-gradient(180deg,#18181C,#0D0E11)",
              border: "1px solid rgba(255,255,255,.18)",
              boxShadow: "0 18px 40px rgba(0,0,0,.7)",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                }}
              >
                {selected.playerName} — {formatShortDate(selected.date)}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.3)",
                  background: "rgba(0,0,0,.4)",
                  color: T.text,
                  fontSize: 12,
                  padding: "2px 8px",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                fontSize: 12,
                color: T.text70,
                marginBottom: 8,
              }}
            >
              Moyenne 3D :{" "}
              <span style={{ color: T.gold, fontWeight: 700 }}>
                {selected.avg3D.toFixed(1)}
              </span>{" "}
              — Moyenne 1D :{" "}
              <span style={{ color: "#7CFF9A", fontWeight: 700 }}>
                {selected.avg1D.toFixed(2)}
              </span>
            </div>

            <div>
              <div style={statRowBox}>
                <span>Darts</span>
                <span>{selected.darts}</span>
              </div>
              <div style={statRowBox}>
                <span>Hits S</span>
                <span>{selected.hitsS}</span>
              </div>
              <div style={statRowBox}>
                <span>Hits D</span>
                <span>{selected.hitsD}</span>
              </div>
              <div style={statRowBox}>
                <span>Hits T</span>
                <span>{selected.hitsT}</span>
              </div>
              <div style={statRowBox}>
                <span>Miss</span>
                <span>{selected.miss}</span>
              </div>
              <div style={statRowBox}>
                <span>Bull / DBull</span>
                <span>
                  {selected.bull} / {selected.dBull}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Bust</span>
                <span>{selected.bust}</span>
              </div>
              <div style={statRowBox}>
                <span>Best Visit</span>
                <span>{selected.bestVisit}</span>
              </div>
              <div style={statRowBox}>
                <span>Best Checkout</span>
                <span>{selected.bestCheckout ?? "-"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
