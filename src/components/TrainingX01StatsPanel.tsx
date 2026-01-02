// ============================================
// src/components/TrainingX01StatsPanel.tsx
// Dashboard Training X01 — Radar + Hits + 5 blocs rotatifs + Sessions
// Lit les résumés depuis localStorage
// ============================================

import React, { useMemo, useState, useEffect } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TrainingFinishStats } from "../pages/TrainingX01Play";

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

const T = {
  bg: "#111318",
  card: "#181B22",
  cardSoft: "#1F222B",
  borderSoft: "rgba(255,255,255,0.06)",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,0.70)",
  gold: "#F6C256",
  pink: "#FF6FAF",
  blue: "#66B8FF",
  greenSoft: "#4CE0B3",
  greenSoft2: "#6FF2C5",
  oilBlue: "#007A83",
  violet: "#7D3CFF",
};

// --------------------------------------------------
// Chargement localStorage
// --------------------------------------------------

function loadTrainingStats(): TrainingFinishStats[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TrainingFinishStats[];
  } catch {
    return [];
  }
}

// --------------------------------------------------
// TYPES internes (agrégations & helpers)
// --------------------------------------------------

type SegmentMultHits = {
  S: number;
  D: number;
  T: number;
};

type SegmentAgg = {
  segment: string; // "1".."20" ou "25" ou "MISS"
  total: number;
  S: number;
  D: number;
  T: number;
  miss?: number;
};

type SessionRow = {
  id: string;
  date: number;
  startScore: number;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number | null;
  hits: {
    S: number;
    D: number;
    T: number;
    miss: number;
    bull: number;
    dBull: number;
    bust: number;
  };
  segments: {
    [segment: string]: SegmentMultHits | undefined;
  };
};

// --------------------------------------------------
// Helpers de rotation pour les blocs
// --------------------------------------------------

type RotItem = {
  label: string;
  value: string;
  allowZero?: boolean;
};

