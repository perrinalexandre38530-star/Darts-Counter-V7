// =============================================================
// src/pages/Home.tsx — Home v2 (dashboard futuriste)
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useAuthOnline } from "../hooks/useAuthOnline";

import type { Store, Profile } from "../lib/types";
import ActiveProfileCard, {
  type ActiveProfileStats,
} from "../components/home/ActiveProfileCard";
import ArcadeTicker, {
  type ArcadeTickerItem,
} from "../components/home/ArcadeTicker";

// 🔗 Stats X01 (quick + historique) + Cricket
import {
  getBasicProfileStatsAsync,
  getCricketProfileStats,
} from "../lib/statsBridge";
import { History } from "../lib/history";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 520;
const DETAIL_INTERVAL_MS = 7000;
const TIP_SWIPE_THRESHOLD = 25;

// ------------------------------------------------------------
// Tickers : images multiples par thème (choix stable, PAS de random en render)
// ------------------------------------------------------------

// ✅ Option A (recommandée) : servir en LOCAL (public/img)
// const IMG_BASE = "/img/";

// ✅ Option B : CDN jsDelivr (plus stable que raw.githubusercontent.com)
const IMG_BASE =
  "https://cdn.jsdelivr.net/gh/perrinalexandre38530-star/Darts-Counter-V5.3@main/public/img/";

// ⚠️ IMPORTANT : éviter "ad", "ads", "advice" dans les noms de fichiers (bloqueurs)
// => si tu n'as pas renommé tes fichiers, garde tes noms actuels MAIS tu risques encore du blocage.
// Ici je garde tes clés actuelles pour ne rien casser.
const TICKER_IMAGES = {
  records: ["ticker-records.jpg", "ticker-records-2.jpg"],
  local: ["ticker-x01.jpg", "ticker-x01-2.jpg"],
  onlineLast: ["ticker-online.jpg", "ticker-online-2.jpg"],
  leaderboard: ["ticker-leaderboard.jpg", "ticker-leaderboard-2.jpg"],
  training: ["ticker-training.jpg", "ticker-training-2.jpg"],
  global: ["ticker-global.jpg", "ticker-global-2.jpg"],
  tip: ["ticker-tip.jpg", "ticker-tip-2.jpg"],
  tipAdvice: ["ticker-tip-advice.jpg", "ticker-tip-advice-2.jpg"],
  tipAds: ["ticker-tip-ads.jpg", "ticker-tip-ads-2.jpg"],
  tipNews: ["ticker-tip-news.jpg", "ticker-tip-news-2.jpg"],
} as const;

function hashStringToInt(str: string): number {
  // hash simple & stable (FNV-ish)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ✅ déterministe : même résultat tant que seed ne change pas
function pickTickerImage<K extends keyof typeof TICKER_IMAGES>(
  key: K,
  seed: string
): string {
  const arr = TICKER_IMAGES[key];
  if (!arr || arr.length === 0) return "";
  const idx = hashStringToInt(`${key}::${seed}`) % arr.length;
  return IMG_BASE + arr[idx];
}

/* ============================================================
   Helpers
============================================================ */

function getActiveProfile(store: Store): Profile | null {
  const anyStore = store as any;
  const profiles: Profile[] = anyStore.profiles ?? [];
  const activeProfileId: string | null = anyStore.activeProfileId ?? null;
  if (!profiles.length) return null;
  if (!activeProfileId) return profiles[0];
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}

function emptyActiveProfileStats(): ActiveProfileStats {
  return {
    ratingGlobal: 0,
    winrateGlobal: 0,
    avg3DGlobal: 0,
    sessionsGlobal: 0,
    favoriteNumberLabel: null,

    recordBestVisitX01: 0,
    recordBestCOX01: 0,
    recordMinDarts501: null,
    recordBestAvg3DX01: 0,
    recordBestStreak: null,
    recordBestCricketScore: null,

    onlineMatches: 0,
    onlineWinrate: 0,
    onlineAvg3D: 0,
    onlineBestVisit: 0,
    onlineBestCO: 0,
    onlineRank: null,
    onlineBestRank: null,

    x01MultiAvg3D: 0,
    x01MultiSessions: 0,
    x01MultiWinrate: 0,
    x01MultiBestVisit: 0,
    x01MultiBestCO: 0,
    x01MultiMinDartsLabel: null,

    cricketPointsPerRound: 0,
    cricketHitsTotal: 0,
    cricketCloseRate: 0,
    cricketLegsWinrate: 0,
    cricketAvgClose201918: 0,
    cricketOpenings: 0,

    trainingAvg3D: 0,
    trainingHitsS: 0,
    trainingHitsD: 0,
    trainingHitsT: 0,
    trainingGoalSuccessRate: 0,
    trainingBestCO: 0,

    clockTargetsHit: 0,
    clockSuccessRate: 0,
    clockTotalTimeSec: 0,
    clockBestStreak: 0,
  };
}

/* ============================================================
   Training X01 agrégé (localStorage)
============================================================ */

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

type TrainingX01Agg = {
  sessions: number;
  totalDarts: number;
  sumAvg3D: number;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  bestCheckout: number | null;
};

function makeEmptyTrainingAgg(): TrainingX01Agg {
  return {
    sessions: 0,
    totalDarts: 0,
    sumAvg3D: 0,
    hitsS: 0,
    hitsD: 0,
    hitsT: 0,
    bestCheckout: null,
  };
}

function loadTrainingAggForProfile(profileId: string): TrainingX01Agg {
  if (typeof window === "undefined") return makeEmptyTrainingAgg();

  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return makeEmptyTrainingAgg();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return makeEmptyTrainingAgg();

    const agg = makeEmptyTrainingAgg();

    for (const row of parsed) {
      if (!row) continue;

      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

      agg.sessions += 1;
      agg.totalDarts += Number(row.darts) || 0;
      agg.sumAvg3D += Number(row.avg3D) || 0;
      agg.hitsS += Number(row.hitsS) || 0;
      agg.hitsD += Number(row.hitsD) || 0;
      agg.hitsT += Number(row.hitsT) || 0;

      const bestCheckoutRaw =
        row.bestCheckout !== undefined && row.bestCheckout !== null
          ? row.bestCheckout
          : row.checkout;

      const bestCheckout =
        bestCheckoutRaw === null || bestCheckoutRaw === undefined
          ? null
          : Number(bestCheckoutRaw) || 0;

      if (
        bestCheckout &&
        (!agg.bestCheckout || bestCheckout > agg.bestCheckout)
      ) {
        agg.bestCheckout = bestCheckout;
      }
    }

    return agg;
  } catch (e) {
    console.warn("[Home] loadTrainingAggForProfile failed", e);
    return makeEmptyTrainingAgg();
  }
}

/* ============================================================
   Tour de l’Horloge agrégé (localStorage)
============================================================ */

const TRAINING_CLOCK_STATS_KEY = "dc_training_clock_stats_v1";

type ClockAgg = {
  runs: number;
  targetsHitTotal: number;
  attemptsTotal: number;
  totalTimeSec: number;
  bestStreak: number;
};

function makeEmptyClockAgg(): ClockAgg {
  return {
    runs: 0,
    targetsHitTotal: 0,
    attemptsTotal: 0,
    totalTimeSec: 0,
    bestStreak: 0,
  };
}

function loadClockAggForProfile(profileId: string): ClockAgg {
  if (typeof window === "undefined") return makeEmptyClockAgg();

  try {
    const raw = window.localStorage.getItem(TRAINING_CLOCK_STATS_KEY);
    if (!raw) return makeEmptyClockAgg();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return makeEmptyClockAgg();

    const agg = makeEmptyClockAgg();

    for (const row of parsed) {
      if (!row) continue;

      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

      const targetsHit = Number(row.targetsHit ?? row.hits ?? 0) || 0;
      const attempts = Number(row.attempts ?? row.throws ?? 0) || 0;
      const timeSec = Number(row.totalTimeSec ?? row.timeSec ?? 0) || 0;
      const streak = Number(row.bestStreak ?? row.streak ?? 0) || 0;

      agg.runs += 1;
      agg.targetsHitTotal += targetsHit;
      agg.attemptsTotal += attempts;
      agg.totalTimeSec += timeSec;
      if (streak > agg.bestStreak) agg.bestStreak = streak;
    }

    return agg;
  } catch (e) {
    console.warn("[Home] loadClockAggForProfile failed", e);
    return makeEmptyClockAgg();
  }
}

/* ============================================================
   ✅ KILLER — helpers d’agrégation depuis History.list()
   -> On n’ajoute PAS de champs au type ActiveProfileStats (sinon TS crie),
      mais on “attache” des champs via (stats as any).killer*
============================================================ */

type KillerAgg = {
  sessions: number;
  wins: number;
  winRate01: number;
  kills: number;
  totalHits: number;
  favNumberHits: number;
  favSegmentHits: number;
};

function makeEmptyKillerAgg(): KillerAgg {
  return {
    sessions: 0,
    wins: 0,
    winRate01: 0,
    kills: 0,
    totalHits: 0,
    favNumberHits: 0,
    favSegmentHits: 0,
  };
}

function isKillerMatch(match: any): boolean {
  const summary: any = match?.summary ?? match ?? {};
  const mode =
    String(
      summary?.mode ??
        summary?.gameMode ??
        summary?.game ??
        summary?.kind ??
        summary?.type ??
        match?.mode ??
        match?.game ??
        match?.kind ??
        match?.type ??
        ""
    ).toLowerCase();

  if (mode.includes("killer")) return true;

  const gameId = String(
    summary?.gameId ?? match?.gameId ?? match?.id ?? ""
  ).toLowerCase();
  if (gameId.includes("killer")) return true;

  return false;
}

function getMyPlayerKeyFromPlayers(
  players: any[],
  profileId: string
): { me: any | null; key: string | null } {
  if (!Array.isArray(players) || !players.length) return { me: null, key: null };

  const me =
    players.find(
      (p: any) =>
        p?.profileId === profileId ||
        p?.playerId === profileId ||
        p?.id === profileId
    ) ?? null;

  if (!me) return { me: null, key: null };

  const key = String(me.profileId ?? me.playerId ?? me.id ?? profileId);
  return { me, key };
}

