// ============================================================
// src/lib/x01MultiStats.ts
// Agrégation avancée stats X01 Multi (par joueur / période)
// + Leaderboards multi-profils
// ============================================================

import type { HistoryMatch, Profile } from "./types"; // adapte le chemin
import { History } from "./history";

export type PeriodKey = "day" | "week" | "month" | "year" | "all";

export type X01MatchParams = {
  distance: number;          // 301 / 501 / 701…
  inMode: "simple" | "double" | "master";
  outMode: "simple" | "double" | "master";
};

export type X01MatchLite = {
  id: string;
  date: number;              // timestamp ms
  profileId: string;
  opponentNames: string[];
  isWin: boolean;
  legs: number;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  scoreline?: string;        // "3–2" par ex
  params: X01MatchParams;
};

export type X01MultiStats = {
  // Global
  matches: number;
  wins: number;
  winrate: number;
  legs: number;
  darts: number;
  avg3Global: number;
  avg3LastN: number;
  bestVisit: number;
  bestCheckout: number;
  nb180: number;
  nb140: number;
  nb100: number;

  // Progression
  progression: { date: number; avg3: number }[];

  // Détail matches pour la liste
  matchesDetail: X01MatchLite[];

  // Par paramètres (ex: 501 D/D)
  byParams: Record<
    string,
    {
      matches: number;
      wins: number;
      winrate: number;
      avg3: number;
      bestVisit: number;
      bestCheckout: number;
    }
  >;
};

export type X01LeaderboardItem = {
  profileId: string;
  name: string;
  value: number;
  extra?: string;
};

export type X01Leaderboards = {
  bestAvg3: X01LeaderboardItem[];
  bestWinrate: X01LeaderboardItem[];
  most180: X01LeaderboardItem[];
  bestCheckout: X01LeaderboardItem[];
};

function matchesForPeriod(all: X01MatchLite[], period: PeriodKey) {
  if (period === "all") return all;
  const now = Date.now();
  let min = 0;
  switch (period) {
    case "day":
      min = now - 24 * 3600 * 1000;
      break;
    case "week":
      min = now - 7 * 24 * 3600 * 1000;
      break;
    case "month":
      min = now - 30 * 24 * 3600 * 1000;
      break;
    case "year":
      min = now - 365 * 24 * 3600 * 1000;
      break;
  }
  return all.filter((m) => m.date >= min);
}

