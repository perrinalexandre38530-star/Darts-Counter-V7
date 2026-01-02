// ============================================================
// src/components/stats/TrainingX01StatsTabFull.tsx
// FULL Training X01 stats tab (clone du diamant depuis StatsHub)
// - Logique complète Training X01 isolée dans un composant externe
// - L'ancien bloc dans StatsHub reste intact / non touché
// ============================================================

import React from "react";
import SparklinePro from "../SparklinePro";
import TrainingRadar from "../TrainingRadar";
import { GoldPill } from "../StatsPlayerDashboard";
import type { Dart as UIDart } from "../../lib/types";

/* ---------- Thème local ---------- */
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

/* ---------- Types / helpers ---------- */

type TimeRange = "all" | "day" | "week" | "month" | "year";

export type TrainingX01Session = {
  id: string;
  date: number;
  profileId: string;
  darts: number;
  avg3D: number;
  avg1D: number;
  bestVisit: number;
  bestCheckout: number | null;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;

  bySegment?: Record<string, number>;
  bySegmentS?: Record<string, number>;
  bySegmentD?: Record<string, number>;
  bySegmentT?: Record<string, number>;

  dartsDetail?: UIDart[];
};

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

function filterByRange(
  sessions: TrainingX01Session[],
  range: TimeRange
): TrainingX01Session[] {
  if (range === "all") return sessions;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const delta =
    range === "day"
      ? ONE_DAY
      : range === "week"
      ? 7 * ONE_DAY
      : range === "month"
      ? 30 * ONE_DAY
      : 365 * ONE_DAY;
  const minDate = now - delta;
  return sessions.filter((s) => s.date >= minDate);
}

function formatShortDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ---------- Chargement sessions (copie StatsHub) ---------- */

function loadTrainingSessions(): TrainingX01Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((row: any, idx: number) => {
      const darts = Number(row.darts) || 0;
      const avg3D = Number(row.avg3D) || 0;

      const avg1DExplicit =
        row.avg1D !== undefined && row.avg1D !== null
          ? Number(row.avg1D) || 0
          : null;
      const avg1D =
        avg1DExplicit !== null
          ? avg1DExplicit
          : darts > 0
          ? avg3D / 3
          : 0;

      const bestCheckoutRaw =
        row.bestCheckout !== undefined && row.bestCheckout !== null
          ? row.bestCheckout
          : row.checkout;
      const bestCheckout =
        bestCheckoutRaw === null || bestCheckoutRaw === undefined
          ? null
          : Number(bestCheckoutRaw) || 0;

      const bySegmentRaw =
        row.bySegment && typeof row.bySegment === "object"
          ? (row.bySegment as Record<string, any>)
          : undefined;

      const bySegmentSRaw =
        row.bySegmentS && typeof row.bySegmentS === "object"
          ? (row.bySegmentS as Record<string, any>)
          : undefined;

      const bySegmentDRaw =
        row.bySegmentD && typeof row.bySegmentD === "object"
          ? (row.bySegmentD as Record<string, any>)
          : undefined;

      const bySegmentTRaw =
        row.bySegmentT && typeof row.bySegmentT === "object"
          ? (row.bySegmentT as Record<string, any>)
          : undefined;

      // ---------- reconstruction dartsDetail ----------
      let dartsDetail: UIDart[] | undefined = undefined;

      if (Array.isArray(row.dartsDetail)) {
        dartsDetail = row.dartsDetail;
      } else if (bySegmentSRaw || bySegmentDRaw || bySegmentTRaw) {
        const tmp: UIDart[] = [];
        const keys = new Set<string>([
          ...Object.keys(bySegmentSRaw || {}),
          ...Object.keys(bySegmentDRaw || {}),
          ...Object.keys(bySegmentTRaw || {}),
        ]);

        const cap = (n: number) =>
          Math.min(200, Math.max(0, Math.round(n)));

        for (const segStr of keys) {
          const seg = Number(segStr);
          if (!Number.isFinite(seg) || seg <= 0) continue;

          const sCount = cap(Number(bySegmentSRaw?.[segStr] || 0));
          const dCount = cap(Number(bySegmentDRaw?.[segStr] || 0));
          const tCount = cap(Number(bySegmentTRaw?.[segStr] || 0));

          for (let i = 0; i < sCount; i++) {
            tmp.push({ v: seg, mult: 1 } as UIDart);
          }
          for (let i = 0; i < dCount; i++) {
            tmp.push({ v: seg, mult: 2 } as UIDart);
          }
          for (let i = 0; i < tCount; i++) {
            tmp.push({ v: seg, mult: 3 } as UIDart);
          }
        }

        dartsDetail = tmp;
      } else if (bySegmentRaw) {
        const tmp: UIDart[] = [];
        const cap = (n: number) =>
          Math.min(200, Math.max(0, Math.round(n)));

        for (const [segStr, entry] of Object.entries(bySegmentRaw)) {
          const seg = Number(segStr);
          if (!Number.isFinite(seg) || seg <= 0) continue;

          let sCount = 0,
            dCount = 0,
            tCount = 0;

          if (typeof entry === "number") {
            sCount = cap(entry);
          } else if (entry && typeof entry === "object") {
            sCount = cap(Number((entry as any).S || 0));
            dCount = cap(Number((entry as any).D || 0));
            tCount = cap(Number((entry as any).T || 0));
          }

          for (let i = 0; i < sCount; i++) {
            tmp.push({ v: seg, mult: 1 } as UIDart);
          }
          for (let i = 0; i < dCount; i++) {
            tmp.push({ v: seg, mult: 2 } as UIDart);
          }
          for (let i = 0; i < tCount; i++) {
            tmp.push({ v: seg, mult: 3 } as UIDart);
          }
        }

        dartsDetail = tmp;
      }

      return {
        id: row.id ?? String(idx),
        date: Number(row.date) || Date.now(),
        profileId: String(row.profileId ?? "unknown"),
        darts,
        avg3D,
        avg1D,
        bestVisit: Number(row.bestVisit) || 0,
        bestCheckout,
        hitsS: Number(row.hitsS) || 0,
        hitsD: Number(row.hitsD) || 0,
        hitsT: Number(row.hitsT) || 0,
        miss: Number(row.miss) || 0,
        bull: Number(row.bull) || 0,
        dBull: Number(row.dBull) || 0,
        bust: Number(row.bust) || 0,
        bySegment: bySegmentRaw,
        bySegmentS: bySegmentSRaw,
        bySegmentD: bySegmentDRaw,
        bySegmentT: bySegmentTRaw,
        dartsDetail,
      } as TrainingX01Session;
    });
  } catch (e) {
    console.warn("[TrainingX01StatsTabFull] loadTrainingSessions failed", e);
    return [];
  }
}