function resolveWinnerForAnyGame(
  summary: any,
  me: any,
  myKey: string,
  detailedMe?: any
): boolean {
  let isWinner = false;

  if (me?.isWinner === true || me?.winner === true) isWinner = true;
  if ([me?.rank, me?.place, me?.position].some((v: any) => Number(v) === 1))
    isWinner = true;
  if (
    typeof me?.result === "string" &&
    me.result.toLowerCase().startsWith("win")
  )
    isWinner = true;
  if (
    typeof me?.outcome === "string" &&
    me.outcome.toLowerCase().startsWith("win")
  )
    isWinner = true;

  if (!isWinner && Array.isArray(summary?.rankings)) {
    const r = summary.rankings.find((r: any) => {
      const rk = String(r?.profileId ?? r?.playerId ?? r?.id ?? r?.key ?? "");
      return rk === myKey;
    });
    if (r && [r.rank, r.place, r.position].some((v: any) => Number(v) === 1))
      isWinner = true;
  }

  if (!isWinner && summary?.winnerId && String(summary.winnerId) === myKey) {
    isWinner = true;
  }

  if (!isWinner && detailedMe) {
    if (
      [detailedMe.rank, detailedMe.place, detailedMe.position].some(
        (v: any) => Number(v) === 1
      )
    )
      isWinner = true;
    if (detailedMe.isWinner === true) isWinner = true;
    if (
      typeof detailedMe.result === "string" &&
      detailedMe.result.toLowerCase().startsWith("win")
    )
      isWinner = true;
    if (
      typeof detailedMe.outcome === "string" &&
      detailedMe.outcome.toLowerCase().startsWith("win")
    )
      isWinner = true;
  }

  return isWinner;
}

function computeKillerAggFromMatches(
  allMatches: any[],
  profileId: string
): KillerAgg {
  const agg = makeEmptyKillerAgg();

  const killerMatches = Array.isArray(allMatches)
    ? allMatches.filter((m) => isKillerMatch(m))
    : [];

  if (!killerMatches.length) return agg;

  const sorted = [...killerMatches].sort((a: any, b: any) => {
    const ta = Number(a?.createdAt ?? a?.timestamp ?? a?.date ?? 0) || 0;
    const tb = Number(b?.createdAt ?? b?.timestamp ?? b?.date ?? 0) || 0;
    return ta - tb;
  });

  for (const match of sorted) {
    const summary: any = match?.summary ?? match ?? {};
    const players: any[] =
      summary?.perPlayer ?? summary?.players ?? match?.players ?? [];

    const { me, key: myKey } = getMyPlayerKeyFromPlayers(players, profileId);
    if (!me || !myKey) continue;

    const detailedAll: any = summary?.detailedByPlayer ?? null;
    const detailedMe: any =
      detailedAll &&
      (detailedAll[myKey] ??
        detailedAll[me.profileId as any] ??
        detailedAll[me.playerId as any] ??
        detailedAll[me.id as any] ??
        detailedAll[String(me.profileId)] ??
        detailedAll[String(me.playerId)] ??
        detailedAll[String(me.id)]);

    agg.sessions += 1;

    const isWinner = resolveWinnerForAnyGame(summary, me, myKey, detailedMe);
    if (isWinner) agg.wins += 1;

    const killsRaw =
      me?.kills ??
      me?.stats?.kills ??
      detailedMe?.kills ??
      (summary?.killsByPlayer
        ? (summary.killsByPlayer as any)[myKey]
        : undefined) ??
      (summary?.killerKillsByPlayer
        ? (summary.killerKillsByPlayer as any)[myKey]
        : undefined);

    const kills = Number(killsRaw ?? 0) || 0;
    agg.kills += kills;

    const totalHitsRaw =
      me?.totalHits ??
      me?.stats?.totalHits ??
      detailedMe?.totalHits ??
      (summary?.totalHitsByPlayer
        ? (summary.totalHitsByPlayer as any)[myKey]
        : undefined);

    const favNumberHitsRaw =
      me?.favNumberHits ??
      me?.stats?.favNumberHits ??
      detailedMe?.favNumberHits ??
      (summary?.favNumberHitsByPlayer
        ? (summary.favNumberHitsByPlayer as any)[myKey]
        : undefined);

    const favSegmentHitsRaw =
      me?.favSegmentHits ??
      me?.stats?.favSegmentHits ??
      detailedMe?.favSegmentHits ??
      (summary?.favSegmentHitsByPlayer
        ? (summary.favSegmentHitsByPlayer as any)[myKey]
        : undefined);

    agg.totalHits += Number(totalHitsRaw ?? 0) || 0;
    agg.favNumberHits += Number(favNumberHitsRaw ?? 0) || 0;
    agg.favSegmentHits += Number(favSegmentHitsRaw ?? 0) || 0;
  }

  agg.winRate01 = agg.sessions > 0 ? agg.wins / agg.sessions : 0;
  return agg;
}

/* ============================================================
   buildStatsForProfile
============================================================ */

