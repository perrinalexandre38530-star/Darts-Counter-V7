// ============================================================
// src/components/stats/x01multi/X01MultiStatsSparkline.tsx
// SPARKLINE + MÉTRIQUES — style TrainingX01 (full version)
// ============================================================

import React from "react";
import SparklinePro from "../../SparklinePro";
import type { UIDart } from "../../../lib/types";

const T = {
  gold: "#F6C256",
  text70: "rgba(255,255,255,.70)",
};

export type X01MatchExtract = {
  id: string;
  t: number;       // timestamp
  avg3: number;
  bv: number;
  bco: number;
  darts: UIDart[];
  result: "W" | "L" | "?";
};

type Props = {
  matches: X01MatchExtract[];
};

export default function X01MultiStatsSparkline({ matches }: Props) {
  // ---------- Liste des métriques disponibles ----------
  const metricList = [
    { key: "avg3", label: "Moy.3D" },
    { key: "bv", label: "Best Visit" },
    { key: "bco", label: "Checkout" },
    { key: "pctHits", label: "%Hits" },
    { key: "pctS", label: "%S" },
    { key: "pctD", label: "%D" },
    { key: "pctT", label: "%T" },
  ] as const;

  type MetricKey = typeof metricList[number]["key"];

  const [metric, setMetric] = React.useState<MetricKey>("avg3");
  const [metricLocked, setMetricLocked] = React.useState(false);

  // ---------- Calcul de la valeur d’une métrique ----------
  function valueFor(m: X01MatchExtract, key: MetricKey): number {
    switch (key) {
      case "avg3":
        return m.avg3;
      case "bv":
        return m.bv;
      case "bco":
        return m.bco;
      case "pctHits": {
        const hits = m.darts.filter((d) => d.mult > 0).length;
        const miss = m.darts.filter((d) => d.mult === 0 || d.v === 0).length;
        const tot = hits + miss;
        return tot > 0 ? (hits / tot) * 100 : 0;
      }
      case "pctS": {
        const S = m.darts.filter((d) => d.mult === 1).length;
        const hits = m.darts.filter((d) => d.mult > 0).length;
        return hits > 0 ? (S / hits) * 100 : 0;
      }
      case "pctD": {
        const D = m.darts.filter((d) => d.mult === 2).length;
        const hits = m.darts.filter((d) => d.mult > 0).length;
        return hits > 0 ? (D / hits) * 100 : 0;
      }
      case "pctT": {
        const T3 = m.darts.filter((d) => d.mult === 3).length;
        const hits = m.darts.filter((d) => d.mult > 0).length;
        return hits > 0 ? (T3 / hits) * 100 : 0;
      }
      default:
        return 0;
    }
  }

  // ---------- Serie pour Sparkline ----------
  const sparkData = matches.map((m) => ({
    x: m.t,
    y: valueFor(m, metric),
  }));

  // ---------- Auto-défilement (TrainingX01-like) ----------
  React.useEffect(() => {
    if (!matches.length) return;
    if (metricLocked) return;

    const id = window.setInterval(() => {
      setMetric((prev) => {
        const idx = metricList.findIndex((x) => x.key === prev);
        const next = metricList[(idx + 1) % metricList.length].key;
        return next;
      });
    }, 4000);

    return () => clearInterval(id);
  }, [matches.length, metricLocked]);

  // ---------- Déverrouillage après 15s ----------
  React.useEffect(() => {
    if (!metricLocked) return;
    const id = window.setTimeout(() => setMetricLocked(false), 15000);
    return () => clearTimeout(id);
  }, [metricLocked]);

  // ---------- Style des pills ----------
  const pillStyle: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(0,0,0,.45)",
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg,#15171B 0%, #0F1114 100%)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 20,
        padding: 16,
        boxShadow: "0 10px 26px rgba(0,0,0,.35)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          fontSize: 12,
          color: T.text70,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 700,
        }}
      >
        Évolution des performances
      </div>

      {/* PILLS */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {metricList.map((m) => (
          <button
            key={m.key}
            style={{
              ...pillStyle,
              borderColor:
                metric === m.key ? T.gold : "rgba(255,255,255,.18)",
              color: metric === m.key ? T.gold : T.text70,
              boxShadow:
                metric === m.key ? "0 0 10px rgba(246,194,86,.7)" : "none",
            }}
            onClick={() => {
              setMetric(m.key);
              setMetricLocked(true);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* SPARKLINE */}
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
}
