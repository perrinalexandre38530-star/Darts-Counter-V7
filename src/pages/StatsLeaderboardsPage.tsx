// @ts-nocheck
// =============================================================
// src/pages/StatsLeaderboardsPage.tsx
// Page CLASSEMENTS globale (tous profils)
// - Agrège uniquement IDB History terminé (source unique : Historique)
// - Robust: supporte multiples formats de summary (V1/V2/V3)
// - Avatars: récup depuis profiles OU history.players OU summary
// - + BotsMap: récup avatars/noms depuis localStorage dc_bots_v1
// - Metrics: wins / matches / winRate / avg3 / bestVisit / bestCheckout
// - ✅ NEW (KILLER Option A): kills / favNumberHits / favSegmentHits / totalHits
// - Filtre période D/W/M/Y/ALL/TOUT
// - ✅ Fix: pas de rows fantômes (nom/avatar vides) -> on filtre strict
// - ✅ NEW: Toggle "BOTS: ON/OFF" (par défaut ON) + OFF exclut vraiment les bots
// - ✅ Fix: plus de "isDisplayableRow" manquante, plus de crash
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useSport } from "../contexts/SportContext";
import ProfileAvatar from "../components/ProfileAvatar";
import { History } from "../lib/history";
import { loadTerritoriesHistory, type TerritoriesMatch } from "../lib/territories/territoriesStats";
// Optionnel (si tu l’as dans ton projet). On n’en dépend pas pour éviter de casser.
import { computeKillerAgg } from "../lib/statsKillerAgg";
import { isOnlineRecord, idLooseMatch, normText, isX01Record, sampleFromRec, collectPlayers } from "../lib/x01StatsSource";
import { isOnlineStatsExcluded } from "../lib/onlineStatsExclusions";
import { computeX01MultiAgg, isX01Match as isX01HistoryMatch } from "../lib/x01MultiAgg";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  sportOverride?: string | null;
};

type Scope = "local" | "online";

type LeaderboardMode =
  | "x01_multi"
  | "cricket"
  | "killer"
  | "shanghai"
  | "golf"
  | "batard"
  | "battle_royale"
  | "clock"
  | "territories"
  | "scram"
  | "warfare"
  | "five_lives"
  | "dice_duel"
  | "molkky"
  | "babyfoot"
  | "pingpong";

type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "TOUT";

type MetricKey =
  | "wins"
  | "losses"
  | "winRate"
  | "matches"
  | "legsWin"
  | "setsWin"
  | "legWinRate"
  | "setWinRate"
  | "avg3"
  | "avg1"
  | "bestAvg3"
  | "bestVisit"
  | "bestCheckout"
  | "checkouts"
  | "checkoutHits"
  | "checkoutRate"
  | "dartsCo"
  | "darts"
  | "scoreTotal"
  | "hits"
  | "missPct"
  | "simplePct"
  | "doublePct"
  | "triplePct"
  | "bullPct"
  | "dbullPct"
  | "bullTotal"
  | "first9Avg"
  | "bestFirst9"
  | "top9Score"
  | "first9_100"
  | "first9_120"
  | "first9_140"
  | "v50"
  | "v60"
  | "v80"
  | "v100"
  | "v120"
  | "v140"
  | "v180"
  | "tons"
  | "busts"
  | "favNumber"
  // ✅ Cricket / jeux par marques
  | "points"
  | "pointsPerMatch"
  | "marks"
  | "marksPerMatch"
  | "mpr"
  | "hitRate"
  | "bullHits"
  | "closedSegments"
  | "damage"
  | "singleHits"
  | "doubleHits"
  | "tripleHits"
  | "singlePct"
  | "doubleHitPct"
  | "tripleHitPct"
  | "maxVisit"
  // ✅ Killer
  | "kills"
  | "killsPerMatch"
  | "damagePerMatch"
  | "autoHits"
  | "autoKills"
  | "resurrections"
  | "avgSurvival"
  | "favNumberHits"
  | "favSegmentHits"
  | "totalHits"
  // ✅ Golf
  | "scorePerHole"
  | "holes"
  | "birdiePct"
  | "eaglePct"
  | "bogeyPct"
  | "tripleBogeyPct"
  // ✅ NEW (territories)
  | "captures"
  | "avgDom"
  | "avgRounds"
  | "capPerRound";

type Row = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;

  wins: number;
  losses: number;
  matches: number;
  winRate: number;

  // ✅ TERRITORIES
  captures: number;
  avgDom: number;
  avgRounds: number;
  capPerRound: number;

  avg3: number;
  avg1?: number;
  bestAvg3?: number;
  bestVisit: number;
  bestCheckout: number;
  legsWin?: number;
  setsWin?: number;
  legWinRate?: number;
  setWinRate?: number;
  checkouts?: number;
  checkoutHits?: number;
  checkoutRate?: number;
  dartsCo?: number;
  darts?: number;
  scoreTotal?: number;
  hits?: number;
  missPct?: number;
  simplePct?: number;
  doublePct?: number;
  triplePct?: number;
  bullPct?: number;
  dbullPct?: number;
  bullTotal?: number;
  bestFirst9?: number;
  first9Avg?: number;
  top9Score?: number;
  first9_100?: number;
  first9_120?: number;
  first9_140?: number;
  v50?: number;
  v60?: number;
  v80?: number;
  v100?: number;
  v120?: number;
  v140?: number;
  v180?: number;
  tons?: number;
  busts?: number;
  points?: number;
  pointsPerMatch?: number;
  marks?: number;
  marksPerMatch?: number;
  mpr?: number;
  hitRate?: number;
  bullHits?: number;
  closedSegments?: number;
  damage?: number;
  singleHits?: number;
  doubleHits?: number;
  tripleHits?: number;
  singlePct?: number;
  doubleHitPct?: number;
  tripleHitPct?: number;
  killsPerMatch?: number;
  damagePerMatch?: number;
  autoHits?: number;
  autoKills?: number;
  resurrections?: number;
  avgSurvival?: number;
  scorePerHole?: number;
  holes?: number;
  birdiePct?: number;
  eaglePct?: number;
  bogeyPct?: number;
  tripleBogeyPct?: number;

  // ✅ NEW
  kills: number;
  favNumber: number; // 0 si inconnu, sinon 1..20 ou 25
  favNumberHits: number;
  favSegment: string; // "S20" / "T8" / "DB" ...
  favSegmentHits: number;
  totalHits: number;

  // ✅ BATARD sums
  batardPoints: number;
  batardDarts: number;
  batardTurns: number;
  batardFails: number;
  batardValidHits: number;
  batardAdvances: number;
};

const MODE_DEFS: {
  id: LeaderboardMode;
  label: string;
  metrics: MetricKey[];
}[] = [
  {
    id: "x01_multi",
    label: "X01 MULTI",
    metrics: [
      "avg3", "avg1", "bestAvg3", "bestVisit", "bestCheckout", "bestFirst9",
      "wins", "winRate", "matches", "legsWin", "setsWin", "legWinRate", "setWinRate",
      "checkouts", "checkoutHits", "checkoutRate", "dartsCo",
      "darts", "scoreTotal", "hits", "missPct", "simplePct", "doublePct", "triplePct", "bullTotal", "bullPct", "dbullPct",
      "v60", "v100", "v140", "v180", "tons", "busts", "favNumber"
    ],
  },
  {
    id: "cricket",
    label: "CRICKET",
    metrics: [
      "winRate", "wins", "matches", "points", "pointsPerMatch", "marks", "marksPerMatch",
      "mpr", "hitRate", "bullHits", "closedSegments", "damage", "bestVisit", "singleHits", "doubleHits", "tripleHits", "favNumber"
    ],
  },
  {
    id: "killer",
    label: "KILLER",
    metrics: [
      "kills", "killsPerMatch", "damage", "damagePerMatch", "autoHits", "autoKills", "resurrections",
      "avgSurvival", "wins", "winRate", "matches", "favSegmentHits", "favNumberHits", "totalHits"
    ],
  },
  {
    id: "shanghai",
    label: "SHANGHAI",
    metrics: [
      "points", "pointsPerMatch", "bestVisit", "hitRate", "singleHits", "doubleHits", "tripleHits",
      "darts", "wins", "winRate", "matches", "favNumber"
    ],
  },
  {
    id: "golf",
    label: "GOLF",
    metrics: [
      "wins", "winRate", "matches", "scoreTotal", "scorePerHole", "holes", "bestVisit",
      "missPct", "singlePct", "doubleHitPct", "tripleHitPct", "bullPct", "dbullPct",
      "birdiePct", "eaglePct", "bogeyPct", "tripleBogeyPct"
    ],
  },
  { id: "batard", label: "BÂTARD", metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"] },
  { id: "battle_royale", label: "BATTLE ROYALE", metrics: ["wins", "winRate", "matches"] },
  { id: "five_lives", label: "FIVE LIVES", metrics: ["wins", "winRate", "matches"] },
  { id: "clock", label: "TOUR DE L’HORLOGE", metrics: ["wins", "winRate", "matches"] },
  { id: "scram", label: "SCRAM", metrics: ["wins", "winRate", "matches"] },
  { id: "warfare", label: "WARFARE", metrics: ["wins", "winRate", "matches"] },
  { id: "babyfoot", label: "BABY-FOOT", metrics: ["wins", "winRate", "matches", "avg3", "bestVisit"] },
  { id: "pingpong", label: "PING-PONG", metrics: ["wins", "winRate", "matches", "avg3", "bestVisit"] },
  {
    id: "territories",
    label: "TERRITORIES",
    metrics: ["wins", "winRate", "matches", "captures", "avgDom", "avgRounds", "capPerRound"],
  },
];


const S = {
  select: (theme: any): React.CSSProperties => ({
    width: "100%",
    minHeight: 34,
    borderRadius: 12,
    padding: "7px 10px",
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.18)"}`,
    background: theme?.card || "#050608",
    color: theme?.text || "#fff",
    fontSize: 11,
    fontWeight: 800,
    outline: "none",
    boxShadow: "0 8px 20px rgba(0,0,0,.35)",
  }),
};

// ------------------------------
// Utils robustes
// ------------------------------

