// ============================================
// src/pages/TrainingX01Play.tsx
// X01 solo — Training compact + Radar + Sparkline overlay
// ============================================

import React from "react";
import Keypad from "../components/Keypad";
import type { Dart as UIDart, Profile } from "../lib/types";
import { playSound } from "../lib/sound";
import { useCurrentProfile } from "../hooks/useCurrentProfile";
import { TrainingStore, type TrainingX01Session } from "../lib/TrainingStore";
import { onlineApi } from "../lib/onlineApi";

const NAV_HEIGHT = 64; // hauteur du BottomNav (approx)

// --------------------------------------------------
// PERSISTENCE LOCALSTORAGE — TRAINING X01
// --------------------------------------------------

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

function loadTrainingStatsFromStorage(): TrainingFinishStats[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => ({
      date: Number(x.date) || Date.now(),
      darts: Number(x.darts) || 0,
      avg3D: Number(x.avg3D) || 0,
      pctS: Number(x.pctS) || 0,
      pctD: Number(x.pctD) || 0,
      pctT: Number(x.pctT) || 0,
      bestVisit: Number(x.bestVisit) || 0,
      checkout: Number(x.checkout) || 0,
      // nouveaux champs (fallback 0 si absents dans les anciennes sessions)
      hitsS: Number(x.hitsS) || 0,
      hitsD: Number(x.hitsD) || 0,
      hitsT: Number(x.hitsT) || 0,
      miss: Number(x.miss) || 0,
      bull: Number(x.bull) || 0,
      dBull: Number(x.dBull) || 0,
      bust: Number(x.bust) || 0,
      // 🔥 NEW : heatmap radar agrégée par segment
      bySegment: x.bySegment ? x.bySegment : {},
    })) as TrainingFinishStats[];
  } catch {
    return [];
  }
}

function saveTrainingStatsToStorage(list: TrainingFinishStats[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TRAINING_X01_STATS_KEY,
      JSON.stringify(list)
    );
  } catch (err) {
    console.warn("saveTrainingStatsToStorage failed", err);
  }
}

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type MetricKey =
  | "darts"
  | "avg3D"
  | "pctS"
  | "pctD"
  | "pctT"
  | "bestVisit"
  | "checkout";

export type RangeKey = "day" | "week" | "month" | "year";

export type TrainingFinishStats = {
  date: number;
  darts: number;
  avg3D: number;
  pctS: number;
  pctD: number;
  pctT: number;
  bestVisit: number;
  checkout: number;

  // ✅ champs supplémentaires pour StatsHub / stats détaillées
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;

  // 🔥 NEW : heatmap radar, somme pondérée par segment ("20", "5", "25"...)
  bySegment: Record<string, number>;
  bySegmentS: Record<string, number>;
  bySegmentD: Record<string, number>;
  bySegmentT: Record<string, number>;
};

export type HitMap = Record<string, number>;

export type SparkPoint = {
  date: number;
  value: number;
};

// --------------------------------------------------
// CONSTANTES
// --------------------------------------------------

export const START_CHOICES = [301, 501, 701, 901] as const;
export const OUT_CHOICES = ["simple", "double", "master"] as const;

export const SEGMENTS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
];

// --------------------------------------------
// Upload online (mock ou vrai backend)
// --------------------------------------------
async function uploadTrainingX01Online(opts: {
  profile: Profile | null;
  stats: TrainingFinishStats;
  darts: UIDart[];
}) {
  const { profile, stats, darts } = opts;

  try {
    await onlineApi.uploadMatch({
      mode: "x01",
      isTraining: true,
      payload: {
        kind: "training_x01",
        profileId: profile?.id ?? null,
        profileName: profile?.name ?? null,
        stats,
        darts,
      },
      startedAt: stats.date ?? Date.now(),
      finishedAt: Date.now(),
    });
    console.log("[online] training_x01 uploaded");
  } catch (e) {
    console.warn("[online] upload training_x01 failed:", e);
  }
}

// --------------------------------------------------
// HELPERS — DARTS
// --------------------------------------------------

export function dartValue(d: UIDart) {
  if (!d) return 0;
  if (d.v === 25 && d.mult === 2) return 50;
  if (d.v === 25) return 25;
  if (d.v === 0) return 0;
  return d.v * d.mult;
}

export function throwTotal(throwDarts: UIDart[]) {
  return (throwDarts || []).reduce((acc, d) => acc + dartValue(d), 0);
}

// --------------------------------------------------
// HELPERS — OUTPUT MODE / BUST LOGIC
// --------------------------------------------------

export function isValidOut(
  d: UIDart,
  outMode: "simple" | "double" | "master"
): boolean {
  if (!d) return false;
  const val = dartValue(d);

  if (outMode === "simple") {
    return val > 0;
  }

  if (outMode === "double") {
    if (d.v === 25 && d.mult === 2) return true; // DBULL
    return d.mult === 2;
  }

  if (outMode === "master") {
    if (d.v === 25 && d.mult === 2) return true;
    if (d.mult === 2 || d.mult === 3) return true;
    return false;
  }

  return false;
}

// --------------------------------------------------
// HELPERS — CHIP DESIGN
// --------------------------------------------------

export function chipBg(d?: UIDart) {
  if (!d) {
    return "linear-gradient(180deg,#222227,#111117)";
  }

  if (d.v === 25) {
    if (d.mult === 2) {
      return "linear-gradient(180deg,#ffcf61,#c17b0c)";
    }
    return "linear-gradient(180deg,#0ca86b,#05563c)";
  }

  if (d.mult === 3) {
    return "linear-gradient(180deg,#5a2a7a,#37154c)";
  }
  if (d.mult === 2) {
    return "linear-gradient(180deg,#106a6a,#043c3f)";
  }
  return "linear-gradient(180deg,#ffcf61,#c17b0c)";
}