async function buildStatsForProfile(
  profileId: string
): Promise<ActiveProfileStats> {
  try {
    const [base, multiRaw, cricket] = await Promise.all([
      getBasicProfileStatsAsync(profileId),
      (async () => {
        try {
          const anyHistory: any = History as any;
          if (anyHistory.list) {
            return await anyHistory.list({
              includePlayers: true,
            });
          }
        } catch (e) {
          console.warn("[Home] History.list all games failed", e);
        }
        return [] as any[];
      })(),
      (async () => {
        try {
          return await getCricketProfileStats(profileId);
        } catch (e) {
          console.warn("[Home] getCricketProfileStats failed", e);
          return null;
        }
      })(),
    ]);

    const multiMatches: any[] = Array.isArray(multiRaw) ? multiRaw : [];

    /* ---------------------- GLOBAL (base brut) ---------------------- */

    const gamesBase = Number((base as any)?.games ?? 0);
    const winsBase = Number((base as any)?.wins ?? 0);

    const avg3Base =
      Number(
        (base as any)?.avg3D ??
          (base as any)?.avg3 ??
          (base as any)?.avg_3d ??
          0
      ) || 0;

    const bestVisitBase =
      Number(
        (base as any)?.bestVisit ??
          (base as any)?.best_visit ??
          (base as any)?.recordBestVisit ??
          (base as any)?.record_best_visit ??
          0
      ) || 0;

    const bestCheckoutBaseRaw =
      base && typeof base === "object"
        ? (base as any).bestCheckout ??
          (base as any).bestCO ??
          (base as any).bestCo ??
          (base as any).bestFinish ??
          (base as any).recordBestCO ??
          (base as any).record_best_co ??
          (base as any).recordBestCheckout ??
          (base as any).record_best_checkout
        : 0;

    const bestCheckoutBase = Number(bestCheckoutBaseRaw ?? 0) || 0;

    let winRateBase01 = 0;
    if (base && typeof base === "object" && (base as any).winRate != null) {
      const raw = Number((base as any).winRate);
      if (!Number.isNaN(raw) && raw > 0) {
        winRateBase01 = raw > 1 ? raw / 100 : raw;
      }
    }
    const winRate01Base =
      winRateBase01 > 0 ? winRateBase01 : gamesBase > 0 ? winsBase / gamesBase : 0;

    const minDartsCandidatesBase: number[] = [];

    const addMinCandidateBase = (v: any) => {
      const n = Number(v);
      if (!Number.isNaN(n) && n > 0) {
        minDartsCandidatesBase.push(n);
      }
    };

    if (base && typeof base === "object") {
      const b: any = base;

      addMinCandidateBase(b.minDarts);
      addMinCandidateBase(b.min_darts);
      addMinCandidateBase(b.minDarts501);
      addMinCandidateBase(b.min_darts_501);
      addMinCandidateBase(b.minDartsX01);
      addMinCandidateBase(b.fastestLeg);
      addMinCandidateBase(b.fastest_leg);
      addMinCandidateBase(b.bestLegDarts);
      addMinCandidateBase(b.best_leg_darts);
      addMinCandidateBase(b.recordMinDarts501);
      addMinCandidateBase(b.record_min_darts_501);

      for (const key of Object.keys(b)) {
        const lk = key.toLowerCase();
        if (lk.includes("min") && lk.includes("dart")) addMinCandidateBase(b[key]);
        if (lk.includes("fastest") && lk.includes("leg")) addMinCandidateBase(b[key]);
      }
    }

    const minDartsRecordBase =
      minDartsCandidatesBase.length > 0 ? Math.min(...minDartsCandidatesBase) : 0;

    /* ============================================================
       X01 MULTI — AGRÉGATION + Rating DC + numéro favori
    ============================================================= */

    let multiSessions = 0;
    let multiWins = 0;
    let multiTotalAvg3 = 0;
    let multiTotalAvg3Count = 0;

    let multiBestVisit = 0;
    let multiBestCheckout = 0;
    let multiMinDarts = Infinity;

    let ratingMatches = 0;
    let ratingSumResult = 0;
    let ratingSumExpected = 0;

    const favHitsGlobal: Record<string, number> = {};

    const addFavHits = (label: string, count: number) => {
      const n = Number(count) || 0;
      if (!n) return;
      favHitsGlobal[label] = (favHitsGlobal[label] || 0) + n;
    };

    const accumulateHitsBySegment = (hitsBySegment: any) => {
      if (!hitsBySegment || typeof hitsBySegment !== "object") return;
      for (const [rawKey, rawVal] of Object.entries(hitsBySegment)) {
        const segVal: any = rawVal;
        if (!segVal || typeof segVal !== "object") continue;

        const segNum = Number(rawKey);
        const baseLabel = Number.isNaN(segNum) ? String(rawKey) : String(segNum);

        const sCount = Number(segVal.s ?? segVal.single ?? segVal.S ?? 0) || 0;
        const dCount = Number(segVal.d ?? segVal.double ?? segVal.D ?? 0) || 0;
        const tCount = Number(segVal.t ?? segVal.triple ?? segVal.T ?? 0) || 0;
        const bullCount = Number(segVal.bull ?? segVal.Bull ?? segVal.b ?? 0) || 0;
        const dBullCount = Number(segVal.dbull ?? segVal.dBull ?? segVal.DBull ?? 0) || 0;

        if (bullCount) addFavHits("Bull", bullCount);
        if (dBullCount) addFavHits("DBull", dBullCount);

        if (sCount) addFavHits(`S${baseLabel}`, sCount);
        if (dCount) addFavHits(`D${baseLabel}`, dCount);
        if (tCount) addFavHits(`T${baseLabel}`, tCount);
      }
    };

    let bestWinStreak = 0;
    let currentStreak = 0;

    const multiSorted = [...multiMatches].sort((a: any, b: any) => {
      const ta = Number(a?.createdAt ?? a?.timestamp ?? a?.date ?? 0) || 0;
      const tb = Number(b?.createdAt ?? b?.timestamp ?? b?.date ?? 0) || 0;
      return ta - tb;
    });

    for (const match of multiSorted) {
      const summary: any = match.summary ?? match;
      const players: any[] = summary?.perPlayer ?? summary?.players ?? match.players ?? [];

      if (!players || !players.length) continue;

      const me =
        players.find(
          (p: any) =>
            p.profileId === profileId ||
            p.playerId === profileId ||
            p.id === profileId
        ) ?? null;

      if (!me) continue;

      const myKey = String(me.profileId ?? me.playerId ?? me.id ?? profileId);

      const detailedAll: any = summary?.detailedByPlayer ?? null;
      const detailedMe: any =
        detailedAll &&
        (detailedAll[myKey] ??
          detailedAll[me.profileId as any] ??
          detailedAll[me.playerId as any] ??
          detailedAll[me.id as any] ??
          detailedAll[String(me.profileId)] ??
          detailedAll[String(me.playerId)] ??
          detailedAll[String(me.id)]);

      multiSessions += 1;

      let isWinner = false;

      if (me.isWinner === true || me.winner === true) isWinner = true;
      if ([me.rank, me.place, me.position].some((v: any) => Number(v) === 1)) isWinner = true;
      if (typeof me.result === "string" && me.result.toLowerCase().startsWith("win")) isWinner = true;
      if (typeof me.outcome === "string" && me.outcome.toLowerCase().startsWith("win")) isWinner = true;

      if (!isWinner && Array.isArray(summary?.rankings)) {
        const r = summary.rankings.find((r: any) => {
          const rk = String(r.profileId ?? r.playerId ?? r.id ?? r.key ?? "");
          return rk === myKey;
        });
        if (r && [r.rank, r.place, r.position].some((v: any) => Number(v) === 1)) isWinner = true;
      }

      if (!isWinner && summary && summary.winnerId && String(summary.winnerId) === myKey) {
        isWinner = true;
      }

      if (detailedMe && !isWinner) {
        if ([detailedMe.rank, detailedMe.place, detailedMe.position].some((v: any) => Number(v) === 1)) isWinner = true;
        if (detailedMe.isWinner === true) isWinner = true;
        if (typeof detailedMe.result === "string" && detailedMe.result.toLowerCase().startsWith("win")) isWinner = true;
        if (typeof detailedMe.outcome === "string" && detailedMe.outcome.toLowerCase().startsWith("win")) isWinner = true;
      }

      if (isWinner) multiWins += 1;

      let myAvg3 =
        Number(me.avg3D ?? me.avg3 ?? me.stats?.avg3D ?? me.stats?.avg3 ?? 0) || 0;

      if ((!myAvg3 || myAvg3 <= 0) && summary?.avg3ByPlayer) {
        const av = (summary.avg3ByPlayer as any)[myKey];
        if (av != null) myAvg3 = Number(av) || 0;
      }

      if (myAvg3 > 0) {
        multiTotalAvg3 += myAvg3;
        multiTotalAvg3Count += 1;
      }

      const opponents = players.filter((p: any) => p !== me);
      let oppAvgSum = 0;
      let oppAvgCount = 0;
      for (const opp of opponents) {
        let oa =
          Number(opp.avg3D ?? opp.avg3 ?? opp.stats?.avg3D ?? opp.stats?.avg3 ?? 0) || 0;

        if ((!oa || oa <= 0) && summary?.avg3ByPlayer) {
          const ok = String(opp.profileId ?? opp.playerId ?? opp.id ?? "");
          const av = (summary.avg3ByPlayer as any)[ok];
          if (av != null) oa = Number(av) || 0;
        }

        if (oa > 0) {
          oppAvgSum += oa;
          oppAvgCount += 1;
        }
      }
      const oppAvg = oppAvgCount > 0 ? oppAvgSum / oppAvgCount : myAvg3 || avg3Base;

      if (myAvg3 > 0 && oppAvg > 0) {
        const diff = myAvg3 - oppAvg;
        const expected = 1 / (1 + Math.pow(10, -diff / 15));
        const result = isWinner ? 1 : 0;

        ratingMatches += 1;
        ratingSumResult += result;
        ratingSumExpected += expected;
      }

      let bv = Number(me.bestVisit ?? me.bestVisitScore ?? me.best_visit ?? 0) || 0;
      if ((!bv || bv <= 0) && summary?.bestVisitByPlayer) {
        const v = (summary.bestVisitByPlayer as any)[myKey];
        if (v != null) bv = Number(v) || 0;
      }
      if (bv > multiBestVisit) multiBestVisit = bv;

      let bco =
        Number(
          me.bestCheckout ??
            me.bestCO ??
            me.bestCo ??
            me.bestFinish ??
            me.best_checkout ??
            me.stats?.bestCO ??
            me.stats?.bestCo ??
            0
        ) || 0;

      if ((!bco || bco <= 0) && summary?.bestCheckoutByPlayer) {
        const v = (summary.bestCheckoutByPlayer as any)[myKey];
        if (v != null) bco = Number(v) || 0;
      }
      if (bco > multiBestCheckout) multiBestCheckout = bco;

      const dartsCandidates: number[] = [];
      const addD = (v: any) => {
        const n = Number(v);
        if (!Number.isNaN(n) && n > 0) dartsCandidates.push(n);
      };

      addD(me.minDarts);
      addD(me.minDarts501);
      addD(me.bestLegDarts);
      addD(me.fastestLeg);
      addD(me.best_leg_darts);
      addD(summary?.minDarts501);
      addD((match as any).totalDarts501);

      if (summary?.minDartsByPlayer) {
        const v = (summary.minDartsByPlayer as any)[myKey];
        addD(v);
      }

      if (dartsCandidates.length > 0) {
        const localMin = Math.min(...dartsCandidates);
        if (localMin > 0 && localMin < multiMinDarts) multiMinDarts = localMin;
      }

      if ((me as any).hitsBySegment) accumulateHitsBySegment((me as any).hitsBySegment);
      if (detailedMe && detailedMe.hitsBySegment) accumulateHitsBySegment(detailedMe.hitsBySegment);
      if ((summary as any).hitsBySegment) accumulateHitsBySegment((summary as any).hitsBySegment);

      if (isWinner) {
        currentStreak += 1;
        if (currentStreak > bestWinStreak) bestWinStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    const hasMulti = multiSessions > 0;

    if (!hasMulti && gamesBase > 0) {
      multiSessions = gamesBase;
      multiWins = winsBase;
      if (avg3Base > 0) {
        multiTotalAvg3 = avg3Base * gamesBase;
        multiTotalAvg3Count = gamesBase;
      }
      if (!multiBestVisit && bestVisitBase > 0) multiBestVisit = bestVisitBase;
      if (!multiBestCheckout && bestCheckoutBase > 0) multiBestCheckout = bestCheckoutBase;
      if (multiMinDarts === Infinity && minDartsRecordBase > 0) multiMinDarts = minDartsRecordBase;
    }

    const globalSessions = hasMulti ? multiSessions : gamesBase;

    const globalAvg3 =
      multiTotalAvg3Count > 0 ? multiTotalAvg3 / multiTotalAvg3Count : avg3Base;

    const globalWinRate =
      winRate01Base > 0
        ? winRate01Base
        : hasMulti && multiSessions > 0
        ? multiWins / multiSessions
        : 0;

    const x01MultiAvg3D = globalAvg3;
    const x01MultiWinrate = globalWinRate;

    const x01MultiMinDartsLabel =
      multiMinDarts !== Infinity
        ? `${multiMinDarts}`
        : minDartsRecordBase > 0
        ? `${minDartsRecordBase}`
        : null;

    let ratingGlobal = 1.0;

    if (ratingMatches > 0) {
      const expectedPerMatch = ratingSumExpected / ratingMatches;
      const resultPerMatch = ratingSumResult / ratingMatches;
      const overPerf = resultPerMatch - expectedPerMatch;
      ratingGlobal = 1 + overPerf * 0.8;
    } else if (globalSessions > 0) {
      const overPerf = globalWinRate - 0.5;
      ratingGlobal = 1 + overPerf * 1.0;
    }

    if (ratingGlobal < 0.5) ratingGlobal = 0.5;
    if (ratingGlobal > 1.5) ratingGlobal = 1.5;

    let favoriteNumberLabel: string | null = null;
    if (Object.keys(favHitsGlobal).length > 0) {
      const sorted = Object.entries(favHitsGlobal).sort((a, b) => b[1] - a[1]);
      favoriteNumberLabel = sorted[0][0] || null;
    }

    const recordBestVisitX01 = Math.max(multiBestVisit, bestVisitBase);
    const recordBestCOX01 = Math.max(multiBestCheckout, bestCheckoutBase);

    const recordMinDartsGlobal = multiMinDarts !== Infinity ? multiMinDarts : 0;
    const recordMinDarts501 = recordMinDartsGlobal || minDartsRecordBase || 0;

    const recordBestAvg3DX01 = Math.max(x01MultiAvg3D, avg3Base);

    const tAgg = loadTrainingAggForProfile(profileId);
    const trainingAvg3D = tAgg.sessions > 0 ? tAgg.sumAvg3D / tAgg.sessions : 0;

    const cricketMatches = Number(cricket?.matchesTotal ?? 0);
    const cricketBestPoints = Number(cricket?.bestPointsInMatch ?? 0);
    const cricketWinsTotal = Number(cricket?.winsTotal ?? 0);
    const cricketWinRate =
      cricketMatches > 0 ? cricketWinsTotal / cricketMatches : 0;

    const cAgg = loadClockAggForProfile(profileId);
    const clockTargetsHit = cAgg.targetsHitTotal;
    const clockSuccessRate =
      cAgg.attemptsTotal > 0 ? cAgg.targetsHitTotal / cAgg.attemptsTotal : 0;
    const clockTotalTimeSec = cAgg.totalTimeSec;
    const clockBestStreak = cAgg.bestStreak;

    const killerAgg = computeKillerAggFromMatches(multiMatches, profileId);

    const s: ActiveProfileStats = {
      ratingGlobal,
      winrateGlobal: globalWinRate,
      avg3DGlobal: globalAvg3,
      sessionsGlobal: globalSessions,
      favoriteNumberLabel,

      recordBestVisitX01,
      recordBestCOX01,
      recordMinDarts501: recordMinDarts501 > 0 ? recordMinDarts501 : null,
      recordBestAvg3DX01,
      recordBestStreak: bestWinStreak > 0 ? bestWinStreak : null,
      recordBestCricketScore: cricketBestPoints || null,

      onlineMatches: 0,
      onlineWinrate: 0,
      onlineAvg3D: 0,
      onlineBestVisit: 0,
      onlineBestCO: 0,
      onlineRank: null,
      onlineBestRank: null,

      x01MultiAvg3D,
      x01MultiSessions: globalSessions,
      x01MultiWinrate,
      x01MultiBestVisit: recordBestVisitX01,
      x01MultiBestCO: recordBestCOX01,
      x01MultiMinDartsLabel,

      cricketPointsPerRound: cricketBestPoints || 0,
      cricketHitsTotal: cricketMatches || 0,
      cricketCloseRate: cricketWinRate || 0,
      cricketLegsWinrate: cricketWinRate || 0,
      cricketAvgClose201918: 0,
      cricketOpenings: cricketMatches || 0,

      trainingAvg3D,
      trainingHitsS: tAgg.hitsS || 0,
      trainingHitsD: tAgg.hitsD || 0,
      trainingHitsT: tAgg.hitsT || 0,
      trainingGoalSuccessRate: 0,
      trainingBestCO: tAgg.bestCheckout ?? 0,

      clockTargetsHit,
      clockSuccessRate,
      clockTotalTimeSec,
      clockBestStreak,
    };

    // ✅ Attache les stats KILLER (sans toucher au type ActiveProfileStats)
    ;(s as any).killerSessions = killerAgg.sessions;
    ;(s as any).killerWins = killerAgg.wins;
    ;(s as any).killerWinrate = killerAgg.winRate01;
    ;(s as any).killerKills = killerAgg.kills;
    ;(s as any).killerTotalHits = killerAgg.totalHits;
    ;(s as any).killerFavNumberHits = killerAgg.favNumberHits;
    ;(s as any).killerFavSegmentHits = killerAgg.favSegmentHits;

    return s;
  } catch (err) {
    console.warn("[Home] buildStatsForProfile error, fallback zeros:", err);
    return emptyActiveProfileStats();
  }
}

/* ============================================================
   Helpers pour les détails du ticker
============================================================ */

type DetailRow = { label: string; value: string };

function fmtNumHome(v?: number | null, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const n = Number(v);
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}
function fmtPctHome01(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

function buildTickerDetailRows(
  tickerId: string,
  s: ActiveProfileStats,
  t: (k: string, d?: string) => string
): DetailRow[] {
  const rows: DetailRow[] = [];

  const trainingHitsTotal =
    (s.trainingHitsS ?? 0) + (s.trainingHitsD ?? 0) + (s.trainingHitsT ?? 0);

  const killerSessions = Number((s as any)?.killerSessions ?? 0) || 0;
  const killerWinrate01 = Number((s as any)?.killerWinrate ?? 0) || 0;
  const killerKills = Number((s as any)?.killerKills ?? 0) || 0;
  const killerTotalHits = Number((s as any)?.killerTotalHits ?? 0) || 0;
  const killerFavNumberHits = Number((s as any)?.killerFavNumberHits ?? 0) || 0;
  const killerFavSegmentHits = Number((s as any)?.killerFavSegmentHits ?? 0) || 0;

  switch (tickerId) {
    case "last-records": {
      const snap = getRecordSnapshotFromStats(s);

      if (snap.bestVisit > 0) {
        rows.push({
          label: t("home.detail.bestVisit", "best visit x01"),
          value: fmtNumHome(snap.bestVisit, 0),
        });
      }
      if (snap.bestCo > 0) {
        rows.push({
          label: t("home.detail.bestCO", "best checkout"),
          value: fmtNumHome(snap.bestCo, 0),
        });
      }
      if (snap.bestAvg > 0) {
        rows.push({
          label: t("home.detail.bestAvg3d", "best avg 3d"),
          value: fmtNumHome(snap.bestAvg, 2),
        });
      }
      if (snap.minDarts > 0) {
        rows.push({
          label: t("home.detail.bestMinDarts", "leg le plus court"),
          value: fmtNumHome(snap.minDarts, 0),
        });
      }
      break;
    }

    case "last-local-match": {
      const sessions = s.x01MultiSessions ?? 0;
      if (sessions > 0) {
        rows.push(
          {
            label: t("home.detail.localSessions", "matchs X01 multi"),
            value: fmtNumHome(sessions, 0),
          },
          {
            label: t("home.detail.localWinrate", "win% local"),
            value: fmtPctHome01(s.x01MultiWinrate ?? 0),
          },
          {
            label: t("home.detail.localAvg3d", "moy. 3d"),
            value: fmtNumHome(s.x01MultiAvg3D, 2),
          },
          {
            label: t("home.detail.localBestVisit", "best visit"),
            value: fmtNumHome(s.x01MultiBestVisit, 0),
          },
          {
            label: t("home.detail.localBestCO", "best co"),
            value: fmtNumHome(s.x01MultiBestCO, 0),
          }
        );

        const snap = getRecordSnapshotFromStats(s);
        const minDarts =
          s.x01MultiMinDartsLabel && Number(s.x01MultiMinDartsLabel) > 0
            ? Number(s.x01MultiMinDartsLabel)
            : snap.minDarts;

        if (minDarts > 0) {
          rows.push({
            label: t("home.detail.localMinDarts", "min darts"),
            value: fmtNumHome(minDarts, 0),
          });
        }
      }
      break;
    }

    case "training-summary": {
      if (trainingHitsTotal > 0) {
        rows.push(
          {
            label: t("home.detail.trainingHits", "hits total"),
            value: fmtNumHome(trainingHitsTotal, 0),
          },
          {
            label: t("home.detail.trainingAvg3d", "moy. 3d"),
            value: fmtNumHome(s.trainingAvg3D ?? 0, 2),
          },
          {
            label: t("home.detail.trainingHitsS", "hits S"),
            value: fmtNumHome(s.trainingHitsS ?? 0, 0),
          },
          {
            label: t("home.detail.trainingHitsD", "hits D"),
            value: fmtNumHome(s.trainingHitsD ?? 0, 0),
          },
          {
            label: t("home.detail.trainingHitsT", "hits T"),
            value: fmtNumHome(s.trainingHitsT ?? 0, 0),
          },
          {
            label: t("home.detail.trainingBestCO", "best co"),
            value: fmtNumHome(s.trainingBestCO ?? 0, 0),
          }
        );
      }
      break;
    }

    case "killer-summary": {
      // ✅ IMPORTANT: on l’affiche même si 0 (comme ça tu le vois toujours)
      rows.push(
        {
          label: t("home.detail.killerSessions", "sessions killer"),
          value: fmtNumHome(killerSessions, 0),
        },
        {
          label: t("home.detail.killerWinrate", "win% killer"),
          value: fmtPctHome01(killerWinrate01),
        },
        {
          label: t("home.detail.killerKills", "kills"),
          value: fmtNumHome(killerKills, 0),
        },
        {
          label: t("home.detail.killerHits", "hits total"),
          value: fmtNumHome(killerTotalHits, 0),
        },
        {
          label: t("home.detail.killerFavNumberHits", "hits n° favori"),
          value: fmtNumHome(killerFavNumberHits, 0),
        },
        {
          label: t("home.detail.killerFavSegmentHits", "hits segment favori"),
          value: fmtNumHome(killerFavSegmentHits, 0),
        }
      );
      break;
    }

    case "month-summary": {
      const sessions = s.sessionsGlobal ?? 0;
      if (sessions > 0) {
        rows.push(
          {
            label: t("home.detail.globalSessions", "sessions totales"),
            value: fmtNumHome(sessions, 0),
          },
          {
            label: t("home.detail.globalWinrate", "win%"),
            value: fmtPctHome01(s.winrateGlobal ?? 0),
          },
          {
            label: t("home.detail.globalAvg3d", "moy. 3d"),
            value: fmtNumHome(s.avg3DGlobal ?? 0, 2),
          },
          {
            label: t("home.detail.rating", "rating"),
            value: fmtNumHome(s.ratingGlobal ?? 0, 1),
          }
        );
      }
      break;
    }

    case "last-online-match":
    case "online-leader":
    case "tip-of-day":
    default:
      break;
  }

  return rows;
}

/* ============================================================
   Blocs visuels pour les 2 mini-cards
============================================================ */

function pickStatsBackgroundForTicker(tickerId: string, seed: string): string {
  switch (tickerId) {
    case "last-records":
      return pickTickerImage("leaderboard", seed);
    case "last-local-match":
      return pickTickerImage("training", seed);
    case "last-online-match":
      return pickTickerImage("leaderboard", seed);
    case "online-leader":
      return pickTickerImage("onlineLast", seed);
    case "training-summary":
      return pickTickerImage("global", seed);
    case "killer-summary":
      return pickTickerImage("local", seed);
    case "month-summary":
      return pickTickerImage("training", seed);
    case "tip-of-day":
    default:
      return pickTickerImage("global", seed);
  }
}

type TipSlide = {
  id: string;
  kind: "tip" | "ad" | "news";
  title: string;
  text: string;
  backgroundImage: keyof typeof TICKER_IMAGES;

  version?: number;
  since?: string;
  forceNew?: boolean;
  hot?: boolean; // ✅ AJOUT
};

function buildTipSlides(t: (k: string, d?: string) => string): TipSlide[] {
  return [
    {
      id: "tip-training",
      version: 1,
      kind: "tip",
      title: t("home.tip.training.title", "Astuce Training X01"),
      text: t(
        "home.tip.training.text",
        "Travaille toujours la même finition pendant quelques minutes, puis change de cible pour rester focus."
      ),
      backgroundImage: "tipAdvice",
      since: "2025-12-01",
    },
    {
      id: "tip-bots",
      version: 1,
      kind: "ad",
      title: t("home.tip.bots.title", "Crée un BOT local"),
      text: t(
        "home.tip.bots.text",
        "Ajoute un BOT dans tes profils pour t’entraîner en conditions réelles, même si tu es seul."
      ),
      backgroundImage: "tipAds",
      since: "2025-12-10",
    },
    {
      id: "tip-news",
      version: 2,
      hot: true, // 🔥 HOT forcé
      kind: "news",
      title: t("home.tip.news.title", "GROSSES NOUVEAUTÉS"),
      text: t(
        "home.tip.news.text",
        "Online, Killer, Tournois, Stats avancées… l’app a pris un énorme niveau."
      ),
      backgroundImage: "tipNews",
      since: "2025-12-22",
    },
    {
      id: "tip-clock",
      version: 1,
      kind: "tip",
      title: t("home.tip.clock.title", "Astuce Tour de l’Horloge"),
      text: t(
        "home.tip.clock.text",
        "Sur le Tour de l’Horloge, vise toujours un repère visuel précis sur le segment."
      ),
      backgroundImage: "tipAdvice",
      since: "2025-12-15",
    },
    {
      id: "tip-stats",
      version: 2,
      kind: "news",
      title: t("home.tip.stats.title", "Stats nouvelle génération"),
      text: t(
        "home.tip.stats.text",
        "Dashboards, Killer, Cricket, Training : tout est maintenant centralisé."
      ),
      backgroundImage: "tipNews",
      since: "2025-12-24",
    },
  ];
}

/* ============================================================
   BADGES (NEW / HOT) — helpers (VERSIONNÉ)
   - NEW : pas vu OU version a augmenté OU forceNew
   - HOT : booléen hot (prioritaire)
============================================================ */

const HOME_TIP_SEEN_KEY = "dc_home_tip_seen_v1";

type TipSeenMap = Record<string, number>; // id -> lastSeenVersion

function loadTipSeenMap(): TipSeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HOME_TIP_SEEN_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as TipSeenMap) : {};
  } catch {
    return {};
  }
}