function useRotatingItems(items: RotItem[], intervalMs: number) {
  const [index, setIndex] = useState(0);

  const safeItems = items.filter((it) => {
    if (it.value === "" || it.value === "NaN") return false;
    const numeric = Number(it.value.replace(/[^\d.-]/g, ""));
    if (!it.allowZero && numeric === 0) return false;
    if (Number.isNaN(numeric) && it.value === "0") return false;
    return true;
  });

  useEffect(() => {
    if (safeItems.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeItems.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [safeItems, intervalMs]);

  if (safeItems.length === 0) return null;
  return safeItems[index % safeItems.length];
}

// --------------------------------------------------
// Agrégation globale sur toutes les sessions
// --------------------------------------------------

function buildAggregates(sessions: TrainingFinishStats[]) {
  const sessionRows: SessionRow[] = sessions.map((s, idx) => {
    const hits = s.hits || {
      S: 0,
      D: 0,
      T: 0,
      miss: 0,
      bull: 0,
      dBull: 0,
      bust: 0,
    };
    const segments = (s as any).segments || {}; // pour compat sessions anciennes

    return {
      id: (s as any).id ?? `${s.date}-${idx}`,
      date: s.date,
      startScore: (s as any).startScore ?? 501,
      darts: s.darts,
      avg3: (s as any).avg3 ?? s.avg3D, // on mappe sur avg3D existant
      bestVisit: s.bestVisit,
      bestCheckout: (s as any).bestCheckout ?? (s as any).checkout ?? null,
      hits,
      segments,
    };
  });

  const nbSessions = sessions.length;
  if (nbSessions === 0) {
    return {
      nbSessions,
      totals: null,
      averages: null,
      records: null,
      segmentsGlobal: [] as SegmentAgg[],
      hitPrefere: null,
      sessions: sessionRows,
    };
  }

  let totalDarts = 0;
  let totalHitsS = 0;
  let totalHitsD = 0;
  let totalHitsT = 0;
  let totalMiss = 0;
  let totalBull = 0;
  let totalDBull = 0;
  let totalBust = 0;
  let totalCheckoutSucc = 0;

  let sumAvg3Weighted = 0;

  let bestVisit = 0;
  let bestCheckout = 0;
  const minDartsPerStart: Record<number, number> = {};
  let bestDoublesValue = 0;
  let bestTriplesValue = 0;
  let bestBullValue = 0;
  let bestDBullValue = 0;

  let bestMissMin = Number.POSITIVE_INFINITY;
  let bestMissMax = 0;
  let bestBustMin = Number.POSITIVE_INFINITY;
  let bestBustMax = 0;

  const segAggMap: Record<string, SegmentAgg> = {};

  const ensureSeg = (seg: string) => {
    if (!segAggMap[seg]) {
      segAggMap[seg] = { segment: seg, total: 0, S: 0, D: 0, T: 0, miss: 0 };
    }
    return segAggMap[seg];
  };

  sessionRows.forEach((s) => {
    totalDarts += s.darts;
    sumAvg3Weighted += (s.avg3 || 0) * (s.darts || 0);

    const { S, D, T, miss, bull, dBull, bust } = s.hits;
    totalHitsS += S;
    totalHitsD += D;
    totalHitsT += T;
    totalMiss += miss;
    totalBull += bull;
    totalDBull += dBull;
    totalBust += bust;

    if (s.bestVisit > bestVisit) bestVisit = s.bestVisit || 0;

    if ((s.bestCheckout || 0) > bestCheckout) bestCheckout = s.bestCheckout || 0;
    if (s.bestCheckout && s.bestCheckout > 0) totalCheckoutSucc += 1;

    if (s.darts > 0) {
      const current = minDartsPerStart[s.startScore] ?? Number.POSITIVE_INFINITY;
      if (s.darts < current) {
        minDartsPerStart[s.startScore] = s.darts;
      }
    }

    if (D > bestDoublesValue) bestDoublesValue = D;
    if (T > bestTriplesValue) bestTriplesValue = T;
    if (bull > bestBullValue) bestBullValue = bull;
    if (dBull > bestDBullValue) bestDBullValue = dBull;

    if (miss < bestMissMin) bestMissMin = miss;
    if (miss > bestMissMax) bestMissMax = miss;
    if (bust < bestBustMin) bestBustMin = bust;
    if (bust > bestBustMax) bestBustMax = bust;

    Object.keys(s.segments || {}).forEach((k) => {
      const segData = s.segments[k];
      if (!segData) return;
      const seg = ensureSeg(k);
      seg.S += segData.S;
      seg.D += segData.D;
      seg.T += segData.T;
      seg.total += segData.S + segData.D + segData.T;
    });

    if (bull || dBull) {
      const seg25 = ensureSeg("25");
      seg25.S += bull;
      seg25.D += dBull;
      seg25.total += bull + dBull;
    }

    if (miss) {
      const segMiss = ensureSeg("MISS");
      segMiss.miss = (segMiss.miss || 0) + miss;
      segMiss.total += miss;
    }
  });

  const avg3Global = totalDarts > 0 ? sumAvg3Weighted / totalDarts : 0;
  const avgDartsPerSession = nbSessions > 0 ? totalDarts / nbSessions : 0;

  const totals = {
    totalDarts,
    totalHitsS,
    totalHitsD,
    totalHitsT,
    totalMiss,
    totalBull,
    totalDBull,
    totalBust,
    totalCheckoutSucc,
  };

  const averages = {
    avg3Global,
    avgDartsPerSession,
    avgHitsSPerSession: nbSessions ? totalHitsS / nbSessions : 0,
    avgHitsDPerSession: nbSessions ? totalHitsD / nbSessions : 0,
    avgHitsTPerSession: nbSessions ? totalHitsT / nbSessions : 0,
    avgMissPerSession: nbSessions ? totalMiss / nbSessions : 0,
    avgBustPerSession: nbSessions ? totalBust / nbSessions : 0,
  };

  const records = {
    bestVisit,
    bestCheckout,
    minDartsPerStart,
    bestDoublesValue,
    bestTriplesValue,
    bestBullValue,
    bestDBullValue,
    bestMissMin: bestMissMin === Number.POSITIVE_INFINITY ? 0 : bestMissMin,
    bestMissMax,
    bestBustMin: bestBustMin === Number.POSITIVE_INFINITY ? 0 : bestBustMin,
    bestBustMax,
  };

  const segmentsGlobal = Object.values(segAggMap);

  let hitPrefere: SegmentAgg | null = null;
  segmentsGlobal.forEach((s) => {
    if (s.segment === "MISS") return;
    if (!hitPrefere || s.total > hitPrefere.total) {
      hitPrefere = s;
    }
  });

  return {
    nbSessions,
    totals,
    averages,
    records,
    segmentsGlobal,
    hitPrefere,
    sessions: sessionRows,
  };
}

// --------------------------------------------------
// Radar + Hits-by-segment data builders
// --------------------------------------------------

function buildRadarData(segmentsGlobal: SegmentAgg[]) {
  const order: string[] = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "25",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
  ];

  const map = new Map<string, SegmentAgg>();
  segmentsGlobal.forEach((s) => {
    if (s.segment === "MISS") return;
    map.set(s.segment, s);
  });

  return order.map((seg) => {
    const d = map.get(seg);
    return {
      segment: seg,
      hits: d ? d.total : 0,
    };
  });
}

function buildHitsBySegmentData(segmentsGlobal: SegmentAgg[]) {
  const labels = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "25",
    "MISS",
  ];

  const map = new Map<string, SegmentAgg>();
  segmentsGlobal.forEach((s) => {
    map.set(s.segment, s);
  });

  return labels.map((label) => {
    const d = map.get(label);
    if (!d) {
      if (label === "MISS") {
        return { segment: "MISS", S: 0, D: 0, T: 0, total: 0 };
      }
      return { segment: label, S: 0, D: 0, T: 0, total: 0 };
    }

    if (label === "MISS") {
      return {
        segment: "MISS",
        S: d.miss || 0,
        D: 0,
        T: 0,
        total: d.total,
      };
    }

    return {
      segment: label,
      S: d.S,
      D: d.D,
      T: d.T,
      total: d.total,
    };
  });
}