/* ---------- constantes segments ---------- */

const HITS_SEGMENTS: (number | "MISS")[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25,
  "MISS",
];

const SEGMENTS_FOR_RADAR: (number | "MISS")[] = HITS_SEGMENTS;

/* ---------- normalisation dart ---------- */

function normalizeTrainingDart(raw: any): UIDart | null {
  if (!raw) return null;

  const rawV =
    (raw as any).v ??
    (raw as any).value ??
    (raw as any).segment ??
    (raw as any).s;

  const rawMult =
    (raw as any).mult ??
    (raw as any).m ??
    (raw as any).multiplier ??
    (raw as any).type;

  const vNum = Number(rawV) || 0;

  let mNum: number;
  if (rawMult === "S") mNum = 1;
  else if (rawMult === "D") mNum = 2;
  else if (rawMult === "T") mNum = 3;
  else mNum = Number(rawMult) || 0;

  if (!Number.isFinite(vNum)) return null;
  if (!Number.isFinite(mNum)) mNum = 0;

  return { v: vNum, mult: mNum as 0 | 1 | 2 | 3 };
}

/* ===========================================================
   Composant principal
   =========================================================== */

export default function TrainingX01StatsTabFull() {
  const [sessions, setSessions] = React.useState<TrainingX01Session[]>([]);
  const [range, setRange] = React.useState<TimeRange>("all");
  const [selected, setSelected] = React.useState<TrainingX01Session | null>(
    null
  );

  const metricKeys: Array<
    "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
  > = ["darts", "avg3D", "pctS", "pctD", "pctT", "BV", "CO"];

  const [metric, setMetric] = React.useState<
    "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
  >("avg3D");

  const [metricLocked, setMetricLocked] = React.useState(false);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setSessions(loadTrainingSessions());
  }, []);

  // auto-défilement métriques
  React.useEffect(() => {
    if (!sessions.length) return;
    if (metricLocked) return;

    const id = window.setInterval(() => {
      setMetric((prev) => {
        const idx = metricKeys.indexOf(prev);
        const nextIdx = idx === -1 ? 0 : (idx + 1) % metricKeys.length;
        return metricKeys[nextIdx];
      });
    }, 4000);

    return () => window.clearInterval(id);
  }, [sessions.length, metricLocked]);

  React.useEffect(() => {
    if (!metricLocked) return;
    const id = window.setTimeout(() => setMetricLocked(false), 15000);
    return () => window.clearTimeout(id);
  }, [metricLocked]);

  // sessions filtrées
  const filtered = React.useMemo(
    () => filterByRange(sessions, range).sort((a, b) => a.date - b.date),
    [sessions, range]
  );

  const totalSessions = filtered.length;
  const totalDarts = filtered.reduce((s, x) => s + x.darts, 0);
  const avgDarts = totalSessions > 0 ? totalDarts / totalSessions : 0;

  const bestVisit =
    totalSessions > 0 ? Math.max(...filtered.map((x) => x.bestVisit)) : 0;

  const bestCheckout =
    totalSessions > 0
      ? Math.max(...filtered.map((x) => x.bestCheckout || 0))
      : 0;

  const globalAvg3D =
    totalSessions > 0
      ? filtered.reduce((s, x) => s + x.avg3D, 0) / totalSessions
      : 0;

  const globalAvg1D =
    totalSessions > 0
      ? filtered.reduce((s, x) => s + x.avg1D, 0) / totalSessions
      : 0;

  // agrégats hits / miss / bull etc.
  let gHitsS = 0,
    gHitsD = 0,
    gHitsT = 0,
    gMiss = 0,
    gBull = 0,
    gDBull = 0,
    gBust = 0;

  let minDarts: number | null = null,
    maxDarts: number | null = null,
    minHits: number | null = null,
    maxHits: number | null = null,
    minS: number | null = null,
    maxS: number | null = null,
    minD: number | null = null,
    maxD: number | null = null,
    minT: number | null = null,
    maxT: number | null = null,
    minMiss: number | null = null,
    maxMiss: number | null = null,
    minBull: number | null = null,
    maxBull: number | null = null,
    minDBull: number | null = null,
    maxDBull: number | null = null,
    minBust: number | null = null,
    maxBust: number | null = null;

  for (const s of filtered) {
    const darts = s.darts || 0;
    const sS = s.hitsS ?? 0;
    const sD = s.hitsD ?? 0;
    const sT = s.hitsT ?? 0;
    const sMiss = s.miss ?? 0;
    const sBull = s.bull ?? 0;
    const sDBull = s.dBull ?? 0;
    const sBust = s.bust ?? 0;
    const sHits = sS + sD + sT;

    const hasCounters =
      sS + sD + sT + sMiss + sBull + sDBull + sBust > 0;

    if (hasCounters) {
      gHitsS += sS;
      gHitsD += sD;
      gHitsT += sT;
      gMiss += sMiss;
      gBull += sBull;
      gDBull += sDBull;
      gBust += sBust;

      if (darts > 0) {
        if (minDarts === null || darts < minDarts) minDarts = darts;
        if (maxDarts === null || darts > maxDarts) maxDarts = darts;

        if (minHits === null || sHits < minHits) minHits = sHits;
        if (maxHits === null || sHits > maxHits) maxHits = sHits;

        if (minS === null || sS < minS) minS = sS;
        if (maxS === null || sS > maxS) maxS = sS;

        if (minD === null || sD < minD) minD = sD;
        if (maxD === null || sD > maxD) maxD = sD;

        if (minT === null || sT < minT) minT = sT;
        if (maxT === null || sT > maxT) maxT = sT;

        if (minMiss === null || sMiss < minMiss) minMiss = sMiss;
        if (maxMiss === null || sMiss > maxMiss) maxMiss = sMiss;

        if (minBull === null || sBull < minBull) minBull = sBull;
        if (maxBull === null || sBull > maxBull) maxBull = sBull;

        if (minDBull === null || sDBull < minDBull) minDBull = sDBull;
        if (maxDBull === null || sDBull > maxDBull) maxDBull = sDBull;

        if (minBust === null || sBust < minBust) minBust = sBust;
        if (maxBust === null || sBust > maxBust) maxBust = sBust;
      }
      continue;
    }

    // fallback vieux dartsDetail
    if (Array.isArray(s.dartsDetail)) {
      for (const d of s.dartsDetail) {
        const v = Number((d as any)?.v) || 0;
        const mult = Number((d as any)?.mult) || 0;

        if (v === 0 || mult === 0) {
          gMiss++;
          continue;
        }

        if (v === 25 && mult === 2) gDBull++;
        else if (v === 25) gBull++;

        if (mult === 1) gHitsS++;
        else if (mult === 2) gHitsD++;
        else if (mult === 3) gHitsT++;
      }
    }
  }

  const totalHits = gHitsS + gHitsD + gHitsT;
  const totalThrows = totalHits + gMiss;

  const hitsPercent =
    totalThrows > 0 ? (totalHits / totalThrows) * 100 : 0;
  const simplePercent =
    totalHits > 0 ? (gHitsS / totalHits) * 100 : 0;
  const doublePercent =
    totalHits > 0 ? (gHitsD / totalHits) * 100 : 0;
  const triplePercent =
    totalHits > 0 ? (gHitsT / totalHits) * 100 : 0;

  const avgHitsSPerSession =
    totalSessions > 0 ? gHitsS / totalSessions : 0;
  const avgHitsDPerSession =
    totalSessions > 0 ? gHitsD / totalSessions : 0;
  const avgHitsTPerSession =
    totalSessions > 0 ? gHitsT / totalSessions : 0;
  const avgMissPerSession =
    totalSessions > 0 ? gMiss / totalSessions : 0;
  const avgBustPerSession =
    totalSessions > 0 ? gBust / totalSessions : 0;
  const avgBullPerSession =
    totalSessions > 0 ? gBull / totalSessions : 0;
  const avgDBullPerSession =
    totalSessions > 0 ? gDBull / totalSessions : 0;
  const bestAvg3DSession =
    totalSessions > 0
      ? Math.max(...filtered.map((x) => x.avg3D || 0))
      : 0;

  const pctHitsGlobal = totalThrows > 0 ? hitsPercent : null;
  const pctMissGlobal =
    totalThrows > 0 ? (gMiss / totalThrows) * 100 : null;
  const pctSimpleGlobal =
    totalHits > 0 ? (gHitsS / totalHits) * 100 : null;
  const pctDoubleGlobal =
    totalHits > 0 ? (gHitsD / totalHits) * 100 : null;
  const pctTripleGlobal =
    totalHits > 0 ? (gHitsT / totalHits) * 100 : null;

  const totalBullHits = gBull + gDBull;
  const pctBullGlobal =
    totalDarts > 0 ? (gBull / totalDarts) * 100 : null;
  const pctDBullGlobal =
    totalDarts > 0 ? (gDBull / totalDarts) * 100 : null;
  const pctBustGlobal =
    totalThrows > 0 ? (gBust / totalThrows) * 100 : null;

  // darts pour radar + hits/segment
  const trainingDartsAll: UIDart[] = React.useMemo(() => {
    const out: UIDart[] = [];

    for (const s of filtered) {
      if (Array.isArray(s.dartsDetail) && s.dartsDetail.length) {
        for (const raw of s.dartsDetail) {
          const nd = normalizeTrainingDart(raw);
          if (nd) out.push(nd);
        }
        continue;
      }

      if (s.bySegment && typeof s.bySegment === "object") {
        for (const [segStr, entry] of Object.entries(s.bySegment)) {
          const seg = Number(segStr);
          if (!Number.isFinite(seg) || seg <= 0) continue;

          let S = 0,
            D = 0,
            T = 0;

          if (typeof entry === "number") {
            S = Math.max(0, Math.round(entry));
          } else if (typeof entry === "object") {
            S = Number((entry as any).S) || 0;
            D = Number((entry as any).D) || 0;
            T = Number((entry as any).T) || 0;
          }

          for (let i = 0; i < S; i++) out.push({ v: seg, mult: 1 });
          for (let i = 0; i < D; i++) out.push({ v: seg, mult: 2 });
          for (let i = 0; i < T; i++) out.push({ v: seg, mult: 3 });
        }
      }
    }

    return out;
  }, [filtered]);

  // hit préféré / favoris
  const segmentCount: Record<string, number> = {};
  for (const d of trainingDartsAll) {
    const v = Number((d as any)?.v) || 0;
    if (v <= 0) continue;
    const key = v === 25 ? "25" : String(v);
    segmentCount[key] = (segmentCount[key] || 0) + 1;
  }

  let favoriteSegmentKey: string | null = null;
  let favoriteSegmentCount = 0;
  for (const [k, c] of Object.entries(segmentCount)) {
    if (c > favoriteSegmentCount) {
      favoriteSegmentCount = c;
      favoriteSegmentKey = k;
    }
  }

  const labelForSegment = (k: string | null) =>
    k === null ? null : k === "25" ? "25 (Bull)" : k;

  const favoriteHitDisplay = labelForSegment(favoriteSegmentKey);

  const segSDTMap: Record<string, { S: number; D: number; T: number }> = {};
  let chartMissCount = gMiss;

  for (const d of trainingDartsAll) {
    const v = Number((d as any)?.v) || 0;
    const mult = Number((d as any)?.mult) || 0;

    if (v === 0 || mult === 0) continue;

    const key = v === 25 ? "25" : String(v);
    if (!segSDTMap[key]) segSDTMap[key] = { S: 0, D: 0, T: 0 };

    if (mult === 1) segSDTMap[key].S++;
    else if (mult === 2) segSDTMap[key].D++;
    else if (mult === 3) segSDTMap[key].T++;
  }

  const maxStackHits = HITS_SEGMENTS.reduce((max, seg) => {
    if (seg === "MISS") {
      return chartMissCount > max ? chartMissCount : max;
    }
    const data = segSDTMap[String(seg)];
    const tot = data ? data.S + data.D + data.T : 0;
    return tot > max ? tot : max;
  }, 0);

  let favSimpleKey: string | null = null;
  let favSimpleCount = 0;
  let favDoubleKey: string | null = null;
  let favDoubleCount = 0;
  let favTripleKey: string | null = null;
  let favTripleCount = 0;

  for (const [key, val] of Object.entries(segSDTMap)) {
    if (val.S > favSimpleCount) {
      favSimpleCount = val.S;
      favSimpleKey = key;
    }
    if (val.D > favDoubleCount) {
      favDoubleCount = val.D;
      favDoubleKey = key;
    }
    if (val.T > favTripleCount) {
      favTripleCount = val.T;
      favTripleKey = key;
    }
  }

  let leastHitKey: string | null = null;
  let leastHitCount = Infinity;
  for (const [key, count] of Object.entries(segmentCount)) {
    if (count > 0 && count < leastHitCount) {
      leastHitCount = count;
      leastHitKey = key;
    }
  }

  const favoriteSimpleDisplay = labelForSegment(favSimpleKey);
  const favoriteDoubleDisplay = labelForSegment(favDoubleKey);
  const favoriteTripleDisplay = labelForSegment(favTripleKey);
  const leastHitDisplay = labelForSegment(leastHitKey); // dispo si tu veux l'afficher

  // sparkline
  function valueForMetric(
    s: TrainingX01Session,
    m: "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
  ): number {
    switch (m) {
      case "darts":
        return s.darts;
      case "avg3D":
        return s.avg3D;
      case "pctS": {
        const t = s.hitsS + s.hitsD + s.hitsT;
        return t > 0 ? (s.hitsS / t) * 100 : 0;
      }
      case "pctD": {
        const t = s.hitsS + s.hitsD + s.hitsT;
        return t > 0 ? (s.hitsD / t) * 100 : 0;
      }
      case "pctT": {
        const t = s.hitsS + s.hitsD + s.hitsT;
        return t > 0 ? (s.hitsT / t) * 100 : 0;
      }
      case "BV":
        return s.bestVisit;
      case "CO":
        return s.bestCheckout || 0;
      default:
        return 0;
    }
  }

  const sparkSeries = filtered.map((s) => ({
    x: s.date,
    y: valueForMetric(s, metric),
    session: s,
  }));

  // KPIs
  type RawKpiItem =
    | {
        kind: "num";
        label: string;
        raw: number | null;
        format?: (v: number) => string;
        allowZero?: boolean;
      }
    | {
        kind: "text";
        label: string;
        text: string | null;
      };

  type KpiDisplayItem = { label: string; value: string };

  function finalizeKpiItems(items: RawKpiItem[]): KpiDisplayItem[] {
    const out: KpiDisplayItem[] = [];
    for (const it of items) {
      if (it.kind === "num") {
        if (it.raw === null || Number.isNaN(it.raw)) continue;
        if (!it.allowZero && it.raw === 0) continue;
        const fmt = it.format ?? ((v: number) => `${v}`);
        out.push({ label: it.label, value: fmt(it.raw) });
      } else {
        if (!it.text) continue;
        out.push({ label: it.label, value: it.text });
      }
    }
    return out;
  }

  const goldItems = finalizeKpiItems([
    { kind: "num", label: "Darts totaux", raw: totalDarts, allowZero: true },
    { kind: "num", label: "Sessions", raw: totalSessions, allowZero: true },
    { kind: "num", label: "Hits S cumulés", raw: gHitsS },
    { kind: "num", label: "Hits D cumulés", raw: gHitsD },
    { kind: "num", label: "Hits T cumulés", raw: gHitsT },
    { kind: "num", label: "Miss cumulés", raw: gMiss },
    { kind: "num", label: "Bull cumulés", raw: gBull },
    { kind: "num", label: "DBull cumulés", raw: gDBull },
    { kind: "num", label: "Bust cumulés", raw: gBust },
  ]);

  const pinkItems = finalizeKpiItems([
    {
      kind: "num",
      label: "Moy.3D (période)",
      raw: totalSessions > 0 ? globalAvg3D : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Moy.1D (période)",
      raw: totalSessions > 0 ? globalAvg1D : null,
      format: (v) => v.toFixed(2),
    },
    {
      kind: "num",
      label: "Darts / session",
      raw: totalSessions > 0 ? avgDarts : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Hits S / session",
      raw: totalSessions > 0 ? avgHitsSPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Hits D / session",
      raw: totalSessions > 0 ? avgHitsDPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Hits T / session",
      raw: totalSessions > 0 ? avgHitsTPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Miss / session",
      raw: totalSessions > 0 ? avgMissPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Bust / session",
      raw: totalSessions > 0 ? avgBustPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "Bull / session",
      raw: totalSessions > 0 ? avgBullPerSession : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "DBull / session",
      raw: totalSessions > 0 ? avgDBullPerSession : null,
      format: (v) => v.toFixed(1),
    },
  ]);

  const blueItems = finalizeKpiItems([
    {
      kind: "text",
      label: "Hit préféré (global)",
      text: favoriteHitDisplay ?? null,
    },
    { kind: "num", label: "Best Visit (session)", raw: bestVisit },
    {
      kind: "num",
      label: "Best Checkout (session)",
      raw: bestCheckout > 0 ? bestCheckout : null,
    },
    {
      kind: "num",
      label: "Miss min / session",
      raw: minMiss,
      allowZero: true,
    },
    {
      kind: "num",
      label: "Miss max / session",
      raw: maxMiss,
    },
    {
      kind: "num",
      label: "Bust min / session",
      raw: minBust,
      allowZero: true,
    },
    {
      kind: "num",
      label: "Bust max / session",
      raw: maxBust,
    },
  ]);

  const green1Items = finalizeKpiItems([
    {
      kind: "num",
      label: "%Hits global",
      raw: pctHitsGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%Miss",
      raw: pctMissGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%S",
      raw: pctSimpleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%D",
      raw: pctDoubleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%T",
      raw: pctTripleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%Bull (Bull+DBull)",
      raw: pctBullGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%DBull (Bull+DBull)",
      raw: pctDBullGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
  ]);

  const green2Items = finalizeKpiItems([
    { kind: "num", label: "Best Visit", raw: bestVisit },
    {
      kind: "num",
      label: "Best Checkout",
      raw: bestCheckout > 0 ? bestCheckout : null,
    },
    {
      kind: "num",
      label: "Moy.3D (période)",
      raw: totalSessions > 0 ? globalAvg3D : null,
      format: (v) => v.toFixed(1),
    },
    {
      kind: "num",
      label: "%Hits global",
      raw: pctHitsGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
    {
      kind: "num",
      label: "%T (global)",
      raw: pctTripleGlobal,
      format: (v) => `${v.toFixed(1)}%`,
    },
  ]);

  const hasAnyKpi =
    goldItems.length ||
    pinkItems.length ||
    blueItems.length ||
    green1Items.length ||
    green2Items.length;

  const [ticker, setTicker] = React.useState(0);
  React.useEffect(() => {
    if (!hasAnyKpi) return;
    const id = window.setInterval(() => {
      setTicker((t) => t + 1);
    }, 4000);
    return () => window.clearInterval(id);
  }, [hasAnyKpi, filtered.length]);

  const currentGold =
    goldItems.length > 0 ? goldItems[ticker % goldItems.length] : null;
  const currentPink =
    pinkItems.length > 0 ? pinkItems[ticker % pinkItems.length] : null;
  const currentBlue =
    blueItems.length > 0 ? blueItems[ticker % blueItems.length] : null;
  const currentGreen1 =
    green1Items.length > 0 ? green1Items[ticker % green1Items.length] : null;
  const currentGreen2 =
    green2Items.length > 0 ? green2Items[ticker % green2Items.length] : null;

  const baseKpiBox: React.CSSProperties = {
    borderRadius: 22,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 4,
    background: "linear-gradient(180deg,#15171B,#101115)",
    minHeight: 78,
  };

  const makeKpiBox = (accent: string): React.CSSProperties => ({
    ...baseKpiBox,
    border: `1px solid ${accent}`,
    boxShadow: `0 0 0 1px ${accent}33, 0 0 14px ${accent}88, 0 0 28px ${accent}55`,
    background:
      "radial-gradient(circle at 0% 0%, " +
      accent +
      "26 0, transparent 55%), linear-gradient(180deg,#15171B,#101115)",
  });

  const kpiLabelStyle: React.CSSProperties = {
    fontSize: 10,
    color: T.text70,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };

  const kpiSub: React.CSSProperties = {
    fontSize: 11,
    color: T.text70,
  };

  const statRowBox: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    padding: "6px 0",
    borderTop: `1px solid rgba(255,255,255,.06)`,
  };

  const metricPill: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(0,0,0,.45)",
    cursor: "pointer",
  };

  React.useEffect(() => {
    setPage(1);
  }, [range, sessions.length]);

  const pageSize = 10;
  const totalPages =
    totalSessions > 0
      ? Math.max(1, Math.ceil(totalSessions / pageSize))
      : 1;

  const reversedSessions = filtered.slice().reverse();
  const pagedSessions = reversedSessions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // résumé "mots du coach"
  let summaryTitle = "Mots du Coach";
  const summaryLines: string[] = [];

  if (totalSessions === 0) {
    summaryLines.push("Aucune session sur la période sélectionnée.");
  } else {
    if (globalAvg3D >= 70) {
      summaryLines.push(
        "Très gros scoring global, moyenne 3D élevée sur la période."
      );
    } else if (globalAvg3D >= 60) {
      summaryLines.push(
        "Scoring solide avec une moyenne 3D correcte et régulière."
      );
    } else if (globalAvg3D >= 50) {
      summaryLines.push(
        "Scoring en progression, objectif : stabiliser au-dessus de 60 de moyenne 3D."
      );
    } else {
      summaryLines.push(
        "Scoring encore irrégulier, l’objectif est de stabiliser les visites et les scores moyens."
      );
    }

    if (pctTripleGlobal !== null && pctTripleGlobal >= 20) {
      summaryLines.push(
        "Fort volume de triples, jeu très offensif sur les segments T."
      );
    } else if (pctTripleGlobal !== null && pctTripleGlobal >= 10) {
      summaryLines.push(
        "Les triples commencent à bien rentrer, volume intéressant sur les T."
      );
    } else {
      summaryLines.push(
        "Peu de triples sur la période, axe de travail possible sur les segments T."
      );
    }

    if (pctMissGlobal !== null) {
      if (pctMissGlobal <= 20) {
        summaryLines.push(
          "Taux de miss maîtrisé, bonne sécurité générale au tir."
        );
      } else if (pctMissGlobal <= 35) {
        summaryLines.push(
          "Taux de miss moyen, encore perfectible pour gagner en régularité."
        );
      } else {
        summaryLines.push(
          "Taux de miss élevé, priorité à la régularité et au contrôle des lancers."
        );
      }
    }

    if (avgBustPerSession > 0) {
      if (avgBustPerSession <= 1) {
        summaryLines.push(
          "Les busts restent rares, gestion des fins de legs plutôt propre."
        );
      } else if (avgBustPerSession <= 3) {
        summaryLines.push(
          "Quelques busts par session, attention aux fins de legs et aux calculs de checkout."
        );
      } else {
        summaryLines.push(
          "Beaucoup de busts sur la période, le travail sur les fins de legs et les checkouts est prioritaire."
        );
      }
    }

    if (totalBullHits > 0) {
      if (pctDBullGlobal !== null && pctDBullGlobal >= 40) {
        summaryLines.push(
          "Très bon ratio DBull dans la zone centrale, excellente précision au centre."
        );
      } else if (pctBullGlobal !== null) {
        summaryLines.push(
          "Zone Bull utilisée régulièrement, précision correcte dans l’axe central."
        );
      }
    }
  }

  // ------------------- RENDER -------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Filtres J/S/M/A/ALL */}
      <div style={{ ...card, padding: 14, textAlign: "center" }}>
        <div
          style={{
            ...goldNeon,
            fontSize: 18,
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          TRAINING X01
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            flexWrap: "nowrap",
            transform: "scale(0.92)",
            transformOrigin: "center",
          }}
        >
          {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
            (r) => (
              <GoldPill
                key={r}
                active={range === r}
                onClick={() => setRange(r)}
                style={{
                  padding: "4px 12px",
                  fontSize: 11,
                  minWidth: "unset",
                  whiteSpace: "nowrap",
                }}
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

      {/* KPI carrousels */}
      {totalSessions > 0 && hasAnyKpi && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div style={makeKpiBox("#47B5FF")}>
              <div style={{ ...kpiLabelStyle, color: "#47B5FF" }}>
                CUMUL
              </div>
              {currentGold ? (
                <>
                  <div style={kpiSub}>{currentGold.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#47B5FF",
                    }}
                  >
                    {currentGold.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>

            <div style={makeKpiBox("#FF6FB5")}>
              <div style={{ ...kpiLabelStyle, color: "#FF6FB5" }}>
                MOYENNES
              </div>
              {currentPink ? (
                <>
                  <div style={kpiSub}>{currentPink.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#FFB8DE",
                    }}
                  >
                    {currentPink.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div style={makeKpiBox(T.gold)}>
              <div style={{ ...kpiLabelStyle, color: T.gold }}>
                RECORDS
              </div>
              {currentBlue ? (
                <>
                  <div style={kpiSub}>{currentBlue.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: T.gold,
                    }}
                  >
                    {currentBlue.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>

            <div style={makeKpiBox("#7CFF9A")}>
              <div style={{ ...kpiLabelStyle, color: "#7CFF9A" }}>
                POURCENTAGES
              </div>
              {currentGreen1 ? (
                <>
                  <div style={kpiSub}>{currentGreen1.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#E5FFEF",
                    }}
                  >
                    {currentGreen1.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>

            <div style={makeKpiBox("#7CFF9A")}>
              <div style={{ ...kpiLabelStyle, color: "#7CFF9A" }}>
                % / BV / CO
              </div>
              {currentGreen2 ? (
                <>
                  <div style={kpiSub}>{currentGreen2.label}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#E5FFEF",
                    }}
                  >
                    {currentGreen2.value}
                  </div>
                </>
              ) : (
                <div style={kpiSub}>Aucune donnée</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Résumé nb de sessions */}
      <div
        style={{
          borderRadius: 20,
          padding: "12px 14px",
          marginBottom: 3,
          marginTop: 15,
          background: "linear-gradient(180deg,#18181A,#0F0F11)",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 6px 18px rgba(0,0,0,.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            fontWeight: 700,
            color: T.gold,
          }}
        >
          <span>Sessions</span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 15,
              color: T.gold,
              textShadow:
                "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.55)",
            }}
          >
            {totalSessions}
          </span>
        </div>
      </div>

      {totalSessions === 0 && (
        <div style={{ ...card, fontSize: 13, color: T.text70 }}>
          Aucune session Training X01 trouvée pour cette période.
        </div>
      )}

      {totalSessions > 0 && (
        <>
          {/* Sparkline + choix de métrique */}
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
                Évolution des sessions
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {metricKeys.map((m) => (
                  <button
                    key={m}
                    type="button"
                    style={{
                      ...metricPill,
                      borderColor:
                        metric === m ? T.gold : "rgba(255,255,255,.18)",
                      boxShadow:
                        metric === m
                          ? "0 0 10px rgba(246,194,86,.7)"
                          : "none",
                      color: metric === m ? T.gold : T.text70,
                    }}
                    onClick={() => {
                      setMetric(m);
                      setMetricLocked(true);
                    }}
                  >
                    {m === "darts" && "Darts"}
                    {m === "avg3D" && "Moy.3D"}
                    {m === "pctS" && "%S"}
                    {m === "pctD" && "%D"}
                    {m === "pctT" && "%T"}
                    {m === "BV" && "Best Visit"}
                    {m === "CO" && "Checkout"}
                  </button>
                ))}
              </div>
            </div>

            {sparkSeries.length > 1 ? (
              <div style={{ marginTop: 4 }}>
                {/* Signature supposée de SparklinePro :
                    points = [{ x: timestamp, y: value }]
                 */}
                <SparklinePro
                  points={sparkSeries.map((p) => ({
                    x: p.x,
                    y: p.y,
                  }))}
                />
              </div>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                  marginTop: 4,
                }}
              >
                Il faut au moins 2 sessions pour afficher une courbe.
              </div>
            )}
          </div>

          {/* Radar + hits par segment + Mots du coach */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Radar + résumé segments */}
            <div style={{ ...card }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Radar de précision
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Signature supposée : darts = UIDart[] */}
                  <TrainingRadar darts={trainingDartsAll} />
                </div>
                <div
                  style={{
                    flexBasis: 130,
                    fontSize: 12,
                    color: T.text70,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, color: T.gold }}>
                    Segments clés
                  </div>
                  <div>
                    Hit préféré :{" "}
                    <span style={{ color: "#7CFF9A" }}>
                      {favoriteHitDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Simple favori :{" "}
                    <span style={{ color: "#47B5FF" }}>
                      {favoriteSimpleDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Double favori :{" "}
                    <span style={{ color: "#FFB8DE" }}>
                      {favoriteDoubleDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Triple favori :{" "}
                    <span style={{ color: "#FF9F43" }}>
                      {favoriteTripleDisplay ?? "-"}
                    </span>
                  </div>
                  <div>
                    Moins joué :{" "}
                    <span style={{ color: "#AAAAAA" }}>
                      {leastHitDisplay ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hits par segment (stack S/D/T) */}
            <div style={{ ...card }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Hits par segment (S / D / T)
              </div>

              {maxStackHits > 0 || chartMissCount > 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 4,
                    height: 120,
                    marginBottom: 6,
                    overflowX: "auto",
                    paddingBottom: 6,
                  }}
                >
                  {HITS_SEGMENTS.map((seg) => {
                    const label =
                      seg === "MISS"
                        ? "MISS"
                        : seg === 25
                        ? "25"
                        : String(seg);
                    if (seg === "MISS") {
                      const h =
                        maxStackHits > 0 || chartMissCount > 0
                          ? (chartMissCount / Math.max(maxStackHits, chartMissCount)) *
                            100
                          : 0;
                      return (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: 20,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: `${h}%`,
                              borderRadius: 4,
                              background:
                                "linear-gradient(180deg,#555,#999)",
                              boxShadow:
                                h > 0
                                  ? "0 0 8px rgba(255,255,255,.4)"
                                  : "none",
                            }}
                          />
                          <div
                            style={{
                              fontSize: 8,
                              marginTop: 2,
                              color: T.text70,
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    }

                    const key = String(seg);
                    const data = segSDTMap[key] || { S: 0, D: 0, T: 0 };
                    const total = data.S + data.D + data.T;
                    const base = maxStackHits || 1;
                    const hS = (data.S / base) * 100;
                    const hD = (data.D / base) * 100;
                    const hT = (data.T / base) * 100;

                    return (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: 20,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            display: "flex",
                            flexDirection: "column-reverse",
                            borderRadius: 4,
                            overflow: "hidden",
                            boxShadow:
                              total > 0
                                ? "0 0 8px rgba(255,255,255,.4)"
                                : "none",
                          }}
                        >
                          {hS > 0 && (
                            <div
                              style={{
                                height: `${hS}%`,
                                background:
                                  "linear-gradient(180deg,#47B5FF,#1F5F9F)",
                              }}
                            />
                          )}
                          {hD > 0 && (
                            <div
                              style={{
                                height: `${hD}%`,
                                background:
                                  "linear-gradient(180deg,#FF6FB5,#8F2B64)",
                              }}
                            />
                          )}
                          {hT > 0 && (
                            <div
                              style={{
                                height: `${hT}%`,
                                background:
                                  "linear-gradient(180deg,#FF9F43,#C25B0F)",
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 8,
                            marginTop: 2,
                            color: T.text70,
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: T.text70,
                  }}
                >
                  Pas assez de données pour afficher les hits par segment.
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
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

            {/* Mots du coach */}
            <div style={{ ...card }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {summaryTitle}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {summaryLines.map((line, idx) => (
                  <div key={idx}>• {line}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Liste des sessions */}
          <div style={{ ...card }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: T.text70,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Historique des sessions
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {pagedSessions.map((s) => {
                const hits = s.hitsS + s.hitsD + s.hitsT;
                const throws = hits + s.miss;
                const pctHitsSession =
                  throws > 0 ? (hits / throws) * 100 : null;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.08)",
                      padding: "8px 10px",
                      background:
                        "linear-gradient(180deg,#15171B,#0F1013)",
                      color: T.text,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: T.text70,
                        }}
                      >
                        {formatShortDate(s.date)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.gold,
                          fontWeight: 700,
                        }}
                      >
                        {s.avg3D.toFixed(1)} de moy. 3D
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: T.text70,
                      }}
                    >
                      <div>
                        Darts:{" "}
                        <span style={{ color: "#E5FFEF" }}>
                          {s.darts}
                        </span>
                      </div>
                      <div>
                        Hits:{" "}
                        <span style={{ color: "#7CFF9A" }}>{hits}</span>
                        {pctHitsSession !== null && (
                          <span> ({pctHitsSession.toFixed(1)}%)</span>
                        )}
                      </div>
                      <div>
                        BV:{" "}
                        <span style={{ color: "#FFB8DE" }}>
                          {s.bestVisit}
                        </span>
                      </div>
                      <div>
                        CO:{" "}
                        <span style={{ color: "#FF9F43" }}>
                          {s.bestCheckout ?? "-"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  color: T.text70,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(0,0,0,.4)",
                    color: page <= 1 ? "#666" : T.text,
                    cursor: page <= 1 ? "default" : "pointer",
                  }}
                >
                  ◀
                </button>
                <div>
                  Page{" "}
                  <span style={{ color: T.gold }}>{page}</span> /{" "}
                  <span>{totalPages}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page >= totalPages}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(0,0,0,.4)",
                    color: page >= totalPages ? "#666" : T.text,
                    cursor: page >= totalPages ? "default" : "pointer",
                  }}
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal détail session */}
      {selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            zIndex: 999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              borderRadius: 22,
              background:
                "linear-gradient(180deg,#18181C,#0D0E11)",
              border: "1px solid rgba(255,255,255,.18)",
              boxShadow: "0 18px 40px rgba(0,0,0,.7)",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: T.text70,
                  fontWeight: 700,
                }}
              >
                Session du {formatShortDate(selected.date)}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.3)",
                  background: "rgba(0,0,0,.4)",
                  color: T.text,
                  fontSize: 12,
                  padding: "2px 8px",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                fontSize: 12,
                color: T.text70,
                marginBottom: 8,
              }}
            >
              Moyenne 3D :{" "}
              <span style={{ color: T.gold, fontWeight: 700 }}>
                {selected.avg3D.toFixed(1)}
              </span>{" "}
              — Moyenne 1D :{" "}
              <span style={{ color: "#7CFF9A", fontWeight: 700 }}>
                {selected.avg1D.toFixed(2)}
              </span>
            </div>

            <div>
              <div style={statRowBox}>
                <span>Darts</span>
                <span>{selected.darts}</span>
              </div>
              <div style={statRowBox}>
                <span>Hits S</span>
                <span>{selected.hitsS}</span>
              </div>
              <div style={statRowBox}>
                <span>Hits D</span>
                <span>{selected.hitsD}</span>
              </div>
              <div style={statRowBox}>
                <span>Hits T</span>
                <span>{selected.hitsT}</span>
              </div>
              <div style={statRowBox}>
                <span>Miss</span>
                <span>{selected.miss}</span>
              </div>
              <div style={statRowBox}>
                <span>Bull / DBull</span>
                <span>
                  {selected.bull} / {selected.dBull}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Bust</span>
                <span>{selected.bust}</span>
              </div>
              <div style={statRowBox}>
                <span>Best Visit</span>
                <span>{selected.bestVisit}</span>
              </div>
              <div style={statRowBox}>
                <span>Best Checkout</span>
                <span>{selected.bestCheckout ?? "-"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