export function chipLabel(d?: UIDart): string {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 2 ? "D" : d.mult === 3 ? "T" : "S";
  return `${prefix}${d.v}`;
}

// --------------------------------------------------
// HELPERS — AVG / PERCENT
// --------------------------------------------------

export function percent(part: number, total: number): string {
  if (total <= 0) return "0.0%";
  return ((part / total) * 100).toFixed(1) + "%";
}

// --------------------------------------------------
// SPARKLINE HELPERS
// --------------------------------------------------

export function filterByRange(
  items: TrainingFinishStats[],
  range: RangeKey
): TrainingFinishStats[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  let span = 7;
  if (range === "day") span = 1;
  if (range === "month") span = 30;
  if (range === "year") span = 365;

  const minDate = now - span * day;
  return items.filter((x) => x.date >= minDate);
}

export function getMetricValue(
  item: TrainingFinishStats,
  key: MetricKey
): number {
  switch (key) {
    case "darts":
      return item.darts;
    case "avg3D":
      return item.avg3D;
    case "pctS":
      return item.pctS;
    case "pctD":
      return item.pctD;
    case "pctT":
      return item.pctT;
    case "bestVisit":
      return item.bestVisit;
    case "checkout":
      return item.checkout;
    default:
      return 0;
  }
}

// ============================================
// RadarHitChart — cible précision
// ============================================

function RadarHitChart({ hitMap }: { hitMap: HitMap }) {
  const size = 160;
  const center = size / 2;
  const maxRadius = size / 2 - 16;

  const values = SEGMENTS.map((key) => hitMap[String(key)] ?? 0);
  const maxVal = Math.max(...values, 1);

  const polygonPoints = SEGMENTS.map((key, idx) => {
    const v = hitMap[String(key)] ?? 0;
    const ratio = v / maxVal;
    const radius = maxRadius * ratio;
    const angle = (Math.PI * 2 * idx) / SEGMENTS.length - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const guideRings = [0.4, 0.7, 1];

  return (
    <svg
      width={size}
      height={size}
      style={{
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 50% 50%, #1d1d21 0%, #050507 70%, #000000 100%)",
        boxShadow: "0 0 16px rgba(0,0,0,0.7)",
      }}
    >
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe69b" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffb800" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {guideRings.map((r, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={maxRadius * r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
          fill="none"
        />
      ))}

      {SEGMENTS.map((_key, idx) => {
        const angle = (Math.PI * 2 * idx) / SEGMENTS.length - Math.PI / 2;
        const x = center + maxRadius * Math.cos(angle);
        const y = center + maxRadius * Math.sin(angle);
        return (
          <line
            key={"r" + idx}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        );
      })}

      <polygon
        points={polygonPoints}
        fill="url(#radarFill)"
        stroke="#ffcc55"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />

      {SEGMENTS.map((key, idx) => {
        const angle = (Math.PI * 2 * idx) / SEGMENTS.length - Math.PI / 2;
        const radius = maxRadius + 8;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle) + 3;
        return (
          <text
            key={"lbl" + key}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={8}
            fontWeight={600}
            fill="rgba(245,245,255,0.9)"
          >
            {key}
          </text>
        );
      })}
    </svg>
  );
}

// ============================================
// Sparkline PRO (utilisée dans overlay Progression)
// ============================================

function SparkChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,200,90,0.9)"
          : "1px solid rgba(255,255,255,0.16)",
        background: active
          ? "linear-gradient(180deg,#ffcf61,#c17b0c)"
          : "rgba(10,10,12,0.95)",
        color: active ? "#221600" : "rgba(225,225,240,0.9)",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function TimeSelector({
  range,
  onChange,
}: {
  range: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <SparkChip
        label="J"
        active={range === "day"}
        onClick={() => onChange("day")}
      />
      <SparkChip
        label="S"
        active={range === "week"}
        onClick={() => onChange("week")}
      />
      <SparkChip
        label="M"
        active={range === "month"}
        onClick={() => onChange("month")}
      />
      <SparkChip
        label="A"
        active={range === "year"}
        onClick={() => onChange("year")}
      />
    </div>
  );
}

function MetricSelector({
  metric,
  onChange,
}: {
  metric: MetricKey;
  onChange: (m: MetricKey) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      <SparkChip
        label="Darts"
        active={metric === "darts"}
        onClick={() => onChange("darts")}
      />
      <SparkChip
        label="3D"
        active={metric === "avg3D"}
        onClick={() => onChange("avg3D")}
      />
      <SparkChip
        label="%S"
        active={metric === "pctS"}
        onClick={() => onChange("pctS")}
      />
      <SparkChip
        label="%D"
        active={metric === "pctD"}
        onClick={() => onChange("pctD")}
      />
      <SparkChip
        label="%T"
        active={metric === "pctT"}
        onClick={() => onChange("pctT")}
      />
      <SparkChip
        label="BV"
        active={metric === "bestVisit"}
        onClick={() => onChange("bestVisit")}
      />
      <SparkChip
        label="CO"
        active={metric === "checkout"}
        onClick={() => onChange("checkout")}
      />
    </div>
  );
}

function Sparkline({
  sessions,
  range,
  metric,
  onRangeChange,
  onMetricChange,
}: {
  sessions: TrainingFinishStats[];
  range: RangeKey;
  metric: MetricKey;
  onRangeChange: (r: RangeKey) => void;
  onMetricChange: (m: MetricKey) => void;
}) {
  const filtered = filterByRange(sessions, range);

  const width = 320;
  const height = 90;
  const padX = 16;
  const padY = 12;

  if (filtered.length === 0) {
    return (
      <div
        style={{
          padding: "10px 12px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "linear-gradient(180deg,rgba(12,12,18,0.98),rgba(7,7,11,0.98))",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "rgba(225,225,240,0.9)",
            marginBottom: 6,
          }}
        >
          Progression
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "rgba(200,200,220,0.75)",
            textAlign: "center",
          }}
        >
          Aucune partie terminée sur cette période.
        </div>

        {/* Boutons sous la zone de message */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <MetricSelector metric={metric} onChange={onMetricChange} />
          <TimeSelector range={range} onChange={onRangeChange} />
        </div>
      </div>
    );
  }

  const minTs = Math.min(...filtered.map((s) => s.date));
  const maxTs = Math.max(...filtered.map((s) => s.date));
  const minY = Math.min(...filtered.map((s) => getMetricValue(s, metric)));
  const maxY = Math.max(...filtered.map((s) => getMetricValue(s, metric)));
  const spanTs = maxTs - minTs || 1;
  const spanY = maxY - minY || 1;

  const points = filtered.map((s) => {
    const x =
      padX + ((s.date - minTs) / spanTs) * (width - padX * 2);
    const y =
      height -
      padY -
      ((getMetricValue(s, metric) - minY) / spanY) *
        (height - padY * 2);
    return { x, y, ...s };
  });

  const poly = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];

  function formatDate(ts: number) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
    });
  }

  return (
    <div
      style={{
        padding: "10px 12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg,rgba(12,12,18,0.98),rgba(7,7,11,0.98))",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "rgba(225,225,240,0.9)",
          marginBottom: 6,
        }}
      >
        Progression
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 2,
        }}
      >
        <svg width={width} height={height}>
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />

          <polyline
            points={poly}
            fill="none"
            stroke="#ffcf61"
            strokeWidth={1.8}
          />

          <circle
            cx={last.x}
            cy={last.y}
            r={4}
            fill="#ffcf61"
            stroke="#3b2600"
            strokeWidth={1}
          />
        </svg>

        <div
          style={{
            fontSize: 12,
            color: "#ffcf61",
            fontWeight: 700,
            minWidth: 110,
            textAlign: "right",
          }}
        >
          {getMetricValue(last, metric).toFixed(1)} — {formatDate(last.date)}
        </div>
      </div>

      {/* 🔽 Boutons SOUS la courbe */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <MetricSelector metric={metric} onChange={onMetricChange} />
        <TimeSelector range={range} onChange={onRangeChange} />
      </div>
    </div>
  );
}

