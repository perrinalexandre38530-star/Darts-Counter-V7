// @ts-nocheck
// =============================================================
// src/pages/StatsX01Compare.tsx
// Comparateur X01 (LOCAL / ONLINE / TRAINING X01)
// - Page complète ou embed (compact)
// - Données : History + TrainingX01 localStorage
// - Tableau unique : TRAINING / LOCAL / ONLINE
// - Sparkline (AVG 3 darts) + Camembert (répartition sessions)
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";
import { TrainingStore, type TrainingX01Session } from "../lib/TrainingStore";
import { loadX01SamplesForProfile } from "../lib/x01StatsSource";
import { getX01ProfileStats } from "../lib/statsBridge";
import { computeX01MultiAgg } from "../lib/x01MultiAgg";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ----------------- Types -----------------

type ModeKey = "x01_local" | "x01_online" | "training_x01";
type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "ARV";

type X01Sample = {
  createdAt: number;
  mode: ModeKey;
  profileId: string;
  avg3?: number;
  bestVisit?: number;
  bestCheckout?: number;
  best9Score?: number;
  dartsThrown?: number;
  totalScore?: number;
  legsWon?: number;
  legsLost?: number;
  matchesPlayed?: number;
  matchesWon?: number;

  // HITS détaillés
  hitsTotal?: number;
  hits60?: number;
  hits80?: number;
  hits100?: number;
  hits120?: number;
  hits140?: number;
  hits180?: number;

  miss?: number;
  singleHits?: number;
  doubleHits?: number;
  tripleHits?: number;

  bull25?: number;
  bull50?: number;
  bust?: number;

  coAttempts?: number;
  coSuccess?: number;

  // Classement / type de match issus du bridge x01StatsSource.
  // Utilisé pour aligner X01Compare sur X01 Multi Stats.
  matchId?: string;
  rank?: number | null;
  playerCount?: number;
  isTeam?: boolean;
};

type AggregatedStats = {
  count: number;
  avg3: number | null;
  bestVisit: number | null;
  bestCheckout: number | null;
  best9Score: number | null;
  darts: number;
  legsPlayed: number;
  legsWon: number;
  legsLost: number;
  matchesPlayed: number;
  matchesWon: number;

  hitsTotal: number;
  hits60: number;
  hits80: number;
  hits100: number;
  hits120: number;
  hits140: number;
  hits180: number;

  miss: number;
  singleHits: number;
  doubleHits: number;
  tripleHits: number;

  bull25: number;
  bull50: number;
  bust: number;

  coAttempts: number;
  coSuccess: number;

  matchDuo: number;
  winDuo: number;
  matchMulti: number;
  winMulti: number;
  podiumMulti: number;
  finishMulti: number;
  matchTeam: number;
  winTeam: number;
};

type Props = {
  store: Store;
  go?: (tab: any, params?: any) => void;
  profileId?: string | null;
  compact?: boolean;
};

// ---------- Training X01 (localStorage) ----------

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

type TrainingX01SessionLite = {
  id: string;
  date: number;
  profileId?: string;
  darts: number;
  avg3D: number;
  bestVisit: number;
  bestCheckout: number | null;
  best9Score?: number | null;
  hitsS?: number;
  hitsD?: number;
  hitsT?: number;
  miss?: number;
  bull?: number;
  dBull?: number;
  bust?: number;
  coAttempts?: number;
  coSuccess?: number;
  bySegmentS?: Record<string, number>;
  bySegmentD?: Record<string, number>;
  bySegmentT?: Record<string, number>;
  dartsDetail?: any[];
};

function normalizeLegacyTrainingSession(row: any, idx: number): TrainingX01SessionLite {
  return {
    id: row?.id ?? `legacy-${Number(row?.date) || Date.now()}-${idx}`,
    date: Number(row?.date) || Date.now(),
    profileId:
      row?.profileId !== undefined && row?.profileId !== null && String(row.profileId).trim() !== ""
        ? String(row.profileId)
        : undefined,
    darts: Number(row?.darts) || 0,
    avg3D: Number(row?.avg3D) || 0,
    bestVisit: Number(row?.bestVisit) || 0,
    bestCheckout:
      row?.bestCheckout === null || row?.bestCheckout === undefined
        ? row?.checkout === null || row?.checkout === undefined
          ? null
          : Number(row.checkout) || 0
        : Number(row.bestCheckout) || 0,
    best9Score: Number(row?.best9Score) || 0,
    hitsS: Number(row?.hitsS) || 0,
    hitsD: Number(row?.hitsD) || 0,
    hitsT: Number(row?.hitsT) || 0,
    miss: Number(row?.miss) || 0,
    bull: Number(row?.bull) || 0,
    dBull: Number(row?.dBull) || 0,
    bust: Number(row?.bust) || 0,
    coAttempts: Number(row?.coAttempts) || 0,
    coSuccess: Number(row?.coSuccess) || 0,
    bySegmentS: row?.bySegmentS && typeof row.bySegmentS === "object" ? row.bySegmentS : undefined,
    bySegmentD: row?.bySegmentD && typeof row.bySegmentD === "object" ? row.bySegmentD : undefined,
    bySegmentT: row?.bySegmentT && typeof row.bySegmentT === "object" ? row.bySegmentT : undefined,
    dartsDetail: Array.isArray(row?.dartsDetail) ? row.dartsDetail : undefined,
  };
}

function loadTrainingSessionsForProfile(
  profileId: string | null
): TrainingX01SessionLite[] {
  if (typeof window === "undefined" || !profileId) return [];
  try {
    const exact: TrainingX01SessionLite[] = [];
    const legacyFallback: TrainingX01SessionLite[] = [];

    const fullSessions = (TrainingStore.getAllX01Sessions?.() || []) as TrainingX01Session[];
    for (const row of fullSessions) {
      const normalized = normalizeLegacyTrainingSession(row, exact.length);
      if (normalized.profileId === profileId) exact.push(normalized);
    }

    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      parsed.forEach((row: any, idx: number) => {
        const normalized = normalizeLegacyTrainingSession(row, idx);
        const pid = normalized.profileId;
        if (pid === profileId) exact.push(normalized);
        else if (!pid || pid === "local" || pid === "unknown") legacyFallback.push(normalized);
      });
    }

    const dedup = new Map<string, TrainingX01SessionLite>();
    for (const item of exact) {
      dedup.set(String(item.id || `${item.date}-${item.darts}`), item);
    }

    const base = dedup.size > 0 ? Array.from(dedup.values()) : legacyFallback;
    return base.sort((a, b) => a.date - b.date);
  } catch (e) {
    console.warn("[StatsX01Compare] loadTrainingSessions failed", e);
    return [];
  }
}

function countThresholdHitsFromSession(
  s: Pick<TrainingX01SessionLite, "dartsDetail" | "darts" | "bestVisit">,
  threshold: number,
): number {
  if (Array.isArray(s.dartsDetail) && s.dartsDetail.length > 0) {
    let count = 0;
    for (let i = 0; i < s.dartsDetail.length; i += 3) {
      const visit = s.dartsDetail.slice(i, i + 3);
      const total = visit.reduce((sum, d: any) => {
        const v = Number(d?.v) || 0;
        const mult = Number(d?.mult) || 1;
        if (v === 25 && mult === 2) return sum + 50;
        if (v === 25) return sum + 25;
        return sum + v * mult;
      }, 0);
      if (total >= threshold) count += 1;
    }
    return count;
  }
  if (threshold <= 0 && s.bestVisit) return 1;
  if (threshold > 0 && Number(s.bestVisit || 0) >= threshold) return 1;
  return 0;
}
// ----------------- Helpers génériques -----------------

const N = (x: any, d = 0) =>
  Number.isFinite(Number(x)) ? Number(x) : d;

const pickNum = (...vals: any[]): number | undefined => {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
};

