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
  dartsThrown?: number;
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
};

type AggregatedStats = {
  count: number;
  avg3: number | null;
  bestVisit: number | null;
  bestCheckout: number | null;
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
  profileId: string;
  darts: number;
  avg3D: number;
  bestVisit: number;
  bestCheckout: number | null;
};

function loadTrainingSessionsForProfile(
  profileId: string | null
): TrainingX01SessionLite[] {
  if (typeof window === "undefined" || !profileId) return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((row: any, idx: number) => ({
        id: row.id ?? String(idx),
        date: Number(row.date) || Date.now(),
        profileId: String(row.profileId ?? "unknown"),
        darts: Number(row.darts) || 0,
        avg3D: Number(row.avg3D) || 0,
        bestVisit: Number(row.bestVisit) || 0,
        bestCheckout:
          row.bestCheckout === null || row.bestCheckout === undefined
            ? null
            : Number(row.bestCheckout) || 0,
      }))
      .filter((s) => s.profileId === profileId);
  } catch (e) {
    console.warn("[StatsX01Compare] loadTrainingSessions failed", e);
    return [];
  }
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
function findNumberDeep(obj: any, keyParts: string[]): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number") {
      const key = k.toLowerCase();
      if (keyParts.some((p) => key.includes(p))) {
        return v;
      }
    } else if (v && typeof v === "object") {
      const nested = findNumberDeep(v, keyParts);
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
    };
  }

  let sumAvg3 = 0;
  let countAvg3 = 0;
  let bestVisit: number | null = null;
  let bestCheckout: number | null = null;

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

  for (const s of samples) {
    if (typeof s.avg3 === "number") {
      sumAvg3 += s.avg3;
      countAvg3++;
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
  }

  const legsPlayed = legsWon + legsLost;

  return {
    count: samples.length,
    avg3: countAvg3 ? sumAvg3 / countAvg3 : null,
    bestVisit,
    bestCheckout,
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
  };
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
  const dayMapLocal: Record<string, { sum: number; count: number }> = {};
  const dayMapOnline: Record<string, { sum: number; count: number }> = {};
  const dayMapTraining: Record<string, { sum: number; count: number }> = {};

  const pushSample = (
    s: X01Sample,
    map: Record<string, { sum: number; count: number }>
  ) => {
    if (typeof s.avg3 !== "number") return;
    const d = new Date(s.createdAt);
    const key = d.toISOString().slice(0, 10);
    if (!map[key]) map[key] = { sum: 0, count: 0 };
    map[key].sum += s.avg3;
    map[key].count += 1;
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
      local: lp ? lp.sum / lp.count : undefined,
      online: op ? op.sum / op.count : undefined,
      training: tp ? tp.sum / tp.count : undefined,
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
    get: () => 0, // TODO: à câbler proprement
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
  { section: "MATCHES", label: "Matchs DUO", kind: "int", get: () => 0 },
  {
    section: "MATCHES",
    label: "Victoires DUO",
    kind: "int",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "Win % DUO",
    kind: "pct",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "Matchs MULTI",
    kind: "int",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "Victoires MULTI",
    kind: "int",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "Podiums MULTI (Top3)",
    kind: "int",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "Win % MULTI",
    kind: "pct",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "FINISH MULTI",
    kind: "int",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "FINISH % MULTI",
    kind: "pct",
    get: () => 0,
  },
  { section: "MATCHES", label: "Matchs TEAM", kind: "int", get: () => 0 },
  {
    section: "MATCHES",
    label: "Victoires TEAM",
    kind: "int",
    get: () => 0,
  },
  {
    section: "MATCHES",
    label: "Win % TEAM",
    kind: "pct",
    get: () => 0,
  },
];

// ----------------- Composant principal -----------------

const StatsX01Compare: React.FC<Props> = ({ store, profileId, compact }) => {
  const { theme } = useTheme();
  useLang();

  const [period, setPeriod] = useState<PeriodKey>("M");
  const [samples, setSamples] = useState<X01Sample[] | null>(null);

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
        let allMatches: any[] = [];

        if (History && typeof (History as any).getAllMatches === "function") {
          allMatches = await (History as any).getAllMatches();
        } else if (History && typeof (History as any).list === "function") {
          allMatches = await (History as any).list();
        } else if (typeof window !== "undefined" && (window as any).History?.list) {
          allMatches = await (window as any).History.list();
        }

        const result: X01Sample[] = [];
        const pid = targetProfile.id;

        for (const m of allMatches) {
          const createdAt: number =
            m.createdAt ||
            m.updatedAt ||
            m.summary?.createdAt ||
            m.summary?.endedAt ||
            Date.now();

          const kind = m.kind || m.summary?.kind;
          const gameType =
            m.game ||
            m.gameType ||
            m.mode ||
            m.variant ||
            m.summary?.gameType ||
            m.summary?.mode;

          const isTrainingX01 =
            kind === "training_x01" ||
            gameType === "training_x01" ||
            gameType === "training-x01";

          const isX01 =
            !isTrainingX01 &&
            (gameType === "x01" ||
              gameType === "x01v3" ||
              kind === "x01" ||
              m.mode === "x01" ||
              m.variant === "x01v3");

          if (!isX01 && !isTrainingX01) continue;

          const isOnline =
            m.summary?.online === true ||
            m.meta?.online === true ||
            m.mode === "x01_online" ||
            m.game === "x01_online";

          let mode: ModeKey | null = null;
          if (isTrainingX01) mode = "training_x01";
          else if (isX01 && isOnline) mode = "x01_online";
          else if (isX01 && !isOnline) mode = "x01_local";
          if (!mode) continue;

          const ss: any = m.summary ?? m.payload?.summary ?? {};

          const perArray: any[] = Array.isArray(ss.perPlayer)
            ? ss.perPlayer
            : Array.isArray(ss.players)
            ? ss.players
            : [];

          const keyCandidates = [
            pid,
            (targetProfile as any).profileId,
            targetProfile.name,
            (targetProfile as any).uuid,
            (targetProfile as any)._id,
          ]
            .filter(Boolean)
            .map((x) => String(x));

          let statsForTarget: any = null;

          if (perArray.length) {
            statsForTarget =
              perArray.find((x) =>
                keyCandidates.includes(String(x.playerId ?? x.id ?? x.profileId))
              ) || null;
          }

          if (!statsForTarget) {
            const perMap = ss.perPlayer || ss.players || ss.detailedByPlayer || {};
            for (const k of keyCandidates) {
              if (perMap[k]) {
                statsForTarget = perMap[k];
                break;
              }
            }
          }

          if (!statsForTarget) continue;

          // console.log("X01Compare statsForTarget", statsForTarget);

          const avg3 =
            N(statsForTarget.avg3) ||
            N(statsForTarget.avg_3) ||
            N(statsForTarget.avg3Darts) ||
            N(statsForTarget.average3);

          const bestVisit =
            N(statsForTarget.bestVisit) ||
            N(statsForTarget.bestVisitScore) ||
            N(statsForTarget.bestThreeDarts) ||
            N(statsForTarget.best_visit);

          const bestCheckout =
            N(statsForTarget.bestCheckout) ||
            N(statsForTarget.bestFinish) ||
            N(statsForTarget.bestCo) ||
            N(statsForTarget.checkout);

          const darts =
            N(statsForTarget.darts) ||
            N(statsForTarget.dartsThrown) ||
            N(statsForTarget.totalDarts);

          const legsWon =
            N(
              statsForTarget.legsWon ??
                statsForTarget.legsW ??
                statsForTarget.legs_won
            ) || 0;
          const legsLost =
            N(
              statsForTarget.legsLost ??
                statsForTarget.legsL ??
                statsForTarget.legs_lost
            ) || 0;

          const isWinner =
            statsForTarget.isWinner === true ||
            statsForTarget.winner === true ||
            (m.winnerId && String(m.winnerId) === String(pid));

          // -------- HITS : récupération depuis statsForTarget --------
          const hits =
            statsForTarget.hits ||
            statsForTarget.precision ||
            statsForTarget.details ||
            {};

          const hitsTotal =
            pickNum(
              hits.total,
              hits.totalHits,
              hits.count,
              statsForTarget.totalHits,
              statsForTarget.hitsTotal
            ) ?? findNumberDeep(statsForTarget, ["totalhits", "hits_total"]);

          const hits60 =
            pickNum(
              hits["60+"],
              hits["60"],
              hits.s60,
              hits.h60,
              statsForTarget["60+"],
              statsForTarget.h60
            ) ?? findNumberDeep(statsForTarget, ["60+","60plus","h60"]);

          const hits80 =
            pickNum(
              hits["80+"],
              hits["80"],
              hits.s80,
              hits.h80,
              statsForTarget["80+"],
              statsForTarget.h80
            ) ?? findNumberDeep(statsForTarget, ["80+","80plus","h80"]);

          const hits100 =
            pickNum(
              hits["100+"],
              hits["100"],
              hits.s100,
              hits.h100,
              statsForTarget["100+"],
              statsForTarget.h100
            ) ?? findNumberDeep(statsForTarget, ["100+","100plus","h100"]);

          const hits120 =
            pickNum(
              hits["120+"],
              hits["120"],
              hits.s120,
              hits.h120,
              statsForTarget["120+"],
              statsForTarget.h120
            ) ?? findNumberDeep(statsForTarget, ["120+","120plus","h120"]);

          const hits140 =
            pickNum(
              hits["140+"],
              hits["140"],
              hits.s140,
              hits.h140,
              statsForTarget["140+"],
              statsForTarget.h140
            ) ?? findNumberDeep(statsForTarget, ["140+","140plus","h140"]);

          const hits180 =
            pickNum(
              hits["180"],
              hits.s180,
              hits.h180,
              statsForTarget["180"],
              statsForTarget.h180
            ) ?? findNumberDeep(statsForTarget, ["180"]);

          const miss =
            pickNum(
              hits.miss,
              hits.misses,
              hits.missDarts,
              statsForTarget.miss,
              statsForTarget.misses
            ) ?? findNumberDeep(statsForTarget, ["miss"]);

          const singleHits =
            pickNum(
              hits.single,
              hits.singles,
              hits.s,
              statsForTarget.simpleHits,
              statsForTarget.singles
            ) ?? findNumberDeep(statsForTarget, ["single","simple"]);

          const doubleHits =
            pickNum(
              hits.double,
              hits.doubles,
              hits.d,
              statsForTarget.doubleHits,
              statsForTarget.doubles
            ) ?? findNumberDeep(statsForTarget, ["double"]);

          const tripleHits =
            pickNum(
              hits.triple,
              hits.triples,
              hits.t,
              statsForTarget.tripleHits,
              statsForTarget.triples
            ) ?? findNumberDeep(statsForTarget, ["triple"]);

          const bull25 =
            pickNum(
              hits.bull25,
              hits.bull,
              hits.sb,
              statsForTarget.bull25,
              statsForTarget.bull
            ) ?? findNumberDeep(statsForTarget, ["bull25","singlebull","bull_25"]);

          const bull50 =
            pickNum(
              hits.bull50,
              hits.dbull,
              hits.db,
              statsForTarget.bull50,
              statsForTarget.dbull
            ) ?? findNumberDeep(statsForTarget, ["bull50","doublebull","bull_50","dbull"]);

          const bust =
            pickNum(
              hits.bust,
              hits.busts,
              statsForTarget.bust,
              statsForTarget.busts
            ) ?? findNumberDeep(statsForTarget, ["bust"]);

          const coAttempts =
            pickNum(
              hits.coAttempts,
              hits.checkoutAttempts,
              statsForTarget.coAttempts,
              statsForTarget.checkoutAttempts
            ) ?? findNumberDeep(statsForTarget, ["coattempt","checkout_attempt"]);

          const coSuccess =
            pickNum(
              hits.coSuccess,
              hits.checkoutHits,
              hits.coHits,
              statsForTarget.coSuccess,
              statsForTarget.checkoutSuccess
            ) ?? findNumberDeep(statsForTarget, ["co_success","checkout_hit"]);

          const sample: X01Sample = {
            createdAt,
            mode,
            profileId: pid,
            avg3: avg3 || undefined,
            bestVisit: bestVisit || undefined,
            bestCheckout: bestCheckout || undefined,
            dartsThrown: darts || undefined,
            legsWon,
            legsLost,
            matchesPlayed: 1,
            matchesWon: isWinner ? 1 : 0,

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
          };

          result.push(sample);
        }

        const trainingSessions = loadTrainingSessionsForProfile(pid);
        for (const s of trainingSessions) {
          result.push({
            createdAt: s.date,
            mode: "training_x01",
            profileId: pid,
            avg3: s.avg3D || undefined,
            bestVisit: s.bestVisit || undefined,
            bestCheckout: s.bestCheckout ?? undefined,
            dartsThrown: s.darts || undefined,
            legsWon: undefined,
            legsLost: undefined,
            matchesPlayed: 1,
            matchesWon: 0,
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

  const aggLocal = useMemo(() => aggregateSamples(filtered.local), [filtered.local]);
  const aggOnline = useMemo(() => aggregateSamples(filtered.online), [filtered.online]);
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
                  {renderValue(row, aggTraining)}
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
