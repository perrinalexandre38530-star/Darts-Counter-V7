// @ts-nocheck
// ============================================================
// src/stats/FiveLivesStatsTabFull.tsx
// Page détaillée du mode LES 5 VIES dans le centre de statistiques.
// Design et hiérarchie inspirés de X01MultiStatsTabFull.
// ============================================================

import * as React from "react";
import SparklinePro from "../components/SparklinePro";
import ProfileAvatar from "../components/ProfileAvatar";

type Props = {
  records: any[];
  playerId?: string | null;
};

type TimeRange = "all" | "day" | "week" | "month" | "year";
type EvolutionMetric = "average" | "success" | "best" | "lives";

type FiveLivesEvent = {
  turn: number;
  score: number;
  target: number | null;
  required: number | null;
  margin: number | null;
  success: boolean;
  openingVisit: boolean;
  lifeLost: boolean;
  livesBefore: number | null;
  livesAfter: number | null;
  darts: any[];
  at: number;
};

type FiveLivesSession = {
  id: string;
  date: number;
  finishedAt: number;
  durationMs: number;
  playerId: string;
  playerName: string;
  avatarDataUrl?: string | null;
  isWin: boolean;
  rank: number | null;
  playersCount: number;
  startingLives: number;
  livesLeft: number;
  livesLost: number;
  visits: number;
  targetsFaced: number;
  successfulVisits: number;
  failedVisits: number;
  dartsThrown: number;
  totalScore: number;
  avgVisit: number;
  bestVisit: number;
  worstVisit: number;
  bestMargin: number;
  avgWinningMargin: number;
  singles: number;
  doubles: number;
  triples: number;
  bulls: number;
  dbulls: number;
  misses: number;
  hitsTotal: number;
  hitRate: number;
  scoreOnlyVisits: number;
  hitsBySegment: Record<string, number>;
  events: FiveLivesEvent[];
  rankings: any[];
  winnerName: string;
  inputMethod: string;
  raw: any;
};

const ACCENT = "#ff4fb8";
const ACCENT_SOFT = "rgba(255,79,184,.20)";
const GOLD = "#F6C256";
const GREEN = "#72f0a8";
const RED = "#ff6378";
const BLUE = "#82D8FF";
const TEXT = "#FFFFFF";
const TEXT70 = "rgba(255,255,255,.70)";
const TEXT55 = "rgba(255,255,255,.55)";
const EDGE = "rgba(255,255,255,.10)";
const CARD_BG = "linear-gradient(180deg,rgba(17,18,20,.96),rgba(9,10,14,.96))";