// scan récursif pour trouver un nombre dont la clé contient un mot-clé
function findNumberDeep(obj: any, keyParts: string[], seen?: WeakSet<object>): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const guard = seen || new WeakSet<object>();
  if (guard.has(obj as object)) return undefined;
  guard.add(obj as object);

  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number") {
      const key = k.toLowerCase();
      if (keyParts.some((p) => key.includes(p))) {
        return v;
      }
    } else if (v && typeof v === "object") {
      const nested = findNumberDeep(v, keyParts, guard);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

// ----------------- Helpers période -----------------

function getPeriodRange(
  key: PeriodKey
): { from?: number; to?: number; archivesOnly?: boolean } {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = todayStart.getTime();

  switch (key) {
    case "D":
      return { from: today, to: now };
    case "W":
      return { from: today - 7 * oneDay, to: now };
    case "M":
      return { from: today - 30 * oneDay, to: now };
    case "Y":
      return { from: today - 365 * oneDay, to: now };
    case "ALL":
      return { from: undefined, to: undefined };
    case "ARV":
      return { from: undefined, to: today - 365 * oneDay, archivesOnly: true };
    default:
      return { from: undefined, to: undefined };
  }
}

// ----------------- Aggregation globale -----------------

function aggregateSamples(samples: X01Sample[]): AggregatedStats {
  if (!samples.length) {
    return {
      count: 0,
      avg3: null,
      bestVisit: null,
      bestCheckout: null,
      best9Score: null,
      darts: 0,
      legsPlayed: 0,
      legsWon: 0,
      legsLost: 0,
      matchesPlayed: 0,
      matchesWon: 0,

      hitsTotal: 0,
      hits60: 0,
      hits80: 0,
      hits100: 0,
      hits120: 0,
      hits140: 0,
      hits180: 0,

      miss: 0,
      singleHits: 0,
      doubleHits: 0,
      tripleHits: 0,

      bull25: 0,
      bull50: 0,
      bust: 0,

      coAttempts: 0,
      coSuccess: 0,

      matchDuo: 0,
      winDuo: 0,
      matchMulti: 0,
      winMulti: 0,
      podiumMulti: 0,
      finishMulti: 0,
      matchTeam: 0,
      winTeam: 0,
    };
  }

  let sumAvg3 = 0;
  let countAvg3 = 0;
  let totalScoreForAvg = 0;
  let dartsForAvg = 0;
  let bestVisit: number | null = null;
  let bestCheckout: number | null = null;
  let best9Score: number | null = null;

  let darts = 0;
  let legsWon = 0;
  let legsLost = 0;
  let matchesPlayed = 0;
  let matchesWon = 0;

  let hitsTotal = 0;
  let hits60 = 0;
  let hits80 = 0;
  let hits100 = 0;
  let hits120 = 0;
  let hits140 = 0;
  let hits180 = 0;

  let miss = 0;
  let singleHits = 0;
  let doubleHits = 0;
  let tripleHits = 0;

  let bull25 = 0;
  let bull50 = 0;
  let bust = 0;

  let coAttempts = 0;
  let coSuccess = 0;

  let matchDuo = 0;
  let winDuo = 0;
  let matchMulti = 0;
  let winMulti = 0;
  let podiumMulti = 0;
  let finishMulti = 0;
  let matchTeam = 0;
  let winTeam = 0;

  for (const s of samples) {
    if (typeof s.avg3 === "number") {
      sumAvg3 += s.avg3;
      countAvg3++;
    }
    const sampleDarts = Number(s.dartsThrown || 0);
    const sampleScore = Number((s as any).totalScore || 0);
    if (sampleDarts > 0 && sampleScore > 0) {
      dartsForAvg += sampleDarts;
      totalScoreForAvg += sampleScore;
    }
    if (typeof s.bestVisit === "number") {
      bestVisit =
        bestVisit == null ? s.bestVisit : Math.max(bestVisit, s.bestVisit);
    }
    if (typeof s.bestCheckout === "number") {
      bestCheckout =
        bestCheckout == null
          ? s.bestCheckout
          : Math.max(bestCheckout, s.bestCheckout);
    }
    if (typeof s.best9Score === "number") {
      best9Score =
        best9Score == null ? s.best9Score : Math.max(best9Score, s.best9Score);
    }

    if (typeof s.dartsThrown === "number") darts += s.dartsThrown;
    if (typeof s.legsWon === "number") legsWon += s.legsWon;
    if (typeof s.legsLost === "number") legsLost += s.legsLost;
    if (typeof s.matchesPlayed === "number") matchesPlayed += s.matchesPlayed;
    if (typeof s.matchesWon === "number") matchesWon += s.matchesWon;

    if (typeof s.hitsTotal === "number") hitsTotal += s.hitsTotal;
    if (typeof s.hits60 === "number") hits60 += s.hits60;
    if (typeof s.hits80 === "number") hits80 += s.hits80;
    if (typeof s.hits100 === "number") hits100 += s.hits100;
    if (typeof s.hits120 === "number") hits120 += s.hits120;
    if (typeof s.hits140 === "number") hits140 += s.hits140;
    if (typeof s.hits180 === "number") hits180 += s.hits180;

    if (typeof s.miss === "number") miss += s.miss;
    if (typeof s.singleHits === "number") singleHits += s.singleHits;
    if (typeof s.doubleHits === "number") doubleHits += s.doubleHits;
    if (typeof s.tripleHits === "number") tripleHits += s.tripleHits;

    if (typeof s.bull25 === "number") bull25 += s.bull25;
    if (typeof s.bull50 === "number") bull50 += s.bull50;
    if (typeof s.bust === "number") bust += s.bust;

    if (typeof s.coAttempts === "number") coAttempts += s.coAttempts;
    if (typeof s.coSuccess === "number") coSuccess += s.coSuccess;

    if (typeof (s as any).matchDuo === "number") matchDuo += (s as any).matchDuo;
    if (typeof (s as any).winDuo === "number") winDuo += (s as any).winDuo;
    if (typeof (s as any).matchMulti === "number") matchMulti += (s as any).matchMulti;
    if (typeof (s as any).winMulti === "number") winMulti += (s as any).winMulti;
    if (typeof (s as any).podiumMulti === "number") podiumMulti += (s as any).podiumMulti;
    if (typeof (s as any).finishMulti === "number") finishMulti += (s as any).finishMulti;
    if (typeof (s as any).matchTeam === "number") matchTeam += (s as any).matchTeam;
    if (typeof (s as any).winTeam === "number") winTeam += (s as any).winTeam;
  }

  const legsPlayed = legsWon + legsLost;

  return {
    count: samples.length,
    avg3: countAvg3 ? sumAvg3 / countAvg3 : (dartsForAvg > 0 ? (totalScoreForAvg / dartsForAvg) * 3 : null),
    bestVisit,
    bestCheckout,
    best9Score,
    darts,
    legsPlayed,
    legsWon,
    legsLost,
    matchesPlayed,
    matchesWon,

    hitsTotal,
    hits60,
    hits80,
    hits100,
    hits120,
    hits140,
    hits180,

    miss,
    singleHits,
    doubleHits,
    tripleHits,

    bull25,
    bull50,
    bust,

    coAttempts,
    coSuccess,

    matchDuo,
    winDuo,
    matchMulti,
    winMulti,
    podiumMulti,
    finishMulti,
    matchTeam,
    winTeam,
  };
}


function periodToBridgeRange(key: PeriodKey): "today" | "week" | "month" | "year" | "all" | "archives" {
  switch (key) {
    case "D":
      return "today";
    case "W":
      return "week";
    case "M":
      return "month";
    case "Y":
      return "year";
    case "ARV":
      return "archives";
    case "ALL":
    default:
      return "all";
  }
}

function bridgeX01ToAggregatedStats(bridge: any, fallback: AggregatedStats): AggregatedStats {
  if (!bridge) return fallback;

  const games = Number(bridge.games || 0);
  const wins = Number(bridge.wins || 0);
  const darts = Number(bridge.darts || 0);
  const avg3 = Number(bridge.avg3 || 0);

  return {
    ...fallback,
    count: games || fallback.count,
    matchesPlayed: games || fallback.matchesPlayed,
    matchesWon: wins || fallback.matchesWon,
    darts: darts || fallback.darts,
    avg3: avg3 || fallback.avg3,
    bestVisit: Number(bridge.bestVisit || 0) || fallback.bestVisit,
    bestCheckout: Number(bridge.bestCheckout || bridge.bestFinish || 0) || fallback.bestCheckout,
    hits60: Number(bridge.h60 || 0) || fallback.hits60,
    hits100: Number(bridge.h100 || 0) || fallback.hits100,
    hits140: Number(bridge.h140 || 0) || fallback.hits140,
    hits180: Number(bridge.h180 || 0) || fallback.hits180,
    miss: Number(bridge.miss || 0) || fallback.miss,
    doubleHits: Number(bridge.doubles || 0) || fallback.doubleHits,
    tripleHits: Number(bridge.triples || 0) || fallback.tripleHits,
    bull25: Number(bridge.bulls || 0) || fallback.bull25,
    bull50: Number(bridge.dbull || 0) || fallback.bull50,
    bust: Number(bridge.bust || 0) || fallback.bust,
  };
}

function applyX01MultiAggToAggregatedStats(x01Agg: any, fallback: AggregatedStats): AggregatedStats {
  const sessions = Number(x01Agg?.sessions || 0) || 0;
  if (!sessions) return fallback;

  const sumAvg3D = Number(x01Agg?.sumAvg3D || 0) || 0;
  const darts = Number(x01Agg?.darts || 0) || 0;
  const scoreTotal = Number(x01Agg?.scoreTotal || 0) || 0;

  return {
    ...fallback,
    count: sessions,
    matchesPlayed: sessions,
    avg3: sumAvg3D > 0
      ? sumAvg3D / sessions
      : darts > 0 && scoreTotal > 0
        ? (scoreTotal / darts) * 3
        : fallback.avg3,
    bestVisit: Number(x01Agg?.bestVisit || 0) || fallback.bestVisit,
    bestCheckout: Number(x01Agg?.bestCheckout || 0) || fallback.bestCheckout,
    best9Score: Number(x01Agg?.best9Score || 0) || fallback.best9Score,
    darts: darts || fallback.darts,
    legsWon: Number(x01Agg?.legsWin || 0) || fallback.legsWon,
    singleHits: Number(x01Agg?.hitsSingle || 0) || fallback.singleHits,
    doubleHits: Number(x01Agg?.hitsDouble || 0) || fallback.doubleHits,
    tripleHits: Number(x01Agg?.hitsTriple || 0) || fallback.tripleHits,
    bull25: Number(x01Agg?.hitsBull || 0) || fallback.bull25,
    bull50: Number(x01Agg?.hitsDBull || 0) || fallback.bull50,
    miss: Number(x01Agg?.miss || 0) || fallback.miss,
    bust: Number(x01Agg?.bust || 0) || fallback.bust,
    hitsTotal:
      (Number(x01Agg?.hitsSingle || 0) || 0) +
      (Number(x01Agg?.hitsDouble || 0) || 0) +
      (Number(x01Agg?.hitsTriple || 0) || 0) +
      (Number(x01Agg?.hitsBull || 0) || 0) +
      (Number(x01Agg?.hitsDBull || 0) || 0) || fallback.hitsTotal,
    hits50: undefined as any,
    hits60: Number(x01Agg?.visitBuckets?.["60+"] || 0) || fallback.hits60,
    hits80: Number(x01Agg?.visitBuckets?.["80+"] || 0) || fallback.hits80,
    hits100: Number(x01Agg?.visitBuckets?.["100+"] || 0) || fallback.hits100,
    hits120: Number(x01Agg?.visitBuckets?.["120+"] || 0) || fallback.hits120,
    hits140: Number(x01Agg?.visitBuckets?.["140+"] || 0) || fallback.hits140,
    hits180: Number(x01Agg?.visitBuckets?.["180"] || 0) || fallback.hits180,
    coAttempts: Number(x01Agg?.checkoutAttempts || 0) || fallback.coAttempts,
    coSuccess: Number(x01Agg?.checkoutHits || 0) || fallback.coSuccess,
  };
}

async function loadFullFinishedHistoryRowsForX01Compare(): Promise<any[]> {
  try {
    const api: any = History as any;
    const lightRows =
      (typeof api?.listFinished === "function" ? await api.listFinished() : null) ??
      (typeof api?.list === "function" ? await api.list() : []);
    const ids = Array.from(new Set((Array.isArray(lightRows) ? lightRows : [])
      .map((r: any) => String(r?.matchId ?? r?.id ?? "").trim())
      .filter(Boolean)));
    const fullRows = await Promise.all(ids.slice(0, 600).map((id) => api.get(id).catch(() => null)));
    return fullRows.filter(Boolean);
  } catch {
    return [];
  }
}

function findX01CandidateIdByName(rows: any[], playerName?: string | null): string | null {
  const target = String(playerName || "").toLowerCase().trim();
  if (!target) return null;
  for (const r of rows || []) {
    const session = r?.payload?.session || r?.payload || r;
    const players = session?.players || session?.session?.players || r?.players || r?.summary?.players || [];
    const found = (Array.isArray(players) ? players : []).find((pl: any) =>
      String(pl?.name ?? pl?.public_name ?? pl?.displayName ?? "").toLowerCase().trim() === target
    );
    if (found?.id || found?.playerId || found?.profileId) return String(found.id || found.playerId || found.profileId);
  }
  return null;
}


type X01CompareMatchBreakdown = Pick<AggregatedStats,
  "matchDuo" | "winDuo" | "matchMulti" | "winMulti" | "podiumMulti" | "finishMulti" | "matchTeam" | "winTeam"
>;

const emptyX01CompareMatchBreakdown = (): X01CompareMatchBreakdown => ({
  matchDuo: 0,
  winDuo: 0,
  matchMulti: 0,
  winMulti: 0,
  podiumMulti: 0,
  finishMulti: 0,
  matchTeam: 0,
  winTeam: 0,
});

function normX01CompareText(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function sameX01CompareId(a: any, b: any): boolean {
  const aa = String(a ?? "").replace(/^online:/, "").trim();
  const bb = String(b ?? "").replace(/^online:/, "").trim();
  if (!aa || !bb) return false;
  return aa === bb || (aa.length >= 12 && bb.length >= 12 && (aa.startsWith(bb) || bb.startsWith(aa)));
}

function deepX01CompareObjects(root: any, maxDepth = 7): any[] {
  const out: any[] = [];
  const seen = new WeakSet<object>();
  const walk = (x: any, depth: number) => {
    if (!x || typeof x !== "object" || depth > maxDepth) return;
    if (seen.has(x)) return;
    seen.add(x);
    if (!Array.isArray(x)) out.push(x);
    if (Array.isArray(x)) {
      for (const it of x) walk(it, depth + 1);
      return;
    }
    for (const v of Object.values(x)) {
      if (v && typeof v === "object") walk(v, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

function x01CompareRowMatches(row: any, profileId: string, playerName?: string | null): boolean {
  const ids = [
    row?.id, row?.playerId, row?.profileId, row?.selectedPlayerId, row?.pid, row?.uid,
    row?.sourceId, row?.sourcePlayerId, row?.userId,
  ].filter((v) => v !== undefined && v !== null).map((v) => String(v));
  if (ids.some((id) => sameX01CompareId(id, profileId) || id === profileId)) return true;
  const n1 = normX01CompareText(row?.name ?? row?.playerName ?? row?.displayName ?? row?.nickname ?? "");
  const n2 = normX01CompareText(playerName ?? "");
  return !!n1 && !!n2 && n1 === n2;
}

function collectX01CompareRankingRows(rec: any): any[] {
  const rows: any[] = [];
  const arrayKeys = new Set([
    "rankings", "ranking", "standings", "leaderboard", "playersRanking", "finalRanking",
    "results", "perPlayer", "players",
  ]);
  const mapKeys = new Set([
    "detailedByPlayer", "statsByPlayer", "liveStatsByPlayer", "finalStatsByPlayer",
    "resultsByPlayer", "rankingByPlayer", "standingsByPlayer",
  ]);

  for (const root of deepX01CompareObjects(rec, 7)) {
    for (const [key, value] of Object.entries(root)) {
      if (arrayKeys.has(String(key)) && Array.isArray(value)) {
        for (const row of value as any[]) {
          if (row && typeof row === "object") rows.push(row);
        }
      }
      if (mapKeys.has(String(key)) && value && typeof value === "object" && !Array.isArray(value)) {
        for (const [id, row] of Object.entries(value as any)) {
          if (row && typeof row === "object") rows.push({ id, playerId: id, selectedPlayerId: id, ...(row as any) });
        }
      }
    }
  }

  const richness = (row: any): number => {
    if (!row || typeof row !== "object") return 0;
    let score = 0;
    for (const k of [
      "rank", "finalRank", "place", "position", "standing",
      "remaining", "remainingScore", "scoreLeft", "left", "rest", "finalScore", "endScore", "pointsLeft",
      "isWin", "win", "winner", "isWinner", "finished", "hasFinished", "didFinish",
      "setsWon", "legsWon", "score", "total",
    ]) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v) !== "") score += 3;
    }
    score += Object.values(row).filter((v: any) => Number.isFinite(Number(v))).length;
    return score;
  };

  const keyFor = (row: any) => String(
    row?.id ?? row?.playerId ?? row?.profileId ?? row?.selectedPlayerId ?? row?.pid ?? row?.uid ??
    row?.name ?? row?.playerName ?? JSON.stringify(row)
  );

  const best = new Map<string, any>();
  for (const row of rows) {
    const k = keyFor(row);
    const prev = best.get(k);
    if (!prev || richness(row) > richness(prev)) best.set(k, row);
  }
  return Array.from(best.values());
}

function getX01CompareExplicitRank(row: any): number {
  const raw = row?.rank ?? row?.finalRank ?? row?.position ?? row?.place ?? row?.standing;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getX01CompareRemaining(row: any): number | null {
  const vals = [
    row?.remaining, row?.remainingScore, row?.scoreLeft, row?.left, row?.rest,
    row?.finalScore, row?.endScore, row?.pointsLeft,
  ];
  for (const v of vals) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}


function collectX01CompareRecordValues(rec: any): string[] {
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const summary = rec?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const cfg = rec?.config ?? payload?.config ?? nested?.config ?? null;
  return [
    rec?.kind, rec?.mode, rec?.variant, rec?.game, rec?.source, rec?.scope, rec?.origin,
    payload?.kind, payload?.mode, payload?.variant, payload?.game, payload?.gameMode, payload?.source, payload?.scope, payload?.origin,
    nested?.kind, nested?.mode, nested?.variant, nested?.game, nested?.gameMode,
    summary?.kind, summary?.mode, summary?.variant, summary?.game?.mode,
    cfg?.kind, cfg?.mode, cfg?.variant, cfg?.gameMode,
  ].map(normX01CompareText).filter(Boolean);
}

function isX01CompareRecord(rec: any): boolean {
  return collectX01CompareRecordValues(rec).some((v) => v === "x01" || v === "x01v3" || v.includes("x01"));
}

function isX01CompareOnlineRecord(rec: any): boolean {
  const vals = collectX01CompareRecordValues(rec);
  if (vals.some((v) => v.includes("online") || v.includes("remote") || v.includes("lobby") || v.includes("network"))) return true;
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  return !!(
    rec?.online || rec?.isOnline || rec?.lobbyId || rec?.roomCode || rec?.onlineMatchId ||
    payload?.online || payload?.isOnline || payload?.lobbyId || payload?.roomCode || payload?.onlineMatchId ||
    nested?.online || nested?.isOnline || nested?.lobbyId || nested?.roomCode || nested?.onlineMatchId
  );
}

function getX01CompareTimestamp(rec: any): number {
  return Number(
    rec?.createdAt ?? rec?.created_at ?? rec?.date ?? rec?.ts ??
    rec?.payload?.createdAt ?? rec?.payload?.date ?? rec?.payload?.ts ??
    rec?.summary?.createdAt ?? rec?.summary?.date ?? 0
  ) || 0;
}

function getX01ComparePlayers(rec: any): any[] {
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const summary = rec?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const cfg = rec?.config ?? payload?.config ?? nested?.config ?? null;
  const candidates = [
    rec?.players, rec?.rankings, rec?.results, rec?.standings,
    rec?.summary?.players, rec?.summary?.rankings, summary?.players, summary?.rankings, summary?.results, summary?.standings,
    payload?.players, payload?.rankings, payload?.results, payload?.standings,
    payload?.config?.players, payload?.summary?.players, payload?.summary?.rankings, payload?.summary?.results,
    nested?.players, nested?.rankings, nested?.results, nested?.standings,
    nested?.config?.players, nested?.summary?.players, nested?.summary?.rankings, nested?.summary?.results,
    cfg?.players,
  ];
  for (const c of candidates) if (Array.isArray(c) && c.length) return c;
  return [];
}

function getX01ComparePlayerRank(rec: any, player: any, players: any[], profileId: string, playerName?: string | null, isWin = false): number {
  const direct = getX01CompareExplicitRank(player);
  if (direct > 0) return direct;

  const rankingRows = collectX01CompareRankingRows(rec);
  const richRow = rankingRows.find((row) => x01CompareRowMatches(row, profileId, playerName));
  const rowRank = getX01CompareExplicitRank(richRow);
  if (rowRank > 0) return rowRank;

  if (isWin) return 1;

  // Fallback uniquement si on dispose de scores restants exploitables.
  // On ne déduit JAMAIS le rang depuis l'ordre du tableau players/config :
  // l'historique remet souvent le profil courant en premier, ce qui créait
  // de faux podiums pour tous les matchs multi.
  const rows = rankingRows.length ? rankingRows : players;
  const scored = rows
    .map((row: any) => ({
      row,
      remaining: getX01CompareRemaining(row),
      win: x01CompareIsPlayerWinner(rec, row),
    }))
    .filter((r: any) => r.remaining !== null || r.win);

  if (scored.length >= 2) {
    const sorted = scored.sort((a: any, b: any) => {
      const aw = a.win ? 0 : 1;
      const bw = b.win ? 0 : 1;
      if (aw !== bw) return aw - bw;
      const ar = a.remaining === null ? 999999 : a.remaining;
      const br = b.remaining === null ? 999999 : b.remaining;
      return ar - br;
    });
    const idx = sorted.findIndex((r: any) => x01CompareRowMatches(r.row, profileId, playerName));
    if (idx >= 0) return idx + 1;
  }

  return 0;
}

function x01ComparePlayerFinished(player: any, isWin: boolean, rank = 0, playersCount = 0): boolean {
  const explicit = [
    player?.finished, player?.isFinished, player?.hasFinished, player?.checkout, player?.checkedOut,
    player?.finish, player?.didFinish, player?.completed, player?.isOut, player?.out,
  ].find((v) => v !== undefined && v !== null);
  if (explicit !== undefined) return !!explicit;

  const remaining = getX01CompareRemaining(player);
  if (remaining === 0) return true;

  // Règle X01 Multi validée : si la partie a continué après le premier checkout,
  // tous les joueurs sauf le dernier ont fini à 0. Donc finish = rang < nombre de joueurs.
  if (playersCount >= 3 && rank > 0) return rank < playersCount;

  return !!isWin;
}

function getX01ComparePlayerIds(pl: any): string[] {
  return [pl?.id, pl?.playerId, pl?.profileId, pl?.selectedPlayerId, pl?.sourceId, pl?.sourcePlayerId, pl?.userId, pl?.uid]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v).replace(/^online:/, "").trim())
    .filter(Boolean);
}

function getX01ComparePlayerName(pl: any): string {
  return normX01CompareText(pl?.name ?? pl?.playerName ?? pl?.public_name ?? pl?.displayName ?? pl?.nickname ?? "");
}

function x01ComparePlayerMatches(pl: any, profileId: string, playerName?: string | null): boolean {
  const ids = getX01ComparePlayerIds(pl);
  if (ids.some((id) => sameX01CompareId(id, profileId))) return true;
  const pn = normX01CompareText(playerName);
  return !!pn && getX01ComparePlayerName(pl) === pn;
}

function getX01CompareWinnerIds(rec: any): string[] {
  const payload = rec?.payload ?? null;
  const nested = payload?.payload ?? null;
  const summary = rec?.summary ?? payload?.summary ?? nested?.summary ?? null;
  const vals = [
    rec?.winnerId, rec?.winner, rec?.winnerProfileId, rec?.winnerPlayerId,
    payload?.winnerId, payload?.winner, payload?.winnerProfileId, payload?.winnerPlayerId,
    nested?.winnerId, nested?.winner, nested?.winnerProfileId, nested?.winnerPlayerId,
    summary?.winnerId, summary?.winner, summary?.winnerProfileId, summary?.winnerPlayerId,
  ];
  return vals.filter((v) => v !== undefined && v !== null).map((v) => String(v).replace(/^online:/, "").trim()).filter(Boolean);
}

function x01CompareIsPlayerWinner(rec: any, player: any): boolean {
  const explicit = [player?.isWin, player?.win, player?.winner, player?.isWinner].find((v) => v !== undefined);
  if (explicit !== undefined) return !!explicit;
  const rank = Number(player?.rank ?? player?.position ?? player?.place ?? 0) || 0;
  if (rank === 1) return true;
  const wins = getX01CompareWinnerIds(rec);
  if (!wins.length) return false;
  const ids = getX01ComparePlayerIds(player);
  return wins.some((w) => ids.some((id) => sameX01CompareId(w, id)));
}

function x01CompareIsTeamMatch(rec: any, players: any[], player: any): boolean {
  const vals = collectX01CompareRecordValues(rec);
  if (vals.some((v) => v.includes("team") || v.includes("equipe") || v.includes("teams"))) return true;
  return players.some((p) => p?.teamId || p?.team || p?.teamName) || !!(player?.teamId || player?.team || player?.teamName);
}

function computeX01CompareMatchBreakdown(rows: any[], profileId: string, playerName?: string | null, scope: "local" | "online" = "local", range?: { from?: number; to?: number; archivesOnly?: boolean }): X01CompareMatchBreakdown {
  const out = emptyX01CompareMatchBreakdown();
  const seen = new Set<string>();
  for (const rec of rows || []) {
    if (!isX01CompareRecord(rec)) continue;
    const online = isX01CompareOnlineRecord(rec);
    if (scope === "online" ? !online : online) continue;
    const ts = getX01CompareTimestamp(rec);
    if (range?.archivesOnly) {
      if (typeof range.to === "number" && ts && ts >= range.to) continue;
    } else {
      if (typeof range?.from === "number" && ts && ts < range.from) continue;
      if (typeof range?.to === "number" && ts && ts > range.to) continue;
    }

    const id = String(rec?.matchId ?? rec?.id ?? rec?.payload?.matchId ?? rec?.payload?.id ?? `${ts}-${JSON.stringify(getX01CompareWinnerIds(rec))}`).trim();
    if (id && seen.has(id)) continue;

    const players = getX01ComparePlayers(rec);
    if (!players.length) continue;
    const player = players.find((pl) => x01ComparePlayerMatches(pl, profileId, playerName));
    if (!player) continue;
    if (id) seen.add(id);

    const isTeam = x01CompareIsTeamMatch(rec, players, player);
    const kind = isTeam ? "team" : players.length <= 2 ? "duo" : "multi";
    const isWin = x01CompareIsPlayerWinner(rec, player);
    const rank = getX01ComparePlayerRank(rec, player, players, profileId, playerName, isWin);
    const didFinish = x01ComparePlayerFinished(player, isWin, rank, players.length);

    if (kind === "duo") {
      out.matchDuo += 1;
      if (isWin) out.winDuo += 1;
    } else if (kind === "multi") {
      out.matchMulti += 1;
      if (isWin) out.winMulti += 1;
      if (rank > 0 && rank <= 3) out.podiumMulti += 1;
      if (didFinish) out.finishMulti += 1;
    } else {
      out.matchTeam += 1;
      if (isWin) out.winTeam += 1;
    }
  }
  return out;
}


function computeX01CompareMatchBreakdownFromSamples(samples: X01Sample[]): X01CompareMatchBreakdown {
  const out = emptyX01CompareMatchBreakdown();
  const seen = new Set<string>();

  for (const s of samples || []) {
    const id = String((s as any).matchId || `${s.createdAt}-${s.mode}-${s.profileId}`).trim();
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);

    const playerCount = Number((s as any).playerCount || 0) || 0;
    const rankRaw = Number((s as any).rank || 0) || 0;
    const rank = rankRaw > 0 ? rankRaw : 0;
    const isTeam = !!(s as any).isTeam;

    if (isTeam) {
      const wonTeam = rank === 1 || Number(s.matchesWon || 0) > 0;
      out.matchTeam += 1;
      if (wonTeam) out.winTeam += 1;
      continue;
    }

    if (playerCount >= 3) {
      out.matchMulti += 1;

      // IMPORTANT :
      // En X01 MULTI, matchesWon dans les vieux samples n'est pas fiable :
      // il peut valoir 1 pour chaque ligne joueur et transformait donc
      // 9 matchs multi en 9 victoires / 9 podiums.
      // La source fiable pour les classements est le rang réel :
      // - victoire multi = rang 1
      // - podium multi = rang 1 + rang 2 + rang 3
      // - finish multi = joueur terminé avant le dernier => rang < nb joueurs
      if (rank === 1) out.winMulti += 1;
      if (rank >= 1 && rank <= 3) out.podiumMulti += 1;
      if (rank >= 1 && rank < playerCount) out.finishMulti += 1;
      continue;
    }

    // Les samples ONLINE anciens n'ont pas toujours playerCount renseigné : X01 online = duel.
    const wonDuo = rank === 1 || Number(s.matchesWon || 0) > 0;
    out.matchDuo += 1;
    if (wonDuo) out.winDuo += 1;
  }

  return out;
}

function hasX01CompareMatchBreakdownValues(v: X01CompareMatchBreakdown | null | undefined): boolean {
  return !!v && !!(v.matchDuo || v.winDuo || v.matchMulti || v.winMulti || v.podiumMulti || v.finishMulti || v.matchTeam || v.winTeam);
}

function mergeX01CompareMatchBreakdown(stats: AggregatedStats, match: X01CompareMatchBreakdown): AggregatedStats {
  return { ...stats, ...match };
}


// ----------------- Formatters -----------------

function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(decimals);
}