// ============================================
// Mini tableau stats (S1 optimisé)
// ============================================

function TrainingStatsTable({
  avg3D,
  avg1D,
  bestVisit,
  darts,
  hitRate,
  pctS,
  pctD,
  pctT,
  miss,
  bull,
  dbull,
  bust,
}: {
  avg3D: string;
  avg1D: string;
  bestVisit: number;
  darts: number;
  hitRate: string;
  pctS: string;
  pctD: string;
  pctT: string;
  miss: number;
  bull: number;
  dbull: number;
  bust: number;
}) {
  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
  };

  const labelStyle: React.CSSProperties = {
    color: "#ffcf61",
    fontWeight: 700,
  };

  const valueStyle: React.CSSProperties = {
    color: "#ffffff",
    fontWeight: 700,
  };

  const sepStyle: React.CSSProperties = {
    height: 1,
    margin: "4px 0",
    background:
      "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.55),rgba(193,123,12,0.5),rgba(255,207,97,0.0))",
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {/* Moy.3D */}
      <div style={rowStyle}>
        <span style={labelStyle}>Moy.3D</span>
        <span style={valueStyle}>{avg3D}</span>
      </div>
      <div style={sepStyle} />

      {/* Moy.1D */}
      <div style={rowStyle}>
        <span style={labelStyle}>Moy.1D</span>
        <span style={valueStyle}>{avg1D}</span>
      </div>
      <div style={sepStyle} />

      {/* Best Visit */}
      <div style={rowStyle}>
        <span style={labelStyle}>Best Visit</span>
        <span style={valueStyle}>{bestVisit}</span>
      </div>

      <div
        style={{
          height: 1,
          margin: "6px 0 4px",
          background:
            "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.7),rgba(193,123,12,0.7),rgba(255,207,97,0.0))",
        }}
      />

      {/* Darts / %Hits */}
      <div style={rowStyle}>
        <span style={labelStyle}>Darts</span>
        <span style={valueStyle}>{darts}</span>
      </div>
      <div style={sepStyle} />
      <div style={rowStyle}>
        <span style={labelStyle}>%Hits</span>
        <span style={valueStyle}>{hitRate}</span>
      </div>

      <div
        style={{
          height: 1,
          margin: "6px 0 4px",
          background:
            "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.7),rgba(193,123,12,0.7),rgba(255,207,97,0.0))",
        }}
      />

      {/* S / D / T */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 4,
          fontSize: 10.5,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>S%</div>
          <div style={valueStyle}>{pctS}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>D%</div>
          <div style={valueStyle}>{pctD}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>T%</div>
          <div style={valueStyle}>{pctT}</div>
        </div>
      </div>

      <div
        style={{
          height: 1,
          margin: "6px 0 4px",
          background:
            "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.7),rgba(193,123,12,0.7),rgba(255,207,97,0.0))",
        }}
      />

      {/* Miss / Bull / DBull / Bust */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 4,
          fontSize: 10.5,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Miss</div>
          <div style={valueStyle}>{miss}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Bull</div>
          <div style={valueStyle}>{bull}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>DBull</div>
          <div style={valueStyle}>{dbull}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Bust</div>
          <div style={valueStyle}>{bust}</div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   VOLÉE EN COURS — 3 chips + total sur une seule ligne
   (le total juste après le 3ᵉ bloc, le tout centré)
   + rouge si bustLock actif
---------------------------------------------------------*/

function ThrowPreviewBar({
  darts,
  isBustLocked,
}: {
  darts: UIDart[];
  isBustLocked: boolean;
}) {
  const total = throwTotal(darts);

  const wrapperBorderTop = isBustLocked
    ? "1px solid rgba(255,80,80,0.85)"
    : "1px solid rgba(255,255,255,0.07)";

  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 6,
        borderTop: wrapperBorderTop,
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {/* 3 chips */}
        {[0, 1, 2].map((idx) => {
          const d = darts[idx];
          const label = chipLabel(d);

          const bg = isBustLocked
            ? "linear-gradient(180deg,#5a1010,#2a0505)"
            : chipBg(d);

          const border = isBustLocked
            ? "1px solid rgba(255,80,80,0.9)"
            : d
            ? "1px solid rgba(0,0,0,0.35)"
            : "1px solid rgba(255,255,255,0.05)";

          const color = isBustLocked
            ? "#ffd6d6"
            : d
            ? "#fff7dc"
            : "rgba(180,180,190,0.7)";

          return (
            <div
              key={"chip" + idx}
              style={{
                minWidth: 44,
                padding: "4px 12px",
                borderRadius: 999,
                background: bg,
                boxShadow: d
                  ? "0 4px 12px rgba(0,0,0,0.7)"
                  : "0 2px 8px rgba(0,0,0,0.6)",
                border,
                fontSize: 11,
                fontWeight: 700,
                color,
                textAlign: "center",
              }}
            >
              {label}
            </div>
          );
        })}

        {/* TOTAL juste après la 3ᵉ flèche */}
        <div
          style={{
            minWidth: 40,
            padding: "4px 8px",
            borderRadius: 8,
            background: isBustLocked ? "#350707" : "#050506",
            border: isBustLocked
              ? "1px solid rgba(255,80,80,0.9)"
              : "1px solid #ffcf61",
            boxShadow: isBustLocked
              ? "0 0 12px rgba(255,60,60,0.75), 0 0 0 1px rgba(0,0,0,0.9)"
              : "0 0 12px rgba(255,195,80,0.55), 0 0 0 1px rgba(0,0,0,0.9)",
            textAlign: "center",
            fontSize: 13,
            fontWeight: 900,
            color: isBustLocked ? "#ffe0e0" : "#ffcf61",
          }}
        >
          {total}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Composant principal
// ============================================

export default function TrainingX01Play({
  go,
  params,
}: {
  go?: (tab: any, p?: any) => void;
  params?: any;
}) {
  // --------------------------------------------------
  // PROFIL COURANT + AVATAR
  // --------------------------------------------------
  const currentProfile = useCurrentProfile() as Profile | null;

  // --------------------------------------------------
  // CONFIG verrouillée (vient de la page précédente)
  // --------------------------------------------------
  const lockedStartScore =
    typeof params?.startScore === "number" ? params.startScore : null;
  const lockedOutMode =
    params?.outMode === "simple" ||
    params?.outMode === "double" ||
    params?.outMode === "master"
      ? (params.outMode as "simple" | "double" | "master")
      : null;
  const isConfigLocked = !!lockedStartScore || !!lockedOutMode;

  let avatarSrc: string | null = null;
  if (currentProfile) {
    const p = currentProfile as any;

    // 1. Clés les plus probables
    if (typeof p.avatarDataUrl === "string") {
      avatarSrc = p.avatarDataUrl;
    } else if (typeof p.avatarUrl === "string") {
      avatarSrc = p.avatarUrl;
    } else if (typeof p.avatar === "string") {
      avatarSrc = p.avatar;
    } else if (p.avatar && typeof p.avatar === "object") {
      if (typeof p.avatar.dataUrl === "string") avatarSrc = p.avatar.dataUrl;
      else if (typeof p.avatar.url === "string") avatarSrc = p.avatar.url;
    } else {
      // 2. Fallback : on cherche un string qui ressemble à une image
      for (const [key, value] of Object.entries(p)) {
        if (
          typeof value === "string" &&
          /\.(png|jpe?g|webp|gif)$/i.test(value)
        ) {
          avatarSrc = value;
          break;
        }
        if (typeof value === "string" && /data:image\//.test(value)) {
          avatarSrc = value;
          break;
        }
      }
    }
  }

  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(
    (lockedStartScore as any) ?? 501
  );
  const [outMode, setOutMode] = React.useState<
    "simple" | "double" | "master"
  >(lockedOutMode ?? "double");

  // Si on revient depuis la page de config avec une nouvelle valeur, on resynchronise.
  React.useEffect(() => {
    if (lockedStartScore && START_CHOICES.includes(lockedStartScore as any)) {
      setStartScore(lockedStartScore as any);
    }
    if (lockedOutMode) {
      setOutMode(lockedOutMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedStartScore, lockedOutMode]);

  const [remaining, setRemaining] = React.useState<number>(startScore);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const [totalDarts, setTotalDarts] = React.useState(0);
  const [totalHits, setTotalHits] = React.useState(0);
  const [bestVisit, setBestVisit] = React.useState(0);

  const [singleHits, setSingleHits] = React.useState(0);
  const [doubleHits, setDoubleHits] = React.useState(0);
  const [tripleHits, setTripleHits] = React.useState(0);

  const [bullHits, setBullHits] = React.useState(0);
  const [dBullHits, setDBullHits] = React.useState(0);
  const [missHits, setMissHits] = React.useState(0);
  const [bustCount, setBustCount] = React.useState(0);

  const [hitMap, setHitMap] = React.useState<HitMap>({});
  const [finishedSessions, setFinishedSessions] = React.useState<
    TrainingFinishStats[]
  >(() => loadTrainingStatsFromStorage());
  const [hitMapS, setHitMapS] = React.useState<HitMap>({});
  const [hitMapD, setHitMapD] = React.useState<HitMap>({});
  const [hitMapT, setHitMapT] = React.useState<HitMap>({});
  const [metricKey, setMetricKey] = React.useState<MetricKey>("darts");
  const [rangeKey, setRangeKey] = React.useState<RangeKey>("week");

  const [showInfo, setShowInfo] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);

  // partie commencée ou non
  const [started, setStarted] = React.useState(false);

  // fenètre de fin de partie
  const [showEndModal, setShowEndModal] = React.useState(false);

  // bust "forcé" : on a dépassé le score restant pendant la volée
  const [bustLocked, setBustLocked] = React.useState(false);

  const sessionIdRef = React.useRef<string | null>(null);
  const visitCountRef = React.useRef<number>(0);
  const allDartsRef = React.useRef<UIDart[]>([]);

  // Helper : démarrer / redémarrer proprement une session Training
  function startNewSession() {
    if (sessionIdRef.current) {
      try {
        TrainingStore.finishSession(sessionIdRef.current);
      } catch (err) {
        console.warn("TrainingX01Play finishSession (prev) failed", err);
      }
      sessionIdRef.current = null;
    }

    const s = TrainingStore.startSession(
      "x01_solo" as any,
      currentProfile?.id ?? null,
      String(startScore)
    );
    sessionIdRef.current = s.id;

    setRemaining(startScore);
    setCurrentThrow([]);
    setMultiplier(1);

    setTotalDarts(0);
    setTotalHits(0);
    setBestVisit(0);

    setSingleHits(0);
    setDoubleHits(0);
    setTripleHits(0);

    setBullHits(0);
    setDBullHits(0);
    setMissHits(0);
    setBustCount(0);

    setHitMap({});
    visitCountRef.current = 0;
    setStarted(false);
    setShowEndModal(false);
    setBustLocked(false);

    allDartsRef.current = []; // 🔁 on vide le buffer de fléchettes
  }

  React.useEffect(() => {
    startNewSession();

    return () => {
      if (sessionIdRef.current) {
        try {
          TrainingStore.finishSession(sessionIdRef.current);
        } catch (err) {
          console.warn("TrainingX01Play finishSession (cleanup) failed", err);
        }
        sessionIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id, startScore, outMode]);

  const currentThrowTotal = throwTotal(currentThrow);
  const scoredSoFar = startScore - remaining;
  const avgPerDart = totalDarts > 0 ? scoredSoFar / totalDarts : 0;

  const avg1D = avgPerDart.toFixed(1);
  const avg3D = (avgPerDart * 3).toFixed(1);

  const hitRate =
    totalDarts > 0
      ? ((totalHits / totalDarts) * 100).toFixed(1) + "%"
      : "0.0%";

  const pctS = percent(singleHits, totalHits);
  const pctD = percent(doubleHits, totalHits);
  const pctT = percent(tripleHits, totalHits);

  const effectiveRemaining = Math.max(0, remaining - currentThrowTotal);

  // HANDLERS

  function handleNumber(n: number) {
    // partie terminée ou bust verrouillé => on ignore
    if (remaining <= 0 || bustLocked) return;

    if (!started) setStarted(true);
    if (currentThrow.length >= 3) return;

    const d: UIDart = { v: n, mult: multiplier };
    const nextThrow = [...currentThrow, d];
    const after = remaining - throwTotal(nextThrow);

    const impossibleDoubleScore =
      (outMode === "double" || outMode === "master") && after === 1;

    if (after < 0 || impossibleDoubleScore) {
      // bust automatique dès qu'on dépasse OU qu'on tombe sur 1 en double/master
      setBustLocked(true);
      playSound("bust");
      navigator.vibrate?.([120, 60, 140]);
    } else {
      playSound("dart-hit");
      navigator.vibrate?.(20);
    }

    setCurrentThrow(nextThrow);
    setMultiplier(1);
  }

  function handleBull() {
    // partie terminée ou bust verrouillé => on ignore
    if (remaining <= 0 || bustLocked) return;

    if (!started) setStarted(true);
    if (currentThrow.length >= 3) return;

    const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
    const nextThrow = [...currentThrow, d];
    const after = remaining - throwTotal(nextThrow);

    const impossibleDoubleScore =
      (outMode === "double" || outMode === "master") && after === 1;

    if (after < 0 || impossibleDoubleScore) {
      setBustLocked(true);
      playSound("bust");
      navigator.vibrate?.([120, 60, 140]);
    } else {
      playSound("dart-hit");
      navigator.vibrate?.(20);
    }

    setCurrentThrow(nextThrow);
    setMultiplier(1);
  }

  function handleBackspace() {
    if (!currentThrow.length) return;

    const next = currentThrow.slice(0, -1);
    setCurrentThrow(next);
    const after = remaining - throwTotal(next);
    if (after >= 0) {
      setBustLocked(false);
    }
    playSound("dart-hit");
  }

  function handleCancel() {
    if (currentThrow.length > 0) {
      setCurrentThrow([]);
      setMultiplier(1);
      setBustLocked(false);
      playSound("bust");
      return;
    }
  }

  function handleValidate() {
    if (!currentThrow.length || remaining <= 0 || !sessionIdRef.current) return;

    // on empile toutes les fléchettes de la session
    allDartsRef.current = [...allDartsRef.current, ...currentThrow];

    const volleyTotal = throwTotal(currentThrow);
    const after = remaining - volleyTotal;

    let isBust = false;

    const impossibleDoubleScore =
      (outMode === "double" || outMode === "master") && after === 1;

    if (after < 0 || impossibleDoubleScore) {
      isBust = true;
    } else if (after === 0) {
      const last = currentThrow[currentThrow.length - 1];
      if (!isValidOut(last, outMode)) {
        isBust = true;
      }
    }

    const didCheckout = !isBust && after === 0;

    const hitsPayload = currentThrow.map((d) => ({
      profileId: currentProfile?.id ?? null,
      value: dartValue(d),
      mult: d.mult,
      isHit: d.v !== 0 && !isBust,
      remainingBefore: remaining,
      remainingAfter: isBust ? remaining : after,
      mode: "x01_solo" as any,
    }));

    try {
      TrainingStore.addHits(sessionIdRef.current, hitsPayload as any);
    } catch (err) {
      console.warn("TrainingX01Play addHits failed", err);
    }

    // --- compteurs globaux ---

    setTotalDarts((n) => n + currentThrow.length);

    const missCount = currentThrow.filter((d) => d.v === 0).length;
    setMissHits((n) => n + missCount);

    if (isBust) {
      setBustCount((n) => n + 1);
      // score "remaining" ne bouge pas (on reste au début de la volée)
    } else {
      const validHits = currentThrow.filter((d) => d.v !== 0);
      const addHits = validHits.length;
      let addS = 0;
      let addD = 0;
      let addT = 0;
      let addB = 0;
      let addDB = 0;

      for (const d of validHits) {
        if (d.v === 25) {
          if (d.mult === 2) addDB++;
          else addB++;
        } else if (d.mult === 1) addS++;
        else if (d.mult === 2) addD++;
        else if (d.mult === 3) addT++;
      }

      setTotalHits((n) => n + addHits);
      setSingleHits((n) => n + addS);
      setDoubleHits((n) => n + addD);
      setTripleHits((n) => n + addT);
      setBullHits((n) => n + addB);
      setDBullHits((n) => n + addDB);

      // 🔥 NEW : hitMap calculé en local pour cette volée
      const nextHitMap: HitMap = { ...hitMap };
      for (const d of validHits) {
        const key = d.v === 25 ? "25" : String(d.v);
        nextHitMap[key] =
          (nextHitMap[key] ?? 0) +
          (d.mult === 3 ? 3 : d.mult === 2 ? 2 : 1);
      }
      setHitMap(nextHitMap);

      // NEW — heatmaps S / D / T séparées pour StatsHub
      const nextS: HitMap = { ...hitMapS };
      const nextD: HitMap = { ...hitMapD };
      const nextT: HitMap = { ...hitMapT };

      for (const d of validHits) {
        const key = d.v === 25 ? "25" : String(d.v);
        if (d.v !== 0 && d.v !== 25) {
          if (d.mult === 1) nextS[key] = (nextS[key] ?? 0) + 1;
          if (d.mult === 2) nextD[key] = (nextD[key] ?? 0) + 1;
          if (d.mult === 3) nextT[key] = (nextT[key] ?? 0) + 1;
        }
      }

      setHitMapS(nextS);
      setHitMapD(nextD);
      setHitMapT(nextT);

      setBestVisit((b) => Math.max(b, volleyTotal));
      setRemaining(after);

      if (didCheckout) {
        playSound("doubleout");
      }

      if (didCheckout) {
        const finalDarts = totalDarts + currentThrow.length;
        const avgPerDartFinal =
          finalDarts > 0 ? startScore / finalDarts : 0;

        const newTotalHits = totalHits + addHits;
        const newS = singleHits + addS;
        const newD = doubleHits + addD;
        const newT = tripleHits + addT;

        // ✅ compteurs finaux pour la session
        const finalMiss = missHits + missCount;
        const finalBull = bullHits + addB;
        const finalDBull = dBullHits + addDB;
        const finalBust = bustCount; // pas de bust sur la volée de checkout

        // ✅ Stats "simples" pour l’overlay TrainingX01 (sparkline locale)
        const stat: TrainingFinishStats = {
          date: Date.now(),
          darts: finalDarts,
          avg3D: avgPerDartFinal * 3,
          pctS: newTotalHits > 0 ? (newS / newTotalHits) * 100 : 0,
          pctD: newTotalHits > 0 ? (newD / newTotalHits) * 100 : 0,
          pctT: newTotalHits > 0 ? (newT / newTotalHits) * 100 : 0,
          bestVisit: Math.max(bestVisit, volleyTotal),
          checkout: dartValue(currentThrow[currentThrow.length - 1]),
          hitsS: newS,
          hitsD: newD,
          hitsT: newT,
          miss: finalMiss,
          bull: finalBull,
          dBull: finalDBull,
          bust: finalBust,
          // 🔥 NEW : on sauve toute la heatmap de la session
          bySegment: nextHitMap,
          bySegmentS: nextS,
          bySegmentD: nextD,
          bySegmentT: nextT,
        };

        // 1) Sauvegarde locale pour l’overlay "Progression" du Training X01
        setFinishedSessions((arr) => {
          const next = [...arr, stat];
          saveTrainingStatsToStorage(next);
          return next;
        });

        // 2) Sauvegarde session X01 complète pour StatsHub via TrainingStore
        try {
          const x01Session: TrainingX01Session = {
            id: sessionIdRef.current!,
            date: stat.date,
            profileId: currentProfile?.id ?? "local",
            darts: finalDarts,
            avg3D: stat.avg3D,
            avg1D: avgPerDartFinal,
            bestVisit: stat.bestVisit,
            bestCheckout: stat.checkout || null,
            hitsS: stat.hitsS,
            hitsD: stat.hitsD,
            hitsT: stat.hitsT,
            miss: stat.miss,
            bull: stat.bull,
            dBull: stat.dBull,
            bust: stat.bust,
            bySegment: stat.bySegment,
            bySegmentS: stat.bySegmentS,
            bySegmentD: stat.bySegmentD,
            bySegmentT: stat.bySegmentT,
            dartsDetail: allDartsRef.current,
          };
          TrainingStore.saveX01Session(x01Session);
        } catch (err) {
          console.warn("TrainingX01Play saveX01Session failed", err);
        }

        // 3) Upload online (mock ou backend réel)
        uploadTrainingX01Online({
          profile: currentProfile,
          stats: stat,
          darts: allDartsRef.current,
        });

        setShowEndModal(true);
      }
    }

    setCurrentThrow([]);
    setMultiplier(1);
    setBustLocked(false);
  }

  function handleExit() {
    if (sessionIdRef.current) {
      try {
        TrainingStore.finishSession(sessionIdRef.current);
      } catch (err) {
        console.warn("TrainingX01Play finishSession (exit) failed", err);
      }
      sessionIdRef.current = null;
    }
    go?.("training");
  }

  function handleReplay() {
    if (sessionIdRef.current) {
      try {
        TrainingStore.finishSession(sessionIdRef.current);
      } catch (err) {
        console.warn("TrainingX01Play finishSession (replay) failed", err);
      }
      sessionIdRef.current = null;
    }

    startNewSession();
  }

  // RENDER — compact sans scroll

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        paddingBottom: NAV_HEIGHT,
        overflow: "hidden",
        background: "#020205",
        zIndex: 1,
      }}
    >
      {/* HEADER FIXE */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(100%,520px)",
          zIndex: 50,
          padding: "6px 10px 4px",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <button
            type="button"
            onClick={handleExit}
            style={{
              borderRadius: 10,
              padding: "5px 10px",
              border: "1px solid rgba(255,180,0,.35)",
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              fontWeight: 900,
              color: "#1a1a1a",
              boxShadow: "0 4px 14px rgba(255,170,0,.25)",
              fontSize: 12,
            }}
          >
            ← Training
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                border: "1px solid rgba(255,200,80,.45)",
                background: "linear-gradient(180deg,#ffd865,#ffb700)",
                color: "#221800",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Training X01
            </button>

            <button
              onClick={() => setShowInfo(true)}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#ffffff",
                border: "1px solid #000",
                color: "#000",
                fontWeight: 900,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              i
            </button>
          </div>
        </div>

        {/* PARAMÈTRES — masqués une fois la partie commencée */}
        {!started && !isConfigLocked && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {START_CHOICES.map((sc) => (
                <button
                  key={sc}
                  onClick={() => setStartScore(sc)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    border:
                      startScore === sc
                        ? "1px solid rgba(255,200,90,0.9)"
                        : "1px solid rgba(255,255,255,0.16)",
                    background:
                      startScore === sc
                        ? "linear-gradient(180deg,#ffcf61,#c17b0c)"
                        : "rgba(10,10,12,0.9)",
                    color:
                      startScore === sc
                        ? "#221600"
                        : "rgba(230,230,240,0.95)",
                  }}
                >
                  {sc}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {OUT_CHOICES.map((om) => (
                <button
                  key={om}
                  onClick={() => setOutMode(om)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    border:
                      outMode === om
                        ? "1px solid rgba(255,200,90,0.9)"
                        : "1px solid rgba(255,255,255,0.16)",
                    background:
                      outMode === om
                        ? "linear-gradient(180deg,#ffcf61,#c17b0c)"
                        : "rgba(10,10,12,0.9)",
                    color:
                      outMode === om
                        ? "#221600"
                        : "rgba(230,230,240,0.95)",
                    textTransform: "capitalize",
                  }}
                >
                  {om}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MARGE sous header */}
      <div style={{ height: 55 }} />

      {/* BLOC CENTRAL : 2 colonnes + volée */}
      <div
        style={{
          width: "min(100%,520px)",
          margin: "0 auto",
          padding: "0 10px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {/* Colonne gauche : avatar + stats */}
          <div
            style={{
              background:
                "linear-gradient(180deg,rgba(10,10,15,0.96),rgba(5,5,9,0.96))",
              borderRadius: 16,
              padding: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 6,
              }}
            >
              {/* Aura derrière */}
              <div
                style={{
                  position: "relative",
                  width: 65,
                  height: 65,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Glow */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(255,220,140,0.9) 0%, rgba(255,190,80,0.45) 45%, rgba(0,0,0,0) 70%)",
                    boxShadow: "0 0 25px rgba(255,200,70,0.75)",
                    zIndex: 0,
                  }}
                />

                {/* Avatar SANS MARGE / SANS FOND */}
                <div
                  style={{
                    position: "relative",
                    width: 65,
                    height: 65,
                    borderRadius: "50%",
                    overflow: "hidden",
                    zIndex: 1,
                  }}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 26,
                        color: "#fff",
                      }}
                    >
                      {currentProfile?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <TrainingStatsTable
              avg3D={avg3D}
              avg1D={avg1D}
              bestVisit={bestVisit}
              darts={totalDarts}
              hitRate={hitRate}
              pctS={pctS}
              pctD={pctD}
              pctT={pctT}
              miss={missHits}
              bull={bullHits}
              dbull={dBullHits}
              bust={bustCount}
            />
          </div>

          {/* Colonne droite : nom + score + radar + bouton Progression */}
          <div
            style={{
              background:
                "linear-gradient(180deg,rgba(10,10,15,0.96),rgba(5,5,9,0.96))",
              borderRadius: 16,
              padding: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: 2,
                textAlign: "center",
              }}
            >
              {currentProfile?.name ?? "Joueur"}
            </div>

            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: "#ffcf61",
                textShadow: "0 4px 14px rgba(255,195,26,.3)",
                marginBottom: 4,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              {effectiveRemaining}
            </div>

            <RadarHitChart hitMap={hitMap} />

            <button
              type="button"
              onClick={() => setShowProgress(true)}
              style={{
                marginTop: 6,
                padding: "4px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,200,80,.6)",
                background: "linear-gradient(180deg,#ffcf61,#c17b0c)",
                color: "#221600",
                fontWeight: 800,
                fontSize: 11,
              }}
            >
              Progression
            </button>
          </div>
        </div>

        {/* Volée */}
        <ThrowPreviewBar darts={currentThrow} isBustLocked={bustLocked} />
      </div>

      {/* KEYPAD FIXE EN BAS (au-dessus du BottomNav) */}
      <div
        style={{
          position: "fixed",
          bottom: NAV_HEIGHT,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(100%,520px)",
          background: "rgba(0,0,0,0.9)",
          padding: "6px 10px 10px",
          zIndex: 60,
          boxShadow: "0 -6px 18px rgba(0,0,0,0.55)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Keypad
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onNumber={handleNumber}
          onBull={handleBull}
          onBackspace={handleBackspace}
          onCancel={handleCancel}
          onValidate={handleValidate}
          hidePreview={true}
        />
      </div>

      {/* OVERLAY INFO ("i") */}
      {showInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowInfo(false)}
        >
          <div
            style={{
              width: "min(100%,420px)",
              background:
                "linear-gradient(180deg,#14141a 0%,#07070a 100%)",
              borderRadius: 16,
              padding: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 12px 28px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Règles du Training X01</span>
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.45,
                color: "#e2e4ef",
              }}
            >
              <ul style={{ paddingLeft: 18 }}>
                <li>Score de départ : {startScore}.</li>
                <li>
                  Sortie : <b>{outMode}</b> (
                  {outMode === "simple"
                    ? "n'importe quel coup valide"
                    : outMode === "double"
                    ? "le dernier coup doit être un double ou DBULL"
                    : "dernier coup simple/double/triple/DBULL"}
                  ).
                </li>
                <li>
                  Chaque fléchette est enregistrée dans l’historique Training
                  pour suivre votre progression.
                </li>
                <li>
                  Le radar montre les segments les plus touchés (1–20 + 25),
                  pondérés par simple/double/triple.
                </li>
                <li>
                  La fenêtre “Progression” affiche la Sparkline des parties
                  terminées avec plusieurs métriques.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY PROGRESSION (Sparkline plein écran) */}
      {showProgress && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 95,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 10,
          }}
          onClick={() => setShowProgress(false)}
        >
          <div
            style={{
              width: "min(100%,520px)",
              background:
                "linear-gradient(180deg,#14141a 0%,#050509 100%)",
              borderRadius: 16,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 16px 36px rgba(0,0,0,0.8)",
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
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                Progression des stats
              </div>
              <button
                onClick={() => setShowProgress(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>

            <Sparkline
              sessions={finishedSessions}
              range={rangeKey}
              metric={metricKey}
              onRangeChange={setRangeKey}
              onMetricChange={setMetricKey}
            />
          </div>
        </div>
      )}

      {/* FENÊTRE FLOTTANTE FIN DE PARTIE */}
      {showEndModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 92,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(100%,360px)",
              background:
                "linear-gradient(180deg,#15151d 0%,#050509 100%)",
              borderRadius: 18,
              padding: 14,
              border: "1px solid rgba(255,210,130,0.85)",
              boxShadow:
                "0 12px 28px rgba(0,0,0,0.8), 0 0 22px rgba(255,200,80,0.55)",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Session terminée
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(230,230,245,0.9)",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Que voulez-vous faire ?
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowProgress(true);
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,220,140,0.9)",
                  background:
                    "linear-gradient(180deg,#ffcf61,#c17b0c)",
                  color: "#221600",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Résumé
              </button>

              <button
                type="button"
                onClick={() => {
                  handleReplay();
                  setShowEndModal(false);
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(120,240,170,0.9)",
                  background:
                    "linear-gradient(180deg,#11c676,#057a46)",
                  color: "#e9fff4",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Rejouer
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  handleExit();
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,120,120,0.9)",
                  background:
                    "linear-gradient(180deg,#e63a3a,#8d1212)",
                  color: "#ffecec",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
