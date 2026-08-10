// @ts-nocheck
import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { computeKillerStatsAggForProfile } from "../lib/statsKiller";
import { GoldPill } from "../components/StatsPlayerDashboard";
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";

type Props = {
  profiles: Profile[];
  memHistory: any[];
  playerId?: string | null;
  title?: string;
};

type KillerTab = "overview" | "combat" | "ranking" | "history";

const PERIOD_OPTIONS = [
  { key: "J", label: "J" },
  { key: "S", label: "S" },
  { key: "M", label: "M" },
  { key: "A", label: "A" },
  { key: "ARV", label: "ARV" },
] as const;

const PIE_COLORS = ["#F6C256", "#47B5FF", "#77FF9B", "#FF6FB5", "#B996FF", "#FF8A65", "#5DE2E7"];

const num = (v: any, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const fmt1 = (n: any) => `${num(n, 0).toFixed(1)}`;
const fmt2 = (n: any) => `${num(n, 0).toFixed(2)}`;
const fmtPct = (n: any) => `${num(n, 0).toFixed(1)}%`;
const safeStr = (v: any) => (v === undefined || v === null ? "" : String(v));

const fmtDate = (ts: any) => {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try {
    return new Date(n).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const fmtShortDate = (ts: any) => {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try {
    return new Date(n).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "—";
  }
};

const fmtFavNum = (n: any) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v === 25 ? "BULL" : `${v}`;
};

function normalizeCollection(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([key, raw]: any) => {
    if (raw && typeof raw === "object") {
      return {
        id: raw.id ?? raw.playerId ?? raw.profileId ?? key,
        playerId: raw.playerId ?? raw.profileId ?? raw.id ?? key,
        ...raw,
      };
    }
    return { id: key, playerId: key, value: raw };
  });
}

const findProfile = (profiles: any[], pid: string | null) =>
  (Array.isArray(profiles) ? profiles : []).find((p) => String(p?.id ?? "") === String(pid ?? "")) || null;

function getPlayers(rec: any) {
  const s = rec?.summary || rec?.payload?.summary || null;
  const sources = [
    rec?.players,
    rec?.payload?.players,
    s?.players,
    s?.perPlayer,
    s?.detailedByPlayer,
    rec?.payload?.summary?.players,
    rec?.payload?.summary?.perPlayer,
    rec?.payload?.summary?.detailedByPlayer,
  ];
  for (const source of sources) {
    const list = normalizeCollection(source);
    if (list.length) return list;
  }
  return [];
}

function isKillerRecord(rec: any) {
  const kind = rec?.kind || rec?.summary?.kind || rec?.payload?.kind || rec?.payload?.summary?.kind;
  const mode = rec?.mode || rec?.summary?.mode || rec?.payload?.mode || rec?.payload?.summary?.mode;
  const game = rec?.payload?.game || rec?.summary?.game?.mode || rec?.summary?.game?.game;
  return kind === "killer" || mode === "killer" || game === "killer";
}

function recTs(rec: any) {
  return num(
    rec?.updatedAt ??
      rec?.finishedAt ??
      rec?.createdAt ??
      rec?.ts ??
      rec?.summary?.updatedAt ??
      rec?.summary?.finishedAt ??
      rec?.payload?.updatedAt ??
      rec?.payload?.summary?.updatedAt,
    0
  );
}

function inPeriod(ts: number, period: string) {
  if (!Number.isFinite(Number(ts)) || Number(ts) <= 0) return period === "ARV";
  const now = Date.now();
  const t = Number(ts);
  const day = 24 * 60 * 60 * 1000;
  if (period === "J") return now - t <= day;
  if (period === "S") return now - t <= 7 * day;
  if (period === "M") return now - t <= 31 * day;
  if (period === "A") return now - t <= 366 * day;
  return true;
}

function recordHasPlayer(rec: any, playerId: string) {
  const pid = String(playerId);
  if (
    getPlayers(rec).some(
      (p: any) => String(p?.id ?? p?.playerId ?? p?.profileId ?? "") === pid
    )
  ) {
    return true;
  }
  const s = rec?.summary || rec?.payload?.summary || {};
  return Boolean(
    s?.detailedByPlayer?.[pid] ||
      s?.perPlayer?.[pid] ||
      s?.players?.[pid] ||
      rec?.payload?.summary?.detailedByPlayer?.[pid] ||
      rec?.payload?.summary?.perPlayer?.[pid] ||
      rec?.payload?.summary?.players?.[pid]
  );
}

function rankOfRecord(rec: any, playerId: string) {
  const s = rec?.summary || rec?.payload?.summary || null;
  const direct =
    normalizeCollection(s?.detailedByPlayer).find(
      (p: any) => String(p?.playerId ?? p?.profileId ?? p?.id ?? "") === String(playerId)
    ) ||
    normalizeCollection(s?.perPlayer).find(
      (p: any) => String(p?.playerId ?? p?.profileId ?? p?.id ?? "") === String(playerId)
    ) ||
    getPlayers(rec).find(
      (p: any) => String(p?.id ?? p?.playerId ?? p?.profileId ?? "") === String(playerId)
    ) ||
    null;

  const rank = num(direct?.finalRank ?? direct?.rank ?? direct?.placement ?? direct?.place ?? direct?.position, 0);
  if (rank > 0) return rank;
  const winnerId = safeStr(rec?.winnerId || s?.winnerId || rec?.payload?.winnerId || rec?.payload?.summary?.winnerId);
  if (winnerId && winnerId === String(playerId)) return 1;
  return 0;
}

export default function StatsKiller({ profiles, memHistory, playerId = null, title = "KILLER" }: Props) {
  const { theme } = useTheme();
  const [period, setPeriod] = React.useState<string>("ARV");
  const [activeTab, setActiveTab] = React.useState<KillerTab>("overview");

  const data = React.useMemo(() => {
    const killer = (Array.isArray(memHistory) ? memHistory : []).filter(isKillerRecord);
    const scoped = killer.filter((r: any) => inPeriod(recTs(r), period));
    const filtered = playerId ? scoped.filter((r) => recordHasPlayer(r, String(playerId))) : scoped;
    const agg = playerId ? computeKillerStatsAggForProfile(filtered, String(playerId)) : null;

    // Records personnels : toujours calculés sur TOUT l'historique Killer du joueur,
    // indépendamment du filtre de période affiché dans le dashboard.
    const allPlayerRecords = playerId
      ? killer.filter((r: any) => recordHasPlayer(r, String(playerId)))
      : [];
    const recordMatches = allPlayerRecords.map((r: any) => {
      const matchAgg = computeKillerStatsAggForProfile([r], String(playerId));
      const rank = rankOfRecord(r, String(playerId));
      const when = recTs(r);
      const darts = num(matchAgg?.dartsTotal);
      const hits = num(matchAgg?.totalHits);
      const kills = num(matchAgg?.killsTotal);
      const livesTaken = num(matchAgg?.livesTakenTotal);
      const livesLost = num(matchAgg?.livesLostTotal);
      const tacticalActions =
        num(matchAgg?.disarmsTriggeredTotal) +
        num(matchAgg?.shieldBreaksTotal) +
        num(matchAgg?.shieldHalfBreaksTotal) +
        num(matchAgg?.resurrectionsGivenTotal);
      const specialActions =
        num(matchAgg?.autoKillsTotal) +
        num(matchAgg?.autoHitsTotal) +
        num(matchAgg?.livesStolenTotal) +
        num(matchAgg?.livesHealedTotal) +
        tacticalActions;
      return {
        when,
        win: rank === 1 || Boolean(matchAgg?.wins),
        podium: rank > 0 && rank <= 3,
        rank,
        kills,
        deaths: num(matchAgg?.deathsTotal),
        darts,
        hits,
        hitRate: darts > 0 ? Math.min(100, (hits / darts) * 100) : 0,
        killsPer100Darts: darts > 0 ? (kills / darts) * 100 : 0,
        livesTaken,
        livesLost,
        livesDelta: livesTaken - livesLost,
        precisionKiller: num(matchAgg?.precisionKiller),
        precisionOffensive: num(matchAgg?.precisionOffensive),
        tacticalActions,
        specialActions,
      };
    });

    const maxRecord = (key: string) => {
      let best: any = null;
      for (const row of recordMatches) {
        if (!best || num(row?.[key]) > num(best?.[key])) best = row;
      }
      return best;
    };
    const bestKills = maxRecord("kills");
    const bestHits = maxRecord("hits");
    const bestLivesTaken = maxRecord("livesTaken");
    const bestLivesDelta = maxRecord("livesDelta");
    const bestPrecisionKiller = maxRecord("precisionKiller");
    const bestPrecisionOffensive = maxRecord("precisionOffensive");
    const bestHitRate = maxRecord("hitRate");
    const bestKillsPer100Darts = maxRecord("killsPer100Darts");
    const bestTacticalActions = maxRecord("tacticalActions");
    const bestSpecialActions = maxRecord("specialActions");
    const fastestWin = recordMatches
      .filter((r: any) => r.win && num(r.darts) > 0)
      .sort((a: any, b: any) => num(a.darts) - num(b.darts))[0] || null;

    const ranked = recordMatches.filter((r: any) => num(r.rank) > 0);
    const bestRank = ranked.length ? Math.min(...ranked.map((r: any) => num(r.rank))) : 0;
    let currentWinStreak = 0;
    let bestWinStreak = 0;
    let currentPodiumStreak = 0;
    let bestPodiumStreak = 0;
    const chronoRecords = recordMatches.slice().sort((a: any, b: any) => num(a.when) - num(b.when));
    for (const row of chronoRecords) {
      if (row.win) {
        currentWinStreak += 1;
        bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
      } else {
        currentWinStreak = 0;
      }
      if (row.podium) {
        currentPodiumStreak += 1;
        bestPodiumStreak = Math.max(bestPodiumStreak, currentPodiumStreak);
      } else {
        currentPodiumStreak = 0;
      }
    }

    const records = {
      bestKills: { value: num(bestKills?.kills), when: num(bestKills?.when) },
      bestHits: { value: num(bestHits?.hits), when: num(bestHits?.when) },
      bestLivesTaken: { value: num(bestLivesTaken?.livesTaken), when: num(bestLivesTaken?.when) },
      bestLivesDelta: { value: num(bestLivesDelta?.livesDelta), when: num(bestLivesDelta?.when) },
      bestPrecisionKiller: { value: num(bestPrecisionKiller?.precisionKiller), when: num(bestPrecisionKiller?.when) },
      bestPrecisionOffensive: { value: num(bestPrecisionOffensive?.precisionOffensive), when: num(bestPrecisionOffensive?.when) },
      bestHitRate: { value: num(bestHitRate?.hitRate), when: num(bestHitRate?.when) },
      bestKillsPer100Darts: { value: num(bestKillsPer100Darts?.killsPer100Darts), when: num(bestKillsPer100Darts?.when) },
      bestTacticalActions: { value: num(bestTacticalActions?.tacticalActions), when: num(bestTacticalActions?.when) },
      bestSpecialActions: { value: num(bestSpecialActions?.specialActions), when: num(bestSpecialActions?.when) },
      fastestWin: { value: num(fastestWin?.darts), when: num(fastestWin?.when) },
      bestWinStreak,
      bestPodiumStreak,
      currentWinStreak,
      currentPodiumStreak,
      bestRank,
      matchCount: recordMatches.length,
    };

    // On limite la série graphique/historique aux parties récentes : l'agrégat global
    // reste calculé sur toute la période mais le rendu demeure rapide même avec un gros historique.
    const recentRecords = filtered
      .slice()
      .sort((a: any, b: any) => recTs(b) - recTs(a))
      .slice(0, 40);

    const items = recentRecords.map((r: any, idx: number) => {
      const when = recTs(r);
      const winnerId = safeStr(r?.winnerId || r?.summary?.winnerId || r?.payload?.winnerId || r?.payload?.summary?.winnerId);
      const players = getPlayers(r);
      const names = players.map((p: any) => p?.name ?? p?.playerName).filter(Boolean).join(" · ");
      const winnerName =
        findProfile(profiles, winnerId)?.name ||
        players.find((p: any) => String(p?.id ?? p?.playerId ?? p?.profileId ?? "") === winnerId)?.name ||
        "—";
      const matchAgg = playerId ? computeKillerStatsAggForProfile([r], String(playerId)) : null;
      const rank = playerId ? rankOfRecord(r, String(playerId)) : 0;
      return {
        id: r?.id || `${when}-${idx}`,
        when,
        dateLabel: fmtShortDate(when),
        names,
        winnerName,
        rank,
        win: rank === 1 || Boolean(matchAgg?.wins),
        kills: num(matchAgg?.killsTotal),
        deaths: num(matchAgg?.deathsTotal),
        darts: num(matchAgg?.dartsTotal),
        hits: num(matchAgg?.totalHits),
        hitRate: num(matchAgg?.dartsTotal) > 0 ? Math.min(100, (num(matchAgg?.totalHits) / num(matchAgg?.dartsTotal)) * 100) : 0,
        killsPer100Darts: num(matchAgg?.dartsTotal) > 0 ? (num(matchAgg?.killsTotal) / num(matchAgg?.dartsTotal)) * 100 : 0,
        precisionOffensive: num(matchAgg?.precisionOffensive),
        precisionKiller: num(matchAgg?.precisionKiller),
        livesTaken: num(matchAgg?.livesTakenTotal),
        livesLost: num(matchAgg?.livesLostTotal),
        livesDelta: num(matchAgg?.livesTakenTotal) - num(matchAgg?.livesLostTotal),
        tacticalActions:
          num(matchAgg?.disarmsTriggeredTotal) +
          num(matchAgg?.shieldBreaksTotal) +
          num(matchAgg?.shieldHalfBreaksTotal) +
          num(matchAgg?.resurrectionsGivenTotal),
        specialActions:
          num(matchAgg?.autoKillsTotal) +
          num(matchAgg?.autoHitsTotal) +
          num(matchAgg?.livesStolenTotal) +
          num(matchAgg?.livesHealedTotal) +
          num(matchAgg?.disarmsTriggeredTotal) +
          num(matchAgg?.shieldBreaksTotal) +
          num(matchAgg?.shieldHalfBreaksTotal) +
          num(matchAgg?.resurrectionsGivenTotal),
      };
    });

    return {
      agg,
      items,
      played: agg?.played || filtered.length,
      wins: agg?.wins || 0,
      lastAt: agg?.lastAt || items[0]?.when || 0,
      placements: agg?.placements || {},
      records,
    };
  }, [memHistory, period, playerId, profiles]);

  const agg = data.agg || {};
  const placementRows = Object.keys(data.placements || {})
    .map((k) => ({ rank: Number(k), count: num(data.placements[k], 0) }))
    .filter((x) => x.rank > 0 && x.count > 0)
    .sort((a, b) => a.rank - b.rank);

  const totalPodium = num(agg.firsts, 0) + num(agg.seconds, 0) + num(agg.thirds, 0);
  const shieldCounters = num(agg.shieldBreaksTotal, 0) + num(agg.shieldHalfBreaksTotal, 0);
  const losses = Math.max(0, num(agg.played) - num(agg.wins));
  const killDeathRatio = num(agg.deathsTotal) > 0 ? num(agg.killsTotal) / num(agg.deathsTotal) : num(agg.killsTotal);
  const livesDelta = num(agg.livesTakenTotal) - num(agg.livesLostTotal);
  const placementCount = placementRows.reduce((s, r) => s + r.count, 0);
  const avgPlacement = placementCount
    ? placementRows.reduce((s, r) => s + r.rank * r.count, 0) / placementCount
    : 0;
  const played = Math.max(0, num(agg.played));
  const hitRate = num(agg.dartsTotal) > 0 ? Math.min(100, (num(agg.totalHits) / num(agg.dartsTotal)) * 100) : 0;
  const killsPer100Darts = num(agg.dartsTotal) > 0 ? (num(agg.killsTotal) / num(agg.dartsTotal)) * 100 : 0;
  const podiumRate = played > 0 ? (totalPodium / played) * 100 : 0;
  const top2Rate = played > 0 ? ((num(agg.firsts) + num(agg.seconds)) / played) * 100 : 0;
  const noDeathMatches = Math.max(0, played - Math.min(played, num(agg.deathsTotal)));
  const noDeathRate = played > 0 ? (noDeathMatches / played) * 100 : 0;
  const hitsAvg = played > 0 ? num(agg.totalHits) / played : 0;
  const livesTakenAvg = played > 0 ? num(agg.livesTakenTotal) / played : 0;
  const livesLostAvg = played > 0 ? num(agg.livesLostTotal) / played : 0;
  const tacticalTotal =
    num(agg.disarmsTriggeredTotal) +
    num(agg.shieldBreaksTotal) +
    num(agg.shieldHalfBreaksTotal) +
    num(agg.resurrectionsGivenTotal);
  const specialTotal =
    num(agg.autoKillsTotal) +
    num(agg.autoHitsTotal) +
    num(agg.livesStolenTotal) +
    num(agg.livesHealedTotal) +
    tacticalTotal;
  const specialAvg = played > 0 ? specialTotal / played : 0;

  const kpiTop = [
    { label: "Matchs", value: agg.played || 0, sub: `${agg.wins || 0} victoire${num(agg.wins) > 1 ? "s" : ""}`, color: "#47B5FF", icon: "sessions" },
    { label: "Kills / match", value: fmt2(agg.killsAvg || 0), sub: `${agg.killsTotal || 0} kills au total`, color: "#FF6FB5", icon: "target" },
    { label: "Win rate", value: fmtPct(agg.winRate || 0), sub: `${totalPodium} podium${totalPodium > 1 ? "s" : ""}`, color: "#F6C256", icon: "percent" },
    { label: "Hits total", value: agg.totalHits || 0, sub: `Favori ${agg.favSegment || "—"}`, color: "#77FF9B", icon: "bars" },
  ];

  const segmentEntries = Object.entries((agg?.hitsBySegmentAgg || {}) as Record<string, number>)
    .filter(([k, v]) => safeStr(k) && num(v) > 0)
    .sort((a, b) => num(b[1]) - num(a[1]))
    .slice(0, 10);
  const segmentData = segmentEntries.map(([name, value]) => ({ name, value: num(value) }));
  const numberData = Object.entries((agg?.hitsByNumberAgg || {}) as Record<string, number>)
    .filter(([k, v]) => num(k) > 0 && num(v) > 0)
    .sort((a, b) => num(b[1]) - num(a[1]))
    .slice(0, 10)
    .map(([name, value]) => ({ name: name === "25" ? "BULL" : name, value: num(value) }));
  const ringTotals = Object.entries((agg?.hitsBySegmentAgg || {}) as Record<string, number>).reduce(
    (acc: any, [key, value]) => {
      const k = safeStr(key).toUpperCase().trim();
      const v = num(value);
      if (v <= 0) return acc;
      if (k === "SB" || k === "BULL") acc.Bull += v;
      else if (k === "DB" || k === "DBULL") acc["Double Bull"] += v;
      else if (/^T\d+$/.test(k)) acc.Triples += v;
      else if (/^D\d+$/.test(k)) acc.Doubles += v;
      else if (/^S\d+$/.test(k)) acc.Simples += v;
      else acc["Autres / legacy"] += v;
      return acc;
    },
    { Simples: 0, Doubles: 0, Triples: 0, Bull: 0, "Double Bull": 0, "Autres / legacy": 0 }
  );
  const ringPie = Object.entries(ringTotals).map(([name, value]) => ({ name, value: num(value) })).filter((x) => x.value > 0);

  const recentForTrend = (data.items || []).slice(0, 12).reverse();
  const killTrend = recentForTrend.map((it: any) => ({ label: it.dateLabel, value: num(it.kills) }));
  const rankTrend = recentForTrend.filter((it: any) => num(it.rank) > 0).map((it: any) => ({ label: it.dateLabel, value: num(it.rank) }));
  const combatTrend = recentForTrend.map((it: any) => ({
    label: it.dateLabel,
    kills: num(it.kills),
    deaths: num(it.deaths),
  }));
  const livesTrend = recentForTrend.map((it: any) => ({
    label: it.dateLabel,
    taken: num(it.livesTaken),
    lost: num(it.livesLost),
  }));
  const efficiencyTrend = recentForTrend.map((it: any) => ({
    label: it.dateLabel,
    hitRate: num(it.hitRate),
    killerPrecision: num(it.precisionKiller),
  }));
  const recentFive = (data.items || []).slice(0, 5);
  const previousFive = (data.items || []).slice(5, 10);
  const avgOf = (rows: any[], key: string) => rows.length ? rows.reduce((s: number, r: any) => s + num(r?.[key]), 0) / rows.length : 0;
  const winRateOf = (rows: any[]) => rows.length ? (rows.filter((r: any) => r?.win).length / rows.length) * 100 : 0;
  const recentWinRate = winRateOf(recentFive);
  const previousWinRate = winRateOf(previousFive);
  const recentKillsAvg = avgOf(recentFive, "kills");
  const previousKillsAvg = avgOf(previousFive, "kills");
  const recentHitRate = avgOf(recentFive, "hitRate");
  const previousHitRate = avgOf(previousFive, "hitRate");
  const recentLivesDelta = avgOf(recentFive, "livesDelta");
  const previousLivesDelta = avgOf(previousFive, "livesDelta");

  const resultPie = [
    { name: "Victoires", value: num(agg.wins) },
    { name: "Autres", value: losses },
  ].filter((x) => x.value > 0);

  const specialPie = [
    { name: "Kills", value: num(agg.killsTotal) },
    { name: "Auto-kills", value: num(agg.autoKillsTotal) },
    { name: "Résurrections", value: num(agg.resurrectionsGivenTotal) },
    { name: "Désarmements", value: num(agg.disarmsTriggeredTotal) },
    { name: "Boucliers", value: shieldCounters },
    { name: "Auto-hits", value: num(agg.autoHitsTotal) },
  ].filter((x) => x.value > 0);
  const performanceProfile = [
    { name: "Win rate", value: num(agg.winRate) },
    { name: "Podiums", value: podiumRate },
    { name: "Top 2", value: top2Rate },
    { name: "Précision off.", value: num(agg.precisionOffensive) },
    { name: "Précision Killer", value: num(agg.precisionKiller) },
    { name: "Sans death", value: noDeathRate },
  ];
  const combatBalance = [
    { name: "Kills", value: num(agg.killsTotal) },
    { name: "Deaths", value: num(agg.deathsTotal) },
    { name: "Vies prises", value: num(agg.livesTakenTotal) },
    { name: "Vies perdues", value: num(agg.livesLostTotal) },
  ];

  const placementData = placementRows.slice(0, 10).map((row) => ({ name: `${row.rank}e`, value: row.count }));

  const combatGroups = [
    {
      title: "Offensive",
      color: "#FF6FB5",
      items: [
        ["Kills", agg.killsTotal || 0],
        ["Deaths", agg.deathsTotal || 0],
        ["Ratio K/D", fmt2(killDeathRatio)],
        ["Vies prises", agg.livesTakenTotal || 0],
        ["Vies perdues", agg.livesLostTotal || 0],
        ["Delta vies", `${livesDelta >= 0 ? "+" : ""}${livesDelta}`],
      ],
    },
    {
      title: "Précision",
      color: "#77FF9B",
      items: [
        ["Offensive", fmtPct(agg.precisionOffensive || 0)],
        ["Killer", fmtPct(agg.precisionKiller || 0)],
        ["Darts / match", fmt2(agg.dartsAvg || 0)],
        ["Réarmement", fmt2(agg.rearmAvgThrows || 0)],
        ["Lancers offensifs", agg.offensiveThrowsTotal || 0],
        ["Lancers killer", agg.killerThrowsTotal || 0],
      ],
    },
    {
      title: "Spéciales",
      color: "#47B5FF",
      items: [
        ["Auto-hits", agg.autoHitsTotal || 0],
        ["Auto-kills", agg.autoKillsTotal || 0],
        ["Auto-pénalités", agg.selfPenaltyHitsTotal || 0],
        ["Vies volées", agg.livesStolenTotal || 0],
        ["Vies soignées", agg.livesHealedTotal || 0],
        ["Hits inutiles", agg.uselessHitsTotal || 0],
      ],
    },
    {
      title: "Tactique",
      color: "#F6C256",
      items: [
        ["Désarmements", agg.disarmsTriggeredTotal || 0],
        ["Désarm. reçus", agg.disarmsReceivedTotal || 0],
        ["Boucliers cassés", agg.shieldBreaksTotal || 0],
        ["Demi-boucliers", agg.shieldHalfBreaksTotal || 0],
        ["Résurrections +", agg.resurrectionsGivenTotal || 0],
        ["Résurrections reçues", agg.resurrectionsReceivedTotal || 0],
      ],
    },
  ];

  return (
    <div style={{ padding: "10px 8px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle theme={theme} title={title} />

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {PERIOD_OPTIONS.map((opt) => (
          <GoldPill
            key={opt.key}
            active={period === opt.key}
            onClick={() => setPeriod(opt.key)}
            style={{ minHeight: 32, minWidth: opt.key === "ARV" ? 60 : 38, justifyContent: "center", padding: "5px 9px" }}
          >
            {opt.label}
          </GoldPill>
        ))}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} theme={theme} />

      {activeTab === "overview" && (
        <>
          <TablePanel theme={theme} title="Dashboard Killer — résumé">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {kpiTop.map((item) => (
                <NeonKpi key={item.label} {...item} />
              ))}
            </div>
          </TablePanel>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Kills — tendance récente" subtitle="Sparkline des 12 derniers matchs">
              <Sparkline theme={theme} points={killTrend} color="#FF6FB5" emptyLabel="Pas assez de matchs pour tracer la tendance." />
            </ChartCard>
            <ChartCard theme={theme} title="Résultats" subtitle={`${agg.played || 0} matchs sur la période`}>
              <PieStatChart theme={theme} data={resultPie} centerLabel={fmtPct(agg.winRate || 0)} centerSub="win rate" />
            </ChartCard>
          </div>

          <TablePanel theme={theme} title="Forme récente — 5 derniers matchs">
            <RecentForm
              theme={theme}
              items={recentFive}
              winRate={recentWinRate}
              winRateDelta={recentWinRate - previousWinRate}
              killsAvg={recentKillsAvg}
              killsDelta={recentKillsAvg - previousKillsAvg}
              hitRate={recentHitRate}
              hitRateDelta={recentHitRate - previousHitRate}
              livesDelta={recentLivesDelta}
              livesDeltaChange={recentLivesDelta - previousLivesDelta}
              currentWinStreak={data.records?.currentWinStreak || 0}
            />
          </TablePanel>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Kills vs deaths" subtitle="Évolution sur les 12 derniers matchs">
              <MultiLineTrend
                theme={theme}
                data={combatTrend}
                series={[
                  { key: "kills", label: "Kills", color: "#FF6FB5" },
                  { key: "deaths", label: "Deaths", color: "#47B5FF" },
                ]}
              />
            </ChartCard>
            <ChartCard theme={theme} title="Profil de performance" subtitle="Taux clés de la période">
              <PercentBars theme={theme} data={performanceProfile} />
            </ChartCard>
          </div>

          <TablePanel theme={theme} title="Moyennes & efficacité">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
              <MiniStat theme={theme} label="Hits / match" value={fmt2(hitsAvg)} sub={`${agg.totalHits || 0} hits`} />
              <MiniStat theme={theme} label="Hits / darts" value={fmtPct(hitRate)} sub={`${agg.dartsTotal || 0} darts`} />
              <MiniStat theme={theme} label="Kills / 100 darts" value={fmt2(killsPer100Darts)} />
              <MiniStat theme={theme} label="Actions spéciales / match" value={fmt2(specialAvg)} sub={`${specialTotal} actions`} />
              <MiniStat theme={theme} label="Vies prises / match" value={fmt2(livesTakenAvg)} />
              <MiniStat theme={theme} label="Vies perdues / match" value={fmt2(livesLostAvg)} />
              <MiniStat theme={theme} label="Taux de podium" value={fmtPct(podiumRate)} sub={`${totalPodium} podiums`} />
              <MiniStat theme={theme} label="Matchs sans death" value={fmtPct(noDeathRate)} sub={`${noDeathMatches}/${played || 0}`} />
            </div>
          </TablePanel>

          <TablePanel theme={theme} title="Synthèse joueur">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
              <MiniStat theme={theme} label="Dernière partie" value={fmtDate(data.lastAt)} small />
              <MiniStat theme={theme} label="Segment favori" value={agg.favSegment || "—"} sub={`${agg.favSegmentHits || 0} hits`} />
              <MiniStat theme={theme} label="Numéro favori" value={fmtFavNum(agg.favNumber)} sub={`${agg.favNumberHits || 0} hits`} />
              <MiniStat theme={theme} label="Podiums" value={totalPodium} sub={`${agg.firsts || 0} titre${num(agg.firsts) > 1 ? "s" : ""}`} />
              <MiniStat theme={theme} label="Darts / match" value={fmt2(agg.dartsAvg || 0)} sub={`${agg.dartsTotal || 0} darts`} />
              <MiniStat theme={theme} label="Ratio K/D" value={fmt2(killDeathRatio)} sub={`${agg.deathsTotal || 0} deaths`} />
              <MiniStat theme={theme} label="Top 2" value={fmtPct(top2Rate)} sub={`${num(agg.firsts) + num(agg.seconds)} matchs`} />
              <MiniStat theme={theme} label="Actions tactiques" value={tacticalTotal} sub={`${played ? fmt2(tacticalTotal / played) : "0.00"} / match`} />
            </div>
          </TablePanel>

          <TablePanel theme={theme} title="Records personnels — tous temps">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
              <RecordStat theme={theme} label="Kills sur un match" value={data.records?.bestKills?.value || 0} when={data.records?.bestKills?.when} color="#FF6FB5" />
              <RecordStat theme={theme} label="Hits sur un match" value={data.records?.bestHits?.value || 0} when={data.records?.bestHits?.when} color="#77FF9B" />
              <RecordStat theme={theme} label="Vies prises / match" value={data.records?.bestLivesTaken?.value || 0} when={data.records?.bestLivesTaken?.when} color="#47B5FF" />
              <RecordStat theme={theme} label="Meilleur delta vies" value={`${num(data.records?.bestLivesDelta?.value) >= 0 ? "+" : ""}${num(data.records?.bestLivesDelta?.value)}`} when={data.records?.bestLivesDelta?.when} color="#B996FF" />
              <RecordStat theme={theme} label="Précision Killer" value={fmtPct(data.records?.bestPrecisionKiller?.value || 0)} when={data.records?.bestPrecisionKiller?.when} color="#F6C256" />
              <RecordStat theme={theme} label="Précision offensive" value={fmtPct(data.records?.bestPrecisionOffensive?.value || 0)} when={data.records?.bestPrecisionOffensive?.when} color="#5DE2E7" />
              <RecordStat theme={theme} label="Meilleur hit rate" value={fmtPct(data.records?.bestHitRate?.value || 0)} when={data.records?.bestHitRate?.when} color="#77FF9B" />
              <RecordStat theme={theme} label="Kills / 100 darts" value={fmt2(data.records?.bestKillsPer100Darts?.value || 0)} when={data.records?.bestKillsPer100Darts?.when} color="#FF6FB5" />
              <RecordStat theme={theme} label="Actions tactiques / match" value={data.records?.bestTacticalActions?.value || 0} when={data.records?.bestTacticalActions?.when} color="#47B5FF" />
              <RecordStat theme={theme} label="Actions spéciales / match" value={data.records?.bestSpecialActions?.value || 0} when={data.records?.bestSpecialActions?.when} color="#B996FF" />
              <RecordStat theme={theme} label="Victoire la + rapide" value={data.records?.fastestWin?.value ? `${data.records.fastestWin.value} darts` : "—"} when={data.records?.fastestWin?.when} color="#5DE2E7" />
              <RecordStat theme={theme} label="Série de victoires" value={data.records?.bestWinStreak || 0} sub="victoires consécutives" color="#FF8A65" />
              <RecordStat theme={theme} label="Série de podiums" value={data.records?.bestPodiumStreak || 0} sub="podiums consécutifs" color="#F6C256" />
              <RecordStat theme={theme} label="Meilleure place" value={data.records?.bestRank ? `${data.records.bestRank}${data.records.bestRank === 1 ? "er" : "e"}` : "—"} sub={`${data.records?.matchCount || 0} matchs Killer analysés`} color="#F6C256" />
            </div>
          </TablePanel>
        </>
      )}

      {activeTab === "combat" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
            <MiniKpi label="Précision offensive" value={fmtPct(agg.precisionOffensive || 0)} color="#77FF9B" />
            <MiniKpi label="Précision Killer" value={fmtPct(agg.precisionKiller || 0)} color="#F6C256" />
            <MiniKpi label="Ratio K/D" value={fmt2(killDeathRatio)} color="#FF6FB5" />
            <MiniKpi label="Delta vies" value={`${livesDelta >= 0 ? "+" : ""}${livesDelta}`} color="#47B5FF" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Balance de combat" subtitle="Kills, deaths et vies échangées">
              <SimpleBars theme={theme} data={combatBalance} />
            </ChartCard>
            <ChartCard theme={theme} title="Vies prises vs perdues" subtitle="Évolution sur les 12 derniers matchs">
              <MultiLineTrend
                theme={theme}
                data={livesTrend}
                series={[
                  { key: "taken", label: "Prises", color: "#77FF9B" },
                  { key: "lost", label: "Perdues", color: "#FF8A65" },
                ]}
              />
            </ChartCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Précision récente" subtitle="Hit rate et précision Killer">
              <MultiLineTrend
                theme={theme}
                data={efficiencyTrend}
                yMax={100}
                suffix="%"
                series={[
                  { key: "hitRate", label: "Hits/darts", color: "#77FF9B" },
                  { key: "killerPrecision", label: "Killer", color: "#F6C256" },
                ]}
              />
            </ChartCard>
            <ChartCard theme={theme} title="Répartition des zones" subtitle="Simples, doubles, triples et Bulls">
              <PieStatChart theme={theme} data={ringPie} centerLabel={`${ringPie.reduce((s, x) => s + x.value, 0)}`} centerSub="hits classés" />
            </ChartCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Hits par segment" subtitle="Top 10 des segments les plus touchés">
              <BarsBySegment theme={theme} data={segmentData} />
            </ChartCard>
            <ChartCard theme={theme} title="Top numéros" subtitle="Numéros les plus touchés, tous multiplicateurs confondus">
              <BarsBySegment theme={theme} data={numberData} />
            </ChartCard>
            <ChartCard theme={theme} title="Actions de combat" subtitle="Répartition des événements Killer suivis">
              <PieStatChart theme={theme} data={specialPie} centerLabel={`${specialPie.reduce((s, x) => s + x.value, 0)}`} centerSub="actions" />
            </ChartCard>
          </div>

          <TablePanel theme={theme} title="Détails combat">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
              {combatGroups.map((group) => (
                <MetricClusterCompact key={group.title} theme={theme} {...group} />
              ))}
            </div>
          </TablePanel>
        </>
      )}

      {activeTab === "ranking" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
            <MiniKpi label="Podiums" value={totalPodium} color="#F6C256" />
            <MiniKpi label="Titres" value={agg.firsts || 0} color="#77FF9B" />
            <MiniKpi label="Place moyenne" value={avgPlacement ? fmt2(avgPlacement) : "—"} color="#47B5FF" />
            <MiniKpi label="Victoires" value={agg.wins || 0} color="#FF6FB5" />
          </div>

          <TablePanel theme={theme} title="Régularité & séries">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
              <MiniStat theme={theme} label="Taux de podium" value={fmtPct(podiumRate)} sub={`${totalPodium}/${played || 0}`} />
              <MiniStat theme={theme} label="Taux Top 2" value={fmtPct(top2Rate)} sub={`${num(agg.firsts) + num(agg.seconds)} matchs`} />
              <MiniStat theme={theme} label="Série victoires record" value={data.records?.bestWinStreak || 0} />
              <MiniStat theme={theme} label="Série podiums record" value={data.records?.bestPodiumStreak || 0} />
            </div>
            <div style={{ marginTop: 9 }}>
              <FormStrip theme={theme} items={(data.items || []).slice(0, 12).reverse()} />
            </div>
          </TablePanel>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Répartition des places" subtitle="Classements finaux enregistrés">
              <PlacementBars theme={theme} data={placementData} />
            </ChartCard>
            <ChartCard theme={theme} title="Évolution du classement" subtitle="Sparkline des 12 derniers classements">
              <Sparkline theme={theme} points={rankTrend} color="#F6C256" invert emptyLabel="Pas assez de classements enregistrés." />
            </ChartCard>
          </div>

          <TablePanel theme={theme} title="Podiums & classements">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
              <PlaceBox theme={theme} rank="1er" count={agg.firsts || 0} />
              <PlaceBox theme={theme} rank="2e" count={agg.seconds || 0} />
              <PlaceBox theme={theme} rank="3e" count={agg.thirds || 0} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
              {placementRows.map((row) => (
                <MiniStat key={row.rank} theme={theme} label={`${row.rank}e place`} value={row.count} />
              ))}
              {!placementRows.length ? <EmptyText theme={theme}>Aucun classement final exploitable pour le moment.</EmptyText> : null}
            </div>
          </TablePanel>
        </>
      )}

      {activeTab === "history" && (
        <TablePanel theme={theme} title="Historique des matchs Killer">
          <div style={{ maxHeight: 540, overflowY: "auto", paddingRight: 3, display: "flex", flexDirection: "column", gap: 8 }}>
            {(data.items || []).slice(0, 30).map((it: any) => (
              <HistoryRow key={it.id} theme={theme} item={it} />
            ))}
            {!data.items?.length ? <EmptyText theme={theme}>Aucun historique KILLER récent.</EmptyText> : null}
          </div>
        </TablePanel>
      )}
    </div>
  );
}

