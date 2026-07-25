import React from "react";
import type { TrainingStats } from "../engine/trainingStats";

export type TrainingResultMetric = {
  label: string;
  value: React.ReactNode;
};

export default function TrainingResultModal({
  open,
  success,
  title,
  stats,
  metrics = [],
  onClose,
}: {
  open: boolean;
  success: boolean;
  title?: string;
  stats: TrainingStats;
  metrics?: TrainingResultMetric[];
  onClose: () => void;
}) {
  if (!open) return null;

  const accent = success ? "#27dcff" : "#ff5f9e";
  const safeDarts = Math.max(0, Number((stats as any)?.darts || 0));
  const safeHits = Math.max(0, Number((stats as any)?.hits || 0));
  const hitRate = Math.max(0, Number((stats as any)?.hitRate || 0));
  const score = Math.max(0, Number((stats as any)?.score || 0));

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(0,0,0,.82)",
        backdropFilter: "blur(7px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px,100%)",
          maxHeight: "86vh",
          overflowY: "auto",
          borderRadius: 24,
          border: `1px solid ${accent}88`,
          background: "linear-gradient(160deg,rgba(7,27,41,.99),rgba(2,9,17,.99))",
          color: "#fff",
          padding: 18,
          boxShadow: `0 28px 80px rgba(0,0,0,.78), 0 0 28px ${accent}22`,
        }}
      >
        <div
          style={{
            color: accent,
            fontSize: 18,
            fontWeight: 950,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title || (success ? "Session réussie" : "Session terminée")}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 8,
            marginTop: 14,
          }}
        >
          {[
            ["SCORE", Math.round(score)],
            ["DARTS", safeDarts],
            ["HITS", safeHits],
            ["PRÉCISION", `${Math.round(hitRate * 100)}%`],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                minWidth: 0,
                padding: "9px 6px",
                textAlign: "center",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.11)",
                background: "rgba(0,0,0,.30)",
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.7, opacity: 0.58 }}>
                {label}
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 17,
                  fontWeight: 950,
                  color: accent,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {metrics.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 8,
              marginTop: 10,
            }}
          >
            {metrics.map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(255,255,255,.035)",
                  padding: "9px 10px",
                }}
              >
                <div style={{ fontSize: 9.5, opacity: 0.58, fontWeight: 900, letterSpacing: 0.55 }}>
                  {metric.label}
                </div>
                <div style={{ marginTop: 3, fontWeight: 950, fontSize: 14.5 }}>{metric.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            height: 46,
            marginTop: 16,
            borderRadius: 999,
            border: `1px solid ${accent}88`,
            background: success
              ? "linear-gradient(180deg,#39e4ff,#09afd9)"
              : "linear-gradient(180deg,#ff83b5,#ef397f)",
            color: "#071018",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          RETOUR AU TRAINING
        </button>
      </div>
    </div>
  );
}