function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return String(Math.round(Number(v)));
}

// ----------------- Sparkline helpers -----------------

type FilteredBuckets = {
  local: X01Sample[];
  online: X01Sample[];
  training: X01Sample[];
};

type SparkPoint = {
  key: string;
  label: string;
  local?: number;
  online?: number;
  training?: number;
};

function buildSparkData(filtered: FilteredBuckets): SparkPoint[] {
  const dayMapLocal: Record<string, { sum: number; count: number; score: number; darts: number }> = {};
  const dayMapOnline: Record<string, { sum: number; count: number; score: number; darts: number }> = {};
  const dayMapTraining: Record<string, { sum: number; count: number; score: number; darts: number }> = {};

  const pushSample = (
    s: X01Sample,
    map: Record<string, { sum: number; count: number; score: number; darts: number }>
  ) => {
    if (typeof s.avg3 !== "number") return;
    const d = new Date(s.createdAt);
    const key = d.toISOString().slice(0, 10);
    if (!map[key]) map[key] = { sum: 0, count: 0, score: 0, darts: 0 };
    map[key].sum += s.avg3;
    map[key].count += 1;
    const sd = Number(s.dartsThrown || 0);
    const ss = Number((s as any).totalScore || 0);
    if (sd > 0 && ss > 0) {
      map[key].darts += sd;
      map[key].score += ss;
    }
  };

  filtered.local.forEach((s) => pushSample(s, dayMapLocal));
  filtered.online.forEach((s) => pushSample(s, dayMapOnline));
  filtered.training.forEach((s) => pushSample(s, dayMapTraining));

  const allKeys = Array.from(
    new Set([
      ...Object.keys(dayMapLocal),
      ...Object.keys(dayMapOnline),
      ...Object.keys(dayMapTraining),
    ])
  ).sort();

  return allKeys.map((key) => {
    const [year, month, day] = key.split("-");
    const label = `${day}/${month}`;

    const lp = dayMapLocal[key];
    const op = dayMapOnline[key];
    const tp = dayMapTraining[key];

    return {
      key,
      label,
      local: lp ? (lp.count > 0 ? lp.sum / lp.count : (lp.darts > 0 && lp.score > 0 ? (lp.score / lp.darts) * 3 : undefined)) : undefined,
      online: op ? (op.count > 0 ? op.sum / op.count : (op.darts > 0 && op.score > 0 ? (op.score / op.darts) * 3 : undefined)) : undefined,
      training: tp ? (tp.count > 0 ? tp.sum / tp.count : (tp.darts > 0 && tp.score > 0 ? (tp.score / tp.darts) * 3 : undefined)) : undefined,
    };
  });
}

