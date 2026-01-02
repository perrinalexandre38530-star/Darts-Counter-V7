// ============================================================
// src/components/stats/X01MultiStatsTabFull.tsx
// FULL X01 MULTI stats tab (mode "diamant" comme Training X01)
// - KPIs X01 multi (cumul / moyennes / records / %)
// - Stats détaillées (période) façon TrainingX01
// - Stats matchs (tous modes) : sessions / winrate / X01 / Cricket / Team
// - Sparkline multi-métriques (avg3 / BV / CO / %Hits / %S/D/T)
// - Radar précision (BV / BCO / AVG)
// - Hits par segment (S / D / T / MISS)
// - Historique détaillé des matchs X01 + modal
// ============================================================

import React from "react";
import SparklinePro from "../SparklinePro";
import TrainingRadar from "../TrainingRadar";
import { GoldPill } from "../StatsPlayerDashboard";
import type { SavedMatch } from "../../lib/history";
import type { Dart as UIDart } from "../../lib/types";
import X01MultiStatsMatchModal, {
  type X01MatchModalItem,
} from "./x01multi/X01MultiStatsMatchModal";

// ---------- Thème local ----------
const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
};

const goldNeon: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#F6C256",
  textShadow: "0 0 8px rgba(246,194,86,.9), 0 0 16px rgba(246,194,86,.45)",
  letterSpacing: 0.8,
};

const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

// ---------- Types / helpers ----------

type TimeRange = "all" | "day" | "week" | "month" | "year";

type X01MatchExtract = {
  id: string;
  t: number;
  date: number;
  avg3: number;
  bv: number;
  bco: number;
  result: "W" | "L" | "?";
  darts: UIDart[];
  rec: SavedMatch;
};

// Normalisation d’un dart X01 multi
function normalizeDart(raw: any): UIDart | null {
  if (!raw) return null;

  const v =
    raw.v ??
    raw.value ??
    raw.segment ??
    raw.number ??
    raw.score ??
    raw.s ??
    0;

  const multRaw =
    raw.mult ??
    raw.multiplier ??
    raw.m ??
    (raw.type === "S"
      ? 1
      : raw.type === "D"
      ? 2
      : raw.type === "T"
      ? 3
      : 0);

  const vNum = Number(v) || 0;
  let mNum = Number(multRaw) || 0;

  if (raw.type === "S") mNum = 1;
  else if (raw.type === "D") mNum = 2;
  else if (raw.type === "T") mNum = 3;

  if (!Number.isFinite(vNum)) return null;
  if (!Number.isFinite(mNum)) mNum = 0;

  return { v: vNum, mult: mNum as 0 | 1 | 2 | 3 };
}

