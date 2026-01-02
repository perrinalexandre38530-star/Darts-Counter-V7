// ============================================
// src/components/EndOfLegOverlay.tsx
// Overlay "Résumé de la manche" — compact + labels FR
// (Compat total: accepte LegacyLegResult *ou* LegStats, sans rien modifier ailleurs)
// - AUCUNE écriture dans le pont ni profils (zéro side effects)
// - Calcule/fait des fallbacks pour toutes les valeurs manquantes
// - Graphs protégés (montage conditionnel)
// ============================================

import React from "react";
import * as StatsLite from "../lib/statsLiteIDB";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
  LabelList,
} from "recharts";

import type { LegStats } from "../lib/stats";

// --- Types légers (compat) ---
type PlayerMini = { id: string; name: string; avatarDataUrl?: string | null };

// --- Ancien schéma (compat) ---
export type LegacyLegResult = {
  legNo: number;
  winnerId: string;
  order?: string[];
  finishedAt: number;
  remaining: Record<string, number>;
  darts: Record<string, number>;
  visits: Record<string, number>;
  avg3: Record<string, number>;
  bestVisit?: Record<string, number>;
  bestCheckout?: Record<string, number | null>;
  x180?: Record<string, number>;
  doubles?: Record<string, number>;
  triples?: Record<string, number>;
  bulls?: Record<string, number>;
  visitSumsByPlayer?: Record<string, number[]>;
  checkoutDartsByPlayer?: Record<string, number[]>;
  hitsBySector?: Record<string, Record<string, number>>; // inclut "OB" et "IB"
  h60?: Record<string, number>;
  h100?: Record<string, number>;
  h140?: Record<string, number>;
  h180?: Record<string, number>;
  // Champs patch
  coHits?: Record<string, number>;
  coAtt?: Record<string, number>;
  points?: Record<string, number>;
  // variantes
  misses?: Record<string, number>;
  busts?: Record<string, number>;
  dbulls?: Record<string, number>;
  miss?: Record<string, number>;
  bust?: Record<string, number>;
  dbull?: Record<string, number>;
  missPct?: Record<string, number>;
  bustPct?: Record<string, number>;
  dbullPct?: Record<string, number>;
};

// --- Props ---
type Props = {
  open: boolean;
  result: LegacyLegResult | LegStats | null;
  playersById: Record<string, PlayerMini>;
  onClose: () => void;
  onReplay?: () => void;
  onSave?: (res: LegacyLegResult | LegStats) => void;
};

// ---------- Utils ----------
const n = (v: any) =>
  typeof v === "number" && isFinite(v) ? v : 0;
const f2 = (v: any) =>
  typeof v === "number" && isFinite(v)
    ? (Math.round(v * 100) / 100).toFixed(2)
    : "0.00";

const pctFmt = (hits: number, den: number) =>
  den > 0 ? `${((hits / den) * 100).toFixed(1)}%` : "0.0%";

function isLegStatsObj(x: any): x is LegStats {
  return x && typeof x === "object" && x.perPlayer && (x.players?.length ?? 0) > 0;
}

// ---------- Adapteurs NOUVELLES STATS ----------
function idsFromNew(leg: LegStats): string[] {
  if (Array.isArray(leg.players) && typeof leg.players[0] === "string") {
    return leg.players as unknown as string[];
  }
  return (leg.players as Array<{ id: string }>).map((p) => p.id);
}

function visitsFromNew(leg: LegStats, pid: string) {
  const st: any = leg.perPlayer?.[pid] ?? {};
  const d = n(st.darts ?? st.dartsThrown);
  return n(st.visits ?? (d ? Math.ceil(d / 3) : 0));
}

function avg3FromNew(leg: LegStats, pid: string) {
  const st: any = leg.perPlayer?.[pid] ?? {};
  if (typeof st.avg3 === "number") return st.avg3;
  const v = visitsFromNew(leg, pid);
  const scored = n(st.totalScored ?? st.points ?? st.pointsSum);
  if (v > 0 && scored) return scored / v; // avg3 = points/volée dans ton app
  const d = n(st.darts ?? st.dartsThrown);
  return d > 0 ? (scored / d) * 3 : 0;
}

function remainingFromNew(leg: LegStats, pid: string) {
  const st: any = leg.perPlayer?.[pid] ?? {};
  const start = n((leg as any).startScore ?? (leg as any).start ?? 501);

  // 🔹 1) priorité aux valeurs "officielles" de remaining
  //    - par joueur : perPlayer[pid].remaining
  //    - au niveau racine : leg.remaining[pid]
  const perPlayerRem = st.remaining;
  const rootRem =
    (leg as any).remaining && typeof (leg as any).remaining[pid] === "number"
      ? (leg as any).remaining[pid]
      : undefined;

  if (typeof perPlayerRem === "number" && isFinite(perPlayerRem)) {
    return Math.max(0, Math.round(perPlayerRem));
  }
  if (typeof rootRem === "number" && isFinite(rootRem)) {
    return Math.max(0, Math.round(rootRem));
  }

  // 🔹 2) points directs si dispo
  let scored = n(st.totalScored ?? st.points ?? st.pointsSum);

  // 🔹 3) Fallback: avg3 * volées
  if (!scored) {
    const avg3 =
      typeof st.avg3 === "number" && isFinite(st.avg3) ? st.avg3 : 0;
    const v = visitsFromNew(leg, pid);
    if (avg3 && v) {
      scored = avg3 * v;
    }
  }

  const approx = Math.max(0, start - scored);

  // 🔹 4) on arrondit toujours à l'entier → plus de 340.98
  return Math.max(0, Math.round(approx));
}

