// =============================================================
// src/pages/StatsOnline.tsx
// Page STATS ONLINE — clone visuel de la page TRAINING X01
// - Header arrondi + filtres Jour / Semaine / Mois / Année / All
// - KPIs : Sessions, Moy.3D, Best Visit, Best CO, etc.
// - Carte "Stats détaillées (période)" (tableau)
// - Cartes "Moyennes / Records / Favoris"
// - Classement Online (top joueurs)
// - Blocs Progression / Radar / Hits / Dernières sessions (placeholders)
// =============================================================
import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";
import { loadStore } from "../lib/storage";
import { loadAllOnlineX01Samples } from "../lib/x01StatsSource";
import { onlineApi } from "../lib/onlineApi";
import { loadOnlineMatches } from "../lib/onlineMatchesStore";
import { filterOnlineStatsHardDeleted } from "../lib/onlineStatsExclusions";


type TimeRange = "day" | "week" | "month" | "year" | "all";

type OnlineAgg = {
  sessions: number;
  totalDarts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  h60: number;
  h100: number;
  h140: number;
  h180: number;
};

type OnlineRow = {
  darts: number;
  hits: number;
  miss: number;
  s: number;
  d: number;
  t: number;
  bull: number;
  dbull: number;
  bust: number;
};

type OnlineSession = {
  id: string;
  createdAt: number;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
};

type LeaderRow = {
  playerId: string;
  name: string;
  matches: number;
  wins: number;
  avg3: number;
};

