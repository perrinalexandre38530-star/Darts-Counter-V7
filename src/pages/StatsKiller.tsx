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
        livesTaken: num(matchAgg?.livesTakenTotal),
        livesLost: num(matchAgg?.livesLostTotal),
      };
    });

    return {
      agg,
      items,
      played: agg?.played || filtered.length,
      wins: agg?.wins || 0,
      lastAt: agg?.lastAt || items[0]?.when || 0,
      placements: agg?.placements || {},
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

  const recentForTrend = (data.items || []).slice(0, 12).reverse();
  const killTrend = recentForTrend.map((it: any) => ({ label: it.dateLabel, value: num(it.kills) }));
  const rankTrend = recentForTrend.filter((it: any) => num(it.rank) > 0).map((it: any) => ({ label: it.dateLabel, value: num(it.rank) }));

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
        {kpiTop.map((item) => (
          <NeonKpi key={item.label} {...item} />
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Kills — tendance récente" subtitle="Sparkline des 12 derniers matchs">
              <Sparkline theme={theme} points={killTrend} color="#FF6FB5" emptyLabel="Pas assez de matchs pour tracer la tendance." />
            </ChartCard>
            <ChartCard theme={theme} title="Résultats" subtitle={`${agg.played || 0} matchs sur la période`}>
              <PieStatChart theme={theme} data={resultPie} centerLabel={fmtPct(agg.winRate || 0)} centerSub="win rate" />
            </ChartCard>
          </div>

          <TablePanel theme={theme} title="Synthèse joueur">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
              <MiniStat theme={theme} label="Dernière partie" value={fmtDate(data.lastAt)} small />
              <MiniStat theme={theme} label="Segment favori" value={agg.favSegment || "—"} sub={`${agg.favSegmentHits || 0} hits`} />
              <MiniStat theme={theme} label="Numéro favori" value={fmtFavNum(agg.favNumber)} sub={`${agg.favNumberHits || 0} hits`} />
              <MiniStat theme={theme} label="Podiums" value={totalPodium} sub={`${agg.firsts || 0} titre${num(agg.firsts) > 1 ? "s" : ""}`} />
              <MiniStat theme={theme} label="Darts / match" value={fmt2(agg.dartsAvg || 0)} sub={`${agg.dartsTotal || 0} darts`} />
              <MiniStat theme={theme} label="Ratio K/D" value={fmt2(killDeathRatio)} sub={`${agg.deathsTotal || 0} deaths`} />
            </div>
          </TablePanel>
        </>
      )}

      {activeTab === "combat" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
            <MiniKpi label="Précision offensive" value={fmtPct(agg.precisionOffensive || 0)} color="#77FF9B" />
            <MiniKpi label="Précision Killer" value={fmtPct(agg.precisionKiller || 0)} color="#F6C256" />
            <MiniKpi label="Ratio K/D" value={fmt2(killDeathRatio)} color="#FF6FB5" />
            <MiniKpi label="Delta vies" value={`${livesDelta >= 0 ? "+" : ""}${livesDelta}`} color="#47B5FF" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 10 }}>
            <ChartCard theme={theme} title="Hits par segment" subtitle="Top 10 des segments les plus touchés">
              <BarsBySegment theme={theme} data={segmentData} />
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
            <MiniKpi label="Podiums" value={totalPodium} color="#F6C256" />
            <MiniKpi label="Titres" value={agg.firsts || 0} color="#77FF9B" />
            <MiniKpi label="Place moyenne" value={avgPlacement ? fmt2(avgPlacement) : "—"} color="#47B5FF" />
            <MiniKpi label="Victoires" value={agg.wins || 0} color="#FF6FB5" />
          </div>

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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 7 }}>
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
    { key: "overview", label: "Vue", icon: "overview" },
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
    <div style={{ borderRadius: 17, padding: "10px 11px", minHeight: 86, background: "linear-gradient(180deg, rgba(18,20,28,.95), rgba(12,13,18,.98))", border: `1px solid ${color}88`, boxShadow: `0 0 12px ${color}20, inset 0 0 12px ${color}0C`, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ color: "rgba(255,255,255,.74)", fontSize: 10.5, fontWeight: 900, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <span style={{ width: 27, height: 27, borderRadius: 9, display: "grid", placeItems: "center", background: `${color}12`, border: `1px solid ${color}45`, flex: "0 0 auto" }}>
          <KpiIcon kind={icon} color={color} />
        </span>
      </div>
      <div style={{ marginTop: 5, color, fontSize: 25, lineHeight: 1, fontWeight: 1000, textShadow: `0 0 9px ${color}45`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(value ?? "—")}</div>
      <div style={{ marginTop: 5, color: "rgba(255,255,255,.55)", fontSize: 10.5, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
    </div>
  );
}

function MiniKpi({ label, value, color }: any) {
  return (
    <div style={{ borderRadius: 15, padding: "9px 10px", border: `1px solid ${color}55`, background: "rgba(255,255,255,.025)", minWidth: 0 }}>
      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ marginTop: 4, color, fontSize: 21, fontWeight: 1000, lineHeight: 1 }}>{String(value ?? "—")}</div>
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
    <div style={{ minWidth: 0, borderRadius: 14, border: `1px solid ${theme.borderSoft}`, padding: "8px 9px", background: "rgba(255,255,255,.02)" }}>
      <div style={{ fontSize: 9.5, color: theme.textSoft, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: small ? 12 : 19, lineHeight: small ? 1.2 : 1, fontWeight: 1000, color: theme.primary, overflow: "hidden", textOverflow: "ellipsis" }}>{String(value ?? "—")}</div>
      {sub ? <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div> : null}
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