function bestVisitFromNew(leg: LegStats, pid: string) {
  const st: any = leg.perPlayer?.[pid] ?? {};
  return n(st.bestVisit ?? st.best ?? st.maxVisit ?? st.bins?.maxVisit);
}

function powerBucketsFromNew(leg: LegStats, pid: string) {
  const st: any = leg.perPlayer?.[pid] ?? {};
  const b = st.bins || st.buckets || {};
  return {
    h60: n(b["60+"] ?? b["60"] ?? 0),
    h100: n(b["100+"] ?? 0),
    h140: n(b["140+"] ?? 0),
    h180: n(b["180"] ?? 0),
  };
}

function impactsFromNew(leg: LegStats, pid: string) {
  const st: any = leg.perPlayer?.[pid] ?? {};
  const r = st.rates || {};
  const darts = n(st.darts ?? st.dartsThrown);
  const doubles = n(st.doubles ?? r.dblHits ?? 0);
  const triples = n(st.triples ?? r.triHits ?? 0);
  const ob = n(st.ob ?? r.bullHits ?? 0);
  const ib = n(st.ib ?? r.dbullHits ?? 0);
  const bulls = ob + ib;
  return {
    doubles,
    triples,
    ob,
    ib,
    bulls,
    pDB: pctFmt(doubles, darts),
    pTP: pctFmt(triples, darts),
    pBull: pctFmt(ob, darts),
    pDBull: pctFmt(ib, darts),
  };
}

function checkoutFromNew(leg: LegStats, pid: string) {
  const st: any = leg.perPlayer?.[pid] ?? {};

  // On accepte plusieurs conventions possibles :
  // - st.co = { hits, attempts, dartsTotal, avgDarts, highestCO / best }
  // - ou des champs à plat : coHits, coAttempts, coDartsTotal, coAvgDarts, highestCO, bestCO…
  const co = st.co || st.checkout || {};

  const count = n(
    co.coHits ??
      co.hits ??
      st.coHits ??
      st.checkoutHits ??
      st.co_count ??
      0
  );

  const dartsTotal = n(
    co.coDartsTotal ??
      co.dartsTotal ??
      st.coDartsTotal ??
      st.checkoutDartsTotal ??
      st.co_darts_total ??
      0
  );

  let avg = n(
    co.avgCODarts ??
      co.avgDarts ??
      st.coAvgDarts ??
      st.checkoutAvgDarts ??
      st.co_avg_darts ??
      0
  );

  if (!avg && count && dartsTotal) {
    avg = dartsTotal / count;
  }

  const hi = n(
    co.highestCO ??
      co.best ??
      st.highestCO ??
      st.bestCO ??
      st.coBest ??
      0
  );

  return { coCount: count, coDartsAvg: avg, highestCO: hi };
}

function rowFromNew(leg: LegStats, pid: string, nameOf: (id: string) => string) {
  const st: any = leg.perPlayer?.[pid] ?? {};

  // 🎯 1) valeur "officielle" de remaining si elle existe
  const explicitPer =
    typeof st.remaining === "number" && isFinite(st.remaining)
      ? st.remaining
      : null;
  const explicitRoot =
    (leg as any).remaining &&
    typeof (leg as any).remaining[pid] === "number" &&
    isFinite((leg as any).remaining[pid])
      ? (leg as any).remaining[pid]
      : null;

  const remainingRaw =
    explicitPer !== null ? explicitPer : explicitRoot !== null ? explicitRoot : null;

  // 🎯 2) fallback calculé si rien n’est fourni par le moteur
  const remaining =
    remainingRaw !== null ? remainingRaw : remainingFromNew(leg, pid);

  const darts = n(
    (leg as any).perPlayer?.[pid]?.darts ??
      (leg as any).perPlayer?.[pid]?.dartsThrown ??
      0
  );
  const visits = visitsFromNew(leg, pid);
  const avg3 = avg3FromNew(leg, pid);
  const best = bestVisitFromNew(leg, pid);
  const p = powerBucketsFromNew(leg, pid);
  const imp = impactsFromNew(leg, pid);
  const co = checkoutFromNew(leg, pid);

  return {
    pid,
    name: nameOf(pid),
    remainingRaw,                    // 👈 on garde la valeur brute
    remaining,                       // 👈 valeur finale (brute ou fallback)
    avg3,
    best,
    darts,
    visits,
    h60: p.h60,
    h100: p.h100,
    h140: p.h140,
    h180: p.h180,
    doubles: imp.doubles,
    triples: imp.triples,
    ob: imp.ob,
    ib: imp.ib,
    bulls: imp.bulls,
    pDB: imp.pDB,
    pTP: imp.pTP,
    pBull: imp.pBull,
    pDBull: imp.pDBull,
    coCount: co.coCount,
    coDartsAvg: co.coDartsAvg,
    highestCO: co.highestCO,
  };
}

function sortOrderNew(leg: LegStats, ids: string[]) {
  return ids.slice().sort((a, b) => {
    const ra = remainingFromNew(leg, a);
    const rb = remainingFromNew(leg, b);
    if ((ra === 0) !== (rb === 0)) return ra === 0 ? -1 : 1;
    if (ra !== rb) return ra - rb;
    const aa = avg3FromNew(leg, a);
    const ab = avg3FromNew(leg, b);
    return ab - aa;
  });
}