function getRangeStart(range: TimeRange): number | null {
  const now = new Date();
  const start = new Date(now);

  switch (range) {
    case "day":
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    case "week": {
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    case "all":
    default:
      return null;
  }
}

function inSelectedRange(createdAt: any, range: TimeRange): boolean {
  const fromTs = getRangeStart(range);
  if (!fromTs) return true;
  const ts = Number(createdAt || 0);
  return Number.isFinite(ts) && ts >= fromTs;
}

function toNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOnlineHistoryMatch(row: any, idx = 0): any | null {
  if (!row || typeof row !== "object") return null;
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const nestedPayload = payload?.payload && typeof payload.payload === "object" ? payload.payload : {};
  const summary = row.summary && typeof row.summary === "object"
    ? row.summary
    : payload.summary && typeof payload.summary === "object"
    ? payload.summary
    : nestedPayload.summary && typeof nestedPayload.summary === "object"
    ? nestedPayload.summary
    : {};
  const isOnline =
    row.online === true ||
    payload.online === true ||
    nestedPayload.online === true ||
    payload.source === "online" ||
    nestedPayload.source === "online" ||
    !!payload.lobbyCode ||
    !!nestedPayload.lobbyCode ||
    !!row.lobbyCode;
  const mode = String(row.kind || payload.mode || payload.onlineMode || nestedPayload.mode || nestedPayload.onlineMode || row.mode || "").toLowerCase();
  if (!isOnline && mode !== "x01_online") return null;

  const players = Array.isArray(row.players) && row.players.length
    ? row.players
    : Array.isArray(payload.players) && payload.players.length
    ? payload.players
    : Array.isArray(nestedPayload.players)
    ? nestedPayload.players
    : [];
  const perPlayer = Array.isArray(summary.perPlayer)
    ? summary.perPlayer
    : Array.isArray(payload?.summary?.perPlayer)
    ? payload.summary.perPlayer
    : Array.isArray(nestedPayload?.summary?.perPlayer)
    ? nestedPayload.summary.perPlayer
    : [];
  const summaryPlayers = summary.players && typeof summary.players === "object" ? summary.players : {};
  const detailedByPlayer = summary.detailedByPlayer && typeof summary.detailedByPlayer === "object"
    ? summary.detailedByPlayer
    : summary.detailedbyplayer && typeof summary.detailedbyplayer === "object"
    ? summary.detailedbyplayer
    : {};

  const hasStructuredPlayerStats = perPlayer.length > 0 || Object.keys(summaryPlayers || {}).length > 0 || Object.keys(detailedByPlayer || {}).length > 0;
  let darts = hasStructuredPlayerStats ? 0 : toNumber(row.darts ?? payload.dartsCount ?? summary.darts, 0);
  let totalScore = hasStructuredPlayerStats ? 0 : toNumber(row.totalScore ?? payload.totalScore ?? summary.totalScore, 0);
  let bestVisit = toNumber(row.bestVisit ?? summary.bestVisit, 0);
  let bestCheckout = toNumber(row.bestCheckout ?? summary.bestCheckout, 0);
  let s = 0, d = 0, t = 0, miss = 0, bull = 0, dbull = 0, bust = 0;
  let h60 = 0, h100 = 0, h140 = 0, h180 = 0;

  const consumePlayerStats = (st: any) => {
    if (!st || typeof st !== "object") return;
    darts += toNumber(st.darts ?? st.dt ?? st.dartsThrown, 0);
    totalScore += toNumber(st._sumPoints ?? st.points ?? st.totalScore ?? st.totalscore, 0);
    bestVisit = Math.max(bestVisit, toNumber(st.bestVisit ?? st.bv, 0));
    bestCheckout = Math.max(bestCheckout, toNumber(st.bestCheckout ?? st.bc, 0));
    s += toNumber(st.singles ?? st.hitsS ?? st.hitsSingle ?? st?.hits?.S ?? st?.hits?.s, 0);
    d += toNumber(st.doubles ?? st.hitsD ?? st.hitsDouble ?? st?.hits?.D ?? st?.hits?.d, 0);
    t += toNumber(st.triples ?? st.hitsT ?? st.hitsTriple ?? st?.hits?.T ?? st?.hits?.t, 0);
    miss += toNumber(st.misses ?? st.miss ?? st?.hits?.M ?? st?.hits?.m, 0);
    bull += toNumber(st.bulls ?? st.bull ?? st?.hits?.Bull ?? st?.hits?.bull, 0);
    dbull += toNumber(st.dbulls ?? st.dBull ?? st.dbull ?? st?.hits?.DBull ?? st?.hits?.dbull, 0);
    bust += toNumber(st.busts ?? st.bust, 0);
    const buckets = st.buckets || {};
    h60 += toNumber(buckets["60+"] ?? st.h60, 0);
    h100 += toNumber(buckets["100+"] ?? st.h100, 0);
    h140 += toNumber(buckets["140+"] ?? st.h140, 0);
    h180 += toNumber(buckets["180"] ?? st.h180, 0);
  };

  if (perPlayer.length) {
    perPlayer.forEach(consumePlayerStats);
  } else if (Object.keys(summaryPlayers || {}).length) {
    Object.values(summaryPlayers).forEach(consumePlayerStats);
  } else {
    Object.values(detailedByPlayer || {}).forEach(consumePlayerStats);
  }

  if (!darts) {
    const replay = Array.isArray(payload.replayDarts) ? payload.replayDarts : Array.isArray(payload.darts) ? payload.darts : [];
    darts = replay.length;
    for (const dart of replay) {
      const mult = toNumber(dart?.mult ?? dart?.m ?? dart?.multiplier, 0);
      const v = toNumber(dart?.v ?? dart?.value ?? dart?.segment, 0);
      if (v === 0 || String(dart?.code || "").toUpperCase() === "MISS") miss += 1;
      else if (v === 25 && mult === 2) dbull += 1;
      else if (v === 25) bull += 1;
      else if (mult === 3) t += 1;
      else if (mult === 2) d += 1;
      else s += 1;
    }
  }

  const statsFromRow = row.stats || {};
  const breakdown = statsFromRow.breakdown || row.breakdown || {};
  if (!s && !d && !t && !miss && breakdown) {
    s = toNumber(breakdown.s ?? breakdown.S, 0);
    d = toNumber(breakdown.d ?? breakdown.D, 0);
    t = toNumber(breakdown.t ?? breakdown.T, 0);
    miss = toNumber(breakdown.miss, 0);
    bull = toNumber(breakdown.bull, 0);
    dbull = toNumber(breakdown.dbull ?? breakdown.dBull, 0);
    bust = toNumber(breakdown.bust, 0);
  }
  const hits = s + d + t + bull + dbull;
  const buckets = statsFromRow.buckets || row.buckets || {};
  h60 = h60 || toNumber(buckets["60+"] ?? buckets.h60, 0);
  h100 = h100 || toNumber(buckets["100+"] ?? buckets.h100, 0);
  h140 = h140 || toNumber(buckets["140+"] ?? buckets.h140, 0);
  h180 = h180 || toNumber(buckets["180"] ?? buckets.h180, 0);

  return {
    id: String(row.id || row.matchId || payload.matchId || `online-history-${idx}`),
    mode: String(payload.onlineMode || payload.mode || nestedPayload.onlineMode || nestedPayload.mode || row.kind || row.mode || "x01"),
    createdAt: toNumber(row.createdAt ?? row.updatedAt ?? payload.createdAt ?? nestedPayload.createdAt ?? Date.now(), Date.now()),
    finishedAt: toNumber(row.updatedAt ?? payload.finishedAt ?? nestedPayload.finishedAt ?? row.finishedAt ?? Date.now(), Date.now()),
    players,
    winnerId: row.winnerId ?? summary.winnerId ?? payload.winnerId ?? null,
    payload,
    summary,
    darts,
    totalScore,
    bestVisit,
    bestCheckout,
    stats: {
      darts,
      totalScore,
      bestVisit,
      bestCheckout,
      breakdown: { hits, miss, s, d, t, bull, dbull, bust },
      buckets: { "60+": h60, "100+": h100, "140+": h140, "180": h180 },
    },
  };
}

async function loadOnlineMatchesFromHistory(range: TimeRange) {
  try {
    const rows = await History.listFinished();
    const normalized = (Array.isArray(rows) ? rows : [])
      .map((row, idx) => normalizeOnlineHistoryMatch(row, idx))
      .filter(Boolean)
      .filter((row: any) => inSelectedRange(row.createdAt, range));
    return normalized as any[];
  } catch (err) {
    console.warn("[StatsOnline] Impossible de lire History online", err);
    return [] as any[];
  }
}

// Lecture souple de l’historique Online localStorage
function loadOnlineMatchesFromLocalStorage(range: TimeRange) {
  try {
    const all = typeof loadOnlineMatches === "function" ? loadOnlineMatches() : [];
    if (!Array.isArray(all) || !all.length)
      return { matches: [] as any[], sessions: [] as OnlineSession[] };

    const filtered = (Array.isArray(all) ? all : [])
      .map((m: any, idx: number) => normalizeOnlineHistoryMatch(m, idx))
      .filter(Boolean)
      .filter((m: any) => inSelectedRange(m?.createdAt ?? m?.date ?? m?.ts, range));

    const sessions: OnlineSession[] = filtered.map((m: any, idx: number) => {
      const darts = Number(m?.stats?.darts ?? m?.darts ?? 0);
      const totalScore = Number(m?.stats?.totalScore ?? m?.totalScore ?? 0);
      const avg3 =
        darts > 0 ? Math.round(((totalScore / darts) * 3) * 10) / 10 : 0;

      return {
        id:
          (m?.id as string) ||
          (m?.matchId as string) ||
          `sess-${idx}-${m?.createdAt ?? Date.now()}`,
        createdAt: Number(m?.createdAt ?? Date.now()),
        darts,
        avg3,
        bestVisit: Number(m?.stats?.bestVisit ?? m?.bestVisit ?? 0),
        bestCheckout: Number(m?.stats?.bestCheckout ?? m?.bestCheckout ?? 0),
      };
    });

    return { matches: filtered as any[], sessions };
  } catch (err) {
    console.warn("[StatsOnline] Impossible de lire les matchs online", err);
    return { matches: [] as any[], sessions: [] as OnlineSession[] };
  }
}

function aggregateOnline(matches: any[]): { agg: OnlineAgg; row: OnlineRow } {
  if (!matches.length) {
    return {
      agg: {
        sessions: 0,
        totalDarts: 0,
        avg3: 0,
        bestVisit: 0,
        bestCheckout: 0,
        h60: 0,
        h100: 0,
        h140: 0,
        h180: 0,
      },
      row: {
        darts: 0,
        hits: 0,
        miss: 0,
        s: 0,
        d: 0,
        t: 0,
        bull: 0,
        dbull: 0,
        bust: 0,
      },
    };
  }

  let sessions = matches.length;
  let totalDarts = 0;
  let totalScore = 0;

  let bestVisit = 0;
  let bestCheckout = 0;

  let hits = 0,
    miss = 0,
    s = 0,
    d = 0,
    t = 0,
    bull = 0,
    dbull = 0,
    bust = 0;

  let h60 = 0,
    h100 = 0,
    h140 = 0,
    h180 = 0;

  for (const m of matches) {
    const darts = Number(m?.stats?.darts ?? m?.darts ?? 0);
    const score = Number(m?.stats?.totalScore ?? m?.totalScore ?? 0);

    totalDarts += darts;
    totalScore += score;

    const br = m?.stats?.breakdown ?? m?.breakdown ?? {};
    hits += Number(br.hits ?? 0);
    miss += Number(br.miss ?? 0);
    s += Number(br.s ?? br.S ?? 0);
    d += Number(br.d ?? br.D ?? 0);
    t += Number(br.t ?? br.T ?? 0);
    bull += Number(br.bull ?? 0);
    dbull += Number(br.dbull ?? 0);
    bust += Number(br.bust ?? 0);

    const bv = Number(m?.stats?.bestVisit ?? m?.bestVisit ?? 0);
    if (bv > bestVisit) bestVisit = bv;

    const bco = Number(m?.stats?.bestCheckout ?? m?.bestCheckout ?? 0);
    if (bco > bestCheckout) bestCheckout = bco;

    const buckets = m?.stats?.buckets ?? m?.buckets ?? {};
    h60 += Number(buckets["60+"] ?? buckets.h60 ?? 0);
    h100 += Number(buckets["100+"] ?? buckets.h100 ?? 0);
    h140 += Number(buckets["140+"] ?? buckets.h140 ?? 0);
    h180 += Number(buckets["180"] ?? buckets.h180 ?? 0);
  }

  const avg3 =
    totalDarts > 0 ? Math.round(((totalScore / totalDarts) * 3) * 10) / 10 : 0;

  return {
    agg: {
      sessions,
      totalDarts,
      avg3,
      bestVisit,
      bestCheckout,
      h60,
      h100,
      h140,
      h180,
    },
    row: {
      darts: totalDarts,
      hits,
      miss,
      s,
      d,
      t,
      bull,
      dbull,
      bust,
    },
  };
}

function pct(part: number, tot: number): string {
  if (!tot || !Number.isFinite(part)) return "0.0%";
  return `${((part / tot) * 100).toFixed(1)}%`;
}

// Classement Online à partir des matchs (nombre de victoires + Moy.3D)
function buildLeaderboard(matches: any[]): LeaderRow[] {
  const map = new Map<
    string,
    LeaderRow & { _sumAvg3: number }
  >();

  for (const m of matches) {
    const players: any[] =
      Array.isArray(m?.players)
        ? m.players
        : Array.isArray(m?.payload?.players)
        ? m.payload.players
        : [];

    const winnerId =
      m?.winnerId ??
      m?.payload?.winnerId ??
      m?.stats?.winnerId ??
      null;

    const detailed = m?.summary?.detailedByPlayer || m?.summary?.detailedbyplayer || m?.payload?.summary?.detailedByPlayer || {};
    const darts = Number(m?.stats?.darts ?? m?.darts ?? 0);
    const totalScore = Number(m?.stats?.totalScore ?? m?.totalScore ?? 0);
    const matchAvg3 = darts ? (totalScore / darts) * 3 : 0;

    for (const p of players) {
      const id = String(p?.id ?? "");
      if (!id) continue;
      const st = detailed[id] || detailed[id.slice(0, 20)] || null;
      const playerDarts = Number(st?.darts ?? st?.dt ?? 0);
      const playerScore = Number(st?.totalScore ?? st?.totalscore ?? 0);
      const playerAvg3 = Number(st?.avg3 ?? 0) || (playerDarts ? (playerScore / playerDarts) * 3 : matchAvg3);

      const entry = map.get(id) ?? {
        playerId: id,
        name: p?.name ?? "Player",
        matches: 0,
        wins: 0,
        avg3: 0,
        _sumAvg3: 0,
      };

      entry.matches++;
      entry._sumAvg3 += playerAvg3;
      if (winnerId === id) entry.wins++;

      entry.name = p?.name ?? entry.name;

      map.set(id, entry);
    }
  }

  const arr: LeaderRow[] = [...map.values()].map((r) => ({
    playerId: r.playerId,
    name: r.name,
    matches: r.matches,
    wins: r.wins,
    avg3: r.matches ? r._sumAvg3 / r.matches : 0,
  }));

  arr.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.avg3 - a.avg3;
  });

  return arr.slice(0, 5);
}