function saveTipSeenMap(map: TipSeenMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOME_TIP_SEEN_KEY, JSON.stringify(map));
  } catch {}
}

function tipIdOf(tip: any): string {
  return String(tip?.id ?? "").trim();
}

function tipVersionOf(tip: any): number {
  const v = Number(tip?.version ?? 1);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

// ✅ HOT simple (prioritaire)
function shouldShowHotBadge(tip: any): boolean {
  return !!tip?.hot;
}

// ✅ NEW si pas vu OU version a augmenté OU forceNew
function shouldShowNewBadge(tip: any): boolean {
  if (!tip) return false;
  const id = tipIdOf(tip);
  if (!id) return false;

  if (tip?.forceNew === true) return true;

  const seen = loadTipSeenMap();
  const lastSeenV = Number(seen[id] ?? 0) || 0;
  const v = tipVersionOf(tip);

  return v > lastSeenV;
}

// ✅ Marque le tip comme “vu” (au niveau version)
function markTipSeen(tip: any) {
  if (!tip) return;
  const id = tipIdOf(tip);
  if (!id) return;

  const v = tipVersionOf(tip);
  const seen = loadTipSeenMap();
  const lastSeenV = Number(seen[id] ?? 0) || 0;

  if (lastSeenV >= v) return;

  seen[id] = v;
  saveTipSeenMap(seen);
}

// Badge NEW
function BadgeNew({ theme }: { theme: any }) {
  const c = theme?.accent1 ?? "#FFD980";
  return (
    <div
      style={{
        padding: "2px 7px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: "#061018",
        background: `linear-gradient(135deg, ${c}, #ffffff)`,
        boxShadow: `0 0 10px ${c}66`,
        border: `1px solid ${c}`,
        flexShrink: 0,
      }}
    >
      NEW
    </div>
  );
}

// Badge HOT
function BadgeHot({ theme }: { theme: any }) {
  const c = theme?.accent2 ?? theme?.primary ?? "#FF7A18";
  return (
    <div
      style={{
        padding: "2px 7px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: "#120600",
        background: `linear-gradient(135deg, ${c}, #ffffff)`,
        boxShadow: `0 0 10px ${c}66`,
        border: `1px solid ${c}`,
        flexShrink: 0,
      }}
    >
      HOT
    </div>
  );
}

/* ============================================================
   ✅ LIVE CONTENT (Feed JSON + Changelog + Contextuel)
============================================================ */

type TipKind = "tip" | "ad" | "news";

type LiveTipSlide = {
  id: string;
  kind: TipKind;
  title: string;
  text: string;
  imageKey: keyof typeof TICKER_IMAGES;
  weight?: number;

  // ✅ badges
  version?: number;
  forceNew?: boolean;
  hot?: boolean; // ✅ IMPORTANT
};

type HomeFeedItem = {
  id: string;
  kind?: TipKind;
  title: string;
  text: string;
  imageKey?: keyof typeof TICKER_IMAGES;
  since?: string; // YYYY-MM-DD
  until?: string; // YYYY-MM-DD
  weight?: number;
};

type ChangelogEntry = {
  id: string;
  date?: string; // YYYY-MM-DD
  title: string;
  bullets?: string[];
};

function safeParseDateStr(d?: string): number | null {
  if (!d || typeof d !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const ts = Date.UTC(y, mo, da, 0, 0, 0, 0);
  return Number.isFinite(ts) ? ts : null;
}

function getTodayKey(): string {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "1970-01-01";
  }
}

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    return data ?? null;
  } catch {
    return null;
  }
}