// ---------- Adapteur LEGACY ----------
function val(obj: Record<string, number> | undefined, k: string) {
  return obj ? n(obj[k]) : 0;
}

// Remaining legacy avec priorité au remaining brut, sinon fallback arrondi
function remainingFromLegacy(res: LegacyLegResult, pid: string) {
  const start = (res as any).startScore ?? (res as any).start ?? 501;

  if (res.remaining && typeof res.remaining[pid] === "number") {
    return Math.max(0, Math.round(res.remaining[pid]));
  }

  let pts = n(res.points?.[pid]);

  if (!pts) {
    const darts = val(res.darts, pid);
    const visits = val(res.visits, pid) || (darts ? Math.ceil(darts / 3) : 0);
    const avg3 =
      typeof res.avg3?.[pid] === "number" ? n(res.avg3[pid]) : 0;
    if (avg3 && visits) {
      pts = avg3 * visits;
    }
  }

  const approx = Math.max(0, start - pts);
  return Math.max(0, Math.round(approx));
}

function rowFromLegacy(
  res: LegacyLegResult,
  pid: string,
  nameOf: (id: string) => string
) {
  const darts = val(res.darts, pid);
  const visits = val(res.visits, pid) || (darts ? Math.ceil(darts / 3) : 0);
  const avg3 =
    typeof res.avg3?.[pid] === "number"
      ? n(res.avg3[pid])
      : darts > 0
      ? (n(res.points?.[pid]) / darts) * 3
      : 0;

  const obRaw = res.hitsBySector?.[pid]?.["OB"] ?? res.bulls?.[pid] ?? 0;
  const ibRaw =
    res.hitsBySector?.[pid]?.["IB"] ??
    res.dbull?.[pid] ??
    res.dbulls?.[pid] ??
    0;

  const ob = n(obRaw);
  const ib = n(ibRaw);
  const bulls = ob + ib;

  const doubles = n(res.doubles?.[pid]);
  const triples = n(res.triples?.[pid]);

  const h60 = n(res.h60?.[pid] ?? 0);
  const h100 = n(res.h100?.[pid] ?? 0);
  const h140 = n(res.h140?.[pid] ?? 0);
  const h180 = n(res.h180?.[pid] ?? res.x180?.[pid] ?? 0);

  const coCount = n(
    res.coHits?.[pid] ?? res.checkoutDartsByPlayer?.[pid]?.length ?? 0
  );
  const coDartsAvgArr = res.checkoutDartsByPlayer?.[pid];
  const coDartsAvg =
    coCount && coDartsAvgArr?.length
      ? Number(f2(coDartsAvgArr.reduce((s, x) => s + x, 0) / coDartsAvgArr.length))
      : 0;
  const highestCO = n(res.bestCheckout?.[pid] ?? 0);

  // 🎯 remaining brut du moteur si dispo
  const explicitRem =
    typeof res.remaining?.[pid] === "number" && isFinite(res.remaining[pid])
      ? res.remaining[pid]
      : null;

  const remaining =
    explicitRem !== null ? explicitRem : remainingFromLegacy(res, pid);

  return {
    pid,
    name: nameOf(pid),
    remainingRaw: explicitRem,       // 👈 valeur brute éventuelle
    remaining,                       // 👈 valeur finale
    avg3,
    best: n(res.bestVisit?.[pid] ?? 0),
    darts,
    visits,
    h60,
    h100,
    h140,
    h180,
    doubles,
    triples,
    ob,
    ib,
    bulls,
    pDB: pctFmt(doubles, darts),
    pTP: pctFmt(triples, darts),
    pBull: pctFmt(ob, darts),
    pDBull: pctFmt(ib, darts),
    coCount,
    coDartsAvg,
    highestCO,
  };
}

function sortOrderLegacy(res: LegacyLegResult, ids: string[]) {
  const order =
    Array.isArray(res.order) && res.order.length
      ? res.order.slice()
      : ids.slice().sort((a, b) => {
          const ra = remainingFromLegacy(res, a);
          const rb = remainingFromLegacy(res, b);
          if ((ra === 0) !== (rb === 0)) return ra === 0 ? -1 : 1;
          const aa = n(res.avg3?.[a]);
          const ab = n(res.avg3?.[b]);
          return ab - aa;
        });
  return order;
}

// ---------- Composant principal ----------
export default function EndOfLegOverlay({
  open,
  result,
  playersById,
  onClose,
  onReplay,
  onSave,
}: Props) {
  if (!open || !result) return null;
  return (
    <Inner
      result={result}
      playersById={playersById}
      onClose={onClose}
      onReplay={onReplay}
      onSave={onSave}
    />
  );
}

