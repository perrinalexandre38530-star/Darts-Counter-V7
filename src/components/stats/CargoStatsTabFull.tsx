// @ts-nocheck
// =============================================================
// CARGO — centre de performances V4
// Stats longitudinales massives : rendement, darts, séries, risques,
// contrats, équipes, records et forme récente.
// =============================================================

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { cargoVariantLabel } from "../../lib/gameEngines/cargoEngine";
import "../../styles/cargo-ui.css";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const PURPLE = "#d98cff";
const SOFT = "#aab1bf";
const WHITE = "#eef2f7";
const COLORS = [ORANGE, BLUE, PURPLE, GOLD, GREEN, RED, "#ff68b4", "#8dc5ff"];
const TOOLTIP_STYLE: any = { background: "rgba(5,7,11,.97)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, color: "#fff", fontSize: 10, boxShadow: "0 10px 28px rgba(0,0,0,.38)" };

type StatsTab = "overview" | "performance" | "darts" | "logistics" | "teams" | "records";

const n = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;
const txt = (value: any) => String(value ?? "").trim();
const ratio = (part: number, total: number) => total > 0 ? part / total : 0;
const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
const pctText = (part: number, total: number) => `${pct(part, total)}%`;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const sum = (rows: any[], key: string) => rows.reduce((total, row) => total + metric(row, key), 0);
const max = (rows: any[], key: string) => Math.max(0, ...rows.map((row) => metric(row, key)));
const playedAt = (record: any) => n(record?.finishedAt || record?.endedAt || record?.updatedAt || record?.createdAt);

function metric(row: any, key: string, ...fallbacks: string[]) {
  const keys = [key, ...fallbacks];
  for (const current of keys) {
    const direct = row?.[current];
    if (Number.isFinite(Number(direct))) return Number(direct);
    const advanced = row?.advanced?.[current];
    if (Number.isFinite(Number(advanced))) return Number(advanced);
    const stats = row?.stats?.[current];
    if (Number.isFinite(Number(stats))) return Number(stats);
  }
  return 0;
}
function isCargo(record: any) {
  return [record?.kind, record?.mode, record?.summary?.kind, record?.summary?.mode, record?.payload?.kind, record?.payload?.mode, record?.payload?.stats?.mode]
    .map((value) => txt(value).toLowerCase()).join("|").includes("cargo");
}
function pools(record: any) {
  return [record?.summary?.perPlayer, record?.payload?.summary?.perPlayer, record?.payload?.stats?.players, record?.summary?.rankings, record?.payload?.players, record?.summary?.players, record?.players, record?.summary?.detailedByPlayer]
    .filter(Boolean);
}
function rowId(row: any) { return txt(row?.id || row?.playerId || row?.profileId); }
function rowName(row: any) { return txt(row?.name || row?.playerName || row?.displayName || row?.display_name || "Joueur"); }
function allPlayerRows(record: any) {
  for (const pool of pools(record)) {
    if (Array.isArray(pool) && pool.length) return pool.filter(Boolean);
    if (pool && typeof pool === "object") return Object.entries(pool).map(([id, value]: any) => ({ id, ...(value || {}) }));
  }
  return [];
}
function teamPools(record: any) {
  return [record?.summary?.teams, record?.summary?.teamStandings, record?.payload?.summary?.teams, record?.payload?.summary?.teamStandings, record?.payload?.stats?.teams, record?.payload?.teams, record?.teams].filter(Boolean);
}
function allTeamRows(record: any) {
  for (const pool of teamPools(record)) {
    if (Array.isArray(pool) && pool.length) return pool.filter(Boolean);
    if (pool && typeof pool === "object") return Object.entries(pool).map(([id, value]: any) => ({ id, ...(value || {}) }));
  }
  return [];
}
function formatOf(record: any) {
  if (participantMode(record) === "teams") return "teams";
  return allPlayerRows(record).length <= 1 ? "solo" : "multi";
}
function findRow(record: any, playerId: string, playerName?: string) {
  const found: any[] = [];
  for (const pool of pools(record)) {
    if (Array.isArray(pool)) {
      const byId = pool.find((row: any) => txt(row?.id || row?.playerId || row?.profileId) === txt(playerId));
      const byName = playerName ? pool.find((row: any) => txt(row?.name || row?.playerName).toLowerCase() === txt(playerName).toLowerCase()) : null;
      if (byId || byName) found.push(byId || byName);
    } else if (pool && typeof pool === "object") {
      const byId = pool[playerId];
      if (byId) found.push({ id: playerId, ...byId });
      else if (playerName) {
        const hit = Object.entries(pool).find(([, value]: any) => txt(value?.name || value?.playerName).toLowerCase() === txt(playerName).toLowerCase());
        if (hit) found.push({ id: hit[0], ...(hit[1] as any) });
      }
    }
  }
  return found.reduce((acc, row) => ({ ...(acc || {}), ...(row || {}), advanced: { ...(acc?.advanced || {}), ...(row?.advanced || {}) } }), null);
}
function winnerIds(record: any) {
  return [record?.winnerIds, record?.summary?.winnerIds, record?.payload?.winnerIds, record?.payload?.summary?.winnerIds, record?.winnerId, record?.summary?.winnerId]
    .flatMap((value: any) => Array.isArray(value) ? value : value ? [value] : []).map(String);
}
function didWin(record: any, row: any, playerId: string) {
  return row?.win === true || row?.winner === true || winnerIds(record).includes(String(playerId)) || n(row?.rank) === 1 || n(row?.teamRank) === 1;
}
function variantOf(record: any) {
  return record?.summary?.variant || record?.payload?.summary?.variant || record?.payload?.config?.variant || record?.game?.variant || "cargo_classic";
}
function participantMode(record: any) {
  return record?.summary?.participantMode || record?.summary?.config?.participantMode || record?.payload?.config?.participantMode || record?.game?.participantMode || "players";
}
function fmtDate(ts: number) { try { return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }); } catch { return "—"; } }
function fmt1(value: any) { return n(value).toFixed(1); }
function change(current: number, previous: number) { if (!previous) return current ? 100 : 0; return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10; }
function panel(extra: React.CSSProperties = {}): React.CSSProperties { return { borderRadius: 18, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.052),rgba(0,0,0,.27))", border: "1px solid rgba(255,255,255,.085)", boxShadow: "0 14px 34px rgba(0,0,0,.23)", boxSizing: "border-box", minWidth: 0, ...extra }; }

