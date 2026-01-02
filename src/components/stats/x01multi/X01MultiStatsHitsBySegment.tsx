// ============================================================
// src/components/stats/x01multi/X01MultiStatsHitsBySegment.tsx
// HITS PAR SEGMENT (S / D / T / MISS) — clone TrainingX01
// pour les matchs X01 MULTI
// ============================================================

import React from "react";
import type { UIDart } from "../../../lib/types";

const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  card: "linear-gradient(180deg,#111218,.94,#0D0E11,.92)",
  edge: "rgba(255,255,255,.10)",
};

const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 14,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  textTransform: "uppercase",
  color: T.gold,
  letterSpacing: 0.7,
  textShadow: "0 0 10px rgba(246,194,86,.9)",
  marginBottom: 6,
};

export type X01MatchExtract = {
  darts: UIDart[];
};

type Props = {
  matches: X01MatchExtract[];
};

// Segments utilisés (identique TrainingX01)
const SEGMENTS: (number | "MISS")[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25,
  "MISS",
];

type SegStats = { S: number; D: number; T: number; MISS: number };

export default function X01MultiStatsHitsBySegment({ matches }: Props) {
  // ------------------------------
  // Construction segMap
  // ------------------------------
  const segMap = React.useMemo(() => {
    const map: Record<string, SegStats> = {};

    const init = (): SegStats => ({ S: 0, D: 0, T: 0, MISS: 0 });

    // initialisation de base
    for (const seg of SEGMENTS) {
      map[String(seg)] = init();
    }

    for (const m of matches) {
      if (!Array.isArray(m.darts)) continue;

      for (const raw of m.darts) {
        const v = Number(raw.v ?? (raw as any).value ?? (raw as any).segment ?? 0);
        const mult = Number(raw.mult ?? (raw as any).multiplier ?? 0);

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
  }, [matches]);

  // ------------------------------
  // Hauteur max pour l’échelle
  // ------------------------------
  const maxStack = React.useMemo(() => {
    let max = 0;
    for (const seg of SEGMENTS) {
      const label = seg === 25 ? "25" : String(seg);
      const val = segMap[label];
      if (!val) continue;
      const tot = val.S + val.D + val.T + val.MISS;
      if (tot > max) max = tot;
    }
    return max || 1;
  }, [segMap]);

  const hasData = React.useMemo(() => {
    for (const seg of SEGMENTS) {
      const label = seg === 25 ? "25" : String(seg);
      const val = segMap[label];
      if (!val) continue;
      if (val.S + val.D + val.T + val.MISS > 0) return true;
    }
    return false;
  }, [segMap]);

  return (
    <div style={card}>
      <div style={titleStyle}>Hits par segment (S / D / T / MISS)</div>

      {!hasData ? (
        <div style={{ fontSize: 12, color: T.text70 }}>
          Pas assez de données pour afficher les hits par segment.
        </div>
      ) : (
        <>
          {/* Barres empilées S / D / T / MISS */}
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
              const val = segMap[label] || { S: 0, D: 0, T: 0, MISS: 0 };
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
                    minWidth: 24,
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
                        tot > 0 ? "0 0 6px rgba(255,255,255,.35)" : "none",
                    }}
                  >
                    {/* MISS */}
                    {hM > 0 && (
                      <div
                        style={{
                          height: `${hM}%`,
                          background: "linear-gradient(180deg,#555,#999)",
                        }}
                      />
                    )}
                    {/* T */}
                    {hT > 0 && (
                      <div
                        style={{
                          height: `${hT}%`,
                          background: "linear-gradient(180deg,#FF9F43,#C25B0F)",
                        }}
                      />
                    )}
                    {/* D */}
                    {hD > 0 && (
                      <div
                        style={{
                          height: `${hD}%`,
                          background: "linear-gradient(180deg,#FF6FB5,#8F2B64)",
                        }}
                      />
                    )}
                    {/* S */}
                    {hS > 0 && (
                      <div
                        style={{
                          height: `${hS}%`,
                          background: "linear-gradient(180deg,#47B5FF,#1F5F9F)",
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
        </>
      )}
    </div>
  );
}