function Inner({
  result,
  playersById,
  onClose,
  onReplay,
  onSave,
}: {
  result: LegacyLegResult | LegStats;
  playersById: Record<string, PlayerMini>;
  onClose: () => void;
  onReplay?: () => void;
  onSave?: (res: LegacyLegResult | LegStats) => void;
}) {
  const nameOf = React.useCallback(
    (id?: string | null) => playersById[id || ""]?.name ?? (id || "—"),
    [playersById]
  );
  const avatarOf = React.useCallback(
    (id?: string | null) => playersById[id || ""]?.avatarDataUrl ?? null,
    [playersById]
  );

  // --- rows bruts ---
  const rowsRaw = React.useMemo(() => {
    if ((result as any)?.legacy) {
      const r = (result as any).legacy as LegacyLegResult;
      const ids =
        Object.keys(r?.remaining || {}).length > 0
          ? Object.keys(r.remaining)
          : Object.keys(r?.avg3 || {});
      const ord = sortOrderLegacy(r, ids);
      return ord.map((pid) => rowFromLegacy(r, pid, nameOf));
    }
    if (isLegStatsObj(result)) {
      const ids = idsFromNew(result);
      const ord = sortOrderNew(result, ids);
      return ord.map((pid) => rowFromNew(result, pid, nameOf));
    } else {
      const r = result as LegacyLegResult;
      const ids = Object.keys(r.remaining || r.avg3 || {});
      const ord = sortOrderLegacy(r, ids);
      return ord.map((pid) => rowFromLegacy(r, pid, nameOf));
    }
  }, [result, nameOf]);

  const legNo =
    (isLegStatsObj(result)
      ? (result as any).legNo
      : (result as LegacyLegResult).legNo) ?? 1;
  const finishedAt = isLegStatsObj(result)
    ? (result as any).finishedAt ?? Date.now()
    : (result as LegacyLegResult).finishedAt ?? Date.now();
  const winnerId: string | null = isLegStatsObj(result)
    ? (result as any).winnerId ?? rowsRaw[0]?.pid ?? null
    : (result as LegacyLegResult).winnerId ?? rowsRaw[0]?.pid ?? null;

  const finishedLabel = new Date(finishedAt).toLocaleString();

  // 🔁 Ré-ordonnancement : on force le vainqueur en 1ère place
  const rows = React.useMemo(() => {
    if (!winnerId) return rowsRaw;
    const idx = rowsRaw.findIndex((r) => r.pid === winnerId);
    if (idx <= 0) return rowsRaw;
    const copy = rowsRaw.slice();
    const [winnerRow] = copy.splice(idx, 1);
    copy.unshift(winnerRow);
    return copy;
  }, [rowsRaw, winnerId]);

  // --- Best-of pour le résumé ---
  const minDarts = Math.min(
    ...rows.map((r) => (r.darts > 0 ? r.darts : Infinity))
  );
  const minDartsRow = rows.find((r) => r.darts === minDarts) || null;
  const bestAvg = Math.max(...rows.map((r) => r.avg3 || 0));
  const bestAvgRow = rows.find((r) => r.avg3 === bestAvg) || null;
  const bestVol = Math.max(...rows.map((r) => r.best || 0));
  const bestVolRow = rows.find((r) => r.best === bestVol) || null;

  const bestPDBRow =
    rows.slice().sort(
      (a, b) => parseFloat(String(b.pDB)) - parseFloat(String(a.pDB))
    )[0] || null;
  const bestPTPRow =
    rows.slice().sort(
      (a, b) => parseFloat(String(b.pTP)) - parseFloat(String(a.pTP))
    )[0] || null;
  const bestBullRow =
    rows.slice().sort((a, b) => (b.bulls || 0) - (a.bulls || 0))[0] || null;

  // -----------------------------
  // Graph bar data (Moy. 3D) + avatars + couleurs
  // -----------------------------
  const barColors = [
    "#f0b12a",
    "#7fe2a9",
    "#6ab7ff",
    "#ff9ad4",
    "#c3a3ff",
    "#7de3ff",
    "#ffb870",
  ];

  const barData = React.useMemo(
    () =>
      rows.map((r, idx) => ({
        pid: r.pid,
        name: r.name,
        avg3: Number(f2(r.avg3)),
        avatar: avatarOf(r.pid),
        color: barColors[idx % barColors.length],
      })),
    [rows, avatarOf]
  );

  // Label halo lumineux au-dessus des barres
  const renderGlowLabel = React.useCallback(
    (props: any) => {
      const { x, y, width, value, index } = props;
      if (value == null || isNaN(Number(value))) return null;
      const entry = barData[index] || {};
      const color = entry.color || "#f0b12a";
      const text = String(value);
      const cx = (x || 0) + (width || 0) / 2;
      const cy = (y || 0) - 6;

      return (
        <g>
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            fill={color}
            opacity={0.25}
            style={{ filter: "blur(2px)" }}
            fontSize={11}
            fontWeight={900}
          >
            {text}
          </text>
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            fill={color}
            fontSize={11}
            fontWeight={900}
          >
            {text}
          </text>
        </g>
      );
    },
    [barData]
  );

  // Avatar médaillon à l'intérieur de la barre
  const renderAvatarLabel = React.useCallback(
    (props: any) => {
      const { x, y, width, height, index } = props;
      const entry = barData[index];
      if (!entry || !entry.avatar) return null;

      const w = Number(width || 0);
      const h = Number(height || 0);
      if (!w || !h) return null;

      const cx = Number(x || 0) + w / 2;
      const cy = Number(y || 0) + h / 2;

      const size = Math.min(w, h) * 0.7;
      const half = size / 2;

      return (
        <g>
          <defs>
            <clipPath id={`clip-${entry.pid}`}>
              <circle cx={cx} cy={cy} r={half} />
            </clipPath>
          </defs>
          <image
            href={entry.avatar}
            xlinkHref={entry.avatar}
            x={cx - half}
            y={cy - half}
            width={size}
            height={size}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-${entry.pid})`}
            opacity={0.95}
          />
          {/* double anneau de couleur */}
          <circle
            cx={cx}
            cy={cy}
            r={half}
            stroke={entry.color}
            strokeWidth={1.6}
            fill="none"
            opacity={0.95}
          />
          <circle
            cx={cx}
            cy={cy}
            r={half + 2}
            stroke={entry.color}
            strokeWidth={1}
            fill="none"
            opacity={0.5}
          />
        </g>
      );
    },
    [barData]
  );

  // Radar: hits "Singles / Doubles / Triples / Bulls" par joueur
  const radarData = React.useMemo(() => {
    if (!rows.length) return [];
    const metrics = ["Singles", "Doubles", "Triples", "Bulls"] as const;
    return metrics.map((metric) => {
      const obj: any = { metric };
      rows.forEach((r) => {
        const singles = Math.max(
          (r.darts || 0) -
            (r.doubles || 0) -
            (r.triples || 0) -
            (r.ob || 0) -
            (r.ib || 0),
          0
        );
        const bulls = (r.bulls || 0) + (r.ob || 0) + (r.ib || 0);
        let v = 0;
        if (metric === "Singles") v = singles;
        if (metric === "Doubles") v = r.doubles || 0;
        if (metric === "Triples") v = r.triples || 0;
        if (metric === "Bulls") v = bulls;
        obj[r.pid] = v;
      });
      return obj;
    });
  }, [rows]);

  const [radarFilter, setRadarFilter] = React.useState<"ALL" | string>("ALL");
  const radarPlayers = React.useMemo(
    () =>
      radarFilter === "ALL"
        ? rows
        : rows.filter((r) => r.pid === radarFilter),
    [rows, radarFilter]
  );

  // Actions
  const handleSave = () => {
    try {
      const rowsLite = rowsForLite().map((r) => ({
        pid: r.pid,
        darts: Number(r.darts || 0),
        avg3: Number(r.avg3 || 0),
        best: Number(r.best || 0),
        highestCO: Number(r.highestCO || 0),
      }));

      if ((StatsLite as any)?.recordLegToLite) {
        (StatsLite as any).recordLegToLite({
          winnerId,
          rows: rowsLite,
        });
      } else {
        fallbackRecordLegToLite({ winnerId, rows: rowsLite });
      }
    } catch (e) {
      console.warn("[overlay] lite update failed", e);
    }

    try {
      onSave?.(result);
    } catch {}
    onClose();
  };

  function rowsForLite() {
    return rows || [];
  }

  // ---- Fallback robuste (écrit un cache minimal si le module n'exporte pas encore recordLegToLite) ----
  function fallbackRecordLegToLite(input: {
    winnerId: string | null;
    rows: Array<{
      pid: string;
      darts: number;
      avg3: number;
      best: number;
      highestCO?: number;
    }>;
  }) {
    const PFX = "dc:statslite:";
    for (const r of input.rows) {
      const key = PFX + r.pid;
      const cur = safeParse(localStorage.getItem(key)) || {
        games: 0,
        wins: 0,
        darts: 0,
        bestVisit: 0,
        bestCheckout: 0,
        avg3: 0,
        _sumAvg3: 0,
      };
      const games = cur.games + 1;
      const wins = cur.wins + (input.winnerId === r.pid ? 1 : 0);
      const darts = cur.darts + (isFinite(r.darts) ? r.darts : 0);
      const bestVisit = Math.max(
        cur.bestVisit || 0,
        isFinite(r.best) ? r.best : 0
      );
      const bestCheckout = Math.max(
        cur.bestCheckout || 0,
        isFinite(r.highestCO || 0) ? r.highestCO || 0 : 0
      );
      const _sumAvg3 =
        (cur._sumAvg3 || cur.avg3 * (cur.games || 0)) +
        (isFinite(r.avg3) ? r.avg3 : 0);
      const avg3 = games ? _sumAvg3 / games : 0;

      localStorage.setItem(
        key,
        JSON.stringify({
          games,
          wins,
          darts,
          bestVisit,
          bestCheckout,
          avg3,
          _sumAvg3,
        })
      );
    }
    try {
      window.dispatchEvent(
        new CustomEvent("stats-lite:changed", {
          detail: { playerId: "*" },
        })
      );
      localStorage.setItem("dc:statslite:version", String(Date.now()));
    } catch {}
  }

  function safeParse(s: string | null) {
    try {
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  // --- UI ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        color: "#e7e7e7",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 96vw)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 14,
          background: "linear-gradient(180deg, #17181c, #101116)",
          border: "1px solid rgba(255,255,255,.08)",
          boxShadow: "0 16px 44px rgba(0,0,0,.45)",
          fontSize: 12,
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "linear-gradient(180deg, #1a1b20, #13141a)",
            borderBottom: "1px solid rgba(255,255,255,.08)",
            padding: "8px 10px",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              color: "var(--dc-accent, #f0b12a)",
              fontSize: 14,
            }}
          >
            Résumé de la manche #{legNo}
          </div>
          <div
            style={{
              opacity: 0.7,
              fontSize: 11,
              marginLeft: 6,
            }}
          >
            Manche terminée — {finishedLabel}
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            title="Fermer"
            style={btn("transparent", "#ddd", "#ffffff22")}
          >
            ✕
          </button>
        </div>

        {/* Corps */}
        <div style={{ padding: 10, paddingTop: 8 }}>
          {/* Classement (liste joueurs) */}
<div
  style={{
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.07)",
    background:
      "linear-gradient(180deg, rgba(28,28,32,.65), rgba(18,18,20,.65))",
    marginBottom: 10,
  }}
>
  {rows.map((r, idx) => {
    const avatar = avatarOf(r.pid);
    const isWinner = r.pid === winnerId;

    // 👉 valeur brute "remaining" venant du moteur si dispo
    const remainingRaw =
      typeof (r as any).remainingRaw === "number" &&
      isFinite((r as any).remainingRaw)
        ? (r as any).remainingRaw
        : null;

    // 👉 valeur calculée de secours si rien de brut
    const remainingComputed =
      typeof r.remaining === "number" && isFinite(r.remaining)
        ? r.remaining
        : 0;

    // 👉 on affiche en priorité la valeur brute, sinon le calcul
    const remainingForDisplay =
      remainingRaw !== null ? remainingRaw : remainingComputed;

    // 👉 vainqueur = 0, les autres = points restants arrondis
    const displayScore = isWinner
      ? 0
      : Math.max(0, Math.round(remainingForDisplay));

    return (
      <div
        key={r.pid}
        style={{
          padding: "6px 8px",
          display: "grid",
          gridTemplateColumns: "26px 36px 1fr auto",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid rgba(255,255,255,.06)",
          background: isWinner
            ? "radial-gradient(circle at 0% 0%, rgba(127,226,169,.28), transparent 55%)"
            : "transparent",
          boxShadow: isWinner
            ? "0 0 22px rgba(127,226,169,.35)"
            : "0 0 0 rgba(0,0,0,0)",
          transition: "background .18s, box-shadow .18s",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "rgba(255,255,255,.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            color: "var(--dc-accent, #ffcf57)",
            fontSize: 12,
          }}
        >
          {idx + 1}
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            overflow: "hidden",
            background: "rgba(255,255,255,.08)",
          }}
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#999",
                fontWeight: 700,
              }}
            >
              ?
            </div>
          )}
        </div>
        <div
          style={{
            fontWeight: 800,
            color: isWinner
              ? "#7fe2a9"
              : "var(--dc-accent, #ffcf57)",
            fontSize: 13,
          }}
        >
          {r.name}
        </div>
        <div
          style={{
            fontWeight: 900,
            color: isWinner
              ? "#7fe2a9"
              : "var(--dc-accent, #ffcf57)",
          }}
        >
          {displayScore}
        </div>
      </div>
    );
  })}
</div>

          {/* Résumé en KPI */}
          <Accordion title="Résumé de la manche" defaultOpen>
            <SummaryRows
              winnerName={nameOf(winnerId || "")}
              minDartsRow={minDartsRow}
              bestAvgRow={bestAvgRow}
              bestVolRow={bestVolRow}
              bestPDBRow={bestPDBRow}
              bestPTPRow={bestPTPRow}
              bestBullRow={bestBullRow}
              fmt2={f2}
            />
          </Accordion>

          {/* Stats rapides */}
          <Accordion title="Stats rapides">
            <div style={{ overflowX: "auto" }}>
              <table style={tableBase}>
                <thead>
                  <tr>
                    <TH>Joueur</TH>
                    <TH>Volées</TH>
                    <TH>Darts</TH>
                    <TH>Moy./3D</TH>
                    <TH>60+</TH>
                    <TH>100+</TH>
                    <TH>140+</TH>
                    <TH>180</TH>
                    <TH>Best Visit</TH>
                    <TH>CO best</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`fast-${r.pid}`} style={rowLine}>
                      <TDStrong>{r.name}</TDStrong>
                      <TD>{r.visits}</TD>
                      <TD>{r.darts}</TD>
                      <TD>{f2(r.avg3)}</TD>
                      <TD>{r.h60}</TD>
                      <TD>{r.h100}</TD>
                      <TD>{r.h140}</TD>
                      <TD>{r.h180}</TD>
                      <TD>{r.best}</TD>
                      <TD>{r.highestCO ?? 0}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          {/* Stats Darts */}
          <Accordion title="Stats Darts">
  <div style={{ overflowX: "auto" }}>
    <table style={tableBase}>
      <thead>
        <tr>
          <TH>Joueur</TH>
          <TH>CO</TH>
          <TH>Darts CO</TH>
          <TH>DB</TH>
          <TH>TP</TH>
          <TH>Bull</TH>
          <TH>DBull</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`darts-${r.pid}`} style={rowLine}>
            <TDStrong>{r.name}</TDStrong>
            <TD>{r.coCount}</TD>
            <TD>{f2(r.coDartsAvg)}</TD>
            <TD>{r.doubles}</TD>
            <TD>{r.triples}</TD>
            <TD>{r.ob}</TD>
            <TD>{r.ib}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</Accordion>

          {/* Stats globales */}
          <Accordion title="Stats globales">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  ...tableBase,
                  minWidth: 620,
                }}
              >
                <thead>
                  <tr>
                    <TH>#</TH>
                    <TH>Joueur</TH>
                    <TH>Moy./3D</TH>
                    <TH>Pts Max</TH>
                    <TH>Darts</TH>
                    <TH>%DB</TH>
                    <TH>%TP</TH>
                    <TH>%Bull</TH>
                    <TH>%DBull</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`global-${r.pid}`} style={rowLine}>
                      <TD>{i + 1}</TD>
                      <TDStrong>{r.name}</TDStrong>
                      <TD>{f2(r.avg3)}</TD>
                      <TD>{r.best}</TD>
                      <TD>{r.darts}</TD>
                      <TD>{r.pDB}</TD>
                      <TD>{r.pTP}</TD>
                      <TD>{r.pBull}</TD>
                      <TD>{r.pDBull}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          {/* Graphs */}
          <Accordion title="Graphiques — hits & moyennes">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* RADAR HITS */}
              <ChartCard>
                {/* Filtres joueurs (Tous / 1 joueur) */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 6,
                    marginBottom: 6,
                    fontSize: 11,
                  }}
                >
                  <button
                    onClick={() => setRadarFilter("ALL")}
                    style={pillBtn(radarFilter === "ALL")}
                  >
                    Tous
                  </button>
                  {rows.map((r) => (
                    <button
                      key={`pill-${r.pid}`}
                      onClick={() => setRadarFilter(r.pid)}
                      style={pillBtn(radarFilter === r.pid)}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>

                {radarData.length && radarPlayers.length ? (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.8,
                        marginBottom: 4,
                        textAlign: "center",
                      }}
                    >
                      Profil de hits (Singles / Doubles / Triples / Bulls)
                    </div>
                    <ResponsiveContainer width="100%" height={230}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        {radarPlayers.map((r, idx) => {
                          const colors = [
                            "#7fe2a9",
                            "#f5c25c",
                            "#6ab7ff",
                            "#ff9ad4",
                            "#c3a3ff",
                            "#7de3ff",
                          ];
                          const c = colors[idx % colors.length];
                          return (
                            <Radar
                              key={`radar-${r.pid}`}
                              name={r.name}
                              dataKey={r.pid}
                              stroke={c}
                              fill={c}
                              fillOpacity={0.25}
                            />
                          );
                        })}
                      </RadarChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <ChartPlaceholder />
                )}
              </ChartCard>

              {/* BAR MOYENNE 3D */}
              <ChartCard>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginBottom: 4,
                    textAlign: "center",
                  }}
                >
                  Moyenne 3 darts par joueur
                </div>
                {barData.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={barData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />

                        <Bar
                          dataKey="avg3"
                          radius={[6, 6, 0, 0]}
                          label={renderGlowLabel}
                        >
                          {barData.map((entry) => (
                            <Cell
                              key={`cell-${entry.pid}`}
                              fill={entry.color}
                              stroke={entry.color}
                              strokeWidth={1}
                            />
                          ))}
                          {/* avatars à l'intérieur des barres */}
                          <LabelList
                            dataKey="avg3"
                            content={renderAvatarLabel}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        opacity: 0.7,
                        textAlign: "center",
                      }}
                    >
                      Hauteur de la barre = Moyenne de points par volée
                      (Moy./3D)
                    </div>
                  </>
                ) : (
                  <ChartPlaceholder />
                )}
              </ChartCard>
            </div>
          </Accordion>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "flex-end",
              marginTop: 10,
            }}
          >
            {onReplay && (
              <button
                onClick={onReplay}
                style={btn("transparent", "#ddd", "#ffffff22")}
              >
                Rejouer la manche
              </button>
            )}
            {result && (
              <button
                onClick={handleSave}
                style={btn(
                  "linear-gradient(180deg, #f0b12a, #c58d19)",
                  "#141417"
                )}
              >
                Sauvegarder
              </button>
            )}
            <button
              onClick={onClose}
              style={btn("transparent", "#ddd", "#ffffff22")}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Résumé -> KPI lumineux MULTI-COLONNES ----------
function SummaryRows({
  winnerName,
  minDartsRow,
  bestAvgRow,
  bestVolRow,
  bestPDBRow,
  bestPTPRow,
  bestBullRow,
  fmt2,
}: any) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 8,
      }}
    >
      <KPIBlock
        label="Vainqueur"
        color="gold"
        playerName={winnerName || "—"}
        stat=""
      />

      <KPIBlock
        label="Min darts"
        color="green"
        playerName={minDartsRow?.name || "—"}
        stat={
          minDartsRow?.darts != null ? String(minDartsRow.darts) : "—"
        }
      />

      <KPIBlock
        label="Best Moy./3D"
        color="blue"
        playerName={bestAvgRow?.name || "—"}
        stat={bestAvgRow ? fmt2(bestAvgRow.avg3) : "—"}
      />

      <KPIBlock
        label="Best volée"
        color="pink"
        playerName={bestVolRow?.name || "—"}
        stat={
          bestVolRow?.best != null ? String(bestVolRow.best) : "—"
        }
      />

      <KPIBlock
        label="Best %DB"
        color="purple"
        playerName={bestPDBRow?.name || "—"}
        stat={bestPDBRow?.pDB || "—"}
      />

      <KPIBlock
        label="Best %TP"
        color="orange"
        playerName={bestPTPRow?.name || "—"}
        stat={bestPTPRow?.pTP || "—"}
      />

      <KPIBlock
        label="Best Bull"
        color="cyan"
        playerName={bestBullRow?.name || "—"}
        stat={
          bestBullRow?.bulls != null
            ? String(bestBullRow.bulls)
            : "—"
        }
        extra={
          bestBullRow
            ? `OB ${bestBullRow.ob ?? 0} + IB ${bestBullRow.ib ?? 0}`
            : ""
        }
      />
    </div>
  );
}

// ---------- UI helpers ----------
function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div
      style={{
        marginTop: 8,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "linear-gradient(180deg, rgba(28,28,32,.65), rgba(18,18,20,.65))",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          color: "#e7e7e7",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 12,
        }}
      >
        <span
          style={{
            color: "var(--dc-accent, #f0b12a)",
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            border: "1px solid rgba(255,255,255,.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
        >
          ▾
        </span>
      </button>
      <div
        style={{
          overflow: "hidden",
          transition: "grid-template-rows 180ms ease",
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
        }}
      >
        <div
          style={{
            overflow: "hidden",
            padding: open ? "0 10px 10px" : "0 10px 0",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 10,
        background: "rgba(255,255,255,.03)",
        padding: 6,
        minHeight: 200,
        minWidth: 260,
      }}
    >
      {children}
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div
      style={{
        height: 230,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.6,
        fontStyle: "italic",
      }}
    >
      Préparation du graphe…
    </div>
  );
}

const tableBase: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 520,
  fontSize: 12,
};
const rowLine: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,.06)",
};

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "6px 8px",
        fontSize: 11,
        color: "var(--dc-accent, #ffcf57)",
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}
function TD({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "6px 8px",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
function TDStrong({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "6px 8px",
        fontSize: 12,
        fontWeight: 800,
        color: "var(--dc-accent, #ffcf57)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

// --- Nouveau helper KPI lumineux ---
function KPIBlock({
  label,
  playerName,
  stat,
  color,
  extra,
}: {
  label: string;
  playerName: string;
  stat: string;
  extra?: string;
  color:
    | "gold"
    | "green"
    | "blue"
    | "pink"
    | "purple"
    | "orange"
    | "cyan"
    | "red"
    | string;
}) {
  const palette: Record<
    string,
    {
      border: string;
      glow: string;
      gradFrom: string;
      gradTo: string;
      text: string;
    }
  > = {
    gold: {
      border: "rgba(240,177,42,.8)",
      glow: "rgba(240,177,42,.55)",
      gradFrom: "#3b2a10",
      gradTo: "#20150a",
      text: "#ffd875",
    },
    green: {
      border: "rgba(127,226,169,.8)",
      glow: "rgba(127,226,169,.55)",
      gradFrom: "#103322",
      gradTo: "#081c13",
      text: "#9cf5c8",
    },
    blue: {
      border: "rgba(86,180,255,.85)",
      glow: "rgba(86,180,255,.55)",
      gradFrom: "#10263b",
      gradTo: "#081521",
      text: "#b7ddff",
    },
    pink: {
      border: "rgba(255,146,208,.85)",
      glow: "rgba(255,146,208,.55)",
      gradFrom: "#3a1230",
      gradTo: "#20091a",
      text: "#ffc4ea",
    },
    purple: {
      border: "rgba(186,148,255,.85)",
      glow: "rgba(186,148,255,.55)",
      gradFrom: "#2e1545",
      gradTo: "#190b26",
      text: "#ddc6ff",
    },
    orange: {
      border: "rgba(255,180,120,.85)",
      glow: "rgba(255,180,120,.55)",
      gradFrom: "#3b2313",
      gradTo: "#1f130b",
      text: "#ffd1a0",
    },
    cyan: {
      border: "rgba(120,235,255,.85)",
      glow: "rgba(120,235,255,.55)",
      gradFrom: "#10343b",
      gradTo: "#071d21",
      text: "#c5f6ff",
    },
    red: {
      border: "rgba(255,120,120,.85)",
      glow: "rgba(255,120,120,.55)",
      gradFrom: "#3b1616",
      gradTo: "#200b0b",
      text: "#ffc0c0",
    },
  };

  const c = palette[color] || palette.gold;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 10,
        border: `1px solid ${c.border}`,
        padding: "7px 9px",
        background: `radial-gradient(circle at 0% 0%, ${c.glow}, transparent 55%), linear-gradient(180deg, ${c.gradFrom}, ${c.gradTo})`,
        boxShadow: `0 0 18px ${c.glow}`,
        overflow: "hidden",
        fontSize: 12,
      }}
    >
      <div
        style={{
          opacity: 0.85,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          fontSize: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
          minHeight: 20,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            color: c.text,
            fontSize: 12,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {playerName || "—"}
        </div>
        {stat && (
          <div
            style={{
              minWidth: 36,
              padding: "3px 7px",
              borderRadius: 999,
              background: "rgba(0,0,0,.35)",
              border: `1px solid ${c.border}`,
              textAlign: "center",
              fontWeight: 900,
              fontSize: 11,
              color: c.text,
            }}
          >
            {stat}
          </div>
        )}
      </div>
      {extra && (
        <div
          style={{
            marginTop: 2,
            fontSize: 10,
            opacity: 0.75,
          }}
        >
          {extra}
        </div>
      )}
    </div>
  );
}

function pillBtn(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: active
      ? "1px solid var(--dc-accent, #f0b12a)"
      : "1px solid rgba(255,255,255,.18)",
    padding: "3px 9px",
    background: active ? "rgba(240,177,42,.18)" : "rgba(0,0,0,.3)",
    color: active ? "#ffe2a0" : "#f0f0f0",
    fontWeight: active ? 800 : 600,
    fontSize: 11,
    cursor: "pointer",
  };
}

function btn(
  bg: string,
  fg: string,
  border?: string
): React.CSSProperties {
  return {
    appearance: "none",
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${border ?? "transparent"}`,
    background: bg,
    color: fg,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 12,
  };
}