function TabBar({ active, onChange, theme }: { active: KillerTab; onChange: (v: KillerTab) => void; theme: any }) {
  const tabs: Array<{ key: KillerTab; label: string; icon: string }> = [
    { key: "overview", label: "Résumé", icon: "overview" },
    { key: "combat", label: "Combat", icon: "combat" },
    { key: "ranking", label: "Classement", icon: "ranking" },
    { key: "history", label: "Historique", icon: "history" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6, padding: 5, borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: "rgba(7,10,20,.78)" }}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <button
            type="button"
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              minWidth: 0,
              minHeight: 52,
              padding: "6px 3px",
              borderRadius: 13,
              border: `1px solid ${selected ? theme.primary : "rgba(255,255,255,.07)"}`,
              background: selected ? `linear-gradient(180deg, ${theme.primary}20, rgba(255,255,255,.035))` : "rgba(255,255,255,.02)",
              color: selected ? theme.primary : theme.textSoft,
              boxShadow: selected ? `0 0 14px ${theme.primary}22` : "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              cursor: "pointer",
            }}
          >
            <TabIcon kind={tab.icon} color={selected ? theme.primary : theme.textSoft} />
            <span style={{ fontSize: 9.8, lineHeight: 1, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TabIcon({ kind, color }: any) {
  if (kind === "combat") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
        <path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "ranking") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M8 4h8v3c0 3-1.8 5.2-4 5.2S8 10 8 7V4Z" stroke={color} strokeWidth="1.8" />
        <path d="M8 6H5c0 3 1.7 5 4.2 5M16 6h3c0 3-1.7 5-4.2 5M12 12v4M8 20h8M10 16h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "history") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" />
        <path d="M12 7v5l3 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.8" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function KpiIcon({ kind, color }: any) {
  if (kind === "percent") {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path d="M6 18L18 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="7" cy="7" r="2.2" stroke={color} strokeWidth="1.8" />
        <circle cx="17" cy="17" r="2.2" stroke={color} strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "target") return <TabIcon kind="combat" color={color} />;
  if (kind === "bars") {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="13" width="3.5" height="7" rx="1" stroke={color} strokeWidth="1.7" />
        <rect x="10.25" y="9" width="3.5" height="11" rx="1" stroke={color} strokeWidth="1.7" />
        <rect x="16.5" y="5" width="3.5" height="15" rx="1" stroke={color} strokeWidth="1.7" />
      </svg>
    );
  }
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M5 7h14M5 12h14M5 17h9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SectionTitle({ theme, title }: any) {
  return <div style={{ fontSize: 22, fontWeight: 1000, color: theme.primary, textShadow: `0 0 14px ${theme.primary}55`, letterSpacing: 0.7 }}>{title}</div>;
}

function NeonKpi({ label, value, sub, color, icon }: any) {
  return (
    <div style={{ borderRadius: 16, padding: "8px 9px", minHeight: 72, background: "linear-gradient(180deg, rgba(18,20,28,.95), rgba(12,13,18,.98))", border: `1px solid ${color}88`, boxShadow: `0 0 10px ${color}1A, inset 0 0 10px ${color}0A`, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ color: "rgba(255,255,255,.72)", fontSize: 9.5, fontWeight: 900, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <span style={{ width: 23, height: 23, borderRadius: 8, display: "grid", placeItems: "center", background: `${color}12`, border: `1px solid ${color}45`, flex: "0 0 auto" }}>
          <KpiIcon kind={icon} color={color} />
        </span>
      </div>
      <div style={{ marginTop: 3, color, fontSize: 18, lineHeight: 1, fontWeight: 900, textShadow: `0 0 8px ${color}38`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(value ?? "—")}</div>
      <div style={{ marginTop: 3, color: "rgba(255,255,255,.52)", fontSize: 9.2, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
    </div>
  );
}

function MiniKpi({ label, value, color }: any) {
  return (
    <div style={{ borderRadius: 14, padding: "7px 8px", minHeight: 54, border: `1px solid ${color}55`, background: "rgba(255,255,255,.025)", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 8.8, fontWeight: 900, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ marginTop: 3, color, fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{String(value ?? "—")}</div>
    </div>
  );
}

function TablePanel({ theme, title, children }: any) {
  return (
    <div style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(8,11,26,.96), rgba(7,9,18,.98))", boxShadow: `0 10px 24px rgba(0,0,0,.34), 0 0 16px ${theme.primary}0D` }}>
      <div style={{ padding: "11px 13px", fontSize: 14, fontWeight: 1000, color: theme.text, borderBottom: `1px solid ${theme.borderSoft}`, background: "linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,.015))" }}>{title}</div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}

function ChartCard({ theme, title, subtitle, children }: any) {
  return (
    <div style={{ minWidth: 0, borderRadius: 20, border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(10,14,31,.94), rgba(7,10,20,.98))", padding: 11, boxShadow: "0 10px 24px rgba(0,0,0,.3)" }}>
      <div style={{ fontSize: 13, color: theme.text, fontWeight: 1000 }}>{title}</div>
      <div style={{ marginTop: 2, fontSize: 10.5, color: theme.textSoft }}>{subtitle}</div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function Sparkline({ theme, points, color, invert = false, emptyLabel }: any) {
  const clean = (Array.isArray(points) ? points : []).filter((p: any) => Number.isFinite(Number(p?.value)));
  if (clean.length < 2) return <EmptyText theme={theme}>{emptyLabel}</EmptyText>;

  const raw = clean.map((p: any) => Number(p.value));
  const rawMin = Math.min(...raw);
  const rawMax = Math.max(...raw);
  const drawValues = invert ? raw.map((v) => rawMin + rawMax - v) : raw;
  const min = Math.min(...drawValues);
  const max = Math.max(...drawValues);
  const span = Math.max(1, max - min);
  const w = 360;
  const h = 118;
  const px = 12;
  const py = 12;
  const coords = drawValues.map((v, idx) => {
    const x = px + (idx / Math.max(1, drawValues.length - 1)) * (w - px * 2);
    const y = h - py - ((v - min) / span) * (h - py * 2);
    return { x, y };
  });
  const d = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const best = invert ? Math.min(...raw) : Math.max(...raw);
  const avg = raw.reduce((s, v) => s + v, 0) / raw.length;
  const last = raw[raw.length - 1];

  return (
    <div>
      <div style={{ height: 126, borderRadius: 15, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.018)", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
          <path d={`M${px},${h - py} H${w - px}`} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
          <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {coords.map((p, idx) => <circle key={idx} cx={p.x} cy={p.y} r="3" fill={color} />)}
        </svg>
      </div>
      <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        <TinyValue theme={theme} label="Dernier" value={fmt2(last)} />
        <TinyValue theme={theme} label="Moyenne" value={fmt2(avg)} />
        <TinyValue theme={theme} label={invert ? "Meilleure place" : "Meilleur"} value={fmt2(best)} />
      </div>
    </div>
  );
}

function BarsBySegment({ theme, data }: any) {
  if (!Array.isArray(data) || !data.length) return <EmptyText theme={theme}>Aucun hit par segment exploitable pour le moment.</EmptyText>;
  const height = Math.max(220, data.length * 28);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={data} layout="vertical" margin={{ top: 4, right: 10, bottom: 4, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={48} tick={{ fill: theme.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,.035)" }} contentStyle={{ background: "#0b1020", border: `1px solid ${theme.borderSoft}`, borderRadius: 10, color: theme.text, fontSize: 11 }} formatter={(v: any) => [v, "Hits"]} />
          <Bar dataKey="value" fill="#47B5FF" radius={[0, 7, 7, 0]} maxBarSize={15} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlacementBars({ theme, data }: any) {
  if (!Array.isArray(data) || !data.length) return <EmptyText theme={theme}>Aucun classement final enregistré.</EmptyText>;
  return (
    <div style={{ width: "100%", height: 230 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={data} margin={{ top: 8, right: 8, bottom: 2, left: -22 }}>
          <XAxis dataKey="name" tick={{ fill: theme.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: theme.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,.035)" }} contentStyle={{ background: "#0b1020", border: `1px solid ${theme.borderSoft}`, borderRadius: 10, color: theme.text, fontSize: 11 }} formatter={(v: any) => [v, "Matchs"]} />
          <Bar dataKey="value" fill="#F6C256" radius={[7, 7, 2, 2]} maxBarSize={28} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieStatChart({ theme, data, centerLabel, centerSub }: any) {
  const list = (Array.isArray(data) ? data : []).filter((x: any) => num(x?.value) > 0);
  if (!list.length) return <EmptyText theme={theme}>Pas encore assez de données pour ce camembert.</EmptyText>;
  return (
    <div>
      <div style={{ position: "relative", width: "100%", height: 205 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Tooltip contentStyle={{ background: "#0b1020", border: `1px solid ${theme.borderSoft}`, borderRadius: 10, color: theme.text, fontSize: 11 }} formatter={(v: any) => [v, "Total"]} />
            <Pie data={list} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={2} stroke="rgba(255,255,255,.05)" strokeWidth={1}>
              {list.map((_: any, index: number) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
            </Pie>
          </RePieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: theme.text, fontSize: 21, fontWeight: 1000, lineHeight: 1 }}>{centerLabel}</div>
            <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.5, textTransform: "uppercase", fontWeight: 900 }}>{centerSub}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "5px 8px" }}>
        {list.map((item: any, index: number) => (
          <div key={item.name} style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6, color: theme.textSoft, fontSize: 10.5 }}>
            <span style={{ width: 8, height: 8, flex: "0 0 auto", borderRadius: 999, background: PIE_COLORS[index % PIE_COLORS.length] }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
            <strong style={{ marginLeft: "auto", color: theme.text }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}


function MultiLineTrend({ theme, data, series, yMax, suffix = "" }: any) {
  const rows = (Array.isArray(data) ? data : []).filter((row: any) =>
    (Array.isArray(series) ? series : []).some((s: any) => Number.isFinite(Number(row?.[s?.key])))
  );
  if (rows.length < 2) return <EmptyText theme={theme}>Pas assez de matchs pour tracer cette évolution.</EmptyText>;
  return (
    <div>
      <div style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={rows} margin={{ top: 8, right: 8, bottom: 2, left: -25 }}>
            <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: theme.textSoft, fontSize: 8.5 }} axisLine={false} tickLine={false} minTickGap={14} />
            <YAxis domain={yMax ? [0, yMax] : [0, "auto"]} tick={{ fill: theme.textSoft, fontSize: 8.5 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#0b1020", border: `1px solid ${theme.borderSoft}`, borderRadius: 10, color: theme.text, fontSize: 10.5 }}
              formatter={(v: any, name: any) => [`${fmt2(v)}${suffix}`, name]}
            />
            {(Array.isArray(series) ? series : []).map((s: any) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.4}
                dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </ReLineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 5, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {(Array.isArray(series) ? series : []).map((s: any) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: theme.textSoft, fontSize: 9.5, fontWeight: 800 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SimpleBars({ theme, data }: any) {
  const rows = (Array.isArray(data) ? data : []).filter((r: any) => safeStr(r?.name) && num(r?.value) >= 0);
  if (!rows.length) return <EmptyText theme={theme}>Aucune donnée exploitable pour ce graphique.</EmptyText>;
  return (
    <div style={{ width: "100%", height: 205 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={rows} margin={{ top: 8, right: 8, bottom: 2, left: -22 }}>
          <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: theme.textSoft, fontSize: 8.5 }} axisLine={false} tickLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fill: theme.textSoft, fontSize: 8.5 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,.035)" }} contentStyle={{ background: "#0b1020", border: `1px solid ${theme.borderSoft}`, borderRadius: 10, color: theme.text, fontSize: 10.5 }} formatter={(v: any) => [v, "Total"]} />
          <Bar dataKey="value" fill="#47B5FF" radius={[7, 7, 2, 2]} maxBarSize={28} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PercentBars({ theme, data }: any) {
  const rows = (Array.isArray(data) ? data : []).filter((r: any) => safeStr(r?.name));
  if (!rows.length) return <EmptyText theme={theme}>Aucun taux disponible.</EmptyText>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row: any, idx: number) => {
        const value = Math.max(0, Math.min(100, num(row.value)));
        const color = PIE_COLORS[idx % PIE_COLORS.length];
        return (
          <div key={row.name}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9.8 }}>
              <span style={{ color: theme.textSoft, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
              <strong style={{ color: theme.text, flex: "0 0 auto" }}>{fmtPct(value)}</strong>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,.055)", overflow: "hidden", marginTop: 4 }}>
              <div style={{ height: "100%", width: `${value}%`, minWidth: value > 0 ? 2 : 0, borderRadius: 99, background: color, boxShadow: `0 0 8px ${color}55` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function deltaText(value: number, suffix = "") {
  if (!Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}${suffix}`;
}

function DeltaBadge({ value, suffix = "" }: any) {
  const n = num(value);
  const positive = n > 0.05;
  const negative = n < -0.05;
  const color = positive ? "#77FF9B" : negative ? "#FF8A65" : "rgba(255,255,255,.48)";
  return (
    <span style={{ fontSize: 8.5, fontWeight: 900, color, whiteSpace: "nowrap" }}>
      {positive ? "▲ " : negative ? "▼ " : "• "}{deltaText(n, suffix)}
    </span>
  );
}

function RecentForm({ theme, items, winRate, winRateDelta, killsAvg, killsDelta, hitRate, hitRateDelta, livesDelta, livesDeltaChange, currentWinStreak }: any) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <div>
      <FormStrip theme={theme} items={rows.slice().reverse()} />
      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 6 }}>
        <MiniTrendStat theme={theme} label="Win rate L5" value={fmtPct(winRate)} delta={<DeltaBadge value={winRateDelta} suffix=" pts" />} />
        <MiniTrendStat theme={theme} label="Kills / match L5" value={fmt2(killsAvg)} delta={<DeltaBadge value={killsDelta} />} />
        <MiniTrendStat theme={theme} label="Hit rate L5" value={fmtPct(hitRate)} delta={<DeltaBadge value={hitRateDelta} suffix=" pts" />} />
        <MiniTrendStat theme={theme} label="Δ vies / match L5" value={`${num(livesDelta) >= 0 ? "+" : ""}${fmt2(livesDelta)}`} delta={<DeltaBadge value={livesDeltaChange} />} />
      </div>
      <div style={{ marginTop: 7, color: theme.textSoft, fontSize: 9.3 }}>
        Comparaison avec les 5 matchs précédents · série de victoires actuelle : <b style={{ color: theme.text }}>{currentWinStreak || 0}</b>
      </div>
    </div>
  );
}

function MiniTrendStat({ theme, label, value, delta }: any) {
  return (
    <div style={{ minWidth: 0, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.02)", padding: "7px 8px" }}>
      <div style={{ color: theme.textSoft, fontSize: 8.6, fontWeight: 900, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 3, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <strong style={{ color: theme.text, fontSize: 15, lineHeight: 1 }}>{value}</strong>
        {delta}
      </div>
    </div>
  );
}

function FormStrip({ theme, items }: any) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return <EmptyText theme={theme}>Pas encore de forme récente exploitable.</EmptyText>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, rows.length)}, minmax(0,1fr))`, gap: 4 }}>
        {rows.map((item: any, idx: number) => {
          const rank = num(item?.rank);
          const win = Boolean(item?.win) || rank === 1;
          const podium = rank > 0 && rank <= 3;
          const color = win ? "#77FF9B" : podium ? "#F6C256" : rank > 0 ? "#47B5FF" : "rgba(255,255,255,.28)";
          return (
            <div
              key={`${item?.when || idx}-${idx}`}
              title={`${item?.dateLabel || "Match"} · ${win ? "Victoire" : rank > 0 ? `${rank}e` : "Sans classement"}`}
              style={{
                minWidth: 0,
                height: 25,
                borderRadius: 8,
                border: `1px solid ${color}66`,
                background: `${color}16`,
                color,
                display: "grid",
                placeItems: "center",
                fontSize: 8.5,
                fontWeight: 1000,
                boxShadow: win ? `0 0 9px ${color}30` : "none",
              }}
            >
              {win ? "W" : rank > 0 ? rank : "—"}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 5, display: "flex", gap: 9, flexWrap: "wrap", color: theme.textSoft, fontSize: 8.5 }}>
        <span><b style={{ color: "#77FF9B" }}>W</b> victoire</span>
        <span><b style={{ color: "#F6C256" }}>2/3</b> podium</span>
        <span><b style={{ color: "#47B5FF" }}>4+</b> autre place</span>
      </div>
    </div>
  );
}

function MetricClusterCompact({ theme, title, color, items }: any) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${color}45`, padding: 9, background: "rgba(255,255,255,.018)" }}>
      <div style={{ color, fontSize: 11, fontWeight: 1000, textTransform: "uppercase", marginBottom: 7 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 5 }}>
        {items.map(([label, value]: any) => (
          <div key={label} style={{ minWidth: 0, borderRadius: 10, background: "rgba(255,255,255,.025)", padding: "7px 6px" }}>
            <div style={{ color: theme.textSoft, fontSize: 9.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
            <div style={{ marginTop: 3, color: theme.text, fontSize: 15, lineHeight: 1, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(value ?? "—")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ theme, label, value, sub, small = false }: any) {
  return (
    <div style={{ minWidth: 0, borderRadius: 13, border: `1px solid ${theme.borderSoft}`, padding: "7px 8px", background: "rgba(255,255,255,.02)" }}>
      <div style={{ fontSize: 8.8, color: theme.textSoft, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: small ? 10.5 : 16, lineHeight: small ? 1.15 : 1, fontWeight: 900, color: theme.primary, overflow: "hidden", textOverflow: "ellipsis" }}>{String(value ?? "—")}</div>
      {sub ? <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div> : null}
    </div>
  );
}

function RecordStat({ theme, label, value, when, sub, color = "#F6C256" }: any) {
  const detail = sub || (num(when) > 0 ? `le ${fmtShortDate(when)}` : "record tous temps");
  return (
    <div style={{ minWidth: 0, borderRadius: 13, border: `1px solid ${color}55`, padding: "7px 8px", background: `linear-gradient(180deg, ${color}0B, rgba(255,255,255,.018))` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: color, fontSize: 8.8, fontWeight: 900, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        <span aria-hidden="true" style={{ fontSize: 10 }}>★</span>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </div>
      <div style={{ marginTop: 4, color: theme.text, fontSize: 17, lineHeight: 1, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(value ?? "—")}</div>
      <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 8.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</div>
    </div>
  );
}

function TinyValue({ theme, label, value }: any) {
  return (
    <div style={{ minWidth: 0, borderRadius: 10, background: "rgba(255,255,255,.025)", padding: "5px 6px", textAlign: "center" }}>
      <div style={{ color: theme.textSoft, fontSize: 8.7, textTransform: "uppercase", fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 2, color: theme.text, fontSize: 12, fontWeight: 1000 }}>{value}</div>
    </div>
  );
}

function PlaceBox({ theme, rank, count }: any) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft}`, padding: "9px 8px", background: "rgba(255,255,255,.022)", textAlign: "center" }}>
      <div style={{ color: theme.primary, fontSize: 12, fontWeight: 1000 }}>{rank}</div>
      <div style={{ marginTop: 3, color: theme.text, fontSize: 24, lineHeight: 1, fontWeight: 1000 }}>{count}</div>
    </div>
  );
}

function HistoryRow({ theme, item }: any) {
  return (
    <div style={{ borderRadius: 15, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.018)", padding: "9px 10px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: theme.text, fontSize: 11.5, fontWeight: 900 }}>{fmtDate(item.when)}</div>
          <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.names || "—"}</div>
          <div style={{ marginTop: 5, display: "flex", gap: 8, flexWrap: "wrap", color: theme.textSoft, fontSize: 9.8 }}>
            <span>Kills <b style={{ color: "#FF6FB5" }}>{item.kills || 0}</b></span>
            <span>Deaths <b style={{ color: "#47B5FF" }}>{item.deaths || 0}</b></span>
            <span>Darts <b style={{ color: theme.text }}>{item.darts || 0}</b></span>
            <span>Hits <b style={{ color: "#77FF9B" }}>{item.hits || 0}</b></span>
            <span>Hit rate <b style={{ color: "#77FF9B" }}>{fmtPct(item.hitRate || 0)}</b></span>
            <span>Δ vies <b style={{ color: num(item.livesDelta) >= 0 ? "#77FF9B" : "#FF8A65" }}>{num(item.livesDelta) >= 0 ? "+" : ""}{num(item.livesDelta)}</b></span>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 64 }}>
          <div style={{ fontSize: 18, color: item.rank === 1 ? "#77FF9B" : theme.primary, fontWeight: 1000 }}>{item.rank > 0 ? `${item.rank}e` : "—"}</div>
          <div style={{ marginTop: 2, color: item.rank === 1 ? "#77FF9B" : theme.textSoft, fontWeight: 1000, fontSize: 9.5 }}>{item.rank === 1 ? "WIN" : item.rank > 0 ? "PLACE" : "—"}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyText({ theme, children }: any) {
  return <div style={{ color: theme.textSoft, fontSize: 11, padding: "12px 4px" }}>{children}</div>;
}