// Format date courte
function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return "";
  const n = typeof ts === "string" ? Number(ts) : ts;
  try {
    return new Date(n).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function toMs(n: any): number {
  const x = typeof n === "string" ? Number(n) : Number(n);
  if (!Number.isFinite(x) || x <= 0) return 0;
  // si timestamp en secondes -> convert ms
  return x < 1e12 ? Math.floor(x * 1000) : Math.floor(x);
}

function getMatchPlayedAt(rec: any): number {
  // ✅ priorité aux dates "de jeu" si elles existent
  const candidates = [
    rec?.playedAt,
    rec?.endedAt,
    rec?.finishedAt,
    rec?.startedAt,
    rec?.date,
    rec?.ts,

    rec?.payload?.playedAt,
    rec?.payload?.endedAt,
    rec?.payload?.finishedAt,
    rec?.payload?.startedAt,
    rec?.payload?.date,
    rec?.payload?.ts,

    rec?.engineState?.playedAt,
    rec?.engineState?.endedAt,
    rec?.engineState?.finishedAt,
    rec?.engineState?.startedAt,

    rec?.payload?.summary?.endedAt,
    rec?.payload?.summary?.startedAt,

    // ⚠️ on garde updatedAt/createdAt EN DERNIER recours
    rec?.createdAt,
    rec?.updatedAt,
  ];

  for (const c of candidates) {
    const ms = toMs(c);
    if (ms) return ms;
  }
  return 0;
}

function sameId(a: any, b: any) {
  return String(a ?? "") === String(b ?? "");
}

function getStableMatchKey(rec: any): string {
  // ✅ si ton engine a déjà un id de match “global”, on le prend
  const direct =
    rec?.matchId ??
    rec?.payload?.matchId ??
    rec?.engineState?.matchId ??
    rec?.payload?.engineState?.matchId;

  if (direct) return String(direct);

  // ✅ sinon, on construit une signature stable
  const kind = String(rec?.game ?? rec?.kind ?? "").toLowerCase();

  // ⚠️ on privilégie une date “de jeu” (pas updatedAt)
  const t =
    toMs(
      rec?.playedAt ??
        rec?.endedAt ??
        rec?.finishedAt ??
        rec?.startedAt ??
        rec?.date ??
        rec?.ts ??
        rec?.payload?.playedAt ??
        rec?.payload?.endedAt ??
        rec?.payload?.finishedAt ??
        rec?.payload?.startedAt ??
        rec?.payload?.date ??
        rec?.payload?.ts
    ) || 0;

  const players = Array.isArray(rec?.players) ? rec.players : [];
  const ids = players
    .map((p: any) => String(p?.id ?? ""))
    .filter(Boolean)
    .sort()
    .join(",");

  // ✅ bucket minute -> évite micro-variations
  const bucket = t ? Math.floor(t / 60000) : 0;

  return `${kind}|${bucket}|${ids}`;
}


function rangeStartMs(range: TimeRange, nowMs: number): number {
  const now = new Date(nowMs);

  if (range === "all") return 0;

  if (range === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  if (range === "week") {
    const d = new Date(now);
    // semaine glissante 7 jours (simple et efficace)
    d.setDate(d.getDate() - 7);
    return d.getTime();
  }

  if (range === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // year
  const d = new Date(now.getFullYear(), 0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Extraction stats X01 pour un joueur dans un match
function extractX01PlayerStats(rec: SavedMatch, playerId: string) {
  const anyRec: any = rec;
  const ss: any =
    rec.summary ??
    rec.payload?.summary ??
    anyRec.engineState?.summary ??
    {};

  const per: any[] =
    ss.perPlayer ??
    ss.players ??
    rec.payload?.summary?.perPlayer ??
    anyRec.engineState?.summary?.perPlayer ??
    [];

  let avg3 = 0;
  let bestVisit = 0;
  let bestCheckout = 0;

  const mapAvg3 =
    ss.avg3ByPlayer ??
    anyRec.engineState?.summary?.avg3ByPlayer ??
    rec.payload?.summary?.avg3ByPlayer ??
    null;

  const mapBestVisit =
    ss.bestVisitByPlayer ??
    anyRec.engineState?.summary?.bestVisitByPlayer ??
    rec.payload?.summary?.bestVisitByPlayer ??
    null;

  const mapBestCheckout =
    ss.bestCheckoutByPlayer ??
    anyRec.engineState?.summary?.bestCheckoutByPlayer ??
    rec.payload?.summary?.bestCheckoutByPlayer ??
    null;

  if (mapAvg3 && mapAvg3[playerId] != null)
    avg3 = Number(mapAvg3[playerId]) || 0;
  if (mapBestVisit && mapBestVisit[playerId] != null)
    bestVisit = Math.max(bestVisit, Number(mapBestVisit[playerId]) || 0);
  if (mapBestCheckout && mapBestCheckout[playerId] != null)
    bestCheckout = Math.max(
      bestCheckout,
      Number(mapBestCheckout[playerId]) || 0
    );

  const pstat =
    per.find((x: any) => x?.playerId === playerId) ??
    ss[playerId] ??
    ss.players?.[playerId] ??
    ss.perPlayer?.[playerId] ??
    {};

  const fallbackAvg =
    Number(pstat.avg3) ||
    Number(pstat.avg_3) ||
    Number(pstat.avg3Darts) ||
    Number(pstat.average3);
  if (!avg3 && fallbackAvg) avg3 = fallbackAvg;

  bestVisit = Math.max(
    bestVisit,
    Number(pstat.bestVisit) || 0,
    Number(pstat.best_visit) || 0
  );
  bestCheckout = Math.max(
    bestCheckout,
    Number(pstat.bestCheckout) || 0,
    Number(pstat.best_co) || 0,
    Number(pstat.bestFinish) || 0
  );

  return { avg3, bestVisit, bestCheckout };
}

type Props = {
  records: SavedMatch[];
  playerId: string;
};

export default function X01MultiStatsTabFull({ records, playerId }: Props) {
  const [range, setRange] = React.useState<TimeRange>("all");

// ============================================================
// 1) FILTRE & EXTRACTION DES MATCHS X01 MULTI  ✅ (1 match = 1 entrée)
// - Fix doublons : 1 entrée par match (matchId/resumeId sinon signature stable)
// - Fix stats fausses : lit EN PRIORITÉ summary.players / avg3ByPlayer / bestVisitByPlayer / bestCheckoutByPlayer
// - Fix hits/% : reconstruit une liste de "darts" à partir des détails (S/D/T/MISS) si pas de darts filtrables
// ============================================================

const filteredMatches: X01MatchExtract[] = React.useMemo(() => {
  const now = Date.now();
  const out: X01MatchExtract[] = [];
  const start = rangeStartMs(range, now);

  const isFinished = (status: any) => {
    const s = String(status || "").toLowerCase();
    return (
      s === "finished" ||
      s === "done" ||
      s === "complete" ||
      s === "match_end" ||
      s === "end"
    );
  };

  const getStartScore = (rec: any) => {
    const v =
      rec?.summary?.game?.startScore ??
      rec?.game?.startScore ??
      rec?.payload?.summary?.game?.startScore ??
      rec?.payload?.game?.startScore ??
      rec?.payload?.config?.startScore ??
      rec?.payload?.config?.start ??
      rec?.payload?.x01Config?.startScore ??
      null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const getPlayersIdsSorted = (rec: any) => {
    const players = Array.isArray(rec?.players) ? rec.players : [];
    const ids = players
      .map((p: any) => String(p?.id ?? ""))
      .filter(Boolean)
      .sort();
    return ids;
  };

  const getMatchId = (rec: any) =>
    rec?.matchId ??
    rec?.payload?.matchId ??
    rec?.engineState?.matchId ??
    rec?.payload?.engineState?.matchId ??
    rec?.resumeId ??
    rec?.payload?.resumeId ??
    rec?.summary?.matchId ??
    rec?.payload?.summary?.matchId ??
    null;

  const getStableKey = (rec: any, t: number) => {
    const mid = getMatchId(rec);
    if (mid) return `mid:${String(mid)}`;

    const kind = String(rec?.game ?? rec?.kind ?? "").toLowerCase();
    const startScore = getStartScore(rec);
    const ids = getPlayersIdsSorted(rec).join("|");

    // bucket 2 minutes = robuste (évite micro écarts)
    const bucket = t ? Math.floor(t / 120000) : 0;

    // si aucun playerIds (rare), fallback sur id + bucket
    const rid = String(rec?.id ?? "");
    return `sig:${kind}|ss:${startScore ?? ""}|p:${ids || rid}|b:${bucket}`;
  };

  const hasPlayer = (rec: any, pid: any) => {
    if (!pid) return false;

    const pKey = String(pid);

    // ✅ V3 : summary.players est un objet indexé par playerId
    const sp = rec?.summary?.players;
    if (sp && typeof sp === "object" && sp[pKey]) return true;

    // ✅ maps : avg3ByPlayer etc
    const map =
      rec?.summary?.avg3ByPlayer ??
      rec?.payload?.summary?.avg3ByPlayer ??
      null;
    if (map && typeof map === "object" && map[pKey] != null) return true;

    // ✅ players[]
    const players = Array.isArray(rec?.players) ? rec.players : [];
    if (players.some((p: any) => sameId(p?.id, pid))) return true;

    // ✅ payload.config.players fallback
    const cfgPlayers = Array.isArray(rec?.payload?.config?.players)
      ? rec.payload.config.players
      : [];
    if (cfgPlayers.some((p: any) => sameId(p?.id, pid))) return true;

    return false;
  };

  const buildDartsFromDetail = (detail: any): UIDart[] => {
    if (!detail || typeof detail !== "object") return [];

    const byS =
      detail?.bySegmentS ??
      detail?.segments?.S ??
      detail?.segmentsS ??
      detail?.hitsBySegmentS ??
      undefined;

    const byD =
      detail?.bySegmentD ??
      detail?.segments?.D ??
      detail?.segmentsD ??
      detail?.hitsBySegmentD ??
      undefined;

    const byT =
      detail?.bySegmentT ??
      detail?.segments?.T ??
      detail?.segmentsT ??
      detail?.hitsBySegmentT ??
      undefined;

    const miss =
      Number(
        detail?.miss ??
          detail?.misses ??
          detail?.MISS ??
          detail?.M ??
          detail?.hits?.MISS ??
          detail?.hits?.M ??
          0
      ) || 0;

    // ⚠️ Cap raisonnable (perf UI) — on veut des proportions, pas reconstruire 10k darts
    const CAP = 360;
    const cap = (n: number) => Math.min(CAP, Math.max(0, Math.round(n)));

    const keys = new Set<string>([
      ...Object.keys((byS && typeof byS === "object" ? byS : {}) || {}),
      ...Object.keys((byD && typeof byD === "object" ? byD : {}) || {}),
      ...Object.keys((byT && typeof byT === "object" ? byT : {}) || {}),
    ]);

    const tmp: UIDart[] = [];
    for (const segStr of keys) {
      const seg = Number(segStr);
      if (!Number.isFinite(seg) || seg <= 0) continue;

      const sCount = cap(Number((byS as any)?.[segStr] || 0));
      const dCount = cap(Number((byD as any)?.[segStr] || 0));
      const tCount = cap(Number((byT as any)?.[segStr] || 0));

      for (let i = 0; i < sCount; i++) tmp.push({ v: seg, mult: 1 } as UIDart);
      for (let i = 0; i < dCount; i++) tmp.push({ v: seg, mult: 2 } as UIDart);
      for (let i = 0; i < tCount; i++) tmp.push({ v: seg, mult: 3 } as UIDart);
    }

    for (let i = 0; i < cap(miss); i++) tmp.push({ v: 0, mult: 0 } as UIDart);

    return tmp;
  };

  // ✅ lit stats joueur depuis summary (V3) (plus fiable que per[] legacy)
  const readStatsForPlayer = (rec: any, pid: string) => {
    const sum = rec?.summary ?? rec?.payload?.summary ?? null;

    const avg3 =
      Number(
        sum?.players?.[pid]?.avg3 ??
          sum?.avg3ByPlayer?.[pid] ??
          sum?.perPlayer?.[pid]?.avg3 ??
          sum?.perPlayer?.find?.((x: any) => sameId(x?.playerId, pid))?.avg3 ??
          0
      ) || 0;

    const bestVisit =
      Number(
        sum?.players?.[pid]?.bestVisit ??
          sum?.bestVisitByPlayer?.[pid] ??
          sum?.perPlayer?.[pid]?.bestVisit ??
          sum?.perPlayer?.find?.((x: any) => sameId(x?.playerId, pid))?.bestVisit ??
          0
      ) || 0;

    const bestCheckout =
      Number(
        sum?.players?.[pid]?.bestCheckout ??
          sum?.bestCheckoutByPlayer?.[pid] ??
          sum?.perPlayer?.[pid]?.bestCheckout ??
          sum?.perPlayer?.find?.((x: any) => sameId(x?.playerId, pid))?.bestCheckout ??
          0
      ) || 0;

    const detail =
      sum?.detailedByPlayer?.[pid] ??
      sum?.detailsByPlayer?.[pid] ??
      sum?.detailed?.[pid] ??
      sum?.details?.[pid] ??
      null;

    return { avg3, bestVisit, bestCheckout, detail };
  };

  // ✅ on garde 1 "meilleur" record par matchKey (celui qui a le summary le plus riche)
  const bestByKey = new Map<string, any>();
  const scoreRec = (rec: any) => {
    const sum = rec?.summary ?? rec?.payload?.summary ?? null;
    let s = 0;
    if (sum?.players && typeof sum.players === "object") s += 4;
    if (sum?.avg3ByPlayer && typeof sum.avg3ByPlayer === "object") s += 2;
    if (sum?.detailedByPlayer && typeof sum.detailedByPlayer === "object") s += 2;
    if (Array.isArray(rec?.players) && rec.players.length) s += 1;
    // darts présents (même si non filtrés par joueur) = bonus léger
    const dRaw =
      rec?.payload?.darts ??
      rec?.darts ??
      rec?.allDarts ??
      rec?.payload?.allDarts ??
      rec?.engineState?.darts ??
      rec?.payload?.engineState?.darts ??
      null;
    if (Array.isArray(dRaw) && dRaw.length) s += 1;
    return s;
  };

  for (const rec0 of records) {
    const rec: any = rec0;
    if (!rec) continue;

    const kind = (rec as any).game ?? (rec as any).kind ?? "";
    if (!String(kind).toLowerCase().includes("x01")) continue;

    if (!isFinished(rec?.status)) continue;

    const t = getMatchPlayedAt(rec);
    if (!t) continue;

    if (range !== "all" && t < start) continue;

    if (!hasPlayer(rec, playerId)) continue;

    const key = getStableKey(rec, t);
    const prev = bestByKey.get(key);
    if (!prev) bestByKey.set(key, rec);
    else if (scoreRec(rec) > scoreRec(prev)) bestByKey.set(key, rec);
  }

  for (const [key, rec] of bestByKey.entries()) {
    const t = getMatchPlayedAt(rec);
    if (!t) continue;

    const pid = String(playerId);

    // ✅ stats joueur (priorité V3 summary)
    let s = readStatsForPlayer(rec, pid);

    // fallback ultime legacy si summary absent
    if (!s || (!s.avg3 && !s.bestVisit && !s.bestCheckout && !s.detail)) {
      const fb = extractX01PlayerStats(rec, pid);
      s = {
        avg3: fb?.avg3 || 0,
        bestVisit: fb?.bestVisit || 0,
        bestCheckout: fb?.bestCheckout || 0,
        detail: null,
      };
    }

    // ✅ résultat W/L
    let result: "W" | "L" | "?" = "?";
    const winner = rec?.winnerId ?? rec?.summary?.winnerId ?? rec?.payload?.summary?.winnerId ?? null;
    if (winner != null && sameId(winner, pid)) result = "W";
    else if (winner != null && !sameId(winner, pid)) result = "L";

    // ✅ darts : si une liste contient des playerId => on filtre; sinon on reconstruit via detail
    let darts: UIDart[] = [];

    const dRaw =
      rec?.payload?.dartsDetail ??
      rec?.dartsDetail ??
      rec?.payload?.darts ??
      rec?.darts ??
      rec?.allDarts ??
      rec?.payload?.allDarts ??
      rec?.engineState?.darts ??
      rec?.payload?.engineState?.darts ??
      null;

    if (Array.isArray(dRaw) && dRaw.length) {
      // si au moins une dart a un playerId, on filtre strict
      const anyHasPid = dRaw.some((d: any) => (d?.playerId ?? d?.pid ?? d?.pId ?? d?.ownerId ?? d?.profileId) != null);

      const filtered = anyHasPid
        ? dRaw.filter((d: any) => {
            const dp = d?.playerId ?? d?.pid ?? d?.pId ?? d?.ownerId ?? d?.profileId;
            return dp == null ? false : sameId(dp, pid);
          })
        : dRaw; // sinon on garde tout (fallback)

      darts = filtered
        .map((x: any) => normalizeDart(x))
        .filter((x: any) => !!x) as UIDart[];
    }

    if (!darts.length) {
      darts = buildDartsFromDetail(s.detail);
    }

    out.push({
      id: String(getMatchId(rec) ?? rec?.id ?? key),
      t,
      date: t,
      avg3: Number(s.avg3 || 0),
      bv: Number(s.bestVisit || 0),
      bco: Number(s.bestCheckout || 0),
      result,
      darts,
      rec,
    });
  }

  return out.sort((a, b) => a.t - b.t);
}, [records, playerId, range]);

const totalMatches = filteredMatches.length;
const wins = filteredMatches.filter((m) => m.result === "W").length;
const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

const avg3Global =
  totalMatches > 0
    ? filteredMatches.reduce((a, b) => a + (b.avg3 || 0), 0) / totalMatches
    : 0;

const bestVisit = filteredMatches.reduce((m, x) => (x.bv > m ? x.bv : m), 0);
const bestCo = filteredMatches.reduce((m, x) => (x.bco > m ? x.bco : m), 0);

  // ============================================================
  // 2) AGRÉGATION DARTS GLOBAL (KPIs / % / HITS SEGMENTS / RADAR)
  // ============================================================

  const dartsAll: UIDart[] = React.useMemo(() => {
    const all: UIDart[] = [];
    for (const m of filteredMatches) {
      if (Array.isArray(m.darts)) all.push(...m.darts);
    }
    return all;
  }, [filteredMatches]);

  let gS = 0,
    gD = 0,
    gT = 0,
    gMiss = 0,
    gBull = 0,
    gDBull = 0;

  for (const d of dartsAll) {
    const v = d.v || 0;
    const mult = d.mult || 0;

    if (v === 25 && mult === 1) gBull++;
    else if (v === 25 && mult === 2) gDBull++;

    if (v === 0 || mult === 0) gMiss++;
    else if (mult === 1) gS++;
    else if (mult === 2) gD++;
    else if (mult === 3) gT++;
  }

  const totalThrows = gS + gD + gT + gMiss;
  const totalHits = gS + gD + gT;

  const pctHitsGlobal =
    totalThrows > 0 ? (totalHits / totalThrows) * 100 : 0;
  const pctSGlobal =
    totalHits > 0 ? (gS / totalHits) * 100 : 0;
  const pctDGlobal =
    totalHits > 0 ? (gD / totalHits) * 100 : 0;
  const pctTGlobal =
    totalHits > 0 ? (gT / totalHits) * 100 : 0;
  const pctMissGlobal =
    totalThrows > 0 ? (gMiss / totalThrows) * 100 : 0;

  const sessionsCount = totalMatches;

  // ============================================================
  // 3) KPI CARDS (défilement comme Training X01)
  // ============================================================

  const kpiItemsCumul = [
    { label: "Matchs", value: totalMatches },
    { label: "Victoires", value: wins },
    { label: "Hits S", value: gS },
    { label: "Hits D", value: gD },
    { label: "Hits T", value: gT },
    { label: "Miss", value: gMiss },
  ];

  const kpiItemsMoy = [
    { label: "Moy.3D (globale)", value: avg3Global.toFixed(1) },
    { label: "Winrate", value: winRate.toFixed(1) + "%" },
    {
      label: "Hits / match",
      value:
        totalMatches > 0
          ? (totalHits / totalMatches).toFixed(1)
          : "0",
    },
    {
      label: "%Hits",
      value: pctHitsGlobal.toFixed(1) + "%",
    },
  ];

  const kpiItemsRecords = [
    { label: "Best Visit", value: bestVisit },
    { label: "Best Checkout", value: bestCo },
  ];

  const kpiItemsPct = [
    { label: "%S", value: pctSGlobal.toFixed(1) + "%" },
    { label: "%D", value: pctDGlobal.toFixed(1) + "%" },
    { label: "%T", value: pctTGlobal.toFixed(1) + "%" },
    { label: "%Miss", value: pctMissGlobal.toFixed(1) + "%" },
  ];

  const [kIdxCumul, setKIdxCumul] = React.useState(0);
  const [kIdxMoy, setKIdxMoy] = React.useState(0);
  const [kIdxRec, setKIdxRec] = React.useState(0);
  const [kIdxPct, setKIdxPct] = React.useState(0);

  React.useEffect(() => {
    if (!kpiItemsCumul.length) return;

    const id = window.setInterval(() => {
      setKIdxCumul((i) => (i + 1) % kpiItemsCumul.length);
      setKIdxMoy((i) => (i + 1) % kpiItemsMoy.length);
      setKIdxRec((i) => (i + 1) % kpiItemsRecords.length);
      setKIdxPct((i) => (i + 1) % kpiItemsPct.length);
    }, 2600);

    return () => window.clearInterval(id);
  }, [totalMatches, gS, gD, gT, gMiss, avg3Global, winRate]);

  const kpiBox: React.CSSProperties = {
    borderRadius: 22,
    padding: 10,
    textAlign: "center",
    background: "linear-gradient(180deg,#15171B,#101115)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 0 14px rgba(255,255,255,.12)",
    minHeight: 82,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  const kpiLabel: React.CSSProperties = {
    fontSize: 10,
    color: T.text70,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };

  const kpiValue: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    marginTop: 4,
  };

  const kpiSection = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Ligne Cumul + Moyennes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {/* Cumul */}
        <div
          style={{ ...kpiBox, borderColor: "#47B5FF", cursor: "pointer" }}
          onClick={() =>
            setKIdxCumul((i) => (i + 1) % kpiItemsCumul.length)
          }
        >
          <div style={{ ...kpiLabel, color: "#47B5FF" }}>Cumul</div>
          {kpiItemsCumul.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: T.text70 }}>
                {kpiItemsCumul[kIdxCumul].label}
              </div>
              <div style={{ ...kpiValue, color: "#47B5FF" }}>
                {kpiItemsCumul[kIdxCumul].value}
              </div>
            </div>
          )}
        </div>

        {/* Moyennes */}
        <div
          style={{ ...kpiBox, borderColor: "#FF6FB5", cursor: "pointer" }}
          onClick={() =>
            setKIdxMoy((i) => (i + 1) % kpiItemsMoy.length)
          }
        >
          <div style={{ ...kpiLabel, color: "#FF6FB5" }}>Moyennes</div>
          {kpiItemsMoy.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: T.text70 }}>
                {kpiItemsMoy[kIdxMoy].label}
              </div>
              <div style={{ ...kpiValue, color: "#FFB8DE" }}>
                {kpiItemsMoy[kIdxMoy].value}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ligne Records + Pourcentages */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {/* Records */}
        <div
          style={{ ...kpiBox, borderColor: T.gold, cursor: "pointer" }}
          onClick={() =>
            setKIdxRec((i) => (i + 1) % kpiItemsRecords.length)
          }
        >
          <div style={{ ...kpiLabel, color: T.gold }}>Records</div>
          {kpiItemsRecords.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: T.text70 }}>
                {kpiItemsRecords[kIdxRec].label}
              </div>
              <div style={{ ...kpiValue, color: T.gold }}>
                {kpiItemsRecords[kIdxRec].value}
              </div>
            </div>
          )}
        </div>

        {/* % */}
        <div
          style={{ ...kpiBox, borderColor: "#7CFF9A", cursor: "pointer" }}
          onClick={() =>
            setKIdxPct((i) => (i + 1) % kpiItemsPct.length)
          }
        >
          <div style={{ ...kpiLabel, color: "#7CFF9A" }}>
            Pourcentages
          </div>
          {kpiItemsPct.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: T.text70 }}>
                {kpiItemsPct[kIdxPct].label}
              </div>
              <div style={{ ...kpiValue, color: "#E5FFEF" }}>
                {kpiItemsPct[kIdxPct].value}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // 4) STATS DÉTAILLÉES (PÉRIODE) — clone TrainingX01
  // ============================================================

  const pct = (value: number) =>
    totalThrows > 0 ? ((value / totalThrows) * 100).toFixed(1) + "%" : "0.0%";

  const moy1D = avg3Global / 3; // approx. comme Training
  const bestMoyS = avg3Global; // placeholder (à affiner si besoin)

  const favS = gS;
  const favD = gD;
  const favT = gT;

  const statsDetailBlock = (
    <div
      style={{
        ...card,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Titre + "Session" en haut comme TrainingX01 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            ...goldNeon,
            fontSize: 13,
            letterSpacing: 0.7,
          }}
        >
          STATS DÉTAILLÉES (PÉRIODE)
        </div>
        <div
          style={{
            borderRadius: 999,
            padding: "3px 10px",
            background:
              "linear-gradient(90deg,#F6C256,#FFDF9A)",
            color: "#1A1307",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          Session {sessionsCount || 0}
        </div>
      </div>

      {/* Tableau principal */}
      <div
        style={{
          marginTop: 4,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.12)",
          padding: "8px 10px 10px",
          background:
            "linear-gradient(180deg,#15171B,#0F1013)",
          fontSize: 11,
        }}
      >
        {/* En-tête */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr",
            color: T.text70,
            marginBottom: 4,
          }}
        >
          <span />
          <span style={{ textAlign: "right" }}>Session min / max</span>
          <span style={{ textAlign: "right" }}>Total</span>
          <span style={{ textAlign: "right" }}>%</span>
        </div>

        {[
          { label: "Darts", value: totalThrows },
          { label: "Hits", value: totalHits },
          { label: "Miss", value: gMiss },
          { label: "S", value: gS },
          { label: "D", value: gD },
          { label: "T", value: gT },
          { label: "Bull", value: gBull },
          { label: "DBull", value: gDBull },
          { label: "Bust", value: 0 }, // placeholder
        ].map((row, idx) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr",
              padding: "3px 0",
              borderTop:
                idx === 0
                  ? "1px solid rgba(255,255,255,.08)"
                  : "1px solid rgba(255,255,255,.04)",
              alignItems: "center",
            }}
          >
            <span>{row.label}</span>
            <span style={{ textAlign: "right" }}>
              {row.value}
            </span>
            <span style={{ textAlign: "right" }}>
              {row.value}
            </span>
            <span style={{ textAlign: "right" }}>
              {pct(row.value)}
            </span>
          </div>
        ))}

        {/* Séparateur */}
        <div
          style={{
            marginTop: 8,
            borderTop: "1px solid rgba(255,255,255,.14)",
          }}
        />

        {/* MOYENNES */}
        <div
          style={{
            marginTop: 6,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#FF90D0",
              letterSpacing: 1,
            }}
          >
            MOYENNES
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              marginTop: 4,
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ color: T.text70 }}>Moy.1D</div>
              <div
                style={{
                  color: "#FF90D0",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {moy1D.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: T.text70 }}>Moy.3D</div>
              <div
                style={{
                  color: "#FF90D0",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {avg3Global.toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ color: T.text70 }}>Best Moy./S</div>
              <div
                style={{
                  color: "#FF90D0",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {bestMoyS.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* RECORDS */}
        <div
          style={{
            marginTop: 10,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#7CFF9A",
              letterSpacing: 1,
            }}
          >
            RECORDS
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              marginTop: 4,
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ color: T.text70 }}>Best Visit</div>
              <div
                style={{
                  color: "#7CFF9A",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {bestVisit}
              </div>
            </div>
            <div>
              <div style={{ color: T.text70 }}>Best CO</div>
              <div
                style={{
                  color: "#7CFF9A",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {bestCo}
              </div>
            </div>
          </div>
        </div>

        {/* FAVORIS */}
        <div
          style={{
            marginTop: 10,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#7BB9FF",
              letterSpacing: 1,
            }}
          >
            FAVORIS
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              marginTop: 4,
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ color: T.text70 }}>S</div>
              <div
                style={{
                  color: "#7BB9FF",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {favS}
              </div>
            </div>
            <div>
              <div style={{ color: T.text70 }}>D</div>
              <div
                style={{
                  color: "#7BB9FF",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {favD}
              </div>
            </div>
            <div>
              <div style={{ color: T.text70 }}>T</div>
              <div
                style={{
                  color: "#7BB9FF",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {favT}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // 5) STATS MATCHS (tous modes) — 2ᵉ gros tableau
  // ============================================================

// Agrégat global tous matches où le joueur est présent (✅ 1 match = 1 entrée)
const allMatches = React.useMemo(() => {
  const bestByKey = new Map<string, any>();

  const isFinished = (status: any) => {
    const s = String(status || "").toLowerCase();
    return (
      s === "finished" ||
      s === "done" ||
      s === "complete" ||
      s === "match_end" ||
      s === "end"
    );
  };

  const getMatchId = (rec: any) =>
    rec?.matchId ??
    rec?.payload?.matchId ??
    rec?.engineState?.matchId ??
    rec?.payload?.engineState?.matchId ??
    rec?.resumeId ??
    rec?.payload?.resumeId ??
    rec?.summary?.matchId ??
    rec?.payload?.summary?.matchId ??
    null;

  const getStartScore = (rec: any) => {
    const v =
      rec?.summary?.game?.startScore ??
      rec?.game?.startScore ??
      rec?.payload?.summary?.game?.startScore ??
      rec?.payload?.game?.startScore ??
      rec?.payload?.config?.startScore ??
      rec?.payload?.x01Config?.startScore ??
      null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const getKey = (rec: any, t: number) => {
    const mid = getMatchId(rec);
    if (mid) return `mid:${String(mid)}`;
    const kind = String(rec?.game ?? rec?.kind ?? "").toLowerCase();
    const ss = getStartScore(rec);
    const players = Array.isArray(rec?.players) ? rec.players : [];
    const ids = players
      .map((p: any) => String(p?.id ?? ""))
      .filter(Boolean)
      .sort()
      .join("|");
    const bucket = t ? Math.floor(t / 120000) : 0;
    const rid = String(rec?.id ?? "");
    return `sig:${kind}|ss:${ss ?? ""}|p:${ids || rid}|b:${bucket}`;
  };

  const hasPlayer = (rec: any, pid: any) => {
    if (!pid) return false;
    const pKey = String(pid);

    const sp = rec?.summary?.players;
    if (sp && typeof sp === "object" && sp[pKey]) return true;

    const map =
      rec?.summary?.avg3ByPlayer ??
      rec?.payload?.summary?.avg3ByPlayer ??
      null;
    if (map && typeof map === "object" && map[pKey] != null) return true;

    const players = Array.isArray(rec?.players) ? rec.players : [];
    if (players.some((p: any) => sameId(p?.id, pid))) return true;

    return false;
  };

  const scoreRec = (rec: any) => {
    const sum = rec?.summary ?? rec?.payload?.summary ?? null;
    let s = 0;
    if (sum?.players && typeof sum.players === "object") s += 3;
    if (sum?.avg3ByPlayer && typeof sum.avg3ByPlayer === "object") s += 2;
    if (Array.isArray(rec?.players) && rec.players.length) s += 1;
    return s;
  };

  for (const rec0 of records) {
    const rec: any = rec0;
    if (!rec) continue;
    if (!isFinished(rec?.status)) continue;
    if (!hasPlayer(rec, playerId)) continue;

    const t = getMatchPlayedAt(rec);
    if (!t) continue;

    const key = getKey(rec, t);
    const prev = bestByKey.get(key);
    if (!prev) bestByKey.set(key, rec);
    else if (scoreRec(rec) > scoreRec(prev)) bestByKey.set(key, rec);
  }

  const out: X01MatchExtract[] = [];

  for (const [key, rec] of bestByKey.entries()) {
    const kind = (rec as any).game ?? (rec as any).kind ?? "";
    const s = extractX01PlayerStats(rec, String(playerId)); // ok ici: stats globales "tous modes" => fallback acceptable

    let result: "W" | "L" | "?" = "?";
    const winner = (rec as any).winnerId ?? rec?.summary?.winnerId ?? rec?.payload?.summary?.winnerId ?? null;
    if (winner != null && sameId(winner, playerId)) result = "W";
    else if (winner != null && !sameId(winner, playerId)) result = "L";

    const t = getMatchPlayedAt(rec);

    out.push({
      id: String(getMatchId(rec) ?? rec?.id ?? key),
      t,
      date: t,
      avg3: s.avg3,
      bv: s.bestVisit,
      bco: s.bestCheckout,
      result,
      darts: [],
      rec,
    });
  }

  return out;
}, [records, playerId]);

  const totalAllMatches = allMatches.length;
  const allWins = allMatches.filter((m) => m.result === "W").length;
  const allWinRate =
    totalAllMatches > 0 ? (allWins / totalAllMatches) * 100 : 0;

  let totalX01Matches = 0,
    winX01Matches = 0,
    totalCricketMatches = 0,
    winCricketMatches = 0;

  allMatches.forEach((m) => {
    const kind = (m.rec as any).game ?? (m.rec as any).kind ?? "";
    const ks = String(kind).toLowerCase();
    const isX01 =
      ks.includes("x01") ||
      ks.includes("301") ||
      ks.includes("501") ||
      ks.includes("701");
    const isCricket = ks.includes("cricket");

    if (isX01) {
      totalX01Matches++;
      if (m.result === "W") winX01Matches++;
    }
    if (isCricket) {
      totalCricketMatches++;
      if (m.result === "W") winCricketMatches++;
    }
  });

  const pctOf = (num: number, den: number) =>
    den > 0 ? ((num / den) * 100).toFixed(1) + "%" : "0.0%";

  const matchStatsBlock = (
    <div
      style={{
        ...card,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          ...goldNeon,
          fontSize: 13,
          letterSpacing: 0.7,
        }}
      >
        STATS MATCHS (TOUS MODES)
      </div>

      {/* SECTION SESSIONS : 3 colonnes */}
      <div
        style={{
          borderRadius: 16,
          padding: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg,#15171B,#0F1013)",
          fontSize: 11,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: T.text70,
            marginBottom: 4,
          }}
        >
          SESSIONS
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
          }}
        >
          <div>
            <div style={{ color: T.text70 }}>Matchs joués</div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              {totalAllMatches}
            </div>
          </div>
          <div>
            <div style={{ color: T.text70 }}>Legs joués</div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              0
            </div>
          </div>
          <div>
            <div style={{ color: T.text70 }}>Sets joués</div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              0
            </div>
          </div>
        </div>
      </div>

      {/* SECTION STATS MATCHS : 2 colonnes de lignes */}
      <div
        style={{
          borderRadius: 16,
          padding: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg,#15171B,#0F1013)",
          fontSize: 11,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: T.text70,
          }}
        >
          STATS MATCHS
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {/* Colonne 1 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <LineStat
              label="Matchs gagnés (total)"
              value={allWins}
              percent={pctOf(allWins, totalAllMatches)}
            />
            <LineStat
              label="Matchs X01 joués"
              value={totalX01Matches}
              percent={pctOf(totalX01Matches, totalAllMatches)}
            />
            <LineStat
              label="Victoires X01"
              value={winX01Matches}
              percent={pctOf(winX01Matches, totalX01Matches)}
            />
            <LineStat
              label="Legs Win X01"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Sets Win X01"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Matchs Cricket joués"
              value={totalCricketMatches}
              percent={pctOf(totalCricketMatches, totalAllMatches)}
            />
            <LineStat
              label="Victoires Cricket"
              value={winCricketMatches}
              percent={pctOf(winCricketMatches, totalCricketMatches)}
            />
            <LineStat
              label="Legs Win Cricket"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Sets Win Cricket"
              value={0}
              percent="0.0%"
            />
          </div>

          {/* Colonne 2 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <LineStat
              label="Matchs Team X01 joués"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Victoires Team X01"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Legs Win Team X01"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Sets Win Team X01"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Matchs Team Cricket joués"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Victoires Team Cricket"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Legs Win Team Cricket"
              value={0}
              percent="0.0%"
            />
            <LineStat
              label="Sets Win Team Cricket"
              value={0}
              percent="0.0%"
            />
          </div>
        </div>

        {/* MOYENNES en rose */}
        <div
          style={{
            marginTop: 8,
            borderTop: "1px solid rgba(255,255,255,.14)",
            paddingTop: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#FF90D0",
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            MOYENNES
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              marginTop: 4,
            }}
          >
            <SmallPink label="Moy. match Win" value={allWinRate.toFixed(1) + "%"} />
            <SmallPink label="Moy. leg Win" value="0.0%" />
            <SmallPink label="Moy. set Win" value="0.0%" />
          </div>
        </div>

        {/* RECORDS en vert */}
        <div
          style={{
            marginTop: 8,
            borderTop: "1px solid rgba(255,255,255,.14)",
            paddingTop: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#7CFF9A",
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            RECORDS
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              marginTop: 4,
            }}
          >
            <SmallGreen label="Grosse victoire solo / team" value="0 / 0" />
            <SmallGreen label="Grosse défaite solo / team" value="0 / 0" />
          </div>
        </div>

        {/* FAVORIS */}
        <div
          style={{
            marginTop: 8,
            borderTop: "1px solid rgba(255,255,255,.14)",
            paddingTop: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#7BB9FF",
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            FAVORIS
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              marginTop: 4,
              fontSize: 10,
            }}
          >
            <div>
              <div style={{ color: T.text70 }}>Adversaire favori</div>
              <div style={{ fontWeight: 800 }}>-</div>
            </div>
            <div>
              <div style={{ color: T.text70 }}>Pire adversaire</div>
              <div style={{ fontWeight: 800 }}>-</div>
            </div>
            <div>
              <div style={{ color: T.text70 }}>Coéquipier favori</div>
              <div style={{ fontWeight: 800 }}>-</div>
            </div>
          </div>
        </div>

        {/* MULTI / CLASSEMENTS + FINISH */}
        <div
          style={{
            marginTop: 8,
            borderTop: "1px solid rgba(255,255,255,.14)",
            paddingTop: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: T.text70,
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            MULTI / CLASSEMENTS & FINISH
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div>1er : 0  ·  2e : 0  ·  3e : 0  ·  4e : 0  ·  5e : 0  ·  6e : 0</div>
            <div>Finish (legs terminés à 0) : 0 — 0.0%</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Petits sous-composants pour alléger le JSX du bloc matchStats
  function LineStat(props: { label: string; value: number; percent: string }) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,.04)",
          paddingBottom: 2,
        }}
      >
        <span style={{ color: T.text70 }}>{props.label}</span>
        <span>
          <strong>{props.value}</strong>{" "}
          <span style={{ color: T.text70 }}>({props.percent})</span>
        </span>
      </div>
    );
  }

  function SmallPink(props: { label: string; value: string }) {
    return (
      <div>
        <div style={{ color: T.text70 }}>{props.label}</div>
        <div
          style={{
            color: "#FF90D0",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {props.value}
        </div>
      </div>
    );
  }

  function SmallGreen(props: { label: string; value: string }) {
    return (
      <div>
        <div style={{ color: T.text70 }}>{props.label}</div>
        <div
          style={{
            color: "#7CFF9A",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {props.value}
        </div>
      </div>
    );
  }

  // ============================================================
  // 6) SPARKLINE + MÉTRIQUES
  // ============================================================

  const metricList = [
    { key: "avg3", label: "Moy.3D" },
    { key: "bv", label: "Best Visit" },
    { key: "bco", label: "Checkout" },
    { key: "pctHits", label: "%Hits" },
    { key: "pctS", label: "%S" },
    { key: "pctD", label: "%D" },
    { key: "pctT", label: "%T" },
  ] as const;

  type MetricKey = (typeof metricList)[number]["key"];

  const [metric, setMetric] = React.useState<MetricKey>("avg3");
  const [metricLocked, setMetricLocked] = React.useState(false);

  const metricValue = (m: X01MatchExtract, metric: MetricKey): number => {
    switch (metric) {
      case "avg3":
        return m.avg3;
      case "bv":
        return m.bv;
      case "bco":
        return m.bco;
      case "pctHits": {
        let hits = 0,
          miss = 0;
        for (const d of m.darts) {
          const v = d.v || 0;
          const mult = d.mult || 0;
          if (v === 0 || mult === 0) miss++;
          else hits++;
        }
        const total = hits + miss;
        return total > 0 ? (hits / total) * 100 : 0;
      }
      case "pctS": {
        let s = 0,
          hits = 0;
        for (const d of m.darts) {
          const v = d.v || 0;
          const mult = d.mult || 0;
          if (v === 0 || mult === 0) continue;
          hits++;
          if (mult === 1) s++;
        }
        return hits > 0 ? (s / hits) * 100 : 0;
      }
      case "pctD": {
        let d2 = 0,
          hits = 0;
        for (const d of m.darts) {
          const v = d.v || 0;
          const mult = d.mult || 0;
          if (v === 0 || mult === 0) continue;
          hits++;
          if (mult === 2) d2++;
        }
        return hits > 0 ? (d2 / hits) * 100 : 0;
      }
      case "pctT": {
        let t3 = 0,
          hits = 0;
        for (const d of m.darts) {
          const v = d.v || 0;
          const mult = d.mult || 0;
          if (v === 0 || mult === 0) continue;
          hits++;
          if (mult === 3) t3++;
        }
        return hits > 0 ? (t3 / hits) * 100 : 0;
      }
      default:
        return 0;
    }
  };

  const sparkData = filteredMatches.map((m) => ({
    x: m.t,
    y: metricValue(m, metric),
    match: m,
  }));

  // Auto-cycle métriques
  React.useEffect(() => {
    if (!filteredMatches.length) return;
    if (metricLocked) return;

    const id = window.setInterval(() => {
      setMetric((prev) => {
        const idx = metricList.findIndex((x) => x.key === prev);
        const next =
          metricList[(idx + 1) % metricList.length].key;
        return next;
      });
    }, 4000);

    return () => window.clearInterval(id);
  }, [filteredMatches.length, metricLocked]);

  React.useEffect(() => {
    if (!metricLocked) return;
    const id = window.setTimeout(
      () => setMetricLocked(false),
      15000
    );
    return () => window.clearTimeout(id);
  }, [metricLocked]);

  const metricPill: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(0,0,0,.45)",
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const sparklineBlock = (
    <div style={{ ...card }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color: T.text70,
            fontWeight: 700,
          }}
        >
          Évolution des performances
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {metricList.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMetric(m.key);
                setMetricLocked(true);
              }}
              style={{
                ...metricPill,
                borderColor:
                  metric === m.key
                    ? T.gold
                    : "rgba(255,255,255,.18)",
                color: metric === m.key ? T.gold : T.text70,
                boxShadow:
                  metric === m.key
                    ? "0 0 10px rgba(246,194,86,.7)"
                    : "none",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {sparkData.length > 1 ? (
        <SparklinePro
          points={sparkData.map((p) => ({ x: p.x, y: p.y }))}
          height={70}
        />
      ) : (
        <div style={{ fontSize: 12, color: T.text70 }}>
          Pas assez de matchs pour afficher une courbe.
        </div>
      )}
    </div>
  );

  // ============================================================
  // 7) RADAR DE PRÉCISION (BV / BCO / AVG)
  // ============================================================

  const dartsAllForRadar: UIDart[] = React.useMemo(() => {
    const all: UIDart[] = [];
    for (const m of filteredMatches) {
      if (Array.isArray(m.darts)) {
        for (const d of m.darts) {
          const v = Number(
            (d as any).v ??
              (d as any).value ??
              (d as any).segment ??
              0
          );
          const mult = Number(
            (d as any).mult ?? (d as any).multiplier ?? 0
          );
          all.push({ v, mult });
        }
      }
    }
    return all;
  }, [filteredMatches]);

  const radarAgg = React.useMemo(() => {
    let BV = 0,
      BCO = 0,
      AVG = 0,
      count = 0;

    for (const m of filteredMatches) {
      BV += m.bv || 0;
      BCO += m.bco || 0;
      AVG += m.avg3 || 0;
      count++;
    }

    return {
      BV: count > 0 ? BV / count : 0,
      BCO: count > 0 ? BCO / count : 0,
      AVG: count > 0 ? AVG / count : 0,
    };
  }, [filteredMatches]);

  const radarBlock = (
    <div
      style={{
        ...card,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          ...goldNeon,
          fontSize: 13,
          letterSpacing: 0.7,
          marginBottom: 4,
        }}
      >
        Radar de précision
      </div>

      <TrainingRadar
        x01={[
          { label: "BV", value: radarAgg.BV },
          { label: "BCO", value: radarAgg.BCO },
          { label: "AVG", value: radarAgg.AVG },
        ]}
        clock={[]}
        darts={dartsAllForRadar}
        height={220}
      />
    </div>
  );

  // ============================================================
  // 8) HITS PAR SEGMENTS (S / D / T / MISS)
  // ============================================================

  const SEGMENTS: (number | "MISS")[] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    18, 19, 20, 25, "MISS",
  ];

  const segMap: Record<
    string,
    { S: number; D: number; T: number; MISS: number }
  > = React.useMemo(() => {
    const map: Record<
      string,
      { S: number; D: number; T: number; MISS: number }
    > = {};

    const init = () => ({ S: 0, D: 0, T: 0, MISS: 0 });

    for (const s of SEGMENTS) {
      map[String(s)] = init();
    }

    for (const m of filteredMatches) {
      if (!Array.isArray(m.darts)) continue;

      for (const d of m.darts) {
        const v = Number(
          (d as any).v ??
            (d as any).value ??
            (d as any).segment ??
            0
        );
        const mult = Number(
          (d as any).mult ?? (d as any).multiplier ?? 0
        );

        let key = v === 25 ? "25" : String(v);
        if (!Number.isFinite(v) || v <= 0) key = "MISS";

        if (!map[key]) map[key] = init();

        if (v <= 0 || mult === 0) {
          map[key].MISS++;
        } else if (mult === 1) {
          map[key].S++;
        } else if (mult === 2) {
          map[key].D++;
        } else if (mult === 3) {
          map[key].T++;
        }
      }
    }

    return map;
  }, [filteredMatches]);

  const maxStack = React.useMemo(() => {
    let max = 0;
    for (const seg of SEGMENTS) {
      const val = segMap[String(seg)];
      if (!val) continue;
      const tot = val.S + val.D + val.T + val.MISS;
      if (tot > max) max = tot;
    }
    return max || 1;
  }, [segMap]);

  const hitsBlock = (
    <div
      style={{
        ...card,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          ...goldNeon,
          fontSize: 13,
          letterSpacing: 0.7,
          marginBottom: 4,
        }}
      >
        Hits par segment (S / D / T / MISS)
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: 140,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {SEGMENTS.map((seg) => {
          const label = seg === 25 ? "25" : String(seg);
          const val = segMap[label] || {
            S: 0,
            D: 0,
            T: 0,
            MISS: 0,
          };
          const tot = val.S + val.D + val.T + val.MISS;

          const hS = (val.S / maxStack) * 100;
          const hD = (val.D / maxStack) * 100;
          const hT = (val.T / maxStack) * 100;
          const hM = (val.MISS / maxStack) * 100;

          return (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 26,
              }}
            >
              <div
                style={{
                  width: 14,
                  display: "flex",
                  flexDirection: "column-reverse",
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow:
                    tot > 0
                      ? "0 0 6px rgba(255,255,255,.35)"
                      : "none",
                }}
              >
                {hS > 0 && (
                  <div
                    style={{
                      height: hS + "%",
                      background:
                        "linear-gradient(180deg,#47B5FF,#1F5F9F)",
                    }}
                  />
                )}
                {hD > 0 && (
                  <div
                    style={{
                      height: hD + "%",
                      background:
                        "linear-gradient(180deg,#FF6FB5,#8F2B64)",
                    }}
                  />
                )}
                {hT > 0 && (
                  <div
                    style={{
                      height: hT + "%",
                      background:
                        "linear-gradient(180deg,#FF9F43,#C25B0F)",
                    }}
                  />
                )}
                {hM > 0 && (
                  <div
                    style={{
                      height: hM + "%",
                      background:
                        "linear-gradient(180deg,#555,#999)",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  fontSize: 9,
                  marginTop: 2,
                  color: T.text70,
                  textAlign: "center",
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginTop: 4,
          fontSize: 10,
          color: T.text70,
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 3,
              marginRight: 4,
              background:
                "linear-gradient(180deg,#47B5FF,#1F5F9F)",
            }}
          />
          S
        </div>
        <div>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 3,
              marginRight: 4,
              background:
                "linear-gradient(180deg,#FF6FB5,#8F2B64)",
            }}
          />
          D
        </div>
        <div>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 3,
              marginRight: 4,
              background:
                "linear-gradient(180deg,#FF9F43,#C25B0F)",
            }}
          />
          T
        </div>
        <div>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 3,
              marginRight: 4,
              background:
                "linear-gradient(180deg,#555,#999)",
            }}
          />
          Miss
        </div>
      </div>
    </div>
  );

  // ============================================================
  // 9) HISTORIQUE DES MATCHS + MODAL
  // ============================================================

  const [selectedMatch, setSelectedMatch] =
    React.useState<X01MatchModalItem | null>(null);

  const historyBlock = (
    <div
      style={{
        ...card,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: T.text70,
          fontWeight: 700,
        }}
      >
        Historique des matchs X01
      </div>

      {filteredMatches.length === 0 && (
        <div style={{ fontSize: 12, color: T.text70 }}>
          Aucun match X01 enregistré pour cette période.
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {filteredMatches.map((m, idx) => {
          const when = fmtDate(m.date);

          let hitsS = 0,
            hitsD = 0,
            hitsT = 0,
            miss = 0;
          for (const d of m.darts) {
            const v = d.v || 0;
            const mult = d.mult || 0;
            if (v === 0 || mult === 0) miss++;
            else if (mult === 1) hitsS++;
            else if (mult === 2) hitsD++;
            else if (mult === 3) hitsT++;
          }
          const hits = hitsS + hitsD + hitsT;
          const throws = hits + miss;
          const pctHits =
            throws > 0 ? (hits / throws) * 100 : null;

          const handleOpen = () => {
            const modalItem: X01MatchModalItem = {
              id: m.id,
              date: m.date,
              avg3: m.avg3,
              bv: m.bv,
              bco: m.bco,
              result: m.result,
              darts: m.darts,
            };
            setSelectedMatch(modalItem);
          };

          return (
            <button
              key={m.id || idx}
              type="button"
              onClick={handleOpen}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.08)",
                padding: "10px 12px",
                background:
                  "linear-gradient(180deg,#15171B,#0F1013)",
                color: T.text,
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  opacity: 0.8,
                }}
              >
                <span>{when}</span>
                <span
                  style={{
                    fontWeight: 900,
                    color:
                      m.result === "W"
                        ? "#7CFF9A"
                        : m.result === "L"
                        ? "#FF7C7C"
                        : T.text70,
                  }}
                >
                  {m.result}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  BV:{" "}
                  <span
                    style={{
                      color: "#47B5FF",
                      fontWeight: 700,
                    }}
                  >
                    {m.bv ?? 0}
                  </span>
                </div>

                <div>
                  BCO:{" "}
                  <span
                    style={{
                      color: T.gold,
                      fontWeight: 700,
                    }}
                  >
                    {m.bco ?? "-"}
                  </span>
                </div>

                <div>
                  Moy:{" "}
                  <span
                    style={{
                      color: "#FFB8DE",
                      fontWeight: 700,
                    }}
                  >
                    {m.avg3.toFixed(1)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  opacity: 0.8,
                }}
              >
                <div>
                  Hits:{" "}
                  <span style={{ color: "#7CFF9A" }}>
                    {hits}
                    {pctHits !== null &&
                      ` (${pctHits.toFixed(1)}%)`}
                  </span>
                </div>

                <div>Darts: {m.darts.length}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const modalMatchDetail = selectedMatch ? (
    <X01MultiStatsMatchModal
      match={selectedMatch}
      onClose={() => setSelectedMatch(null)}
    />
  ) : null;

  // ============================================================
  // 10) RENDER GLOBAL (ordre comme TrainingX01)
  // ============================================================

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* HEADER + FILTRES J/S/M/A/ALL */}
      <div style={{ ...card, padding: 14, textAlign: "center" }}>
        <div
          style={{
            ...goldNeon,
            fontSize: 18,
            marginBottom: 10,
          }}
        >
          X01 MULTI
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
            (r) => (
              <GoldPill
                key={r}
                active={range === r}
                onClick={() => setRange(r)}
                style={{ padding: "4px 12px", fontSize: 11 }}
              >
                {r === "day" && "Jour"}
                {r === "week" && "Semaine"}
                {r === "month" && "Mois"}
                {r === "year" && "Année"}
                {r === "all" && "All"}
              </GoldPill>
            )
          )}
        </div>
      </div>

      {/* 1) KPIs */}
      {kpiSection}

      {/* 2) Stats détaillées (période) */}
      {statsDetailBlock}

      {/* 3) Stats matchs (tous modes) */}
      {matchStatsBlock}

      {/* 4) Sparkline */}
      {sparklineBlock}

      {/* 5) Radar précision */}
      {radarBlock}

      {/* 6) Hits par segments */}
      {hitsBlock}

      {/* 7) Historique + Modal */}
      {historyBlock}
      {modalMatchDetail}
    </div>
  );
}