// --------------------------------------------------
// Modal détails session
// --------------------------------------------------

type SessionDetailModalProps = {
  session: SessionRow | null;
  onClose: () => void;
};

function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  const segmentsAgg = useMemo(() => {
    if (!session) return [] as SegmentAgg[];
    const map: Record<string, SegmentAgg> = {};
    const ensure = (seg: string) => {
      if (!map[seg]) {
        map[seg] = { segment: seg, total: 0, S: 0, D: 0, T: 0, miss: 0 };
      }
      return map[seg];
    };

    Object.keys(session.segments || {}).forEach((k) => {
      const segData = session.segments[k];
      if (!segData) return;
      const seg = ensure(k);
      seg.S += segData.S;
      seg.D += segData.D;
      seg.T += segData.T;
      seg.total += segData.S + segData.D + segData.T;
    });

    if (session.hits.bull || session.hits.dBull) {
      const s25 = ensure("25");
      s25.S += session.hits.bull;
      s25.D += session.hits.dBull;
      s25.total += session.hits.bull + session.hits.dBull;
    }

    if (session.hits.miss) {
      const sm = ensure("MISS");
      sm.miss = (sm.miss || 0) + session.hits.miss;
      sm.total += session.hits.miss;
    }

    return Object.values(map);
  }, [session]);

  const radarData = useMemo(() => buildRadarData(segmentsAgg), [segmentsAgg]);
  const hitsData = useMemo(() => buildHitsBySegmentData(segmentsAgg), [segmentsAgg]);

  if (!session) return null;

  const date = new Date(session.date);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 6000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "95%",
          maxWidth: 900,
          maxHeight: "90vh",
          background: T.card,
          borderRadius: 20,
          border: `1px solid ${T.borderSoft}`,
          padding: 16,
          overflow: "auto",
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
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>
              Détails session Training X01
            </div>
            <div style={{ fontSize: 12, color: T.text70 }}>
              {date.toLocaleDateString()} — {session.startScore} — {session.darts} darts — Moy.3D{" "}
              {session.avg3.toFixed(2)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: T.text70,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Stats rapides */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <MiniStat label="Darts" value={session.darts.toString()} />
          <MiniStat label="Moy.3D" value={session.avg3.toFixed(2)} />
          <MiniStat label="Best Visit" value={session.bestVisit.toString()} />
          {session.bestCheckout ? (
            <MiniStat label="Best Checkout" value={session.bestCheckout.toString()} />
          ) : null}
          <MiniStat label="S" value={session.hits.S.toString()} />
          <MiniStat label="D" value={session.hits.D.toString()} />
          <MiniStat label="T" value={session.hits.T.toString()} />
          <MiniStat label="Miss" value={session.hits.miss.toString()} />
          <MiniStat label="Bull" value={session.hits.bull.toString()} />
          <MiniStat label="DBull" value={session.hits.dBull.toString()} />
          <MiniStat label="Bust" value={session.hits.bust.toString()} />
        </div>

        {/* Radar session */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: T.text70, fontSize: 13, marginBottom: 4 }}>Radar (session)</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.borderSoft} />
                <PolarAngleAxis dataKey="segment" tick={{ fill: T.text70, fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: T.text70, fontSize: 10 }} angle={90} />
                <Radar
                  name="Hits"
                  dataKey="hits"
                  stroke={T.gold}
                  fill={T.gold}
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hits par segment session */}
        <div>
          <div style={{ color: T.text70, fontSize: 13, marginBottom: 4 }}>
            Hits par segment (session)
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={hitsData}>
                <XAxis dataKey="segment" tick={{ fill: T.text70, fontSize: 11 }} />
                <YAxis tick={{ fill: T.text70, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#000",
                    borderRadius: 8,
                    border: `1px solid ${T.borderSoft}`,
                    fontSize: 12,
                    color: "#fff",
                  }}
                />
                <Legend />
                <Bar dataKey="S" stackId="hits" name="Simple" fill={T.gold} />
                <Bar dataKey="D" stackId="hits" name="Double" fill={T.oilBlue} />
                <Bar dataKey="T" stackId="hits" name="Triple" fill={T.violet} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: T.cardSoft,
        borderRadius: 10,
        padding: "6px 8px",
        border: `1px solid ${T.borderSoft}`,
      }}
    >
      <div style={{ fontSize: 11, color: T.text70 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{value}</div>
    </div>
  );
}