// =============== UI ===============

type RangeTab = {
  id: TimeRange;
  label: string;
};

export default function StatsOnline() {
  const { theme } = useTheme();
  const { t } = useLang();
  const [range, setRange] = React.useState<TimeRange>("day");

  const [matches, setMatches] = React.useState<any[]>([]);
  const [sessions, setSessions] = React.useState<OnlineSession[]>([]);
  const [refreshToken, setRefreshToken] = React.useState(0);

  React.useEffect(() => {
    const refresh = () => setRefreshToken((v) => v + 1);
    window.addEventListener("dc-history-updated", refresh);
    window.addEventListener("dc-online-stats-exclusions-changed", refresh);
    return () => {
      window.removeEventListener("dc-history-updated", refresh);
      window.removeEventListener("dc-online-stats-exclusions-changed", refresh);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadOnline() {
      try {
        const store = loadStore?.() || {};
        const profiles = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
        const samples = await loadAllOnlineX01Samples(profiles);
        if (cancelled) return;
        const fromTs = getRangeStart(range);
        const filteredSamples = samples.filter((s: any) => !fromTs || Number(s.createdAt || 0) >= fromTs);
        const sampleMatches = filteredSamples.map((s: any, idx: number) => {
          const hits = Number(s.singleHits || 0) + Number(s.doubleHits || 0) + Number(s.tripleHits || 0) + Number(s.bull25 || 0) + Number(s.bull50 || 0);
          return {
            id: `${s.matchId || s.id || "online"}:${s.playerId || idx}`,
            matchId: s.matchId || s.id,
            createdAt: Number(s.createdAt || Date.now()),
            winnerId: s.winnerId,
            players: [{ id: s.playerId, name: s.playerName }],
            stats: {
              darts: Number(s.darts || 0),
              totalScore: Number(s.totalScore || 0),
              bestVisit: Number(s.bestVisit || 0),
              bestCheckout: Number(s.bestCheckout || 0),
              breakdown: {
                hits,
                miss: Number(s.miss || 0),
                s: Number(s.singleHits || 0),
                d: Number(s.doubleHits || 0),
                t: Number(s.tripleHits || 0),
                bull: Number(s.bull25 || 0),
                dbull: Number(s.bull50 || 0),
                bust: Number(s.bust || 0),
              },
              buckets: {
                "60+": Number(s.h60 || 0),
                "100+": Number(s.h100 || 0),
                "140+": Number(s.h140 || 0),
                "180": Number(s.h180 || 0),
              },
            },
          };
        });
        const historyMatches = await loadOnlineMatchesFromHistory(range);
        const lsMatches = loadOnlineMatchesFromLocalStorage(range).matches;
        let apiMatches: any[] = [];
        try {
          const apiRows = await (onlineApi as any)?.listMatches?.(250);
          apiMatches = (Array.isArray(apiRows) ? apiRows : [])
            .map((row: any, idx: number) => normalizeOnlineHistoryMatch(row, idx))
            .filter(Boolean)
            .filter((row: any) => inSelectedRange(row.createdAt, range));
        } catch (apiErr) {
          console.warn("[StatsOnline] lecture NAS online/matches impossible", apiErr);
        }

        const byId = new Map<string, any>();
        const push = (m: any, idx: number) => {
          if (!m) return;
          const key = String(m.matchId || m.id || m.online_match_id || m.lobbyCode || `online-${idx}-${m.createdAt || ''}`);
          const prev = byId.get(key);
          byId.set(key, { ...(prev || {}), ...m, stats: { ...(prev?.stats || {}), ...(m.stats || {}) } });
        };
        [...sampleMatches, ...historyMatches, ...lsMatches, ...apiMatches].forEach(push);
        const matches = filterOnlineStatsHardDeleted(Array.from(byId.values()))
          .filter((m: any) => inSelectedRange(m?.createdAt ?? m?.date ?? m?.ts, range));

        const sessions: OnlineSession[] = matches.map((m: any, idx: number) => {
          const darts = Number(m?.stats?.darts ?? m?.darts ?? 0);
          const totalScore = Number(m?.stats?.totalScore ?? m?.totalScore ?? 0);
          return {
            id: String(m?.id || m?.matchId || `sess-${idx}`),
            createdAt: Number(m?.createdAt ?? Date.now()),
            darts,
            avg3: darts > 0 ? Math.round(((totalScore / darts) * 3) * 10) / 10 : 0,
            bestVisit: Number(m?.stats?.bestVisit ?? m?.bestVisit ?? 0),
            bestCheckout: Number(m?.stats?.bestCheckout ?? m?.bestCheckout ?? 0),
          };
        });
        setMatches(matches);
        setSessions(sessions);
      } catch (err) {
        console.warn("[StatsOnline] load online x01 samples failed", err);
        if (!cancelled) {
          setMatches([]);
          setSessions([]);
        }
      }
    }

    loadOnline();
    return () => { cancelled = true; };
  }, [range, refreshToken]);

  const { agg, row } = React.useMemo(
    () => aggregateOnline(matches),
    [matches]
  );

  const totalHits = row.hits + row.miss;
  const leaderboard = React.useMemo(
    () => buildLeaderboard(matches),
    [matches]
  );

  const rangeTabs: RangeTab[] = [
    { id: "day", label: t("stats_online.range.day", "Jour") },
    { id: "week", label: t("stats_online.range.week", "Semaine") },
    { id: "month", label: t("stats_online.range.month", "Mois") },
    { id: "year", label: t("stats_online.range.year", "Année") },
    { id: "all", label: t("stats_online.range.all", "All") },
  ];

  const lastSessions = React.useMemo(
    () =>
      [...sessions]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    [sessions]
  );

  return (
    <div
      className="online-stats-page"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        paddingBottom: 88,
      }}
    >
      <style>{`
        .online-stats-page {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "Roboto", sans-serif;
        }
        .online-header-card {
          border-radius: 28px;
          padding: 16px 16px 14px;
          background:
            radial-gradient(circle at 0% 0%, rgba(255,255,255,0.12), transparent 55%),
            linear-gradient(180deg, #17171f, #050509);
          box-shadow:
            0 24px 52px rgba(0,0,0,0.85),
            0 0 28px ${theme.primary}26;
        }
        .online-range-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .online-range-btn {
          min-width: 64px;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 12px;
          border: 1px solid rgba(255,255,255,0.15);
          background: transparent;
          color: #fff;
          letter-spacing: 0.5px;
          text-transform: capitalize;
          cursor: pointer;
          font-weight: 600;
        }
        .online-range-btn.active {
          background: linear-gradient(180deg, #ffd35b, #ffb52f);
          color: #111;
          border-color: transparent;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.4),
            0 0 18px ${theme.primary}aa;
        }

        .online-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 10px;
          margin-top: 14px;
        }
        @media (min-width: 420px) {
          .online-kpi-grid {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }
        }
        .online-kpi-card {
          border-radius: 18px;
          padding: 10px 12px 10px;
          background: #121218;
          box-shadow: 0 16px 32px rgba(0,0,0,0.95);
          position: relative;
          overflow: hidden;
        }
        .online-kpi-card::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 0 0, rgba(255,255,255,0.16), transparent 60%);
          opacity: 0.0;
          pointer-events: none;
          mix-blend-mode: screen;
          animation: onlineGlow 6s ease-in-out infinite;
        }
        @keyframes onlineGlow {
          0%, 100% { opacity: 0.0; }
          50% { opacity: 0.2; }
        }

        .online-section-card {
          border-radius: 24px;
          padding: 14px 16px 14px;
          background: #111119;
          box-shadow:
            0 20px 40px rgba(0,0,0,0.95),
            0 0 18px rgba(0,0,0,0.6);
        }

        .online-section-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: ${theme.primary};
          text-shadow: 0 0 12px ${theme.primary}88;
        }

        .online-detail-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
        }
        .online-detail-table th,
        .online-detail-table td {
          padding: 4px 0;
        }
        .online-detail-table thead tr {
          color: rgba(255,255,255,0.8);
          font-size: 11px;
        }
        .online-detail-table tbody tr {
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .online-detail-table tbody tr:last-child {
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
      `}</style>

      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "18px 14px 0",
        }}
      >
        {/* HEADER + RANGE + KPIs */}
        <div className="online-header-card">
          <div
            style={{
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 22,
                letterSpacing: 2,
                fontWeight: 900,
                textTransform: "uppercase",
                color: theme.primary,
                textShadow: `0 0 22px ${theme.primary}`,
              }}
            >
              ONLINE
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: theme.textSoft,
              }}
            >
              {t(
                "stats_online.subtitle",
                "Analyse toutes tes performances Online sur la période sélectionnée."
              )}
            </div>
          </div>

          {/* Rangées filtres */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <div className="online-range-tabs">
              {rangeTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={
                    "online-range-btn" + (range === tab.id ? " active" : "")
                  }
                  onClick={() => setRange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="online-kpi-grid">
            {/* Sessions */}
            <KpiCard
              labelTop={t("stats_online.kpi.sessions.label", "CUMUL")}
              labelBottom={t(
                "stats_online.kpi.sessions.sub",
                "Sessions Online"
              )}
              value={agg.sessions}
              color={theme.primary}
            />
            {/* Moyennes */}
            <KpiCard
              labelTop={t("stats_online.kpi.avg.label", "MOYENNES")}
              labelBottom={t(
                "stats_online.kpi.avg.sub",
                "Moy.3D (période)"
              )}
              value={agg.avg3.toFixed(1)}
              color="#ff77c8"
            />
            {/* Best Visit */}
            <KpiCard
              labelTop={t("stats_online.kpi.bestvisit.label", "RECORDS")}
              labelBottom={t("stats_online.kpi.bestvisit.sub", "Best Visit")}
              value={agg.bestVisit}
              color="#ffd75b"
            />
            {/* % Hits global */}
            <KpiCard
              labelTop={t("stats_online.kpi.hitpct.label", "POURCENTAGES")}
              labelBottom={t(
                "stats_online.kpi.hitpct.sub",
                "%Hits global"
              )}
              value={totalHits ? pct(row.hits, totalHits) : "0.0%"}
              color="#33e38c"
            />
            {/* Best CO */}
            <KpiCard
              labelTop={t("stats_online.kpi.bestco.label", "% / BV / CO")}
              labelBottom={t("stats_online.kpi.bestco.sub", "Best CO")}
              value={agg.bestCheckout}
              color="#7af5ff"
            />
            {/* 180s */}
            <KpiCard
              labelTop={t("stats_online.kpi.180.label", "RECORDS")}
              labelBottom={t("stats_online.kpi.180.sub", "180 marqués")}
              value={agg.h180}
              color="#ff7b5b"
            />
          </div>
        </div>

        {/* Session count simple */}
        <div
          style={{
            marginTop: 18,
            marginBottom: 10,
            borderRadius: 999,
            padding: "8px 16px",
            background: "#111116",
            boxShadow: "0 10px 18px rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: 600, color: theme.primary }}>
            Session
          </span>
          <span style={{ fontWeight: 700 }}>{agg.sessions}</span>
        </div>

        {/* STATS DÉTAILLÉES */}
        <section
          style={{
            marginBottom: 16,
          }}
        >
          <div className="online-section-card">
            <div className="online-section-title">
              {t(
                "stats_online.details.title",
                "STATS DÉTAILLÉES (PÉRIODE)"
              )}
            </div>

            {agg.sessions === 0 ? (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: theme.textSoft,
                }}
              >
                {t(
                  "stats_online.details.empty",
                  "Aucune partie Online enregistrée sur la période sélectionnée."
                )}
              </p>
            ) : (
              <table className="online-detail-table">
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        fontWeight: 600,
                      }}
                    >
                      &nbsp;
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      {t("stats_online.details.col.total", "Total")}
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      {t("stats_online.details.col.pct", "%")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <DetailRow label="Darts" total={row.darts} pctLabel="" />
                  <DetailRow
                    label="Hits"
                    total={row.hits}
                    pctValue={pct(row.hits, totalHits)}
                  />
                  <DetailRow
                    label="Miss"
                    total={row.miss}
                    pctValue={pct(row.miss, totalHits)}
                  />
                  <DetailRow
                    label="S"
                    total={row.s}
                    pctValue={pct(row.s, totalHits)}
                  />
                  <DetailRow
                    label="D"
                    total={row.d}
                    pctValue={pct(row.d, totalHits)}
                  />
                  <DetailRow
                    label="T"
                    total={row.t}
                    pctValue={pct(row.t, totalHits)}
                  />
                  <DetailRow
                    label="Bull"
                    total={row.bull}
                    pctValue={pct(row.bull, totalHits)}
                  />
                  <DetailRow
                    label="DBull"
                    total={row.dbull}
                    pctValue={pct(row.dbull, totalHits)}
                  />
                  <DetailRow
                    label="Bust"
                    total={row.bust}
                    pctValue={pct(row.bust, totalHits)}
                  />
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* MOYENNES / RECORDS / FAVORIS */}
        <section
          style={{
            marginBottom: 16,
          }}
        >
          <div className="online-section-card">
            {/* Moyennes */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#ff77c8",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {t("stats_online.avg.blockTitle", "MOYENNES")}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  fontSize: 12,
                  color: "#ffd5f2",
                }}
              >
                <div>
                  <div>{t("stats_online.avg.moy1d", "Moy.1D")}</div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      marginTop: 2,
                    }}
                  >
                    {(agg.avg3 / 3 || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div>{t("stats_online.avg.moy3d", "Moy.3D")}</div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      marginTop: 2,
                    }}
                  >
                    {agg.avg3.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Séparateur */}
            <div
              style={{
                height: 1,
                margin: "10px 0",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
              }}
            />

            {/* Records */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#5af9b1",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {t("stats_online.records.blockTitle", "RECORDS")}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  fontSize: 12,
                  color: "#c6ffe4",
                }}
              >
                <div>
                  <div>Best Visit</div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      marginTop: 2,
                    }}
                  >
                    {agg.bestVisit}
                  </div>
                </div>
                <div>
                  <div>Best CO</div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      marginTop: 2,
                    }}
                  >
                    {agg.bestCheckout}
                  </div>
                </div>
              </div>
            </div>

            {/* Séparateur */}
            <div
              style={{
                height: 1,
                margin: "10px 0",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
              }}
            />

            {/* Favoris (placeholder) */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#5bbcff",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {t("stats_online.fav.blockTitle", "FAVORIS")}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: theme.textSoft,
                }}
              >
                {t(
                  "stats_online.fav.placeholder",
                  "Les favoris par segment seront basés sur tes futures parties Online."
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CLASSEMENT ONLINE */}
        <section
          style={{
            marginBottom: 16,
          }}
        >
          <div className="online-section-card">
            <div className="online-section-title">
              {t("stats_online.leaderboard.title", "CLASSEMENT ONLINE")}
            </div>

            {leaderboard.length === 0 ? (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: theme.textSoft,
                }}
              >
                {t(
                  "stats_online.leaderboard.empty",
                  "Pas encore de classement : joue quelques parties Online pour voir apparaître le top joueurs."
                )}
              </p>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {leaderboard.map((p, index) => (
                  <div
                    key={p.playerId}
                    style={{
                      borderRadius: 18,
                      padding: "8px 12px",
                      background:
                        "linear-gradient(180deg,#181821,#0a0a10)",
                      boxShadow: "0 10px 22px rgba(0,0,0,0.85)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          background:
                            index === 0
                              ? "linear-gradient(180deg,#ffd35b,#ffb52f)"
                              : "linear-gradient(180deg,#333545,#181822)",
                          color: index === 0 ? "#111" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: 14,
                          boxShadow:
                            index === 0
                              ? `0 0 16px ${theme.primary}aa`
                              : "0 0 10px rgba(0,0,0,0.7)",
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.8,
                          }}
                        >
                          {p.matches} matchs · {p.wins} victoires ·{" "}
                          {p.avg3.toFixed(1)} Moy.3D
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* PROGRESSION */}
        <section
          style={{
            marginBottom: 16,
          }}
        >
          <div className="online-section-card">
            <div className="online-section-title">
              {t("stats_online.progress.title", "PROGRESSION")}
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 18,
                padding: 10,
                background: "radial-gradient(circle at 0 0,#f6c25622,transparent)",
                minHeight: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: theme.textSoft,
              }}
            >
              {t(
                "stats_online.progress.placeholder",
                "Les courbes de progression Online apparaîtront ici à mesure que tu joueras."
              )}
            </div>
          </div>
        </section>

        {/* RADAR HITS */}
        <section
          style={{
            marginBottom: 16,
          }}
        >
          <div className="online-section-card">
            <div className="online-section-title">
              {t("stats_online.radar.title", "RADAR HITS")}
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 18,
                padding: 10,
                minHeight: 120,
                background: "radial-gradient(circle,#f6c25615,transparent 60%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: theme.textSoft,
              }}
            >
              {t(
                "stats_online.radar.placeholder",
                "Le radar Online sera basé sur les segments touchés dans tes futures parties Online."
              )}
            </div>
          </div>
        </section>

        {/* HITS PAR SEGMENT */}
        <section
          style={{
            marginBottom: 16,
          }}
        >
          <div className="online-section-card">
            <div className="online-section-title">
              {t("stats_online.segment.title", "HITS PAR SEGMENT")}
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 18,
                padding: 10,
                minHeight: 90,
                background: "#08080e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: theme.textSoft,
              }}
            >
              {t(
                "stats_online.segment.placeholder",
                "Cette section affichera bientôt la répartition de tes hits Online par segment."
              )}
            </div>
          </div>
        </section>

        {/* DERNIÈRES SESSIONS */}
        <section
          style={{
            marginBottom: 32,
          }}
        >
          <div className="online-section-card">
            <div className="online-section-title">
              {t("stats_online.last.title", "DERNIÈRES SESSIONS")}
            </div>
            {lastSessions.length === 0 ? (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: theme.textSoft,
                }}
              >
                {t(
                  "stats_online.last.empty",
                  "Aucune session Online enregistrée pour l’instant."
                )}
              </p>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {lastSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      borderRadius: 18,
                      padding: "8px 12px",
                      background:
                        "linear-gradient(180deg,#181821,#0a0a10)",
                      boxShadow: "0 10px 22px rgba(0,0,0,0.85)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                      <div
                        style={{
                          opacity: 0.8,
                        }}
                      >
                        {s.darts} darts · BV {s.bestVisit} · CO{" "}
                        {s.bestCheckout}
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 999,
                        padding: "4px 10px",
                        background:
                          "linear-gradient(180deg,#ffd35b,#ffb52f)",
                        color: "#111",
                        fontSize: 11,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.avg3.toFixed(1)} Moy.3D
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ==== Petits sous-composants ====

function KpiCard({
  labelTop,
  labelBottom,
  value,
  color,
}: {
  labelTop: string;
  labelBottom: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="online-kpi-card">
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1.1,
          color,
          marginBottom: 4,
        }}
      >
        {labelTop}
      </div>
      <div
        style={{
          fontSize: 11,
          opacity: 0.8,
          marginBottom: 2,
        }}
      >
        {labelBottom}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          color,
          textShadow: `0 0 16px ${color}aa`,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  total,
  pctValue,
  pctLabel,
}: {
  label: string;
  total: number;
  pctValue?: string;
  pctLabel?: string;
}) {
  return (
    <tr>
      <td style={{ textAlign: "left", paddingRight: 4 }}>{label}</td>
      <td style={{ textAlign: "center" }}>{total}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {pctLabel ?? pctValue ?? ""}
      </td>
    </tr>
  );
}