function safeStr(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickAvatar(obj: any): string | null {
  if (!obj) return null;
  return (
    obj.avatarDataUrl ||
    obj.avatar_data_url ||
    obj.avatar ||
    obj.avatarUrl ||
    obj.avatarURL ||
    obj.avatarBase64 ||
    obj.avatar_b64 ||
    obj.dataUrl ||
    obj.dataURL ||
    obj.photoDataUrl ||
    obj.photo ||
    null
  );
}

function pickName(obj: any): string {
  if (!obj) return "";
  return (
    obj.name ||
    obj.playerName ||
    obj.profileName ||
    obj.label ||
    obj.nickname ||
    obj.displayName ||
    ""
  );
}

function pickId(obj: any): string {
  if (!obj) return "";
  return obj.profileId || obj.playerId || obj.pid || obj.id || obj._id || obj.uid || "";
}

function cleanName(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "—" || s === "-" || s.toLowerCase() === "undefined" || s.toLowerCase() === "null")
    return "";
  return s;
}

function cleanAvatar(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s.toLowerCase() === "undefined" || s.toLowerCase() === "null") return null;
  return s;
}

// ✅ bots storage
function loadBotsMap(): Record<string, { avatarDataUrl?: string | null; name?: string }> {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return {};
    const bots = JSON.parse(raw);
    const map: Record<string, any> = {};
    for (const b of bots || []) {
      if (!b?.id) continue;
      map[String(b.id)] = { avatarDataUrl: b.avatarDataUrl ?? null, name: b.name };
    }
    return map;
  } catch {
    return {};
  }
}