// --------------------------------------------------
// Composant principal (wrapper + panel)
// --------------------------------------------------

export default function TrainingX01StatsPanel() {
  const [sessions, setSessions] = useState<TrainingFinishStats[]>([]);

  useEffect(() => {
    setSessions(loadTrainingStats());
  }, []);

  if (!sessions.length) {
    return (
      <div
        style={{
          padding: 12,
          borderRadius: 16,
          marginTop: 16,
          background: "linear-gradient(180deg,rgba(10,10,15,0.96),rgba(5,5,9,0.96))",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(230,230,245,0.9)",
          fontSize: 13,
        }}
      >
        Aucune session de training X01 enregistrée pour l&apos;instant.
      </div>
    );
  }

  return <TrainingX01StatsPanelInner sessions={sessions} />;
}

type TrainingX01StatsPanelInnerProps = {
  sessions: TrainingFinishStats[];
};

function TrainingX01StatsPanelInner({ sessions }: TrainingX01StatsPanelInnerProps) {
  const [page, setPage] = useState(0);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

  const {
    nbSessions,
    totals,
    averages,
    records,
    segmentsGlobal,
    hitPrefere,
    sessions: sessionRows,
  } = useMemo(() => buildAggregates(sessions), [sessions]);

  const radarData = useMemo(() => buildRadarData(segmentsGlobal), [segmentsGlobal]);
  const hitsData = useMemo(() => buildHitsBySegmentData(segmentsGlobal), [segmentsGlobal]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(sessionRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageSessions = sessionRows
    .slice()
    .sort((a, b) => b.date - a.date)
    .slice(safePage * pageSize, safePage * pageSize + pageSize);

  const selectedSession =
    detailSessionId != null
      ? sessionRows.find((s) => s.id === detailSessionId) || null
      : null;

  // ---------------- KPI ROTATION DATA ----------------

  const kpiTotals: RotItem[] =
    totals && nbSessions
      ? [
          { label: "Darts totaux", value: String(totals.totalDarts) },
          { label: "Sessions", value: String(nbSessions) },
          { label: "Hits S cumulés", value: String(totals.totalHitsS) },
          { label: "Hits D cumulés", value: String(totals.totalHitsD) },
          { label: "Hits T cumulés", value: String(totals.totalHitsT) },
          { label: "Miss cumulés", value: String(totals.totalMiss) },
          { label: "Bull cumulés", value: String(totals.totalBull) },
          { label: "DBull cumulés", value: String(totals.totalDBull) },
          { label: "Bust cumulés", value: String(totals.totalBust) },
        ]
      : [];

  const kpiMeans: RotItem[] =
    averages && nbSessions
      ? [
          {
            label: "Moy.3D (global)",
            value: averages.avg3Global.toFixed(2),
          },
          {
            label: "Moy. darts / session",
            value: averages.avgDartsPerSession.toFixed(1),
          },
          {
            label: "Moy. hits S / session",
            value: averages.avgHitsSPerSession.toFixed(1),
          },
          {
            label: "Moy. hits D / session",
            value: averages.avgHitsDPerSession.toFixed(1),
          },
          {
            label: "Moy. hits T / session",
            value: averages.avgHitsTPerSession.toFixed(1),
          },
          {
            label: "Moy. Miss / session",
            value: averages.avgMissPerSession.toFixed(1),
          },
          {
            label: "Moy. Bust / session",
            value: averages.avgBustPerSession.toFixed(1),
          },
        ]
      : [];

  const kpiRecords: RotItem[] =
    records && nbSessions
      ? [
          hitPrefere
            ? {
                label: "Hit préféré (global)",
                value: `${hitPrefere.segment} (${hitPrefere.total})`,
              }
            : null,
          records.bestVisit
            ? {
                label: "Best Visit (1 session)",
                value: String(records.bestVisit),
              }
            : null,
          records.bestCheckout
            ? {
                label: "Best Checkout (1 session)",
                value: String(records.bestCheckout),
              }
            : null,
          records.minDartsPerStart[301]
            ? {
                label: "Min darts (301)",
                value: String(records.minDartsPerStart[301]),
              }
            : null,
          records.minDartsPerStart[501]
            ? {
                label: "Min darts (501)",
                value: String(records.minDartsPerStart[501]),
              }
            : null,
          records.minDartsPerStart[701]
            ? {
                label: "Min darts (701)",
                value: String(records.minDartsPerStart[701]),
              }
            : null,
          records.minDartsPerStart[901]
            ? {
                label: "Min darts (901)",
                value: String(records.minDartsPerStart[901]),
              }
            : null,
          records.bestDoublesValue
            ? {
                label: "Best Doubles (volume)",
                value: String(records.bestDoublesValue),
              }
            : null,
          records.bestTriplesValue
            ? {
                label: "Best Triples (volume)",
                value: String(records.bestTriplesValue),
              }
            : null,
          records.bestBullValue
            ? {
                label: "Best Bull (volume)",
                value: String(records.bestBullValue),
              }
            : null,
          records.bestDBullValue
            ? {
                label: "Best DBull (volume)",
                value: String(records.bestDBullValue),
              }
            : null,
          {
            label: "Best Miss (min)",
            value: String(records.bestMissMin),
            allowZero: true,
          },
          {
            label: "Best Miss (max)",
            value: String(records.bestMissMax),
            allowZero: true,
          },
          {
            label: "Best Bust (min)",
            value: String(records.bestBustMin),
            allowZero: true,
          },
          {
            label: "Best Bust (max)",
            value: String(records.bestBustMax),
            allowZero: true,
          },
        ].filter((x): x is RotItem => !!x)
      : [];

  const totalHitsAll =
    (totals?.totalHitsS || 0) + (totals?.totalHitsD || 0) + (totals?.totalHitsT || 0);
  const totalDartsAll = totals?.totalDarts || 0;

  const kpiPercent1: RotItem[] =
    totals && totalDartsAll
      ? [
          totalHitsAll
            ? {
                label: "% Hits (S+D+T)",
                value: `${((totalHitsAll / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
          totals.totalHitsS
            ? {
                label: "% S",
                value: `${((totals.totalHitsS / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
          totals.totalHitsD
            ? {
                label: "% D",
                value: `${((totals.totalHitsD / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
          totals.totalHitsT
            ? {
                label: "% T",
                value: `${((totals.totalHitsT / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
          totals.totalMiss
            ? {
                label: "% Miss",
                value: `${((totals.totalMiss / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
          totals.totalBull
            ? {
                label: "% Bull",
                value: `${((totals.totalBull / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
          totals.totalDBull
            ? {
                label: "% DBull",
                value: `${((totals.totalDBull / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
          totals.totalBust
            ? {
                label: "% Bust",
                value: `${((totals.totalBust / totalDartsAll) * 100).toFixed(1)}%`,
              }
            : null,
        ].filter((x): x is RotItem => !!x)
      : [];

  const kpiPercent2: RotItem[] =
    totals && records && nbSessions
      ? [
          records.bestVisit
            ? {
                label: "Best Visit",
                value: String(records.bestVisit),
              }
            : null,
          records.bestCheckout
            ? {
                label: "Best Checkout",
                value: String(records.bestCheckout),
              }
            : null,
          totals.totalDarts
            ? {
                label: "BV / dart (approx)",
                value: (records.bestVisit / totals.totalDarts).toFixed(4),
              }
            : null,
          totals.totalCheckoutSucc
            ? {
                label: "% sessions avec CO",
                value: `${((totals.totalCheckoutSucc / nbSessions) * 100).toFixed(1)}%`,
              }
            : null,
        ].filter((x): x is RotItem => !!x)
      : [];

  const rotTotal = useRotatingItems(kpiTotals, 2600);
  const rotMean = useRotatingItems(kpiMeans, 2600);
  const rotRecords = useRotatingItems(kpiRecords, 2600);
  const rotPct1 = useRotatingItems(kpiPercent1, 2600);
  const rotPct2 = useRotatingItems(kpiPercent2, 2600);

  return (
    <div style={{ padding: 12, marginTop: 8 }}>
      {/* 5 BLOCS KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 2fr 2fr 1.2fr 1.2fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <KpiRotBlock
          title="Cumul"
          colorBg={T.gold}
          colorText="#1A1200"
          item={rotTotal}
          fallback="Pas assez de données"
        />
        <KpiRotBlock
          title="Moyennes"
          colorBg={T.pink}
          colorText="#1A0010"
          item={rotMean}
          fallback="Pas assez de données"
        />
        <KpiRotBlock
          title="Records (1 session)"
          colorBg={T.blue}
          colorText="#001326"
          item={rotRecords}
          fallback="Pas encore de record"
        />
        <KpiRotBlock
          title="% global"
          colorBg={T.greenSoft}
          colorText="#001810"
          item={rotPct1}
          compact
          fallback="Pas de pourcentages"
        />
        <KpiRotBlock
          title="% BV / CO"
          colorBg={T.greenSoft2}
          colorText="#001812"
          item={rotPct2}
          compact
          fallback="Pas de BV / CO"
        />
      </div>

      {/* RADAR GLOBAL */}
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          border: `1px solid ${T.borderSoft}`,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Radar Training X01</div>
          <div style={{ fontSize: 11, color: T.text70 }}>
            Segments 1–20 + 25 (Bull) — volume de hits
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid stroke={T.borderSoft} />
              <PolarAngleAxis dataKey="segment" tick={{ fill: T.text70, fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: T.text70, fontSize: 10 }} angle={90} />
              <Radar
                name="Hits"
                dataKey="hits"
                stroke={T.gold}
                fill={T.gold}
                fillOpacity={0.55}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* HITS PAR SEGMENT GLOBAL */}
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          border: `1px solid ${T.borderSoft}`,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Hits par segment</div>
          <div style={{ fontSize: 11, color: T.text70 }}>
            Barres empilées S (doré) / D (bleu pétrole) / T (violet) + MISS
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={hitsData}>
              <XAxis dataKey="segment" tick={{ fill: T.text70, fontSize: 11 }} />
              <YAxis tick={{ fill: T.text70, fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#000",
                  borderRadius: 8,
                  border: `1px solid ${T.borderSoft}`,
                  fontSize: 12,
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="S" stackId="hits" name="Simple" fill={T.gold} />
              <Bar dataKey="D" stackId="hits" name="Double" fill={T.oilBlue} />
              <Bar dataKey="T" stackId="hits" name="Triple" fill={T.violet} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LISTE SESSIONS + PAGINATION */}
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          border: `1px solid ${T.borderSoft}`,
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Dernières sessions</div>
          <div style={{ fontSize: 11, color: T.text70 }}>
            {sessionRows.length} session(s) — page {safePage + 1}/{pageCount}
          </div>
        </div>

        {pageSessions.length === 0 ? (
          <div style={{ fontSize: 13, color: T.text70 }}>Pas de sessions Training X01.</div>
        ) : (
          <div>
            {pageSessions.map((s) => {
              const date = new Date(s.date);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 4px",
                    borderBottom: `1px solid ${T.borderSoft}`,
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 2, fontSize: 12, color: T.text70 }}>
                    {date.toLocaleDateString()}{" "}
                    {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ flex: 1.2, fontSize: 12, color: T.text }}>
                    {s.startScore} — {s.darts} darts
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: T.text70 }}>
                    Moy.3D <span style={{ color: T.text }}>{s.avg3.toFixed(2)}</span>
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: T.text70 }}>
                    BV <span style={{ color: T.text }}>{s.bestVisit}</span>
                    {s.bestCheckout ? (
                      <>
                        {" "}
                        · CO <span style={{ color: T.text }}>{s.bestCheckout}</span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => setDetailSessionId(s.id)}
                      style={{
                        borderRadius: 999,
                        padding: "4px 10px",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: T.gold,
                        color: "#1A1200",
                      }}
                    >
                      Détails
                    </button>
                  </div>
                </div>
              );
            })}

            {/* pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                paddingTop: 8,
                marginTop: 4,
                borderTop: `1px solid ${T.borderSoft}`,
              }}
            >
              <button
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={paginationBtnStyle(safePage === 0)}
              >
                ◀
              </button>
              {Array.from({ length: pageCount }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setPage(idx)}
                  style={{
                    ...paginationBtnStyle(false),
                    background: idx === safePage ? T.gold : "transparent",
                    color: idx === safePage ? "#1A1200" : T.text70,
                    borderColor: idx === safePage ? T.gold : T.borderSoft,
                  }}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                style={paginationBtnStyle(safePage >= pageCount - 1)}
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETAIL SESSION */}
      <SessionDetailModal session={selectedSession} onClose={() => setDetailSessionId(null)} />
    </div>
  );
}

// --------------------------------------------------
// Sous-composants visuels
// --------------------------------------------------

type KpiRotBlockProps = {
  title: string;
  colorBg: string;
  colorText: string;
  item: RotItem | null;
  fallback: string;
  compact?: boolean;
};

function KpiRotBlock({
  title,
  colorBg,
  colorText,
  item,
  fallback,
  compact,
}: KpiRotBlockProps) {
  return (
    <div
      style={{
        background: colorBg,
        borderRadius: 16,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: compact ? 58 : 68,
        boxShadow: "0 0 18px rgba(0,0,0,.4)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, color: colorText }}>{title}</div>
      <div style={{ marginTop: 4 }}>
        {item ? (
          <>
            <div
              style={{
                fontSize: compact ? 11 : 12,
                opacity: 0.85,
                color: colorText,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: compact ? 14 : 18,
                fontWeight: 700,
                lineHeight: 1.1,
                color: colorText,
              }}
            >
              {item.value}
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: compact ? 11 : 12,
              opacity: 0.7,
              color: colorText,
            }}
          >
            {fallback}
          </div>
        )}
      </div>
    </div>
  );
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${disabled ? "rgba(255,255,255,0.15)" : T.borderSoft}`,
    background: "transparent",
    fontSize: 11,
    padding: "3px 8px",
    cursor: disabled ? "default" : "pointer",
    color: disabled ? "rgba(255,255,255,0.25)" : T.text70,
  };
}