export function buildX01MultiStats(
  history: History,
  profileId: string,
  period: PeriodKey = "all"
): X01MultiStats {
  // 🔁 Récupération des matchs X01 pour ce profil
  // ⚠️ ADAPTE : ici j’imagine une méthode History.getX01Matches(profileId)
  const rawMatches: HistoryMatch[] = history.getX01Matches(profileId) ?? [];

  const asLite: X01MatchLite[] = rawMatches.map((m) => ({
    id: m.id,
    date: m.date,
    profileId,
    opponentNames: m.opponents?.map((o) => o.name) ?? [],
    isWin: m.result === "win",
    legs: m.legsPlayed ?? m.legs ?? 0,
    darts: m.totalDarts ?? 0,
    avg3: m.avg3 ?? 0,
    bestVisit: m.bestVisit ?? 0,
    bestCheckout: m.bestCheckout ?? 0,
    scoreline: m.scoreline,
    params: {
      distance: m.config?.distance ?? 501,
      inMode: m.config?.inMode ?? "simple",
      outMode: m.config?.outMode ?? "double",
    },
  }));

  const periodMatches = matchesForPeriod(asLite, period);
  const totalMatches = periodMatches.length;

  if (!totalMatches) {
    return {
      matches: 0,
      wins: 0,
      winrate: 0,
      legs: 0,
      darts: 0,
      avg3Global: 0,
      avg3LastN: 0,
      bestVisit: 0,
      bestCheckout: 0,
      nb180: 0,
      nb140: 0,
      nb100: 0,
      progression: [],
      matchesDetail: [],
      byParams: {},
    };
  }

  let wins = 0;
  let legs = 0;
  let darts = 0;
  let sumAvg3 = 0;
  let bestVisit = 0;
  let bestCheckout = 0;

  // Si tu stockes les 180/140/100+ dans le match :
  let nb180 = 0;
  let nb140 = 0;
  let nb100 = 0;

  const byParams: X01MultiStats["byParams"] = {};
  const progression: { date: number; avg3: number }[] = [];

  for (const m of periodMatches) {
    if (m.isWin) wins++;
    legs += m.legs;
    darts += m.darts;
    sumAvg3 += m.avg3;
    bestVisit = Math.max(bestVisit, m.bestVisit);
    bestCheckout = Math.max(bestCheckout, m.bestCheckout);

    nb180 += (m as any).nb180 ?? 0;
    nb140 += (m as any).nb140 ?? 0;
    nb100 += (m as any).nb100 ?? 0;

    const key = `${m.params.distance}-${m.params.inMode}-${m.params.outMode}`;
    const bucket = (byParams[key] ??= {
      matches: 0,
      wins: 0,
      winrate: 0,
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
    });
    bucket.matches++;
    if (m.isWin) bucket.wins++;
    bucket.avg3 += m.avg3;
    bucket.bestVisit = Math.max(bucket.bestVisit, m.bestVisit);
    bucket.bestCheckout = Math.max(bucket.bestCheckout, m.bestCheckout);

    progression.push({ date: m.date, avg3: m.avg3 });
  }

  Object.values(byParams).forEach((b) => {
    b.winrate = b.matches ? (b.wins / b.matches) * 100 : 0;
    b.avg3 = b.matches ? b.avg3 / b.matches : 0;
  });

  const sortedByDate = [...periodMatches].sort((a, b) => a.date - b.date);
  const lastN = sortedByDate.slice(-10);
  const avg3LastN =
    lastN.reduce((s, m) => s + m.avg3, 0) / Math.max(1, lastN.length);

  return {
    matches: totalMatches,
    wins,
    winrate: (wins / totalMatches) * 100,
    legs,
    darts,
    avg3Global: sumAvg3 / totalMatches,
    avg3LastN,
    bestVisit,
    bestCheckout,
    nb180,
    nb140,
    nb100,
    progression,
    matchesDetail: periodMatches,
    byParams,
  };
}

export function buildX01Leaderboards(
  history: History,
  profiles: Profile[],
  period: PeriodKey = "all"
): X01Leaderboards {
  const perProfile = profiles.map((p) => {
    const s = buildX01MultiStats(history, p.id, period);
    return { profile: p, stats: s };
  });

  const MIN_MATCHES = 5;

  const bestAvg3 = [...perProfile]
    .filter((x) => x.stats.matches >= MIN_MATCHES)
    .sort((a, b) => b.stats.avg3Global - a.stats.avg3Global)
    .slice(0, 5)
    .map((x) => ({
      profileId: x.profile.id,
      name: x.profile.name,
      value: x.stats.avg3Global,
      extra: `${x.stats.matches} M`,
    }));

  const bestWinrate = [...perProfile]
    .filter((x) => x.stats.matches >= MIN_MATCHES)
    .sort((a, b) => b.stats.winrate - a.stats.winrate)
    .slice(0, 5)
    .map((x) => ({
      profileId: x.profile.id,
      name: x.profile.name,
      value: x.stats.winrate,
      extra: `${x.stats.matches} M`,
    }));

  const most180 = [...perProfile]
    .sort((a, b) => b.stats.nb180 - a.stats.nb180)
    .slice(0, 5)
    .map((x) => ({
      profileId: x.profile.id,
      name: x.profile.name,
      value: x.stats.nb180,
    }));

  const bestCheckout = [...perProfile]
    .sort((a, b) => b.stats.bestCheckout - a.stats.bestCheckout)
    .slice(0, 5)
    .map((x) => ({
      profileId: x.profile.id,
      name: x.profile.name,
      value: x.stats.bestCheckout,
    }));

  return { bestAvg3, bestWinrate, most180, bestCheckout };
}