function periodToMs(p: PeriodKey): number {
  const day = 24 * 60 * 60 * 1000;
  switch (p) {
    case "D":
      return day;
    case "W":
      return 7 * day;
    case "M":
      return 31 * day;
    case "Y":
      return 366 * day;
    case "ALL":
    case "TOUT":
    default:
      return 0;
  }
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

function inPeriod(rec: any, period: PeriodKey): boolean {
  if (period === "ALL" || period === "TOUT") return true;
  const dt = getRecTimestamp(rec);
  if (!dt) return true;
  const span = periodToMs(period);
  if (!span) return true;
  return Date.now() - dt <= span;
}


function x01LeaderboardPlayers(rec: any): any[] {
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const summary = rec?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const arr =
    (Array.isArray(summary?.players) && summary.players) ||
    (Array.isArray(rec?.players) && rec.players) ||
    (Array.isArray(payload?.players) && payload.players) ||
    (Array.isArray(payload?.config?.players) && payload.config.players) ||
    (Array.isArray(nested?.players) && nested.players) ||
    (Array.isArray(nested?.config?.players) && nested.config.players) ||
    [];
  return Array.isArray(arr) ? arr : [];
}

function x01PlayerMatchesCandidate(player: any, candidateId: string, candidateName?: string): boolean {
  const ids = [
    player?.id,
    player?.profileId,
    player?.playerId,
    player?.pid,
    player?.uid,
  ].map((v) => String(v || "").trim()).filter(Boolean);

  if (candidateId && ids.some((id) => idLooseMatch(id, candidateId) || idLooseMatch(candidateId, id))) return true;

  const cn = normText(candidateName || "");
  const pn = normText(pickName(player) || "");
  return !!cn && !!pn && cn === pn;
}

function x01ReadMapValueLoose(map: any, ids: string[]): number {
  if (!map || typeof map !== "object") return 0;
  for (const id of ids) {
    if (!id) continue;
    if (map[id] != null && Number.isFinite(Number(map[id]))) return Number(map[id]);
    const hit = Object.keys(map).find((k) => idLooseMatch(k, id) || idLooseMatch(id, k));
    if (hit && Number.isFinite(Number(map[hit]))) return Number(map[hit]);
  }
  return 0;
}

function x01DidCandidateWinRecord(rec: any, candidateId: string, candidateName?: string): boolean {
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const summary = rec?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const players = x01LeaderboardPlayers(rec);
  const me = players.find((p: any) => x01PlayerMatchesCandidate(p, candidateId, candidateName));
  const ids = [
    candidateId,
    me?.id,
    me?.profileId,
    me?.playerId,
    me?.pid,
    me?.uid,
  ].map((v) => String(v || "").trim()).filter(Boolean);

  const winnerId = String(
    rec?.winnerId ??
    summary?.winnerId ??
    payload?.winnerId ??
    payload?.summary?.winnerId ??
    nested?.winnerId ??
    nested?.summary?.winnerId ??
    ""
  ).trim();

  if (winnerId && ids.some((id) => idLooseMatch(winnerId, id) || idLooseMatch(id, winnerId))) return true;

  const winnerName = normText(
    rec?.winnerName ??
    summary?.winnerName ??
    payload?.winnerName ??
    payload?.summary?.winnerName ??
    ""
  );
  if (winnerName && normText(candidateName || pickName(me) || "") === winnerName) return true;

  if (me) {
    if (me.isWinner === true || me.winner === true || me.win === true) return true;
    const result = String(me.result ?? me.outcome ?? "").toLowerCase();
    if (result.startsWith("win") || result === "victory" || result === "victoire") return true;
  }

  const detailed = summary?.detailedByPlayer || summary?.detailedbyplayer || payload?.summary?.detailedByPlayer || null;
  if (detailed && typeof detailed === "object") {
    const key = Object.keys(detailed).find((k) => ids.some((id) => idLooseMatch(k, id) || idLooseMatch(id, k)));
    const d = key ? detailed[key] : null;
    if (d?.isWinner === true || d?.winner === true || d?.win === true) return true;
    const result = String(d?.result ?? d?.outcome ?? "").toLowerCase();
    if (result.startsWith("win") || result === "victory" || result === "victoire") return true;
  }

  // Dernier fallback robuste : si le résumé donne les sets/legs gagnés par joueur et aucun winnerId explicite.
  // On ne considère PAS rank=1 seul comme une victoire, car c'est la source du bug 19/19.
  const sets = x01ReadMapValueLoose(summary?.setsWonByPlayer || summary?.setsWinByPlayer || summary?.setsByPlayer || payload?.summary?.setsWonByPlayer, ids);
  const legs = x01ReadMapValueLoose(summary?.legsWonByPlayer || summary?.legsWinByPlayer || summary?.legsByPlayer || payload?.summary?.legsWonByPlayer, ids);
  const targetSets = Number(summary?.targetSets ?? summary?.setsToWin ?? payload?.config?.setsToWin ?? payload?.config?.sets ?? 0) || 0;
  const targetLegs = Number(summary?.targetLegs ?? summary?.legsToWin ?? payload?.config?.legsToWin ?? payload?.config?.legs ?? 0) || 0;
  if (targetSets > 0 && sets >= targetSets) return true;
  if (!targetSets && targetLegs > 0 && legs >= targetLegs) return true;

  return false;
}

function computeX01LeaderboardRowsFromDashboardAgg(
  history: any[],
  profiles: Profile[],
  scope: Scope,
  period: PeriodKey,
  opts?: { includeBots?: boolean }
): Row[] {
  const includeBots = opts?.includeBots !== false;
  const botsMap0 = includeBots ? loadBotsMap() : {};
  const candidates = new Map<string, { id: string; name: string; avatarDataUrl?: string | null }>();

  for (const p of profiles || []) {
    if (!p?.id) continue;
    candidates.set(String(p.id), {
      id: String(p.id),
      name: String((p as any).name || (p as any).displayName || ""),
      avatarDataUrl: (p as any).avatarDataUrl ?? (p as any).avatar ?? null,
    });
  }

  const x01Records = (history || []).filter((rec: any) => {
    if (!rec || !inPeriod(rec, period)) return false;
    const recIsOnline = isOnlineRecord(rec);
    if (recIsOnline && isOnlineStatsExcluded(rec)) return false;
    if (scope === "online" && !recIsOnline) return false;
    if (scope === "local" && recIsOnline) return false;
    try { return isX01HistoryMatch(rec as any); } catch { return isRecordMatchingMode(rec, "x01_multi", scope); }
  });

  for (const rec of x01Records) {
    for (const pl of x01LeaderboardPlayers(rec)) {
      const rawId = String(pickId(pl) || "").trim();
      const name = pickName(pl);
      let canonicalId = rawId;
      for (const p of profiles || []) {
        if (rawId && idLooseMatch((p as any).id, rawId)) canonicalId = String((p as any).id);
        else if (name && normText((p as any).name || (p as any).displayName || "") === normText(name)) canonicalId = String((p as any).id);
      }
      if (!canonicalId) canonicalId = name ? `name:${normText(name)}` : "";
      if (!canonicalId) continue;
      if (!includeBots && String(canonicalId).startsWith("bot")) continue;
      if (!candidates.has(canonicalId)) {
        candidates.set(canonicalId, {
          id: canonicalId,
          name: name || (includeBots ? botsMap0?.[canonicalId]?.name : "") || "—",
          avatarDataUrl: pickAvatar(pl) || (includeBots ? botsMap0?.[canonicalId]?.avatarDataUrl : null) || null,
        });
      }
    }
  }

  const rows: Row[] = [];
  for (const c of candidates.values()) {
    const agg: any = computeX01MultiAgg(x01Records as any[], c.id, c.name);
    const matches = Number(agg?.sessions || 0) || 0;
    if (matches <= 0) continue;

    let wins = 0;
    for (const rec of x01Records) {
      if (x01DidCandidateWinRecord(rec, c.id, c.name)) wins += 1;
    }

    const avg3 = matches > 0 ? (Number(agg?.sumAvg3D || 0) / matches) : 0;
    const winRate = matches > 0 ? (wins / matches) * 100 : 0;

    const singleHits = Number(agg?.hitsSingle || 0) || 0;
    const doubleHits = Number(agg?.hitsDouble || 0) || 0;
    const tripleHits = Number(agg?.hitsTriple || 0) || 0;
    const bullHits = Number(agg?.hitsBull || 0) || 0;
    const dbullHits = Number(agg?.hitsDBull || 0) || 0;
    const miss = Number(agg?.miss || 0) || 0;
    const darts = Number(agg?.darts || 0) || 0;
    const hits = singleHits + doubleHits + tripleHits + bullHits + dbullHits;
    const attempts = hits + miss;
    const scoreTotal = Math.round((avg3 / 3) * darts);
    const bestFirst9 = Number(agg?.best9Score || agg?.bestFirst9 || 0) || 0;
    const visitBuckets = agg?.visitBuckets || {};
    const byNumber = Array.isArray(agg?.byNumber) ? agg.byNumber : [];
    let favNumber = 0;
    let favNumberHits = 0;
    byNumber.forEach((cnt: any, idx: number) => {
      const n = Number(cnt || 0);
      if (idx >= 1 && idx <= 20 && n > favNumberHits) {
        favNumber = idx;
        favNumberHits = n;
      }
    });

    rows.push({
      id: c.id,
      name: c.name || "—",
      avatarDataUrl: c.avatarDataUrl ?? null,

      wins,
      losses: Math.max(0, matches - wins),
      matches,
      winRate,

      captures: 0,
      avgDom: 0,
      avgRounds: 0,
      capPerRound: 0,

      avg3,
      avg1: avg3 / 3,
      bestAvg3: Number(agg?.bestAvg3D || agg?.bestAvg3 || 0) || 0,
      bestVisit: Number(agg?.bestVisit || 0) || 0,
      bestCheckout: Number(agg?.bestCheckout || 0) || 0,
      legsWin: Number(agg?.legsWin || 0) || 0,
      setsWin: Number(agg?.setsWin || 0) || 0,
      legWinRate: matches > 0 ? ((Number(agg?.legsWin || 0) || 0) / matches) * 100 : 0,
      setWinRate: matches > 0 ? ((Number(agg?.setsWin || 0) || 0) / matches) * 100 : 0,
      darts,
      scoreTotal,
      hits,
      singleHits,
      doubleHits,
      tripleHits,
      bullHits,
      bullTotal: bullHits + dbullHits,
      missPct: attempts > 0 ? (miss / attempts) * 100 : 0,
      simplePct: attempts > 0 ? (singleHits / attempts) * 100 : 0,
      doublePct: attempts > 0 ? (doubleHits / attempts) * 100 : 0,
      triplePct: attempts > 0 ? (tripleHits / attempts) * 100 : 0,
      bullPct: attempts > 0 ? (bullHits / attempts) * 100 : 0,
      dbullPct: attempts > 0 ? (dbullHits / attempts) * 100 : 0,
      checkouts: Number(agg?.co || agg?.checkouts || 0) || 0,
      checkoutHits: Number(agg?.coHits || agg?.checkoutHits || 0) || 0,
      checkoutRate: Number(agg?.checkoutRate || agg?.coRate || 0) || 0,
      dartsCo: Number(agg?.dartsCo || agg?.checkoutDarts || 0) || 0,
      bestFirst9,
      first9Avg: Number(agg?.avgFirst9 || agg?.first9Avg || 0) || 0,
      top9Score: bestFirst9,
      first9_100: Number(agg?.first9_100 || 0) || 0,
      first9_120: Number(agg?.first9_120 || 0) || 0,
      first9_140: Number(agg?.first9_140 || 0) || 0,
      v50: Number(visitBuckets["50+"] || 0) || 0,
      v60: Number(visitBuckets["60+"] || 0) || 0,
      v80: Number(visitBuckets["80+"] || 0) || 0,
      v100: Number(visitBuckets["100+"] || 0) || 0,
      v120: Number(visitBuckets["120+"] || 0) || 0,
      v140: Number(visitBuckets["140+"] || 0) || 0,
      v180: Number(visitBuckets["180"] || visitBuckets["180+"] || 0) || 0,
      tons: Number(visitBuckets["100+"] || 0) || 0,
      busts: Number(agg?.bust || 0) || 0,

      kills: 0,
      favNumber,
      favNumberHits,
      favSegment: favNumber ? String(favNumber) : "",
      favSegmentHits: favNumberHits,
      totalHits: hits,

      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
    } as Row);
  }

  return rows;
}

function isRecordMatchingMode(rec: any, mode: LeaderboardMode, scope: Scope): boolean {
  const recIsOnline = isOnlineRecord(rec);
  if (recIsOnline && isOnlineStatsExcluded(rec)) return false;
  if (scope === "online" && !recIsOnline) return false;
  if (scope === "local" && recIsOnline) return false;

  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const summary = rec?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const cfg = payload?.config ?? payload?.cfg ?? nested?.config ?? nested?.cfg ?? null;

  const parts = [
    rec?.kind,
    rec?.mode,
    rec?.variant,
    rec?.game,
    rec?.sport,
    payload?.kind,
    payload?.mode,
    payload?.gameMode,
    payload?.variant,
    payload?.game,
    payload?.sport,
    payload?.stats?.mode,
    payload?.stats?.sport,
    nested?.kind,
    nested?.mode,
    nested?.gameMode,
    nested?.variant,
    nested?.game,
    nested?.sport,
    cfg?.kind,
    cfg?.mode,
    cfg?.gameMode,
    cfg?.variant,
    summary?.kind,
    summary?.mode,
    summary?.gameMode,
    summary?.sport,
    summary?.game?.mode,
    summary?.game?.game,
  ];

  const tag = parts
    .filter((v) => v !== undefined && v !== null)
    .map((v) => safeStr(v).toLowerCase())
    .join('|');

  if (!tag) return false;

  if (mode === "molkky") return tag.includes("molkky");
  if (mode === "babyfoot") return tag.includes("babyfoot") || tag.includes("baby-foot") || tag.includes("baby_foot");
  if (mode === "pingpong") return tag.includes("pingpong") || tag.includes("ping-pong") || tag.includes("ping_pong");

  if (String(mode).startsWith("dice")) {
    if (!tag.includes("dice")) return false;
    if (mode === "dice_duel") return tag.includes("duel") || tag.includes("dice");
    if (mode === "dice_games") return tag.includes("dice") && !tag.includes("duel");
    if (mode === "dice_race") return tag.includes("race");
    if (mode === "dice_10000") return tag.includes("10000") || tag.includes("tenk") || tag.includes("ten_k");
    if (mode === "dice_poker") return tag.includes("poker");
    if (mode === "dice_yams") return tag.includes("yams") || tag.includes("yam");
    if (mode === "dice_421") return tag.includes("421");
    if (mode === "dice_farkle") return tag.includes("farkle");
    return true;
  }

  const isX01 =
    tag.includes("x01") ||
    tag.includes("301") ||
    tag.includes("501") ||
    tag.includes("701") ||
    tag.includes("x01_v3") ||
    tag.includes("x01v3") ||
    tag.includes("x01_multi") ||
    tag.includes("x01_teams");

  if (mode === "x01_multi") return isX01 || isX01Record(rec);
  if (mode === "cricket") return tag.includes("cricket");
  if (mode === "killer") return tag.includes("killer");
  if (mode === "shanghai") return tag.includes("shanghai");
  if (mode === "golf") return tag.includes("golf");
  if (mode === "batard") return tag.includes("batard") || tag.includes("bastard");
  if (mode === "territories") return tag.includes("territ") || tag.includes("departement");
  if (mode === "battle_royale") return tag.includes("battle") || tag.includes("royale");
  if (mode === "clock") return tag.includes("clock") || tag.includes("horloge") || tag.includes("tour");
  if (mode === "scram") return tag.includes("scram");
  if (mode === "warfare") return tag.includes("warfare");
  if (mode === "five_lives") return tag.includes("five_lives") || tag.includes("five lives");

  return true;
}

// ------------------------------
// Extraction per-player (câblage stats)
// ------------------------------

function extractPerPlayerSummary(summary: any): Record<string, any> {
  if (!summary) return {};

  if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") {
    return summary.detailedByPlayer as Record<string, any>;
  }

  const out: Record<string, any> = {};

  if (Array.isArray(summary.perPlayer)) {
    for (const p of summary.perPlayer) {
      const pid = pickId(p) || safeStr(p?.id);
      if (!pid) continue;
      out[String(pid)] = p;
    }
    if (Object.keys(out).length) return out;
  }

  const avg3Map =
    summary.avg3ByPlayer ||
    summary.avg3_by_player ||
    summary.moy3ByPlayer ||
    summary.moy3_by_player ||
    summary.avgByPlayer ||
    null;

  const bestVisitMap =
    summary.bestVisitByPlayer ||
    summary.bestVisit_by_player ||
    summary.bvByPlayer ||
    summary.bv_by_player ||
    null;

  const bestCheckoutMap =
    summary.bestCheckoutByPlayer ||
    summary.bestCheckout_by_player ||
    summary.bestCoByPlayer ||
    summary.bestCo_by_player ||
    summary.coByPlayer ||
    null;


  const pointsMap =
    summary.pointsByPlayer ||
    summary.points_by_player ||
    summary.points ||
    null;

  const dartsMap =
    summary.dartsByPlayer ||
    summary.darts_by_player ||
    summary.darts ||
    null;

  const turnsMap =
    summary.turnsByPlayer ||
    summary.turns_by_player ||
    null;

  const failsMap =
    summary.failsByPlayer ||
    summary.fails_by_player ||
    null;

  const validHitsMap =
    summary.validHitsByPlayer ||
    summary.validHits_by_player ||
    null;

  const advancesMap =
    summary.advancesByPlayer ||
    summary.advances_by_player ||
    null;

  const hitsBySegMap =
    summary.hitsBySegmentByPlayer ||
    summary.hits_by_segment_by_player ||
    summary.hitsBySegment ||
    null;

  const nameMap = summary.nameByPlayer || summary.playerNames || null;
  const avatarMap = summary.avatarByPlayer || summary.avatarDataUrlByPlayer || null;

  const keys = new Set<string>();
  const collectKeys = (m: any) => {
    if (!m || typeof m !== "object") return;
    for (const k of Object.keys(m)) keys.add(String(k));
  };
  collectKeys(avg3Map);
  collectKeys(bestVisitMap);
  collectKeys(bestCheckoutMap);
  collectKeys(pointsMap);
  collectKeys(dartsMap);
  collectKeys(turnsMap);
  collectKeys(failsMap);
  collectKeys(validHitsMap);
  collectKeys(advancesMap);
  collectKeys(nameMap);
  collectKeys(avatarMap);
  collectKeys(hitsBySegMap);

  if (keys.size) {
    for (const pid of keys) {
      out[String(pid)] = {
        playerId: pid,
        profileId: pid,
        name: nameMap?.[pid],
        avatarDataUrl: avatarMap?.[pid],
        avg3: numOr0(avg3Map?.[pid]),
        bestVisit: numOr0(bestVisitMap?.[pid]),
        bestCheckout: numOr0(bestCheckoutMap?.[pid]),
        hitsBySegment: hitsBySegMap?.[pid] || undefined,
      };
    }
    return out;
  }

  if (summary.players && typeof summary.players === "object") {
    for (const [pid, p] of Object.entries(summary.players)) {
      if (!pid) continue;
      out[String(pid)] = p as any;
    }
    if (Object.keys(out).length) return out;
  }

  return {};
}

// ✅ helpers: fav number/segment from hitsBySegment
function parseSegmentKeyToNumber(segKey: string): number {
  const k = safeStr(segKey).toUpperCase();
  if (k === "SB" || k === "BULL") return 25;
  if (k === "DB" || k === "DBULL") return 25;
  const m = k.match(/^([SDT])(\d{1,2})$/);
  if (m) {
    const n = Number(m[2]);
    if (n >= 1 && n <= 20) return n;
  }
  return 0;
}