function Kpi({ label, value, sub, color = ORANGE, icon = "•" }: any) {
  return <div style={{ minWidth: 0, minHeight: 82, borderRadius: 15, padding: 9, textAlign: "center", background: `${color}0d`, border: `1px solid ${color}38` }}>
    <div style={{ fontSize: 14, color }}>{icon}</div><div style={{ color, fontSize: 19, lineHeight: 1.04, fontWeight: 1150 }}>{value}</div>{sub ? <div style={{ color: WHITE, fontSize: 7.2, marginTop: 2, fontWeight: 900 }}>{sub}</div> : null}<div style={{ marginTop: 4, color: SOFT, fontSize: 6.8, fontWeight: 1000, letterSpacing: .3 }}>{String(label).toUpperCase()}</div>
  </div>;
}
function Mini({ label, value, color = ORANGE, note }: any) {
  return <div style={{ minWidth: 0, borderRadius: 12, padding: 8, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: SOFT, fontSize: 6.8, fontWeight: 1000 }}>{String(label).toUpperCase()}</div><div style={{ color, fontSize: 14, fontWeight: 1100, marginTop: 2 }}>{value}</div>{note ? <div style={{ color: "#777f90", fontSize: 6.5, marginTop: 2 }}>{note}</div> : null}</div>;
}
function SectionTitle({ title, subtitle, color = ORANGE }: any) { return <div><div style={{ color, fontSize: 10, fontWeight: 1100, letterSpacing: .65 }}>{title}</div>{subtitle ? <div style={{ color: SOFT, fontSize: 8 }}>{subtitle}</div> : null}</div>; }
function RatioBar({ label, value, color = GREEN, note }: any) {
  const safe = Math.max(0, Math.min(100, n(value)));
  return <div style={{ marginTop: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#a7aebb", fontSize: 8.3, fontWeight: 900 }}><span>{label}{note ? <small style={{ color: "#72798a", marginLeft: 5 }}>· {note}</small> : null}</span><b style={{ color }}>{safe.toFixed(1)}%</b></div><div style={{ marginTop: 3, height: 7, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}><div style={{ width: `${safe}%`, height: "100%", background: color, boxShadow: `0 0 9px ${color}88` }}/></div></div>;
}
function Delta({ label, value, suffix = "%", inverse = false }: any) {
  const good = inverse ? value <= 0 : value >= 0;
  const color = value === 0 ? SOFT : good ? GREEN : RED;
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 7, padding: "7px 8px", borderRadius: 11, background: `${color}08`, border: `1px solid ${color}26` }}><span style={{ color: SOFT, fontSize: 8 }}>{label}</span><b style={{ color, fontSize: 9 }}>{value > 0 ? "+" : ""}{value}{suffix}</b></div>;
}
function RecordCard({ label, value, date, note, color = GOLD }: any) { return <div style={{ minWidth: 0, padding: 9, borderRadius: 13, background: `${color}0c`, border: `1px solid ${color}2d` }}><div style={{ color: SOFT, fontSize: 6.7, fontWeight: 1000 }}>{String(label).toUpperCase()}</div><div style={{ color, fontSize: 17, fontWeight: 1150, marginTop: 2 }}>{value}</div><div style={{ color: "#aab1bf", fontSize: 7.2, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{date || "—"}{note ? ` · ${note}` : ""}</div></div>; }
function pill(active: boolean, color = ORANGE): React.CSSProperties { return { minHeight: 31, padding: "0 9px", borderRadius: 999, border: `1px solid ${active ? color : "rgba(255,255,255,.09)"}`, background: active ? `${color}17` : "rgba(255,255,255,.035)", color: active ? color : "#9da4b5", fontSize: 8.1, fontWeight: 1000, cursor: "pointer" }; }

export default function CargoStatsTabFull({ records = [], playerId, playerName }: any) {
  const [range, setRange] = React.useState<"day" | "week" | "month" | "year" | "all">("all");
  const [tab, setTab] = React.useState<StatsTab>("overview");
  const now = Date.now();
  const rangeMs: Record<string, number> = { day: 86400000, week: 7 * 86400000, month: 31 * 86400000, year: 366 * 86400000 };

  const matches = React.useMemo(() => (records || [])
    .filter(isCargo)
    .map((record: any) => ({ record, row: findRow(record, String(playerId || ""), playerName) }))
    .filter((item: any) => item.row)
    .filter((item: any) => range === "all" || playedAt(item.record) >= now - rangeMs[range])
    .sort((a: any, b: any) => playedAt(b.record) - playedAt(a.record)), [records, playerId, playerName, range]);

  const rows = matches.map((item: any) => item.row);
  const games = matches.length;
  const wins = matches.filter(({ record, row }: any) => didWin(record, row, String(playerId))).length;
  const podiums = rows.filter((row: any) => n(row?.rank || row?.teamRank) > 0 && n(row?.rank || row?.teamRank) <= 3).length;
  const teamMatches = matches.filter(({ record }: any) => participantMode(record) === "teams");
  const teamWins = teamMatches.filter(({ record, row }: any) => didWin(record, row, String(playerId))).length;
  const soloMulti = matches.filter(({ record }: any) => participantMode(record) !== "teams");
  const ffaWins = soloMulti.filter(({ record, row }: any) => didWin(record, row, String(playerId))).length;

  const formatRows = React.useMemo(() => {
    const buckets: Record<string, any> = {
      solo: { key: "solo", label: "SOLO", games: 0, wins: 0, darts: 0, hits: 0, visits: 0, productive: 0, safe: 0 },
      multi: { key: "multi", label: "MULTI", games: 0, wins: 0, darts: 0, hits: 0, visits: 0, productive: 0, safe: 0 },
      teams: { key: "teams", label: "ÉQUIPES", games: 0, wins: 0, darts: 0, hits: 0, visits: 0, productive: 0, safe: 0 },
    };
    matches.forEach(({ record, row }: any) => {
      const key = formatOf(record);
      const bucket = buckets[key];
      bucket.games += 1;
      bucket.wins += didWin(record, row, String(playerId)) ? 1 : 0;
      bucket.darts += metric(row, "darts", "dartsThrown");
      bucket.hits += metric(row, "hits");
      bucket.visits += metric(row, "visits");
      bucket.productive += metric(row, "productiveVisits");
      bucket.safe += metric(row, "safeVisits");
    });
    return Object.values(buckets).map((bucket: any) => ({
      ...bucket,
      winRate: pct(bucket.wins, bucket.games),
      accuracy: pct(bucket.hits, bucket.darts),
      productiveRate: pct(bucket.productive, bucket.visits),
      safeRate: pct(bucket.safe, bucket.visits),
    }));
  }, [matches, playerId]);

  const peerRows = React.useMemo(() => {
    const map = new Map<string, any>();
    matches.forEach(({ record, row }: any) => {
      const selectedId = String(playerId || "");
      const selectedTeamId = txt(row?.teamId);
      const teamMode = participantMode(record) === "teams";
      allPlayerRows(record).forEach((peer: any) => {
        const id = rowId(peer);
        if (!id || id === selectedId) return;
        const peerTeamId = txt(peer?.teamId);
        const relation = teamMode && selectedTeamId && peerTeamId === selectedTeamId ? "teammate" : "opponent";
        const current = map.get(id) || { id, name: rowName(peer), games: 0, together: 0, against: 0, wins: 0, darts: 0, hits: 0, podiums: 0 };
        current.games += 1;
        current[relation === "teammate" ? "together" : "against"] += 1;
        current.wins += didWin(record, peer, id) ? 1 : 0;
        current.darts += metric(peer, "darts", "dartsThrown");
        current.hits += metric(peer, "hits");
        current.podiums += n(peer?.rank || peer?.teamRank) > 0 && n(peer?.rank || peer?.teamRank) <= 3 ? 1 : 0;
        if (!current.name || current.name === "Joueur") current.name = rowName(peer);
        map.set(id, current);
      });
    });
    return [...map.values()].map((row: any) => ({ ...row, winRate: pct(row.wins, row.games), accuracy: pct(row.hits, row.darts) })).sort((a, b) => b.games - a.games || b.against - a.against);
  }, [matches, playerId]);

  const teamRowsAgg = React.useMemo(() => {
    const map = new Map<string, any>();
    teamMatches.forEach(({ record, row }: any) => {
      const selectedTeamId = txt(row?.teamId);
      const teams = allTeamRows(record);
      const selectedTeam = teams.find((team: any) => txt(team?.id || team?.teamId) === selectedTeamId || (Array.isArray(team?.playerIds) && team.playerIds.map(String).includes(String(playerId))));
      if (!selectedTeam) return;
      const key = txt(selectedTeam?.name || selectedTeam?.id || selectedTeamId || "Équipe");
      const current = map.get(key) || { name: key || "Équipe", games: 0, wins: 0, score: 0, darts: 0, hits: 0, pallets: 0, contracts: 0, lost: 0, rejected: 0 };
      current.games += 1;
      current.wins += selectedTeam?.win === true || n(selectedTeam?.rank) === 1 ? 1 : 0;
      current.score += n(selectedTeam?.score || selectedTeam?.totalWeight || selectedTeam?.parcelsDelivered);
      current.darts += n(selectedTeam?.darts);
      current.hits += n(selectedTeam?.hits);
      current.pallets += n(selectedTeam?.pallets);
      current.contracts += n(selectedTeam?.completedContracts);
      current.lost += n(selectedTeam?.lostWeight);
      current.rejected += n(selectedTeam?.rejectedWeight);
      map.set(key, current);
    });
    return [...map.values()].map((row: any) => ({ ...row, winRate: pct(row.wins, row.games), accuracy: pct(row.hits, row.darts), avgScore: row.games ? row.score / row.games : 0 })).sort((a, b) => b.games - a.games || b.winRate - a.winRate);
  }, [teamMatches, playerId]);

  const darts = sum(rows, "darts") || sum(rows, "dartsThrown");
  const hits = sum(rows, "hits");
  const visits = sum(rows, "visits");
  const singles = sum(rows, "singles"), doubles = sum(rows, "doubles"), triples = sum(rows, "triples"), bulls = sum(rows, "bulls"), dbulls = sum(rows, "dbulls"), misses = sum(rows, "misses");
  const weight = sum(rows, "totalWeight"), parcels = sum(rows, "parcelsDelivered"), deliveries = sum(rows, "parcelDeliveries"), bonuses = sum(rows, "parcelBonuses");
  const pallets = sum(rows, "pallets"), cartons = sum(rows, "cartons"), crates = sum(rows, "crates"), fullPallets = sum(rows, "fullPallets");
  const completedContracts = sum(rows, "completedContracts"), failedContracts = sum(rows, "failedContracts"), contractAttempts = completedContracts + failedContracts;
  const lostWeight = sum(rows, "lostWeight"), rejectedWeight = sum(rows, "rejectedWeight"), overloads = sum(rows, "overloads"), perfectLoads = sum(rows, "perfectLoads");
  const fragileCompleted = sum(rows, "fragileCompleted"), fragileBroken = sum(rows, "fragileBroken"), urgentCompleted = sum(rows, "urgentCompleted");
  const fragileAttempts = fragileCompleted + fragileBroken;

  const productiveVisits = sum(rows, "productiveVisits"), emptyVisits = sum(rows, "emptyVisits"), noMissVisits = sum(rows, "noMissVisits"), perfectVisits = sum(rows, "perfectAccuracyVisits");
  const zeroHitVisits = sum(rows, "zeroHitVisits"), oneHitVisits = sum(rows, "oneHitVisits"), twoHitVisits = sum(rows, "twoHitVisits"), threeHitVisits = sum(rows, "threeHitVisits");
  const firstDarts = sum(rows, "firstDarts"), firstHits = sum(rows, "firstDartHits"), secondDarts = sum(rows, "secondDarts"), secondHits = sum(rows, "secondDartHits"), thirdDarts = sum(rows, "thirdDarts"), thirdHits = sum(rows, "thirdDartHits"), lastDarts = sum(rows, "lastDarts"), lastHits = sum(rows, "lastDartHits");
  const safeVisits = sum(rows, "safeVisits"), riskEvents = sum(rows, "riskEvents");
  const seriesStarts = sum(rows, "seriesStarts"), seriesSecured = sum(rows, "seriesSecured"), seriesLost = sum(rows, "seriesLostEvents");
  const longestStreak = max(rows, "longestHitStreak"), longestMissStreak = max(rows, "longestMissStreak"), bestVisit = max(rows, "bestVisitScore"), bestRound = max(rows, "bestRoundScore");
  const avgConsistency = mean(rows.map((row) => metric(row, "consistency")).filter((v) => v > 0));
  const bestConsistency = max(rows, "consistency");
  const uniqueNumbersBest = max(rows, "uniqueNumbersHit"), uniqueSegmentsBest = max(rows, "uniqueSegmentsHit");
  const handledWeight = weight + lostWeight + rejectedWeight;
  const weightedPower = singles + doubles * 2 + triples * 3 + bulls + dbulls * 2;

  const cargoDarts = matches.filter(({ record }) => variantOf(record) !== "parcel_delivery").reduce((total, item) => total + metric(item.row, "darts", "dartsThrown"), 0);
  const parcelDarts = matches.filter(({ record }) => variantOf(record) === "parcel_delivery").reduce((total, item) => total + metric(item.row, "darts", "dartsThrown"), 0);

  const variantRows = React.useMemo(() => {
    const map = new Map<string, any>();
    matches.forEach(({ record, row }: any) => {
      const key = variantOf(record);
      const current = map.get(key) || { variant: key, games: 0, wins: 0, darts: 0, hits: 0, score: 0, scorePerDart: [], consistency: [] };
      current.games += 1;
      current.wins += didWin(record, row, String(playerId)) ? 1 : 0;
      current.darts += metric(row, "darts", "dartsThrown");
      current.hits += metric(row, "hits");
      current.score += key === "parcel_delivery" ? metric(row, "parcelsDelivered") : metric(row, "totalWeight");
      const spd = metric(row, "scorePerDart"); if (spd > 0) current.scorePerDart.push(spd);
      const con = metric(row, "consistency"); if (con > 0) current.consistency.push(con);
      map.set(key, current);
    });
    return [...map.values()].map((row) => ({ ...row, winRate: pct(row.wins, row.games), accuracy: pct(row.hits, row.darts), avgScore: row.games ? row.score / row.games : 0, avgScorePerDart: mean(row.scorePerDart), avgConsistency: mean(row.consistency) })).sort((a, b) => b.games - a.games);
  }, [matches, playerId]);

  const trend = React.useMemo(() => [...matches].reverse().slice(-24).map(({ record, row }: any, index: number) => {
    const variant = variantOf(record), parcel = variant === "parcel_delivery";
    const rowDarts = metric(row, "darts", "dartsThrown"), rowHits = metric(row, "hits");
    const score = parcel ? metric(row, "parcelsDelivered") : metric(row, "totalWeight");
    return { index: index + 1, date: fmtDate(playedAt(record)), score, accuracy: metric(row, "accuracy") || pct(rowHits, rowDarts), efficiency: metric(row, "scorePerDart") || (rowDarts ? score / rowDarts : 0), consistency: metric(row, "consistency"), productive: metric(row, "productiveVisitRate") || pct(metric(row, "productiveVisits"), metric(row, "visits")), won: didWin(record, row, String(playerId)), parcel, variant };
  }), [matches, playerId]);

  const logisticsTrend = React.useMemo(() => [...matches].reverse().slice(-24).map(({ record, row }: any, index: number) => ({
    index: index + 1,
    date: fmtDate(playedAt(record)),
    retained: metric(row, "totalWeight"),
    lost: metric(row, "lostWeight"),
    rejected: metric(row, "rejectedWeight"),
    contracts: metric(row, "completedContracts"),
    failedContracts: metric(row, "failedContracts"),
    pallets: metric(row, "pallets"),
    parcels: metric(row, "parcelsDelivered"),
    risk: metric(row, "riskEventRate"),
  })), [matches]);

  const recent5 = matches.slice(0, 5), previous5 = matches.slice(5, 10);
  const sliceAvg = (items: any[], fn: (item: any) => number) => mean(items.map(fn).filter((v) => Number.isFinite(v)));
  const form = {
    win: change(pct(recent5.filter(({ record, row }) => didWin(record, row, String(playerId))).length, recent5.length), pct(previous5.filter(({ record, row }) => didWin(record, row, String(playerId))).length, previous5.length)),
    accuracy: change(sliceAvg(recent5, ({ row }) => metric(row, "accuracy") || pct(metric(row, "hits"), metric(row, "darts", "dartsThrown"))), sliceAvg(previous5, ({ row }) => metric(row, "accuracy") || pct(metric(row, "hits"), metric(row, "darts", "dartsThrown")))),
    efficiency: change(sliceAvg(recent5, ({ row }) => metric(row, "scorePerDart")), sliceAvg(previous5, ({ row }) => metric(row, "scorePerDart"))),
    consistency: change(sliceAvg(recent5, ({ row }) => metric(row, "consistency")), sliceAvg(previous5, ({ row }) => metric(row, "consistency"))),
    risk: change(sliceAvg(recent5, ({ row }) => metric(row, "riskEventRate")), sliceAvg(previous5, ({ row }) => metric(row, "riskEventRate"))),
  };

  const cargoIndex = Math.round(mean([
    pct(hits, darts),
    pct(productiveVisits, visits),
    pct(noMissVisits, visits),
    pct(safeVisits || Math.max(0, visits - riskEvents), visits),
    avgConsistency,
    contractAttempts ? pct(completedContracts, contractAttempts) : 100,
  ].filter((value) => Number.isFinite(value))) * 10) / 10;

  const bestFormat = [...formatRows].filter((row: any) => row.games > 0).sort((a: any, b: any) => b.winRate - a.winRate || b.accuracy - a.accuracy)[0] || null;
  const bestVariant = [...variantRows].filter((row: any) => row.games > 0).sort((a: any, b: any) => b.winRate - a.winRate || b.accuracy - a.accuracy)[0] || null;
  const mostFrequentPeer = peerRows[0] || null;
  const topRival = [...peerRows].filter((row: any) => row.against > 0).sort((a: any, b: any) => b.against - a.against || b.winRate - a.winRate)[0] || null;
  const topTeammate = [...peerRows].filter((row: any) => row.together > 0).sort((a: any, b: any) => b.together - a.together || b.winRate - a.winRate)[0] || null;

  const recordsList = React.useMemo(() => {
    const choose = (fn: (item: any) => number) => matches.reduce((best: any, item: any) => !best || fn(item) > fn(best) ? item : best, null);
    const chooseMin = (fn: (item: any) => number) => matches.reduce((best: any, item: any) => {
      const value = fn(item); if (!Number.isFinite(value)) return best;
      if (!best) return item;
      return value < fn(best) ? item : best;
    }, null);
    const cargoScore = choose((item) => variantOf(item.record) === "parcel_delivery" ? -1 : metric(item.row, "totalWeight"));
    const parcelScore = choose((item) => variantOf(item.record) === "parcel_delivery" ? metric(item.row, "parcelsDelivered") : -1);
    const acc = choose((item) => metric(item.row, "darts", "dartsThrown") >= 3 ? (metric(item.row, "accuracy") || pct(metric(item.row, "hits"), metric(item.row, "darts", "dartsThrown"))) : -1);
    const bestV = choose((item) => metric(item.row, "bestVisitScore"));
    const bestR = choose((item) => metric(item.row, "bestRoundScore"));
    const streak = choose((item) => metric(item.row, "longestHitStreak"));
    const consistency = choose((item) => metric(item.row, "consistency"));
    const contract = choose((item) => metric(item.row, "contractCompletionRate"));
    const retention = choose((item) => metric(item.row, "retentionRate"));
    const p90 = choose((item) => metric(item.row, "p90VisitScore"));
    const first = choose((item) => metric(item.row, "firstDartAccuracy") || pct(metric(item.row, "firstDartHits"), metric(item.row, "firstDarts")));
    const last = choose((item) => metric(item.row, "lastDartAccuracy") || pct(metric(item.row, "lastDartHits"), metric(item.row, "lastDarts")));
    const palletsRecord = choose((item) => metric(item.row, "pallets"));
    const contractsRecord = choose((item) => metric(item.row, "completedContracts"));
    const noMiss = choose((item) => metric(item.row, "noMissVisitRate") || pct(metric(item.row, "noMissVisits"), metric(item.row, "visits")));
    const perfect = choose((item) => metric(item.row, "perfectAccuracyVisitRate") || pct(metric(item.row, "perfectAccuracyVisits"), metric(item.row, "visits")));
    const safety = choose((item) => metric(item.row, "safeVisitRate") || metric(item.row, "retentionRate"));
    const uniqueNumbers = choose((item) => metric(item.row, "uniqueNumbersHit"));
    const uniqueSegments = choose((item) => metric(item.row, "uniqueSegmentsHit"));
    const efficiency = choose((item) => metric(item.row, "scorePerDart"));
    const power = choose((item) => metric(item.row, "highValueHitRate") || pct(metric(item.row, "triples") + metric(item.row, "dbulls"), metric(item.row, "hits")));
    const bullRateRecord = choose((item) => metric(item.row, "bullRate") || pct(metric(item.row, "bulls") + metric(item.row, "dbulls"), metric(item.row, "darts", "dartsThrown")));
    const riskMin = chooseMin((item) => metric(item.row, "visits") > 0 ? metric(item.row, "riskEventRate") : Number.POSITIVE_INFINITY);
    return { cargoScore, parcelScore, acc, bestV, bestR, streak, consistency, contract, retention, p90, first, last, palletsRecord, contractsRecord, noMiss, perfect, safety, uniqueNumbers, uniqueSegments, efficiency, power, bullRateRecord, riskMin };
  }, [matches]);

  const scoreRecordValue = (item: any) => item ? (variantOf(item.record) === "parcel_delivery" ? metric(item.row, "parcelsDelivered") : metric(item.row, "totalWeight")) : 0;
  const recordDate = (item: any) => item ? fmtDate(playedAt(item.record)) : "—";

  const dartMix = [
    { name: "S", value: singles, color: ORANGE }, { name: "D", value: doubles, color: BLUE }, { name: "T", value: triples, color: PURPLE },
    { name: "Bull", value: bulls, color: GREEN }, { name: "DBull", value: dbulls, color: GOLD }, { name: "MISS", value: misses, color: RED },
  ].filter((row) => row.value > 0);
  const hitVisitMix = [
    { name: "0 touche", value: zeroHitVisits || Math.max(0, visits - oneHitVisits - twoHitVisits - threeHitVisits), color: RED },
    { name: "1 touche", value: oneHitVisits, color: ORANGE }, { name: "2 touches", value: twoHitVisits, color: BLUE }, { name: "3 touches", value: threeHitVisits || perfectVisits, color: GREEN },
  ].filter((row) => row.value > 0);

  if (!playerId) return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques CARGO.</div>;

  const tabs: { id: StatsTab; label: string; icon: string; color: string }[] = [
    { id: "overview", label: "GLOBAL", icon: "🚚", color: ORANGE },
    { id: "performance", label: "PROGRESSION", icon: "📈", color: GREEN },
    { id: "darts", label: "DARTS", icon: "🎯", color: BLUE },
    { id: "logistics", label: "LOGISTIQUE", icon: "▣", color: GOLD },
    { id: "teams", label: "JOUEURS / ÉQUIPES", icon: "👥", color: BLUE },
    { id: "records", label: "RECORDS", icon: "🏆", color: PURPLE },
  ];

  return <div className="cargo-stats-root">
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div><div style={{ color: ORANGE, fontWeight: 1150, letterSpacing: 1, textTransform: "uppercase" }}>CARGO — CENTRE DE PERFORMANCES V5</div><div style={{ marginTop: 4, color: SOFT, fontSize: 9.5 }}>Dashboard longitudinal, tendances, cible, logistique, comparaisons joueurs/équipes et records massifs.</div></div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[["all", "TOUT"], ["day", "24 H"], ["week", "7 J"], ["month", "30 J"], ["year", "1 AN"]].map(([key, label]) => <button key={key} onClick={() => setRange(key as any)} style={pill(range === key, ORANGE)}>{label}</button>)}</div>
    </div>

    <div className="cargo-stats-tabs" style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(88px,1fr))", gap: 5 }}>{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} style={{ minWidth: 0, minHeight: 47, borderRadius: 13, border: `1px solid ${tab === item.id ? item.color : "rgba(255,255,255,.08)"}`, background: tab === item.id ? `${item.color}15` : "rgba(255,255,255,.025)", color: tab === item.id ? item.color : SOFT, fontSize: 7.5, fontWeight: 1050, cursor: "pointer", overflow: "hidden" }}><span style={{ display: "block", fontSize: 13 }}>{item.icon}</span><span>{item.label}</span></button>)}</div>

    {!games ? <div style={{ ...panel(), marginTop: 10, textAlign: "center", color: SOFT }}>Aucune partie CARGO terminée sur cette période.</div> : <>
      {tab === "overview" ? <>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 7 }}>
          <Kpi icon="▣" label="Parties" value={games} sub={`${teamMatches.length} équipes · ${games-teamMatches.length} solo/multi`} />
          <Kpi icon="🏆" label="Victoires" value={`${pct(wins,games)}%`} sub={`${wins}/${games} · ${podiums} podiums`} color={GOLD}/>
          <Kpi icon="◎" label="Précision" value={`${pct(hits,darts)}%`} sub={`${hits}/${darts} touches`} color={GREEN}/>
          <Kpi icon="⚙" label="Poids" value={`${Math.round(weight)} kg`} sub={`${cargoDarts ? (weight/cargoDarts).toFixed(2) : "0.00"} kg/dart`} color={ORANGE}/>
          <Kpi icon="⌂" label="Colis" value={parcels} sub={`${parcelDarts ? (parcels/parcelDarts).toFixed(2) : "0.00"} colis/dart`} color={BLUE}/>
          <Kpi icon="✦" label="Best volée" value={bestVisit} sub={`best tour ${bestRound}`} color={PURPLE}/>
          <Kpi icon="★" label="Indice CARGO" value={`${cargoIndex}/100`} sub={cargoIndex >= 80 ? "maîtrise premium" : cargoIndex >= 65 ? "niveau solide" : cargoIndex >= 50 ? "en progression" : "axe de travail"} color={cargoIndex >= 80 ? GOLD : cargoIndex >= 65 ? GREEN : ORANGE}/>
        </div>

        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="PROFIL CARGO" subtitle="les signaux les plus parlants sur la période" color={GOLD}/><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}><Mini label="Meilleur format" value={bestFormat?.label || "—"} note={bestFormat ? `${bestFormat.winRate}% win · ${bestFormat.games} parties` : "aucune donnée"} color={GREEN}/><Mini label="Meilleure variante" value={bestVariant ? cargoVariantLabel(bestVariant.variant) : "—"} note={bestVariant ? `${bestVariant.winRate}% win · ${bestVariant.accuracy}% préc.` : "aucune donnée"} color={ORANGE}/><Mini label="Partenaire principal" value={topTeammate?.name || "—"} note={topTeammate ? `${topTeammate.together} matchs ensemble` : "pas de match équipe"} color={BLUE}/><Mini label="Rival principal" value={topRival?.name || mostFrequentPeer?.name || "—"} note={topRival ? `${topRival.against} confrontations` : "pas de confrontation"} color={PURPLE}/></div></section>
          <section style={panel()}><SectionTitle title="FORMATS DE JEU" subtitle="solo, multi et équipes consolidés" color={BLUE}/><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{formatRows.map((row: any, index: number) => <div key={row.key} style={{ display: "grid", gridTemplateColumns: "70px repeat(4,minmax(0,1fr))", gap: 5, alignItems: "center", padding: 7, borderRadius: 11, background: `${COLORS[index]}08`, border: `1px solid ${COLORS[index]}24`, textAlign: "center" }}><strong style={{ color: COLORS[index], fontSize: 8, textAlign: "left" }}>{row.label}</strong><SmallCell label="MATCHS" value={row.games}/><SmallCell label="WIN" value={`${row.winRate}%`}/><SmallCell label="PRÉC." value={`${row.accuracy}%`}/><SmallCell label="SÛR" value={`${row.safeRate}%`}/></div>)}</div></section>
        </div>

        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="ÉVOLUTION" subtitle="24 dernières missions · précision / rendement / régularité" color={ORANGE}/><div style={{ height: 190, marginTop: 6 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false}/><XAxis dataKey="index" tick={{ fill: SOFT, fontSize: 7 }}/><YAxis yAxisId="pct" domain={[0,100]} hide/><YAxis yAxisId="eff" orientation="right" hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Line yAxisId="pct" type="monotone" dataKey="accuracy" stroke={GREEN} dot={false} strokeWidth={2}/><Line yAxisId="pct" type="monotone" dataKey="consistency" stroke={PURPLE} dot={false} strokeWidth={1.6}/><Line yAxisId="eff" type="monotone" dataKey="efficiency" stroke={ORANGE} dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div><div style={{ display: "flex", gap: 10, justifyContent: "center", color: SOFT, fontSize: 7 }}><span><b style={{ color: GREEN }}>●</b> précision</span><span><b style={{ color: ORANGE }}>●</b> score/dart</span><span><b style={{ color: PURPLE }}>●</b> régularité</span></div></section>
          <section style={panel()}><SectionTitle title="FORME RÉCENTE" subtitle="5 dernières parties vs 5 précédentes" color={GREEN}/><div style={{ marginTop: 9, display: "grid", gap: 6 }}><Delta label="Win rate" value={form.win}/><Delta label="Précision" value={form.accuracy}/><Delta label="Rendement / dart" value={form.efficiency}/><Delta label="Régularité" value={form.consistency}/><Delta label="Événements à risque" value={form.risk} inverse/></div></section>
        </div>

        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="QUALITÉ GLOBALE" subtitle="indicateurs de maîtrise" color={GREEN}/><RatioBar label="Précision" value={pct(hits,darts)} color={GREEN}/><RatioBar label="Volées productives" value={pct(productiveVisits,visits)} color={BLUE}/><RatioBar label="Volées sans miss" value={pct(noMissVisits,visits)} color={GOLD}/><RatioBar label="Sécurité" value={pct(safeVisits || Math.max(0, visits-riskEvents),visits)} color={GREEN}/><RatioBar label="Régularité moyenne" value={avgConsistency} color={PURPLE}/></section>
          <section style={panel()}><SectionTitle title="SOLO / MULTI / ÉQUIPES" subtitle="performance selon le format" color={BLUE}/><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}><Mini label="Parties équipes" value={teamMatches.length} color={BLUE}/><Mini label="Win équipes" value={`${pct(teamWins,teamMatches.length)}%`} color={GREEN}/><Mini label="Solo / FFA" value={soloMulti.length} color={ORANGE}/><Mini label="Win solo / FFA" value={`${pct(ffaWins,soloMulti.length)}%`} color={GOLD}/></div></section>
        </div>
      </> : null}

      {tab === "performance" ? <>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 7 }}>
          <Kpi icon="↗" label="Volées productives" value={`${pct(productiveVisits,visits)}%`} sub={`${productiveVisits}/${visits}`} color={BLUE}/>
          <Kpi icon="●" label="Volées parfaites" value={perfectVisits} sub={`${pct(perfectVisits,visits)}%`} color={GREEN}/>
          <Kpi icon="✓" label="Sans miss" value={`${pct(noMissVisits,visits)}%`} sub={`${noMissVisits} volées`} color={GOLD}/>
          <Kpi icon="✦" label="Streak touches" value={longestStreak} sub={`miss max ${longestMissStreak}`} color={PURPLE}/>
          <Kpi icon="≈" label="Régularité" value={`${fmt1(avgConsistency)}%`} sub={`record ${fmt1(bestConsistency)}%`} color={GREEN}/>
          <Kpi icon="⌁" label="Touches / volée" value={visits ? (hits/visits).toFixed(2) : "0.00"} sub={`${visits} volées`} color={BLUE}/>
        </div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="QUALITÉ DES VOLÉES" subtitle="0 / 1 / 2 / 3 touches" color={GREEN}/><div style={{ height: 220, position: "relative" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={hitVisitMix} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={2}>{hitVisitMix.map((row, i) => <Cell key={i} fill={row.color}/>)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE}/></PieChart></ResponsiveContainer><div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}><div style={{ textAlign: "center" }}><strong style={{ color: GREEN, fontSize: 23 }}>{pct(hits,darts)}%</strong><div style={{ color: SOFT, fontSize: 7 }}>PRÉCISION</div></div></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", color: SOFT, fontSize: 7 }}>{hitVisitMix.map((row) => <span key={row.name}><b style={{ color: row.color }}>●</b> {row.name} {row.value}</span>)}</div></section>
          <section style={panel()}><SectionTitle title="POSITION DANS LA VOLÉE" subtitle="précision dart 1 / 2 / 3 / dernière" color={BLUE}/><div style={{ marginTop: 9 }}><RatioBar label="1re dart" value={pct(firstHits,firstDarts)} color={ORANGE} note={`${firstHits}/${firstDarts}`}/><RatioBar label="2e dart" value={pct(secondHits,secondDarts)} color={BLUE} note={`${secondHits}/${secondDarts}`}/><RatioBar label="3e dart" value={pct(thirdHits,thirdDarts)} color={PURPLE} note={`${thirdHits}/${thirdDarts}`}/><RatioBar label="Dernière dart" value={pct(lastHits,lastDarts)} color={GOLD} note={`${lastHits}/${lastDarts}`}/></div></section>
        </div>
        <section style={{ ...panel(), marginTop: 7 }}><SectionTitle title="RENDEMENT DES 24 DERNIÈRES PARTIES" subtitle="score par dart et taux de volées productives" color={ORANGE}/><div style={{ height: 190, marginTop: 5 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="cargoPerfV4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ORANGE} stopOpacity={.42}/><stop offset="1" stopColor={ORANGE} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false}/><XAxis dataKey="index" tick={{ fill: SOFT, fontSize: 7 }}/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Area type="monotone" dataKey="efficiency" stroke={ORANGE} fill="url(#cargoPerfV4)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></section>
      </> : null}

      {tab === "darts" ? <>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 7 }}>
          <Kpi icon="S" label="Simples" value={singles} sub={`${pct(singles,hits)}% touches`} color={ORANGE}/><Kpi icon="D" label="Doubles" value={doubles} sub={`${pct(doubles,hits)}% touches`} color={BLUE}/><Kpi icon="T" label="Triples" value={triples} sub={`${pct(triples,hits)}% touches`} color={PURPLE}/><Kpi icon="◎" label="Bull / DBull" value={bulls+dbulls} sub={`${pct(bulls+dbulls,hits)}% touches`} color={GOLD}/><Kpi icon="×" label="MISS" value={misses} sub={`${pct(misses,darts)}%`} color={RED}/><Kpi icon="⚡" label="Puissance moy." value={hits ? (weightedPower/hits).toFixed(2) : "0.00"} sub={`T+DB ${pct(triples+dbulls,hits)}%`} color={PURPLE}/>
        </div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="RÉPARTITION DES IMPACTS" subtitle={`${darts} fléchettes`} color={BLUE}/><div style={{ height: 225, position: "relative" }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dartMix} dataKey="value" nameKey="name" innerRadius="53%" outerRadius="79%" paddingAngle={2}>{dartMix.map((row, i) => <Cell key={i} fill={row.color}/>)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE}/></PieChart></ResponsiveContainer><div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}><div style={{ textAlign: "center" }}><strong style={{ color: GREEN, fontSize: 23 }}>{pct(hits,darts)}%</strong><div style={{ color: SOFT, fontSize: 7 }}>TOUCHES</div></div></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", color: SOFT, fontSize: 7 }}>{dartMix.map((row) => <span key={row.name}><b style={{ color: row.color }}>●</b> {row.name} {row.value}</span>)}</div></section>
          <section style={panel()}><SectionTitle title="MAÎTRISE DE LA CIBLE" subtitle="couverture, précision et puissance" color={PURPLE}/><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}><Mini label="Numéros couverts" value={`${uniqueNumbersBest}/20`} color={GREEN}/><Mini label="Segments record" value={uniqueSegmentsBest} color={BLUE}/><Mini label="Power darts" value={`${pct(doubles+triples+dbulls,darts)}%`} color={PURPLE}/><Mini label="Bull rate" value={`${pct(bulls+dbulls,darts)}%`} color={GOLD}/><Mini label="Streak hit" value={longestStreak} color={GREEN}/><Mini label="Streak miss" value={longestMissStreak} color={RED}/></div><div style={{ marginTop: 8 }}><RatioBar label="Précision générale" value={pct(hits,darts)} color={GREEN}/><RatioBar label="Hits haute valeur (T + DBull)" value={pct(triples+dbulls,hits)} color={PURPLE}/></div></section>
        </div>
      </> : null}

      {tab === "logistics" ? <>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 7 }}>
          <Kpi icon="✓" label="Contrats" value={completedContracts} sub={`${pct(completedContracts,contractAttempts)}% réussite`} color={GREEN}/><Kpi icon="▤" label="Palettes" value={pallets} sub={`${fullPallets} complètes`} color={GOLD}/><Kpi icon="□" label="Cartons / caisses" value={`${cartons}/${crates}`} color={ORANGE}/><Kpi icon="⚠" label="Surcharges" value={overloads} sub={`${lostWeight+rejectedWeight} kg pertes`} color={RED}/><Kpi icon="★" label="Charges parfaites" value={perfectLoads} color={GOLD}/><Kpi icon="⌂" label="Livraisons colis" value={deliveries} sub={`+${bonuses} bonus`} color={BLUE}/>
        </div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="SÉCURITÉ LOGISTIQUE" subtitle="charge conservée et volées sans incident" color={GREEN}/><RatioBar label="Rétention du poids" value={pct(weight,handledWeight)} color={GREEN} note={`${Math.round(weight)}/${Math.round(handledWeight)} kg`}/><RatioBar label="Volées sûres" value={pct(safeVisits || Math.max(0, visits-riskEvents),visits)} color={BLUE}/><RatioBar label="Fragile réussi" value={pct(fragileCompleted,fragileAttempts)} color={GOLD} note={`${fragileCompleted}/${fragileAttempts}`}/><RatioBar label="Contrats réussis" value={pct(completedContracts,contractAttempts)} color={ORANGE}/></section>
          <section style={panel()}><SectionTitle title="CYCLE DES SÉRIES" subtitle="démarrées, sécurisées, perdues" color={PURPLE}/><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><Mini label="Démarrées" value={seriesStarts} color={ORANGE}/><Mini label="Sécurisées" value={seriesSecured} color={GREEN}/><Mini label="Perdues" value={seriesLost} color={RED}/></div><div style={{ marginTop: 7 }}><RatioBar label="Conversion / sécurisation" value={pct(seriesSecured+completedContracts+pallets+deliveries,seriesStarts)} color={GREEN}/><RatioBar label="Pertes de série" value={pct(seriesLost,seriesStarts)} color={RED}/></div></section>
        </div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="FLUX DE CHARGEMENT" subtitle="24 dernières missions · conservé / perdu / refusé" color={ORANGE}/><div style={{ height: 210, marginTop: 6 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={logisticsTrend}><CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false}/><XAxis dataKey="index" tick={{ fill: SOFT, fontSize: 7 }}/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Bar dataKey="retained" stackId="weight" fill={GREEN} radius={[2,2,0,0]}/><Bar dataKey="lost" stackId="weight" fill={RED}/><Bar dataKey="rejected" stackId="weight" fill={GOLD} radius={[0,0,2,2]}/></BarChart></ResponsiveContainer></div><div style={{ display: "flex", gap: 10, justifyContent: "center", color: SOFT, fontSize: 7, flexWrap: "wrap" }}><span><b style={{ color: GREEN }}>■</b> conservé</span><span><b style={{ color: RED }}>■</b> perdu</span><span><b style={{ color: GOLD }}>■</b> refusé</span></div></section>
          <section style={panel()}><SectionTitle title="CONTRATS & RISQUES" subtitle="24 dernières missions · contrats, palettes, événements à risque" color={BLUE}/><div style={{ height: 210, marginTop: 6 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={logisticsTrend}><CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false}/><XAxis dataKey="index" tick={{ fill: SOFT, fontSize: 7 }}/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Line type="monotone" dataKey="contracts" stroke={GREEN} dot={false} strokeWidth={2}/><Line type="monotone" dataKey="pallets" stroke={GOLD} dot={false} strokeWidth={2}/><Line type="monotone" dataKey="risk" stroke={RED} dot={false} strokeWidth={1.7}/></LineChart></ResponsiveContainer></div><div style={{ display: "flex", gap: 10, justifyContent: "center", color: SOFT, fontSize: 7, flexWrap: "wrap" }}><span><b style={{ color: GREEN }}>●</b> contrats</span><span><b style={{ color: GOLD }}>●</b> palettes</span><span><b style={{ color: RED }}>●</b> risque</span></div></section>
        </div>
        <section style={{ ...panel(), marginTop: 7 }}><SectionTitle title="VARIANTES CARGO" subtitle="volume, victoire, précision, rendement et régularité" color={BLUE}/><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{variantRows.map((row: any, index: number) => <div key={row.variant} style={{ display: "grid", gridTemplateColumns: "minmax(105px,1.5fr) repeat(5,minmax(0,1fr))", gap: 5, alignItems: "center", padding: 8, borderRadius: 12, background: `${COLORS[index%COLORS.length]}09`, border: `1px solid ${COLORS[index%COLORS.length]}2a`, textAlign: "center" }}><div style={{ textAlign: "left", color: COLORS[index%COLORS.length], fontSize: 8.3, fontWeight: 1050, overflow: "hidden", textOverflow: "ellipsis" }}>{cargoVariantLabel(row.variant)}</div><SmallCell label="MATCHS" value={row.games}/><SmallCell label="WIN" value={`${row.winRate}%`}/><SmallCell label="PRÉC." value={`${row.accuracy}%`}/><SmallCell label={row.variant === "parcel_delivery" ? "COLIS/M" : "KG/M"} value={Math.round(row.avgScore)}/><SmallCell label="R/D" value={row.avgScorePerDart ? row.avgScorePerDart.toFixed(2) : "—"}/></div>)}</div></section>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 7 }}><Kpi icon="◆" label="Fragiles OK" value={fragileCompleted} sub={`${fragileBroken} cassés`} color={GREEN}/><Kpi icon="⚡" label="Urgents" value={urgentCompleted} color={GOLD}/><Kpi icon="⚠" label="Risque / volée" value={visits ? (riskEvents/visits).toFixed(2) : "0.00"} sub={`${riskEvents} événements`} color={RED}/><Kpi icon="✓" label="Sécurité" value={`${pct(safeVisits || Math.max(0, visits-riskEvents),visits)}%`} color={GREEN}/></div>
      </> : null}

      {tab === "teams" ? <>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 7 }}>
          <Kpi icon="👥" label="Matchs équipes" value={teamMatches.length} sub={`${teamWins} victoire${teamWins > 1 ? "s" : ""}`} color={BLUE}/>
          <Kpi icon="🏆" label="Win équipes" value={`${pct(teamWins,teamMatches.length)}%`} sub={`${teamWins}/${teamMatches.length}`} color={GREEN}/>
          <Kpi icon="🤝" label="Coéquipiers" value={peerRows.filter((row: any) => row.together > 0).length} sub={topTeammate ? `+ joué avec ${topTeammate.name}` : "aucun partenaire"} color={GOLD}/>
          <Kpi icon="⚔" label="Adversaires" value={peerRows.filter((row: any) => row.against > 0).length} sub={topRival ? `${topRival.name} · ${topRival.against} duels` : "aucun rival"} color={PURPLE}/>
          <Kpi icon="▦" label="Équipes utilisées" value={teamRowsAgg.length} sub={teamRowsAgg[0]?.name || "—"} color={ORANGE}/>
          <Kpi icon="◎" label="Précision équipe" value={`${teamMatches.length ? fmt1(mean(teamRowsAgg.map((row: any) => row.accuracy).filter((v: number) => v > 0))) : "0.0"}%`} color={GREEN}/>
        </div>

        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="COMPARAISON PAR FORMAT" subtitle="solo, multi et équipes" color={BLUE}/><div style={{ height: 220, marginTop: 6 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={formatRows}><CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false}/><XAxis dataKey="label" tick={{ fill: SOFT, fontSize: 7 }}/><YAxis hide/><Tooltip contentStyle={TOOLTIP_STYLE}/><Bar dataKey="winRate" fill={GREEN} radius={[5,5,0,0]}/><Bar dataKey="accuracy" fill={BLUE} radius={[5,5,0,0]}/><Bar dataKey="safeRate" fill={GOLD} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><div style={{ display: "flex", gap: 10, justifyContent: "center", color: SOFT, fontSize: 7, flexWrap: "wrap" }}><span><b style={{ color: GREEN }}>■</b> win</span><span><b style={{ color: BLUE }}>■</b> précision</span><span><b style={{ color: GOLD }}>■</b> sécurité</span></div></section>
          <section style={panel()}><SectionTitle title="MES ÉQUIPES" subtitle="performance consolidée des équipes utilisées" color={GOLD}/>{teamRowsAgg.length ? <div style={{ marginTop: 8, display: "grid", gap: 6 }}>{teamRowsAgg.slice(0,8).map((row: any, index: number) => <div key={row.name} style={{ display: "grid", gridTemplateColumns: "minmax(100px,1.5fr) repeat(4,minmax(0,1fr))", gap: 5, alignItems: "center", padding: 8, borderRadius: 12, background: `${COLORS[index%COLORS.length]}09`, border: `1px solid ${COLORS[index%COLORS.length]}28`, textAlign: "center" }}><div style={{ textAlign: "left", color: COLORS[index%COLORS.length], fontSize: 8.3, fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div><SmallCell label="MATCHS" value={row.games}/><SmallCell label="WIN" value={`${row.winRate}%`}/><SmallCell label="PRÉC." value={`${row.accuracy}%`}/><SmallCell label="CONTRATS" value={row.contracts}/></div>)}</div> : <div style={{ marginTop: 12, color: SOFT, fontSize: 9 }}>Aucune partie en équipe sur cette période.</div>}</section>
        </div>

        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 7 }}>
          <section style={panel()}><SectionTitle title="COÉQUIPIERS" subtitle="fréquence de jeu et performance observée" color={GREEN}/><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{peerRows.filter((row: any) => row.together > 0).slice(0,10).map((row: any, index: number) => <PeerRow key={row.id} row={row} relation="ensemble" color={COLORS[index%COLORS.length]}/>)}</div>{!peerRows.some((row: any) => row.together > 0) ? <div style={{ marginTop: 10, color: SOFT, fontSize: 9 }}>Pas encore de coéquipier enregistré.</div> : null}</section>
          <section style={panel()}><SectionTitle title="RIVAUX" subtitle="adversaires les plus rencontrés" color={PURPLE}/><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{peerRows.filter((row: any) => row.against > 0).slice(0,10).map((row: any, index: number) => <PeerRow key={row.id} row={row} relation="contre" color={COLORS[(index+2)%COLORS.length]}/>)}</div>{!peerRows.some((row: any) => row.against > 0) ? <div style={{ marginTop: 10, color: SOFT, fontSize: 9 }}>Pas encore d’adversaire consolidé.</div> : null}</section>
        </div>
      </> : null}

      {tab === "records" ? <>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 7 }}>
          <RecordCard label="Poids / match" value={`${scoreRecordValue(recordsList.cargoScore)} kg`} date={recordDate(recordsList.cargoScore)} color={ORANGE}/>
          <RecordCard label="Colis / match" value={`${scoreRecordValue(recordsList.parcelScore)} colis`} date={recordDate(recordsList.parcelScore)} color={BLUE}/>
          <RecordCard label="Précision match" value={`${recordsList.acc ? (metric(recordsList.acc.row,"accuracy") || pct(metric(recordsList.acc.row,"hits"),metric(recordsList.acc.row,"darts","dartsThrown"))) : 0}%`} date={recordDate(recordsList.acc)} color={GREEN}/>
          <RecordCard label="Best volée" value={recordsList.bestV ? metric(recordsList.bestV.row,"bestVisitScore") : 0} date={recordDate(recordsList.bestV)} color={GOLD}/>
          <RecordCard label="Best tour" value={recordsList.bestR ? metric(recordsList.bestR.row,"bestRoundScore") : 0} date={recordDate(recordsList.bestR)} color={ORANGE}/>
          <RecordCard label="Streak touches" value={recordsList.streak ? metric(recordsList.streak.row,"longestHitStreak") : 0} date={recordDate(recordsList.streak)} color={PURPLE}/>
          <RecordCard label="Régularité" value={`${recordsList.consistency ? metric(recordsList.consistency.row,"consistency") : 0}%`} date={recordDate(recordsList.consistency)} color={GREEN}/>
          <RecordCard label="Contrats" value={`${recordsList.contract ? metric(recordsList.contract.row,"contractCompletionRate") : 0}%`} date={recordDate(recordsList.contract)} color={GOLD}/>
          <RecordCard label="Rétention" value={`${recordsList.retention ? metric(recordsList.retention.row,"retentionRate") : 0}%`} date={recordDate(recordsList.retention)} color={BLUE}/>
          <RecordCard label="P90 volée" value={recordsList.p90 ? metric(recordsList.p90.row,"p90VisitScore") : 0} date={recordDate(recordsList.p90)} color={PURPLE}/>
          <RecordCard label="1re dart" value={`${recordsList.first ? (metric(recordsList.first.row,"firstDartAccuracy") || pct(metric(recordsList.first.row,"firstDartHits"),metric(recordsList.first.row,"firstDarts"))) : 0}%`} date={recordDate(recordsList.first)} color={ORANGE}/>
          <RecordCard label="Dernière dart" value={`${recordsList.last ? (metric(recordsList.last.row,"lastDartAccuracy") || pct(metric(recordsList.last.row,"lastDartHits"),metric(recordsList.last.row,"lastDarts"))) : 0}%`} date={recordDate(recordsList.last)} color={GOLD}/>
          <RecordCard label="Palettes / match" value={recordsList.palletsRecord ? metric(recordsList.palletsRecord.row,"pallets") : 0} date={recordDate(recordsList.palletsRecord)} color={GOLD}/>
          <RecordCard label="Contrats / match" value={recordsList.contractsRecord ? metric(recordsList.contractsRecord.row,"completedContracts") : 0} date={recordDate(recordsList.contractsRecord)} color={GREEN}/>
          <RecordCard label="Volées sans miss" value={`${recordsList.noMiss ? (metric(recordsList.noMiss.row,"noMissVisitRate") || pct(metric(recordsList.noMiss.row,"noMissVisits"),metric(recordsList.noMiss.row,"visits"))) : 0}%`} date={recordDate(recordsList.noMiss)} color={BLUE}/>
          <RecordCard label="Volées parfaites" value={`${recordsList.perfect ? (metric(recordsList.perfect.row,"perfectAccuracyVisitRate") || pct(metric(recordsList.perfect.row,"perfectAccuracyVisits"),metric(recordsList.perfect.row,"visits"))) : 0}%`} date={recordDate(recordsList.perfect)} color={GREEN}/>
          <RecordCard label="Sécurité match" value={`${recordsList.safety ? (metric(recordsList.safety.row,"safeVisitRate") || metric(recordsList.safety.row,"retentionRate")) : 0}%`} date={recordDate(recordsList.safety)} color={GOLD}/>
          <RecordCard label="Couverture numéros" value={`${recordsList.uniqueNumbers ? metric(recordsList.uniqueNumbers.row,"uniqueNumbersHit") : 0}/20`} date={recordDate(recordsList.uniqueNumbers)} color={ORANGE}/>
          <RecordCard label="Segments uniques" value={recordsList.uniqueSegments ? metric(recordsList.uniqueSegments.row,"uniqueSegmentsHit") : 0} date={recordDate(recordsList.uniqueSegments)} color={BLUE}/>
          <RecordCard label="Rendement / dart" value={recordsList.efficiency ? metric(recordsList.efficiency.row,"scorePerDart") : 0} date={recordDate(recordsList.efficiency)} color={ORANGE}/>
          <RecordCard label="Hits haute valeur" value={`${recordsList.power ? (metric(recordsList.power.row,"highValueHitRate") || pct(metric(recordsList.power.row,"triples")+metric(recordsList.power.row,"dbulls"),metric(recordsList.power.row,"hits"))) : 0}%`} date={recordDate(recordsList.power)} color={PURPLE}/>
          <RecordCard label="Bull rate" value={`${recordsList.bullRateRecord ? (metric(recordsList.bullRateRecord.row,"bullRate") || pct(metric(recordsList.bullRateRecord.row,"bulls")+metric(recordsList.bullRateRecord.row,"dbulls"),metric(recordsList.bullRateRecord.row,"darts","dartsThrown"))) : 0}%`} date={recordDate(recordsList.bullRateRecord)} color={GOLD}/>
          <RecordCard label="Risque minimum" value={`${recordsList.riskMin ? metric(recordsList.riskMin.row,"riskEventRate") : 0}%`} date={recordDate(recordsList.riskMin)} color={GREEN}/>
        </div>
        <section style={{ ...panel(), marginTop: 7 }}><SectionTitle title="DERNIÈRES MISSIONS" subtitle="résultat détaillé, format, précision, rendement et sécurité" color={ORANGE}/><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{matches.slice(0, 18).map(({ record, row }: any, index: number) => <MatchRow key={record?.id || index} record={record} row={row} playerId={playerId}/>)}</div></section>
      </> : null}
    </>}
  </div>;
}

