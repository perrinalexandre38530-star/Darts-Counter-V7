// ============================================
// src/components/TrainingHitsBySegment.tsx
// Histogramme "Hits par segment" (Training X01)
// - 0 (M) + 1..20 + 25 (Bull)
// - Bars empilées S / D / T
//   S = doré, D = bleu pétrole, T = violet
// ============================================

import React from "react";
import type { Dart as UIDart } from "../lib/types";

// 0 = Miss ("M")
const SEGMENTS: number[] = [
  0,
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25,
];

type Props = {
  darts: UIDart[];
};

const T = {
  bgOuter: "#090A0F",
  bgInner: "#101116",
  axis: "rgba(255,255,255,0.10)",
  label: "rgba(255,255,255,0.65)",
  // S / D / T
  single: "#F6C256", // doré
  double: "#007C80", // bleu pétrole
  triple: "#7A3DF0", // violet
};

export default function TrainingHitsBySegment({ darts }: Props) {
  // Agrégation S / D / T par valeur (0,1..20,25)
  const hitsByValue = React.useMemo(() => {
    const base: Record<number, { S: number; D: number; T: number }> = {};
    for (const v of SEGMENTS) {
      base[v] = { S: 0, D: 0, T: 0 };
    }

    for (const d of darts) {
      if (!d) continue;

      const mult = d.mult ?? 1;
      let v = d.v ?? 0;

      // On mappe les miss explicites sur 0 ("M")
      if (v === 0) v = 0;

      // On garde seulement 0, 1..20, 25
      if (!SEGMENTS.includes(v)) continue;

      const slot = base[v];
      if (mult === 1) slot.S += 1;
      else if (mult === 2) slot.D += 1;
      else if (mult === 3) slot.T += 1;
    }

    return base;
  }, [darts]);

  const maxTotal = React.useMemo(() => {
    let max = 0;
    for (const v of SEGMENTS) {
      const h = hitsByValue[v];
      const total = (h?.S ?? 0) + (h?.D ?? 0) + (h?.T ?? 0);
      if (total > max) max = total;
    }
    return max || 1;
  }, [hitsByValue]);

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 24,
        padding: 14,
        background: T.bgOuter,
      }}
    >
      <div
        style={{
          borderRadius: 18,
          padding: 14,
          paddingBottom: 18,
          background: T.bgInner,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: T.label,
            marginBottom: 8,
          }}
        >
          Hits par segment
        </div>

        {/* Zone de graphe */}
        <div
          style={{
            position: "relative",
            height: 140,
            marginBottom: 10,
            display: "flex",
            alignItems: "flex-end",
            borderTop: `1px solid ${T.axis}`,
          }}
        >
          {/* Ligne de base */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 1,
              background: T.axis,
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              width: "100%",
              paddingTop: 8,
              paddingBottom: 4,
            }}
          >
            {SEGMENTS.map((v) => {
              const h = hitsByValue[v] || { S: 0, D: 0, T: 0 };
              const total = h.S + h.D + h.T;

              if (total === 0) {
                return (
                  <div
                    key={v}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div style={{ height: 0, width: 8 }} />
                  </div>
                );
              }

              const heightTotal = (total / maxTotal) * 100;
              const hS = (h.S / total) * heightTotal;
              const hD = (h.D / total) * heightTotal;
              const hT = (h.T / total) * heightTotal;

              return (
                <div
                  key={v}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      borderRadius: 999,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column-reverse",
                    }}
                  >
                    {h.S > 0 && (
                      <div
                        style={{
                          height: `${hS}%`,
                          background: T.single,
                        }}
                      />
                    )}
                    {h.D > 0 && (
                      <div
                        style={{
                          height: `${hD}%`,
                          background: T.double,
                        }}
                      />
                    )}
                    {h.T > 0 && (
                      <div
                        style={{
                          height: `${hT}%`,
                          background: T.triple,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Labels sous les colonnes */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: T.label,
            paddingInline: 2,
          }}
        >
          {SEGMENTS.map((v) => (
            <div
              key={`label-${v}`}
              style={{
                flex: 1,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {v === 0 ? "M" : v === 25 ? "25" : v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