// ----------------- Tableau config -----------------

type RowDef = {
  section: "RECORDS" | "HITS" | "MATCHES";
  label: string;
  kind: "int" | "num1" | "num2" | "pct";
  get: (s: AggregatedStats) => number | null | undefined;
};

const ROWS: RowDef[] = [
  // RECORDS
  { section: "RECORDS", label: "Sessions / Matchs", kind: "int", get: (s) => s.count },
  { section: "RECORDS", label: "Victoires", kind: "int", get: (s) => s.matchesWon },
  {
    section: "RECORDS",
    label: "Win %",
    kind: "pct",
    get: (s) => {
      const den = s.matchesPlayed || s.count || 0;
      if (!den) return null;
      return (s.matchesWon / den) * 100;
    },
  },
  { section: "RECORDS", label: "AVG 3 darts", kind: "num1", get: (s) => s.avg3 },
  {
    section: "RECORDS",
    label: "AVG 1 dart",
    kind: "num2",
    get: (s) => (s.avg3 == null ? null : s.avg3 / 3),
  },
  {
    section: "RECORDS",
    label: "Ratio legs W %",
    kind: "pct",
    get: (s) => {
      if (!s.legsPlayed) return null;
      return (s.legsWon / s.legsPlayed) * 100;
    },
  },
  { section: "RECORDS", label: "Best visit", kind: "int", get: (s) => s.bestVisit },
  {
    section: "RECORDS",
    label: "Best 9 darts",
    kind: "int",
    get: (s) => s.best9Score,
  },
  {
    section: "RECORDS",
    label: "Best checkout",
    kind: "int",
    get: (s) => s.bestCheckout,
  },
  {
    section: "RECORDS",
    label: "Best CO %",
    kind: "pct",
    get: (s) => {
      if (!s.coAttempts) return null;
      return (s.coSuccess / s.coAttempts) * 100;
    },
  },

  // HITS
  { section: "HITS", label: "Total darts", kind: "int", get: (s) => s.darts },
  { section: "HITS", label: "Hits totaux", kind: "int", get: (s) => s.hitsTotal },
  {
    section: "HITS",
    label: "Hits %",
    kind: "pct",
    get: (s) => {
      if (!s.darts) return null;
      return (s.hitsTotal / s.darts) * 100;
    },
  },
  { section: "HITS", label: "60+", kind: "int", get: (s) => s.hits60 },
  { section: "HITS", label: "80+", kind: "int", get: (s) => s.hits80 },
  { section: "HITS", label: "100+", kind: "int", get: (s) => s.hits100 },
  { section: "HITS", label: "120+", kind: "int", get: (s) => s.hits120 },
  { section: "HITS", label: "140+", kind: "int", get: (s) => s.hits140 },
  { section: "HITS", label: "180", kind: "int", get: (s) => s.hits180 },
  { section: "HITS", label: "Miss", kind: "int", get: (s) => s.miss },
  {
    section: "HITS",
    label: "Miss %",
    kind: "pct",
    get: (s) => {
      if (!s.darts) return null;
      return (s.miss / s.darts) * 100;
    },
  },
  { section: "HITS", label: "Simple", kind: "int", get: (s) => s.singleHits },
  {
    section: "HITS",
    label: "Simple %",
    kind: "pct",
    get: (s) => {
      if (!s.hitsTotal) return null;
      return (s.singleHits / s.hitsTotal) * 100;
    },
  },
  { section: "HITS", label: "Double", kind: "int", get: (s) => s.doubleHits },
  {
    section: "HITS",
    label: "Double %",
    kind: "pct",
    get: (s) => {
      if (!s.hitsTotal) return null;
      return (s.doubleHits / s.hitsTotal) * 100;
    },
  },
  { section: "HITS", label: "Triple", kind: "int", get: (s) => s.tripleHits },
  {
    section: "HITS",
    label: "Triple %",
    kind: "pct",
    get: (s) => {
      if (!s.hitsTotal) return null;
      return (s.tripleHits / s.hitsTotal) * 100;
    },
  },
  { section: "HITS", label: "Bull (25)", kind: "int", get: (s) => s.bull25 },
  {
    section: "HITS",
    label: "Bull %",
    kind: "pct",
    get: (s) => {
      if (!s.hitsTotal) return null;
      return (s.bull25 / s.hitsTotal) * 100;
    },
  },
  { section: "HITS", label: "DBull (50)", kind: "int", get: (s) => s.bull50 },
  {
    section: "HITS",
    label: "DBull %",
    kind: "pct",
    get: (s) => {
      if (!s.hitsTotal) return null;
      return (s.bull50 / s.hitsTotal) * 100;
    },
  },
  { section: "HITS", label: "Bust", kind: "int", get: (s) => s.bust },
  {
    section: "HITS",
    label: "Bust %",
    kind: "pct",
    get: (s) => {
      if (!s.hitsTotal) return null;
      return (s.bust / s.hitsTotal) * 100;
    },
  },
  { section: "HITS", label: "CO tentés", kind: "int", get: (s) => s.coAttempts },
  { section: "HITS", label: "CO réussis", kind: "int", get: (s) => s.coSuccess },
  {
    section: "HITS",
    label: "CO %",
    kind: "pct",
    get: (s) => {
      if (!s.coAttempts) return null;
      return (s.coSuccess / s.coAttempts) * 100;
    },
  },

  // MATCHES (pour l’instant global, on met au moins 0 partout)
  {
    section: "MATCHES",
    label: "Matchs / Sessions",
    kind: "int",
    get: (s) => s.count,
  },
  { section: "MATCHES", label: "Matchs DUO", kind: "int", get: (s) => s.matchDuo },
  {
    section: "MATCHES",
    label: "Victoires DUO",
    kind: "int",
    get: (s) => s.winDuo,
  },
  {
    section: "MATCHES",
    label: "Win % DUO",
    kind: "pct",
    get: (s) => s.matchDuo ? (s.winDuo / s.matchDuo) * 100 : 0,
  },
  {
    section: "MATCHES",
    label: "Matchs MULTI",
    kind: "int",
    get: (s) => s.matchMulti,
  },
  {
    section: "MATCHES",
    label: "Victoires MULTI",
    kind: "int",
    get: (s) => s.winMulti,
  },
  {
    section: "MATCHES",
    label: "Podiums MULTI (Top3)",
    kind: "int",
    get: (s) => s.podiumMulti,
  },
  {
    section: "MATCHES",
    label: "Win % MULTI",
    kind: "pct",
    get: (s) => s.matchMulti ? (s.winMulti / s.matchMulti) * 100 : 0,
  },
  {
    section: "MATCHES",
    label: "FINISH MULTI",
    kind: "int",
    get: (s) => s.finishMulti,
  },
  {
    section: "MATCHES",
    label: "FINISH % MULTI",
    kind: "pct",
    get: (s) => s.matchMulti ? (s.finishMulti / s.matchMulti) * 100 : 0,
  },
  { section: "MATCHES", label: "Matchs TEAM", kind: "int", get: (s) => s.matchTeam },
  {
    section: "MATCHES",
    label: "Victoires TEAM",
    kind: "int",
    get: (s) => s.winTeam,
  },
  {
    section: "MATCHES",
    label: "Win % TEAM",
    kind: "pct",
    get: (s) => s.matchTeam ? (s.winTeam / s.matchTeam) * 100 : 0,
  },
];