const card: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${EDGE}`,
  borderRadius: 20,
  padding: 14,
  boxShadow: "0 12px 28px rgba(0,0,0,.38)",
  backdropFilter: "blur(10px)",
};

const titleStyle: React.CSSProperties = {
  color: ACCENT,
  fontWeight: 1000,
  fontSize: 13,
  letterSpacing: 0.9,
  textTransform: "uppercase",
  textShadow: `0 0 8px ${ACCENT}AA,0 0 16px ${ACCENT}55`,
};

function n(...values: any[]): number {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function sameId(a: any, b: any): boolean {
  const aa = String(a ?? "").replace(/^online:/, "").trim();
  const bb = String(b ?? "").replace(/^online:/, "").trim();
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  return aa.length >= 12 && bb.length >= 12 && (aa.startsWith(bb) || bb.startsWith(aa));
}

function lc(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function isFiveLivesRecord(rec: any): boolean {
  const blob = [
    rec?.kind,
    rec?.mode,
    rec?.game,
    rec?.variantId,
    rec?.summary?.kind,
    rec?.summary?.mode,
    rec?.payload?.kind,
    rec?.payload?.mode,
    rec?.payload?.summary?.kind,
    rec?.payload?.summary?.mode,
  ]
    .filter(Boolean)
    .map(lc)
    .join(" ");
  return (
    blob.includes("five_lives") ||
    blob.includes("five lives") ||
    blob.includes("5 vies") ||
    blob.includes("cinq vies")
  );
}

function arrays(...values: any[]): any[][] {
  return values.filter(Array.isArray);
}

function playerIdOf(row: any) {
  return String(row?.id ?? row?.playerId ?? row?.profileId ?? row?.selectedPlayerId ?? "");
}

function rowMatchesPlayer(row: any, playerId: string): boolean {
  return sameId(playerIdOf(row), playerId);
}

function rankingsForRecord(rec: any): any[] {
  const candidates = arrays(
    rec?.summary?.rankings,
    rec?.summary?.players,
    rec?.summary?.perPlayer,
    rec?.payload?.summary?.rankings,
    rec?.payload?.summary?.players,
    rec?.payload?.summary?.perPlayer,
    rec?.payload?.stats?.players,
    rec?.payload?.players,
    rec?.stats?.players,
    rec?.rankings,
    rec?.players,
  );
  for (const rows of candidates) if (rows.length) return rows;
  return [];
}

function detailedMapRows(rec: any): any[] {
  const maps = [
    rec?.summary?.detailedByPlayer,
    rec?.payload?.summary?.detailedByPlayer,
    rec?.payload?.detailedByPlayer,
    rec?.detailedByPlayer,
  ];
  const out: any[] = [];
  for (const map of maps) {
    if (!map || typeof map !== "object" || Array.isArray(map)) continue;
    for (const [id, value] of Object.entries(map)) {
      if (value && typeof value === "object") out.push({ id, ...(value as any) });
    }
  }
  return out;
}

function findPlayerRow(rec: any, playerId: string): any | null {
  const pools = [
    detailedMapRows(rec),
    ...arrays(
      rec?.summary?.rankings,
      rec?.payload?.summary?.rankings,
      rec?.payload?.stats?.players,
      rec?.stats?.players,
      rec?.summary?.perPlayer,
      rec?.payload?.summary?.perPlayer,
      rec?.summary?.players,
      rec?.payload?.players,
      rec?.players,
    ),
  ];
  for (const rows of pools) {
    const hit = rows.find((row: any) => rowMatchesPlayer(row, playerId));
    if (hit) return hit;
  }
  return null;
}

function eventRows(rec: any): any[] {
  const candidates = [
    rec?.payload?.visitHistory,
    rec?.payload?.events,
    rec?.summary?.visitHistory,
    rec?.summary?.events,
    rec?.visitHistory,
    rec?.events,
  ];
  for (const rows of candidates) if (Array.isArray(rows)) return rows;
  return [];
}

function normalizeEvent(ev: any): FiveLivesEvent {
  return {
    turn: n(ev?.turn),
    score: n(ev?.score),
    target: ev?.target === null || ev?.target === undefined ? null : n(ev?.target),
    required: ev?.required === null || ev?.required === undefined ? null : n(ev?.required),
    margin: ev?.margin === null || ev?.margin === undefined ? null : n(ev?.margin),
    success: Boolean(ev?.success),
    openingVisit: Boolean(ev?.openingVisit),
    lifeLost: Boolean(ev?.lifeLost),
    livesBefore: ev?.livesBefore === null || ev?.livesBefore === undefined ? null : n(ev?.livesBefore),
    livesAfter: ev?.livesAfter === null || ev?.livesAfter === undefined ? null : n(ev?.livesAfter),
    darts: Array.isArray(ev?.darts) ? ev.darts : [],
    at: n(ev?.at),
  };
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(n(ms) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmt1(value: any) {
  return (Math.round(n(value) * 10) / 10).toFixed(1);
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function dartLabel(d: any) {
  const v = n(d?.v);
  const mult = n(d?.mult, 1);
  if (!v) return "MISS";
  if (v === 25) return mult === 2 ? "DBULL" : "BULL";
  return `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${v}`;
}

function sessionFromRecord(rec: any, playerId: string): FiveLivesSession | null {
  if (!isFiveLivesRecord(rec)) return null;
  const row = findPlayerRow(rec, playerId);
  if (!row) return null;

  const rankings = rankingsForRecord(rec);
  const explicitRank = n(row?.rank, row?.position, row?.place);
  const orderedIndex = rankings.findIndex((r) => rowMatchesPlayer(r, playerId));
  const rank = explicitRank > 0 ? explicitRank : orderedIndex >= 0 ? orderedIndex + 1 : null;
  const winnerId = String(rec?.winnerId ?? rec?.summary?.winnerId ?? rec?.payload?.winnerId ?? rec?.payload?.summary?.winnerId ?? "");
  const isWin = Boolean(row?.isWinner ?? row?.win) || sameId(winnerId, playerId) || rank === 1;
  const rawEvents = eventRows(rec)
    .filter((ev: any) => sameId(ev?.playerId ?? ev?.id ?? ev?.profileId, playerId))
    .map(normalizeEvent)
    .sort((a, b) => a.turn - b.turn || a.at - b.at);

  const visits = n(row?.visits, row?.turns, row?.rounds, rawEvents.length);
  const targetsFaced = n(row?.targetsFaced, rawEvents.filter((ev) => !ev.openingVisit).length);
  const successfulVisits = n(row?.successfulVisits, row?.successes, rawEvents.filter((ev) => !ev.openingVisit && ev.success).length);
  const failedVisits = n(row?.failedVisits, row?.fails, rawEvents.filter((ev) => !ev.openingVisit && !ev.success).length);
  const livesLost = n(row?.livesLost, row?.lostLives, row?.damageTaken, failedVisits);
  const totalScore = n(row?.totalScore, row?.points, row?.score, rawEvents.reduce((sum, ev) => sum + ev.score, 0));
  const bestVisit = n(row?.bestVisit, rawEvents.reduce((best, ev) => Math.max(best, ev.score), 0));
  const eventScores = rawEvents.map((ev) => ev.score);
  const worstVisit = n(row?.worstVisit, eventScores.length ? Math.min(...eventScores) : 0);
  const positiveMargins = rawEvents.filter((ev) => !ev.openingVisit && ev.success && ev.margin != null).map((ev) => n(ev.margin));
  const bestMargin = n(row?.bestMargin, positiveMargins.length ? Math.max(...positiveMargins) : 0);
  const avgWinningMargin = n(
    row?.avgWinningMargin,
    positiveMargins.length ? positiveMargins.reduce((a, b) => a + b, 0) / positiveMargins.length : 0,
  );
  const dartsThrown = n(row?.dartsThrown, row?.darts, row?.totalThrows, visits * 3);
  const singles = n(row?.singles);
  const doubles = n(row?.doubles);
  const triples = n(row?.triples);
  const bulls = n(row?.bulls);
  const dbulls = n(row?.dbulls);
  const misses = n(row?.misses);
  const hitsTotal = n(row?.hitsTotal, singles + doubles + triples + bulls + dbulls);
  const scoreOnlyVisits = n(row?.scoreOnlyVisits);
  const hitsBySegment = row?.hitsBySegment && typeof row.hitsBySegment === "object" ? { ...row.hitsBySegment } : {};
  if (!Object.keys(hitsBySegment).length) {
    for (const ev of rawEvents) {
      for (const dart of ev.darts || []) {
        const key = dartLabel(dart);
        hitsBySegment[key] = n(hitsBySegment[key]) + 1;
      }
    }
  }

  const summary = rec?.summary ?? rec?.payload?.summary ?? {};
  const date = n(rec?.finishedAt, rec?.updatedAt, rec?.createdAt, summary?.finishedAt, Date.now());
  return {
    id: String(rec?.id ?? rec?.matchId ?? rec?.resumeId ?? `five-lives-${date}`),
    date,
    finishedAt: n(rec?.finishedAt, summary?.finishedAt, date),
    durationMs: n(summary?.durationMs, rec?.durationMs, rec?.payload?.summary?.durationMs),
    playerId,
    playerName: String(row?.name ?? row?.playerName ?? row?.displayName ?? playerId),
    avatarDataUrl: row?.avatarDataUrl ?? row?.avatarUrl ?? null,
    isWin,
    rank,
    playersCount: Math.max(1, rankings.length || n(summary?.playersCount) || 1),
    startingLives: n(rec?.payload?.startingLives, summary?.startingLives, rec?.startingLives, 5),
    livesLeft: n(row?.livesLeft, row?.remainingLives, row?.lives),
    livesLost,
    visits,
    targetsFaced,
    successfulVisits,
    failedVisits,
    dartsThrown,
    totalScore,
    avgVisit: n(row?.avgVisit, row?.avg3, visits ? totalScore / visits : 0),
    bestVisit,
    worstVisit,
    bestMargin,
    avgWinningMargin,
    singles,
    doubles,
    triples,
    bulls,
    dbulls,
    misses,
    hitsTotal,
    hitRate: n(row?.hitRate, dartsThrown ? pct(hitsTotal, dartsThrown) : 0),
    scoreOnlyVisits,
    hitsBySegment,
    events: rawEvents,
    rankings,
    winnerName: String(rec?.winnerName ?? summary?.winnerName ?? rec?.payload?.winnerName ?? ""),
    inputMethod: String(summary?.scoreInputMethod ?? rec?.payload?.scoreInputMethod ?? rec?.payload?.config?.scoreInputMethod ?? ""),
    raw: rec,
  };
}

function rangeStart(range: TimeRange) {
  if (range === "all") return 0;
  const day = 24 * 60 * 60 * 1000;
  return Date.now() - (range === "day" ? day : range === "week" ? day * 7 : range === "month" ? day * 30 : day * 365);
}

function Kpi({ label, value, sub, tone = TEXT }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 15,
        padding: "10px 11px",
        background: "linear-gradient(180deg,rgba(26,27,31,.96),rgba(14,15,19,.96))",
        border: "1px solid rgba(255,255,255,.09)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.025)",
      }}
    >
      <div style={{ fontSize: 9, color: TEXT55, textTransform: "uppercase", fontWeight: 900, letterSpacing: 0.45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 3, color: tone, fontSize: 21, lineHeight: 1.05, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: `0 0 10px ${tone}55` }}>{value}</div>
      {sub != null ? <div style={{ marginTop: 3, color: TEXT55, fontSize: 9.5, lineHeight: 1.2 }}>{sub}</div> : null}
    </div>
  );
}

function ProgressBar({ value, max, tone = ACCENT }: { value: number; max: number; tone?: string }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
      <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${tone},#fff)`, boxShadow: `0 0 12px ${tone}99` }} />
    </div>
  );
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11 }}>
      <div style={titleStyle}>{children}</div>
      {right != null ? <div style={{ color: TEXT55, fontSize: 10 }}>{right}</div> : null}
    </div>
  );
}

