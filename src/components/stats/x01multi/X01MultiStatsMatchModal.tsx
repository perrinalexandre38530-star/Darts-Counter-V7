// ============================================================
// src/components/stats/x01multi/X01MultiStatsMatchModal.tsx
// MODAL DÉTAIL MATCH X01 MULTI — style TrainingX01
// ============================================================

import React from "react";
import type { UIDart } from "../../../lib/types";

const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
};

const boxRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  borderTop: "1px solid rgba(255,255,255,.06)",
  fontSize: 12,
};

export type X01MatchModalItem = {
  id: string;
  date?: number;
  avg3: number;
  bv: number;
  bco: number;
  result: "W" | "L" | "?";
  darts: UIDart[];
};

type Props = {
  match: X01MatchModalItem | null;
  onClose: () => void;
};

export default function X01MultiStatsMatchModal({ match, onClose }: Props) {
  if (!match) return null;

  // ---- Calcul hits ----
  let hitsS = 0,
    hitsD = 0,
    hitsT = 0,
    miss = 0;

  for (const d of match.darts || []) {
    const v = Number(d.v ?? (d as any).value ?? 0);
    const mult = Number(d.mult ?? (d as any).multiplier ?? 0);
    if (v <= 0 || mult === 0) miss++;
    else if (mult === 1) hitsS++;
    else if (mult === 2) hitsD++;
    else if (mult === 3) hitsT++;
  }

  const hits = hitsS + hitsD + hitsT;
  const throws = hits + miss;
  const pctHits = throws > 0 ? (hits / throws) * 100 : null;

  const dateLabel = match.date
    ? new Date(match.date).toLocaleString()
    : "—";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.75)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 22,
          background: "linear-gradient(180deg,#18181C,#0D0E11)",
          border: "1px solid rgba(255,255,255,.18)",
          boxShadow: "0 18px 40px rgba(0,0,0,.7)",
          padding: 16,
          color: T.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: T.text70,
            }}
          >
            Match du {dateLabel}
          </div>

          <button
            type="button"
            onClick={onClose}
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

        {/* Résumé haut */}
        <div style={{ fontSize: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div>
            Moyenne 3D :{" "}
            <span style={{ color: T.gold, fontWeight: 700 }}>
              {match.avg3.toFixed(1)}
            </span>
          </div>
          <div>
            Best Visit :{" "}
            <span style={{ color: "#47B5FF", fontWeight: 700 }}>
              {match.bv}
            </span>
          </div>
          <div>
            Checkout :{" "}
            <span style={{ color: "#FF9F43", fontWeight: 700 }}>
              {match.bco}
            </span>
          </div>
        </div>

        {/* Détails */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={boxRow}>
            <span>Darts</span>
            <span>{match.darts.length}</span>
          </div>

          <div style={boxRow}>
            <span>Hits S</span>
            <span>{hitsS}</span>
          </div>

          <div style={boxRow}>
            <span>Hits D</span>
            <span>{hitsD}</span>
          </div>

          <div style={boxRow}>
            <span>Hits T</span>
            <span>{hitsT}</span>
          </div>

          <div style={boxRow}>
            <span>Miss</span>
            <span>{miss}</span>
          </div>

          <div style={boxRow}>
            <span>%Hits</span>
            <span>{pctHits !== null ? pctHits.toFixed(1) + "%" : "-"}</span>
          </div>

          <div style={boxRow}>
            <span>Résultat</span>
            <span
              style={{
                fontWeight: 900,
                color:
                  match.result === "W"
                    ? "#7CFF9A"
                    : match.result === "L"
                    ? "#FF7C7C"
                    : T.text70,
              }}
            >
              {match.result}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