// ----------------- Composant principal -----------------

const StatsX01Compare: React.FC<Props> = ({ store, profileId, compact }) => {
  const { theme } = useTheme();
  useLang();

  const [period, setPeriod] = useState<PeriodKey>("ALL");
  const [samples, setSamples] = useState<X01Sample[] | null>(null);
  const [localBridgeStats, setLocalBridgeStats] = useState<any | null>(null);
  const [onlineBridgeStats, setOnlineBridgeStats] = useState<any | null>(null);
  const [localX01MultiAgg, setLocalX01MultiAgg] = useState<any | null>(null);
  const [matchBreakdown, setMatchBreakdown] = useState<{ local: X01CompareMatchBreakdown; online: X01CompareMatchBreakdown }>(() => ({
    local: emptyX01CompareMatchBreakdown(),
    online: emptyX01CompareMatchBreakdown(),
  }));

  const profiles: Profile[] = store.profiles || [];
  const activeFromStore =
    profiles.find((p) => p.id === store.activeProfileId) || profiles[0] || null;

  const targetProfile: Profile | null =
    (profileId && profiles.find((p) => p.id === profileId)) || activeFromStore;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!targetProfile) {
        setSamples([]);
        return;
      }

      try {
        const pid = targetProfile.id;
        const result: X01Sample[] = [];

        const historySamples = await loadX01SamplesForProfile(targetProfile, { scope: "all" });
        for (const hs of historySamples) {
          if (hs.scope === "training") continue;
          result.push({
            createdAt: hs.createdAt,
            mode: hs.scope === "online" ? "x01_online" : "x01_local",
            profileId: pid,
            matchId: (hs as any).matchId || undefined,
            rank: (hs as any).rank ?? null,
            playerCount: Number((hs as any).playerCount || 0) || undefined,
            isTeam: !!(hs as any).isTeam,
            avg3: hs.avg3 || undefined,
            bestVisit: hs.bestVisit || undefined,
            bestCheckout: hs.bestCheckout || undefined,
            best9Score: hs.best9Score || undefined,
            dartsThrown: hs.darts || undefined,
            totalScore: (hs as any).totalScore || undefined,
            legsWon: hs.legsWon || undefined,
            legsLost: undefined,
            matchesPlayed: hs.matchesPlayed || 1,
            matchesWon: hs.matchesWon || 0,
            hitsTotal: (hs.singleHits + hs.doubleHits + hs.tripleHits + hs.bull25 + hs.bull50) || undefined,
            hits60: hs.h60 || undefined,
            hits80: hs.h80 || undefined,
            hits100: hs.h100 || undefined,
            hits120: hs.h120 || undefined,
            hits140: hs.h140 || undefined,
            hits180: hs.h180 || undefined,
            miss: hs.miss || undefined,
            singleHits: hs.singleHits || undefined,
            doubleHits: hs.doubleHits || undefined,
            tripleHits: hs.tripleHits || undefined,
            bull25: hs.bull25 || undefined,
            bull50: hs.bull50 || undefined,
            bust: hs.bust || undefined,
            coAttempts: hs.coAttempts || undefined,
            coSuccess: hs.coSuccess || undefined,
          });
        }

        const trainingSessions = loadTrainingSessionsForProfile(pid);
        for (const s of trainingSessions) {
          const hitsTotal =
            Number(s.hitsS || 0) +
            Number(s.hitsD || 0) +
            Number(s.hitsT || 0) +
            Number(s.bull || 0) +
            Number(s.dBull || 0);

          result.push({
            createdAt: s.date,
            mode: "training_x01",
            profileId: pid,
            matchId: s.id || undefined,
            rank: null,
            playerCount: 1,
            isTeam: false,
            avg3: s.avg3D || undefined,
            bestVisit: s.bestVisit || undefined,
            bestCheckout: s.bestCheckout ?? undefined,
            best9Score: s.best9Score ?? undefined,
            dartsThrown: s.darts || undefined,
            totalScore: undefined,
            legsWon: undefined,
            legsLost: undefined,
            matchesPlayed: 0,
            matchesWon: 0,
            hitsTotal: hitsTotal || undefined,
            hits60: countThresholdHitsFromSession(s, 60) || undefined,
            hits80: countThresholdHitsFromSession(s, 80) || undefined,
            hits100: countThresholdHitsFromSession(s, 100) || undefined,
            hits120: countThresholdHitsFromSession(s, 120) || undefined,
            hits140: countThresholdHitsFromSession(s, 140) || undefined,
            hits180: countThresholdHitsFromSession(s, 180) || undefined,
            miss: Number(s.miss || 0) || undefined,
            singleHits: (Number(s.hitsS || 0) + Number(s.bull || 0)) || undefined,
            doubleHits: (Number(s.hitsD || 0) + Number(s.dBull || 0)) || undefined,
            tripleHits: Number(s.hitsT || 0) || undefined,
            bull25: Number(s.bull || 0) || undefined,
            bull50: Number(s.dBull || 0) || undefined,
            bust: Number(s.bust || 0) || undefined,
            coAttempts: Number(s.coAttempts || 0) || undefined,
            coSuccess: Number(s.coSuccess || 0) || undefined,
          });
        }

        if (!cancelled) {
          setSamples(result);
        }
      } catch (err) {
        console.error("StatsX01Compare — error loading history", err);
        if (!cancelled) {
          setSamples([]);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [targetProfile?.id]);


  useEffect(() => {
    let cancelled = false;

    async function loadLocalBridgeStats() {
      if (!targetProfile?.id) {
        setLocalBridgeStats(null);
        return;
      }

      try {
        const range = periodToBridgeRange(period);
        const stats = await getX01ProfileStats(String(targetProfile.id), range, "local");
        const onlineStats = await getX01ProfileStats(String(targetProfile.id), range, "online").catch(() => null);

        // Même consolidation que Dashboard global / Profils / X01 Multi :
        // le bridge central peut encore renvoyer une AVG pondérée ou des records anciens
        // sur certaines sauvegardes. Pour X01Compare LOCAL, les valeurs affichées doivent
        // reprendre computeX01MultiAgg : sessions 24, AVG3 39.3, best visit 114, best CO 81.
        let x01Agg: any = null;
        const rows = await loadFullFinishedHistoryRowsForX01Compare();
        const candidateId = rows.length ? findX01CandidateIdByName(rows, targetProfile.name) : null;
        const effectiveId = String(targetProfile.id || candidateId || "");
        if (range === "all" && rows.length) {
          x01Agg = computeX01MultiAgg(rows as any, String(targetProfile.id), targetProfile.name);
          if ((Number(x01Agg?.sessions || 0) || 0) === 0 && candidateId) {
            const alt = computeX01MultiAgg(rows as any, candidateId, targetProfile.name);
            if ((Number(alt?.sessions || 0) || 0) > 0) x01Agg = alt;
          }
        }

        const byPeriod = getPeriodRange(period);
        const localMatches = rows.length
          ? computeX01CompareMatchBreakdown(rows, effectiveId, targetProfile.name, "local", byPeriod)
          : emptyX01CompareMatchBreakdown();
        const onlineMatches = rows.length
          ? computeX01CompareMatchBreakdown(rows, effectiveId, targetProfile.name, "online", byPeriod)
          : emptyX01CompareMatchBreakdown();

        if (!cancelled) {
          setLocalBridgeStats(stats || null);
          setOnlineBridgeStats(onlineStats || null);
          setLocalX01MultiAgg(x01Agg || null);
          setMatchBreakdown({ local: localMatches, online: onlineMatches });
        }
      } catch (err) {
        console.warn("[StatsX01Compare] local bridge stats failed", err);
        if (!cancelled) {
          setLocalBridgeStats(null);
          setOnlineBridgeStats(null);
          setLocalX01MultiAgg(null);
          setMatchBreakdown({ local: emptyX01CompareMatchBreakdown(), online: emptyX01CompareMatchBreakdown() });
        }
      }
    }

    loadLocalBridgeStats();

    return () => {
      cancelled = true;
    };
  }, [targetProfile?.id, period]);

  const { from, to, archivesOnly } = useMemo(
    () => getPeriodRange(period),
    [period]
  );

  const filtered: FilteredBuckets = useMemo(() => {
    if (!samples || !samples.length) {
      return { local: [], online: [], training: [] };
    }

    const inRange = (s: X01Sample) => {
      if (archivesOnly) {
        if (typeof to === "number" && s.createdAt >= to) return false;
        return true;
      }
      if (typeof from === "number" && s.createdAt < from) return false;
      if (typeof to === "number" && s.createdAt > to) return false;
      return true;
    };

    return {
      local: samples.filter((s) => s.mode === "x01_local" && inRange(s)),
      online: samples.filter((s) => s.mode === "x01_online" && inRange(s)),
      training: samples.filter((s) => s.mode === "training_x01" && inRange(s)),
    };
  }, [samples, from, to, archivesOnly]);

  const aggLocalRaw = useMemo(() => aggregateSamples(filtered.local), [filtered.local]);
  const localSampleMatchBreakdown = useMemo(
    () => computeX01CompareMatchBreakdownFromSamples(filtered.local),
    [filtered.local]
  );
  const aggLocal = useMemo(
    () => mergeX01CompareMatchBreakdown(
      applyX01MultiAggToAggregatedStats(
        localX01MultiAgg,
        bridgeX01ToAggregatedStats(localBridgeStats, aggLocalRaw)
      ),
      hasX01CompareMatchBreakdownValues(localSampleMatchBreakdown) ? localSampleMatchBreakdown : matchBreakdown.local
    ),
    [localX01MultiAgg, localBridgeStats, aggLocalRaw, localSampleMatchBreakdown, matchBreakdown.local]
  );
  const onlineSampleMatchBreakdown = useMemo(
    () => computeX01CompareMatchBreakdownFromSamples(filtered.online),
    [filtered.online]
  );

  const aggOnline = useMemo(() => {
    const base = bridgeX01ToAggregatedStats(onlineBridgeStats, aggregateSamples(filtered.online));
    const raw = hasX01CompareMatchBreakdownValues(onlineSampleMatchBreakdown)
      ? onlineSampleMatchBreakdown
      : (matchBreakdown.online || emptyX01CompareMatchBreakdown());

    // Les matchs online historiques ne contiennent pas toujours les tableaux
    // de joueurs complets dans History. Dans ce cas, la source fiable reste
    // le bridge / samples : X01 Online = duel, donc on remplit DUO depuis
    // matchesPlayed / matchesWon au lieu de laisser la section MATCHS à zéro.
    const hasAnyBreakdown =
      raw.matchDuo || raw.matchMulti || raw.matchTeam || raw.winDuo || raw.winMulti || raw.winTeam;
    const onlineFallback = hasAnyBreakdown
      ? raw
      : {
          ...raw,
          matchDuo: Number(base.matchesPlayed || base.count || 0) || 0,
          winDuo: Number(base.matchesWon || 0) || 0,
        };

    return mergeX01CompareMatchBreakdown(base, onlineFallback);
  }, [onlineBridgeStats, filtered.online, onlineSampleMatchBreakdown, matchBreakdown.online]);
  const aggTraining = useMemo(
    () => aggregateSamples(filtered.training),
    [filtered.training]
  );

  const sparkData: SparkPoint[] = useMemo(
    () => buildSparkData(filtered),
    [filtered]
  );

  const sessionsLocal = aggLocal.count;
  const sessionsOnline = aggOnline.count;
  const sessionsTraining = aggTraining.count;

  const pieData =
    sessionsLocal + sessionsOnline + sessionsTraining === 0
      ? []
      : [
          { name: "Training", value: sessionsTraining, key: "training" },
          { name: "Local", value: sessionsLocal, key: "local" },
          { name: "Online", value: sessionsOnline, key: "online" },
        ];

  const BG = theme.background || "#050712";
  const primary = theme.primary || "#ffd86f";

  const colTraining = "#7fe2a9";
  const colLocal = "#ffd86f";
  const colOnline = "#63e1ff";

  const outerStyle: React.CSSProperties = compact
    ? {
        width: "100%",
        padding: 8,
        borderRadius: 16,
        background:
          "radial-gradient(circle at 0 0, rgba(255,216,111,0.06), transparent 55%), rgba(0,0,0,0.8)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }
    : {
        minHeight: "100%",
        padding: 16,
        background:
          "radial-gradient(circle at 0 0, rgba(255,216,111,0.08), transparent 55%), " +
          BG,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      };

  if (!targetProfile) {
    return (
      <div style={outerStyle}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          Comparateur X01
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, textAlign: "center" }}>
          Aucun profil actif trouvé.
        </div>
      </div>
    );
  }

  const renderValue = (row: RowDef, stats: AggregatedStats) => {
    const raw = row.get(stats);
    if (raw == null || Number.isNaN(raw)) return "—";
    switch (row.kind) {
      case "int":
        return fmtInt(raw);
      case "num1":
        return fmtNum(raw, 1);
      case "num2":
        return fmtNum(raw, 2);
      case "pct":
        return fmtNum(raw, 1); // déjà en %
      default:
        return "—";
    }
  };

  const renderTrainingValue = (row: RowDef, stats: AggregatedStats) => {
    if (row.label === "Victoires" || row.label === "Win %" || row.label === "Ratio legs W %") {
      return "—";
    }
    return renderValue(row, stats);
  };

  const sectionsMain: ("RECORDS" | "HITS")[] = ["RECORDS", "HITS"];

  return (
    <div style={outerStyle}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: compact ? 18 : 22,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
            textAlign: "center",
            backgroundImage: `linear-gradient(135deg, ${primary}, #ffffff)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 10px rgba(255,216,111,0.7)",
          }}
        >
          Comparateur X01
        </div>
        {!compact && (
          <div
            style={{
              fontSize: 13,
              opacity: 0.8,
              textAlign: "center",
            }}
          >
            Profil : {targetProfile ? targetProfile.name : "—"}
          </div>
        )}
      </div>

      {/* Sélecteur période */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: compact ? 0 : 4,
          marginTop: 4,
        }}
      >
        {(
          [
            ["D", "J"],
            ["W", "S"],
            ["M", "M"],
            ["Y", "A"],
            ["ALL", "ALL"],
            ["ARV", "ARV"],
          ] as [PeriodKey, string][]
        ).map(([key, label]) => {
          const isActive = period === key;
          return (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                borderRadius: 999,
                padding: "5px 10px",
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                background: isActive
                  ? `linear-gradient(135deg, ${primary}, ${primary}80)`
                  : "rgba(255,255,255,0.08)",
                color: isActive ? "#000" : "#fff",
                fontWeight: 700,
                boxShadow: isActive
                  ? "0 0 12px rgba(255,216,111,0.7)"
                  : "0 0 0 rgba(0,0,0,0)",
                transition: "background .18s, box-shadow .18s, transform .12s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Bloc principal */}
      <div
        style={{
          marginTop: 8,
          borderRadius: 16,
          padding: 10,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.9))",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "0 0 24px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header colonnes global (avec Training) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.7fr 1fr 1fr 1fr",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            padding: "6px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <div style={{ opacity: 0.7 }}>Stat</div>
          <div
            style={{
              textAlign: "right",
              backgroundImage: `linear-gradient(135deg, ${colTraining}, #ffffff)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 6px rgba(127,226,169,0.6)",
              fontWeight: 800,
            }}
          >
            Training
          </div>
          <div
            style={{
              textAlign: "right",
              backgroundImage: `linear-gradient(135deg, ${colLocal}, #ffffff)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 6px rgba(255,216,111,0.8)",
              fontWeight: 800,
            }}
          >
            Local
          </div>
          <div
            style={{
              textAlign: "right",
              backgroundImage: `linear-gradient(135deg, ${colOnline}, #ffffff)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 6px rgba(99,225,255,0.7)",
              fontWeight: 800,
            }}
          >
            Online
          </div>
        </div>

        {/* RECORDS + HITS */}
        {["RECORDS", "HITS"].map((section) => (
          <div key={section}>
            {/* Titre section */}
            <div
              style={{
                padding: "6px 8px 4px",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.8,
                marginTop: 6,
                backgroundImage: `linear-gradient(135deg, ${primary}, #ffffff)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 6px rgba(255,216,111,0.7)",
              }}
            >
              {section === "RECORDS"
                ? "Records"
                : "Hits / Précision"}
            </div>

            {/* Lignes */}
            {ROWS.filter((r) => r.section === section).map((row) => (
              <div
                key={row.section + row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.7fr 1fr 1fr 1fr",
                  fontSize: 12,
                  padding: "3px 8px",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ opacity: 0.8 }}>{row.label}</div>
                <div
                  style={{
                    textAlign: "right",
                    color: colTraining,
                    fontWeight: 700,
                  }}
                >
                  {renderTrainingValue(row, aggTraining)}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    color: colLocal,
                    fontWeight: 700,
                  }}
                >
                  {renderValue(row, aggLocal)}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    color: colOnline,
                    fontWeight: 700,
                  }}
                >
                  {renderValue(row, aggOnline)}
                </div>
              </div>
            ))}

            {/* Sparkline sous RECORDS */}
            {section === "RECORDS" && sparkData.length > 0 && (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  padding: 6,
                  background: "rgba(0,0,0,0.7)",
                  margin: "8px 4px 4px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                    opacity: 0.85,
                    marginBottom: 4,
                  }}
                >
                  Évolution AVG 3 darts
                </div>
                <div style={{ width: "100%", height: 110 }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={sparkData}
                      margin={{ left: -18, right: 4, top: 4, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: "#ccc" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#ccc" }}
                        tickLine={false}
                        width={26}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#050712",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="training"
                        stroke={colTraining}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                        name="Training X01"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="local"
                        stroke={colLocal}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                        name="X01 Local"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="online"
                        stroke={colOnline}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                        name="X01 Online"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Camembert entre HITS et MATCHS */}
        {pieData.length > 0 && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.16)",
              padding: 6,
              background: "rgba(0,0,0,0.75)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "10px 4px 6px",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  opacity: 0.85,
                  marginBottom: 4,
                }}
              >
                Répartition sessions / matchs par mode
              </div>
              <div style={{ width: "100%", height: 120 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={26}
                      outerRadius={48}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={
                            entry.key === "training"
                              ? colTraining
                              : entry.key === "local"
                              ? colLocal
                              : colOnline
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 11,
                minWidth: 70,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: colTraining,
                  }}
                />
                <span>Training</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: colLocal,
                  }}
                />
                <span>Local</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: colOnline,
                  }}
                />
                <span>Online</span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION MATCHES : uniquement LOCAL + ONLINE (pas Training) */}
        <div>
          <div
            style={{
              padding: "6px 8px 4px",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.8,
              marginTop: 8,
              backgroundImage: `linear-gradient(135deg, ${primary}, #ffffff)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 6px rgba(255,216,111,0.7)",
            }}
          >
            Matchs
          </div>

          {/* Header 3 colonnes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.7fr 1fr 1fr",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.4,
              padding: "4px 8px 2px",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ opacity: 0.7 }}>Stat</div>
            <div
              style={{
                textAlign: "right",
                backgroundImage: `linear-gradient(135deg, ${colLocal}, #ffffff)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 6px rgba(255,216,111,0.8)",
                fontWeight: 800,
              }}
            >
              Local
            </div>
            <div
              style={{
                textAlign: "right",
                backgroundImage: `linear-gradient(135deg, ${colOnline}, #ffffff)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 6px rgba(99,225,255,0.7)",
                fontWeight: 800,
              }}
            >
              Online
            </div>
          </div>

          {ROWS.filter((r) => r.section === "MATCHES").map((row) => (
            <div
              key={row.section + row.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1.7fr 1fr 1fr",
                fontSize: 12,
                padding: "3px 8px",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ opacity: 0.8 }}>{row.label}</div>
              <div
                style={{
                  textAlign: "right",
                  color: colLocal,
                  fontWeight: 700,
                }}
              >
                {renderValue(row, aggLocal)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  color: colOnline,
                  fontWeight: 700,
                }}
              >
                {renderValue(row, aggOnline)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsX01Compare;