function HitTile({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  return (
    <div style={{ borderRadius: 13, padding: 9, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: TEXT55, textTransform: "uppercase", fontWeight: 900 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 1000, color: tone, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 9, color: TEXT55 }}>{fmt1(pct(value, total))}%</div>
    </div>
  );
}

export default function FiveLivesStatsTabFull({ records, playerId }: Props) {
  const [range, setRange] = React.useState<TimeRange>("month");
  const [metric, setMetric] = React.useState<EvolutionMetric>("average");
  const [selectedSession, setSelectedSession] = React.useState<FiveLivesSession | null>(null);

  const allSessions = React.useMemo(() => {
    if (!playerId) return [];
    return (Array.isArray(records) ? records : [])
      .map((rec) => sessionFromRecord(rec, String(playerId)))
      .filter(Boolean)
      .sort((a: FiveLivesSession, b: FiveLivesSession) => b.date - a.date) as FiveLivesSession[];
  }, [records, playerId]);

  const sessions = React.useMemo(() => {
    const start = rangeStart(range);
    return allSessions.filter((session) => session.date >= start);
  }, [allSessions, range]);

  const player = allSessions[0] ?? null;

  const agg = React.useMemo(() => {
    const games = sessions.length;
    const wins = sessions.filter((s) => s.isWin).length;
    const visits = sessions.reduce((sum, s) => sum + s.visits, 0);
    const targetsFaced = sessions.reduce((sum, s) => sum + s.targetsFaced, 0);
    const successes = sessions.reduce((sum, s) => sum + s.successfulVisits, 0);
    const failures = sessions.reduce((sum, s) => sum + s.failedVisits, 0);
    const livesLost = sessions.reduce((sum, s) => sum + s.livesLost, 0);
    const livesLeft = sessions.reduce((sum, s) => sum + s.livesLeft, 0);
    const darts = sessions.reduce((sum, s) => sum + s.dartsThrown, 0);
    const points = sessions.reduce((sum, s) => sum + s.totalScore, 0);
    const scoreOnlyVisits = sessions.reduce((sum, s) => sum + s.scoreOnlyVisits, 0);
    const singles = sessions.reduce((sum, s) => sum + s.singles, 0);
    const doubles = sessions.reduce((sum, s) => sum + s.doubles, 0);
    const triples = sessions.reduce((sum, s) => sum + s.triples, 0);
    const bulls = sessions.reduce((sum, s) => sum + s.bulls, 0);
    const dbulls = sessions.reduce((sum, s) => sum + s.dbulls, 0);
    const misses = sessions.reduce((sum, s) => sum + s.misses, 0);
    const hitTotal = singles + doubles + triples + bulls + dbulls;
    const bestVisit = sessions.reduce((best, s) => Math.max(best, s.bestVisit), 0);
    const worstVisits = sessions.map((s) => s.worstVisit).filter((v) => Number.isFinite(v));
    const worstVisit = worstVisits.length ? Math.min(...worstVisits) : 0;
    const bestMargin = sessions.reduce((best, s) => Math.max(best, s.bestMargin), 0);
    const positiveMarginTotal = sessions.reduce((sum, s) => sum + s.avgWinningMargin * s.successfulVisits, 0);
    const ranks = sessions.map((s) => s.rank).filter((v) => Number.isFinite(v) && v > 0) as number[];
    const hitsBySegment: Record<string, number> = {};
    for (const session of sessions) {
      for (const [key, value] of Object.entries(session.hitsBySegment || {})) hitsBySegment[key] = n(hitsBySegment[key]) + n(value);
    }
    const allEvents = sessions.flatMap((s) => s.events);
    const scoreBands = [
      { label: "0–39", min: 0, max: 39, tone: RED },
      { label: "40–59", min: 40, max: 59, tone: "#ff9c63" },
      { label: "60–79", min: 60, max: 79, tone: GOLD },
      { label: "80–99", min: 80, max: 99, tone: BLUE },
      { label: "100–139", min: 100, max: 139, tone: ACCENT },
      { label: "140+", min: 140, max: Infinity, tone: GREEN },
    ].map((band) => ({ ...band, value: allEvents.filter((ev) => ev.score >= band.min && ev.score <= band.max).length }));
    const targetBands = [
      { label: "< 40", min: 0, max: 39 },
      { label: "40–59", min: 40, max: 59 },
      { label: "60–79", min: 60, max: 79 },
      { label: "80–99", min: 80, max: 99 },
      { label: "100+", min: 100, max: Infinity },
    ].map((band) => {
      const rows = allEvents.filter((ev) => !ev.openingVisit && ev.target != null && n(ev.target) >= band.min && n(ev.target) <= band.max);
      const ok = rows.filter((ev) => ev.success).length;
      return { ...band, total: rows.length, ok, rate: pct(ok, rows.length) };
    });
    const placements = {
      first: sessions.filter((s) => s.rank === 1).length,
      second: sessions.filter((s) => s.rank === 2).length,
      third: sessions.filter((s) => s.rank === 3).length,
      other: sessions.filter((s) => s.rank != null && s.rank >= 4).length,
    };
    return {
      games,
      wins,
      visits,
      targetsFaced,
      successes,
      failures,
      livesLost,
      livesLeft,
      darts,
      points,
      scoreOnlyVisits,
      singles,
      doubles,
      triples,
      bulls,
      dbulls,
      misses,
      hitTotal,
      bestVisit,
      worstVisit,
      bestMargin,
      avgWinningMargin: successes ? positiveMarginTotal / successes : 0,
      winRate: pct(wins, games),
      objectiveRate: pct(successes, targetsFaced),
      averageVisit: visits ? points / visits : 0,
      avgLivesLost: games ? livesLost / games : 0,
      avgLivesLeft: games ? livesLeft / games : 0,
      hitRate: darts ? pct(hitTotal, darts) : 0,
      avgRank: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0,
      hitsBySegment,
      scoreBands,
      targetBands,
      placements,
      allEvents,
    };
  }, [sessions]);

  const evolutionPoints = React.useMemo(() => {
    return [...sessions]
      .sort((a, b) => a.date - b.date)
      .map((session, index) => ({
        x: index,
        y:
          metric === "average"
            ? session.avgVisit
            : metric === "success"
              ? pct(session.successfulVisits, session.targetsFaced)
              : metric === "best"
                ? session.bestVisit
                : session.livesLost,
      }));
  }, [sessions, metric]);

  const segmentEntries = React.useMemo(
    () => Object.entries(agg.hitsBySegment).sort((a, b) => n(b[1]) - n(a[1])).slice(0, 18),
    [agg.hitsBySegment],
  );

  if (!playerId) {
    return <div style={{ color: TEXT70, padding: 14 }}>Sélectionne un joueur pour afficher les statistiques Les 5 vies.</div>;
  }

  return (
    <div style={{ width: "100%", maxWidth: 920, margin: "0 auto", display: "grid", gap: 12, color: TEXT }}>
      <div style={{ ...card, padding: 12, background: `radial-gradient(circle at 0% 0%,${ACCENT_SOFT},transparent 52%),${CARD_BG}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <ProfileAvatar
            profile={{ id: String(playerId), name: player?.playerName || "Joueur", avatarDataUrl: player?.avatarDataUrl || null }}
            size={58}
            showStars={false}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...titleStyle, fontSize: 15 }}>LES 5 VIES — STATISTIQUES DÉTAILLÉES</div>
            <div style={{ color: TEXT70, fontSize: 13, fontWeight: 900, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player?.playerName || "Aucune partie enregistrée"}</div>
          </div>
          <div style={{ borderRadius: 999, padding: "5px 9px", color: ACCENT, border: `1px solid ${ACCENT}88`, background: "rgba(255,79,184,.08)", fontSize: 10, fontWeight: 1000, whiteSpace: "nowrap" }}>{allSessions.length} partie{allSessions.length > 1 ? "s" : ""}</div>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 12, scrollbarWidth: "none" }}>
          {([
            ["day", "JOUR"],
            ["week", "SEMAINE"],
            ["month", "MOIS"],
            ["year", "ANNÉE"],
            ["all", "TOUT"],
          ] as Array<[TimeRange, string]>).map(([key, label]) => {
            const active = range === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                style={{
                  flex: "0 0 auto",
                  minWidth: 68,
                  height: 30,
                  borderRadius: 999,
                  border: `1px solid ${active ? `${ACCENT}AA` : "rgba(255,255,255,.10)"}`,
                  background: active ? "linear-gradient(180deg,rgba(255,79,184,.30),rgba(91,8,60,.32))" : "rgba(255,255,255,.035)",
                  color: active ? "#fff" : TEXT70,
                  fontSize: 9.5,
                  fontWeight: 1000,
                  boxShadow: active ? `0 0 14px ${ACCENT}33` : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {!sessions.length ? (
        <div style={{ ...card, padding: 22, textAlign: "center", color: TEXT70 }}>
          Aucune partie Les 5 vies trouvée pour ce joueur sur la période sélectionnée.
        </div>
      ) : (
        <>
          <div style={{ ...card, padding: 12 }}>
            <SectionTitle right={`${sessions.length} partie${sessions.length > 1 ? "s" : ""}`}>VUE D’ENSEMBLE</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <Kpi label="Parties" value={agg.games} tone={ACCENT} />
              <Kpi label="Victoires" value={`${fmt1(agg.winRate)}%`} sub={`${agg.wins} victoire${agg.wins > 1 ? "s" : ""}`} tone={GREEN} />
              <Kpi label="Moyenne / volée" value={fmt1(agg.averageVisit)} tone={GOLD} />
              <Kpi label="Meilleure volée" value={agg.bestVisit || "—"} tone={BLUE} />
              <Kpi label="Réussite objectifs" value={`${fmt1(agg.objectiveRate)}%`} sub={`${agg.successes} / ${agg.targetsFaced}`} tone={GREEN} />
              <Kpi label="Vies perdues" value={agg.livesLost} sub={`${fmt1(agg.avgLivesLost)} / partie`} tone={RED} />
              <Kpi label="Volées jouées" value={agg.visits} sub={`${agg.darts} fléchettes`} />
              <Kpi label="Meilleure marge" value={agg.bestMargin ? `+${agg.bestMargin}` : "—"} sub={`Moy. +${fmt1(agg.avgWinningMargin)}`} tone={ACCENT} />
            </div>
          </div>

          <div style={card}>
            <SectionTitle>PROGRESSION</SectionTitle>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, scrollbarWidth: "none" }}>
              {([
                ["average", "MOY. VOLÉE"],
                ["success", "RÉUSSITE"],
                ["best", "BEST"],
                ["lives", "VIES PERDUES"],
              ] as Array<[EvolutionMetric, string]>).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
                  style={{
                    flex: "0 0 auto",
                    borderRadius: 999,
                    padding: "6px 9px",
                    border: `1px solid ${metric === key ? `${GOLD}AA` : "rgba(255,255,255,.10)"}`,
                    background: metric === key ? "rgba(246,194,86,.14)" : "rgba(255,255,255,.03)",
                    color: metric === key ? GOLD : TEXT70,
                    fontSize: 9,
                    fontWeight: 1000,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ minHeight: 92, borderRadius: 15, padding: 9, background: "rgba(0,0,0,.24)", border: "1px solid rgba(255,255,255,.06)" }}>
              {evolutionPoints.length ? <SparklinePro points={evolutionPoints} height={84} /> : <div style={{ color: TEXT55, textAlign: "center", padding: 28 }}>Pas assez de données.</div>}
            </div>
          </div>

          <div style={card}>
            <SectionTitle right={`${agg.successes} réussites · ${agg.failures} échecs`}>OBJECTIFS ET SURVIE</SectionTitle>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: TEXT70, fontSize: 11, marginBottom: 5 }}><span>Objectifs dépassés</span><b style={{ color: GREEN }}>{fmt1(agg.objectiveRate)}%</b></div>
                <ProgressBar value={agg.successes} max={Math.max(1, agg.targetsFaced)} tone={GREEN} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: TEXT70, fontSize: 11, marginBottom: 5 }}><span>Objectifs manqués</span><b style={{ color: RED }}>{fmt1(pct(agg.failures, agg.targetsFaced))}%</b></div>
                <ProgressBar value={agg.failures} max={Math.max(1, agg.targetsFaced)} tone={RED} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
              <Kpi label="Vies restantes moy." value={fmt1(agg.avgLivesLeft)} tone={ACCENT} />
              <Kpi label="Classement moyen" value={agg.avgRank ? fmt1(agg.avgRank) : "—"} tone={GOLD} />
              <Kpi label="Plus faible volée" value={agg.worstVisit || "—"} tone={RED} />
              <Kpi label="Points marqués" value={agg.points} tone={BLUE} />
            </div>
          </div>

          <div style={card}>
            <SectionTitle>RÉUSSITE SELON LE SCORE À BATTRE</SectionTitle>
            <div style={{ display: "grid", gap: 8 }}>
              {agg.targetBands.map((band) => (
                <div key={band.label} style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr) 72px", gap: 8, alignItems: "center" }}>
                  <div style={{ color: TEXT70, fontSize: 10, fontWeight: 900 }}>{band.label}</div>
                  <ProgressBar value={band.ok} max={Math.max(1, band.total)} tone={band.rate >= 60 ? GREEN : band.rate >= 40 ? GOLD : RED} />
                  <div style={{ textAlign: "right", fontSize: 10, color: band.total ? TEXT : TEXT55 }}><b>{fmt1(band.rate)}%</b> · {band.ok}/{band.total}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <SectionTitle right={`${agg.darts} fléchettes`}>RÉPARTITION DES IMPACTS</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
              <HitTile label="Simple" value={agg.singles} total={Math.max(1, agg.darts)} tone="#d8b7ff" />
              <HitTile label="Double" value={agg.doubles} total={Math.max(1, agg.darts)} tone={BLUE} />
              <HitTile label="Triple" value={agg.triples} total={Math.max(1, agg.darts)} tone={ACCENT} />
              <HitTile label="Bull" value={agg.bulls} total={Math.max(1, agg.darts)} tone={GREEN} />
              <HitTile label="DBull" value={agg.dbulls} total={Math.max(1, agg.darts)} tone={GOLD} />
              <HitTile label="Miss" value={agg.misses} total={Math.max(1, agg.darts)} tone={RED} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }}>
              <Kpi label="Taux de touche" value={`${fmt1(agg.hitRate)}%`} tone={GREEN} />
              <Kpi label="Saisies score total" value={agg.scoreOnlyVisits} sub={`${fmt1(pct(agg.scoreOnlyVisits, agg.visits))}% des volées`} tone={ACCENT} />
            </div>
          </div>

          <div style={card}>
            <SectionTitle>VOLUME DES VOLÉES</SectionTitle>
            <div style={{ display: "grid", gap: 8 }}>
              {agg.scoreBands.map((band) => (
                <div key={band.label} style={{ display: "grid", gridTemplateColumns: "62px minmax(0,1fr) 42px", gap: 8, alignItems: "center" }}>
                  <div style={{ color: band.tone, fontSize: 10, fontWeight: 1000 }}>{band.label}</div>
                  <ProgressBar value={band.value} max={Math.max(1, ...agg.scoreBands.map((x) => x.value))} tone={band.tone} />
                  <div style={{ color: TEXT, textAlign: "right", fontWeight: 1000, fontSize: 11 }}>{band.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <SectionTitle>CLASSEMENTS</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
              <Kpi label="1er" value={agg.placements.first} tone={GOLD} />
              <Kpi label="2e" value={agg.placements.second} tone="#C7D2DF" />
              <Kpi label="3e" value={agg.placements.third} tone="#D58A52" />
              <Kpi label="4e+" value={agg.placements.other} tone={TEXT70} />
            </div>
          </div>

          {segmentEntries.length ? (
            <div style={card}>
              <SectionTitle right="Top 18">SEGMENTS LES PLUS TOUCHÉS</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
                {segmentEntries.map(([label, value], index) => (
                  <div key={label} style={{ borderRadius: 12, padding: "8px 7px", background: index < 3 ? "rgba(255,79,184,.10)" : "rgba(255,255,255,.035)", border: `1px solid ${index < 3 ? `${ACCENT}44` : "rgba(255,255,255,.07)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 5 }}>
                    <span style={{ fontSize: 10, color: index < 3 ? ACCENT : TEXT70, fontWeight: 1000 }}>{label}</span>
                    <b style={{ fontSize: 13 }}>{n(value)}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={card}>
            <SectionTitle right={`${sessions.length} résultat${sessions.length > 1 ? "s" : ""}`}>HISTORIQUE LES 5 VIES</SectionTitle>
            <div style={{ display: "grid", gap: 8 }}>
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSession(session)}
                  style={{
                    width: "100%",
                    borderRadius: 15,
                    padding: 10,
                    border: `1px solid ${session.isWin ? "rgba(114,240,168,.34)" : "rgba(255,99,120,.24)"}`,
                    background: session.isWin ? "linear-gradient(180deg,rgba(17,58,42,.38),rgba(11,17,16,.72))" : "linear-gradient(180deg,rgba(66,17,30,.28),rgba(14,12,16,.76))",
                    color: TEXT,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: session.isWin ? GREEN : RED, fontSize: 11, fontWeight: 1000 }}>{session.isWin ? "VICTOIRE" : "DÉFAITE"}{session.rank ? ` · ${session.rank}${session.rank === 1 ? "er" : "e"}` : ""}</div>
                      <div style={{ color: TEXT55, fontSize: 9.5, marginTop: 2 }}>{formatDate(session.date)} · {session.playersCount} joueurs · {formatDuration(session.durationMs)}</div>
                    </div>
                    <div style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${ACCENT}44`, color: ACCENT, fontSize: 10, fontWeight: 1000 }}>{session.livesLeft} ♥</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 8 }}>
                    {[
                      ["MOY.", fmt1(session.avgVisit)],
                      ["BEST", session.bestVisit || "—"],
                      ["RÉUSS.", `${fmt1(pct(session.successfulVisits, session.targetsFaced))}%`],
                      ["VOLÉES", session.visits],
                    ].map(([label, value]) => (
                      <div key={String(label)} style={{ borderRadius: 9, padding: "5px 4px", background: "rgba(0,0,0,.22)", textAlign: "center" }}>
                        <div style={{ color: TEXT55, fontSize: 7.5, fontWeight: 900 }}>{label}</div>
                        <div style={{ color: TEXT, fontSize: 11, fontWeight: 1000, marginTop: 1 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedSession ? (
        <div
          onClick={() => setSelectedSession(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 12, background: "rgba(0,0,0,.78)", backdropFilter: "blur(7px)" }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(620px,100%)", maxHeight: "88vh", overflow: "hidden", borderRadius: 22, border: `1px solid ${ACCENT}55`, background: "linear-gradient(180deg,#18131a,#08080c)", boxShadow: "0 28px 90px rgba(0,0,0,.82)" }}
          >
            <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "1px solid rgba(255,255,255,.09)" }}>
              <div>
                <div style={{ ...titleStyle, fontSize: 14 }}>DÉTAIL DE LA PARTIE</div>
                <div style={{ color: TEXT55, fontSize: 9.5, marginTop: 2 }}>{formatDate(selectedSession.date)}</div>
              </div>
              <button onClick={() => setSelectedSession(null)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 20 }}>×</button>
            </div>
            <div style={{ maxHeight: "calc(88vh - 52px)", overflowY: "auto", padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
                <Kpi label="Résultat" value={selectedSession.isWin ? "Victoire" : "Défaite"} sub={selectedSession.rank ? `Classement : ${selectedSession.rank}/${selectedSession.playersCount}` : undefined} tone={selectedSession.isWin ? GREEN : RED} />
                <Kpi label="Vies restantes" value={selectedSession.livesLeft} sub={`${selectedSession.livesLost} perdue(s)`} tone={ACCENT} />
                <Kpi label="Moyenne / volée" value={fmt1(selectedSession.avgVisit)} tone={GOLD} />
                <Kpi label="Meilleure volée" value={selectedSession.bestVisit || "—"} tone={BLUE} />
                <Kpi label="Réussite" value={`${fmt1(pct(selectedSession.successfulVisits, selectedSession.targetsFaced))}%`} sub={`${selectedSession.successfulVisits}/${selectedSession.targetsFaced}`} tone={GREEN} />
                <Kpi label="Meilleure marge" value={selectedSession.bestMargin ? `+${selectedSession.bestMargin}` : "—"} tone={ACCENT} />
              </div>

              {selectedSession.rankings.length ? (
                <div style={card}>
                  <SectionTitle>CLASSEMENT FINAL</SectionTitle>
                  <div style={{ display: "grid", gap: 6 }}>
                    {selectedSession.rankings.map((row: any, index: number) => {
                      const winner = Boolean(row?.isWinner ?? row?.win) || index === 0;
                      return (
                        <div key={playerIdOf(row) || index} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderRadius: 11, padding: "7px 8px", background: winner ? "rgba(246,194,86,.09)" : "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)" }}>
                          <div style={{ fontWeight: 1000, color: winner ? GOLD : TEXT70 }}>{n(row?.rank, row?.position, index + 1)}</div>
                          <div style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 11, fontWeight: 900 }}>{String(row?.name ?? row?.playerName ?? "Joueur")}</div>
                          <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1000 }}>{n(row?.livesLeft, row?.remainingLives, row?.lives)} ♥</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div style={card}>
                <SectionTitle right={`${selectedSession.events.length} volée${selectedSession.events.length > 1 ? "s" : ""}`}>VOLÉES DU JOUEUR</SectionTitle>
                {selectedSession.events.length ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {selectedSession.events.map((ev, index) => (
                      <div key={`${ev.turn}-${index}`} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 11, background: ev.openingVisit ? "rgba(130,216,255,.07)" : ev.success ? "rgba(114,240,168,.07)" : "rgba(255,99,120,.07)", border: `1px solid ${ev.openingVisit ? "rgba(130,216,255,.18)" : ev.success ? "rgba(114,240,168,.18)" : "rgba(255,99,120,.18)"}` }}>
                        <div style={{ color: TEXT55, fontSize: 9, fontWeight: 1000 }}>#{ev.turn || index + 1}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {(ev.darts || []).length ? ev.darts.map((dart, dartIndex) => <span key={dartIndex} style={{ borderRadius: 7, padding: "2px 5px", background: "rgba(0,0,0,.28)", color: TEXT70, fontSize: 8.5, fontWeight: 900 }}>{dartLabel(dart)}</span>) : <span style={{ color: TEXT55, fontSize: 8.5 }}>Saisie du total</span>}
                          </div>
                          <div style={{ color: TEXT55, fontSize: 8.5, marginTop: 3 }}>{ev.openingVisit ? "Volée libre" : `À battre : ${ev.target} · marge ${n(ev.margin) >= 0 ? "+" : ""}${n(ev.margin)}`}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: ev.openingVisit ? BLUE : ev.success ? GREEN : RED, fontSize: 16, fontWeight: 1000 }}>{ev.score}</div>
                          <div style={{ color: TEXT55, fontSize: 7.5 }}>{ev.lifeLost ? "−1 vie" : ev.openingVisit ? "référence" : "validé"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: TEXT55, fontSize: 11 }}>Le détail des volées n’est pas disponible pour cette ancienne partie.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