function SmallCell({ label, value }: any) { return <div style={{ minWidth: 0 }}><b style={{ color: "#fff", fontSize: 8.2 }}>{value}</b><small style={{ display: "block", color: SOFT, fontSize: 5.8 }}>{label}</small></div>; }
function PeerRow({ row, relation, color = BLUE }: any) {
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) repeat(4,minmax(0,1fr))", gap: 5, alignItems: "center", padding: 8, borderRadius: 12, background: `${color}08`, border: `1px solid ${color}26`, textAlign: "center" }}>
    <div style={{ minWidth: 0, textAlign: "left" }}><div style={{ color, fontSize: 8.5, fontWeight: 1050, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div><div style={{ color: SOFT, fontSize: 6.5 }}>{relation}</div></div>
    <SmallCell label="MATCHS" value={relation === "ensemble" ? row.together : row.against}/><SmallCell label="WIN" value={`${row.winRate}%`}/><SmallCell label="PRÉC." value={`${row.accuracy}%`}/><SmallCell label="PODIUMS" value={row.podiums}/>
  </div>;
}
function MatchRow({ record, row, playerId }: any) {
  const variant = variantOf(record), parcel = variant === "parcel_delivery", won = didWin(record,row,String(playerId));
  const rowDarts = metric(row,"darts","dartsThrown"), rowHits = metric(row,"hits"), score = parcel ? metric(row,"parcelsDelivered") : metric(row,"totalWeight");
  const accuracy = metric(row,"accuracy") || pct(rowHits,rowDarts), efficiency = metric(row,"scorePerDart") || (rowDarts ? score/rowDarts : 0), safety = metric(row,"safeVisitRate") || metric(row,"retentionRate");
  return <div style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: won ? `${GREEN}09` : "rgba(255,255,255,.027)", border: `1px solid ${won ? GREEN : "rgba(255,255,255,.075)"}35` }}><div style={{ width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center", background: won ? `${GREEN}18` : "rgba(255,255,255,.055)", color: won ? GREEN : SOFT, fontSize: 8.2, fontWeight: 1100 }}>{won ? "WIN" : `#${n(row?.rank || row?.teamRank) || "—"}`}</div><div style={{ minWidth: 0 }}><div style={{ color: "#fff", fontSize: 8.8, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmtDate(playedAt(record))} · {cargoVariantLabel(variant)} · {participantMode(record) === "teams" ? "ÉQUIPES" : "JOUEURS"}</div><div style={{ color: SOFT, fontSize: 7.3, marginTop: 2 }}>{accuracy}% préc. · {efficiency.toFixed(2)}/dart · {metric(row,"bestVisitScore")} best · {metric(row,"longestHitStreak")} streak · {safety ? `${fmt1(safety)}% sûr` : "—"}</div></div><div style={{ textAlign: "right" }}><div style={{ color: parcel ? BLUE : ORANGE, fontSize: 16, fontWeight: 1150 }}>{score}</div><div style={{ color: SOFT, fontSize: 6.5 }}>{parcel ? "COLIS" : "KG"}</div></div></div>;
}