function normalizeKind(k: any): TipKind {
  const s = String(k ?? "").toLowerCase();
  if (s === "ad") return "ad";
  if (s === "news") return "news";
  return "tip";
}

function isWithinRange(item: HomeFeedItem, todayUtc: number): boolean {
  const since = safeParseDateStr(item.since);
  const until = safeParseDateStr(item.until);
  if (since != null && todayUtc < since) return false;
  if (until != null && todayUtc > until) return false;
  return true;
}

function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = hashStringToInt(seed);
  for (let i = a.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function buildFeedSlides(feedItems: HomeFeedItem[]): LiveTipSlide[] {
  const todayUtc = safeParseDateStr(getTodayKey()) ?? Date.UTC(1970, 0, 1);
  const items = Array.isArray(feedItems) ? feedItems : [];

  const filtered = items
    .filter((it) => it && typeof it === "object")
    .filter((it) => String(it.id ?? "").trim())
    .filter((it) => String(it.title ?? "").trim() && String(it.text ?? "").trim())
    .filter((it) => isWithinRange(it, todayUtc))
    .map((it) => {
      const imageKey = (it.imageKey ?? "tipNews") as keyof typeof TICKER_IMAGES;
      const weight = Number(it.weight ?? 3) || 3;
      return {
        id: `feed-${it.id}`,
        kind: normalizeKind(it.kind),
        title: String(it.title).trim(),
        text: String(it.text).trim(),
        imageKey,
        weight,
      } as LiveTipSlide;
    });

  filtered.sort(
    (a, b) =>
      (Number(b.weight ?? 0) - Number(a.weight ?? 0)) ||
      a.title.localeCompare(b.title)
  );

  return filtered;
}

function buildChangelogSlides(
  t: (k: string, d?: string) => string,
  entries: ChangelogEntry[]
): LiveTipSlide[] {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return [];

  const sorted = [...list].sort((a, b) => {
    const ta = safeParseDateStr(a.date ?? "") ?? 0;
    const tb = safeParseDateStr(b.date ?? "") ?? 0;
    return tb - ta;
  });

  return sorted.slice(0, 3).map((e, idx) => {
    const bullets = Array.isArray(e.bullets) ? e.bullets.filter(Boolean) : [];
    const text =
      bullets.length > 0
        ? bullets.slice(0, 4).map((x) => `• ${x}`).join("\n")
        : t("home.changelog.empty", "Améliorations et correctifs divers.");

    const dateStr = String(e.date ?? "").trim();
    const title = dateStr
      ? `${t("home.changelog.title", "Patch notes")} — ${dateStr}`
      : t("home.changelog.title", "Patch notes");

    return {
      id: `changelog-${e.id ?? idx}`,
      kind: "news",
      title,
      text: `${String(e.title ?? "").trim()}\n${text}`.trim(),
      imageKey: "tipNews",
      weight: 9 - idx,

      // ✅ TEST IMMÉDIAT : badge visible
      hot: true,
      forceNew: true,
      version: 1,
    } as LiveTipSlide;
  });
}

function buildContextualSlides(
  t: (k: string, d?: string) => string,
  profile: Profile | null,
  s: ActiveProfileStats
): LiveTipSlide[] {
  const slides: LiveTipSlide[] = [];
  const pid = String(profile?.id ?? "anon");

  const sessionsGlobal = Number(s.sessionsGlobal ?? 0) || 0;
  const x01MultiSessions = Number(s.x01MultiSessions ?? 0) || 0;
  const trainingHitsTotal =
    (Number(s.trainingHitsS ?? 0) || 0) +
    (Number(s.trainingHitsD ?? 0) || 0) +
    (Number(s.trainingHitsT ?? 0) || 0);

  const onlineMatches = Number(s.onlineMatches ?? 0) || 0;
  const clockTargets = Number(s.clockTargetsHit ?? 0) || 0;

  const killerSessions = Number((s as any)?.killerSessions ?? 0) || 0;

  if (sessionsGlobal <= 0 && x01MultiSessions <= 0 && trainingHitsTotal <= 0) {
    slides.push({
      id: `ctx-start-${pid}`,
      kind: "tip",
      title: t("home.ctx.start.title", "Démarre en 30 secondes"),
      text: t(
        "home.ctx.start.text",
        "Lance un match X01 en local : ça crée tes premiers records et rend le dashboard vivant."
      ),
      imageKey: "tipAdvice",
      weight: 10,
    });
  }

  if (trainingHitsTotal <= 0) {
    slides.push({
      id: `ctx-training-${pid}`,
      kind: "tip",
      title: t("home.ctx.training.title", "Training conseillé"),
      text: t(
        "home.ctx.training.text",
        "Fais 5 minutes sur une même finition (ex: D16), puis change : progression rapide."
      ),
      imageKey: "tipAdvice",
      weight: 7,
    });
  }

  if (clockTargets <= 0) {
    slides.push({
      id: `ctx-clock-${pid}`,
      kind: "tip",
      title: t("home.ctx.clock.title", "Essaye le Tour de l’Horloge"),
      text: t(
        "home.ctx.clock.text",
        "Mode parfait pour travailler la régularité : vise un repère précis sur chaque segment."
      ),
      imageKey: "tipAdvice",
      weight: 5,
    });
  }

  if (onlineMatches <= 0) {
    slides.push({
      id: `ctx-online-${pid}`,
      kind: "news",
      title: t("home.ctx.online.title", "Défis online"),
      text: t(
        "home.ctx.online.text",
        "Crée un salon et envoie le code à un ami : la Home suivra tes stats online."
      ),
      imageKey: "tipNews",
      weight: 4,
    });
  }

  if (killerSessions <= 0) {
    slides.push({
      id: `ctx-killer-${pid}`,
      kind: "tip",
      title: t("home.ctx.killer.title", "Teste le mode Killer"),
      text: t(
        "home.ctx.killer.text",
        "Rapide, fun, idéal à plusieurs : 1 partie suffit pour activer tes stats Killer."
      ),
      imageKey: "tipAdvice",
      weight: 4,
    });
  }

  const fav = (s as any)?.favoriteNumberLabel ?? null;
  if (fav) {
    slides.push({
      id: `ctx-fav-${pid}`,
      kind: "tip",
      title: t("home.ctx.fav.title", "Ton segment du moment"),
      text: t(
        "home.ctx.fav.text",
        `Tu touches souvent ${String(fav)} : utilise-le comme repère pour tes finishes.`
      ),
      imageKey: "tipAdvice",
      weight: 3,
    });
  }

  return slides;
}

function buildLiveTipSlides(args: {
  t: (k: string, d?: string) => string;
  profile: Profile | null;
  stats: ActiveProfileStats;
  feedItems: HomeFeedItem[];
  changelogEntries: ChangelogEntry[];
}): LiveTipSlide[] {
  const { t, profile, stats, feedItems, changelogEntries } = args;

  // base fallback = tes slides actuels (on les conserve)
  const fallback: LiveTipSlide[] = buildTipSlides(t).map((x) => ({
    id: x.id,
    kind: x.kind,
    title: x.title,
    text: x.text,
    imageKey: x.backgroundImage,
    weight: 2,
  
    // ✅ PROPAGATION BADGES
    version: Number((x as any).version ?? 1) || 1,
    forceNew: (x as any).forceNew === true,
    hot: (x as any).hot === true,
  }));

  const ctx = buildContextualSlides(t, profile, stats);
  const ch = buildChangelogSlides(t, changelogEntries);
  const feed = buildFeedSlides(feedItems);

  const picked: LiveTipSlide[] = [];
  const seen = new Set<string>();
  const pushUnique = (s: LiveTipSlide) => {
    if (!s?.id || seen.has(s.id)) return;
    seen.add(s.id);
    picked.push(s);
  };

  // 1) changelog (max 2)
  for (const s of ch.slice(0, 2)) pushUnique(s);

  // 2) feed (max 4)
  for (const s of feed.slice(0, 4)) pushUnique(s);

  // 3) context (max 6)
  for (const s of ctx.slice(0, 6)) pushUnique(s);

  // 4) fallback si pas assez
  for (const s of fallback) {
    if (picked.length >= 8) break;
    pushUnique(s);
  }

  // ordre vivant stable / jour
  const dayKey = getTodayKey();
  const seed = `${String(profile?.id ?? "anon")}::homeTips::${dayKey}`;

  const withWeights = [...picked].sort(
    (a, b) => Number(b.weight ?? 0) - Number(a.weight ?? 0)
  );

  const head = withWeights.slice(0, 2);
  const tail = deterministicShuffle(withWeights.slice(2), seed);

  return [...head, ...tail];
}

/* ============================================================
   Petit bloc KPI pour le détail du ticker
============================================================ */

type DetailKpiProps = {
  label: string;
  value: string;
  primary: string;
  theme: any;
};

function DetailKpi({ label, value, primary, theme }: DetailKpiProps) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "6px 8px 8px",
        background:
          "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.06), rgba(5,7,16,0.96))",
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.18)"}`,
        boxShadow: "0 10px 22px rgba(0,0,0,0.75)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 0.4,
          opacity: 0.8,
          marginBottom: 3,
          textTransform: "lowercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 2,
          width: 26,
          borderRadius: 999,
          marginBottom: 4,
          background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
          boxShadow: `0 0 6px ${primary}66`,
        }}
      />
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: primary,
          lineHeight: 1.1,
          whiteSpace: "pre-line",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getRecordSnapshotFromStats(s: ActiveProfileStats) {
  const bestVisit = s.recordBestVisitX01 || s.x01MultiBestVisit || 0;
  const bestCo = s.recordBestCOX01 || s.x01MultiBestCO || 0;
  const bestAvg = s.recordBestAvg3DX01 || s.x01MultiAvg3D || 0;
  const minDarts =
    s.recordMinDarts501 ??
    (s.x01MultiMinDartsLabel ? Number(s.x01MultiMinDartsLabel) : 0);

  return { bestVisit, bestCo, bestAvg, minDarts };
}