function computeFavsFromHitsMap(hitsBySegment: any) {
  const segCounts: Record<string, number> = {};
  const numCounts: Record<string, number> = {};
  let totalHits = 0;

  if (hitsBySegment && typeof hitsBySegment === "object") {
    for (const [k0, v0] of Object.entries(hitsBySegment)) {
      const k = safeStr(k0).toUpperCase();
      const c = numOr0(v0);
      if (c <= 0) continue;

      segCounts[k] = (segCounts[k] || 0) + c;
      totalHits += c;

      const n = parseSegmentKeyToNumber(k);
      if (n > 0) {
        const nk = String(n);
        numCounts[nk] = (numCounts[nk] || 0) + c;
      }
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


function pct(n: number, d: number): number {
  return d > 0 ? (n / d) * 100 : 0;
}

function addNumToAgg(agg: any, key: string, ...vals: any[]) {
  const v = numOr0(...vals);
  if (v) agg[key] = (Number(agg[key] || 0) || 0) + v;
}

function maxNumToAgg(agg: any, key: string, ...vals: any[]) {
  const v = numOr0(...vals);
  if (v) agg[key] = Math.max(Number(agg[key] || 0) || 0, v);
}

function enrichGenericAggFromDetail(agg: any, det: any, mode?: string) {
  if (!det) return;

  addNumToAgg(agg, "points", det.points, det.score, det.totalPoints, det.totalScore, det.pts);
  addNumToAgg(agg, "marks", det.totalMarks, det.marks, det.mark, det.total_marks);
  addNumToAgg(agg, "bullHits", det.bullHits, det.bulls, det.bull, det.bullTouches);
  addNumToAgg(agg, "closedSegments", det.closedSegments, det.segmentsClosed, det.closed, det.segments_fermes);
  addNumToAgg(agg, "damage", det.damage, det.damages, det.dmg);
  addNumToAgg(agg, "autoHits", det.autoHits, det.autoHit, det.auto_hits);
  addNumToAgg(agg, "autoKills", det.autoKills, det.autoKill, det.auto_kills);
  addNumToAgg(agg, "resurrections", det.resurrections, det.resurrection, det.revives);
  addNumToAgg(agg, "survival", det.survival, det.survivalTurns, det.turnsAlive, det.avgSurvival);
  addNumToAgg(agg, "darts", det.darts, det.dartsThrown, det.totalDarts);
  addNumToAgg(agg, "holes", det.holes, det.holesPlayed, det.trousJoues);
  addNumToAgg(agg, "birdies", det.birdies, det.birdie);
  addNumToAgg(agg, "eagles", det.eagles, det.eagle);
  addNumToAgg(agg, "bogeys", det.bogeys, det.bogey);
  addNumToAgg(agg, "tripleBogeys", det.tripleBogeys, det.tripleBogey);
  addNumToAgg(agg, "miss", det.miss, det.misses, det.missed);
  addNumToAgg(agg, "singleHits", det.singleHits, det.singles, det.S, det.s);
  addNumToAgg(agg, "doubleHits", det.doubleHits, det.doubles, det.D, det.d);
  addNumToAgg(agg, "tripleHits", det.tripleHits, det.triples, det.T, det.t);
  addNumToAgg(agg, "dbullHits", det.dbullHits, det.dBull, det.dbull, det.doubleBull);
  maxNumToAgg(agg, "maxVisit", det.maxVisit, det.bestVisit, det.best, det.bestScore);

  const hitRate = numOr0(det.hitRate, det.hit_rate, det.hitPct, det.hitPercent);
  if (hitRate) { agg.hitRateSum = (agg.hitRateSum || 0) + hitRate; agg.hitRateCount = (agg.hitRateCount || 0) + 1; }

  const mpr = numOr0(det.mpr, det.marksPerRound, det.marks_per_round);
  if (mpr) { agg.mprSum = (agg.mprSum || 0) + mpr; agg.mprCount = (agg.mprCount || 0) + 1; }

  const hbs = det.hitsBySegment || det.hits_by_segment || det.bySegment || det.bysegment || null;
  if (hbs && typeof hbs === "object") {
    for (const [seg, c0] of Object.entries(hbs)) {
      const c = numOr0(c0);
      if (c <= 0) continue;
      const s = safeStr(seg).toUpperCase();
      agg.hitsBySegmentAgg[s] = (agg.hitsBySegmentAgg[s] || 0) + c;
      agg.totalHits += c;
    }
  }
}

type Agg = {
  wins: number;
  matches: number;

  avg3Sum: number;
  avg3Count: number;
  bestVisit: number;
  bestCheckout: number;

  kills: number;
  hitsBySegmentAgg: Record<string, number>;
  totalHits: number;

  // ✅ BATARD sums
  batardPoints: number;
  batardDarts: number;
  batardTurns: number;
  batardFails: number;
  batardValidHits: number;
  batardAdvances: number;
};

type ExtraInfo = {
  name?: string;
  avatarDataUrl?: string | null;
};

function computeRowsFromHistory(
  history: any[],
  profiles: Profile[],
  mode: LeaderboardMode,
  scope: Scope,
  period: PeriodKey,
  opts?: { includeBots?: boolean }
): Row[] {
  const includeBots = opts?.includeBots !== false;
  const botsMap0 = includeBots ? loadBotsMap() : {};

  if (mode === "x01_multi") {
    return computeX01LeaderboardRowsFromDashboardAgg(history, profiles, scope, period, { includeBots });
  }

  const aggByPlayer: Record<string, Agg> = {};
  const infoByPlayer: Record<string, ExtraInfo> = {};
  const profileById: Record<string, Profile> = {};

  // seed profils locaux
  for (const p of profiles || []) {
    if (!p?.id) continue;
    profileById[p.id] = p;
    aggByPlayer[p.id] = {
      wins: 0,
      matches: 0,
      avg3Sum: 0,
      avg3Count: 0,
      bestVisit: 0,
      bestCheckout: 0,
      kills: 0,
      hitsBySegmentAgg: {},
      totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
    };
    infoByPlayer[p.id] = {
      name: p.name,
      avatarDataUrl: (p as any).avatarDataUrl ?? (p as any).avatar ?? null,
    };
  }

  const resolvePid = (rawPid: any, detail?: any): string => {
    const pid0 = String(rawPid || "").trim();
    const nm = normText(detail?.name || detail?.playerName || detail?.profileName || detail?.displayName || "");
    for (const p of profiles || []) {
      if (pid0 && idLooseMatch((p as any).id, pid0)) return String((p as any).id);
      if (nm && normText((p as any).name || (p as any).displayName || "") === nm) return String((p as any).id);
    }
    return pid0;
  };

  for (const rec of history || []) {
    if (!rec) continue;
    if (!inPeriod(rec, period)) continue;
    if (!isRecordMatchingMode(rec, mode, scope)) continue;

    const winnerId =
      rec.winnerId ||
      rec.payload?.winnerId ||
      rec.summary?.winnerId ||
      rec.payload?.summary?.winnerId ||
      null;

    // X01 : utilise l’agrégateur robuste commun (ID tronqués, payload imbriqués, online/local).
    if (mode === "x01_multi") {
      const playersForX01 = collectPlayers(rec);
      const targets = playersForX01.length ? playersForX01 : profiles;
      for (const pl of targets as any[]) {
        const smp = sampleFromRec(rec, { id: pickId(pl), profileId: pickId(pl), name: pickName(pl) });
        if (!smp) continue;
        const pid = resolvePid(smp.playerId || pickId(pl), { ...pl, name: smp.playerName });
        if (!pid) continue;
        if (!aggByPlayer[pid]) {
          aggByPlayer[pid] = {
            wins: 0, matches: 0, avg3Sum: 0, avg3Count: 0, bestVisit: 0, bestCheckout: 0, kills: 0, hitsBySegmentAgg: {}, totalHits: 0,
            batardPoints: 0, batardDarts: 0, batardTurns: 0, batardFails: 0, batardValidHits: 0, batardAdvances: 0,
          };
        }
        if (!infoByPlayer[pid]) infoByPlayer[pid] = {};
        if (!infoByPlayer[pid].name) infoByPlayer[pid].name = smp.playerName || pickName(pl) || (profileById[pid] as any)?.name || "—";
        if (!infoByPlayer[pid].avatarDataUrl) infoByPlayer[pid].avatarDataUrl = pickAvatar(pl) || (profileById[pid] as any)?.avatarDataUrl || (profileById[pid] as any)?.avatar || null;
        const agg = aggByPlayer[pid];
        agg.matches += Number(smp.matchesPlayed || 0) || 1;
        agg.wins += Number(smp.matchesWon || 0);
        if (Number(smp.avg3 || 0) > 0) { agg.avg3Sum += Number(smp.avg3); agg.avg3Count += 1; }
        agg.bestVisit = Math.max(agg.bestVisit, Number(smp.bestVisit || 0));
        agg.bestCheckout = Math.max(agg.bestCheckout, Number(smp.bestCheckout || 0));
        agg.totalHits += Number(smp.singleHits || 0) + Number(smp.doubleHits || 0) + Number(smp.tripleHits || 0) + Number(smp.bull25 || 0) + Number(smp.bull50 || 0);
      }
      continue;
    }

    const summary = rec.summary || rec.payload?.summary || rec.payload?.payload?.summary || rec.payload?.finalState?.summary || rec.state_json?.summary || rec.state?.summary || null;
    const payloadStatsPlayers: any[] = Array.isArray(rec?.payload?.stats?.players)
      ? rec.payload.stats.players
      : Array.isArray(rec?.payload?.stats?.playersStats)
      ? rec.payload.stats.playersStats
      : Array.isArray(rec?.payload?.players)
      ? rec.payload.players
      : [];

    // 🎲 / Mölkky / Baby-Foot / Ping-Pong : fallback principal via payload.stats.players
    if ((String(mode).startsWith("dice") || mode === "molkky" || mode === "babyfoot" || mode === "pingpong") && payloadStatsPlayers.length) {
      const playersArr = payloadStatsPlayers;
      const winner =
        winnerId ||
        playersArr.find((p: any) => !!p?.win)?.id ||
        playersArr.slice().sort((a, b) => (b?.score ?? b?.special?.points ?? 0) - (a?.score ?? a?.special?.points ?? 0))[0]?.id ||
        null;

      for (const p of playersArr) {
        const pid = resolvePid(p?.id || p?.profileId || "", p);
        if (!pid) continue;
        if (!aggByPlayer[pid]) {
          aggByPlayer[pid] = {
            wins: 0,
            matches: 0,
            avg3Sum: 0,
            avg3Count: 0,
            bestVisit: 0,
            bestCheckout: 0,
            kills: 0,
            hitsBySegmentAgg: {},
            totalHits: 0,
            batardPoints: 0,
            batardDarts: 0,
            batardTurns: 0,
            batardFails: 0,
            batardValidHits: 0,
            batardAdvances: 0,
          };
          infoByPlayer[pid] = { name: safeStr(p?.name || ""), avatarDataUrl: null };
        }

        const score = Number(p?.score ?? p?.special?.points ?? 0) || 0;
        aggByPlayer[pid].matches += 1;
        if (winner && pid === String(winner)) aggByPlayer[pid].wins += 1;
        aggByPlayer[pid].avg3Sum += score;
        aggByPlayer[pid].avg3Count += 1;
        if (score > aggByPlayer[pid].bestVisit) aggByPlayer[pid].bestVisit = score;
      }

      continue;
    }

    const per = extractPerPlayerSummary(summary);
    // dice_per_fallback
    const per2: any = per && Object.keys(per).length ? per : (() => {
      try {
        const playersArr: any[] = Array.isArray(rec?.payload?.stats?.players) ? rec.payload.stats.players : [];
        const out: any = {};
        for (const p of playersArr) {
          const pid = String(p?.id || "");
          if (!pid) continue;
          // on mappe score -> avg3/bestVisit pour conserver l'UI identique
          out[pid] = { id: pid, name: p?.name, avg3: Number(p?.score ?? 0) || 0, bestVisit: Number(p?.score ?? 0) || 0 };
        }
        return out;
      } catch {
        return {};
      }
    })();
    const summaryPlayersArr: any[] = Array.isArray(summary?.players) ? summary.players : [];

    // 1) per-player
    if (per && Object.keys(per).length > 0) {
      for (const key of Object.keys(per2)) {
        const det: any = per2[key] || {};
        const pid: string = resolvePid(pickId(det) || key || "", det);
        if (!pid) continue;

        if (!aggByPlayer[pid]) {
          aggByPlayer[pid] = {
            wins: 0,
            matches: 0,
            avg3Sum: 0,
            avg3Count: 0,
            bestVisit: 0,
            bestCheckout: 0,
            kills: 0,
            hitsBySegmentAgg: {},
            totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
          };
        }
        if (!infoByPlayer[pid]) infoByPlayer[pid] = {};

        if (!infoByPlayer[pid].name) {
          infoByPlayer[pid].name =
            pickName(det) || (includeBots ? botsMap0?.[pid]?.name : "") || infoByPlayer[pid].name || "";
        }
        if (!infoByPlayer[pid].avatarDataUrl) {
          infoByPlayer[pid].avatarDataUrl =
            pickAvatar(det) ||
            (includeBots ? botsMap0?.[pid]?.avatarDataUrl : null) ||
            infoByPlayer[pid].avatarDataUrl ||
            null;
        }

        const agg = aggByPlayer[pid];

        agg.matches += 1;
        if (winnerId && String(winnerId) === String(pid)) agg.wins += 1;

        const avg3Candidate = numOr0(det.avg3, det.moy3, det.avg, det.avg3d, det.avg_3);
        if (avg3Candidate > 0) {
          agg.avg3Sum += avg3Candidate;
          agg.avg3Count += 1;
        }

        const bvCandidate = numOr0(det.bestVisit, det.bv, det.bestVisit3, det.bv3, det.best_visit);
        if (bvCandidate > 0) agg.bestVisit = Math.max(agg.bestVisit, bvCandidate);

        const coCandidate = numOr0(det.bestCheckout, det.bestCo, det.coBest, det.co, det.best_co);
        if (coCandidate > 0) agg.bestCheckout = Math.max(agg.bestCheckout, coCandidate);

        // ✅ BATARD sums (if present in summary maps)
        const ptsCandidate = numOr0(det.points, det.pointsAdded, det.points_by_player);
        const dartsCandidate = numOr0(det.darts, det.dartsThrown, det.darts_by_player);
        const turnsCandidate = numOr0(det.turns, det.turnsByPlayer, det.turns_by_player);
        const failsCandidate = numOr0(det.fails, det.fail, det.failsByPlayer);
        const vhCandidate = numOr0(det.validHits, det.valid_hits, det.validHitsByPlayer);
        const advCandidate = numOr0(det.advances, det.advance, det.advancesByPlayer);
        if (ptsCandidate) agg.batardPoints += ptsCandidate;
        if (dartsCandidate) agg.batardDarts += dartsCandidate;
        if (turnsCandidate) agg.batardTurns += turnsCandidate;
        if (failsCandidate) agg.batardFails += failsCandidate;
        if (vhCandidate) agg.batardValidHits += vhCandidate;
        if (advCandidate) agg.batardAdvances += advCandidate;

        enrichGenericAggFromDetail(agg, det, mode);

        if (mode === "killer") {
          // kills: prefer summary.players
          if (summaryPlayersArr.length) {
            const sp = summaryPlayersArr.find((x) => String(pickId(x) || x?.id) === String(pid));
            if (sp) {
              const k = numOr0(sp.kills, sp.killCount, sp.k);
              if (k > 0) agg.kills += k;
            }
          } else {
            const k = numOr0(det.kills, det.killCount, det.k);
            if (k > 0) agg.kills += k;
          }

          // hitsBySegment
          const hbs = det.hitsBySegment || det.hits_by_segment || det.hits || null;
          if (hbs && typeof hbs === "object") {
            for (const [seg, c0] of Object.entries(hbs)) {
              const c = numOr0(c0);
              if (c <= 0) continue;
              const s = safeStr(seg).toUpperCase();
              agg.hitsBySegmentAgg[s] = (agg.hitsBySegmentAgg[s] || 0) + c;
              agg.totalHits += c;
            }
          }
        }
      }
      continue;
    }

    // 2) fallback via players array
    const playersArr: any[] = Array.isArray(rec.players)
      ? rec.players
      : Array.isArray(rec.payload?.players)
      ? rec.payload.players
      : Array.isArray(rec.payload?.summary?.players)
      ? rec.payload.summary.players
      : [];

    if (!playersArr.length) continue;

    for (const pl of playersArr) {
      const pid0 = resolvePid(pickId(pl), pl);
      const name = pickName(pl);
      const avatar = pickAvatar(pl);

      const key = pid0 ? String(pid0) : `name:${safeStr(name).trim().toLowerCase()}`;
      if (!key) continue;

      if (!aggByPlayer[key]) {
        aggByPlayer[key] = {
          wins: 0,
          matches: 0,
          avg3Sum: 0,
          avg3Count: 0,
          bestVisit: 0,
          bestCheckout: 0,
          kills: 0,
          hitsBySegmentAgg: {},
          totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
        };
      }

      if (!infoByPlayer[key]) infoByPlayer[key] = {};

      if (!infoByPlayer[key].name) {
        infoByPlayer[key].name = name || (includeBots && pid0 ? botsMap0?.[String(pid0)]?.name : "") || "—";
      }

      if (!infoByPlayer[key].avatarDataUrl) {
        infoByPlayer[key].avatarDataUrl =
          avatar || (includeBots && pid0 ? botsMap0?.[String(pid0)]?.avatarDataUrl : null) || null;
      }

      const agg = aggByPlayer[key];
      agg.matches += 1;
      if (winnerId && pid0 && String(winnerId) === String(pid0)) agg.wins += 1;

      const avg3Candidate = numOr0(pl.avg3, pl.moy3, pl.avg3d);
      if (avg3Candidate > 0) {
        agg.avg3Sum += avg3Candidate;
        agg.avg3Count += 1;
      }
      const bvCandidate = numOr0(pl.bestVisit, pl.bv, pl.bestVisit3);
      if (bvCandidate > 0) agg.bestVisit = Math.max(agg.bestVisit, bvCandidate);
      const coCandidate = numOr0(pl.bestCheckout, pl.bestCo, pl.coBest);
      if (coCandidate > 0) agg.bestCheckout = Math.max(agg.bestCheckout, coCandidate);

      // ✅ BATARD fallback fields
      agg.batardPoints += numOr0(pl.points, pl.pointsAdded);
      agg.batardDarts += numOr0(pl.darts, pl.dartsThrown);
      agg.batardTurns += numOr0(pl.turns);
      agg.batardFails += numOr0(pl.fails);
      agg.batardValidHits += numOr0(pl.validHits);
      agg.batardAdvances += numOr0(pl.advances);

      enrichGenericAggFromDetail(agg, pl, mode);

      if (mode === "killer") {
        const k = numOr0(pl.kills, pl.killCount, pl.k);
        if (k > 0) agg.kills += k;
      }
    }
  }

  const rows: Row[] = Object.keys(aggByPlayer).map((pid) => {
    const agg = aggByPlayer[pid];
    const prof = profileById[pid];
    const extra = infoByPlayer[pid] || {};

    const matches = agg.matches || 0;
    const wins = agg.wins || 0;
    const winRate = matches > 0 ? (wins / matches) * 100 : 0;
    const avg3 = agg.avg3Count > 0 ? agg.avg3Sum / agg.avg3Count : 0;

    const fav =
      mode === "killer"
        ? computeFavsFromHitsMap(agg.hitsBySegmentAgg)
        : { favSegment: "", favSegmentHits: 0, favNumber: 0, favNumberHits: 0, totalHits: 0 };

    const botFallbackAvatar = includeBots ? botsMap0?.[pid]?.avatarDataUrl || null : null;
    const botFallbackName = includeBots ? botsMap0?.[pid]?.name || undefined : undefined;

    const failsPerMatch = matches > 0 ? agg.batardFails / matches : 0;
    const validHitsPerDart = agg.batardDarts > 0 ? agg.batardValidHits / agg.batardDarts : 0;
    const ptsPerTurn = agg.batardTurns > 0 ? agg.batardPoints / agg.batardTurns : 0;

    return {
      id: pid,
      name: prof?.name || extra.name || botFallbackName || "—",
      avatarDataUrl:
        (prof as any)?.avatarDataUrl ??
        (prof as any)?.avatar ??
        extra.avatarDataUrl ??
        botFallbackAvatar ??
        null,

      wins,
      losses: Math.max(0, matches - wins),
      matches,
      winRate,

      avg3,
      bestVisit: agg.bestVisit || 0,
      bestCheckout: agg.bestCheckout || 0,

      kills: agg.kills || 0,
      killsPerMatch: matches > 0 ? (agg.kills || 0) / matches : 0,
      favNumber: fav.favNumber || 0,
      favNumberHits: fav.favNumberHits || 0,
      favSegment: fav.favSegment || "",
      favSegmentHits: fav.favSegmentHits || 0,
      totalHits: fav.totalHits || agg.totalHits || 0,

      points: agg.points || agg.batardPoints || 0,
      pointsPerMatch: matches > 0 ? (agg.points || agg.batardPoints || 0) / matches : 0,
      marks: agg.marks || 0,
      marksPerMatch: matches > 0 ? (agg.marks || 0) / matches : 0,
      mpr: agg.mprCount > 0 ? agg.mprSum / agg.mprCount : (agg.darts > 0 ? ((agg.marks || 0) / agg.darts) * 3 : 0),
      hitRate: agg.hitRateCount > 0 ? agg.hitRateSum / agg.hitRateCount : pct((agg.totalHits || 0), (agg.totalHits || 0) + (agg.miss || 0)),
      bullHits: agg.bullHits || 0,
      closedSegments: agg.closedSegments || 0,
      damage: agg.damage || 0,
      damagePerMatch: matches > 0 ? (agg.damage || 0) / matches : 0,
      autoHits: agg.autoHits || 0,
      autoKills: agg.autoKills || 0,
      resurrections: agg.resurrections || 0,
      avgSurvival: matches > 0 ? (agg.survival || 0) / matches : 0,
      darts: agg.darts || agg.batardDarts || 0,
      scoreTotal: agg.points || agg.batardPoints || 0,
      hits: agg.totalHits || 0,
      singleHits: agg.singleHits || 0,
      doubleHits: agg.doubleHits || 0,
      tripleHits: agg.tripleHits || 0,
      bullTotal: (agg.bullHits || 0) + (agg.dbullHits || 0),
      missPct: pct((agg.miss || 0), (agg.totalHits || 0) + (agg.miss || 0)),
      singlePct: pct((agg.singleHits || 0), (agg.singleHits || 0) + (agg.doubleHits || 0) + (agg.tripleHits || 0) + (agg.miss || 0)),
      doubleHitPct: pct((agg.doubleHits || 0), (agg.singleHits || 0) + (agg.doubleHits || 0) + (agg.tripleHits || 0) + (agg.miss || 0)),
      tripleHitPct: pct((agg.tripleHits || 0), (agg.singleHits || 0) + (agg.doubleHits || 0) + (agg.tripleHits || 0) + (agg.miss || 0)),
      bullPct: pct((agg.bullHits || 0), (agg.totalHits || 0) + (agg.miss || 0)),
      dbullPct: pct((agg.dbullHits || 0), (agg.totalHits || 0) + (agg.miss || 0)),
      holes: agg.holes || 0,
      scorePerHole: (agg.holes || 0) > 0 ? (agg.points || 0) / agg.holes : 0,
      birdiePct: pct((agg.birdies || 0), (agg.holes || 0)),
      eaglePct: pct((agg.eagles || 0), (agg.holes || 0)),
      bogeyPct: pct((agg.bogeys || 0), (agg.holes || 0)),
      tripleBogeyPct: pct((agg.tripleBogeys || 0), (agg.holes || 0)),
    };
  });

  return rows;
}

function computeRowsFromTerritories(
  profiles: ProfileLite[],
  metric: MetricKey
): Row[] {
  const matches = loadTerritoriesHistory();

  const byId = new Map<string, ProfileLite>();
  for (const p of profiles) byId.set(p.id, p);

  type Agg = {
    id: string;
    name: string;
    avatar?: string;
    matches: number;
    wins: number;
    captures: number;
    dom: number;
    rounds: number;
  };

  const agg = new Map<string, Agg>();

  const ensure = (id: string, fallbackName?: string, fallbackAvatar?: string) => {
    const p = byId.get(id);
    const name = p?.name || fallbackName || "—";
    const avatar = p?.avatar || fallbackAvatar;
    let a = agg.get(id);
    if (!a) {
      a = { id, name, avatar, matches: 0, wins: 0, captures: 0, dom: 0, rounds: 0 };
      agg.set(id, a);
    } else {
      // refresh name/avatar if needed
      if (a.name === "—" && name !== "—") a.name = name;
      if (!a.avatar && avatar) a.avatar = avatar;
    }
    return a;
  };

  for (const m of matches) {
    const players = Array.isArray((m as any).players) ? (m as any).players : [];
    if (!players.length) continue;

    const winnerTeam = typeof (m as any).winnerTeam === "number" ? (m as any).winnerTeam : 0;
    const caps: number[] = Array.isArray((m as any).captured)
      ? (m as any).captured.map((x: any) => Number(x) || 0)
      : [];
    const doms: number[] = Array.isArray((m as any).domination)
      ? (m as any).domination.map((x: any) => Number(x) || 0)
      : [];
    const rounds = Number((m as any).rounds) || 0;

    for (const pl of players) {
      const pid = String(pl.profileId || "").trim();
      if (!pid) continue;
      const a = ensure(pid, pl.name, pl.avatar);
      a.matches += 1;
      const ti = typeof pl.teamIndex === "number" ? pl.teamIndex : 0;
      if (ti === winnerTeam) a.wins += 1;

      // Per-team stats
      a.captures += Number(caps[ti] ?? 0) || 0;
      a.dom += Number(doms[ti] ?? 0) || 0;
      a.rounds += rounds;
    }
  }

  const rows: Row[] = Array.from(agg.values()).map((a) => {
    const winRate = a.matches > 0 ? Math.round((a.wins / a.matches) * 1000) / 10 : 0;
    const avgDom = a.matches > 0 ? Math.round((a.dom / a.matches) * 10) / 10 : 0;
    const avgRounds = a.matches > 0 ? Math.round((a.rounds / a.matches) * 10) / 10 : 0;
    const capPerRound = a.rounds > 0 ? Math.round((a.captures / a.rounds) * 100) / 100 : 0;
    return {
      id: a.id,
      profileId: a.id,
      name: a.name,
      avatar: a.avatar,
      avatarDataUrl: a.avatar,
      wins: a.wins,
      losses: Math.max(0, a.matches - a.wins),
      winRate,
      matches: a.matches,
      captures: a.captures,
      avgDom,
      avgRounds,
      capPerRound,
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
      kills: 0,
      favNumberHits: 0,
      favSegmentHits: 0,
      totalHits: 0,
      batardPoints: 0,
      batardDarts: 0,
      batardTurns: 0,
      batardFails: 0,
      batardValidHits: 0,
      batardAdvances: 0,
    };
  });

  rows.sort((a, b) => (b[metric] - a[metric]) || (b.matches - a.matches));
  return rows;
}

function metricLabel(m: MetricKey, sport?: string) {
  switch (m) {
    case "wins":
      return "Victoires";
    case "losses":
      return "Défaites";
    case "winRate":
      return "% Win";
    case "matches":
      return "Matchs joués";
    case "legsWin":
      return "Legs gagnés";
    case "setsWin":
      return "Sets gagnés";
    case "legWinRate":
      return "% Legs";
    case "setWinRate":
      return "% Sets";
    case "avg3":
      return sport === "molkky" || sport === "dicegame" || sport === "babyfoot" || sport === "pingpong" ? "Moy. score" : "Moy. 3 darts";
    case "avg1":
      return "Moy. 1 dart";
    case "bestAvg3":
      return "Best moy. 3D";
    case "bestVisit":
      return sport === "molkky" || sport === "babyfoot" || sport === "pingpong" ? "Meilleur score" : "Best visit";
    case "bestCheckout":
      return sport === "molkky" || sport === "babyfoot" || sport === "pingpong" ? "Meilleur score" : "Best CO";
    case "bestFirst9":
      return "Best First9";
    case "first9Avg":
      return "Avg First9";
    case "top9Score":
      return "Top 9 darts";
    case "checkouts":
      return "CO";
    case "checkoutHits":
      return "CO réussis";
    case "checkoutRate":
      return "CO %";
    case "dartsCo":
      return "Darts CO";
    case "darts":
      return "Darts";
    case "scoreTotal":
      return "Score total";
    case "hits":
      return "Hits";
    case "missPct":
      return "% Miss";
    case "simplePct":
    case "singlePct":
      return "% Simple";
    case "doublePct":
    case "doubleHitPct":
      return "% Double";
    case "triplePct":
    case "tripleHitPct":
      return "% Triple";
    case "bullPct":
      return "% Bull";
    case "dbullPct":
      return "% DBull";
    case "bullTotal":
      return "Bull + DBull";
    case "v50":
      return "50+";
    case "v60":
      return "60+";
    case "v80":
      return "80+";
    case "v100":
      return "100+";
    case "v120":
      return "120+";
    case "v140":
      return "140+";
    case "v180":
      return "180";
    case "tons":
      return "Tons 100+";
    case "busts":
      return "Busts";
    case "favNumber":
      return "Numéro favori";
    case "points":
      return "Points";
    case "pointsPerMatch":
      return "Pts / match";
    case "marks":
      return "Total Marks";
    case "marksPerMatch":
      return "Marks / match";
    case "mpr":
      return "MPR";
    case "hitRate":
      return "Hit rate";
    case "bullHits":
      return "Bull touchés";
    case "closedSegments":
      return "Segments fermés";
    case "damage":
      return "Damage";
    case "singleHits":
      return "Simple";
    case "doubleHits":
      return "Double";
    case "tripleHits":
      return "Triple";
    case "killsPerMatch":
      return "Kills / match";
    case "damagePerMatch":
      return "Damage / match";
    case "autoHits":
      return "Auto hits";
    case "autoKills":
      return "Auto kills";
    case "resurrections":
      return "Résurrections";
    case "avgSurvival":
      return "Survie moy.";
    case "scorePerHole":
      return "Score / trou";
    case "holes":
      return "Trous joués";
    case "birdiePct":
      return "% Birdie";
    case "eaglePct":
      return "% Eagle";
    case "bogeyPct":
      return "% Bogey";
    case "tripleBogeyPct":
      return "% Triple bogey";
    case "kills":
      return "Kills";
    case "favNumberHits":
      return "Numéro favori";
    case "favSegmentHits":
      return "Segment favori";
    case "totalHits":
      return "Hits total";
    case "captures":
      return "Captures";
    case "avgDom":
      return "Domination (moy.)";
    case "avgRounds":
      return "Tours (moy.)";
    case "capPerRound":
      return "Captures / tour";
    case "failsPerMatch":
      return "Fails / match";
    case "validHitsPerDart":
      return "Valid hits / dart";
    case "advances":
      return "Avancées";
    case "ptsPerTurn":
      return "Pts / tour";
    default:
      return "Stat";
  }
}

function periodLabel(p: PeriodKey) {
  switch (p) {
    case "D":
      return "J";
    case "W":
      return "S";
    case "M":
      return "M";
    case "Y":
      return "A";
    case "ALL":
      return "All";
    case "TOUT":
      return "Tout";
    default:
      return "All";
  }
}

function isDisplayableRowStrict(r: any): boolean {
  const nameOk = !!cleanName(r?.name);
  const avatarOk = !!cleanAvatar(r?.avatarDataUrl);
  const matches = numOr0(r?.matches, r?.played);
  // ✅ on affiche seulement si entrée “complète” + au moins 1 match
  return nameOk && avatarOk && matches > 0;
}

function isBotRow(row: any, botsMap: Record<string, any>, profileIds: Set<string>) {
  const id = safeStr(row?.id);
  // bot si son id est dans botsMap ET que ce n’est PAS un profil local
  return !!(id && botsMap?.[id] && !profileIds.has(id));
}

// =============================================================

export default function StatsLeaderboardsPage({ store, sportOverride }: Props) {
  const { sport } = useSport();

  const inferredHistorySport = React.useMemo(() => {
    const rows = Array.isArray((store as any)?.history) ? ((store as any).history as any[]) : [];
    if (!rows.length) return "";
    const counts = { molkky: 0, dicegame: 0, babyfoot: 0, pingpong: 0, darts: 0 };
    for (const r of rows) {
      const sp = String(r?.sport ?? r?.payload?.sport ?? "").toLowerCase();
      const kind = String(r?.kind ?? r?.payload?.kind ?? r?.mode ?? "").toLowerCase();
      const tag = `${sp}|${kind}`;
      if (tag.includes("molkky")) counts.molkky += 1;
      else if (tag.includes("dice")) counts.dicegame += 1;
      else if (tag.includes("babyfoot") || tag.includes("baby-foot") || tag.includes("baby_foot")) counts.babyfoot += 1;
      else if (tag.includes("pingpong") || tag.includes("ping-pong") || tag.includes("ping_pong")) counts.pingpong += 1;
      else counts.darts += 1;
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] <= 0 || best[0] === "darts") return "";
    return best[0];
  }, [store]);

  const effectiveSport = String(sportOverride || inferredHistorySport || sport || "").toLowerCase();
  const isDiceSport = effectiveSport.includes("dice");
  const isMolkkySport = effectiveSport === "molkky";
  const isBabyFootSport = effectiveSport === "babyfoot";
  const isPingPongSport = effectiveSport === "pingpong";

  const { theme } = useTheme();
  const langAny: any = useLang();

  // ✅ Fix "t is not a function"
  const t = React.useCallback(
    (key: string, fallback: string) => {
      const fn = langAny?.t;
      if (typeof fn === "function") return fn(key, fallback);
      return fallback ?? key;
    },
    [langAny]
  );

  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const profileIds = React.useMemo(
    () => new Set((profiles || []).map((p: any) => String(p?.id || "")).filter(Boolean)),
    [profiles]
  );

  const [scope, setScope] = React.useState<Scope>("local");
  const [mode, setMode] = React.useState<LeaderboardMode>(isMolkkySport ? "molkky" : isDiceSport ? "dice_duel" : isBabyFootSport ? "babyfoot" : isPingPongSport ? "pingpong" : "x01_multi");
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");

  // ✅ NEW: toggle bots (par défaut ON)
  const [includeBots, setIncludeBots] = React.useState<boolean>(true);
  React.useEffect(() => {
    setMode(isMolkkySport ? "molkky" : isDiceSport ? "dice_duel" : isBabyFootSport ? "babyfoot" : isPingPongSport ? "pingpong" : "x01_multi");
  }, [isMolkkySport, isDiceSport, isBabyFootSport, isPingPongSport]);


  const modeDefs = React.useMemo(() => {
    if (isMolkkySport) {
      return [{ id: "molkky", label: "MÖLKKY", metrics: ["matches", "wins", "winRate", "avg3", "bestVisit"] }] as any;
    }
    if (isBabyFootSport) {
      return [{ id: "babyfoot", label: "BABY-FOOT", metrics: ["matches", "wins", "winRate", "avg3", "bestVisit"] }] as any;
    }
    if (isPingPongSport) {
      return [{ id: "pingpong", label: "PING-PONG", metrics: ["matches", "wins", "winRate", "avg3", "bestVisit"] }] as any;
    }
    if (!isDiceSport) return MODE_DEFS as any;

    return [
      ...((MODE_DEFS as any) || []),
      {
        id: "dice_duel",
        label: "DICE DUEL",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
      {
        id: "dice_games",
        label: "DICE GAMES",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
      {
        id: "dice_race",
        label: "DICE RACE",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
      {
        id: "dice_10000",
        label: "10000",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
      {
        id: "dice_yams",
        label: "YAM'S",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
      {
        id: "dice_farkle",
        label: "FARKLE",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
      {
        id: "dice_421",
        label: "421",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
      {
        id: "dice_poker",
        label: "POKER DICE",
        metrics: ["avg3", "wins", "winRate", "matches", "bestVisit"],
      },
    ] as any;
  }, [isDiceSport, isMolkkySport, isBabyFootSport, isPingPongSport]);


  // ✅ BATARD filters (derived from History payload.config)
  const [batardPreset, setBatardPreset] = React.useState<string>("all");
  const [batardWinMode, setBatardWinMode] = React.useState<string>("all");
  const [batardFailPolicy, setBatardFailPolicy] = React.useState<string>("all");
  const [batardScoreOnlyValid, setBatardScoreOnlyValid] = React.useState<string>("all"); // all|true|false
  const [historySource, setHistorySource] = React.useState<any[]>([]);


  const batardFilterOptions = React.useMemo(() => {
    const presets = new Set<string>();
    const winModes = new Set<string>();
    const failPolicies = new Set<string>();
    const scoreOnlyVals = new Set<string>();
    for (const r of historySource || []) {
      const kind = String(r?.kind || r?.payload?.kind || r?.summary?.mode || r?.payload?.mode || "").toLowerCase();
      if (!(kind.includes("batard") || kind.includes("bastard"))) continue;
      const c = r?.payload?.config || r?.decoded?.config || r?.config || null;
      const b = c?.batard || c?.rules || null;
      if (b?.presetId) presets.add(String(b.presetId));
      if (b?.winMode) winModes.add(String(b.winMode));
      if (b?.failPolicy) failPolicies.add(String(b.failPolicy));
      if (typeof b?.scoreOnlyValid === "boolean") scoreOnlyVals.add(String(b.scoreOnlyValid));
    }
    return {
      presets: Array.from(presets).sort(),
      winModes: Array.from(winModes).sort(),
      failPolicies: Array.from(failPolicies).sort(),
      scoreOnlyVals: Array.from(scoreOnlyVals).sort(),
    };
  }, [historySource]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const api: any = History as any;
        const rows =
          typeof api.listFinished === "function"
            ? await api.listFinished()
            : typeof api.list === "function"
            ? await api.list()
            : [];

        const hydrated: any[] = [];
        for (let i = 0; i < (Array.isArray(rows) ? rows : []).length; i++) {
          const row: any = rows[i];
          const id = String(row?.matchId ?? row?.id ?? "").trim();
          let full = row;
          try {
            if (id && typeof api.get === "function") full = (await api.get(id)) || row;
          } catch {}
          hydrated.push(full);
        }

        if (alive) {
          if (import.meta.env.DEV) console.log("[Leaderboards] finished history size =", hydrated.length);
          setHistorySource(hydrated);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.log("[Leaderboards] History finished load error", err);
        if (alive) setHistorySource([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store?.history]);

  const currentModeDef = modeDefs.find((m) => m.id === mode);
  const metricList = currentModeDef?.metrics ?? [];
  const [metric, setMetric] = React.useState<MetricKey>(metricList[0] ?? "wins");

  React.useEffect(() => {
    const def = modeDefs.find((m) => m.id === mode);
    if (!def) return;
    if (!def.metrics.includes(metric)) setMetric(def.metrics[0]);
  }, [mode]); // eslint-disable-line

  const currentModeIndex = modeDefs.findIndex((m) => m.id === mode);
  const currentMetricIndex = Math.max(0, metricList.findIndex((m) => m === metric));

  const cycleMode = (dir: "prev" | "next") => {
    if (!modeDefs.length) return;
    let idx = currentModeIndex < 0 ? 0 : currentModeIndex;
    const len = modeDefs.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMode(modeDefs[newIndex].id);
  };

  const cycleMetric = (dir: "prev" | "next") => {
    if (!metricList.length) return;
    let idx = currentMetricIndex;
    const len = metricList.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMetric(metricList[newIndex]);
  };

  const rows: any[] = React.useMemo(() => {
    const botsMap = loadBotsMap();

    const valueAny = (r: any): number => {
      if (metric === "matches") return numOr0(r?.matches, r?.played);
      if (metric === "favNumberHits") return numOr0(r?.favNumberHits);
      if (metric === "favSegmentHits") return numOr0(r?.favSegmentHits);
      return numOr0(r?.[metric]);
    };

    const sortRows = (list: any[]) => [...(list || [])].sort((a, b) => valueAny(b) - valueAny(a));

    const sanitizeAndFilter = (list: any[]) => {
      const out = (list || [])
        .map((r: any, i: number) => {
          const name = cleanName(r?.name);
          const avatarDataUrl = cleanAvatar(r?.avatarDataUrl);
          const id =
            safeStr(r?.id || r?.playerId || r?.profileId || r?.pid || "") ||
            (name ? `name:${name.toLowerCase()}` : `row:${i}`);
          return { ...r, id, name, avatarDataUrl };
        })
        .filter(isDisplayableRowStrict);

      // ✅ OFF => on vire vraiment les bots
      const filtered = includeBots ? out : out.filter((r) => !isBotRow(r, botsMap, profileIds));
      return filtered;
    };


    // ✅ BATARD filters
    const historyFiltered =
      mode !== "batard"
        ? historySource
        : (historySource || []).filter((r: any) => {
            const c = r?.payload?.config || r?.decoded?.config || r?.config || null;
            const b = c?.batard || null;
            if (!b) return true;
            if (batardPreset !== "all" && String(b.presetId || "") !== batardPreset) return false;
            if (batardWinMode !== "all" && String(b.winMode || "") !== batardWinMode) return false;
            if (batardFailPolicy !== "all" && String(b.failPolicy || "") !== batardFailPolicy) return false;
            if (batardScoreOnlyValid !== "all" && String(!!b.scoreOnlyValid) !== batardScoreOnlyValid) return false;
            return true;
          });
    // ✅ TERRITORIES : hors History (localStorage)
    if (mode === "territories") {
      const base = computeRowsFromTerritories(profiles || [], metric);
      return sortRows(sanitizeAndFilter(base));
    }

    // ✅ KILLER : on essaie computeKillerAgg si dispo et compatible, sinon fallback sur computeRowsFromHistory
    if (mode === "killer") {
      try {
        const fn = computeKillerAgg as any;
        if (typeof fn === "function") {
          let agg: any = null;
          const botsArg = includeBots ? botsMap : {};
          try {
            agg = fn(historySource || [], profiles || [], botsArg);
          } catch {
            agg = fn(historySource || [], profiles || []);
          }
          const base = Array.isArray(agg) ? agg : Object.values(agg || {});
          return sortRows(sanitizeAndFilter(base));
        }
      } catch {
        // ignore → fallback
      }
    }

    // ✅ autres modes
    const baseRows = computeRowsFromHistory(historyFiltered, profiles, mode, scope, period, { includeBots });
    return sortRows(sanitizeAndFilter(baseRows));
  }, [historySource, profiles, mode, scope, metric, period, includeBots, profileIds, batardPreset, batardWinMode, batardFailPolicy, batardScoreOnlyValid]);

  const hasData = rows.length > 0;
  const currentMetricLabel = metricLabel(metric, sport) || t("stats.leaderboards.metric", "Stat");

  return (
    <div
      className="stats-leaderboards-page"
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        paddingTop: 20,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER (sans bouton retour) */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              color: theme.primary,
              fontSize: 20,
              textShadow: `0 0 14px ${theme.primary}66`,
              marginBottom: 4,
            }}
          >
            {t("stats.leaderboards.titleMain", "CLASSEMENTS")}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.3, color: theme.textSoft }}>
            Classements globaux par mode de jeu et par stat.
          </div>
        </div>
      </div>

      {/* CARD : SCOPE + MODE */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          padding: 10,
          marginBottom: 14,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 16px 32px rgba(0,0,0,.65), 0 0 20px ${theme.primary}33`,
        }}
      >
        {/* Scope */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {(["local", "online"] as Scope[]).map((s) => {
            const active = s === scope;
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  background: active ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)` : "transparent",
                  color: active ? "#000" : theme.textSoft,
                  boxShadow: active ? `0 0 14px ${theme.primary}77` : "none",
                  cursor: "pointer",
                }}
              >
                {s === "local" ? "LOCAL" : "ONLINE"}
              </button>
            );
          })}
        </div>

        {/* ✅ Toggle BOTS */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <button
            onClick={() => setIncludeBots((v) => !v)}
            style={{
              borderRadius: 999,
              border: `1px solid ${includeBots ? theme.primary : theme.borderSoft}`,
              padding: "5px 10px",
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: includeBots ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)` : "rgba(0,0,0,0.25)",
              color: includeBots ? "#000" : theme.textSoft,
              boxShadow: includeBots ? `0 0 14px ${theme.primary}55` : "none",
              cursor: "pointer",
              minWidth: 120,
              textAlign: "center",
            }}
          >
            BOTS : {includeBots ? "ON" : "OFF"}
          </button>
        </div>

        {/* Mode carousel */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <button
            onClick={() => cycleMode("prev")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "6px 10px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 14px ${theme.primary}33`,
            }}
          >
            {currentModeDef?.label ?? ""}
          </div>

          <button
            onClick={() => cycleMode("next")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* PÉRIODE + STAT */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 12,
          marginBottom: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 12px 26px rgba(0,0,0,.7)`,
        }}
      >
        {/* Période */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: theme.primary,
            }}
          >
            {t("stats.leaderboards.period", "Période")}
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {(["D", "W", "M", "Y", "ALL", "TOUT"] as PeriodKey[]).map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    borderRadius: 999,
                    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                    padding: "3px 7px",
                    fontSize: 9,
                    fontWeight: 700,
                    background: active ? theme.primary : "transparent",
                    color: active ? "#000" : theme.textSoft,
                    cursor: "pointer",
                  }}
                >
                  {periodLabel(p)}
                </button>
              );
            })}
          </div>
        </div>


        {/* ✅ BATARD filters */}
        {mode === "batard" ? (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={batardPreset} onChange={(e) => setBatardPreset(e.target.value)} style={S.select(theme)}>
              <option value="all">Preset: Tous</option>
              {batardFilterOptions.presets.map((x) => (
                <option key={x} value={x}>
                  Preset: {x}
                </option>
              ))}
            </select>

            <select value={batardWinMode} onChange={(e) => setBatardWinMode(e.target.value)} style={S.select(theme)}>
              <option value="all">WinMode: Tous</option>
              {batardFilterOptions.winModes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select value={batardFailPolicy} onChange={(e) => setBatardFailPolicy(e.target.value)} style={S.select(theme)}>
              <option value="all">FailPolicy: Tous</option>
              {batardFilterOptions.failPolicies.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select
              value={batardScoreOnlyValid}
              onChange={(e) => setBatardScoreOnlyValid(e.target.value)}
              style={S.select(theme)}
            >
              <option value="all">ScoreOnlyValid: Tous</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        ) : null}

        {/* Tri */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            color: theme.primary,
            marginBottom: 4,
          }}
        >
          {t("stats.leaderboards.sortBy", "Classement par")}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => cycleMetric("prev")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "5px 10px",
              textAlign: "center",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 10px ${theme.primary}33`,
            }}
          >
            {currentMetricLabel}
          </div>

          <button
            onClick={() => cycleMetric("next")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 14px 30px rgba(0,0,0,.8)`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: theme.textSoft,
            marginBottom: 6,
          }}
        >
          {t("stats.leaderboards.titleList", "Classements")}
        </div>

        {!hasData ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 11.5, color: theme.textSoft }}>
            {t("stats.leaderboards.empty", "Aucune donnée de classement.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((row: any, index: number) => {
              const rank = index + 1;

              // ✅ Sécurité ultime (au cas où)
              if (!isDisplayableRowStrict(row)) return null;

              let rankColor = theme.textSoft;
              if (rank === 1) rankColor = "#ffd700";
              else if (rank === 2) rankColor = "#c0c0c0";
              else if (rank === 3) rankColor = "#cd7f32";

              let metricValue: string;
              let metricSub: string | null = null;

              const rMatches = numOr0(row.matches, row.played);

              const pctMetrics = new Set([
                "winRate", "legWinRate", "setWinRate", "checkoutRate", "missPct", "simplePct", "doublePct",
                "triplePct", "bullPct", "dbullPct", "hitRate", "singlePct", "doubleHitPct", "tripleHitPct",
                "birdiePct", "eaglePct", "bogeyPct", "tripleBogeyPct"
              ]);
              const oneDecimalMetrics = new Set([
                "avg3", "avg1", "bestAvg3", "first9Avg", "pointsPerMatch", "marksPerMatch",
                "mpr", "killsPerMatch", "damagePerMatch", "avgSurvival", "scorePerHole"
              ]);
              const metricRaw = metric === "matches" ? rMatches : numOr0(row?.[metric]);

              switch (metric) {
                case "wins":
                  metricValue = `${numOr0(row.wins)}`;
                  metricSub = `${rMatches} matchs`;
                  break;
                case "losses":
                  metricValue = `${numOr0(row.losses)}`;
                  metricSub = `${rMatches} matchs`;
                  break;
                case "winRate":
                  metricValue = `${numOr0(row.winRate).toFixed(1)}%`;
                  metricSub = `${numOr0(row.wins)}/${rMatches}`;
                  break;
                case "matches":
                  metricValue = `${rMatches}`;
                  metricSub = `${numOr0(row.wins)} win`;
                  break;
                case "avg3":
                  metricValue = row.avg3 ? Number(row.avg3).toFixed(1) : "0.0";
                  metricSub = `${numOr0(row.matches)} matchs`;
                  break;
                case "favNumber":
                  metricValue = row.favNumber ? `${row.favNumber}` : "—";
                  metricSub = row.favNumberHits ? `${row.favNumberHits} hit(s)` : `${numOr0(row.totalHits)} hit(s)`;
                  break;
                case "favNumberHits":
                  metricValue = row.favNumber ? `#${row.favNumber}` : "—";
                  metricSub = row.favNumberHits ? `${row.favNumberHits} hit(s)` : `${numOr0(row.totalHits)} hit(s)`;
                  break;
                case "favSegmentHits":
                  metricValue = row.favSegment ? `${row.favSegment}` : "—";
                  metricSub = row.favSegmentHits ? `${row.favSegmentHits} hit(s)` : `${numOr0(row.totalHits)} hit(s)`;
                  break;
                default:
                  if (pctMetrics.has(metric)) {
                    metricValue = `${metricRaw.toFixed(1)}%`;
                  } else if (oneDecimalMetrics.has(metric)) {
                    metricValue = `${metricRaw.toFixed(1)}`;
                  } else {
                    metricValue = `${Math.round(metricRaw)}`;
                  }
                  metricSub = `${rMatches} matchs`;
                  break;
              }

              const label = row.name || "—";
              const letter = label?.[0]?.toUpperCase() || "🤖";

              return (
                <div
                  key={row.id || `${label}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: 12,
                    background: rank <= 3 ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
                    border: rank <= 3 ? `1px solid ${theme.primary}55` : `1px solid ${theme.borderSoft}`,
                  }}
                >
                  {/* Rang */}
                  <div style={{ width: 26, textAlign: "center", fontWeight: 900, fontSize: 13, color: rankColor }}>
                    {rank}
                  </div>

                  {/* Avatar + nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        overflow: "hidden",
                        boxShadow: `0 0 8px ${theme.primary}33`,
                        border: `1px solid ${theme.borderSoft}`,
                        background: "#000",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.avatarDataUrl ? (
                        <img
                          src={row.avatarDataUrl}
                          alt={label}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      ) : (
                        <ProfileAvatar size={30} dataUrl={null} label={letter || "🤖"} showStars={false} isBot={true} />
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: theme.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {label}
                    </div>
                  </div>

                  {/* Valeur */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 11 }}>
                    <div style={{ fontWeight: 800, color: theme.primary }}>{metricValue}</div>
                    <div style={{ fontSize: 9.5, color: theme.textSoft }}>{metricSub ?? `${rMatches} matchs`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}