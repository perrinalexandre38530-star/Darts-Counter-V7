// ============================================================
// src/components/stats/x01multi/X01MultiStatsHistory.tsx
// HISTORIQUE DES MATCHS X01 MULTI (style TrainingX01)
// ============================================================

import React from "react";
import type { UIDart } from "../../../lib/types";

const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
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

const headerTitle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: T.text70,
  fontWeight: 700,
  marginBottom: 6,
};

export type X01MatchHistoryItem = {
  id: string;
  date?: number;
  avg3: number;
  bv: number;
  bco: number;
  result: "W" | "L" | "?";
  darts: UIDart[];
};

type Props = {
  matches: X01MatchHistoryItem[];
  onSelectMatch?: (m: X01MatchHistoryItem) => void; // pour ouvrir la modal détail si tu veux
};

function formatDate(ts?: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function X01MultiStatsHistory({ matches, onSelectMatch }: Props) {
  return (
    <div style={card}>
      <div style={headerTitle}>Historique des matchs X01</div>

      {matches.length === 0 && (
        <div style={{ fontSize: 12, color: T.text70 }}>
          Aucun match X01 enregistré pour cette période.
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {matches
            .slice()
            .sort((a, b) => (a.date || 0) - (b.date || 0))
            .map((m) => {
              // Agg hits / miss pour ce match
              let hitsS = 0,
                hitsD = 0,
                hitsT = 0,
                miss = 0;

              if (Array.isArray(m.darts)) {
                for (const d of m.darts) {
                  const v = Number(d.v ?? (d as any).value ?? 0);
                  const mult = Number(d.mult ?? (d as any).multiplier ?? 0);
                  if (v <= 0 || mult === 0) {
                    miss++;
                  } else if (mult === 1) {
                    hitsS++;
                  } else if (mult === 2) {
                    hitsD++;
                  } else if (mult === 3) {
                    hitsT++;
                  }
                }
              }

              const hits = hitsS + hitsD + hitsT;
              const throws = hits + miss;
              const pctHits =
                throws > 0 ? (hits / throws) * 100 : null;

              const dateLabel = formatDate(m.date);

              const handleClick = () => {
                if (onSelectMatch) onSelectMatch(m);
              };

              const clickable = !!onSelectMatch;

              return (
                <div
                  key={m.id}
                  onClick={handleClick}
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
                    cursor: clickable ? "pointer" : "default",
                  }}
                >
                  {/* Ligne 1 : date + résultat */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      opacity: 0.85,
                    }}
                  >
                    <span>{dateLabel || "Match X01"}</span>
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

                  {/* Ligne 2 : BV / BCO / Moyenne */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      BV :{" "}
                      <span
                        style={{
                          color: "#47B5FF",
                          fontWeight: 700,
                        }}
                      >
                        {m.bv || 0}
                      </span>
                    </div>

                    <div>
                      BCO :{" "}
                      <span
                        style={{
                          color: T.gold,
                          fontWeight: 700,
                        }}
                      >
                        {m.bco || 0}
                      </span>
                    </div>

                    <div>
                      Moy. 3D :{" "}
                      <span
                        style={{
                          color: "#FFB8DE",
                          fontWeight: 700,
                        }}
                      >
                        {Number.isFinite(m.avg3)
                          ? m.avg3.toFixed(1)
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Ligne 3 : hits + darts */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      opacity: 0.9,
                    }}
                  >
                    <div>
                      Hits :{" "}
                      <span style={{ color: "#7CFF9A" }}>
                        {hits}
                        {pctHits !== null &&
                          ` (${pctHits.toFixed(1)}%)`}
                      </span>
                    </div>

                    <div>
                      Darts :{" "}
                      <span style={{ color: "#E5FFEF" }}>
                        {m.darts ? m.darts.length : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