function buildArcadeItems(
  _store: Store,
  profile: Profile | null,
  stats: ActiveProfileStats | null | undefined,
  t: (k: string, d?: string) => string
): ArcadeTickerItem[] {
  const items: ArcadeTickerItem[] = [];
  const s: ActiveProfileStats = stats ?? emptyActiveProfileStats();
  const seed = String(profile?.id ?? "anon");

  const sessionsGlobal = s.sessionsGlobal ?? 0;
  const winrateGlobalPct =
    s.winrateGlobal != null ? Math.round(s.winrateGlobal * 100) : null;

  const x01MultiSessions = s.x01MultiSessions ?? 0;

  const onlineMatches = s.onlineMatches ?? 0;
  const onlineWinratePct =
    s.onlineWinrate != null ? Math.round(s.onlineWinrate * 100) : null;
  const onlineBestRank = s.onlineBestRank ?? s.onlineRank ?? null;

  const trainingHitsTotal =
    (s.trainingHitsS ?? 0) + (s.trainingHitsD ?? 0) + (s.trainingHitsT ?? 0);
  const trainingGoalPct =
    s.trainingGoalSuccessRate != null
      ? Math.round(s.trainingGoalSuccessRate * 100)
      : null;

  const clockTargets = s.clockTargetsHit ?? 0;

  const recordSnap = getRecordSnapshotFromStats(s);

  const hasRecordX01 =
    recordSnap.bestVisit > 0 ||
    recordSnap.bestCo > 0 ||
    recordSnap.bestAvg > 0 ||
    recordSnap.minDarts > 0;

  const killerSessions = Number((s as any)?.killerSessions ?? 0) || 0;
  const killerWinratePct =
    (s as any)?.killerWinrate != null
      ? Math.round(Number((s as any).killerWinrate || 0) * 100)
      : null;
  const killerKills = Number((s as any)?.killerKills ?? 0) || 0;

  items.push({
    id: "last-records",
    title: t("home.ticker.records", "Derniers records"),
    text: hasRecordX01
      ? t(
          "home.ticker.records.text.dynamic",
          "Plusieurs records X01 déjà enregistrés sur ce profil."
        )
      : t(
          "home.ticker.records.text.empty",
          "Aucun record pour l’instant, lance un premier match pour en créer."
        ),
    detail: hasRecordX01
      ? [
          recordSnap.bestVisit ? `Best visit : ${recordSnap.bestVisit}` : null,
          recordSnap.bestCo ? `Best CO : ${recordSnap.bestCo}` : null,
          recordSnap.minDarts ? `Min darts : ${recordSnap.minDarts}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "",
    backgroundImage: pickTickerImage("records", `${seed}::last-records`),
    accentColor: "#F6C256",
  });

  items.push({
    id: "last-local-match",
    title: t("home.ticker.localLast", "Dernier match local"),
    text:
      x01MultiSessions > 0
        ? t(
            "home.ticker.localLast.text.dynamic",
            `Tu as déjà joué ${x01MultiSessions} matchs X01 multi en local.`
          )
        : t(
            "home.ticker.localLast.text.empty",
            "Aucun match local pour l’instant, invite des amis et lance une partie."
          ),
    detail: x01MultiSessions > 0 ? `${x01MultiSessions} matchs X01 multi` : "",
    backgroundImage: pickTickerImage("local", `${seed}::last-local-match`),
    accentColor: "#52FFC4",
  });

  items.push({
    id: "last-online-match",
    title: t("home.ticker.onlineLast", "Dernier match online"),
    text:
      onlineMatches > 0
        ? t(
            "home.ticker.onlineLast.text.dynamic",
            `Tu as joué ${onlineMatches} matchs online.`
          )
        : t(
            "home.ticker.onlineLast.text.empty",
            "Aucun duel online pour l’instant, crée un salon pour affronter tes amis."
          ),
    detail:
      onlineMatches > 0
        ? [
            `${onlineMatches} matchs`,
            onlineWinratePct != null ? `${onlineWinratePct}% de victoires` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "",
    backgroundImage: pickTickerImage("onlineLast", `${seed}::last-online-match`),
    accentColor: "#5ED3FF",
  });

  items.push({
    id: "online-leader",
    title: t("home.ticker.onlineLeader", "Leader du classement"),
    text:
      onlineBestRank != null
        ? t(
            "home.ticker.onlineLeader.text.dynamic",
            `Ton meilleur rang online est #${onlineBestRank}.`
          )
        : t(
            "home.ticker.onlineLeader.text.empty",
            "Monte dans le classement en enchaînant les victoires online."
          ),
    backgroundImage: pickTickerImage("leaderboard", `${seed}::online-leader`),
    accentColor: "#FF5E9E",
  });

  items.push({
    id: "training-summary",
    title: t("home.ticker.training", "Training du moment"),
    text:
      trainingHitsTotal > 0
        ? t(
            "home.ticker.training.text.dynamic",
            `Tu as déjà enregistré ${trainingHitsTotal} hits en Training X01.`
          )
        : t(
            "home.ticker.training.text.empty",
            "Aucun Training X01 enregistré, lance une session pour travailler tes segments."
          ),
    detail:
      trainingHitsTotal > 0 && trainingGoalPct != null
        ? `Objectifs réussis : ${trainingGoalPct}%`
        : "",
    backgroundImage: pickTickerImage("training", `${seed}::training-summary`),
    accentColor: "#9EFF5E",
  });

  // ✅ NEW: KILLER dans le ticker (toujours présent)
  items.push({
    id: "killer-summary",
    title: t("home.ticker.killer", "Killer du moment"),
    text:
      killerSessions > 0
        ? t(
            "home.ticker.killer.text.dynamic",
            `Tu as joué ${killerSessions} parties Killer sur ce profil.`
          )
        : t(
            "home.ticker.killer.text.empty",
            "Aucune partie Killer enregistrée pour l’instant, lance un match pour remplir tes stats."
          ),
    detail:
      killerSessions > 0
        ? [
            `${killerSessions} parties`,
            killerWinratePct != null ? `${killerWinratePct}% win` : null,
            killerKills > 0 ? `${killerKills} kills` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "",
    backgroundImage: pickTickerImage("local", `${seed}::killer-summary`),
    accentColor: "#FF7A18",
  });

  items.push({
    id: "month-summary",
    title: t("home.ticker.month", "Stats du profil"),
    text:
      sessionsGlobal > 0
        ? t(
            "home.ticker.month.text.dynamic",
            `Ce profil a enregistré ${sessionsGlobal} sessions au total.`
          )
        : t(
            "home.ticker.month.text.empty",
            "Aucune session enregistrée, commence par un match X01 ou un training."
          ),
    detail: [
      sessionsGlobal > 0 ? `${sessionsGlobal} sessions` : null,
      winrateGlobalPct != null ? `${winrateGlobalPct}% de victoires` : null,
      clockTargets > 0 ? `${clockTargets} cibles à l’Horloge` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    backgroundImage: pickTickerImage("global", `${seed}::month-summary`),
    accentColor: "#F6C256",
  });

  if (profile) {
    items.push({
      id: "tip-of-day",
      title: t("home.ticker.tip", "Astuce du jour"),
      text: t(
        "home.ticker.tip.text",
        "Ancre ta finition préférée en la rejouant régulièrement."
      ),
      backgroundImage: pickTickerImage("tip", `${seed}::tip-of-day`),
      accentColor: "#FFFFFF",
    });
  }

  return items;
}

function ensureKillerTickerItemFirst(
  list: ArcadeTickerItem[],
  t: (k: string, d?: string) => string,
  _themePrimary?: string
): ArcadeTickerItem[] {
  const items = Array.isArray(list) ? [...list] : [];

  const killerFallback: ArcadeTickerItem = {
    id: "killer-summary",
    title: t("home.ticker.killer", "Killer du moment"),
    text: t(
      "home.ticker.killer.text.empty",
      "Aucune partie Killer enregistrée pour l’instant, lance un match pour remplir tes stats."
    ),
    detail: "",
    backgroundImage: pickTickerImage("local", "killer-fallback"),
    accentColor: "#FF7A18",
  };

  const existing = items.find((it) => it?.id === "killer-summary") ?? null;
  const killerItem = existing ?? killerFallback;

  const without = items.filter((it) => it?.id && it.id !== "killer-summary");
  return [killerItem, ...without];
}

/* =============================================================
   Component
============================================================ */

export default function Home({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const auth = useAuthOnline();

  const primary = theme.primary ?? "#F6C256";
  const homeHeaderCss = `
    @keyframes dcTitlePulse {
      0%,100% { transform: scale(1); text-shadow: 0 0 8px ${primary}55; }
      50% { transform: scale(1.03); text-shadow: 0 0 18px ${primary}AA; }
    }
    @keyframes dcTitleShimmer {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
  `;

  const anyStore = store as any;
  const selfStatus: "online" | "away" | "offline" =
    anyStore.selfStatus ?? "online";

  const onlineStatusForUi: "online" | "away" | "offline" =
    auth.status === "signed_in"
      ? (selfStatus === "offline" ? "online" : selfStatus)
      : "offline";

  const activeProfile = useMemo(() => getActiveProfile(store), [store]);

  const [stats, setStats] = useState<ActiveProfileStats>(() =>
    emptyActiveProfileStats()
  );

  const [tickerIndex, setTickerIndex] = useState(0);

  const [tipIndex, setTipIndex] = useState(0);
  const [tipTouchStartX, setTipTouchStartX] = useState<number | null>(null);

    // ------------------------------------------------------------
  // ✅ LIVE CONTENT : feed + changelog depuis /public/content/*.json
  // ------------------------------------------------------------
  const [homeFeedItems, setHomeFeedItems] = useState<HomeFeedItem[]>([]);
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    const dayKey = getTodayKey();
    const bust = `v=${encodeURIComponent(dayKey)}`;

    (async () => {
      const feed = await safeFetchJson<{ version?: number; items?: HomeFeedItem[] }>(
        `/content/home_feed.json?${bust}`
      );
      const ch = await safeFetchJson<{ version?: number; entries?: ChangelogEntry[] }>(
        `/content/changelog.json?${bust}`
      );

      if (cancelled) return;

      setHomeFeedItems(Array.isArray(feed?.items) ? feed!.items! : []);
      setChangelogEntries(Array.isArray(ch?.entries) ? ch!.entries! : []);

      try {
        console.log(
          "[HomeContent] feed=",
          Array.isArray(feed?.items) ? feed!.items!.length : 0,
          "changelog=",
          Array.isArray(ch?.entries) ? ch!.entries!.length : 0
        );
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!activeProfile) {
      setStats(emptyActiveProfileStats());
      return;
    }

    (async () => {
      const s = await buildStatsForProfile(activeProfile.id);
      if (!cancelled) setStats(s);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

    // ------------------------------------------------------------
  // Ticker items (✅ on force Killer en 1er + on utilise CETTE liste partout)
  // ------------------------------------------------------------

  const tickerItemsRaw = useMemo(
    () => buildArcadeItems(store, activeProfile, stats, t),
    [store, activeProfile, stats, t]
  );

  // ✅ IMPORTANT: pas de side-effects (pas de console.log) dans un useMemo
  const tickerItems = useMemo(() => {
    return ensureKillerTickerItemFirst(tickerItemsRaw, t, theme.primary);
  }, [tickerItemsRaw, t, theme.primary]);

  // ✅ Signature stable => permet de détecter les VRAIS changements
  const tickerSignature = useMemo(() => {
    return tickerItems.map((x) => x.id).join(" | ");
  }, [tickerItems]);

  // ✅ DEBUG: log UNIQUEMENT quand la liste change (plus de spam)
  const lastTickerSigRef = React.useRef<string>("");
  useEffect(() => {
    try {
      if (tickerSignature && tickerSignature !== lastTickerSigRef.current) {
        lastTickerSigRef.current = tickerSignature;
        console.log("[Home][Ticker] items:", tickerSignature);
      }
    } catch {}
  }, [tickerSignature]);

  // ✅ Quand le profil actif change -> on revient au 1er slide (Killer)
  useEffect(() => {
    setTickerIndex(0);
  }, [activeProfile?.id]);

  // ✅ Clamp index si la liste change (taille / ordre / contenu)
  useEffect(() => {
    if (!tickerItems.length) {
      setTickerIndex(0);
      return;
    }
    setTickerIndex((i) => (i >= tickerItems.length ? 0 : i));
  }, [tickerSignature, tickerItems.length]);

  // ✅ Auto-rotation (ne redémarre QUE si la taille change)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!tickerItems.length) return;

    const id = window.setInterval(() => {
      setTickerIndex((prev) =>
        tickerItems.length ? (prev + 1) % tickerItems.length : 0
      );
    }, DETAIL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [tickerItems.length]);

  // ✅ Slide courant basé sur la liste UTILISÉE
  const currentTicker: ArcadeTickerItem | null =
    tickerItems.length > 0
      ? tickerItems[Math.min(tickerIndex, tickerItems.length - 1)]
      : null;

  const detailRows: DetailRow[] = useMemo(() => {
    if (!currentTicker) return [];
    return buildTickerDetailRows(currentTicker.id, stats, t);
  }, [currentTicker?.id, stats, t]);

  const hasDetailStats = detailRows.length > 0;
  const detailAccent = currentTicker?.accentColor ?? theme.primary ?? "#F6C256";

  const statsTitle = hasDetailStats
    ? currentTicker?.title ?? ""
    : t("home.detail.stats.title", "Stats du profil");
  const statsText = hasDetailStats
    ? currentTicker?.text ?? ""
    : t(
        "home.detail.stats.text",
        "Tes stats détaillées apparaîtront ici dès que tu auras joué quelques matchs ou trainings."
      );

  const statsSeed = String(activeProfile?.id ?? "anon");
  const statsBackgroundImage = currentTicker
  ? pickStatsBackgroundForTicker(currentTicker.id, `${statsSeed}::stats-card`)
  : "";

  const tipSlides = useMemo(() => {
    return buildLiveTipSlides({
      t,
      profile: activeProfile,
      stats,
      feedItems: homeFeedItems,
      changelogEntries,
    });
  }, [t, activeProfile?.id, stats, homeFeedItems, changelogEntries]);

  useEffect(() => {
    if (!tipSlides.length) {
      setTipIndex(0);
      return;
    }
    setTipIndex((i) => (i >= tipSlides.length ? 0 : i));
  }, [tipSlides.length]);

  useEffect(() => {
    if (typeof window === "undefined" || !tipSlides.length) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (tipSlides.length ? (i + 1) % tipSlides.length : 0));
    }, DETAIL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [tipSlides.length]);

  const currentTip: LiveTipSlide | null =
  tipSlides.length > 0
    ? tipSlides[Math.min(tipIndex, tipSlides.length - 1)]
    : null;

// ============================================================
// ✅ NEW / HOT — marquer le slide comme "vu" après affichage (versionné)
// ============================================================
React.useEffect(() => {
  if (typeof window === "undefined") return;
  if (!currentTip) return;

  const timeoutId = window.setTimeout(() => {
    markTipSeen(currentTip);
  }, 400);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [currentTip?.id, (currentTip as any)?.version, tipIndex]);

  // ✅ image qui change à chaque slide (varie avec tipIndex)
  const tipBgKey = (currentTip?.imageKey || "tip") as keyof typeof TICKER_IMAGES;
  const tipBgSeed = `${activeProfile?.id ?? "anon"}::tipIndex:${tipIndex}::${currentTip?.id ?? "none"}`;

  const currentTipBackgroundImage =
  tipBgKey && (TICKER_IMAGES as any)[tipBgKey]
    ? pickTickerImage(tipBgKey, tipBgSeed)
    : "";    

  const handleTipTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const x = e.touches[0]?.clientX;
    if (x != null) setTipTouchStartX(x);
  };

  const handleTipTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (tipTouchStartX == null || !tipSlides.length) return;
    const x = e.changedTouches[0]?.clientX ?? tipTouchStartX;
    const dx = x - tipTouchStartX;

    if (Math.abs(dx) < TIP_SWIPE_THRESHOLD) {
      setTipTouchStartX(null);
      return;
    }

    setTipIndex((prev) => {
      if (!tipSlides.length) return 0;
      if (dx < 0) return (prev + 1) % tipSlides.length;
      return (prev - 1 + tipSlides.length) % tipSlides.length;
    });

    setTipTouchStartX(null);
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#05060C",
        color: "#FFFFFF",
        display: "flex",
        justifyContent: "center",
        padding: "16px 12px 84px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: PAGE_MAX_WIDTH }}>
        <style dangerouslySetInnerHTML={{ __html: homeHeaderCss }} />
  
        {/* Haut de page */}
        <div
          style={{
            borderRadius: 28,
            padding: 18,
            marginBottom: 16,
            background:
              "linear-gradient(135deg, rgba(8,10,20,0.98), rgba(14,18,34,0.98))",
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.10)"}`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "5px 18px",
              borderRadius: 999,
              border: `1px solid ${primary}`,
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,255,255,0.06))",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: primary,
              }}
            >
              {t("home.welcome", "Bienvenue")}
            </span>
          </div>
  
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: 3,
              textAlign: "center",
              textTransform: "uppercase",
              backgroundImage: `linear-gradient(120deg, ${primary}, #ffffff, ${primary})`,
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              color: "transparent",
              animation:
                "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
            }}
          >
            DARTS COUNTER
          </div>
        </div>
  
        {/* Carte joueur actif */}
        {activeProfile && (
          <ActiveProfileCard
            profile={activeProfile}
            stats={stats}
            status={onlineStatusForUi}
          />
        )}
  
        {/* Petit bandeau arcade (auto-slide interne) */}
        <ArcadeTicker
          items={tickerItems} // ✅ IMPORTANT
          activeIndex={tickerIndex}
          intervalMs={DETAIL_INTERVAL_MS}
          onIndexChange={(index: number) => {
            if (!tickerItems.length) return;
            const safe = Math.min(Math.max(index, 0), tickerItems.length - 1);
            setTickerIndex(safe);
          }}
          onActiveIndexChange={(index: number) => {
            if (!tickerItems.length) return;
            const safe = Math.min(Math.max(index, 0), tickerItems.length - 1);
            setTickerIndex(safe);
          }}
        />
  
        {/* Bloc détail du ticker : 2 mini-cards côte à côte */}
        {currentTicker && (
          <div
            style={{
              marginTop: 10,
              marginBottom: 10,
              borderRadius: 22,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
              padding: 8,
              background:
                "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(3,4,10,1))",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {/* --------- Card gauche : STATS du slide --------- */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 96,
                  backgroundColor: "#05060C",
                  backgroundImage: statsBackgroundImage
                    ? `url("${statsBackgroundImage}")`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(130deg, rgba(0,0,0,0.85), rgba(0,0,0,0.45))",
                    pointerEvents: "none",
                  }}
                />
  
                <div
                  style={{
                    position: "relative",
                    padding: "8px 9px 9px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: detailAccent,
                    }}
                  >
                    {statsTitle}
                  </div>
  
                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: 1.35,
                      color: theme.textSoft ?? "rgba(255,255,255,0.9)",
                    }}
                  >
                    {statsText}
                  </div>
  
                  {hasDetailStats && (
                    <div
                      style={{
                        marginTop: 4,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                        gap: 6,
                      }}
                    >
                      {detailRows.map((row) => (
                        <DetailKpi
                          key={row.label}
                          label={row.label}
                          value={row.value}
                          primary={detailAccent}
                          theme={theme}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
  
              {/* --------- Card droite : ASTUCE / PUB / NOUVEAUTÉ (mini-carousel) --------- */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 96,
                  backgroundColor: "#05060C",
                  backgroundImage: currentTipBackgroundImage
                    ? `url("${currentTipBackgroundImage}")`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                onTouchStart={handleTipTouchStart}
                onTouchEnd={handleTipTouchEnd}
              >
                {/* ✅ BADGE OVERLAY (toujours au-dessus, ne dépend pas du titre) */}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 50,
                    pointerEvents: "none",
                  }}
                >
                  {shouldShowHotBadge(currentTip) ? (
                    <BadgeHot theme={theme} />
                  ) : shouldShowNewBadge(currentTip) ? (
                    <BadgeNew theme={theme} />
                  ) : null}
                </div>
  
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(230deg, rgba(0,0,0,0.9), rgba(0,0,0,0.4))",
                    pointerEvents: "none",
                  }}
                />
  
                <div
                  style={{
                    position: "relative",
                    padding: "8px 9px 9px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                    // ✅ réserve un peu de place en haut à droite pour le badge
                    paddingRight: 46,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        color: theme.accent1 ?? "#FFD980",
                        lineHeight: 1.2,
  
                        // ✅ 2 lignes max + ellipsis
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {currentTip?.title ??
                        t(
                          "home.detail.tip.title",
                          "Astuce, pub & nouveautés du moment"
                        )}
                    </div>
  
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.35,
                        color: theme.textSoft ?? "rgba(255,255,255,0.9)",
                        marginTop: 3,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {currentTip?.text ??
                        t(
                          "home.detail.tip.text",
                          "Découvre les nouveautés, astuces ou pubs liées à cette section."
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Gros boutons de navigation */}
        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <HomeBigButton
            label={t("home.nav.profiles", "Profils")}
            subtitle={t("home.nav.profiles.desc", "Profils locaux, avatars & BOTS")}
            icon="user"
            onClick={() => go("profiles")}
          />
  
          <HomeBigButton
            label={t("home.nav.local", "Local")}
            subtitle={t("home.nav.local.desc", "Joue en présentiel sur cette cible")}
            icon="target"
            onClick={() => go("games")}
          />
  
          <HomeBigButton
            label={t("home.nav.online", "Online")}
            subtitle={t("home.nav.online.desc", "Matchs à distance avec tes amis")}
            icon="globe"
            onClick={() => go("friends")}
          />
  
          <HomeBigButton
            label={t("home.nav.stats", "Stats")}
            subtitle={t("home.nav.stats.desc", "Dashboards, courbes, historique")}
            icon="stats"
            onClick={() => go("stats")}
          />
  
          <HomeBigButton
            label={t("home.nav.settings", "Réglages")}
            subtitle={t("home.nav.settings.desc", "Thèmes, langue, reset complet")}
            icon="settings"
            onClick={() => go("settings")}
          />
        </div>
      </div>
    </div>
  );    
}

/* ============================================================
   Gros boutons Home
============================================================ */

type HomeBtnProps = {
  label: string;
  subtitle: string;
  icon: "user" | "target" | "globe" | "stats" | "settings";
  onClick: () => void;
};

function HomeBigButton({ label, subtitle, icon, onClick }: HomeBtnProps) {
  const { theme } = useTheme();

  const Icon = useMemo(() => {
    const common = {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as const;

    switch (icon) {
      case "user":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path
              {...common}
              d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z"
            />
          </svg>
        );
      case "target":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <circle {...common} cx="12" cy="12" r="9" />
            <circle {...common} cx="12" cy="12" r="5" />
            <path {...common} d="M12 7v5l3 3" />
          </svg>
        );
      case "globe":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <circle {...common} cx="12" cy="12" r="9" />
            <path
              {...common}
              d="M3 12h18M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z"
            />
          </svg>
        );
      case "stats":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path {...common} d="M4 19V9M10 19V5M16 19v-7M4 19h16" />
          </svg>
        );
      case "settings":
      default:
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path
              {...common}
              d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2-1.5a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.3.9a7.3 7.3 0 0 0-1.7-1L14.7 2h-3.4L10.9 4.3a7.3 7.3 0 0 0-1.7 1l-2.3-.9a.5.5 0 0 0-.6.2L4.4 8a.5.5 0 0 0 .1.6L6.5 10a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2 1.5a.5.5 0 0 0-.1.6l1.9 3.3a.5.5 0 0 0 .6.2l2.3-.9a7.3 7.3 0 0 0 1.7 1l.4 2.3h3.4l.4-2.3a7.3 7.3 0 0 0 1.7-1l2.3.9a.5.5 0 0 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6ZM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3Z"
            />
          </svg>
        );
    }
  }, [icon, theme]);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        zIndex: 20,
        pointerEvents: "auto",
        cursor: "pointer",
        width: "100%",
        borderRadius: 22,
        padding: 14,
        border: "none",
        background:
          "linear-gradient(135deg, rgba(10,12,24,0.98), rgba(18,22,40,0.98))",
        boxShadow: "0 14px 30px rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: theme.textStrong ?? "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background:
              "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.06), rgba(5,7,16,1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.primary ?? "#F6C256",
            boxShadow: "0 10px 20px rgba(0,0,0,0.75)",
          }}
        >
          {Icon}
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 2,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: theme.textSoft ?? "rgba(255,255,255,0.7)",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.4)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          opacity: 0.8,
        }}
      >
        ▶
      </div>
    </button>
  );
}